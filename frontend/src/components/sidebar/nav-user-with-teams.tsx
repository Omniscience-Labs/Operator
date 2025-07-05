'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BadgeCheck,
  Bell,
  ChevronDown,
  ChevronsUpDown,
  Command,
  CreditCard,
  LogOut,
  Palette,
  Plus,
  Settings,
  User,
  AudioWaveform,
  Sun,
  Moon,
} from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import NewTeamForm from '@/components/basejump/new-team-form';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useModal } from '@/hooks/use-modal-store';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { useQueryClient } from '@tanstack/react-query';
import { projectKeys, threadKeys } from '@/hooks/react-query/sidebar/keys';

const TEAM_CONTEXT_KEY = 'current_team_context';

export function NavUserWithTeams({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { data: accounts } = useAccounts();
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { onOpen } = useModal();
  const queryClient = useQueryClient();

  // Determine current account with team context persistence
  const currentAccount = React.useMemo(() => {
    if (!accounts) return null;

    // Extract team slug from URL path
    const teamMatch = pathname?.match(/^\/([^\/]+)(?:\/|$)/);
    const teamSlug = teamMatch?.[1];

    let determinedAccount = null;

    // If we're on a team page, use that team
    if (teamSlug && teamSlug !== 'dashboard') {
      const teamAccount = accounts.find(
        (account) => !account.personal_account && account.slug === teamSlug
      );
      if (teamAccount) {
        determinedAccount = {
          ...teamAccount,
          email: `Team: ${teamAccount.name}`,
          avatar: user.avatar,
        };
      }
    }

    // If no team found in URL, check for stored team context
    if (!determinedAccount) {
      try {
        const storedContext = sessionStorage.getItem(TEAM_CONTEXT_KEY);
        if (storedContext) {
          const context = JSON.parse(storedContext);
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          
          // Check if team context is still valid (within 5 minutes, matching useCurrentAccount)
          if (context.timestamp > fiveMinutesAgo) {
            const teamAccount = accounts.find(
              (account) => !account.personal_account && account.account_id === context.account_id
            );
            
            if (teamAccount) {
              determinedAccount = {
                ...teamAccount,
                email: `Team: ${teamAccount.name}`,
                avatar: user.avatar,
              };
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read team context:', error);
      }
    }

    // Only fall back to personal account if no team context exists at all
    if (!determinedAccount) {
      // If no team context found, use personal account
      const personalAccount = accounts.find((account) => account.personal_account);
      determinedAccount = personalAccount ? {
        ...personalAccount,
        email: user.email,
        avatar: user.avatar,
      } : null;
    }

    return determinedAccount;
  }, [pathname, accounts, user]);

  // Ensure team context is preserved during component re-renders
  React.useEffect(() => {
    // This effect helps maintain team context stability during sidebar transitions
    if (accounts && currentAccount && !currentAccount.personal_account) {
      try {
        const storedContext = sessionStorage.getItem(TEAM_CONTEXT_KEY);
        if (!storedContext) {
          // If we have a team account but no stored context, save it
          sessionStorage.setItem(TEAM_CONTEXT_KEY, JSON.stringify({
            account_id: currentAccount.account_id,
            name: currentAccount.name,
            slug: currentAccount.slug,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.warn('Failed to preserve team context:', error);
      }
    }
  }, [accounts, currentAccount]);

  // Prepare personal account and team accounts
  const personalAccount = React.useMemo(
    () => accounts?.find((account) => account.personal_account),
    [accounts],
  );
  const teamAccounts = React.useMemo(
    () => accounts?.filter((account) => !account.personal_account),
    [accounts],
  );

  // Create a default list of teams with logos for the UI (will show until real data loads)
  const defaultTeams = [
    {
      name: personalAccount?.name || user.name,
      logo: Command,
      plan: 'Personal',
      account_id: personalAccount?.account_id,
      slug: personalAccount?.slug,
      personal_account: true,
      email: user.email,
      avatar: user.avatar,
    },
    ...(teamAccounts?.map((team) => ({
      name: team.name,
      logo: AudioWaveform,
      plan: 'Team',
      account_id: team.account_id,
      slug: team.slug,
      personal_account: false,
      email: `Team: ${team.name}`,
      avatar: user.avatar, // Keep same avatar for teams
    })) || []),
  ];

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleTeamSwitch = (team: any) => {
    console.log('Switching to:', team.personal_account ? 'Personal' : `Team: ${team.name}`);
    
    // Update sessionStorage to match useCurrentAccount
    if (!team.personal_account) {
      // Store team context
      try {
        sessionStorage.setItem(TEAM_CONTEXT_KEY, JSON.stringify({
          account_id: team.account_id,
          name: team.name,
          slug: team.slug,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.warn('Failed to store team context:', error);
      }
    } else {
      // Clear team context for personal account
      try {
        sessionStorage.removeItem(TEAM_CONTEXT_KEY);
      } catch (error) {
        console.warn('Failed to clear team context:', error);
      }
    }
    
    // Navigate to dashboard first, then reload to ensure everything updates
    router.push('/dashboard');
    // Use setTimeout to ensure navigation happens before reload
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const displayedUser = currentAccount || {
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={displayedUser.avatar} alt={displayedUser.name} />
                <AvatarFallback className="rounded-lg">
                  {displayedUser.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayedUser.name}</span>
                <span className="truncate text-xs">{displayedUser.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={displayedUser.avatar} alt={displayedUser.name} />
                  <AvatarFallback className="rounded-lg">
                    {displayedUser.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayedUser.name}</span>
                  <span className="truncate text-xs">{displayedUser.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Personal Account Section */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Personal Account
              </DropdownMenuLabel>
              {personalAccount && (
                <DropdownMenuItem
                  className="gap-2 p-2 cursor-pointer"
                  onClick={() => handleTeamSwitch({
                    ...personalAccount,
                    personal_account: true,
                    email: user.email,
                    avatar: user.avatar,
                  })}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-sm border">
                    <Command className="h-4 w-4" />
                  </div>
                  <div className="font-medium">{personalAccount.name}</div>
                  {(!currentAccount || currentAccount.personal_account) && (
                    <div className="ml-auto">
                      <BadgeCheck className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                </DropdownMenuItem>
                             )}
             </DropdownMenuGroup>
             <DropdownMenuSeparator />

            {/* Teams Section */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center justify-between">
                Teams
                <DropdownMenuItem
                  className="h-auto p-1 cursor-pointer"
                  onClick={() => setShowNewTeamDialog(true)}
                >
                  <Plus className="h-3 w-3" />
                </DropdownMenuItem>
              </DropdownMenuLabel>
              {teamAccounts?.map((team) => (
                <DropdownMenuItem
                  key={team.account_id}
                  className="gap-2 p-2 cursor-pointer"
                  onClick={() => handleTeamSwitch(team)}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-sm border">
                    <AudioWaveform className="h-4 w-4" />
                  </div>
                  <div className="font-medium">{team.name}</div>
                  {currentAccount && !currentAccount.personal_account && currentAccount.account_id === team.account_id && (
                    <div className="ml-auto">
                      <BadgeCheck className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                </DropdownMenuItem>
              ))}
              
              {/* Add settings link for current team */}
              {currentAccount && !currentAccount.personal_account && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => router.push(`/${currentAccount.slug}/settings`)}
                    className="gap-2 p-2 cursor-pointer text-muted-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    <div className="font-medium">Team Settings</div>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            {/* Account Actions */}
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpen('paymentRequiredDialog')}>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings/personalization')}>
                <User />
                Personalization
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun /> : <Moon />}
                Toggle theme
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {/* New Team Dialog */}
      <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create a new team</DialogTitle>
            <DialogDescription>
              Create a team to collaborate with others.
            </DialogDescription>
          </DialogHeader>
          <NewTeamForm />
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}
