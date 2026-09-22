import 'server-only';
import { db } from '@/lib/db';

/**
 * Who we are on a document.
 *
 * One row, read on every invoice and receipt. Created on first read rather
 * than seeded, so a fresh database is never missing it and nobody has to
 * remember to run anything — the defaults are enough to render a document,
 * and the settings screen says plainly which fields are still missing.
 */
export type Org = {
  legalName: string;
  tradingName: string | null;
  tin: string | null;
  vrn: string | null;
  addressLines: string | null;
  country: string;
  email: string;
  phone: string | null;
  website: string | null;
  vatRateBps: number;
  chargesVat: boolean;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankSwift: string | null;
  mobileMoneyName: string | null;
  mobileMoneyNumber: string | null;
  invoiceFooter: string | null;
  paymentTermsDays: number;
};

export async function getOrg(): Promise<Org> {
  const settings = await db.orgSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
    select: {
      legalName: true,
      tradingName: true,
      tin: true,
      vrn: true,
      addressLines: true,
      country: true,
      email: true,
      phone: true,
      website: true,
      vatRateBps: true,
      chargesVat: true,
      bankName: true,
      bankAccountName: true,
      bankAccountNumber: true,
      bankSwift: true,
      mobileMoneyName: true,
      mobileMoneyNumber: true,
      invoiceFooter: true,
      paymentTermsDays: true,
    },
  });

  return settings;
}

/**
 * What is missing before a document can honestly go out.
 *
 * Surfaced rather than enforced: a business that has not registered yet still
 * needs to invoice, and blocking them would only teach them to put the real
 * details in the notes field.
 */
export function missingForInvoicing(org: Org): string[] {
  const gaps: string[] = [];
  if (!org.tin) gaps.push('Your TIN');
  if (!org.addressLines) gaps.push('A postal address');
  if (!org.bankAccountNumber && !org.mobileMoneyNumber) {
    gaps.push('How to pay you: a bank account or mobile money number');
  }
  if (org.chargesVat && org.vatRateBps === 0) gaps.push('A VAT rate (VAT is switched on)');
  if (org.chargesVat && !org.vrn) gaps.push('Your VRN (VAT is switched on)');
  return gaps;
}

/** 1800 → "18%", without a float anywhere. */
export function formatBps(bps: number): string {
  const whole = Math.trunc(bps / 100);
  const fraction = bps % 100;
  return fraction === 0 ? `${whole}%` : `${whole}.${String(fraction).padStart(2, '0')}%`;
}

/** "18" or "18.5" → basis points. Returns null for anything unreadable. */
export function parseBps(input: string): number | null {
  const cleaned = input.replace(/[^\d.]/g, '');
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value * 100);
}
