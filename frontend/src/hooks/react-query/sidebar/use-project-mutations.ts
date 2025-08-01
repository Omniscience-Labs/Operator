'use client';

import { createMutationHook } from '@/hooks/use-query';
import { 
  createProject, 
  updateProject, 
  deleteProject,
  Project 
} from '@/lib/api';
import { toast } from 'sonner';
import { projectKeys } from './keys';
import { useCurrentAccount } from '@/hooks/use-current-account';

export const useCreateProject = () => {
  const currentAccount = useCurrentAccount();
  
  return createMutationHook(
    (data: { name: string; description: string }) => {
      const accountId = currentAccount?.account_id;
      return createProject(data, accountId);
    },
    {
      onSuccess: () => {
        toast.success('Project created successfully');
      },
      errorContext: {
        operation: 'create project',
        resource: 'project'
      }
    }
  )();
};

export const useUpdateProject = createMutationHook(
  ({ projectId, data }: { projectId: string; data: Partial<Project> }) => 
    updateProject(projectId, data),
  {
    onSuccess: () => {
    //   toast.success('Project updated successfully');
    },
    errorContext: {
      operation: 'update project',
      resource: 'project'
    }
  }
);

export const useDeleteProject = createMutationHook(
  ({ projectId }: { projectId: string }) => deleteProject(projectId),
  {
    onSuccess: () => {
      toast.success('Project deleted successfully');
    },
    errorContext: {
      operation: 'delete project',
      resource: 'project'
    }
  }
); 