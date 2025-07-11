'use client';

import React, { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePublishAgent } from '@/hooks/react-query/marketplace/use-marketplace';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Agent } from '@/hooks/react-query/agents/utils';

interface PublishAgentDialogProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PublishAgentDialog({ 
  agent, 
  isOpen, 
  onClose,
  onSuccess 
}: PublishAgentDialogProps) {
  const [includeKnowledgeBases, setIncludeKnowledgeBases] = useState(true);
  const [includeCustomMcpTools, setIncludeCustomMcpTools] = useState(true);
  const [managedAgent, setManagedAgent] = useState(false);
  const publishAgentMutation = usePublishAgent();
  
  // Check if agent is currently shared with teams
  const isSharedWithTeams = agent.visibility === 'teams';

  const handlePublish = async () => {
    try {
      await publishAgentMutation.mutateAsync({
        agentId: agent.agent_id,
        tags: [],
        visibility: 'public',
        teamIds: [],
        includeKnowledgeBases,
        includeCustomMcpTools,
        managedAgent
      });
      
      toast.success('Agent published to marketplace successfully!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish agent');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Publish to Marketplace</DialogTitle>
          <DialogDescription>
            Share "{agent.name}" publicly on the marketplace for everyone to discover
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-4 px-1 pb-4">
            {/* Team sharing warning */}
            {isSharedWithTeams && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">Team Sharing Conflict</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      This agent is currently shared with specific teams only. Publishing to the marketplace will make it 
                      <strong> publicly visible to everyone</strong>, overriding the team-only visibility.
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                      <strong>Consider:</strong> Unshare from teams first if you want marketplace-only distribution, 
                      or keep it team-only to maintain exclusivity.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/20">
              <Globe className="h-5 w-5 mt-1 text-green-600" />
              <div className="flex-1">
                <div className="font-medium">Public Marketplace</div>
                <p className="text-sm text-muted-foreground">
                  Your agent will be discoverable by all users and can be added to their library.
                  {isSharedWithTeams && (
                    <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ This will override current team-only sharing.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Agent Type */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium">Agent Type:</Label>
              
              <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/20">
                <Checkbox
                  id="managed-agent"
                  checked={managedAgent}
                  onCheckedChange={(checked) => setManagedAgent(checked === true)}
                />
                <div className="flex-1">
                  <Label htmlFor="managed-agent" className="cursor-pointer font-medium">
                    Managed Agent
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Users will get a live reference to this agent. When you update the agent, all users will see the changes automatically. Users cannot customize managed agents.
                  </p>
                </div>
              </div>

              {managedAgent && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> Users will get a live reference to this agent. Any updates you make will automatically appear for all users. Users cannot customize managed agents.
                  </p>
                </div>
              )}
            </div>

            {/* Sharing Options */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium">What to include when sharing:</Label>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/20">
                  <Checkbox
                    id="include-knowledge-bases"
                    checked={includeKnowledgeBases}
                    onCheckedChange={(checked) => setIncludeKnowledgeBases(checked === true)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="include-knowledge-bases" className="cursor-pointer font-medium">
                      Knowledge Bases {agent.knowledge_bases && agent.knowledge_bases.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {agent.knowledge_bases.length} configured
                        </Badge>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Include configured knowledge bases and search tools. Recipients will be able to use the same knowledge sources.
                      {!agent.knowledge_bases || agent.knowledge_bases.length === 0 && (
                        <span className="text-amber-600 dark:text-amber-400"> No knowledge bases configured.</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/20">
                  <Checkbox
                    id="include-custom-mcp-tools"
                    checked={includeCustomMcpTools}
                    onCheckedChange={(checked) => setIncludeCustomMcpTools(checked === true)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="include-custom-mcp-tools" className="cursor-pointer font-medium">
                      Custom MCP Tools {(agent.configured_mcps && agent.configured_mcps.length > 0) || (agent.custom_mcps && agent.custom_mcps.length > 0) ? (
                        <Badge variant="secondary" className="ml-2">
                          {(agent.configured_mcps?.length || 0) + (agent.custom_mcps?.length || 0)} configured
                        </Badge>
                      ) : null}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Include custom MCP server configurations. Recipients will need access to the same MCP servers.
                      {(!agent.configured_mcps || agent.configured_mcps.length === 0) && (!agent.custom_mcps || agent.custom_mcps.length === 0) && (
                        <span className="text-amber-600 dark:text-amber-400"> No custom MCP tools configured.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {(!includeKnowledgeBases || !includeCustomMcpTools) && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>Note:</strong> Excluded components will not be available to users who add this agent to their library.
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={publishAgentMutation.isPending}
            variant={isSharedWithTeams ? "destructive" : "default"}
          >
            {publishAgentMutation.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                Publishing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {isSharedWithTeams ? "Publish & Override Team Sharing" : "Publish to Marketplace"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 