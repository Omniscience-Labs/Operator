import { createMutationHook, createQueryHook } from '@/hooks/use-query';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { agentKeys } from './keys';
import { Agent, AgentUpdateRequest, AgentsParams, createAgent, deleteAgent, getAgent, getAgents, getThreadAgent, updateAgent, removeAgentFromLibrary, AgentBuilderChatRequest, AgentBuilderStreamData, startAgentBuilderChat, getAgentBuilderChatHistory } from './utils';
import { useRef, useCallback } from 'react';

export const useAgents = (params: AgentsParams = {}) => {
  return createQueryHook(
    agentKeys.list(params),
    () => getAgents(params),
    {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    }
  )();
};

export const useAgent = (agentId: string) => {
  return createQueryHook(
    agentKeys.detail(agentId),
    () => getAgent(agentId),
    {
      enabled: !!agentId,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    }
  )();
};

export const useCreateAgent = () => {
  const queryClient = useQueryClient();
  
  return createMutationHook(
    createAgent,
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
        queryClient.setQueryData(agentKeys.detail(data.agent_id), data);
        
        toast.success('Agent created successfully');
      },
    }
  )();
};

export const useUpdateAgent = () => {
  const queryClient = useQueryClient();
  
  return createMutationHook(
    ({ agentId, ...data }: { agentId: string } & AgentUpdateRequest) => 
      updateAgent(agentId, data),
    {
      onSuccess: (data, variables) => {
        queryClient.setQueryData(agentKeys.detail(variables.agentId), data);
        queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      },
    }
  )();
};

export const useDeleteAgent = () => {
  const queryClient = useQueryClient();
  
  return createMutationHook(
    deleteAgent,
    {
      onSuccess: (_, agentId) => {
        queryClient.removeQueries({ queryKey: agentKeys.detail(agentId) });
        queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
        toast.success('Agent deleted successfully');
      },
    }
  )();
};

export const useRemoveAgentFromLibrary = () => {
  const queryClient = useQueryClient();
  
  return createMutationHook(
    removeAgentFromLibrary,
    {
      onSuccess: (_, agentId) => {
        queryClient.removeQueries({ queryKey: agentKeys.detail(agentId) });
        queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
        toast.success('Agent removed from library successfully');
      },
    }
  )();
};

export const useOptimisticAgentUpdate = () => {
  const queryClient = useQueryClient();
  
  return {
    optimisticallyUpdateAgent: (agentId: string, updates: Partial<Agent>) => {
      queryClient.setQueryData(
        agentKeys.detail(agentId),
        (oldData: Agent | undefined) => {
          if (!oldData) return oldData;
          return { ...oldData, ...updates };
        }
      );
    },
    
    revertOptimisticUpdate: (agentId: string) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(agentId) });
    },
  };
};

export const useThreadAgent = (threadId: string) => {
  return createQueryHook(
    agentKeys.threadAgent(threadId),
    () => getThreadAgent(threadId),
    {
      enabled: !!threadId,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    }
  )();
};

export const useAgentBuilderChat = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    request: AgentBuilderChatRequest,
    callbacks: {
      onData: (data: AgentBuilderStreamData) => void;
      onComplete: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      await startAgentBuilderChat(
        request,
        callbacks.onData,
        callbacks.onComplete,
        abortControllerRef.current.signal
      );
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error in agent builder chat:', error);
        callbacks.onError?.(error);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    sendMessage,
    cancelStream,
  };
};

export const useAgentBuilderChatHistory = (agentId: string) =>
  createQueryHook(
    agentKeys.builderChatHistory(agentId),
    () => getAgentBuilderChatHistory(agentId),
    {
      enabled: !!agentId,
      retry: 1,
    }
  )();