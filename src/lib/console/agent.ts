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

/**
 * The API client. A key that belongs to the organisation rather than to one
 * workspace is refused unless each request names the workspace to bill, so
 * ANTHROPIC_WORKSPACE_ID, when set, is sent with every call. A key created
 * inside a workspace needs nothing extra.
 */
export function anthropicClient(): Anthropic {
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  return new Anthropic(
    workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {},
  );
}

/**
 * Guard rails. A thread is not allowed to run away in size: at the cap the
 * surface starts a fresh one (site, portal) or offers to (drafting).
 * Counted in stored rows, so a turn that used a tool counts three.
 */
export const MAX_MESSAGES: Record<ConversationKind, number> = {
  site_visitor: 60,
  portal_client: 60,
  document_draft: 400,
};

/** How many of the latest rows are replayed to the model each turn. */
const HISTORY: Record<ConversationKind, number> = {
  site_visitor: 60,
  portal_client: 60,
  document_draft: 80,
};

/** Below this much of the whole-turn deadline, another call is not started. */
const DEADLINE_MARGIN_MS = 5_000;

/** Why a turn produced no reply. Each surface says it in its own words. */
export type AgentFailure =
  | 'declined'
  | 'cut_short'
  | 'too_long'
  | 'empty'
  | 'stuck'
  | 'thread_full'
  | 'closed'
  | 'missing'
  | 'busy'
  | 'not_configured'
  | 'unavailable';

export type AgentTool<Input> = {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool.InputSchema;
  /**
   * Validates and runs. Everything the model sends is untrusted input from
   * whoever it was talking to, so this re-checks it rather than trusting the
   * schema to have been honoured.
   *
   * `done: false` means the tool refused (a missing email, a short summary):
   * the model is told why, and the call does not count as having happened.
   */
  run: (
    input: unknown,
    context: Input,
  ) => Promise<{ result: string; meta?: Prisma.InputJsonValue; done?: boolean }>;
};

export type AgentResult =
  /** `used` lists the tools that actually did their job this turn, with what they reported. */
  | { ok: true; reply: string; used: { name: string; meta: Prisma.JsonValue | null }[] }
  | { ok: false; cause: AgentFailure };

/** What shapes the request itself, apart from the thread. */
export type RequestOptions = {
  /** The surface's instructions. The same for every thread, cached for an hour. */
  system: string;
  /** Knowledge shared by every thread of the surface, also cached for an hour. */
  shared?: string;
  /** Per-conversation facts, stable across the thread, cached with the default lifetime. */
  brief?: string;
  /**
   * Facts about this turn only, such as the page the person is looking at.
   * Sent after the cached blocks and never stored in the thread.
   */
  note?: string;
  /** How hard the model thinks before answering. Low for chat, where speed matters. */
  effort?: 'low' | 'medium' | 'high';
  maxTokens: number;
  tools: { name: string; description: string; inputSchema: Anthropic.Tool.InputSchema }[];
  /** An opaque id for whoever is talking, never a name or address: Anthropic uses it against abuse. */
  userRef?: string;
};

type StoredMessage = {
  role: MessageRole;
  content: string;
  toolName: string | null;
  toolUseId: string | null;
  toolInput: Prisma.JsonValue;
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

/**
 * The latest rows, oldest first, starting on something the person said, since
 * a thread cut mid-exchange would begin on an answer to nothing. A saved draft
 * is replaced by a pointer: the whole document went into every save, and the
 * brief already carries the document as it stands now.
 */
export function replayable(kind: ConversationKind, newestFirst: StoredMessage[]): StoredMessage[] {
  const rows = [...newestFirst].reverse();
  while (rows.length > 0 && rows[0]!.role !== 'user') rows.shift();
  if (kind !== 'document_draft') return rows;
  return rows.map((row) =>
    row.role === 'assistant' && row.toolName === 'save_draft' && row.toolInput
      ? {
          ...row,
          toolInput: {
            ...(row.toolInput as Record<string, Prisma.JsonValue>),
            markdown:
              '[Saved as a version. The current text is given as THE DOCUMENT AS IT STANDS NOW.]',
          },
        }
      : row,
  );
}

/** The request for one call, apart from the thread. Pure, so it can be checked without the API. */
export function buildRequest(
  options: RequestOptions,
  messages: Anthropic.MessageParam[],
): Anthropic.MessageStreamParams {
  /**
   * The instructions and the shared knowledge are the same for every thread,
   * so they are cached for an hour; the brief is the same for the whole
   * thread. Every turn after the first reads them back instead of paying for
   * them again, which is most of the cost of a back-and-forth. Longer-lived
   * blocks come first, as the cache requires.
   */
  const system: Anthropic.TextBlockParam[] = [
    { type: 'text', text: options.system, cache_control: { type: 'ephemeral', ttl: '1h' } },
  ];
  if (options.shared) {
    system.push({
      type: 'text',
      text: options.shared,
      cache_control: { type: 'ephemeral', ttl: '1h' },
    });
  }
  if (options.brief) {
    system.push({ type: 'text', text: options.brief, cache_control: { type: 'ephemeral' } });
  }
  if (options.note) system.push({ type: 'text', text: options.note });

  const tools: Anthropic.Tool[] = options.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));

  return {
    model: AGENT_MODEL,
    max_tokens: options.maxTokens,
    system,
    // Adaptive thinking, even for chat: with thinking off the model is less
    // willing to use a tool when it should. Effort keeps chat quick.
    thinking: { type: 'adaptive' },
    ...(options.effort ? { output_config: { effort: options.effort } } : {}),
    messages,
    // One action per turn: each tool does something real, and two at once
    // (two enquiries, two versions) is never what was meant.
    ...(tools.length > 0
      ? { tools, tool_choice: { type: 'auto' as const, disable_parallel_tool_use: true } }
      : {}),
    ...(options.userRef ? { metadata: { user_id: options.userRef } } : {}),
  };
}

type Stop =
  | { kind: 'reply'; text: string }
  | {
      kind: 'tool';
      text: string;
      toolUse: Anthropic.ToolUseBlock;
      extra: Anthropic.ToolUseBlock[];
    }
  | { kind: 'failure'; cause: AgentFailure; keepUsage: boolean };

/**
 * What a response amounts to, read from its stop reason before its content.
 * A reply cut off at the token limit is not a reply, and a tool call inside
 * one is not safe to run: its input may be half written.
 */
export function readStop(message: Anthropic.Message): Stop {
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  switch (message.stop_reason) {
    case 'refusal':
      return { kind: 'failure', cause: 'declined', keepUsage: false };
    case 'max_tokens':
      return { kind: 'failure', cause: 'cut_short', keepUsage: true };
    case 'model_context_window_exceeded':
      return { kind: 'failure', cause: 'too_long', keepUsage: true };
    case 'pause_turn':
      return { kind: 'failure', cause: 'unavailable', keepUsage: true };
    case 'tool_use': {
      const [toolUse, ...extra] = message.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );
      if (toolUse) return { kind: 'tool', text, toolUse, extra };
      return text
        ? { kind: 'reply', text }
        : { kind: 'failure', cause: 'empty', keepUsage: true };
    }
    default:
      return text
        ? { kind: 'reply', text }
        : { kind: 'failure', cause: 'empty', keepUsage: true };
  }
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
    authorId?: string;
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
export async function runTurn<Context>(
  options: Omit<RequestOptions, 'tools'> & {
    conversationId: string;
    kind: ConversationKind;
    userMessage: string;
    /** The staff member writing, on a thread staff share. Stored on their row. */
    authorId?: string;
    tools: AgentTool<Context>[];
    context: Context;
    /** Longest wait for one call to the model, in milliseconds. */
    timeoutMs?: number;
    /**
     * The whole turn's budget, in milliseconds, so it ends inside the
     * function's time limit: a killed function answers with a bare error and
     * records nothing.
     */
    deadlineMs?: number;
    /** Calls to the model per turn, counting each one after a tool. */
    maxRounds?: number;
  },
): Promise<AgentResult> {
  const started = Date.now();
  const conversation = await db.conversation.findUnique({
    where: { id: options.conversationId },
    select: { id: true, status: true, messageCount: true },
  });

  if (!conversation) return { ok: false, cause: 'missing' };
  if (conversation.status === 'closed') return { ok: false, cause: 'closed' };
  if (conversation.messageCount >= MAX_MESSAGES[options.kind]) {
    return { ok: false, cause: 'thread_full' };
  }

  await appendMessage(options.conversationId, {
    role: 'user',
    content: options.userMessage,
    authorId: options.authorId,
  });

  const latest = await db.conversationMessage.findMany({
    where: { conversationId: options.conversationId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: HISTORY[options.kind],
    select: {
      role: true,
      content: true,
      toolName: true,
      toolUseId: true,
      toolInput: true,
    },
  });

  const messages = toApiMessages(replayable(options.kind, latest));
  const used: { name: string; meta: Prisma.JsonValue | null }[] = [];
  const maxRounds = options.maxRounds ?? 4;

  // Said plainly rather than as a failure to connect: nothing was tried.
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return { ok: false, cause: 'not_configured' };

  try {
    const client = anthropicClient();

    for (let round = 0; round < maxRounds; round += 1) {
      const left = options.deadlineMs ? options.deadlineMs - (Date.now() - started) : Infinity;
      if (left < DEADLINE_MARGIN_MS) return { ok: false, cause: 'unavailable' };
      const timeout = Math.min(options.timeoutMs ?? left, left);
      // One retry on the first call, and only when it still fits in the turn.
      const maxRetries = round === 0 && timeout * 2 <= left ? 1 : 0;

      const stream = client.messages.stream(buildRequest(options, messages), {
        ...(Number.isFinite(timeout) ? { timeout } : {}),
        maxRetries,
      });
      const message = await stream.finalMessage();

      if (process.env.ASSISTANT_DEBUG === '1') {
        console.log(
          `[agent] ${options.kind} round ${round}: ${message.stop_reason}, input ${message.usage.input_tokens}, cache read ${message.usage.cache_read_input_tokens ?? 0}, cache written ${message.usage.cache_creation_input_tokens ?? 0}, output ${message.usage.output_tokens}`,
        );
      }

      const stop = readStop(message);
      const usage = {
        model: AGENT_MODEL,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      };

      if (stop.kind === 'failure') {
        if (stop.cause === 'declined') {
          await recordDecline(options.conversationId, options.kind, message.stop_details?.category);
        }
        // Kept empty, with what it cost: nothing half written is stored or run.
        if (stop.keepUsage) {
          await appendMessage(options.conversationId, { role: 'assistant', content: '', ...usage });
        }
        return { ok: false, cause: stop.cause };
      }

      if (stop.kind === 'reply') {
        await appendMessage(options.conversationId, {
          role: 'assistant',
          content: stop.text,
          ...usage,
        });
        return { ok: true, reply: stop.text, used };
      }

      const { toolUse } = stop;
      await appendMessage(options.conversationId, {
        role: 'assistant',
        content: stop.text,
        ...usage,
        toolName: toolUse.name,
        toolUseId: toolUse.id,
        toolInput: toolUse.input as Prisma.InputJsonValue,
      });

      const tool = options.tools.find((candidate) => candidate.name === toolUse.name);
      let outcome: { result: string; meta?: Prisma.InputJsonValue; done?: boolean };

      if (!tool) {
        // The model asked for something this surface does not offer. It is told
        // so plainly rather than the call being ignored, which would leave it
        // waiting for a result that never comes.
        outcome = { result: `There is no tool called ${toolUse.name} here.` };
      } else {
        try {
          outcome = await tool.run(toolUse.input, options.context);
          if (outcome.done !== false) {
            used.push({ name: tool.name, meta: (outcome.meta ?? null) as Prisma.JsonValue | null });
          }
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
          // Parallel use is switched off, but every call made must be answered.
          ...stop.extra.map((extra) => ({
            type: 'tool_result' as const,
            tool_use_id: extra.id,
            content: 'Only one action at a time. This one did not run.',
            is_error: true,
          })),
        ],
      });
    }

    return { ok: false, cause: 'stuck' };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      await recordApiFailure(error, options.conversationId, options.kind);
    } else {
      console.error('Agent turn failed', error);
    }
    if (
      error instanceof Anthropic.AuthenticationError ||
      error instanceof Anthropic.PermissionDeniedError
    ) {
      return { ok: false, cause: 'not_configured' };
    }
    if (
      error instanceof Anthropic.RateLimitError ||
      (error instanceof Anthropic.APIError && error.status === 529)
    ) {
      return { ok: false, cause: 'busy' };
    }
    return { ok: false, cause: 'unavailable' };
  }
}

const WHICH: Record<ConversationKind, string> = {
  site_visitor: 'The website assistant',
  portal_client: 'The portal assistant',
  document_draft: 'The drafting assistant',
};

/** A policy decline: recorded for staff, with the category the API gave. */
async function recordDecline(
  conversationId: string,
  kind: ConversationKind,
  category: string | null | undefined,
) {
  await db.auditEvent
    .create({
      data: {
        actorType: 'system',
        action: 'assistant.declined',
        entityType: 'conversation',
        entityId: conversationId,
        summary: `${WHICH[kind]} declined to answer${category ? ` (${category})` : ''}`,
        metadata: { category: category ?? null },
      },
    })
    .catch((failure: unknown) => console.error('Could not record the decline', failure));
}

/**
 * Why the API turned a turn down, in its own words: a low credit balance, a
 * key without access, a parameter it rejects. Written to the server log and to
 * the activity record, where staff can read it. Never sent to the person in
 * the chat, who only needs to know a person will reply.
 */
async function recordApiFailure(
  error: InstanceType<typeof Anthropic.APIError>,
  conversationId: string,
  kind: ConversationKind,
) {
  const body = error.error as { error?: { type?: string; message?: string } } | undefined;
  const reason = body?.error?.message ?? error.message;
  const type = body?.error?.type ?? 'unknown';
  console.error(
    `Anthropic API ${error.status ?? 'error'} ${type} (request ${error.requestID ?? 'unknown'}): ${reason}`,
  );
  await db.auditEvent
    .create({
      data: {
        actorType: 'system',
        action: 'assistant.failed',
        entityType: 'conversation',
        entityId: conversationId,
        summary: `${WHICH[kind]} could not answer (${error.status ?? 'no status'}): ${reason}`.slice(0, 500),
        metadata: { status: error.status ?? null, type, requestId: error.requestID ?? null },
      },
    })
    .catch((failure: unknown) => console.error('Could not record the assistant failure', failure));
}
