import 'server-only';
import type { DocumentKind } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { getOrg } from './org';
import { carriesFees, feeProblems, feeSchedule, hasFeesToken, projectFees, projectFeesLater, withFees } from './fees';

/**
 * Whether a document can go to the client, and what it will say when it does.
 *
 * The review step and the send action both ask this, so what the review step
 * shows as ready is exactly what the send action accepts. Each check that
 * fails says where it is fixed.
 */

export type DocumentStep = 'details' | 'fees' | 'write' | 'review' | 'send';

export type ReadyCheck = {
  ok: boolean;
  label: string;
  /** Shown when the check fails. */
  problem?: string;
  /** Names the one check a link shared by hand can do without: an email. */
  key?: 'signer-email';
  fix?: { step?: DocumentStep; href?: string; text: string };
};

export type Prepared = {
  /** What the author wrote, with {{fees}} still in it. */
  source: string;
  /** What the client will read and sign. */
  final: string;
  withFeeTable: boolean;
  checks: ReadyCheck[];
  ready: boolean;
  signer: { id: string; name: string; email: string | null } | null;
};

/** The text the author is working on: the source when a version kept one. */
export function authorText(version: { bodyMarkdown: string; sourceMarkdown: string | null }) {
  return version.sourceMarkdown ?? version.bodyMarkdown;
}

export async function prepareDocument(document: {
  kind: DocumentKind;
  source: string;
  project: { id: string; currency: string; clientSlug: string; clientId: string };
}): Promise<Prepared> {
  const { kind, source, project } = document;
  const withFeeTable = carriesFees(kind) || hasFeesToken(source);

  const [lines, later, signer, org] = await Promise.all([
    withFeeTable ? projectFees(project.id) : Promise.resolve([]),
    withFeeTable ? projectFeesLater(project.id) : Promise.resolve([]),
    db.clientContact.findFirst({
      where: { clientId: project.clientId, deletedAt: null, canSignIn: true, isPrimary: true },
      select: { id: true, name: true, email: true },
    }),
    getOrg(),
  ]);
  const vatBps = org.chargesVat ? org.vatRateBps : 0;

  const final = withFeeTable
    ? withFees(source, feeSchedule(lines, project.currency, vatBps, later), kind)
    : source;

  const checks: ReadyCheck[] = [];

  const written = source.trim().length >= 40;
  checks.push({
    ok: written,
    label: 'The document is written',
    problem: 'There is nothing to send yet.',
    fix: { step: 'write', text: 'Write it' },
  });

  const markers = (final.match(/\[TO CONFIRM/g) ?? []).length;
  checks.push({
    ok: markers === 0,
    label: 'Nothing is left to confirm',
    problem: `${markers} ${markers === 1 ? 'detail is' : 'details are'} marked TO CONFIRM.`,
    fix: { step: 'write', text: 'Fill them in' },
  });

  if (withFeeTable) {
    const problems = feeProblems(lines, project.currency, kind, later.length);
    checks.push({
      ok: problems.length === 0,
      label:
        lines.length === 0
          ? 'Fees'
          : `${lines.length} ${lines.length === 1 ? 'fee is' : 'fees are'} in the fee table`,
      problem: problems.join(' '),
      fix: { step: 'fees', text: 'Set up the fees' },
    });
  }

  checks.push({
    ok: signer !== null && signer.email !== null,
    label: signer ? `${signer.name} will sign` : 'Someone at the client can sign',
    problem: !signer
      ? 'The client has no main contact yet.'
      : `${signer.name} has no email address yet. Share a link for them to sign instead.`,
    fix: { href: `/clients/${project.clientSlug}`, text: signer ? 'Open the client' : 'Add a contact' },
    ...(signer ? { key: 'signer-email' as const } : {}),
  });

  return {
    source,
    final,
    withFeeTable,
    checks,
    ready: checks.every((check) => check.ok),
    signer,
  };
}
