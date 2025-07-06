import { useState, useMemo } from 'react';

type SortOption = 'name' | 'created_at' | 'updated_at' | 'tools_count';
type SortOrder = 'asc' | 'desc';

interface FilterOptions {
  hasDefaultAgent: boolean;
  hasMcpTools: boolean;
  hasAgentpressTools: boolean;
  selectedTools: string[];
}

interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
  configured_mcps?: Array<{ name: string }>;
  agentpress_tools?: Record<string, any>;
}

export function useAgentsFiltering(agents: Agent[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<FilterOptions>({
    hasDefaultAgent: false,
    hasMcpTools: false,
    hasAgentpressTools: false,
    selectedTools: []
  });

  const allTools = useMemo(() => {
    const toolsSet = new Set<string>();
    agents.forEach(agent => {
      agent.configured_mcps?.forEach(mcp => toolsSet.add(`mcp:${mcp.name}`));
      Object.entries(agent.agentpress_tools || {}).forEach(([tool, toolData]) => {
        if (toolData && typeof toolData === 'object' && 'enabled' in toolData && toolData.enabled) {
          toolsSet.add(`agentpress:${tool}`);
        }
      });
    });
    return Array.from(toolsSet).sort();
  }, [agents]);

  const filteredAndSortedAgents = useMemo(() => {
    const filtered = agents.filter(agent => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = agent.name.toLowerCase().includes(query);
        const matchesDescription = agent.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }

      if (filters.hasDefaultAgent && !agent.is_default) return false;
      if (filters.hasMcpTools && (!agent.configured_mcps || agent.configured_mcps.length === 0)) return false;

      if (filters.hasAgentpressTools) {
        const hasEnabledTools = Object.values(agent.agentpress_tools || {}).some(
          toolData => toolData && typeof toolData === 'object' && 'enabled' in toolData && toolData.enabled
        );
        if (!hasEnabledTools) return false;
      }

      if (filters.selectedTools.length > 0) {
        const agentTools = new Set<string>();
        agent.configured_mcps?.forEach(mcp => agentTools.add(`mcp:${mcp.name}`));
        Object.entries(agent.agentpress_tools || {}).forEach(([tool, toolData]) => {
          if (toolData && typeof toolData === 'object' && 'enabled' in toolData && toolData.enabled) {
            agentTools.add(`agentpress:${tool}`);
          }
        });
        
        const hasSelectedTool = filters.selectedTools.some(tool => agentTools.has(tool));
        if (!hasSelectedTool) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          comparison = new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime();
          break;
        case 'tools_count':
          const aToolsCount = (a.configured_mcps?.length || 0) + 
            Object.values(a.agentpress_tools || {}).filter(toolData => 
              toolData && typeof toolData === 'object' && 'enabled' in toolData && toolData.enabled
            ).length;
          const bToolsCount = (b.configured_mcps?.length || 0) + 
            Object.values(b.agentpress_tools || {}).filter(toolData => 
              toolData && typeof toolData === 'object' && 'enabled' in toolData && toolData.enabled
            ).length;
          comparison = aToolsCount - bToolsCount;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [agents, searchQuery, sortBy, sortOrder, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.hasDefaultAgent) count++;
    if (filters.hasMcpTools) count++;
    if (filters.hasAgentpressTools) count++;
    count += filters.selectedTools.length;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      hasDefaultAgent: false,
      hasMcpTools: false,
      hasAgentpressTools: false,
      selectedTools: []
    });
  };

  return {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filters,
    setFilters,
    filteredAndSortedAgents,
    allTools,
    activeFiltersCount,
    clearFilters
  };
}