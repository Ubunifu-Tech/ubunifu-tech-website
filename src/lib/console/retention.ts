import 'server-only';
import { db } from '@/lib/db';

/**
 * How long the website chat keeps what it no longer needs.
 *
 * The privacy notice states these periods to visitors (src/app/(site)/privacy/page.tsx,
 * and its summary in src/content/privacy.ts, which the assistant reads), so a
 * change here is a change there in the same commit.
 *
 * - A chat that never became an enquiry is deleted, messages and all, once it
 *   has been quiet for 90 days. Nobody asked us to act on it, so there is
 *   nothing to keep it for.
 * - A chat that became an enquiry is kept with the enquiry, which staff need,
 *   but the network address and browser details saved to limit abuse are
 *   removed 90 days after it started. The enquiry's own record of where it
 *   came from is the contact-form rule, not this one.
 *
 * It runs now and then from the site chat's POST rather than on a schedule,
 * like the rate-limit sweep, so there is no cron job to configure or forget.
 */
export const VISITOR_CHAT_DAYS = 90;

export type PruneResult = { deleted: number; cleared: number };

/** Never throws: pruning must not cost a visitor their reply. Null when it failed. */
export async function pruneVisitorChats(now: Date = new Date()): Promise<PruneResult | null> {
  const cutoff = new Date(now.getTime() - VISITOR_CHAT_DAYS * 24 * 60 * 60_000);
  try {
    // Messages go with the conversation (onDelete: Cascade).
    const deleted = await db.conversation.deleteMany({
      where: {
        kind: 'site_visitor',
        enquiryId: null,
        OR: [{ lastMessageAt: { lt: cutoff } }, { lastMessageAt: null, createdAt: { lt: cutoff } }],
      },
    });
    const cleared = await db.conversation.updateMany({
      where: {
        kind: 'site_visitor',
        enquiryId: { not: null },
        createdAt: { lt: cutoff },
        OR: [{ ip: { not: null } }, { userAgent: { not: null } }],
      },
      data: { ip: null, userAgent: null },
    });
    return { deleted: deleted.count, cleared: cleared.count };
  } catch (error) {
    console.error('[retention] could not prune website chats', error);
    return null;
  }
}
