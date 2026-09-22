import { requireStaffRole } from '@/lib/console/auth';
import { formatBps, getOrg, missingForInvoicing } from '@/lib/console/org';
import { BillingForm } from './BillingForm';
import styles from '../../Admin.module.css';

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
          <h1 className={styles.heading}>
            Billing <span className={styles.headingAccent}>details</span>
          </h1>
          <p className={styles.lead}>
            What appears on every invoice and receipt, and where clients are told to send money.
          </p>
        </div>
      </div>

      {gaps.length > 0 && (
        <ul className={styles.warnList}>
          <li className={styles.warnItem}>
            Documents can still go out, but they are missing {gaps.join('; ')}.
          </li>
        </ul>
      )}

      <BillingForm org={org} vatRate={org.vatRateBps === 0 ? '' : formatBps(org.vatRateBps).replace('%', '')} />
    </main>
  );
}
