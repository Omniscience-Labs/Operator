export type SortOption = 'name' | 'created_at' | 'updated_at' | 'tools_count';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

export interface FilterOptions {
  hasDefaultAgent: boolean;
  hasMcpTools: boolean;
  hasAgentpressTools: boolean;
  selectedTools: string[];
}

export interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
  configured_mcps?: Array<{ name: string }>;
  agentpress_tools?: Record<string, any>;
  knowledge_bases?: Array<{ index_name: string; description: string }>;
}

export interface MutationState {
  isPending: boolean;
}