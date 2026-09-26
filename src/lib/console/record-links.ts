import 'server-only';
import { db } from '@/lib/db';
import { can, type StaffActor } from '@/lib/console/auth';

type Ref = { entityType: string | null; entityId: string | null };

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

  return links;
}

export function linkFor(links: Map<string, string>, ref: Ref): string | null {
  return ref.entityType && ref.entityId
    ? (links.get(keyOf(ref.entityType, ref.entityId)) ?? null)
    : null;
}
