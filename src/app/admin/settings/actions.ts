'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
import { NO_PERMISSION } from '@/lib/console/permissions';
import { parseBps } from '@/lib/console/org';
import { formText } from '@/lib/console/form';

export type SettingsState = { status: 'idle' | 'done' | 'error'; message?: string };

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
  const staff = await requireStaff();
  if (!can(staff, 'billing_settings')) return { status: 'error', message: NO_PERMISSION };

  const legalName = formText(formData, 'legalName');
  if (legalName.length < 2) {
    return { status: 'error', message: 'The registered name cannot be blank.' };
  }

  const chargesVat = formData.get('chargesVat') === 'on';
  const vatRaw = formText(formData, 'vatRate');
  const vatRateBps = vatRaw === '' ? 0 : parseBps(vatRaw);
  if (vatRateBps === null) {
    return { status: 'error', message: 'The VAT rate should be a percentage, such as 18.' };
  }

  const termsRaw = formText(formData, 'paymentTermsDays');
  const paymentTermsDays = Number.parseInt(termsRaw, 10);
  if (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0 || paymentTermsDays > 365) {
    return { status: 'error', message: 'Payment terms should be a number of days, up to 365.' };
  }

  const data = {
    legalName,
    tradingName: formText(formData, 'tradingName') || null,
    tin: formText(formData, 'tin') || null,
    vrn: formText(formData, 'vrn') || null,
    addressLines: formText(formData, 'addressLines') || null,
    country: (formText(formData, 'country') || 'TZ').toUpperCase().slice(0, 2),
    email: formText(formData, 'email') || 'info@ubunifutech.com',
    phone: formText(formData, 'phone') || null,
    website: formText(formData, 'website') || null,
    chargesVat,
    vatRateBps,
    bankName: formText(formData, 'bankName') || null,
    bankAccountName: formText(formData, 'bankAccountName') || null,
    bankAccountNumber: formText(formData, 'bankAccountNumber') || null,
    bankSwift: formText(formData, 'bankSwift') || null,
    mobileMoneyName: formText(formData, 'mobileMoneyName') || null,
    mobileMoneyNumber: formText(formData, 'mobileMoneyNumber') || null,
    invoiceFooter: formText(formData, 'invoiceFooter') || null,
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
