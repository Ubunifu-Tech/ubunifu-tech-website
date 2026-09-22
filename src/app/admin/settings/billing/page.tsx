import { requireStaffRole } from '@/lib/console/auth';
import { formatBps, getOrg, missingForInvoicing } from '@/lib/console/org';
import { BillingForm } from './BillingForm';
import styles from '../../Admin.module.css';
import { Callout } from '@/components/console/Callout';

export const metadata = { title: 'Billing details' };

/**
 * The details every invoice and receipt carries.
 *
 * Dull, and it blocks everything after it: an invoice without a registered
 * name and a TIN is not one a Tanzanian client's accountant accepts, and a
 * bank account hardcoded in a component needs a deploy to change.
 */
export default async function BillingSettingsPage() {
  await requireStaffRole('admin');
  const org = await getOrg();
  const gaps = missingForInvoicing(org);

  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>Billing details</h1>
          <p className={styles.lead}>Shown on every invoice, receipt and contract you send.</p>
        </div>
      </div>

      {gaps.length > 0 && (
        <Callout kind="warn" title="Your invoices, receipts and contracts are missing:" items={gaps} />
      )}

      <BillingForm org={org} vatRate={org.vatRateBps === 0 ? '' : formatBps(org.vatRateBps).replace('%', '')} />
    </main>
  );
}
