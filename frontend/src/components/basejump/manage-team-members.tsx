'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Table, TableRow, TableBody, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';
import TeamMemberOptions from './team-member-options';

type Props = {
  accountId: string;
};

export default function ManageTeamMembers({ accountId }: Props) {
  const [members, setMembers] = useState<any[]>([]);
  const [isPrimaryOwner, setIsPrimaryOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMembers() {
      try {
        const supabaseClient = createClient();
        
        const { data: membersData } = await supabaseClient.rpc('get_account_members', {
          account_id: accountId,
        });

        const { data } = await supabaseClient.auth.getUser();
        const isPrimary = membersData?.find(
          (member: any) => member.user_id === data?.user?.id,
        )?.is_primary_owner;

        setMembers(membersData || []);
        setIsPrimaryOwner(isPrimary || false);
        setLoading(false);
      } catch (error) {
        console.error('Error loading members:', error);
        setLoading(false);
      }
    }

    if (accountId) {
      loadMembers();
    }
  }, [accountId]);

  if (loading) {
    return <div>Loading members...</div>;
  }

  return (
    <div>
      <Table>
        <TableBody>
          {members.map((member: any) => (
            <TableRow
              key={member.user_id}
              className="hover:bg-hover-bg border-subtle dark:border-white/10"
            >
              <TableCell>
                <div className="flex items-center gap-x-2">
                  <span className="font-medium text-card-title">
                    {member.name}
                  </span>
                  <Badge
                    variant={
                      member.account_role === 'owner' ? 'default' : 'outline'
                    }
                    className={
                      member.account_role === 'owner'
                        ? 'bg-primary hover:bg-primary/90'
                        : 'text-foreground/70 border-subtle dark:border-white/10'
                    }
                  >
                    {member.is_primary_owner
                      ? 'Primary Owner'
                      : member.account_role}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-foreground/70">
                  {member.email}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {!Boolean(member.is_primary_owner) && (
                  <TeamMemberOptions
                    teamMember={member}
                    accountId={accountId}
                    isPrimaryOwner={isPrimaryOwner}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
