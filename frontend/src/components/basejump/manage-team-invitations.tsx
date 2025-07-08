'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { createClient } from '@/lib/supabase/client';
import { Table, TableRow, TableBody, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';
import CreateTeamInvitationButton from './create-team-invitation-button';
import { formatDistanceToNow } from 'date-fns';
import DeleteTeamInvitationButton from './delete-team-invitation-button';

type Props = {
  accountId: string;
};

export default function ManageTeamInvitations({ accountId }: Props) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvitations() {
      try {
        const supabaseClient = createClient();
        
        const { data: invitationsData } = await supabaseClient.rpc(
          'get_account_invitations',
          {
            account_id: accountId,
          },
        );

        setInvitations(invitationsData || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading invitations:', error);
        setLoading(false);
      }
    }

    if (accountId) {
      loadInvitations();
    }
  }, [accountId]);

  if (loading) {
    return <div>Loading invitations...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              These are the pending invitations for your team
            </CardDescription>
          </div>
          <CreateTeamInvitationButton accountId={accountId} />
        </div>
      </CardHeader>
      {Boolean(invitations?.length) && (
        <CardContent>
          <Table>
            <TableBody>
              {invitations.map((invitation: any) => (
                <TableRow key={invitation.invitation_id}>
                  <TableCell>
                    <div className="flex gap-x-2">
                      {formatDistanceToNow(invitation.created_at, {
                        addSuffix: true,
                      })}
                      <Badge
                        variant={
                          invitation.invitation_type === '24_hour'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {invitation.invitation_type}
                      </Badge>
                      <Badge
                        variant={
                          invitation.account_role === 'owner'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {invitation.account_role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteTeamInvitationButton
                      invitationId={invitation.invitation_id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
