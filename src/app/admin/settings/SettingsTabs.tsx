import type { StaffRole } from '@/generated/prisma/client';
import { Tabs } from '@/components/console/Tabs';

/** Settings has two parts. Billing details are for admins and owners. */
export function SettingsTabs({ current, role }: { current: 'team' | 'billing'; role: StaffRole }) {
  const tabs = [
    { key: 'team', label: 'Team', href: '/settings/team' },
    ...(role === 'member' ? [] : [{ key: 'billing', label: 'Billing details', href: '/settings/billing' }]),
  ];
  return <Tabs tabs={tabs} current={current} />;
}
