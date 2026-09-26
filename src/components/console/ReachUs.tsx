import { getOrg } from '@/lib/console/org';
import { whatsappLink } from '@/lib/console/whatsapp';

/**
 * How to reach us, for a page where someone may be stuck: our email, and
 * WhatsApp when our number can be read for it, or the number to call.
 */
export async function ReachUs({
  lead,
  message = 'Hello, I need help with the Ubunifu portal.',
  className,
}: {
  lead: string;
  /** What the WhatsApp message starts with. */
  message?: string;
  className?: string;
}) {
  const org = await getOrg();
  const chat = whatsappLink(org.phone, org.country, message);
  return (
    <p className={className}>
      {lead} Email <a href={`mailto:${org.email}`}>{org.email}</a>
      {chat ? (
        <>
          {' '}
          or <a href={chat}>message us on WhatsApp</a>
        </>
      ) : org.phone ? (
        ` or call ${org.phone}`
      ) : null}
      .
    </p>
  );
}
