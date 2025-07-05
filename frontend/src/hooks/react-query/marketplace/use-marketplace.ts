import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { isFlagEnabled } from '@/lib/feature-flags';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export interface MarketplaceAgent {
  agent_id: string;
  name: string;
  description: string;
  system_prompt: string;
  configured_mcps: any[];
  custom_mcps?: any[];
  agentpress_tools: Record<string, any>;
  knowledge_bases?: any[];
  sharing_preferences?: {
    include_knowledge_bases?: boolean;
    include_custom_mcp_tools?: boolean;
  };
  tags: string[];
  download_count: number;
  marketplace_published_at: string;
  created_at: string;
  creator_name: string;
  avatar?: string;
  avatar_color?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MarketplaceAgentsResponse {
  agents: MarketplaceAgent[];
  pagination: PaginationInfo;
}

interface MarketplaceAgentsParams {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  sort_by?: 'newest' | 'popular' | 'most_downloaded' | 'name';
  creator?: string;
  account_id?: string;
}

export function useMarketplaceAgents(params: MarketplaceAgentsParams = {}) {
  return useQuery({
    queryKey: ['marketplace-agents', params],
    queryFn: async (): Promise<MarketplaceAgentsResponse> => {
      try {
        const marketplaceEnabled = await isFlagEnabled('agent_marketplace');
        if (!marketplaceEnabled) {
          throw new Error('Marketplace is not enabled');
        }
        
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.search) queryParams.append('search', params.search);
        if (params.tags && params.tags.length > 0) {
          queryParams.append('tags', params.tags.join(','));
        }
        if (params.sort_by) queryParams.append('sort_by', params.sort_by);
        if (params.creator) queryParams.append('creator', params.creator);
        if (params.account_id) queryParams.append('account_id', params.account_id);

        const url = `${API_URL}/marketplace/agents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (session) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[API] Fetched marketplace agents:', data.agents?.length || 0, 'total:', data.pagination?.total || 0);
        return data;
      } catch (err) {
        console.error('Error fetching marketplace agents:', err);
        throw err;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddAgentToLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (originalAgentId: string): Promise<string> => {
      try {
        const marketplaceEnabled = await isFlagEnabled('agent_marketplace');
        if (!marketplaceEnabled) {
          throw new Error('Marketplace is not enabled');
        }
        
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('You must be logged in to add agents to your library');
        }

        const response = await fetch(`${API_URL}/marketplace/agents/${originalAgentId}/add-to-library`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.new_agent_id;
      } catch (err) {
        console.error('Error adding agent to library:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-agents'] });
      queryClient.invalidateQueries({ queryKey: ['user-agent-library'] });
    },
  });
}

export function usePublishAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      agentId, 
      tags = [], 
      visibility = 'public', 
      teamIds = [],
      includeKnowledgeBases = true,
      includeCustomMcpTools = true
    }: { 
      agentId: string; 
      tags?: string[]; 
      visibility?: 'public' | 'teams' | 'private';
      teamIds?: string[];
      includeKnowledgeBases?: boolean;
      includeCustomMcpTools?: boolean;
    }): Promise<void> => {
      try {
        const marketplaceEnabled = await isFlagEnabled('agent_marketplace');
        if (!marketplaceEnabled) {
          throw new Error('Marketplace is not enabled');
        }
        
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('You must be logged in to publish agents');
        }
        const response = await fetch(`${API_URL}/agents/${agentId}/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            tags,
            visibility,
            team_ids: teamIds,
            include_knowledge_bases: includeKnowledgeBases,
            include_custom_mcp_tools: includeCustomMcpTools
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.error('Error publishing agent:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-agents'] });
    },
  });
}

export function useUnpublishAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string): Promise<void> => {
      try {
        const marketplaceEnabled = await isFlagEnabled('agent_marketplace');
        if (!marketplaceEnabled) {
          throw new Error('Marketplace is not enabled');
        }
        
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('You must be logged in to unpublish agents');
        }

        const response = await fetch(`${API_URL}/agents/${agentId}/unpublish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.error('Error unpublishing agent:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-agents'] });
    },
  });
}

export function useUserAgentLibrary() {
  return useQuery({
    queryKey: ['user-agent-library'],
    queryFn: async () => {
      try {
        const marketplaceEnabled = await isFlagEnabled('agent_marketplace');
        if (!marketplaceEnabled) {
          throw new Error('Marketplace is not enabled');
        }
        
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('You must be logged in to view your agent library');
        }

        const response = await fetch(`${API_URL}/user/agent-library`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.library || [];
      } catch (err) {
        console.error('Error fetching user agent library:', err);
        throw err;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
} 