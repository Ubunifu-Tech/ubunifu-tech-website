import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import type { ConversationKind, MessageRole, Prisma } from '@/generated/prisma/client';

/**
 * One tool-using conversation loop, shared by every surface that talks to a
 * model: the drafting copilot, the website assistant, and the portal.
 *
 * The thread lives in the database, not in memory. That is what makes a
 * back-and-forth possible across a page reload, what lets staff read afterwards
 * exactly what a visitor was told, and what makes the cost of a month
 * answerable. Tool calls and their results are stored as their own turns, so a
 * replay shows what the model did rather than only its prose about it.
 *
 * Every surface passes its own tools. A website visitor's assistant can open an
 * enquiry and nothing else; the drafting copilot can write a document version
 * and nothing else. The set of tools IS the permission boundary, and it is
 * decided here on the server by conversation kind — never by anything the
 * conversation itself contains.
 */

export const AGENT_MODEL = process.env.ANTHROPIC_AGENT_MODEL || 'claude-sonnet-5';

/** Guard rails. A conversation is not allowed to run away, in turns or in size. */
export const MAX_TURNS_PER_CONVERSATION = 40;
const MAX_TOOL_ROUNDS = 4;
const MAX_HISTORY_MESSAGES = 60;

export type AgentTool<Input> = {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool.InputSchema;
  /**
   * Validates and runs. Everything the model sends is untrusted input from
   * whoever it was talking to, so this re-checks it rather than trusting the
   * schema to have been honoured.
   */
  run: (input: unknown, context: Input) => Promise<{ result: string; meta?: Prisma.InputJsonValue }>;
};

export type AgentResult =
  | { ok: true; reply: string; usedTools: string[] }
  | { ok: false; error: string };

type StoredMessage = {
  role: MessageRole;
  content: string;
  toolName: string | null;
  toolUseId: string | null;
  toolInput: Prisma.JsonValue;
  toolResult: Prisma.JsonValue;
};

/**
 * Rebuilds the API's message list from what is stored.
 *
 * Tool turns are folded back into the assistant/user pair the API expects — a
 * tool_use block on the assistant turn and a tool_result block on the next user
 * turn — so the model sees the same shape it produced.
 */
function toApiMessages(stored: StoredMessage[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  for (const message of stored) {
    if (message.role === 'user') {
      messages.push({ role: 'user', content: message.content });
      continue;
    }

    if (message.role === 'assistant') {
      if (message.toolName && message.toolUseId) {
        const blocks: Anthropic.ContentBlockParam[] = [];
        if (message.content.trim()) blocks.push({ type: 'text', text: message.content });
        blocks.push({
          type: 'tool_use',
          id: message.toolUseId,
          name: message.toolName,
          input: (message.toolInput ?? {}) as Record<string, unknown>,
        });
        messages.push({ role: 'assistant', content: blocks });
      } else if (message.content.trim()) {
        messages.push({ role: 'assistant', content: message.content });
      }
      continue;
    }

    if (message.role === 'tool' && message.toolUseId) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: message.toolUseId,
            content: message.content,
          },
        ],
      });
    }
  }

  return messages;
}

async function appendMessage(
  conversationId: string,
  data: {
    role: MessageRole;
    content: string;
    toolName?: string;
    toolUseId?: string;
    toolInput?: Prisma.InputJsonValue;
    toolResult?: Prisma.InputJsonValue;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
  },
): Promise<void> {
  await db.$transaction([
    db.conversationMessage.create({ data: { conversationId, ...data } }),
    db.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 1 },
        inputTokens: { increment: data.inputTokens ?? 0 },
        outputTokens: { increment: data.outputTokens ?? 0 },
        lastMessageAt: new Date(),
        model: data.model ?? undefined,
      },
    }),
  ]);
}

/**
 * Runs one turn: the person says something, the model answers, and if it needs
 * a tool it gets up to a few rounds to use one before it has to speak.
 */
export async function runTurn<Context>(options: {
  conversationId: string;
  kind: ConversationKind;
  /** Stable across the thread, so it can be cached rather than re-read. */
  system: string;
  /** Per-conversation facts, also stable, cached with the system prompt. */
  brief?: string;
  userMessage: string;
  tools: AgentTool<Context>[];
  context: Context;
  maxTokens?: number;
}): Promise<AgentResult> {
  const conversation = await db.conversation.findUnique({
    where: { id: options.conversationId },
    select: { id: true, status: true, messageCount: true },
  });

  if (!conversation) return { ok: false, error: 'That conversation no longer exists.' };
  if (conversation.status === 'closed') {
    return { ok: false, error: 'This conversation has been closed.' };
  }
  if (conversation.messageCount >= MAX_TURNS_PER_CONVERSATION) {
    return {
      ok: false,
      error:
        'This conversation has gone on long enough that it is better continued by a person. Send us a message and somebody will pick it up.',
    };
  }

  await appendMessage(options.conversationId, { role: 'user', content: options.userMessage });

  const stored = await db.conversationMessage.findMany({
    where: { conversationId: options.conversationId },
    orderBy: { createdAt: 'asc' },
    take: MAX_HISTORY_MESSAGES,
    select: {
      role: true,
      content: true,
      toolName: true,
      toolUseId: true,
      toolInput: true,
      toolResult: true,
    },
  });

  const messages = toApiMessages(stored);
  const usedTools: string[] = [];

  try {
    const client = new Anthropic();

    /**
     * The system prompt and the per-conversation brief are stable for the whole
     * thread, so they are cached. Every turn after the first reads them back
     * instead of paying for them again, which is most of the cost of a
     * back-and-forth.
     */
    const system: Anthropic.TextBlockParam[] = [
      { type: 'text', text: options.system, cache_control: { type: 'ephemeral' } },
    ];
    if (options.brief) {
      system.push({ type: 'text', text: options.brief, cache_control: { type: 'ephemeral' } });
    }

    const toolDefinitions: Anthropic.Tool[] = options.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const stream = client.messages.stream({
        model: AGENT_MODEL,
        max_tokens: options.maxTokens ?? 16000,
        system,
        thinking: { type: 'adaptive' },
        messages,
        ...(toolDefinitions.length > 0 ? { tools: toolDefinitions } : {}),
      });

      const message = await stream.finalMessage();

      // A policy decline arrives as a 200 with nothing usable in it, so the
      // stop reason is read before the content is.
      if (message.stop_reason === 'refusal') {
        return {
          ok: false,
          error: 'The assistant declined to answer that one. A person can help instead.',
        };
      }

      const text = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      const toolUse = message.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      await appendMessage(options.conversationId, {
        role: 'assistant',
        content: text,
        model: AGENT_MODEL,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        ...(toolUse
          ? {
              toolName: toolUse.name,
              toolUseId: toolUse.id,
              toolInput: toolUse.input as Prisma.InputJsonValue,
            }
          : {}),
      });

      if (!toolUse) {
        if (!text) {
          return { ok: false, error: 'The assistant returned nothing. Try asking again.' };
        }
        return { ok: true, reply: text, usedTools };
      }

      const tool = options.tools.find((candidate) => candidate.name === toolUse.name);
      let outcome: { result: string; meta?: Prisma.InputJsonValue };

      if (!tool) {
        // The model asked for something this surface does not offer. It is told
        // so plainly rather than the call being ignored, which would leave it
        // waiting for a result that never comes.
        outcome = { result: `There is no tool called ${toolUse.name} here.` };
      } else {
        try {
          outcome = await tool.run(toolUse.input, options.context);
          usedTools.push(tool.name);
        } catch (error) {
          console.error(`Tool ${tool.name} failed`, error);
          outcome = { result: 'That did not work. Tell the person, and do not try it again.' };
        }
      }

      await appendMessage(options.conversationId, {
        role: 'tool',
        content: outcome.result,
        toolName: toolUse.name,
        toolUseId: toolUse.id,
        ...(outcome.meta ? { toolResult: outcome.meta } : {}),
      });

      messages.push({ role: 'assistant', content: message.content });
      messages.push({
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: toolUse.id, content: outcome.result },
        ],
      });
    }

    return {
      ok: false,
      error: 'The assistant got stuck going round in circles. A person can help instead.',
    };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'The assistant is not configured here.' };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'Too many people are asking at once. Try again in a moment.' };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `The assistant could not be reached (${error.status}).` };
    }
    console.error('Agent turn failed', error);
    return { ok: false, error: 'The assistant could not be reached.' };
  }
}
