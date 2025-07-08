'use client';

import { createMutationHook } from "@/hooks/use-query";
import { getProjects, getThreads, Project, Thread } from "@/lib/api";
import { createQueryHook } from '@/hooks/use-query';
import { threadKeys } from "./keys";
import { projectKeys } from "./keys";
import { deleteThread } from "../threads/utils";
import { useCurrentAccount } from "@/hooks/use-current-account";

export const useProjects = () => {
  const currentAccount = useCurrentAccount();
  
  return createQueryHook(
    projectKeys.lists(),
    async () => {
      const accountId = currentAccount?.account_id;
      const data = await getProjects(accountId);
      return data as Project[];
    },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      enabled: !!currentAccount?.account_id,
    }
  )();
};

export const useThreads = () => {
  const currentAccount = useCurrentAccount();
  
  return createQueryHook(
    threadKeys.lists(),
    async () => {
      const accountId = currentAccount?.account_id;
      const data = await getThreads(undefined, accountId);
      return data as Thread[];
    },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      enabled: !!currentAccount?.account_id,
    }
  )();
};

interface DeleteThreadVariables {
  threadId: string;
  sandboxId?: string;
  isNavigateAway?: boolean;
}

export const useDeleteThread = createMutationHook(
  async ({ threadId, sandboxId }: DeleteThreadVariables) => {
    return await deleteThread(threadId, sandboxId);
  },
  {
    onSuccess: () => {
    },
  }
);

interface DeleteMultipleThreadsVariables {
  threadIds: string[];
  threadSandboxMap?: Record<string, string>;
  onProgress?: (completed: number, total: number) => void;
}

export const useDeleteMultipleThreads = createMutationHook(
  async ({ threadIds, threadSandboxMap, onProgress }: DeleteMultipleThreadsVariables) => {
    let completedCount = 0;
    const results = await Promise.all(
      threadIds.map(async (threadId) => {
        try {
          const sandboxId = threadSandboxMap?.[threadId];
          const result = await deleteThread(threadId, sandboxId);
          completedCount++;
          onProgress?.(completedCount, threadIds.length);
          return { success: true, threadId };
        } catch (error) {
          return { success: false, threadId, error };
        }
      })
    );
    
    return {
      successful: results.filter(r => r.success).map(r => r.threadId),
      failed: results.filter(r => !r.success).map(r => r.threadId),
    };
  },
  {
    onSuccess: () => {
    },
  }
);

export type ThreadWithProject = {
  threadId: string;
  projectId: string;
  projectName: string;
  url: string;
  updatedAt: string;
};

export const processThreadsWithProjects = (
  threads: Thread[],
  projects: Project[]
): ThreadWithProject[] => {
  const projectsById = new Map<string, Project>();
  projects.forEach((project) => {
    projectsById.set(project.id, project);
  });

  const threadsWithProjects: ThreadWithProject[] = [];

  for (const thread of threads) {
    const projectId = thread.project_id;
    if (!projectId) continue;

    const project = projectsById.get(projectId);
    if (!project) {
      console.log(
        `❌ Thread ${thread.thread_id} has project_id=${projectId} but no matching project found`,
      );
      continue;
    }
    threadsWithProjects.push({
      threadId: thread.thread_id,
      projectId: projectId,
      projectName: project.name || 'Unnamed Project',
      url: `/projects/${projectId}/thread/${thread.thread_id}`,
      updatedAt:
        thread.updated_at || project.updated_at || new Date().toISOString(),
    });
  }

  return sortThreads(threadsWithProjects);
};

export const sortThreads = (
  threadsList: ThreadWithProject[],
): ThreadWithProject[] => {
  return [...threadsList].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
};