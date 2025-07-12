'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type AgentStatus = 'idle' | 'running' | 'connecting' | 'completed' | 'error';

interface ThreadStatus {
  threadId: string;
  status: AgentStatus;
  completedAt?: Date;
  hasBeenViewed?: boolean;
}

interface AgentStatusContextType {
  threadStatuses: Map<string, ThreadStatus>;
  updateThreadStatus: (threadId: string, status: AgentStatus) => void;
  markThreadAsViewed: (threadId: string) => void;
  getThreadStatus: (threadId: string) => ThreadStatus | undefined;
  isThreadCompleted: (threadId: string) => boolean;
  isThreadRunning: (threadId: string) => boolean;
  hasUnreadCompletedStatus: (threadId: string) => boolean;
}

const AgentStatusContext = createContext<AgentStatusContextType | undefined>(undefined);

export function AgentStatusProvider({ children }: { children: React.ReactNode }) {
  const [threadStatuses, setThreadStatuses] = useState<Map<string, ThreadStatus>>(new Map());

  const updateThreadStatus = useCallback((threadId: string, status: AgentStatus) => {
    setThreadStatuses(prev => {
      const newMap = new Map(prev);
      const existingStatus = newMap.get(threadId);
      
      // If status is changing from running/connecting to completed, mark completion time
      const completedAt = (status === 'completed' && 
        existingStatus?.status && 
        ['running', 'connecting'].includes(existingStatus.status)) 
        ? new Date() 
        : existingStatus?.completedAt;

      // If status is changing from completed to something else, reset viewed status
      const hasBeenViewed = status === 'completed' ? existingStatus?.hasBeenViewed : false;

      newMap.set(threadId, {
        threadId,
        status,
        completedAt,
        hasBeenViewed,
      });
      
      return newMap;
    });
  }, []);

  const markThreadAsViewed = useCallback((threadId: string) => {
    setThreadStatuses(prev => {
      const newMap = new Map(prev);
      const existingStatus = newMap.get(threadId);
      
      if (existingStatus) {
        newMap.set(threadId, {
          ...existingStatus,
          hasBeenViewed: true,
        });
      }
      
      return newMap;
    });
  }, []);

  const getThreadStatus = useCallback((threadId: string): ThreadStatus | undefined => {
    return threadStatuses.get(threadId);
  }, [threadStatuses]);

  const isThreadCompleted = useCallback((threadId: string): boolean => {
    const status = threadStatuses.get(threadId);
    return status?.status === 'completed';
  }, [threadStatuses]);

  const isThreadRunning = useCallback((threadId: string): boolean => {
    const status = threadStatuses.get(threadId);
    return status?.status === 'running' || status?.status === 'connecting';
  }, [threadStatuses]);

  const hasUnreadCompletedStatus = useCallback((threadId: string): boolean => {
    const status = threadStatuses.get(threadId);
    return status?.status === 'completed' && !status?.hasBeenViewed;
  }, [threadStatuses]);

  // Clean up old statuses after 24 hours
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      setThreadStatuses(prev => {
        const newMap = new Map(prev);
        
        for (const [threadId, status] of newMap.entries()) {
          // Remove completed statuses that are older than 24 hours
          if (status.status === 'completed' && 
              status.completedAt && 
              status.completedAt < dayAgo) {
            newMap.delete(threadId);
          }
        }
        
        return newMap;
      });
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(cleanup);
  }, []);

  const value: AgentStatusContextType = {
    threadStatuses,
    updateThreadStatus,
    markThreadAsViewed,
    getThreadStatus,
    isThreadCompleted,
    isThreadRunning,
    hasUnreadCompletedStatus,
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