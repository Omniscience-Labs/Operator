import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

// Types
export interface KnowledgeIndex {
  index_id: string;
  name: string;
  description: string;
  llamacloud_index_key: string;
  index_type: 'uploaded' | 'external';
  is_active: boolean;
  file_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeIndexRequest {
  name: string;
  description: string;
  index_type?: 'uploaded' | 'external';
  llamacloud_index_key?: string;
}

export interface UpdateKnowledgeIndexRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// API functions
const api = {
  async getIndexes(authToken: string): Promise<KnowledgeIndex[]> {
    const response = await fetch('/api/knowledge/indexes', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch knowledge indexes');
    }

    return response.json();
  },

  async createIndex(authToken: string, data: CreateKnowledgeIndexRequest): Promise<KnowledgeIndex> {
    const response = await fetch('/api/knowledge/indexes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create knowledge index');
    }

    return response.json();
  },

  async updateIndex(authToken: string, indexId: string, data: UpdateKnowledgeIndexRequest): Promise<KnowledgeIndex> {
    const response = await fetch(`/api/knowledge/indexes/${indexId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update knowledge index');
    }

    return response.json();
  },

  async deleteIndex(authToken: string, indexId: string): Promise<void> {
    const response = await fetch(`/api/knowledge/indexes/${indexId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete knowledge index');
    }
  },
};

// Hooks
export function useKnowledgeIndexes() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['knowledge-indexes'],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }
      return api.getIndexes(session.access_token);
    },
    enabled: !!session?.access_token,
  });
}

export function useCreateKnowledgeIndex() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateKnowledgeIndexRequest) => {
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }
      return api.createIndex(session.access_token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-indexes'] });
      toast.success('Knowledge index created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateKnowledgeIndex() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ indexId, data }: { indexId: string; data: UpdateKnowledgeIndexRequest }) => {
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }
      return api.updateIndex(session.access_token, indexId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-indexes'] });
      toast.success('Knowledge index updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteKnowledgeIndex() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (indexId: string) => {
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }
      return api.deleteIndex(session.access_token, indexId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-indexes'] });
      toast.success('Knowledge index deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}