import { Tabs } from '@/components/console/Tabs';
import { can, type StaffActor } from '@/lib/console/auth';

/**
 * Settings, in parts. Each tab shows only to someone allowed to open it, by
 * the same permission its page checks, so no tab leads to a refusal and no
 * page someone may use is left without a tab.
 */
export function SettingsTabs({
  current,
  staff,
}: {
  current: 'team' | 'billing' | 'documents' | 'products';
  staff: StaffActor;
}) {
  const tabs = [
    { key: 'team', label: 'Team', href: '/settings/team' },
    ...(can(staff, 'billing_settings')
      ? [{ key: 'billing', label: 'Billing details', href: '/settings/billing' }]
      : []),
    ...(can(staff, 'documents')
      ? [{ key: 'documents', label: 'Documents', href: '/settings/documents' }]
      : []),
    ...(can(staff, 'finance')
      ? [{ key: 'products', label: 'Products', href: '/settings/products' }]
      : []),
  ];
  return <Tabs tabs={tabs} current={current} />;
}
