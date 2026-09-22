import { redirect } from 'next/navigation';

/** Everyone can see the team; billing details are one tab over. */
export default function SettingsIndex() {
  redirect('/settings/team');
}
