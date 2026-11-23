'use server';

import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/console/auth';
import { formText } from '@/lib/console/form';
import {
  linkHosting,
  pauseHosting,
  resumeHosting,
  type HostingResult,
} from '@/lib/console/services/hosting';
import { db } from '@/lib/db';

export type HostingState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * The Hosting section's three buttons. Each is pressed by a person, and each
 * rule is checked again in the service: only an owner, and for a pause only
 * with an overdue invoice and a recorded notice. A page showing a button is
 * never what allows it.
 */

async function settle(projectId: string, result: HostingResult): Promise<HostingState> {
  if (!result.ok) return { status: 'error', message: result.message };
  const project = await db.project.findUnique({ where: { id: projectId }, select: { slug: true } });
  if (project) revalidatePath(`/admin/projects/${project.slug}`);
  // The Resume offer on invoices and receipts follows the same state.
  revalidatePath('/admin/invoices/[number]', 'page');
  revalidatePath('/admin/receipts/[number]', 'page');
  return { status: 'done', message: result.message };
}

export async function saveHostingLink(_previous: HostingState, formData: FormData): Promise<HostingState> {
  const staff = await requireStaff();
  const projectId = formText(formData, 'projectId');
  return settle(
    projectId,
    await linkHosting({ staff, projectId, vercelProject: formText(formData, 'vercelProject') }),
  );
}

export async function pauseProjectHosting(_previous: HostingState, formData: FormData): Promise<HostingState> {
  const staff = await requireStaff();
  const projectId = formText(formData, 'projectId');
  return settle(projectId, await pauseHosting({ staff, projectId }));
}

export async function resumeProjectHosting(_previous: HostingState, formData: FormData): Promise<HostingState> {
  const staff = await requireStaff();
  const projectId = formText(formData, 'projectId');
  return settle(projectId, await resumeHosting({ staff, projectId }));
}
