'use server';

import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/console/auth';
import { formText } from '@/lib/console/form';
import { addNote, removeNote, saveInstruction } from '@/lib/console/staff-agent/memory';

export type CopilotSettingsState = { status: 'idle' | 'done' | 'error'; message?: string };

const settle = (result: { ok: boolean; message: string }): CopilotSettingsState => {
  if (result.ok) revalidatePath('/admin/settings/copilot');
  return { status: result.ok ? 'done' : 'error', message: result.message };
};

/** House instructions for one agent. Owners only, checked where they are saved. */
export async function saveAgentInstruction(_previous: CopilotSettingsState, formData: FormData): Promise<CopilotSettingsState> {
  const staff = await requireStaff();
  return settle(await saveInstruction({ staff, kind: formText(formData, 'kind'), text: formText(formData, 'text') }));
}

export async function addCopilotNote(_previous: CopilotSettingsState, formData: FormData): Promise<CopilotSettingsState> {
  const staff = await requireStaff();
  return settle(
    await addNote({ staff, text: formText(formData, 'text'), scope: formText(formData, 'scope'), source: 'settings' }),
  );
}

export async function removeCopilotNote(_previous: CopilotSettingsState, formData: FormData): Promise<CopilotSettingsState> {
  const staff = await requireStaff();
  return settle(await removeNote({ staff, id: formText(formData, 'id') }));
}
