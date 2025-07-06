'use client';

import React, { useState, useMemo } from 'react';
import { Search, Download, Star, Calendar, User, Tags, TrendingUp, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMarketplaceAgents, useAddAgentToLibrary } from '@/hooks/react-query/marketplace/use-marketplace';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

import { AgentProfileCard } from '@/components/ProfileCard/AgentProfileCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '../agents/_components/pagination';
import { useCurrentAccount } from '@/hooks/use-current-account';

type SortOption = 'newest' | 'popular' | 'most_downloaded' | 'name';

export default function MarketplacePage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [addingAgentId, setAddingAgentId] = useState<string | null>(null);
  const currentAccount = useCurrentAccount();
  
  const queryParams = useMemo(() => ({
    page,
    limit: 20,
    search: searchQuery || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    sort_by: sortBy,
    account_id: currentAccount?.is_team_context ? currentAccount.account_id : undefined
  }), [page, searchQuery, selectedTags, sortBy, currentAccount]);

  const { data: agentsResponse, isLoading, error } = useMarketplaceAgents(queryParams);
  const addToLibraryMutation = useAddAgentToLibrary();

  const agents = agentsResponse?.agents || [];
  const pagination = agentsResponse?.pagination;

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedTags, sortBy]);

  const handleAddToLibrary = async (agentId: string, agentName: string) => {
    try {
      setAddingAgentId(agentId);
      await addToLibraryMutation.mutateAsync(agentId);
      toast.success(`${agentName} has been added to your library!`);
    } catch (error: any) {
      if (error.message?.includes('already in your library')) {
        toast.error('This agent is already in your library');
      } else {
        toast.error('Failed to add agent to library');
      }
    } finally {
      setAddingAgentId(null);
    }
  };

  const handleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };



  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    agents.forEach(agent => {
      agent.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [agents]);

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load marketplace agents. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Agent Marketplace
            </h1>
            <p className="text-md text-muted-foreground max-w-2xl">
              {currentAccount?.is_team_context 
                ? `Discover and add AI agents available to ${currentAccount.name}`
                : 'Discover and add powerful AI agents created by the community to your personal library'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Newest First
                </div>
              </SelectItem>
              <SelectItem value="popular">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Most Popular
                </div>
              </SelectItem>
              <SelectItem value="most_downloaded">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Most Downloaded
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {allTags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Filter by tags:</p>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => handleTagFilter(tag)}
                >
                  <Tags className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            "Loading agents..."
          ) : pagination ? (
            `Showing page ${pagination.page} of ${pagination.pages} (${pagination.total} total agents)`
          ) : (
            `${agents.length} agent${agents.length !== 1 ? 's' : ''} found`
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-neutral-100 dark:bg-sidebar border border-border rounded-2xl overflow-hidden">
                <Skeleton className="h-50" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 rounded" />
                    <Skeleton className="h-4 rounded w-3/4" />
                  </div>
                  <Skeleton className="h-8" />
                </div>
              </div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || selectedTags.length > 0
                ? "No agents found matching your criteria. Try adjusting your search or filters."
                : "No agents are currently available in the marketplace."}
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {agents.map((agent) => (
              <AgentProfileCard
                key={agent.agent_id}
                agent={agent}
                mode="marketplace"
                onAddToLibrary={(agentId) => handleAddToLibrary(agentId, agent.name)}
                isLoading={addingAgentId === agent.agent_id}
                enableTilt={true}
              />
            ))}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}