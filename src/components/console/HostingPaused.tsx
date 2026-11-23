import Link from 'next/link';
import { Callout } from './Callout';
import { ResumeHostingButton } from './ResumeHostingButton';
import { hostingFacts } from '@/lib/console/services/hosting';
import { formatShortDate } from '@/lib/console/money';

/**
 * Said on an invoice or a receipt while its project's hosting is paused.
 * Once a payment has been recorded since the pause, it offers Resume: to an
 * owner as a button, to anyone else as where it is done. A person presses it;
 * recording a payment never resumes anything by itself.
 */
export async function HostingPaused({
  projectId,
  owner,
  onlyAfterPayment = false,
}: {
  projectId: string;
  owner: boolean;
  /** For pages about a payment: say nothing until one has been recorded since the pause. */
  onlyAfterPayment?: boolean;
}) {
  const facts = await hostingFacts(projectId);
  if (!facts?.project.hostingPausedAt || !facts.project.vercelProjectId) return null;
  const { project, paidSince } = facts;
  if (onlyAfterPayment && !paidSince) return null;

  return (
    <Callout
      kind={paidSince ? 'warn' : 'info'}
      title={`Hosting for ${project.name} is paused`}
      action={
        owner ? (
          paidSince ? (
            <ResumeHostingButton projectId={project.id} />
          ) : (
            <Link href={`/projects/${project.slug}#hosting`}>Open its Hosting section</Link>
          )
        ) : undefined
      }
    >
      {paidSince
        ? `A payment on ${paidSince.invoiceNumber} was recorded on ${formatShortDate(paidSince.receivedAt)}, after the pause on ${formatShortDate(project.hostingPausedAt)}. The site stays offline until someone resumes it.`
        : `It was paused on ${formatShortDate(project.hostingPausedAt)}. No payment has been recorded since.`}
      {!owner && ' An owner can resume it from the project page.'}
    </Callout>
  );
}
