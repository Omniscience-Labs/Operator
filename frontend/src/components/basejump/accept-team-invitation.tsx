'use client';

import { useEffect, useState } from 'react';
import { acceptInvitation } from '@/lib/actions/invitations';
import { createClient } from '@/lib/supabase/client';
import { Alert } from '../ui/alert';
import { Card, CardContent } from '../ui/card';
import { SubmitButton } from '../ui/submit-button';

type Props = {
  token: string;
};

export default function AcceptTeamInvitation({ token }: Props) {
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvitation() {
      try {
        const supabaseClient = createClient();
        const { data, error } = await supabaseClient.rpc('lookup_invitation', {
          lookup_invitation_token: token,
        });

        if (error) {
          console.error('Error loading invitation:', error);
          setError('Failed to load invitation details');
          return;
        }

        setInvitation(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading invitation:', err);
        setError('Failed to load invitation details');
        setLoading(false);
      }
    }

    if (token) {
      loadInvitation();
    }
  }, [token]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div>Loading invitation details...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Alert variant="destructive">
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-8 text-center flex flex-col gap-y-8">
        <div>
          <p>You've been invited to join</p>
          <h1 className="text-xl font-bold">{invitation?.account_name}</h1>
        </div>
        {Boolean(invitation?.active) ? (
          <form>
            <input type="hidden" name="token" value={token} />
            <SubmitButton
              formAction={acceptInvitation}
              pendingText="Accepting invitation..."
            >
              Accept invitation
            </SubmitButton>
          </form>
        ) : (
          <Alert variant="destructive">
            This invitation has been deactivated. Please contact the account
            owner for a new invitation.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
