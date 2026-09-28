import 'server-only';
import { db } from '@/lib/db';
import { can, type StaffActor } from '@/lib/console/auth';

type Ref = { entityType: string | null; entityId: string | null; action?: string };

const keyOf = (type: string, id: string) => `${type}:${id}`;

/**
 * Where each record in a list of activity lines opens, keyed "Type:id", so a
 * line about an invoice or a failed email is one click from the thing it is
 * about. Looked up in one query per kind of record. Anything that cannot be
 * opened any more (a removed project, say), or that this person is not
 * allowed to open, is simply left without a link.
 */
export async function recordLinks(refs: Ref[], staff: StaffActor): Promise<Map<string, string>> {
  const allowed: Record<string, boolean> = {
    Invoice: can(staff, 'invoices'),
    Receipt: can(staff, 'invoices'),
    Refund: can(staff, 'invoices'),
    Document: can(staff, 'documents'),
    Enquiry: can(staff, 'enquiries'),
    Cost: can(staff, 'finance'),
    Income: can(staff, 'finance'),
    Product: can(staff, 'finance'),
    Post: can(staff, 'journal'),
    Writer: can(staff, 'journal'),
    DocumentDefault: can(staff, 'documents'),
    RegularCost: can(staff, 'finance'),
    OrgSettings: can(staff, 'billing_settings'),
  };
  const ids = (type: string) =>
    allowed[type] === false
      ? []
      : [
          ...new Set(
            refs.flatMap((ref) =>
              ref.entityType === type && ref.entityId ? [ref.entityId] : [],
            ),
          ),
        ];
  const links = new Map<string, string>();
  const put = (type: string, id: string, href: string) => links.set(keyOf(type, id), href);

  const [
    invoices,
    receipts,
    refunds,
    documents,
    projects,
    updates,
    tickets,
    contacts,
    clients,
    items,
    costs,
    income,
    posts,
    writers,
  ] = await Promise.all([
    db.invoice.findMany({
      where: { id: { in: ids('Invoice') } },
      select: { id: true, number: true },
    }),
    db.receipt.findMany({
      where: { id: { in: ids('Receipt') } },
      select: { id: true, number: true },
    }),
    db.refund.findMany({
      where: { id: { in: ids('Refund') } },
      select: { id: true, number: true },
    }),
    db.document.findMany({
      where: { id: { in: ids('Document') } },
      select: { id: true, reference: true },
    }),
    db.project.findMany({
      where: { id: { in: ids('Project') }, deletedAt: null },
      select: { id: true, slug: true },
    }),
    db.projectUpdate.findMany({
      where: { id: { in: ids('ProjectUpdate') }, project: { deletedAt: null } },
      select: { id: true, project: { select: { slug: true } } },
    }),
    db.ticket.findMany({
      where: { id: { in: ids('Ticket') } },
      select: { id: true, reference: true },
    }),
    db.clientContact.findMany({
      where: { id: { in: ids('ClientContact') } },
      select: { id: true, client: { select: { slug: true, deletedAt: true } } },
    }),
    db.client.findMany({
      where: { id: { in: ids('Client') } },
      select: { id: true, slug: true, deletedAt: true },
    }),
    db.assetRequest.findMany({
      where: { id: { in: ids('AssetRequest') }, project: { deletedAt: null } },
      select: { id: true, project: { select: { slug: true } } },
    }),
    db.cost.findMany({
      where: { id: { in: ids('Cost') } },
      select: { id: true, incurredOn: true },
    }),
    db.income.findMany({
      where: { id: { in: ids('Income') } },
      select: { id: true, receivedOn: true },
    }),
    db.post.findMany({
      where: { id: { in: ids('Post') } },
      select: { id: true, deletedAt: true },
    }),
    db.writer.findMany({
      where: { id: { in: ids('Writer') } },
      select: { id: true, deletedAt: true },
    }),
  ]);

  for (const row of invoices) put('Invoice', row.id, `/invoices/${row.number}`);
  for (const row of receipts) put('Receipt', row.id, `/receipts/${row.number}`);
  for (const row of refunds) put('Refund', row.id, `/refunds/${row.number}`);
  for (const row of documents) put('Document', row.id, `/documents/${row.reference}`);
  for (const row of projects) put('Project', row.id, `/projects/${row.slug}`);
  for (const row of updates)
    put('ProjectUpdate', row.id, `/projects/${row.project.slug}?tab=updates`);
  for (const row of tickets) put('Ticket', row.id, `/requests/${row.reference}`);
  for (const row of contacts) {
    put(
      'ClientContact',
      row.id,
      row.client.deletedAt ? `/removed/${row.client.slug}` : `/clients/${row.client.slug}`,
    );
  }
  for (const row of clients) {
    put('Client', row.id, row.deletedAt ? `/removed/${row.slug}` : `/clients/${row.slug}`);
  }
  for (const row of items) {
    put('AssetRequest', row.id, `/projects/${row.project.slug}#from-the-client`);
  }
  for (const id of ids('Enquiry')) put('Enquiry', id, `/enquiries/${id}`);
  for (const id of ids('StaffUser')) put('StaffUser', id, '/settings/team');
  for (const row of costs) {
    put('Cost', row.id, `/finance/costs?month=${row.incurredOn.toISOString().slice(0, 7)}`);
  }
  for (const row of income) {
    put('Income', row.id, `/finance/income?month=${row.receivedOn.toISOString().slice(0, 7)}`);
  }
  for (const id of ids('Product')) put('Product', id, '/settings/products');
  // An archived post or writer opens where it can be brought back from.
  for (const row of posts) {
    put('Post', row.id, row.deletedAt ? '/posts?show=archived' : `/posts/${row.id}`);
  }
  for (const row of writers) {
    put('Writer', row.id, row.deletedAt ? '/posts/writers#archived' : `/posts/writers/${row.id}`);
  }
  for (const id of ids('DocumentDefault')) put('DocumentDefault', id, '/settings/documents');
  for (const id of ids('RegularCost')) put('RegularCost', id, '/finance/costs#regular-costs');
  for (const id of ids('OrgSettings')) put('OrgSettings', id, '/settings/billing');

  return links;
}

export function linkFor(links: Map<string, string>, ref: Ref): string | null {
  // Logged against OrgSettings like the billing details, but it is the Team
  // page that shows and changes permissions.
  if (ref.action === 'staff.permissions_changed') return '/settings/team';
  return ref.entityType && ref.entityId
    ? (links.get(keyOf(ref.entityType, ref.entityId)) ?? null)
    : null;
}
