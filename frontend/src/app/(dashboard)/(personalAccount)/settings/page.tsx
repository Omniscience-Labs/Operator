import { redirect } from 'next/navigation';

export default async function PersonalAccountSettingsPage() {
  // Redirect to the personalization page
  redirect('/settings/personalization');
}
