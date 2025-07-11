'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Download, Eye, Clock, Share2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AgentProfileCard } from '@/components/ProfileCard/AgentProfileCard';
import { useAddAgentToLibrary } from '@/hooks/react-query/marketplace/use-marketplace';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface SharedAgent {
  agent: {
    agent_id: string;
    name: string;
    description: string;
    system_prompt: string;
    configured_mcps: any[];
    custom_mcps: any[];
    agentpress_tools: Record<string, any>;
    knowledge_bases: any[];
    tags: string[];
    avatar: string;
    avatar_color: string;
    created_at: string;
    updated_at: string;
    sharing_preferences: {
      managed_agent: boolean;
      include_knowledge_bases: boolean;
      include_custom_mcp_tools: boolean;
    };
  };
  share_info: {
    share_type: 'persistent' | 'ephemeral';
    expires_at: string | null;
    access_count: number;
    creator_name: string;
  };
}

export default function SharedAgentPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [sharedAgent, setSharedAgent] = useState<SharedAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAddedToLibrary, setHasAddedToLibrary] = useState(false);
  
  const addToLibraryMutation = useAddAgentToLibrary();

  useEffect(() => {
    const fetchSharedAgent = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('You must be logged in to view shared agents.');
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/shared-agents/${token}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('This share link is invalid or has expired.');
          } else if (response.status === 401) {
            throw new Error('You must be logged in to view shared agents.');
          } else {
            throw new Error('Failed to load shared agent.');
          }
        }

        const data = await response.json();
        setSharedAgent(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchSharedAgent();
    }
  }, [token]);

  const handleAddToLibrary = async () => {
    if (!sharedAgent) return;

    try {
      await addToLibraryMutation.mutateAsync(sharedAgent.agent.agent_id);
      setHasAddedToLibrary(true);
      toast.success(`"${sharedAgent.agent.name}" added to your library!`);
    } catch (error) {
      console.error('Error adding agent to library:', error);
      toast.error('Failed to add agent to library');
    }
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    const now = new Date();
    const isExpired = date < now;
    
    return {
      formatted: date.toLocaleDateString() + ' ' + date.toLocaleTimeString(),
      isExpired
    };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading shared agent...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!sharedAgent) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 min-h-screen flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>The shared agent could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { agent, share_info } = sharedAgent;
  const expiryInfo = formatExpiry(share_info.expires_at);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 min-h-screen">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Share2 className="h-4 w-4" />
            <span>Shared Agent</span>
            {share_info.creator_name && (
              <>
                <span>•</span>
                <span>by {share_info.creator_name}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground">{agent.name}</h1>
          {agent.description && (
            <p className="text-lg text-muted-foreground">{agent.description}</p>
          )}
        </div>

        {/* Share Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Share Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={share_info.share_type === 'persistent' ? 'default' : 'secondary'}>
                  {share_info.share_type === 'persistent' ? 'Persistent' : 'Ephemeral'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {share_info.share_type === 'persistent' ? 'Never expires' : 'Time-limited'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {share_info.access_count} view{share_info.access_count !== 1 ? 's' : ''}
                </span>
              </div>

              {expiryInfo && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-sm ${expiryInfo.isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {expiryInfo.isExpired ? 'Expired' : 'Expires'}: {expiryInfo.formatted}
                  </span>
                </div>
              )}
            </div>

            {expiryInfo?.isExpired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Link Expired</AlertTitle>
                <AlertDescription>
                  This share link has expired and the agent can no longer be added to your library.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Agent Preview */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Agent Preview</h2>
          <div className="max-w-sm mx-auto">
            <AgentProfileCard
              agent={{
                ...agent,
                is_public: true,
                is_managed: agent.sharing_preferences?.managed_agent || false,
                is_owned: false,
                creator_name: share_info.creator_name,
                marketplace_published_at: agent.created_at,
                download_count: share_info.access_count
              }}
              mode="marketplace"
              onAddToLibrary={handleAddToLibrary}
              isLoading={addToLibraryMutation.isPending}
              enableTilt={false}
            />
          </div>
        </div>

        {/* Agent Details */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Details</CardTitle>
            <CardDescription>
              What's included when you add this agent to your library
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {agent.sharing_preferences?.managed_agent ? (
                    <Badge variant="default">Managed Agent</Badge>
                  ) : (
                    <Badge variant="secondary">Copied Agent</Badge>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {agent.sharing_preferences?.managed_agent 
                      ? 'You\'ll get a live reference to this agent. Updates from the creator will automatically appear in your library.'
                      : 'You\'ll get your own copy of this agent that you can customize and modify.'
                    }
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">What's included:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>System prompt and instructions</span>
                  </div>
                  
                  {agent.sharing_preferences?.include_knowledge_bases !== false && agent.knowledge_bases && agent.knowledge_bases.length > 0 && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{agent.knowledge_bases.length} knowledge base{agent.knowledge_bases.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  
                  {agent.sharing_preferences?.include_custom_mcp_tools !== false && ((agent.configured_mcps && agent.configured_mcps.length > 0) || (agent.custom_mcps && agent.custom_mcps.length > 0)) && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {(agent.configured_mcps?.length || 0) + (agent.custom_mcps?.length || 0)} custom MCP tool{((agent.configured_mcps?.length || 0) + (agent.custom_mcps?.length || 0)) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {Object.values(agent.agentpress_tools || {}).some(tool => tool && typeof tool === 'object' && tool.enabled) && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {Object.values(agent.agentpress_tools || {}).filter(tool => tool && typeof tool === 'object' && tool.enabled).length} AgentPress tool{Object.values(agent.agentpress_tools || {}).filter(tool => tool && typeof tool === 'object' && tool.enabled).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {hasAddedToLibrary ? (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Added to your library!</span>
              </div>
              <div className="space-x-2">
                <Button 
                  onClick={() => router.push('/agents')}
                  variant="default"
                >
                  View in Library
                </Button>
                <Button 
                  onClick={() => router.push(`/dashboard?agent_id=${agent.agent_id}`)}
                  variant="outline"
                >
                  Start Chat
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleAddToLibrary}
              disabled={addToLibraryMutation.isPending || (expiryInfo?.isExpired ?? false)}
              size="lg"
              className="min-w-[200px]"
            >
              {addToLibraryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding to Library...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Add to Library
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 