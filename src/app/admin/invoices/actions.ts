'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { PaymentMethod } from '@/generated/prisma/client';
import { requireStaff, recordAudit } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { invoiceEmail, receiptEmail } from '@/lib/emails';
import {
  billableLines,
  nextInvoiceNumber,
  nextReceiptNumber,
  recomputeInvoice,
} from '@/lib/console/billing';
import { markRenewalInvoiced, periodLabel } from '@/lib/console/renewals';
import { formatMoney, parseDateInput, parseMoney } from '@/lib/console/money';

export type BillingState = { status: 'idle' | 'done' | 'error'; message?: string };

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

  const projectId = String(formData.get('projectId') ?? '');
  const chosen = formData.getAll('billables').map(String).filter(Boolean);

  if (chosen.length === 0) {
    return { status: 'error', message: 'Pick at least one fee line to invoice.' };
  }

  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, slug: true, currency: true, clientId: true, name: true },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };

  /**
   * Re-derived from the database rather than trusted from the form. What was
   * billable when the page rendered may have been invoiced by somebody else
   * since, and a renewal period is exactly the thing two people can bill at
   * once.
   */
  const billable = await billableLines(project.id);
  const lines = billable.filter((item) => chosen.includes(item.key));

  if (lines.length !== chosen.length) {
    return {
      status: 'error',
      message:
        'One of those is no longer billable — it may have been invoiced already. Reload and try again.',
    };
  }
  if (lines.some((line) => line.amountMinor === 0)) {
    return {
      status: 'error',
      message: 'One of those lines has no price. An invoice cannot carry a blank amount.',
    };
  }

  const currencies = [...new Set(lines.map((line) => line.currency))];
  if (currencies.length > 1) {
    return {
      status: 'error',
      message: `Those lines are in ${currencies.join(' and ')}. One invoice can only be in one currency.`,
    };
  }

  const dueAt = parseDateInput(String(formData.get('dueAt') ?? '').trim());
  const notes = String(formData.get('notes') ?? '').trim();

  const invoice = await db.$transaction(async (tx) => {
    const number = await nextInvoiceNumber(tx);
    const created = await tx.invoice.create({
      data: {
        number,
        clientId: project.clientId,
        projectId: project.id,
        currency: currencies[0]!,
        notes: notes || null,
        dueAt,
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

    await recomputeInvoice(tx, created.id);
    return created;
  });

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
  const invoiceId = String(formData.get('invoiceId') ?? '');

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      number: true,
      status: true,
      totalMinor: true,
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
      dueAt: invoice.dueAt,
      url: `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`,
    }),
    template: 'invoice_sent',
    entityType: 'Invoice',
    entityId: invoice.id,
  });

  await db.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      // issuedAt is write-once: resending must not move the date the client was
      // first asked, which is what any payment-terms calculation runs from.
      data: {
        status: invoice.status === 'draft' ? 'sent' : invoice.status,
        issuedAt: invoice.status === 'draft' ? new Date() : undefined,
      },
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
  const invoiceId = String(formData.get('invoiceId') ?? '');

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
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
  if (invoice.status === 'draft') {
    return {
      status: 'error',
      message: 'Send the invoice before recording a payment against it.',
    };
  }

  const amountMinor = parseMoney(String(formData.get('amount') ?? ''), invoice.currency);
  if (amountMinor === null || amountMinor <= 0) {
    return { status: 'error', message: 'Enter the amount that was received.' };
  }

  const outstanding = invoice.totalMinor - invoice.paidMinor;
  if (amountMinor > outstanding) {
    return {
      status: 'error',
      message: `That is more than the ${formatMoney(outstanding, invoice.currency)} still outstanding. Record the amount actually received, and raise a separate invoice for anything extra.`,
    };
  }

  const receivedAt = parseDateInput(String(formData.get('receivedAt') ?? '').trim());
  if (!receivedAt) {
    return { status: 'error', message: 'Enter the date the money arrived.' };
  }
  if (receivedAt.getTime() > Date.now() + 86_400_000) {
    return { status: 'error', message: 'That date is in the future.' };
  }

  const methodRaw = String(formData.get('method') ?? '');
  if (!Object.values(PaymentMethod).includes(methodRaw as PaymentMethod)) {
    return { status: 'error', message: 'Choose how the money arrived.' };
  }

  const reference = String(formData.get('reference') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();

  const receipt = await db.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amountMinor,
        currency: invoice.currency,
        method: methodRaw as PaymentMethod,
        reference: reference || null,
        receivedAt,
        recordedById: staff.id,
        note: note || null,
      },
      select: { id: true },
    });

    const number = await nextReceiptNumber(tx);
    const created = await tx.receipt.create({
      data: { number, paymentId: payment.id },
      select: { id: true, number: true },
    });

    await recomputeInvoice(tx, invoice.id);
    return created;
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'payment.recorded',
    entityType: 'Invoice',
    entityId: invoice.id,
    summary: `${formatMoney(amountMinor, invoice.currency)} — receipt ${receipt.number}`,
    metadata: { method: methodRaw, reference: reference || null },
  });

  revalidatePath(`/admin/invoices/${invoice.number}`);
  revalidatePath('/admin/invoices');
  return { status: 'done', message: `Recorded. Receipt ${receipt.number} issued.` };
}

/** Emails the client their receipt. */
export async function emailReceipt(
  _previous: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const staff = await requireStaff();
  const receiptId = String(formData.get('receiptId') ?? '');

  const receipt = await db.receipt.findUnique({
    where: { id: receiptId },
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
                    select: { name: true, email: true },
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

  const sent = await sendConsoleEmail({
    to: contact.email,
    subject: `Receipt ${receipt.number} from Ubunifu Technologies`,
    html: receiptEmail({
      name: contact.name,
      number: receipt.number,
      invoiceNumber: receipt.payment.invoice.number,
      amount: formatMoney(receipt.payment.amountMinor, receipt.payment.currency),
      issuedAt: receipt.issuedAt,
    }),
    template: 'receipt_sent',
    entityType: 'Receipt',
    entityId: receipt.id,
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'receipt.sent',
    entityType: 'Receipt',
    entityId: receipt.id,
    summary: `${receipt.number} to ${contact.email}`,
  });

  if (!sent.ok) {
    return { status: 'error', message: `The attempt is logged, but the email did not go: ${sent.error}` };
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
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  if (reason.length < 4) {
    return { status: 'error', message: 'Say why this invoice is being voided.' };
  }

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, number: true, status: true, paidMinor: true, notes: true },
  });

  if (!invoice) return { status: 'error', message: 'That invoice no longer exists.' };
  if (invoice.status === 'void') return { status: 'done' };
  if (invoice.paidMinor > 0) {
    return {
      status: 'error',
      message:
        'Money has already been recorded against this invoice. Voiding it would erase the demand the payment answers — raise a credit note instead, or reverse the payment first.',
    };
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'void',
      voidedAt: new Date(),
      notes: [invoice.notes, `Voided: ${reason}`].filter(Boolean).join('\n\n'),
    },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'invoice.voided',
    entityType: 'Invoice',
    entityId: invoice.id,
    summary: `${invoice.number} — ${reason}`,
  });

  revalidatePath(`/admin/invoices/${invoice.number}`);
  revalidatePath('/admin/invoices');
  return { status: 'done', message: 'Voided.' };
}
