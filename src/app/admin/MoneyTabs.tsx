import { can, type StaffActor } from '@/lib/console/auth';
import { Tabs, type TabItem } from '@/components/console/Tabs';

export type MoneyTab = 'invoices' | 'payments' | 'renewals' | 'reports' | 'costs' | 'income';

/**
 * The sections under Money, as tabs across the top of each money page.
 * Only the ones this person's role can open are shown.
 */
export function MoneyTabs({ staff, current }: { staff: StaffActor; current: MoneyTab }) {
  const billing = can(staff, 'invoices');
  const books = can(staff, 'finance');
  const tabs: TabItem[] = [
    ...(billing
      ? [
          { key: 'invoices', label: 'Invoices', href: '/invoices' },
          { key: 'payments', label: 'Payments', href: '/payments' },
          { key: 'renewals', label: 'Renewals', href: '/renewals' },
        ]
      : []),
    ...(books
      ? [
          { key: 'reports', label: 'Reports', href: '/finance' },
          { key: 'costs', label: 'Costs', href: '/finance/costs' },
          { key: 'income', label: 'Income', href: '/finance/income' },
        ]
      : []),
  ];
  return tabs.length > 1 ? <Tabs tabs={tabs} current={current} /> : null;
}
