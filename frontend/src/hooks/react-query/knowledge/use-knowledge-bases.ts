import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export interface KnowledgeBase {
  id: string;
  account_id: string;
  agent_id?: string;
  name: string;
  description?: string;
  llama_index_id?: string;
  index_type: 'managed' | 'external';
  status: 'pending' | 'indexing' | 'ready' | 'error';
  error_message?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseFile {
  id: string;
  knowledge_base_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  status: 'pending' | 'indexed' | 'error';
  error_message?: string;
  created_at: string;
}

export interface CreateKnowledgeBaseRequest {
  name: string;
  description?: string;
  agent_id?: string;
  index_type?: 'managed' | 'external';
  llama_index_id?: string;
}

export interface UpdateKnowledgeBaseRequest {
  name?: string;
  description?: string;
  status?: string;
}

// Query keys
export const knowledgeBaseKeys = {
  all: ['knowledge-bases'] as const,
  lists: () => [...knowledgeBaseKeys.all, 'list'] as const,
  list: (agentId?: string) => [...knowledgeBaseKeys.lists(), { agentId }] as const,
  details: () => [...knowledgeBaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...knowledgeBaseKeys.details(), id] as const,
  files: (knowledgeBaseId: string) => [...knowledgeBaseKeys.all, 'files', knowledgeBaseId] as const,
};

// List knowledge bases
export const useKnowledgeBases = (agentId?: string, options?: UseQueryOptions<KnowledgeBase[]>) => {
  return useQuery({
    queryKey: knowledgeBaseKeys.list(agentId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (agentId) params.append('agent_id', agentId);
      
      const response = await apiClient.get(`/knowledge/bases?${params}`);
      return response.data as KnowledgeBase[];
    },
    ...options,
  });
};

// Create knowledge base
export const useCreateKnowledgeBase = (
  options?: UseMutationOptions<KnowledgeBase, Error, CreateKnowledgeBaseRequest>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateKnowledgeBaseRequest) => {
      const response = await apiClient.post('/knowledge/bases', data);
      return response.data as KnowledgeBase;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.lists() });
      toast.success('Knowledge base created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create knowledge base');
      console.error('Create knowledge base error:', error);
    },
    ...options,
  });
};

// Update knowledge base
export const useUpdateKnowledgeBase = (
  options?: UseMutationOptions<KnowledgeBase, Error, { id: string; data: UpdateKnowledgeBaseRequest }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put(`/knowledge/bases/${id}`, data);
      return response.data as KnowledgeBase;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.detail(variables.id) });
      toast.success('Knowledge base updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update knowledge base');
      console.error('Update knowledge base error:', error);
    },
    ...options,
  });
};

// Delete knowledge base
export const useDeleteKnowledgeBase = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/knowledge/bases/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.lists() });
      toast.success('Knowledge base deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete knowledge base');
      console.error('Delete knowledge base error:', error);
    },
    ...options,
  });
};

// List knowledge base files
export const useKnowledgeBaseFiles = (
  knowledgeBaseId: string,
  options?: UseQueryOptions<KnowledgeBaseFile[]>
) => {
  return useQuery({
    queryKey: knowledgeBaseKeys.files(knowledgeBaseId),
    queryFn: async () => {
      const response = await apiClient.get(`/knowledge/bases/${knowledgeBaseId}/files`);
      return response.data as KnowledgeBaseFile[];
    },
    enabled: !!knowledgeBaseId,
    ...options,
  });
};

// Upload file to knowledge base
export const useUploadKnowledgeFile = (
  options?: UseMutationOptions<KnowledgeBaseFile, Error, { knowledgeBaseId: string; file: File }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ knowledgeBaseId, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post(
        `/knowledge/bases/${knowledgeBaseId}/files`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data as KnowledgeBaseFile;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: knowledgeBaseKeys.files(variables.knowledgeBaseId) 
      });
      toast.success(`File "${variables.file.name}" uploaded successfully`);
    },
    onError: (error, variables) => {
      toast.error(`Failed to upload file "${variables.file.name}"`);
      console.error('Upload file error:', error);
    },
    ...options,
  });
};

// Delete knowledge base file
export const useDeleteKnowledgeFile = (
  options?: UseMutationOptions<void, Error, { knowledgeBaseId: string; fileId: string }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ knowledgeBaseId, fileId }) => {
      await apiClient.delete(`/knowledge/bases/${knowledgeBaseId}/files/${fileId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: knowledgeBaseKeys.files(variables.knowledgeBaseId) 
      });
      toast.success('File deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete file');
      console.error('Delete file error:', error);
    },
    ...options,
  });
};