import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requirePermission } from '@/lib/console/auth';
import { formatShortDate } from '@/lib/console/money';
import { liveEnquiry } from '@/lib/console/live';
import { ENQUIRY_STATUS_LABEL } from '@/lib/console/enquiry-labels';
import { STATUS_BADGE } from './badges';
import { ListFooter, ListToolbar, searchText } from '@/components/console/ListToolbar';
import { pageNumber, pageWindow } from '@/lib/console/paging';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Enquiries' };

/**
 * "Open" is the default because it answers the only question anyone opens this
 * screen with: what has come in that nobody has dealt with. Spam and declined
 * are kept rather than deleted — an address that sent one real enquiry and one
 * piece of spam is worth being able to look up.
 */
const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'new', label: 'New' },
  { key: 'converted', label: 'Became clients' },
  { key: 'closed', label: 'Declined & spam' },
  { key: 'all', label: 'Everything' },
  { key: 'removed', label: 'Removed' },
] as const;

/** Removed enquiries have a view of their own; every other view leaves them out. */
function scopeOf(key: string): Prisma.EnquiryWhereInput {
  return key === 'removed' ? { deletedAt: { not: null } } : liveEnquiry;
}

function filterToWhere(key: string): Prisma.EnquiryWhereInput {
  switch (key) {
    case 'new':
      return { status: 'new' };
    case 'converted':
      return { status: 'converted' };
    case 'closed':
      return { status: { in: ['declined', 'spam'] } };
    case 'all':
    case 'removed':
      return {};
    default:
      return { status: { in: ['new', 'triaged', 'in_conversation', 'qualified'] } };
  }
}

const ENQUIRY_ROW = {
  id: true,
  name: true,
  email: true,
  subject: true,
  status: true,
  source: true,
  deletedAt: true,
  createdAt: true,
  // Kept even when since removed: the enquiry still became them, but a
  // link to a page that is gone would lead nowhere.
  client: { select: { name: true, slug: true, deletedAt: true } },
} satisfies Prisma.EnquirySelect;

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; open?: string; q?: string; page?: string }>;
}) {
  await requirePermission('enquiries');
  const { show, open, q, page } = await searchParams;
  // Links from before each enquiry had its own page.
  if (open) redirect(`/enquiries/${encodeURIComponent(open)}`);

  const active = FILTERS.some((f) => f.key === show) ? show! : 'open';
  const query = searchText(q);

  const matching: Prisma.EnquiryWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { subject: { contains: query, mode: 'insensitive' } },
          { message: { contains: query, mode: 'insensitive' } },
        ],
      }
    : {};

  const viewCounts = await Promise.all(
    FILTERS.map((filter) =>
      db.enquiry.count({
        where: { AND: [scopeOf(filter.key), filterToWhere(filter.key), matching] },
      }),
    ),
  );
  const total = viewCounts[FILTERS.findIndex((f) => f.key === active)] ?? 0;
  const shown = pageWindow(pageNumber(page), total);

  const enquiries = await db.enquiry.findMany({
    where: { AND: [scopeOf(active), filterToWhere(active), matching] },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    skip: shown.skip,
    take: shown.take,
    select: ENQUIRY_ROW,
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>Enquiries</h1>
          <p className={styles.lead}>Messages from the website form and the chat.</p>
        </div>
      </div>

      <div className={table.frame}>
        <ListToolbar
          path="/enquiries"
          views={FILTERS.map((filter, index) => ({ ...filter, count: viewCounts[index] ?? 0 }))}
          current={active}
          defaultView="open"
          query={query}
          searchLabel="Search enquiries"
        />

        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">
                  From
                </th>
                <th className={table.th} scope="col">
                  Email
                </th>
                <th className={table.th} scope="col">
                  About
                </th>
                <th className={table.th} scope="col">
                  Via
                </th>
                <th className={table.th} scope="col">
                  Status
                </th>
                <th className={table.th} scope="col">
                  Client
                </th>
                <th className={table.th} scope="col">
                  Received
                </th>
              </tr>
            </thead>
            <tbody>
              {enquiries.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={7}>
                    <p className={table.emptyTitle}>
                      {query
                        ? `No enquiries match “${query}” here.`
                        : active === 'open'
                          ? 'Nothing waiting.'
                          : 'Nothing here.'}
                    </p>
                    {query && <p className={table.emptyHint}>Try another view, or search for something else.</p>}
                  </td>
                </tr>
              ) : (
                enquiries.map((enquiry) => (
                  <tr key={enquiry.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary}`}>
                      <Link href={`/enquiries/${enquiry.id}`} className={table.link}>
                        {enquiry.name}
                      </Link>
                    </td>
                    <td className={table.td}>{enquiry.email}</td>
                    <td className={`${table.td} ${table.name}`}>
                      <span className={table.clamp}>{enquiry.subject}</span>
                    </td>
                    <td className={`${table.td} ${table.muted}`}>
                      {enquiry.source === 'website_assistant' ? 'Chat' : 'Form'}
                    </td>
                    <td className={table.td}>
                      <span className={`${forms.badge} ${enquiry.deletedAt ? '' : STATUS_BADGE[enquiry.status]}`}>
                        {enquiry.deletedAt ? 'Removed' : ENQUIRY_STATUS_LABEL[enquiry.status]}
                      </span>
                    </td>
                    <td className={table.td}>
                      {!enquiry.client ? (
                        <span className={table.muted}>None</span>
                      ) : enquiry.client.deletedAt ? (
                        <Link href={`/removed/${enquiry.client.slug}`} className={table.link}>
                          {enquiry.client.name}
                        </Link>
                      ) : (
                        <Link href={`/clients/${enquiry.client.slug}`} className={table.link}>
                          {enquiry.client.name}
                        </Link>
                      )}
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>{formatShortDate(enquiry.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ListFooter
          shown={enquiries.length}
          total={total}
          noun={['enquiry', 'enquiries']}
          query={query}
          paging={{ page: shown.page, path: '/enquiries', params: { show, q: query } }}
        />
      </div>
    </main>
  );
}
