'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bot, Menu, Store, FileAudio } from 'lucide-react';
import { motion } from 'framer-motion';

import { NavAgents } from '@/components/sidebar/nav-agents';
import { NavUserWithTeams } from '@/components/sidebar/nav-user-with-teams';
import { OmniLogo } from '@/components/sidebar/omni-logo';
import { CTACard } from '@/components/sidebar/cta';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useFeatureFlags } from '@/lib/feature-flags';
import { useCurrentAccount } from '@/hooks/use-current-account';

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { state, setOpen, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar: string;
  }>({
    name: 'Loading...',
    email: 'loading@example.com',
    avatar: '',
  });

  const pathname = usePathname();
  const currentAccount = useCurrentAccount();
  const { flags, loading: flagsLoading } = useFeatureFlags(['custom_agents', 'agent_marketplace', 'enterprise_demo']);
  const customAgentsEnabled = flags.custom_agents;
  const marketplaceEnabled = flags.agent_marketplace;
  const enterpriseDemoEnabled = flags.enterprise_demo;
  
  // Hide agent playground for team accounts
  const showAgentPlayground = customAgentsEnabled && !currentAccount?.is_team_context;

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setUser({
          name:
            data.user.user_metadata?.name ||
            data.user.email?.split('@')[0] ||
            'User',
          email: data.user.email || '',
          avatar: data.user.user_metadata?.avatar_url || '',
        });
      }
    };

    fetchUserData();
  }, []);

  // Handle keyboard shortcuts (CMD+B) for consistency
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        // We'll handle this in the parent page component
        // to ensure proper coordination between panels
        setOpen(!state.startsWith('expanded'));

        // Broadcast a custom event to notify other components
        window.dispatchEvent(
          new CustomEvent('sidebar-left-toggled', {
            detail: { expanded: !state.startsWith('expanded') },
          }),
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, setOpen]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 relative overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
      {...props}
    >
      {/* Liquid Glass Background Layers */}
      <div className="absolute inset-0 z-0">
        {/* Base Glass Layer */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-background/85 via-background/70 to-background/85 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
        
        {/* Enhanced Inner Glow */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/10"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Text Readability Layer */}
        <div className="absolute inset-0 bg-background/5" />
        
        {/* Subtle Border Gradient */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent" />
        
        {/* Floating Particles Effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-20, -40, -20],
                x: [-5, 5, -5],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 6 + i * 2,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
      <SidebarHeader className="px-2 py-2 relative z-10">
        <motion.div 
          className="flex h-[40px] items-center px-1 relative"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Link href="/dashboard">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <OmniLogo />
            </motion.div>
          </Link>
          {state !== 'collapsed' && (
            <motion.div 
              className="ml-2 transition-all duration-200 ease-in-out whitespace-nowrap"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              {/* <span className="font-semibold"> OPERATOR</span> */}
            </motion.div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {state !== 'collapsed' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <SidebarTrigger className="h-8 w-8 hover:bg-white/10 dark:hover:bg-black/10 transition-colors duration-200" />
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>Toggle sidebar (CMD+B)</TooltipContent>
              </Tooltip>
            )}
            {isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => setOpenMobile(true)}
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/10 dark:hover:bg-black/10 transition-colors duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Menu className="h-4 w-4" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>Open menu</TooltipContent>
              </Tooltip>
            )}
          </div>
        </motion.div>
      </SidebarHeader>
      <SidebarContent className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] relative z-10">
        {!flagsLoading && (showAgentPlayground || marketplaceEnabled) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <SidebarGroup>
              {showAgentPlayground && (
                <Link href="/agents">
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SidebarMenuButton className={cn(
                      'hover:bg-white/15 dark:hover:bg-black/15 transition-all duration-200',
                      {
                        'bg-white/20 dark:bg-black/20 font-medium shadow-sm': pathname === '/agents',
                      }
                    )}>
                      <Bot className="h-4 w-4 mr-2" />
                      <span className="flex items-center justify-between w-full">
                        Agent Playground
                        <Badge variant="new">
                          New
                        </Badge>
                      </span>
                    </SidebarMenuButton>
                  </motion.div>
                </Link>
              )}
              {marketplaceEnabled && (
                <Link href="/marketplace">
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SidebarMenuButton className={cn(
                      'hover:bg-white/15 dark:hover:bg-black/15 transition-all duration-200',
                      {
                        'bg-white/20 dark:bg-black/20 font-medium shadow-sm': pathname === '/marketplace',
                      }
                    )}>
                      <Store className="h-4 w-4 mr-2" />
                      <span className="flex items-center justify-between w-full">
                        Marketplace
                        <Badge variant="new">
                          New
                        </Badge>
                      </span>
                    </SidebarMenuButton>
                  </motion.div>
                </Link>
              )}
            </SidebarGroup>
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <SidebarGroup>
            <Link href="/meetings">
              <motion.div
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <SidebarMenuButton className={cn(
                  'hover:bg-white/15 dark:hover:bg-black/15 transition-all duration-200',
                  {
                    'bg-white/20 dark:bg-black/20 font-medium shadow-sm': pathname === '/meetings' || pathname.startsWith('/meetings/'),
                  }
                )}>
                  <FileAudio className="h-4 w-4 mr-2" />
                  <span className="flex items-center justify-between w-full">
                    Meetings
                    <Badge variant="new">
                      New
                    </Badge>
                  </span>
                </SidebarMenuButton>
              </motion.div>
            </Link>
          </SidebarGroup>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <NavAgents />
        </motion.div>
      </SidebarContent>
      {state !== 'collapsed' && enterpriseDemoEnabled && (
        <motion.div 
          className="px-3 py-2 relative z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <CTACard />
          </motion.div>
        </motion.div>
      )}
      <SidebarFooter className="relative z-10">
        {state === 'collapsed' && (
          <motion.div 
            className="mt-2 flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <SidebarTrigger className="h-8 w-8 hover:bg-white/10 dark:hover:bg-black/10 transition-colors duration-200" />
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>Expand sidebar (CMD+B)</TooltipContent>
            </Tooltip>
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <NavUserWithTeams user={user} />
        </motion.div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
