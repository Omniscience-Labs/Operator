'use client';

import React, { useState } from 'react';
import { Share2, Users, Link, Clock, Copy, Trash2, Eye, AlertTriangle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAccounts } from '@/hooks/use-accounts';
import { toast } from 'sonner';
import { Agent } from '@/hooks/react-query/agents/utils';
import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface ShareAgentDialogProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ShareLink {
  share_id: string;
  token: string;
  share_url: string;
  expires_at: string | null;
  access_count: number;
  sharing_preferences?: {
    managed_agent?: boolean;
    include_knowledge_bases?: boolean;
    include_custom_mcp_tools?: boolean;
  };
}

export function ShareAgentDialog({ 
  agent, 
  isOpen, 
  onClose,
  onSuccess 
}: ShareAgentDialogProps) {
  const [shareType, setShareType] = useState<'teams' | 'links'>('links');
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [includeKnowledgeBases, setIncludeKnowledgeBases] = useState(true);
  const [includeCustomMcpTools, setIncludeCustomMcpTools] = useState(true);
  const [managedAgent, setManagedAgent] = useState(false);
  const [linkType, setLinkType] = useState<'persistent' | 'ephemeral'>('persistent');
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingShareLinks, setLoadingShareLinks] = useState(false);
  const [isUnsharing, setIsUnsharing] = useState(false);
  
  const { data: accounts } = useAccounts();
  
  // Filter teams where user is an admin (owner)
  const adminTeams = accounts?.filter(
    account => !account.personal_account && (account as any).account_role === 'owner'
  ) || [];

  // Check if this agent has managed shares
  const isManagedAgent = agent.sharing_preferences?.managed_agent || 
    shareLinks.some(link => link.sharing_preferences?.managed_agent);

  // Load existing share links when dialog opens
  React.useEffect(() => {
    if (isOpen && shareType === 'links') {
      loadShareLinks();
    }
  }, [isOpen, shareType]);

  const loadShareLinks = async () => {
    setLoadingShareLinks(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('You must be logged in to load share links');
      }

      const response = await fetch(`${API_URL}/agents/${agent.agent_id}/shares`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setShareLinks(data.shares || []);
      } else {
        let errorMessage = 'Failed to load share links';
        try {
          const error = await response.json();
          errorMessage = error.detail || error.message || errorMessage;
        } catch (jsonError) {
          // Response doesn't contain valid JSON, use default message
          errorMessage = `Failed to load share links: ${response.statusText} (${response.status})`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error loading share links:', error);
      toast.error('Failed to load existing share links');
    } finally {
      setLoadingShareLinks(false);
    }
  };

  const handleTeamShare = async () => {
    if (selectedTeams.size === 0) {
      toast.error('Please select at least one team');
      return;
    }

    setIsLoading(true);
    try {
      const requestBody = {
        visibility: 'teams',
        team_ids: Array.from(selectedTeams),
        include_knowledge_bases: includeKnowledgeBases,
        include_custom_mcp_tools: includeCustomMcpTools,
        managed_agent: managedAgent,
      };
      
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('You must be logged in to share agents');
      }

      console.log('Sharing agent to teams:', {
        agentId: agent.agent_id,
        url: `${API_URL}/agents/${agent.agent_id}/publish`,
        requestBody
      });
      
      const response = await fetch(`${API_URL}/agents/${agent.agent_id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        toast.success(`Agent shared with ${selectedTeams.size} team${selectedTeams.size > 1 ? 's' : ''}`);
        onSuccess?.();
        onClose();
      } else {
        console.error('Team sharing failed:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        let errorMessage = 'Failed to share agent';
        try {
          const error = await response.json();
          console.error('Error response body:', error);
          errorMessage = error.detail || error.message || errorMessage;
        } catch (jsonError) {
          // Response doesn't contain valid JSON, use response text instead
          try {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            errorMessage = errorText || `Error sharing agent: ${response.statusText} (${response.status})`;
          } catch (textError) {
            console.error('Could not read error response:', textError);
            errorMessage = `Error sharing agent: ${response.statusText} (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error sharing agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to share agent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateShareLink = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('You must be logged in to create share links');
      }

      const response = await fetch(`${API_URL}/agents/${agent.agent_id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          share_type: linkType,
          expires_in_hours: linkType === 'ephemeral' ? expiresInHours : null,
          include_knowledge_bases: includeKnowledgeBases,
          include_custom_mcp_tools: includeCustomMcpTools,
          managed_agent: managedAgent,
        }),
      });

      if (response.ok) {
        const newLink = await response.json();
        setShareLinks(prev => [newLink, ...prev]);
        toast.success('Share link created successfully');
        
        // Copy to clipboard
        await navigator.clipboard.writeText(newLink.share_url);
        toast.success('Link copied to clipboard');
      } else {
        let errorMessage = 'Failed to create share link';
        try {
          const error = await response.json();
          errorMessage = error.detail || error.message || errorMessage;
        } catch (jsonError) {
          // Response doesn't contain valid JSON, use default message
          errorMessage = `Failed to create share link: ${response.statusText} (${response.status})`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create share link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleRevokeLink = async (shareId: string) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('You must be logged in to revoke share links');
      }

      const response = await fetch(`${API_URL}/agents/${agent.agent_id}/shares/${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setShareLinks(prev => prev.filter(link => link.share_id !== shareId));
        toast.success('Share link revoked');
      } else {
        throw new Error('Failed to revoke share link');
      }
    } catch (error) {
      console.error('Error revoking share link:', error);
      toast.error('Failed to revoke share link');
    }
  };

  const handleUnshareManaged = async () => {
    setIsUnsharing(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('You must be logged in to unshare managed agents');
      }

      const response = await fetch(`${API_URL}/agents/${agent.agent_id}/unshare-managed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          `Managed agent unshared: ${result.share_links_revoked} link${result.share_links_revoked !== 1 ? 's' : ''} revoked, ` +
          `removed from ${result.libraries_removed} librar${result.libraries_removed !== 1 ? 'ies' : 'y'}`
        );
        
        // Clear share links since they've all been revoked
        setShareLinks([]);
        onSuccess?.();
        onClose();
      } else {
        let errorMessage = 'Failed to unshare managed agent';
        try {
          const error = await response.json();
          errorMessage = error.detail || error.message || errorMessage;
        } catch (jsonError) {
          // Response doesn't contain valid JSON, use default message
          errorMessage = `Failed to unshare managed agent: ${response.statusText} (${response.status})`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error unsharing managed agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unshare managed agent');
    } finally {
      setIsUnsharing(false);
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

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never';
    const date = new Date(expiresAt);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Share Agent</DialogTitle>
          <DialogDescription>
            Share "{agent.name}" with teams or create shareable links
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-4 px-1 pb-4">
            {/* Unshare Managed Agent Section */}
            {isManagedAgent && shareLinks.length > 0 && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-200">Managed Agent Controls</h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        This is a managed agent. You can completely unshare it to revoke all links and remove it from users' libraries.
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          disabled={isUnsharing}
                        >
                          {isUnsharing ? 'Unsharing...' : 'Unshare Managed Agent'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Unshare Managed Agent</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to completely unshare "{agent.name}"?
                            <br /><br />
                            <strong>This will:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                              <li>Revoke ALL share links for this agent</li>
                              <li>Remove the agent from ALL users' libraries who got it via share links</li>
                              <li>Stop all live updates to users who had this managed agent</li>
                            </ul>
                            <br />
                            This action cannot be undone. Users will lose access to this agent unless they re-add it from a new share link.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleUnshareManaged}
                            className="bg-destructive hover:bg-destructive/90 text-white"
                          >
                            Unshare Managed Agent
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            )}

            <RadioGroup value={shareType} onValueChange={(value: any) => setShareType(value)}>
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="links" id="links" className="mt-1" />
                <Label htmlFor="links" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <Link className="h-4 w-4" />
                    <span className="font-medium">Share Links</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Create shareable links that can be sent to anyone.
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="teams" id="teams" className="mt-1" />
                <Label htmlFor="teams" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Share with Teams</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share directly with teams where you're an admin.
                    {adminTeams.length === 0 && (
                      <span className="block mt-1">
                        <Badge variant="secondary" className="text-xs">No teams available</Badge>
                      </span>
                    )}
                  </p>
                </Label>
              </div>
            </RadioGroup>

            {/* Team Selection */}
            {shareType === 'teams' && adminTeams.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select teams to share with:</Label>
                <ScrollArea className="h-[150px] rounded-md border p-2">
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

            {/* Share Link Creation */}
            {shareType === 'links' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Link Type:</Label>
                  <RadioGroup value={linkType} onValueChange={(value: any) => setLinkType(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="persistent" id="persistent" />
                      <Label htmlFor="persistent" className="text-sm">Persistent (never expires)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ephemeral" id="ephemeral" />
                      <Label htmlFor="ephemeral" className="text-sm">Ephemeral (expires after time)</Label>
                    </div>
                  </RadioGroup>
                </div>

                {linkType === 'ephemeral' && (
                  <div className="space-y-2">
                    <Label htmlFor="expiry" className="text-sm font-medium">Expires in hours:</Label>
                    <Input
                      id="expiry"
                      type="number"
                      min="1"
                      max="8760"
                      value={expiresInHours}
                      onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 24)}
                    />
                  </div>
                )}

                <Button
                  onClick={handleCreateShareLink}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Creating...' : 'Create Share Link'}
                </Button>

                {/* Existing Share Links */}
                {shareLinks.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Existing Share Links:</Label>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {shareLinks.map((link) => (
                        <div key={link.share_id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Link className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {link.expires_at ? 'Ephemeral' : 'Persistent'}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyLink(link.share_url)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRevokeLink(link.share_id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <Eye className="h-3 w-3" />
                              <span>{link.access_count} views</span>
                            </div>
                            {link.expires_at && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>Expires: {formatExpiry(link.expires_at)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Sharing Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Share Configuration:</Label>
              
              <div className="space-y-3">
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
                      Recipients get a live reference to this agent. When you update the agent, they see the changes automatically.
                    </p>
                  </div>
                </div>

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
                      Include configured knowledge bases and search tools.
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
                      Include custom MCP server configurations.
                      {(!agent.configured_mcps || agent.configured_mcps.length === 0) && (!agent.custom_mcps || agent.custom_mcps.length === 0) && (
                        <span className="text-amber-600 dark:text-amber-400"> No custom MCP tools configured.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {shareType === 'teams' && (
            <Button
              onClick={handleTeamShare}
              disabled={
                isLoading ||
                (adminTeams.length === 0 || selectedTeams.size === 0)
              }
            >
              {isLoading ? 'Sharing...' : `Share with ${selectedTeams.size} team${selectedTeams.size !== 1 ? 's' : ''}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 