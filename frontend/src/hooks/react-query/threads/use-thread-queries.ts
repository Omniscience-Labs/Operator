'use client';

import { createQueryHook } from '@/hooks/use-query';
import { getThreads } from '@/lib/api';
import { threadKeys } from './keys';
import { useCurrentAccount } from '@/hooks/use-current-account';

export const useThreadsByProject = (projectId?: string) => {
  const currentAccount = useCurrentAccount();
  
  return createQueryHook(
    threadKeys.byProject(projectId || ''),
    () => {
      if (!projectId) return Promise.resolve([]);
      const accountId = currentAccount?.account_id;
      return getThreads(projectId, accountId);
    },
    {
      enabled: !!projectId && !!currentAccount?.account_id,
      staleTime: 2 * 60 * 1000, 
      refetchOnWindowFocus: false,
    }
  )();
};

export const useAllThreads = () => {
  const currentAccount = useCurrentAccount();
  
  return createQueryHook(
    threadKeys.all,
    () => {
      const accountId = currentAccount?.account_id;
      return getThreads(undefined, accountId);
    },
    {
      enabled: !!currentAccount?.account_id,
      staleTime: 2 * 60 * 1000, 
      refetchOnWindowFocus: false,
    }
  )();
}; 