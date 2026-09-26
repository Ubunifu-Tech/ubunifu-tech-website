import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';

/**
 * The address the team's email links to. It opens the enquiry, with its
 * chat, in whichever list it now sits, so the link still lands on it after
 * somebody has already triaged it.
 */
export default async function EnquiryLink({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('enquiries');
  const { id } = await params;
  // A removed one still opens, in the Removed view, where it can be brought back.
  const enquiry = await db.enquiry.findFirst({
    where: { id },
    select: { id: true, status: true, deletedAt: true },
  });
  if (!enquiry) notFound();

  const show = enquiry.deletedAt
    ? 'removed'
    : enquiry.status === 'new'
      ? 'new'
      : ['declined', 'spam'].includes(enquiry.status)
        ? 'closed'
        : enquiry.status === 'converted'
          ? 'converted'
          : 'open';
  redirect(`/enquiries?show=${show}&open=${enquiry.id}`);
}
