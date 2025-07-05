import { createClient } from '@/lib/supabase/server';
import AccountPersonalization from '@/components/personalization/account-personalization';

const returnUrl = process.env.NEXT_PUBLIC_URL as string;

export default async function PersonalAccountPersonalizationPage() {
  const supabaseClient = await createClient();
  const { data: personalAccount } = await supabaseClient.rpc(
    'get_personal_account',
  );

  if (!personalAccount) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Personalization</h2>
        <p className="text-muted-foreground">Unable to load account information.</p>
      </div>
    );
  }

  return (
    <div>
      <AccountPersonalization
        accountId={personalAccount.account_id}
        returnUrl={`${returnUrl}/settings/personalization`}
      />
    </div>
  );
}