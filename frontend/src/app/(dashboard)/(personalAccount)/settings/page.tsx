import { createClient } from '@/lib/supabase/server';

export default async function PersonalAccountSettingsPage() {
  const supabaseClient = await createClient();
  const { data: personalAccount } = await supabaseClient.rpc(
    'get_personal_account',
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Account Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Account Information</h3>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Account ID</span>
              <span className="text-sm text-muted-foreground">{personalAccount?.account_id}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Account Name</span>
              <span className="text-sm text-muted-foreground">{personalAccount?.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
