'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireStaffRole, recordAudit } from '@/lib/console/auth';
import { parseBps } from '@/lib/console/org';
import { formText } from '@/lib/console/form';

export type SettingsState = { status: 'idle' | 'done' | 'error'; message?: string };

function text(formData: FormData, key: string): string {
  return formText(formData, key);
}

/**
 * Saves the details that appear on every invoice and receipt.
 *
 * Admin and above. These are not project data — changing the bank account
 * changes where every future client is told to send money, which is the one
 * setting in this system worth restricting.
 */
export async function saveOrgSettings(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const staff = await requireStaffRole('admin');

  const legalName = text(formData, 'legalName');
  if (legalName.length < 2) {
    return { status: 'error', message: 'The registered name cannot be blank.' };
  }

  const chargesVat = formData.get('chargesVat') === 'on';
  const vatRaw = text(formData, 'vatRate');
  const vatRateBps = vatRaw === '' ? 0 : parseBps(vatRaw);
  if (vatRateBps === null) {
    return { status: 'error', message: 'The VAT rate should be a percentage, such as 18.' };
  }

  const termsRaw = text(formData, 'paymentTermsDays');
  const paymentTermsDays = Number.parseInt(termsRaw, 10);
  if (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0 || paymentTermsDays > 365) {
    return { status: 'error', message: 'Payment terms should be a number of days, up to 365.' };
  }

  const data = {
    legalName,
    tradingName: text(formData, 'tradingName') || null,
    tin: text(formData, 'tin') || null,
    vrn: text(formData, 'vrn') || null,
    addressLines: text(formData, 'addressLines') || null,
    country: (text(formData, 'country') || 'TZ').toUpperCase().slice(0, 2),
    email: text(formData, 'email') || 'info@ubunifutech.com',
    phone: text(formData, 'phone') || null,
    website: text(formData, 'website') || null,
    chargesVat,
    vatRateBps,
    bankName: text(formData, 'bankName') || null,
    bankAccountName: text(formData, 'bankAccountName') || null,
    bankAccountNumber: text(formData, 'bankAccountNumber') || null,
    bankSwift: text(formData, 'bankSwift') || null,
    mobileMoneyName: text(formData, 'mobileMoneyName') || null,
    mobileMoneyNumber: text(formData, 'mobileMoneyNumber') || null,
    invoiceFooter: text(formData, 'invoiceFooter') || null,
    paymentTermsDays,
  };

  await db.orgSettings.upsert({
    where: { id: 'default' },
    update: data,
    create: { id: 'default', ...data },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'settings.billing_saved',
    entityType: 'OrgSettings',
    entityId: 'default',
    summary: `Billing details updated by ${staff.name}`,
  });

  revalidatePath('/admin/settings/billing');
  return { status: 'done', message: 'Saved. New invoices and receipts will use these.' };
}
