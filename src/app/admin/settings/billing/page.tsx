import { requirePermission } from '@/lib/console/auth';
import { formatBps, getOrg, missingForInvoicing } from '@/lib/console/org';
import { BillingForm } from './BillingForm';
import styles from '../../Admin.module.css';
import { Callout } from '@/components/console/Callout';
import { SettingsTabs } from '../SettingsTabs';

export const metadata = { title: 'Billing details' };

/**
 * The details every invoice and receipt carries.
 *
 * Dull, and it blocks everything after it: an invoice without a registered
 * name and a TIN is not one a Tanzanian client's accountant accepts, and a
 * bank account hardcoded in a component needs a deploy to change.
 */
export default async function BillingSettingsPage() {
  const staff = await requirePermission('billing_settings');
  const org = await getOrg();
  const gaps = missingForInvoicing(org);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>Settings</h1>
          <p className={styles.lead}>
            Billing details are shown on every invoice, receipt and agreement you send.
          </p>
        </div>
      </div>

      <SettingsTabs current="billing" staff={staff} />

      <div className={styles.split}>
        <div className={styles.splitMain}>
          {gaps.length > 0 && (
            <Callout
              kind="warn"
              title="Your invoices, receipts and agreements are missing:"
              items={gaps}
            />
          )}
          <BillingForm
            org={org}
            vatRate={org.vatRateBps === 0 ? '' : formatBps(org.vatRateBps).replace('%', '')}
          />
        </div>

        <aside className={styles.splitAside} aria-label="How this looks on an invoice">
          <p className={styles.note}>How a client sees it, from what is saved.</p>
          <div className={styles.paper}>
            <div className={styles.paperHead}>
              <p className={styles.paperName}>
                {org.legalName}
                {org.tradingName && (
                  <span className={styles.paperLine}>Trading as {org.tradingName}</span>
                )}
                {org.addressLines ? (
                  org.addressLines.split('\n').map((line) => (
                    <span key={line} className={styles.paperLine}>
                      {line}
                    </span>
                  ))
                ) : (
                  <span className={styles.paperMissing}>No address yet</span>
                )}
                <span className={styles.paperLine}>{org.email}</span>
                {org.phone && <span className={styles.paperLine}>{org.phone}</span>}
              </p>
              <p className={styles.paperDoc}>
                Invoice
                <span className={styles.paperLine}>INV-2026-001</span>
              </p>
            </div>
            <div>
              <p className={styles.paperLabel}>Tax</p>
              {org.tin ? (
                <span className={styles.paperLine}>TIN {org.tin}</span>
              ) : (
                <span className={styles.paperMissing}>No TIN yet</span>
              )}
              {org.vrn && <span className={styles.paperLine}>VRN {org.vrn}</span>}
              <span className={styles.paperLine}>
                {org.chargesVat ? `VAT charged at ${formatBps(org.vatRateBps)}` : 'No VAT charged'}
              </span>
            </div>
            <div>
              <p className={styles.paperLabel}>How to pay</p>
              {org.bankAccountNumber || org.mobileMoneyNumber ? (
                <>
                  {org.bankAccountNumber && (
                    <span className={styles.paperLine}>
                      {[org.bankName, org.bankAccountName, org.bankAccountNumber]
                        .filter(Boolean)
                        .join(' · ')}
                      {org.bankSwift && ` · SWIFT ${org.bankSwift}`}
                    </span>
                  )}
                  {org.mobileMoneyNumber && (
                    <span className={styles.paperLine}>
                      {[org.mobileMoneyName, org.mobileMoneyNumber].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </>
              ) : (
                <span className={styles.paperMissing}>
                  No bank account or mobile money number yet
                </span>
              )}
              <span className={styles.paperLine}>
                Due {org.paymentTermsDays} {org.paymentTermsDays === 1 ? 'day' : 'days'} after it is
                sent
              </span>
            </div>
            {org.invoiceFooter && <p className={styles.paperLine}>{org.invoiceFooter}</p>}
          </div>
        </aside>
      </div>
    </main>
  );
}
