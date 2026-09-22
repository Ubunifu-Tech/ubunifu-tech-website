'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { StaffRole } from '@/generated/prisma/client';
import { requireStaff, requireStaffRole, recordAudit } from '@/lib/console/auth';
import { consoleEnv, isStaffEmailAllowed, staffDomains } from '@/lib/console/env';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { allow } from '@/lib/console/rate-limit';
import { formText } from '@/lib/console/form';
import { ROLE_LABEL } from '@/lib/console/people';
import { staffInviteEmail } from '@/lib/emails';

export type TeamState = { status: 'idle' | 'done' | 'error'; message?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function refresh() {
  revalidatePath('/admin/settings/team');
  revalidatePath('/admin', 'layout');
}

/** Emails a staff member a link that signs them in for the first time. */
async function sendInvite(
  person: { id: string; name: string; email: string },
  invitedBy: { id: string; name: string },
) {
  const { token } = await issueMagicToken({
    purpose: 'invite',
    actorType: 'staff',
    actorId: person.id,
  });
  const url = `${consoleEnv.adminOrigin}/sign-in/verify?token=${encodeURIComponent(token)}`;

  const sent = await sendConsoleEmail({
    to: person.email,
    subject: `${invitedBy.name} added you to the Ubunifu console`,
    html: staffInviteEmail({ name: person.name, invitedBy: invitedBy.name, url }),
    template: 'staff_invite',
    entityType: 'StaffUser',
    entityId: person.id,
  });

  await recordAudit({
    actorType: 'staff',
    actorId: invitedBy.id,
    action: sent.ok ? 'staff.invited' : 'staff.invite.send_failed',
    entityType: 'StaffUser',
    entityId: person.id,
    summary: sent.ok ? `${person.name} (${person.email})` : `${person.email}: ${sent.error}`,
  });

  return sent;
}

/** Adds someone to the team and emails them a link to sign in. */
export async function inviteStaff(_previous: TeamState, formData: FormData): Promise<TeamState> {
  const staff = await requireStaffRole('owner');

  const name = formText(formData, 'name').slice(0, 120);
  const email = formText(formData, 'email').toLowerCase();
  const title = formText(formData, 'title').slice(0, 80) || null;
  const roleRaw = formText(formData, 'role');

  if (name.length < 2) return { status: 'error', message: 'Add their name.' };
  if (!EMAIL.test(email)) return { status: 'error', message: 'Add a valid email address.' };
  if (!(Object.values(StaffRole) as string[]).includes(roleRaw)) {
    return { status: 'error', message: 'Choose a role.' };
  }
  if (!isStaffEmailAllowed(email)) {
    const domains = staffDomains();
    return {
      status: 'error',
      message: domains.length
        ? `Team members need an address ending ${domains.join(' or ')}.`
        : 'That address cannot join yet. In Vercel, add it to CONSOLE_STAFF_EMAILS (or add @ubunifutech.com to allow everyone at the company), then try again.',
    };
  }
  if (!(await allow('staff-invite', staff.id, { limit: 20, windowMinutes: 24 * 60 }))) {
    return { status: 'error', message: 'That is a lot of invitations for one day. Try again tomorrow.' };
  }

  const existing = await db.staffUser.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { status: 'error', message: 'Someone with that email is already on the team.' };

  const person = await db.staffUser.create({
    data: { name, email, title, role: roleRaw as StaffRole },
    select: { id: true, name: true, email: true },
  });

  const sent = await sendInvite(person, staff);
  refresh();

  return sent.ok
    ? { status: 'done', message: `Invitation sent to ${email}.` }
    : {
        status: 'error',
        message: `${name} is on the team, but the email did not go: ${sent.error}. Use Resend invitation.`,
      };
}

export async function resendInvite(_previous: TeamState, formData: FormData): Promise<TeamState> {
  const staff = await requireStaffRole('owner');
  const person = await db.staffUser.findUnique({
    where: { id: formText(formData, 'staffId') },
    select: { id: true, name: true, email: true, isActive: true },
  });
  if (!person || !person.isActive) return { status: 'error', message: 'They are not on the team.' };
  if (!(await allow('staff-invite', staff.id, { limit: 20, windowMinutes: 24 * 60 }))) {
    return { status: 'error', message: 'That is a lot of invitations for one day. Try again tomorrow.' };
  }

  const sent = await sendInvite(person, staff);
  refresh();
  return sent.ok
    ? { status: 'done', message: 'Sent again.' }
    : { status: 'error', message: `It did not send: ${sent.error}` };
}

/** Owners left if this change went through. The team always keeps one. */
async function ownersAfter(changedId: string, stillOwner: boolean) {
  const owners = await db.staffUser.count({
    where: { role: 'owner', isActive: true, id: { not: changedId } },
  });
  return owners + (stillOwner ? 1 : 0);
}

export async function changeRole(_previous: TeamState, formData: FormData): Promise<TeamState> {
  const staff = await requireStaffRole('owner');
  const roleRaw = formText(formData, 'role');
  if (!(Object.values(StaffRole) as string[]).includes(roleRaw)) {
    return { status: 'error', message: 'Choose a role.' };
  }
  const role = roleRaw as StaffRole;

  const person = await db.staffUser.findUnique({
    where: { id: formText(formData, 'staffId') },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!person) return { status: 'error', message: 'They are not on the team.' };
  if (person.id === staff.id) {
    return { status: 'error', message: 'Ask another owner to change your own role.' };
  }
  if (person.role === role) return { status: 'done' };
  if (person.role === 'owner' && (await ownersAfter(person.id, false)) === 0) {
    return { status: 'error', message: 'The team needs at least one owner.' };
  }

  await db.staffUser.update({ where: { id: person.id }, data: { role } });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'staff.role_changed',
    entityType: 'StaffUser',
    entityId: person.id,
    summary: `${person.name}: ${ROLE_LABEL[person.role]} to ${ROLE_LABEL[role]}`,
  });

  refresh();
  return { status: 'done', message: `${person.name} is now ${ROLE_LABEL[role].toLowerCase()}.` };
}

/**
 * Removes someone, or brings them back. Removal is not deletion: everything
 * they did stays attributed to them, and their open tasks are left assigned
 * so nobody's work silently loses its owner. Sessions end at once, because
 * every request re-checks isActive.
 */
export async function setActive(_previous: TeamState, formData: FormData): Promise<TeamState> {
  const staff = await requireStaffRole('owner');
  const active = formText(formData, 'active') === 'true';

  const person = await db.staffUser.findUnique({
    where: { id: formText(formData, 'staffId') },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!person) return { status: 'error', message: 'They are not on the team.' };
  if (person.id === staff.id) return { status: 'error', message: 'You cannot remove yourself.' };
  if (!active && person.role === 'owner' && (await ownersAfter(person.id, false)) === 0) {
    return { status: 'error', message: 'The team needs at least one owner.' };
  }

  await db.staffUser.update({ where: { id: person.id }, data: { isActive: active } });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: active ? 'staff.reactivated' : 'staff.deactivated',
    entityType: 'StaffUser',
    entityId: person.id,
    summary: person.name,
  });

  refresh();
  return { status: 'done', message: active ? `${person.name} is back.` : `${person.name} removed.` };
}

/** Anyone's own name and title. */
export async function saveProfile(_previous: TeamState, formData: FormData): Promise<TeamState> {
  const staff = await requireStaff();
  const name = formText(formData, 'name').slice(0, 120);
  const title = formText(formData, 'title').slice(0, 80) || null;
  if (name.length < 2) return { status: 'error', message: 'Add your name.' };

  if (name === staff.name && title === staff.title) return { status: 'done', message: 'Nothing changed.' };

  await db.staffUser.update({ where: { id: staff.id }, data: { name, title } });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'staff.profile_saved',
    entityType: 'StaffUser',
    entityId: staff.id,
    summary: title ? `${name}, ${title}` : name,
  });

  refresh();
  return { status: 'done', message: 'Saved.' };
}
