import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export function useListAgentDefaultFiles(agentId: string) {
  return useQuery({
    queryKey: ['agent-default-files', agentId],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const response = await fetch(`${API_URL}/agents/${agentId}/default-files`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch default files: ${response.statusText}`);
      }

      const data = await response.json();
      return data.files || [];
    },
    enabled: !!agentId,
  });
}

export function useUploadAgentDefaultFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agentId, file }: { agentId: string; file: File }) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/agents/${agentId}/default-files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (_, { agentId }) => {
      queryClient.invalidateQueries({ queryKey: ['agent-default-files', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useDeleteAgentDefaultFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agentId, filename }: { agentId: string; filename: string }) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const response = await fetch(`${API_URL}/agents/${agentId}/default-files/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Delete failed' }));
        throw new Error(errorData.message || `Delete failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (_, { agentId }) => {
      queryClient.invalidateQueries({ queryKey: ['agent-default-files', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}