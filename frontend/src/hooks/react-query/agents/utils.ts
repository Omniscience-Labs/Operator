import { createClient } from "@/lib/supabase/client";
import { isFlagEnabled } from "@/lib/feature-flags";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export type Agent = {
  agent_id: string;
  account_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  configured_mcps?: Array<{
    name: string;
    qualifiedName?: string;
    config: Record<string, any>;
    enabledTools?: string[];
  }>;
  custom_mcps?: Array<{
    name: string;
    type: 'json' | 'sse';
    config: Record<string, any>;
    enabledTools: string[];
  }>;
  agentpress_tools?: Record<string, { enabled: boolean; description: string }>;
  is_default: boolean;
  is_public?: boolean;
  visibility?: 'public' | 'teams' | 'private';
  marketplace_published_at?: string;
  download_count?: number;
  tags?: string[];
  sharing_preferences?: {
    include_knowledge_bases?: boolean;
    include_custom_mcp_tools?: boolean;
    managed_agent?: boolean;
    original_agent_id?: string;
    is_marketplace_agent?: boolean;
  };
  created_at: string;
  updated_at?: string;
  avatar?: string;
  avatar_color?: string;
  knowledge_bases?: Array<{ name: string; index_name: string; description: string }>;
  is_managed?: boolean;  // True if this is a managed agent (live reference)
  is_owned?: boolean;    // True if user owns this agent
};

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type AgentsResponse = {
  agents: Agent[];
  pagination: PaginationInfo;
};

export type AgentsParams = {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: string;
  has_default?: boolean;
  has_mcp_tools?: boolean;
  has_agentpress_tools?: boolean;
  tools?: string;
  account_id?: string;
};

export type ThreadAgentResponse = {
  agent: Agent | null;
  source: 'thread' | 'default' | 'none' | 'missing';
  message: string;
};

export type AgentCreateRequest = {
  name: string;
  description?: string;
  system_prompt: string;
  configured_mcps?: Array<{
    name: string;
    config: Record<string, any>;
  }>;
  custom_mcps?: Array<{
    name: string;
    type: 'json' | 'sse';
    config: Record<string, any>;
    enabledTools: string[];
  }>;
  agentpress_tools?: Record<string, any>;
  is_default?: boolean;
  knowledge_bases?: Array<{ name: string; index_name: string; description: string }>;
};

export type AgentUpdateRequest = {
  name?: string;
  description?: string;
  system_prompt?: string;
  configured_mcps?: Array<{
    name: string;
    config: Record<string, any>;
  }>;
  custom_mcps?: Array<{
    name: string;
    type: 'json' | 'sse';
    config: Record<string, any>;
    enabledTools: string[];
  }>;
  agentpress_tools?: Record<string, any>;
  is_default?: boolean;
  knowledge_bases?: Array<{ name: string; index_name: string; description: string }>;
};

export const getAgents = async (params: AgentsParams = {}): Promise<AgentsResponse> => {
  try {
    const agentPlaygroundEnabled = await isFlagEnabled('custom_agents');
    if (!agentPlaygroundEnabled) {
      throw new Error('Custom agents is not enabled');
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('You must be logged in to get agents');
    }

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);
    if (params.has_default !== undefined) queryParams.append('has_default', params.has_default.toString());
    if (params.has_mcp_tools !== undefined) queryParams.append('has_mcp_tools', params.has_mcp_tools.toString());
    if (params.has_agentpress_tools !== undefined) queryParams.append('has_agentpress_tools', params.has_agentpress_tools.toString());
    if (params.tools) queryParams.append('tools', params.tools);
    if (params.account_id) queryParams.append('account_id', params.account_id);

    const url = `${API_URL}/agents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
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

    const result = await response.json();
    console.log('[API] Fetched agents:', result.agents?.length || 0, 'total:', result.pagination?.total || 0);
    return result;
  } catch (err) {
    console.error('Error fetching agents:', err);
    throw err;
  }
};

export const getAgent = async (agentId: string): Promise<Agent> => {
  try {
    const agentPlaygroundEnabled = await isFlagEnabled('custom_agents');
    if (!agentPlaygroundEnabled) {
      throw new Error('Custom agents is not enabled');
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('You must be logged in to get agent details');
    }

    const response = await fetch(`${API_URL}/agents/${agentId}`, {
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

    const agent = await response.json();
    console.log('[API] Fetched agent:', agent.agent_id);
    return agent;
  } catch (err) {
    console.error('Error fetching agent:', err);
    throw err;
  }
};

export const createAgent = async (agentData: AgentCreateRequest): Promise<Agent> => {
  try {
    const agentPlaygroundEnabled = await isFlagEnabled('custom_agents');
    if (!agentPlaygroundEnabled) {
      throw new Error('Custom agents is not enabled');
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('You must be logged in to create an agent');
    }

    const response = await fetch(`${API_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(agentData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const agent = await response.json();
    console.log('[API] Created agent:', agent.agent_id);
    return agent;
  } catch (err) {
    console.error('Error creating agent:', err);
    throw err;
  }
};

export const updateAgent = async (agentId: string, agentData: AgentUpdateRequest): Promise<Agent> => {
  try {
    const agentPlaygroundEnabled = await isFlagEnabled('custom_agents');
    if (!agentPlaygroundEnabled) {
      throw new Error('Custom agents is not enabled');
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('You must be logged in to update an agent');
    }

    const response = await fetch(`${API_URL}/agents/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(agentData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: {response.statusText}`);
    }

    const agent = await response.json();
    console.log('[API] Updated agent:', agent.agent_id);
    return agent;
  } catch (err) {
    console.error('Error updating agent:', err);
    throw err;
  }
};

export const deleteAgent = async (agentId: string): Promise<void> => {
  try {
    const agentPlaygroundEnabled = await isFlagEnabled('custom_agents');
    if (!agentPlaygroundEnabled) {
      throw new Error('Custom agents is not enabled');
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('You must be logged in to delete an agent');
    }

    const response = await fetch(`${API_URL}/agents/${agentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('[API] Deleted agent:', agentId);
  } catch (err) {
    console.error('Error deleting agent:', err);
    throw err;
  }
};

export const removeAgentFromLibrary = async (agentId: string): Promise<void> => {
  try {
    const agentPlaygroundEnabled = await isFlagEnabled('custom_agents');
    if (!agentPlaygroundEnabled) {
      throw new Error('Custom agents is not enabled');
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('You must be logged in to remove an agent from library');
    }

    const response = await fetch(`${API_URL}/agents/${agentId}/remove-from-library`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('[API] Removed agent from library:', agentId);
  } catch (err) {
    console.error('Error removing agent from library:', err);
    throw err;
  }
};

export const getThreadAgent = async (threadId: string): Promise<ThreadAgentResponse> => {
  try {
    const agentPlaygroundEnabled = await isFlagEnabled('custom_agents');
    if (!agentPlaygroundEnabled) {
      throw new Error('Custom agents is not enabled');
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('You must be logged in to get thread agent');
    }

    const response = await fetch(`${API_URL}/thread/${threadId}/agent`, {
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

    const agent = await response.json();
    console.log('[API] Fetched thread agent:', threadId);
    return agent;
  } catch (err) {
    console.error('Error fetching thread agent:', err);
    throw err;
  }
};

export const getAgentBuilderChatHistory = async (agentId: string): Promise<{messages: any[], thread_id: string | null}> => {
  try {
    const agentPlaygroundEnabled = await isFlagEnabled('custom_agents');
    if (!agentPlaygroundEnabled) {
      throw new Error('Custom agents is not enabled');
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('You must be logged in to get agent builder chat history');
    }

    const response = await fetch(`${API_URL}/agents/${agentId}/builder-chat-history`, {
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
    console.log('[API] Fetched agent builder chat history:', agentId, data.messages.length);
    return data;
  } catch (err) {
    console.error('Error fetching agent builder chat history:', err);
    throw err;
  }
};

// Agent Builder Chat Types
export type AgentBuilderMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AgentBuilderConfig = {
  name?: string;
  description?: string;
  system_prompt?: string;
  agentpress_tools?: Record<string, { enabled: boolean; description: string }>;
  configured_mcps?: Array<{ name: string; qualifiedName: string; config: any; enabledTools?: string[] }>;
  avatar?: string;
  avatar_color?: string;
};

export type AgentBuilderChatRequest = {
  message: string;
  conversation_history: AgentBuilderMessage[];
  agent_id: string;
  partial_config?: AgentBuilderConfig;
};

export type AgentBuilderStreamData = {
  type: 'content' | 'config' | 'done' | 'error';
  content?: string;
  config?: AgentBuilderConfig;
  next_step?: string;
  error?: string;
};

export const startAgentBuilderChat = async (
  request: AgentBuilderChatRequest,
  onData: (data: AgentBuilderStreamData) => void,
  onComplete: () => void,
  signal?: AbortSignal
): Promise<void> => {
  try {
    const agentPlaygroundEnabled = await isFlagEnabled('custom_agents');
    if (!agentPlaygroundEnabled) {
      throw new Error('Custom agents is not enabled');
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('You must be logged in to use the agent builder');
    }

    const response = await fetch(`${API_URL}/agents/builder/chat/${request.agent_id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        message: request.message,
        conversation_history: request.conversation_history,
        partial_config: request.partial_config
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onData(data);
            
            if (data.type === 'done') {
              onComplete();
              return;
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in agent builder chat:', err);
    throw err;
  }
};
  