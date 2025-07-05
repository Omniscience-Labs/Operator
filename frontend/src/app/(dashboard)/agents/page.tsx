'use client';

import React, { useState, useMemo } from 'react';
import { Plus, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UpdateAgentDialog } from './_components/update-agent-dialog';
import { useAgents, useUpdateAgent, useDeleteAgent, useOptimisticAgentUpdate, useCreateAgent } from '@/hooks/react-query/agents/use-agents';
import { SearchAndFilters } from './_components/search-and-filters';
import { ResultsInfo } from './_components/results-info';
import { EmptyState } from './_components/empty-state';
import { AgentsGrid } from './_components/agents-grid';
import { AgentsList } from './_components/agents-list';
import { LoadingState } from './_components/loading-state';
import { Pagination } from './_components/pagination';
import { useRouter } from 'next/navigation';
import { DEFAULT_AGENTPRESS_TOOLS } from './_data/tools';
import { AgentsParams } from '@/hooks/react-query/agents/utils';
import { useFeatureFlags } from '@/lib/feature-flags';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'created_at' | 'updated_at' | 'tools_count';
type SortOrder = 'asc' | 'desc';

interface FilterOptions {
  hasDefaultAgent: boolean;
  hasMcpTools: boolean;
  hasAgentpressTools: boolean;
  selectedTools: string[];
}

export default function AgentsPage() {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  
  // Server-side parameters
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<FilterOptions>({
    hasDefaultAgent: false,
    hasMcpTools: false,
    hasAgentpressTools: false,
    selectedTools: []
  });

  // Build query parameters
  const queryParams: AgentsParams = useMemo(() => {
    const params: AgentsParams = {
      page,
      limit: 20,
      search: searchQuery || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    };

    if (filters.hasDefaultAgent) {
      params.has_default = true;
    }
    if (filters.hasMcpTools) {
      params.has_mcp_tools = true;
    }
    if (filters.hasAgentpressTools) {
      params.has_agentpress_tools = true;
    }
    if (filters.selectedTools.length > 0) {
      params.tools = filters.selectedTools.join(',');
    }

    return params;
  }, [page, searchQuery, sortBy, sortOrder, filters]);

  const { 
    data: agentsResponse, 
    isLoading, 
    error,
    refetch: loadAgents 
  } = useAgents(queryParams);
  
  const updateAgentMutation = useUpdateAgent();
  const deleteAgentMutation = useDeleteAgent();
  const createAgentMutation = useCreateAgent();
  const { optimisticallyUpdateAgent, revertOptimisticUpdate } = useOptimisticAgentUpdate();

  const agents = agentsResponse?.agents || [];
  const pagination = agentsResponse?.pagination;

  // Get all tools for filter options (we'll need to fetch this separately or compute from current page)
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
    setPage(1);
  };

  // Reset page when search or filters change
  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy, sortOrder, filters]);

  const handleDeleteAgent = async (agentId: string) => {
    try {
      await deleteAgentMutation.mutateAsync(agentId);
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleToggleDefault = async (agentId: string, currentDefault: boolean) => {
    optimisticallyUpdateAgent(agentId, { is_default: !currentDefault });
    try {
      await updateAgentMutation.mutateAsync({
        agentId,
        is_default: !currentDefault
      });
    } catch (error) {
      revertOptimisticUpdate(agentId);
      console.error('Error updating agent:', error);
    }
  };

  const handleEditAgent = (agentId: string) => {
    const agent = agents.find(a => a.agent_id === agentId);
    if (agent?.sharing_preferences?.disable_customization) {
      toast.error('Customization is disabled by the creator. Talk to the creator of the agent for modifications.');
      return;
    }
    setEditingAgentId(agentId);
    setEditDialogOpen(true);
  };

  const handleCreateNewAgent = async () => {
    try {
      const defaultAgentData = {
        name: 'New Agent',
        description: 'A newly created agent',
        system_prompt: 'You are a helpful assistant. Provide clear, accurate, and helpful responses to user queries.',
        configured_mcps: [],
        agentpress_tools: Object.fromEntries(
          Object.entries(DEFAULT_AGENTPRESS_TOOLS).map(([key, value]) => [
            key, 
            { enabled: value.enabled, description: value.description }
          ])
        ),
        is_default: false,
      };

      const newAgent = await createAgentMutation.mutateAsync(defaultAgentData);
      router.push(`/agents/new/${newAgent.agent_id}`);
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'An error occurred loading agents'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Your Agents
            </h1>
            <p className="text-md text-muted-foreground max-w-2xl">
              Create and manage your AI agents with custom instructions and tools
            </p>
          </div>
          <Button 
            onClick={handleCreateNewAgent}
            disabled={createAgentMutation.isPending}
            className="self-start sm:self-center"
          >
            {createAgentMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                New Agent
              </>
            )}
          </Button>
        </div>

        <SearchAndFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          filters={filters}
          setFilters={setFilters}
          activeFiltersCount={activeFiltersCount}
          clearFilters={clearFilters}
          viewMode={viewMode}
          setViewMode={setViewMode}
          allTools={allTools}
        />

        <ResultsInfo
          isLoading={isLoading}
          totalAgents={pagination?.total || 0}
          filteredCount={agents.length}
          searchQuery={searchQuery}
          activeFiltersCount={activeFiltersCount}
          clearFilters={clearFilters}
          currentPage={pagination?.page || 1}
          totalPages={pagination?.pages || 1}
        />

        {isLoading ? (
          <LoadingState viewMode={viewMode} />
        ) : agents.length === 0 ? (
          <EmptyState
            hasAgents={(pagination?.total || 0) > 0}
            onCreateAgent={handleCreateNewAgent}
            onClearFilters={clearFilters}
          />
        ) : (
          <AgentsGrid
            agents={agents}
            onEditAgent={handleEditAgent}
            onDeleteAgent={handleDeleteAgent}
            onToggleDefault={handleToggleDefault}
            deleteAgentMutation={deleteAgentMutation}
          />
        )}

        {pagination && pagination.pages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        )}

        <UpdateAgentDialog
          agentId={editingAgentId}
          isOpen={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingAgentId(null);
          }}
          onAgentUpdated={loadAgents}
        />
      </div>
    </div>
  );
}