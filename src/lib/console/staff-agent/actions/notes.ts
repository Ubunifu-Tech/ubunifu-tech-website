import 'server-only';
import { addNote, checkNote } from '../memory';
import { StepRefused } from './clients';
import { text, type PlanAction } from './types';

/**
 * Keeping something in mind for later chats. It is a plan step like any
 * other, so a note is only ever saved by a person pressing Confirm: nothing a
 * record or a document says can plant one.
 */
export const remember: PlanAction<{ text: string; team: boolean }> = {
  name: 'remember',
  label: 'Keep in mind',
  description:
    'Save a short note that you will be told again in later chats: how the team works, or how this person likes things done. Use it only when the person asks you to remember something, or agrees when you offer. One fact per note, in a full sentence, written so it makes sense on its own months from now. Never a note about one record\'s current state, which changes: read the record each time.',
  permission: null,
  properties: {
    note: { type: 'string', description: 'The note, such as "Hosting is always billed yearly, in advance."' },
    scope: {
      type: 'string',
      enum: ['me', 'team'],
      description: 'me: only for the person you are working with. team: for everyone, which only an owner can save.',
    },
  },
  required: ['note', 'scope'],

  check: async (input, env) => {
    const checked = checkNote({ staff: env.staff, text: text(input.note, 600), scope: text(input.scope, 10) });
    if (!checked.ok) return checked;
    return {
      ok: true,
      value: { text: checked.text, team: checked.team },
      subject: checked.text,
      details: [
        checked.team ? 'For the whole team, in every chat' : 'For you only, in your chats',
        'Listed in Settings, Copilot, where it can be removed',
      ],
    };
  },

  run: async ({ text: note, team }, env) => {
    const saved = await addNote({ staff: env.staff, text: note, scope: team ? 'team' : 'me', source: 'chat' });
    if (!saved.ok) throw new StepRefused(saved.message);
    return { summary: 'Kept in mind', href: '/settings/copilot' };
  },
};
