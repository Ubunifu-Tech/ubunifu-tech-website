'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { PaymentMethod, Prisma } from '@/generated/prisma/client';
import { getOrg } from '@/lib/console/org';
import { retryOnConflict } from '@/lib/console/conflict';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { invoiceEmail, receiptEmail } from '@/lib/emails';
import {
  billableLines,
  type Billable,
  nextInvoiceNumber,
  nextReceiptNumber,
  recomputeInvoice,
} from '@/lib/console/billing';
import { markRenewalInvoiced, periodLabel } from '@/lib/console/renewals';
import { formatMoney, parseDateInput, parseMoney } from '@/lib/console/money';
import { formText } from '@/lib/console/form';
import { liveInvoice, livePayment } from '@/lib/console/live';

export type BillingState = { status: 'idle' | 'done' | 'error'; message?: string };

/** Thrown inside the transaction when a fee was invoiced by someone else first. */
class AlreadyBilled extends Error {}

/** Thrown inside the transaction when a payment would take the invoice past paid. */
class Overpaid extends Error {}

/** Thrown inside the transaction when the invoice was voided while the form was open. */
class Voided extends Error {}

/** Thrown inside the transaction when the project or its client was removed meanwhile. */
class Gone extends Error {}

/**
 * Writes an invoice for fee lines, inside the caller's transaction.
 *
 * Shared by raising an invoice and by taking a payment that came before one,
 * so both guard against billing a fee twice the same way.
 */
async function invoiceForBillables(
  tx: Prisma.TransactionClient,
  input: {
    project: { id: string; clientId: string };
    lines: Billable[];
    currency: string;
    notes: string;
    dueAt: Date | null;
    taxMinor: number;
    /** Set when the invoice is issued as it is made, rather than drafted. */
    issuedAt?: Date;
  },
): Promise<{ id: string; number: string }> {
  const { project, lines, notes, dueAt, taxMinor } = input;
  /**
   * Two people invoicing the same fee at the same moment must not both
   * succeed. The fee rows are locked for the length of this transaction and
   * what is still unbilled is read again under the lock: the second invoice
   * waits, sees the first, and stops. Renewal periods are guarded the same
   * way by markRenewalInvoiced below.
   */
  const oneOff = lines.filter((line) => !line.renewalEventId);
  if (oneOff.length > 0) {
    const ids = oneOff.map((line) => line.lineItemId);
    await tx.$queryRaw`SELECT id FROM "LineItem" WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;
    const current = await tx.lineItem.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        amountMinor: true,
        quantity: true,
        invoiceLines: {
          where: { invoice: { status: { not: 'void' } } },
          select: { amountMinor: true, quantity: true },
        },
      },
    });
    for (const line of oneOff) {
      const fee = current.find((row) => row.id === line.lineItemId);
      const billed = (fee?.invoiceLines ?? []).reduce((t, l) => t + l.amountMinor * l.quantity, 0);
      const left = fee ? fee.amountMinor * fee.quantity - billed : 0;
      if (line.amountMinor > left) throw new AlreadyBilled();
    }
  }

  const number = await nextInvoiceNumber(tx);
  const created = await tx.invoice.create({
    data: {
      number,
      clientId: project.clientId,
      projectId: project.id,
      currency: input.currency,
      notes: notes || null,
      dueAt,
      taxMinor,
      ...(input.issuedAt ? { status: 'sent' as const, issuedAt: input.issuedAt } : {}),
      lines: {
        create: lines.map((line, index) => ({
          lineItemId: line.lineItemId,
          label: line.label,
          // A renewal says which period it covers, because "Hosting" on its
          // own tells a client nothing about which year they are paying for.
          description:
            line.periodStart && line.periodEnd
              ? `${periodLabel(line.periodStart, line.periodEnd)}${line.terms ? ` · ${line.terms}` : ''}`
              : line.terms,
          amountMinor: line.amountMinor,
          quantity: 1,
          position: index,
        })),
      },
    },
    select: { id: true, number: true },
  });

  // Marks each period invoiced and moves its line on to the next one. Throws
  // if a period was billed between the read above and here, which rolls the
  // whole invoice back rather than charging for it twice.
  for (const line of lines) {
    if (line.renewalEventId) {
      await markRenewalInvoiced(tx, line.renewalEventId, created.id);
    }
  }

  return created;
}

/**
 * The fee lines a form chose, checked against what is billable now, with the
 * VAT that goes on top. Re-derived from the database rather than trusted from
 * the form: what was billable when the page rendered may have been invoiced by
 * somebody else since, and a renewal period is exactly the thing two people
 * can bill at once.
 */
async function pickBillables(projectId: string, chosen: string[]) {
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, slug: true, currency: true, clientId: true, name: true },
  });
  if (!project) return { error: 'That project no longer exists.' } as const;

  const billable = await billableLines(project.id);
  const lines = billable.filter((item) => chosen.includes(item.key));

  if (lines.length !== chosen.length) {
    return {
      error:
        'One of those can no longer be billed. It may have been invoiced already. Reload and try again.',
    } as const;
  }
  if (lines.some((line) => line.amountMinor === 0)) {
    return {
      error: 'One of those lines has no price. An invoice cannot carry a blank amount.',
    } as const;
  }

  const currencies = [...new Set(lines.map((line) => line.currency))];
  if (currencies.length > 1) {
    return {
      error: `Those lines are in ${currencies.join(' and ')}. One invoice can only be in one currency.`,
    } as const;
  }

  // VAT is added on top of the fees when the company charges it, at the rate
  // in the billing details at the moment the invoice is raised.
  const org = await getOrg();
  const subtotal = lines.reduce((total, line) => total + line.amountMinor, 0);
  const taxMinor =
    org.chargesVat && org.vatRateBps > 0 ? Math.round((subtotal * org.vatRateBps) / 10_000) : 0;

  return {
    project,
    lines,
    currency: currencies[0]!,
    taxMinor,
    totalMinor: subtotal + taxMinor,
  } as const;
}

/**
 * Raises an invoice from a project's fee lines.
 *
 * The lines are copied, not referenced. Re-pricing the project afterwards must
 * not silently rewrite a demand for money the client is already holding, so the
 * invoice keeps its own snapshot of what was charged and why.
 */
export async function createInvoice(
  _previous: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const staff = await requireStaff();
  if (!can(staff, 'invoices')) return { status: 'error', message: NO_PERMISSION };

  const projectId = String(formData.get('projectId') ?? '');
  const chosen = formData.getAll('billables').map(String).filter(Boolean);

  if (chosen.length === 0) {
    return { status: 'error', message: 'Pick at least one fee line to invoice.' };
  }

  const picked = await pickBillables(projectId, chosen);
  if ('error' in picked) return { status: 'error', message: picked.error };
  const { project, lines, currency, taxMinor } = picked;

  const dueAt = parseDateInput(String(formData.get('dueAt') ?? '').trim());
  const notes = formText(formData, 'notes');

  let invoice: { id: string; number: string };
  try {
    invoice = await retryOnConflict(() =>
      db.$transaction(async (tx) => {
        const created = await invoiceForBillables(tx, {
          project,
          lines,
          currency,
          notes,
          dueAt,
          taxMinor,
        });
        await recomputeInvoice(tx, created.id);
        return created;
      }),
    );
  } catch (error) {
    if (error instanceof AlreadyBilled) {
      return {
        status: 'error',
        message: 'Someone invoiced one of those fees a moment ago. Reload to see what is left.',
      };
    }
    throw error;
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'invoice.created',
    entityType: 'Invoice',
    entityId: invoice.id,
    summary: `${invoice.number} for ${project.name}`,
  });

  revalidatePath('/admin/invoices');
  revalidatePath(`/admin/projects/${project.slug}`);
  redirect(`/invoices/${invoice.number}`);
}

/**
 * Sends the invoice, with a link the client can open without signing in.
 *
 * The send is recorded whether or not the email leaves — EmailLog holds the
 * attempt and its outcome, so "they say they never got it" is answerable from
 * our own database rather than from a provider's dashboard.
 */
export async function sendInvoice(
  _previous: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const staff = await requireStaff();
  if (!can(staff, 'invoices')) return { status: 'error', message: NO_PERMISSION };
  const invoiceId = String(formData.get('invoiceId') ?? '');

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId, ...liveInvoice },
    select: {
      id: true,
      number: true,
      status: true,
      totalMinor: true,
      paidMinor: true,
      currency: true,
      dueAt: true,
      client: {
        select: {
          name: true,
          contacts: {
            where: { deletedAt: null, isPrimary: true },
            select: { id: true, name: true, email: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!invoice) return { status: 'error', message: 'That invoice no longer exists.' };
  if (invoice.status === 'void') {
    return { status: 'error', message: 'A void invoice cannot be sent.' };
  }

  const contact = invoice.client.contacts[0];
  if (!contact) {
    return {
      status: 'error',
      message: 'This client has no main contact to send it to. Add one first.',
    };
  }
  if (!contact.email) {
    return {
      status: 'error',
      message: `There is no email address for ${contact.name} yet. Share their setup link first.`,
    };
  }

  const { token } = await issueMagicToken({
    purpose: 'invoice_access',
    actorType: 'client_contact',
    actorId: contact.id,
    entityType: 'Invoice',
    entityId: invoice.id,
  });

  const sent = await sendConsoleEmail({
    to: contact.email,
    subject: `Invoice ${invoice.number} from Ubunifu Technologies`,
    html: invoiceEmail({
      name: contact.name,
      clientName: invoice.client.name,
      number: invoice.number,
      total: formatMoney(invoice.totalMinor, invoice.currency),
      paid: invoice.paidMinor > 0 ? formatMoney(invoice.paidMinor, invoice.currency) : null,
      outstanding:
        invoice.totalMinor - invoice.paidMinor > 0
          ? formatMoney(invoice.totalMinor - invoice.paidMinor, invoice.currency)
          : null,
      dueAt: invoice.dueAt,
      url: `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`,
    }),
    template: 'invoice_sent',
    entityType: 'Invoice',
    entityId: invoice.id,
  });

  await db.$transaction(async (tx) => {
    // Only a draft is issued here, judged at the moment of writing: the email
    // took a while, and the invoice may have been voided or paid meanwhile. A
    // void stays void, and issuedAt is write-once, because the date the client
    // was first asked is what payment terms run from.
    await tx.invoice.updateMany({
      where: { id: invoice.id, status: 'draft' },
      data: { status: 'sent', issuedAt: new Date() },
    });
    await recomputeInvoice(tx, invoice.id);
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'invoice.sent',
    entityType: 'Invoice',
    entityId: invoice.id,
    summary: `${invoice.number} to ${contact.email}`,
  });

  revalidatePath(`/admin/invoices/${invoice.number}`);
  revalidatePath('/admin/invoices');

  if (!sent.ok) {
    return {
      status: 'error',
      message: `The invoice is marked sent and the attempt is logged, but the email did not go: ${sent.error}`,
    };
  }
  return { status: 'done', message: `Sent to ${contact.email}.` };
}

/** The payment fields a form sent, checked. */
function readPayment(formData: FormData, currency: string) {
  const amountMinor = parseMoney(String(formData.get('amount') ?? ''), currency);
  if (amountMinor === null || amountMinor <= 0) {
    return { error: 'Enter the amount that was received.' } as const;
  }
  const receivedAt = parseDateInput(String(formData.get('receivedAt') ?? '').trim());
  if (!receivedAt) return { error: 'Enter the date the money arrived.' } as const;
  if (receivedAt.getTime() > Date.now() + 86_400_000) {
    return { error: 'That date is in the future.' } as const;
  }
  const method = String(formData.get('method') ?? '');
  if (!Object.values(PaymentMethod).includes(method as PaymentMethod)) {
    return { error: 'Choose how the money arrived.' } as const;
  }
  return {
    amountMinor,
    receivedAt,
    method: method as PaymentMethod,
    reference: String(formData.get('reference') ?? '')
      .trim()
      .slice(0, 120),
    note: formText(formData, 'note').slice(0, 500),
  } as const;
}

/** A payment and its numbered receipt, inside the caller's transaction. */
async function writePayment(
  tx: Prisma.TransactionClient,
  input: {
    invoiceId: string;
    currency: string;
    amountMinor: number;
    receivedAt: Date;
    method: PaymentMethod;
    reference: string;
    note: string;
    staffId: string;
  },
): Promise<{ id: string; number: string }> {
  const payment = await tx.payment.create({
    data: {
      invoiceId: input.invoiceId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      method: input.method,
      reference: input.reference || null,
      receivedAt: input.receivedAt,
      recordedById: input.staffId,
      note: input.note || null,
    },
    select: { id: true },
  });
  const number = await nextReceiptNumber(tx);
  return tx.receipt.create({
    data: { number, paymentId: payment.id },
    select: { id: true, number: true },
  });
}

export type EarlyPaymentState = BillingState & {
  receipt?: { id: string; number: string };
  invoiceNumber?: string;
};

/**
 * Money that arrived before an invoice, or before anything was signed: a
 * deposit sent on WhatsApp the day the work was agreed.
 *
 * Every payment still belongs to an invoice, so totals, receipts and what the
 * client sees stay one story. This makes the invoice for the fees the money
 * covers, issued and dated today, and records the payment and its receipt
 * against it in the same transaction. Part of the amount is fine; the rest
 * stays owed on that invoice.
 */
export async function recordEarlyPayment(
  _previous: EarlyPaymentState,
  formData: FormData,
): Promise<EarlyPaymentState> {
  const staff = await requireStaff();
  if (!can(staff, 'invoices')) return { status: 'error', message: NO_PERMISSION };

  const chosen = formData.getAll('billables').map(String).filter(Boolean);
  if (chosen.length === 0) {
    return { status: 'error', message: 'Pick what the money is for.' };
  }

  const picked = await pickBillables(String(formData.get('projectId') ?? ''), chosen);
  if ('error' in picked) return { status: 'error', message: picked.error };
  const { project, lines, currency, taxMinor, totalMinor } = picked;

  const read = readPayment(formData, currency);
  if ('error' in read) return { status: 'error', message: read.error };
  if (read.amountMinor > totalMinor) {
    return {
      status: 'error',
      message: `That is more than the ${formatMoney(totalMinor, currency)} those fees come to. Pick more of them, or add a fee for the rest.`,
    };
  }

  // Paid in full, it was due the day it was paid. Paid in part, the rest is
  // due when the fees say, or in the usual fourteen days, not overdue at once.
  const fortnight = new Date();
  fortnight.setDate(fortnight.getDate() + 14);
  const feesDue = lines
    .map((line) => line.dueAt)
    .filter((due): due is Date => due !== null && due.getTime() > Date.now())
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const dueAt = read.amountMinor < totalMinor ? (feesDue ?? fortnight) : read.receivedAt;

  let result: { invoice: { id: string; number: string }; receipt: { id: string; number: string } };
  try {
    result = await retryOnConflict(() =>
      db.$transaction(async (tx) => {
        // Held until this commits, so removing the client or project waits
        // for the payment, or the payment sees the removal and stops.
        const live = await tx.$queryRaw<{ id: string }[]>`
          SELECT p.id FROM "Project" p JOIN "Client" c ON c.id = p."clientId"
          WHERE p.id = ${project.id} AND p."deletedAt" IS NULL AND c."deletedAt" IS NULL
          FOR SHARE OF p, c`;
        if (live.length === 0) throw new Gone();

        const invoice = await invoiceForBillables(tx, {
          project,
          lines,
          currency,
          notes: formText(formData, 'notes'),
          dueAt,
          taxMinor,
          issuedAt: new Date(),
        });
        const receipt = await writePayment(tx, {
          invoiceId: invoice.id,
          currency,
          ...read,
          staffId: staff.id,
        });
        await recomputeInvoice(tx, invoice.id);
        return { invoice, receipt };
      }),
    );
  } catch (error) {
    if (error instanceof AlreadyBilled) {
      return {
        status: 'error',
        message: 'Someone invoiced one of those fees a moment ago. Reload to see what is left.',
      };
    }
    if (error instanceof Gone) {
      return { status: 'error', message: 'That project was removed a moment ago.' };
    }
    throw error;
  }

  const amount = formatMoney(read.amountMinor, currency);
  const left = totalMinor - read.amountMinor;
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'invoice.created',
    entityType: 'Invoice',
    entityId: result.invoice.id,
    summary: `${result.invoice.number} for ${project.name}, issued with a payment`,
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'payment.recorded',
    entityType: 'Invoice',
    entityId: result.invoice.id,
    summary: `${amount}, receipt ${result.receipt.number}`,
    metadata: { method: read.method, reference: read.reference || null },
  });

  revalidatePath('/admin/invoices');
  revalidatePath(`/admin/invoices/${result.invoice.number}`);
  revalidatePath(`/admin/projects/${project.slug}`);
  return {
    status: 'done',
    message:
      left > 0
        ? `${amount} recorded on ${result.invoice.number}, with ${formatMoney(left, currency)} still owed on it. Receipt ${result.receipt.number} is ready.`
        : `${amount} recorded on ${result.invoice.number}, paid in full. Receipt ${result.receipt.number} is ready.`,
    receipt: result.receipt,
    invoiceNumber: result.invoice.number,
  };
}

/**
 * Records a payment that arrived by bank transfer, mobile money or cash, and
 * issues the receipt for it.
 *
 * There is no gateway and no webhook: this is the only way money ever becomes
 * true in this system, which is why every field it writes is checked and why
 * the receipt is issued in the same transaction. A payment without a receipt is
 * a payment the client cannot prove they made.
 */
export async function recordPayment(
  _previous: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const staff = await requireStaff();
  if (!can(staff, 'invoices')) return { status: 'error', message: NO_PERMISSION };
  const invoiceId = String(formData.get('invoiceId') ?? '');

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId, ...liveInvoice },
    select: {
      id: true,
      number: true,
      status: true,
      currency: true,
      totalMinor: true,
      paidMinor: true,
      clientId: true,
    },
  });

  if (!invoice) return { status: 'error', message: 'That invoice no longer exists.' };
  if (invoice.status === 'void') {
    return { status: 'error', message: 'A void invoice cannot take a payment.' };
  }

  const read = readPayment(formData, invoice.currency);
  if ('error' in read) return { status: 'error', message: read.error };
  const { amountMinor, receivedAt, method, reference, note } = read;

  const outstanding = invoice.totalMinor - invoice.paidMinor;
  if (amountMinor > outstanding) {
    return {
      status: 'error',
      message: `That is more than the ${formatMoney(outstanding, invoice.currency)} still outstanding. Record the amount actually received, and raise a separate invoice for anything extra.`,
    };
  }

  let receipt: { id: string; number: string; wasDraft: boolean };
  try {
    receipt = await retryOnConflict(() =>
      db.$transaction(async (tx) => {
        // A double click, or two people recording the same transfer, must not
        // both land. The invoice is locked and what is owed is read again under
        // the lock, so the second one sees the first and stops.
        await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoice.id} FOR UPDATE`;
        const fresh = await tx.invoice.findUniqueOrThrow({
          where: { id: invoice.id },
          select: { status: true, issuedAt: true, totalMinor: true, paidMinor: true },
        });
        if (fresh.status === 'void') throw new Voided();
        if (amountMinor > fresh.totalMinor - fresh.paidMinor) throw new Overpaid();

        // Paid before it was sent: the payment is what issues it. A draft
        // otherwise stays a draft whatever is paid against it. What is left
        // falls due in the usual fourteen days if its date has already gone.
        const wasDraft = fresh.status === 'draft';
        if (wasDraft) {
          const leftOver = fresh.totalMinor - fresh.paidMinor - amountMinor > 0;
          const fortnight = new Date();
          fortnight.setDate(fortnight.getDate() + 14);
          const current = await tx.invoice.findUniqueOrThrow({
            where: { id: invoice.id },
            select: { dueAt: true },
          });
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              status: 'sent',
              issuedAt: fresh.issuedAt ?? new Date(),
              ...(leftOver && (!current.dueAt || current.dueAt.getTime() < Date.now())
                ? { dueAt: fortnight }
                : {}),
            },
          });
        }

        const created = await writePayment(tx, {
          invoiceId: invoice.id,
          currency: invoice.currency,
          amountMinor,
          receivedAt,
          method,
          reference,
          note,
          staffId: staff.id,
        });
        await recomputeInvoice(tx, invoice.id);
        return { ...created, wasDraft };
      }),
    );
  } catch (error) {
    if (error instanceof Overpaid) {
      return {
        status: 'error',
        message:
          'A payment was recorded against this invoice a moment ago. Reload to see what is still owed.',
      };
    }
    if (error instanceof Voided) {
      return { status: 'error', message: 'That invoice was voided a moment ago.' };
    }
    throw error;
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'payment.recorded',
    entityType: 'Invoice',
    entityId: invoice.id,
    summary: `${formatMoney(amountMinor, invoice.currency)}, receipt ${receipt.number}`,
    metadata: { method, reference: reference || null },
  });
  if (receipt.wasDraft) {
    await recordAudit({
      actorType: 'staff',
      actorId: staff.id,
      action: 'invoice.issued',
      entityType: 'Invoice',
      entityId: invoice.id,
      summary: `${invoice.number}, issued by recording a payment`,
    });
  }

  revalidatePath(`/admin/invoices/${invoice.number}`);
  revalidatePath('/admin/invoices');
  return {
    status: 'done',
    message: receipt.wasDraft
      ? `Recorded. The invoice is issued and receipt ${receipt.number} is ready.`
      : `Recorded. Receipt ${receipt.number} issued.`,
  };
}

/** Emails the client their receipt. */
export async function emailReceipt(
  _previous: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const staff = await requireStaff();
  if (!can(staff, 'invoices')) return { status: 'error', message: NO_PERMISSION };
  const receiptId = String(formData.get('receiptId') ?? '');

  const receipt = await db.receipt.findUnique({
    where: { id: receiptId, payment: livePayment },
    select: {
      id: true,
      number: true,
      issuedAt: true,
      payment: {
        select: {
          amountMinor: true,
          currency: true,
          invoice: {
            select: {
              number: true,
              client: {
                select: {
                  name: true,
                  contacts: {
                    where: { deletedAt: null, isPrimary: true },
                    select: { id: true, name: true, email: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!receipt) return { status: 'error', message: 'That receipt no longer exists.' };

  const contact = receipt.payment.invoice.client.contacts[0];
  if (!contact) return { status: 'error', message: 'This client has no main contact.' };
  if (!contact.email) {
    return {
      status: 'error',
      message: `There is no email address for ${contact.name} yet. Share their setup link first.`,
    };
  }

  const sent = await sendConsoleEmail({
    to: contact.email,
    subject: `Receipt ${receipt.number} from Ubunifu Technologies`,
    html: receiptEmail({
      name: contact.name,
      number: receipt.number,
      invoiceNumber: receipt.payment.invoice.number,
      amount: formatMoney(receipt.payment.amountMinor, receipt.payment.currency),
      issuedAt: receipt.issuedAt,
      // The plain address, not a one-time sign-in: a receipt is kept and
      // opened again, and forwarded to whoever keeps the books, and neither
      // should hand them a session in the client's portal.
      url: `${consoleEnv.publicOrigin}/portal/receipts/${encodeURIComponent(receipt.number)}`,
    }),
    template: 'receipt_sent',
    entityType: 'Receipt',
    entityId: receipt.id,
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: sent.ok ? 'receipt.sent' : 'receipt.send_failed',
    entityType: 'Receipt',
    entityId: receipt.id,
    summary: sent.ok
      ? `${receipt.number} to ${contact.email}`
      : `${receipt.number} to ${contact.email}: ${sent.error}`,
  });

  if (!sent.ok) {
    return {
      status: 'error',
      message: `The attempt is logged, but the email did not go: ${sent.error}`,
    };
  }
  return { status: 'done', message: `Sent to ${contact.email}.` };
}

/**
 * Voids an invoice.
 *
 * Never deleted, and the number is never reused. An invoice the client has seen
 * has to stay findable afterwards, and a gap in the numbering is exactly the
 * thing an accountant asks about.
 */
export async function voidInvoice(
  _previous: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const staff = await requireStaff();
  if (!can(staff, 'invoices')) return { status: 'error', message: NO_PERMISSION };
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const reason = formText(formData, 'reason');

  if (reason.length < 4) {
    return { status: 'error', message: 'Say why this invoice is being voided.' };
  }

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId, ...liveInvoice },
    select: { id: true, number: true, status: true, paidMinor: true, notes: true },
  });

  if (!invoice) return { status: 'error', message: 'That invoice no longer exists.' };
  if (invoice.status === 'void') return { status: 'done' };
  if (invoice.paidMinor > 0) {
    return {
      status: 'error',
      message:
        'Money has already been recorded against this invoice. Reverse the payment first, or raise a credit note instead.',
    };
  }

  const voided = await db.$transaction(async (tx) => {
    // Conditional on nothing being paid at the moment of writing: a payment
    // recorded while this form was open must not end up on a void invoice.
    const { count } = await tx.invoice.updateMany({
      where: { id: invoice.id, paidMinor: 0, status: { not: 'void' } },
      data: {
        status: 'void',
        voidedAt: new Date(),
        notes: [invoice.notes, `Voided: ${reason}`].filter(Boolean).join('\n\n'),
      },
    });
    if (count === 0) return false;

    // Renewal periods it billed can be billed again, and each line's next due
    // date goes back to the period that is owed once more.
    const periods = await tx.renewalEvent.findMany({
      where: { invoiceId: invoice.id },
      select: {
        id: true,
        periodStart: true,
        periodEnd: true,
        lineItem: { select: { id: true, nextDueAt: true } },
      },
    });
    for (const period of periods) {
      await tx.renewalEvent.update({
        where: { id: period.id },
        data: { status: 'pending', invoiceId: null },
      });
      if (period.lineItem.nextDueAt?.getTime() === period.periodEnd.getTime()) {
        await tx.lineItem.update({
          where: { id: period.lineItem.id },
          data: { nextDueAt: period.periodStart },
        });
      }
    }
    return true;
  });
  if (!voided) {
    return {
      status: 'error',
      message:
        'A payment was recorded on it a moment ago, so it cannot be voided. Reload to see it.',
    };
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'invoice.voided',
    entityType: 'Invoice',
    entityId: invoice.id,
    summary: `${invoice.number}: ${reason}`,
  });

  revalidatePath(`/admin/invoices/${invoice.number}`);
  revalidatePath('/admin/invoices');
  return { status: 'done', message: 'Voided.' };
}
