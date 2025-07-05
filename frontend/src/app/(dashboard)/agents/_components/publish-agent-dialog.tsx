'use client';

import React, { useState } from 'react';
import { Globe, Users, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAccounts } from '@/hooks/use-accounts';
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
  const [publishType, setPublishType] = useState<'marketplace' | 'teams'>('marketplace');
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [includeKnowledgeBases, setIncludeKnowledgeBases] = useState(true);
  const [includeCustomMcpTools, setIncludeCustomMcpTools] = useState(true);
  const { data: accounts } = useAccounts();
  const publishAgentMutation = usePublishAgent();
  
  // Filter teams where user is an admin (owner)
  const adminTeams = accounts?.filter(
    account => !account.personal_account && (account as any).account_role === 'owner'
  ) || [];

  const handlePublish = async () => {
    try {
      if (publishType === 'teams' && selectedTeams.size === 0) {
        toast.error('Please select at least one team');
        return;
      }
      
      await publishAgentMutation.mutateAsync({
        agentId: agent.agent_id,
        tags: [],
        visibility: publishType === 'marketplace' ? 'public' : 'teams',
        teamIds: publishType === 'teams' ? Array.from(selectedTeams) : [],
        includeKnowledgeBases,
        includeCustomMcpTools
      });
      
      const message = publishType === 'marketplace' 
        ? 'Agent published to marketplace successfully!'
        : `Agent shared with ${selectedTeams.size} team${selectedTeams.size > 1 ? 's' : ''}`;
      
      toast.success(message);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish agent');
    }
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Agent</DialogTitle>
          <DialogDescription>
            Choose how you want to share "{agent.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={publishType} onValueChange={(value: any) => setPublishType(value)}>
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="marketplace" id="marketplace" className="mt-1" />
              <Label htmlFor="marketplace" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4" />
                  <span className="font-medium">Public Marketplace</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share with everyone. Your agent will be discoverable by all users.
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="teams" id="teams" className="mt-1" />
              <Label htmlFor="teams" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Specific Teams</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share only with teams where you're an admin.
                  {adminTeams.length === 0 && (
                    <span className="block mt-1">
                      <Badge variant="secondary" className="text-xs">No teams available</Badge>
                    </span>
                  )}
                </p>
              </Label>
            </div>
          </RadioGroup>

          {publishType === 'teams' && adminTeams.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select teams to share with:</Label>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="space-y-2">
                  {adminTeams.map(team => (
                    <div
                      key={team.account_id}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50"
                    >
                      <Checkbox
                        id={team.account_id}
                        checked={selectedTeams.has(team.account_id)}
                        onCheckedChange={() => toggleTeam(team.account_id)}
                      />
                      <Label
                        htmlFor={team.account_id}
                        className="flex-1 cursor-pointer"
                      >
                        {team.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {selectedTeams.size > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedTeams.size} team{selectedTeams.size > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {publishType === 'teams' && adminTeams.length === 0 && (
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                You need to be an admin of at least one team to share agents with teams.
              </p>
            </div>
          )}

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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={
              publishAgentMutation.isPending ||
              (publishType === 'teams' && (adminTeams.length === 0 || selectedTeams.size === 0))
            }
          >
            {publishAgentMutation.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                Publishing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Publish
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 