'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useCurrentAccount } from '@/hooks/use-current-account';

export type AgentStatus = 'idle' | 'running' | 'connecting' | 'completed' | 'error';

interface ThreadStatus {
  thread_id: string;
  has_completed_agent_run: boolean;
  latest_completion_at?: string;
  last_viewed_at?: string;
  has_unread_completion: boolean;
  is_currently_running: boolean;
  current_agent_status?: string;
}

interface AgentStatusContextType {
  // Real-time status tracking (memory-based for current session)
  currentSessionStatuses: Map<string, AgentStatus>;
  updateThreadStatus: (threadId: string, status: AgentStatus) => void;
  
  // Persistent status tracking (database-based)
  threadStatuses: ThreadStatus[];
  markThreadAsViewed: (threadId: string) => void;
  isThreadCompleted: (threadId: string) => boolean;
  isThreadRunning: (threadId: string) => boolean;
  hasUnreadCompletedStatus: (threadId: string) => boolean;
  
  // Loading state
  isLoading: boolean;
}

const AgentStatusContext = createContext<AgentStatusContextType | undefined>(undefined);

export function AgentStatusProvider({ children }: { children: React.ReactNode }) {
  // Real-time session status (for showing spinners during current session)
  const [currentSessionStatuses, setCurrentSessionStatuses] = useState<Map<string, AgentStatus>>(new Map());
  
  const currentAccount = useCurrentAccount();
  const queryClient = useQueryClient();

  const supabase = createClient();

  // Fetch thread statuses from database
  const { data: threadStatuses = [], isLoading } = useQuery({
    queryKey: ['thread-statuses', currentAccount?.account_id],
    queryFn: async () => {
      if (!currentAccount?.account_id) return [];
      
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_thread_statuses_for_account', {
        p_account_id: currentAccount.account_id
      });
      
      if (error) {
        console.error('Error fetching thread statuses:', error);
        return [];
      }
      
      return data as ThreadStatus[];
    },
    enabled: !!currentAccount?.account_id,
    staleTime: 10 * 1000, // 10 seconds (reduced from 30)
    refetchInterval: 30 * 1000, // Refetch every 30 seconds (reduced from 60)
    refetchOnWindowFocus: true, // Enable refetch on window focus
    refetchOnReconnect: true, // Enable refetch on reconnect
  });

  // Mark thread as viewed mutation
  const markAsViewedMutation = useMutation({
    mutationFn: async (threadId: string) => {
      if (!currentAccount?.account_id) throw new Error('No account ID');
      
      const supabase = createClient();
      const { error } = await supabase.rpc('mark_thread_as_viewed', {
        p_thread_id: threadId,
        p_account_id: currentAccount.account_id
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate and refetch thread statuses
      queryClient.invalidateQueries({ queryKey: ['thread-statuses', currentAccount?.account_id] });
    },
  });

  // Update real-time session status
  const updateThreadStatus = useCallback((threadId: string, status: AgentStatus) => {
    setCurrentSessionStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(threadId, status);
      return newMap;
    });

    // If status changes to completed, invalidate the query to fetch updated data
    if (status === 'completed') {
      // Immediate invalidation without delay
      queryClient.invalidateQueries({ queryKey: ['thread-statuses', currentAccount?.account_id] });
      // Also refetch immediately to ensure fresh data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['thread-statuses', currentAccount?.account_id] });
      }, 1000); // Small delay to ensure backend has processed the completion
    }
  }, [queryClient, currentAccount?.account_id]);

  // Mark thread as viewed
  const markThreadAsViewed = useCallback((threadId: string) => {
    markAsViewedMutation.mutate(threadId);
  }, [markAsViewedMutation]);

  // Check if thread is completed (from database)
  const isThreadCompleted = useCallback((threadId: string): boolean => {
    const dbStatus = threadStatuses.find(s => s.thread_id === threadId);
    return dbStatus?.has_completed_agent_run || false;
  }, [threadStatuses]);

  // Check if thread is currently running (from current session OR database)
  const isThreadRunning = useCallback((threadId: string): boolean => {
    // First check current session for real-time updates
    const sessionStatus = currentSessionStatuses.get(threadId);
    if (sessionStatus === 'running' || sessionStatus === 'connecting') {
      return true;
    }
    
    // If no session status, check database for persistence across tabs/refreshes
    const dbStatus = threadStatuses.find(s => s.thread_id === threadId);
    return dbStatus?.is_currently_running || false;
  }, [currentSessionStatuses, threadStatuses]);

  // Check if thread has unread completion
  const hasUnreadCompletedStatus = useCallback((threadId: string): boolean => {
    const dbStatus = threadStatuses.find(s => s.thread_id === threadId);
    return dbStatus?.has_unread_completion || false;
  }, [threadStatuses]);

  // Clean up old session statuses
  useEffect(() => {
    const cleanup = setInterval(() => {
      setCurrentSessionStatuses(prev => {
        const newMap = new Map(prev);
        // Remove idle statuses older than 1 hour
        const hourAgo = Date.now() - 60 * 60 * 1000;
        
        for (const [threadId, status] of newMap.entries()) {
          if (status === 'idle') {
            newMap.delete(threadId);
          }
        }
        
        return newMap;
      });
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(cleanup);
  }, []);

  useEffect(() => {
    if (!currentAccount?.account_id) return;

    // Subscribe to agent_runs changes
    const agentRunsChannel: RealtimeChannel = supabase
      .channel('agent_runs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_runs',
        },
        (payload) => {
          console.log('Agent run change detected:', payload);
          // Small delay to ensure transaction is committed
          setTimeout(() => {
            queryClient.refetchQueries({ queryKey: ['thread-statuses', currentAccount.account_id] });
          }, 500);
        }
      )
      .subscribe();

    // Subscribe to thread_views changes
    const threadViewsChannel: RealtimeChannel = supabase
      .channel('thread_views_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thread_views',
          filter: `account_id=eq.${currentAccount.account_id}`,
        },
        (payload) => {
          console.log('Thread view change detected:', payload);
          queryClient.refetchQueries({ queryKey: ['thread-statuses', currentAccount.account_id] });
        }
      )
      .subscribe();

    // Subscribe to threads changes to catch new thread creation
    const threadsChannel: RealtimeChannel = supabase
      .channel('threads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads',
        },
        (payload) => {
          console.log('Thread change detected:', payload);
          queryClient.refetchQueries({ queryKey: ['thread-statuses', currentAccount.account_id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(agentRunsChannel);
      supabase.removeChannel(threadViewsChannel);
      supabase.removeChannel(threadsChannel);
    };
  }, [currentAccount?.account_id, queryClient]);

  const value: AgentStatusContextType = {
    currentSessionStatuses,
    updateThreadStatus,
    threadStatuses,
    markThreadAsViewed,
    isThreadCompleted,
    isThreadRunning,
    hasUnreadCompletedStatus,
    isLoading,
  };

  return (
    <AgentStatusContext.Provider value={value}>
      {children}
    </AgentStatusContext.Provider>
  );
}

export function useAgentStatus() {
  const context = useContext(AgentStatusContext);
  if (context === undefined) {
    throw new Error('useAgentStatus must be used within an AgentStatusProvider');
  }
  return context;
} 