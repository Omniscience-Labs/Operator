import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Settings2, Sparkles, BookOpen } from 'lucide-react';
import { DEFAULT_AGENTPRESS_TOOLS, getToolDisplayName } from '../_data/tools';
import { useCreateAgent } from '@/hooks/react-query/agents/use-agents';
import { MCPConfigurationNew } from './mcp/mcp-configuration-new';
import { AgentKnowledgeConfiguration } from './agent-knowledge-configuration';

interface AgentCreateRequest {
  name: string;
  description: string;
  system_prompt: string;
  configured_mcps: Array<{ name: string; qualifiedName: string; config: any; enabledTools?: string[] }>;
  custom_mcps?: Array<{ name: string; type: 'json' | 'sse'; config: any; enabledTools: string[] }>;
  agentpress_tools: Record<string, { enabled: boolean; description: string }>;
  is_default: boolean;
  knowledge_bases?: Array<{ name: string; index_name: string; description: string }>;
  // Video avatar settings
  video_avatar_id?: string;
  video_voice_id?: string;
  elevenlabs_voice_id?: string;
  avatar_preset?: string;
  video_avatar_settings?: Record<string, any>;
}

interface CreateAgentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated?: () => void;
}

const TOOL_CATEGORIES = ['All', 'AI', 'Code', 'Integration', 'Search', 'File', 'Data'];

const initialFormData: AgentCreateRequest = {
  name: '',
  description: '',
  system_prompt: 'Describe the agent\'s role, behavior, and expertise...',
  configured_mcps: [],
  custom_mcps: [],
  agentpress_tools: Object.fromEntries(
    Object.entries(DEFAULT_AGENTPRESS_TOOLS).map(([key, value]) => [
      key, 
      { enabled: value.enabled, description: value.description }
    ])
  ),
  is_default: false,
  knowledge_bases: [],
  // Video avatar settings
  video_avatar_id: '',
  video_voice_id: '',
  elevenlabs_voice_id: '',
  avatar_preset: '',
  video_avatar_settings: {},
};

export const CreateAgentDialog = ({ isOpen, onOpenChange, onAgentCreated }: CreateAgentDialogProps) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [formData, setFormData] = useState<AgentCreateRequest>(initialFormData);

  const createAgentMutation = useCreateAgent();
  useEffect(() => {
    if (!isOpen) {
      setFormData(initialFormData);
      setSearchQuery('');
      setSelectedCategory('All');
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof AgentCreateRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleToolToggle = (toolName: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      agentpress_tools: {
        ...prev.agentpress_tools,
        [toolName]: {
          ...prev.agentpress_tools?.[toolName],
          enabled
        }
      }
    }));
  };

  const handleMCPConfigurationChange = (mcps: any[]) => {
    // Separate standard and custom MCPs
    const standardMcps = mcps.filter(mcp => !mcp.isCustom);
    const customMcps = mcps.filter(mcp => mcp.isCustom).map(mcp => ({
      name: mcp.name,
      type: mcp.customType as 'json' | 'sse',
      config: mcp.config,
      enabledTools: mcp.enabledTools || []
    }));
    
    handleInputChange('configured_mcps', standardMcps);
    handleInputChange('custom_mcps', customMcps);
  };

  const getSelectedToolsCount = (): number => {
    return Object.values(formData.agentpress_tools).filter(tool => tool.enabled).length;
  };

  const getFilteredTools = (): Array<[string, any]> => {
    let tools = Object.entries(DEFAULT_AGENTPRESS_TOOLS);
    
    if (searchQuery) {
      tools = tools.filter(([toolName, toolInfo]) => 
        getToolDisplayName(toolName).toLowerCase().includes(searchQuery.toLowerCase()) ||
        toolInfo.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return tools;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      return;
    }

    try {
      await createAgentMutation.mutateAsync(formData);
      onOpenChange(false);
      onAgentCreated?.();
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                Create New Agent
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Configure your custom agent with specific tools and instructions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 w-full overflow-hidden min-h-0">
          <div className="flex w-full h-full">
            <div className="p-6 py-4 w-[40%] space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="agent-name" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="agent-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Research Assistant"
                  className="h-10"
                  disabled={createAgentMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-description" className="text-sm font-medium">
                  Description
                </Label>
                <Input
                  id="agent-description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the agent"
                  className="h-10"
                  disabled={createAgentMutation.isPending}
                />
              </div>

              <div className="space-y-2 flex-1">
                <Label htmlFor="system-instructions" className="text-sm font-medium">
                  Instructions
                </Label>
                <Textarea
                  id="system-instructions"
                  value={formData.system_prompt}
                  onChange={(e) => handleInputChange('system_prompt', e.target.value)}
                  placeholder="Describe the agent's role, behavior, and expertise..."
                  className="min-h-[250px] resize-none"
                  disabled={createAgentMutation.isPending}
                  onFocus={(e) => {
                    if (e.target.value === "Describe the agent's role, behavior, and expertise...") {
                      handleInputChange('system_prompt', '');
                    }
                  }}
                />
              </div>
            </div>

            <div className="border-l w-[60%] bg-muted/30 flex flex-col min-h-0">
              <Tabs defaultValue="tools" className="flex flex-col h-full">
                <TabsList className="w-full justify-start rounded-none border-b h-10">
                  <TabsTrigger 
                    value="tools" 
                  >
                    <Settings2 className="h-4 w-4" />
                    Tools
                  </TabsTrigger>
                  <TabsTrigger 
                    value="mcp" 
                  >
                    <Sparkles className="h-4 w-4" />
                    MCP Servers
                  </TabsTrigger>
                  <TabsTrigger 
                    value="knowledge-bases" 
                  >
                    <BookOpen className="h-4 w-4" />
                    Knowledge Bases
                  </TabsTrigger>
                  <TabsTrigger 
                    value="avatar" 
                  >
                    🎭
                    Avatar & Voice
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tools" className="flex-1 flex flex-col m-0 min-h-0">
                  <div className="px-6 py-4 border-b bg-background flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Available Tools</h3>
                      <span className="text-sm text-muted-foreground">
                        {getSelectedToolsCount()} selected
                      </span>
                    </div>

                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10"
                        disabled={createAgentMutation.isPending}
                      />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {TOOL_CATEGORIES.map((category) => (
                        <Button
                          key={category}
                          variant={selectedCategory === category ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedCategory(category)}
                          disabled={createAgentMutation.isPending}
                          className="px-3 py-1.5 h-auto text-xs font-medium rounded-full"
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent p-6 min-h-0">
                    <div className="space-y-3">
                      {getFilteredTools().map(([toolName, toolInfo]) => (
                        <div 
                          key={toolName} 
                          className="flex items-center gap-3 p-3 bg-card rounded-lg border hover:border-border/80 transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-lg ${toolInfo.color} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-lg">{toolInfo.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-sm">
                                {getToolDisplayName(toolName)}
                              </h4>
                              <Switch
                                checked={formData.agentpress_tools?.[toolName]?.enabled || false}
                                onCheckedChange={(checked) => handleToolToggle(toolName, checked)}
                                disabled={createAgentMutation.isPending}
                                className="flex-shrink-0"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {toolInfo.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {getFilteredTools().length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-3">🔍</div>
                        <h3 className="text-sm font-medium mb-1">No tools found</h3>
                        <p className="text-xs text-muted-foreground">Try adjusting your search criteria</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="mcp" className="flex-1 m-0 p-6 overflow-y-auto">
                  <MCPConfigurationNew
                    configuredMCPs={formData.configured_mcps}
                    onConfigurationChange={handleMCPConfigurationChange}
                  />
                </TabsContent>

                <TabsContent value="knowledge-bases" className="flex-1 m-0 p-6 overflow-y-auto">
                  <AgentKnowledgeConfiguration
                    knowledgeBases={formData.knowledge_bases || []}
                    onKnowledgeBasesChange={(bases) => handleInputChange('knowledge_bases', bases)}
                  />
                </TabsContent>

                <TabsContent value="avatar" className="flex-1 m-0 p-6 overflow-y-auto">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Video Avatar Configuration</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Configure your agent's video avatar appearance and voice for video generation
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="avatar-preset" className="text-sm font-medium">
                          Avatar Preset
                        </Label>
                        <select
                          id="avatar-preset"
                          value={formData.avatar_preset || ''}
                          onChange={(e) => handleInputChange('avatar_preset', e.target.value)}
                          className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm"
                          disabled={createAgentMutation.isPending}
                        >
                          <option value="">Select a preset...</option>
                          <option value="professional_male">Professional Male</option>
                          <option value="professional_female">Professional Female</option>
                          <option value="casual_male">Casual Male</option>
                          <option value="casual_female">Casual Female</option>
                          <option value="news_anchor">News Anchor</option>
                        </select>
                        <p className="text-xs text-muted-foreground">
                          Choose a predefined avatar-voice combination for consistent quality
                        </p>
                      </div>

                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        <strong>OR</strong> configure custom settings below (will override preset)
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="video-avatar-id" className="text-sm font-medium">
                          Custom Avatar ID
                        </Label>
                        <Input
                          id="video-avatar-id"
                          value={formData.video_avatar_id || ''}
                          onChange={(e) => handleInputChange('video_avatar_id', e.target.value)}
                          placeholder="e.g., Wayne_20240711"
                          className="h-10"
                          disabled={createAgentMutation.isPending}
                        />
                        <p className="text-xs text-muted-foreground">
                          HeyGen avatar ID for video generation
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="elevenlabs-voice-id" className="text-sm font-medium">
                          ElevenLabs Voice ID
                        </Label>
                        <Input
                          id="elevenlabs-voice-id"
                          value={formData.elevenlabs_voice_id || ''}
                          onChange={(e) => handleInputChange('elevenlabs_voice_id', e.target.value)}
                          placeholder="e.g., 21m00Tcm4TlvDq8ikWAM"
                          className="h-10"
                          disabled={createAgentMutation.isPending}
                        />
                        <p className="text-xs text-muted-foreground">
                          ElevenLabs voice ID for high-quality custom voice synthesis
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="video-voice-id" className="text-sm font-medium">
                          HeyGen Voice ID (Alternative)
                        </Label>
                        <Input
                          id="video-voice-id"
                          value={formData.video_voice_id || ''}
                          onChange={(e) => handleInputChange('video_voice_id', e.target.value)}
                          placeholder="e.g., 2EiwWnXFnvU5JabPnv8n"
                          className="h-10"
                          disabled={createAgentMutation.isPending}
                        />
                        <p className="text-xs text-muted-foreground">
                          HeyGen voice ID (used if no ElevenLabs voice specified)
                        </p>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                        <h4 className="font-medium text-blue-900 mb-2">💡 Configuration Tips</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• <strong>Presets</strong>: Easiest option with tested avatar-voice combinations</li>
                          <li>• <strong>ElevenLabs</strong>: Highest quality custom voices (requires API key)</li>
                          <li>• <strong>HeyGen Voice</strong>: Good quality, built into the platform</li>
                          <li>• <strong>Priority</strong>: Preset → ElevenLabs → HeyGen Voice → Default</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        <div className="px-6 border-t py-4 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline"
              onClick={handleCancel}
              disabled={createAgentMutation.isPending}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createAgentMutation.isPending || !formData.name.trim()}
            >
              {createAgentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Agent
                </>
              ) : (
                'Create Agent'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}