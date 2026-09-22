import { redirect } from 'next/navigation';

/** Settings has one page today, so this is a signpost rather than a menu. */
export default function SettingsIndex() {
  redirect('/settings/billing');
}
