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
  video_avatar_enabled?: boolean;
  selected_avatar?: string;
  selected_voice?: string;
  selected_position?: string;
  selected_background?: string;
  custom_avatar_id?: string;
  custom_voice_id?: string;
  elevenlabs_voice_id?: string;
  custom_background_hex?: string;
  video_avatar_settings?: Record<string, any>;
}

interface CreateAgentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated?: () => void;
}

const TOOL_CATEGORIES = ['All', 'AI', 'Code', 'Integration', 'Search', 'File', 'Data'];

// Avatar and voice options (matching backend)
const AVATAR_OPTIONS = {
  "wayne_professional": { name: "Wayne (Professional Male)", description: "Professional businessman in suit" },
  "susan_professional": { name: "Susan (Professional Female)", description: "Professional businesswoman" },
  "josh_casual": { name: "Josh (Casual Male)", description: "Friendly casual presenter" },
  "anna_casual": { name: "Anna (Casual Female)", description: "Approachable casual presenter" },
  "tyler_news": { name: "Tyler (News Anchor)", description: "Professional news anchor style" }
};

const VOICE_OPTIONS = {
  "professional_male_1": { name: "Professional Male Voice", description: "Clear, authoritative business voice" },
  "professional_female_1": { name: "Professional Female Voice", description: "Warm, professional female voice" },
  "casual_male_1": { name: "Casual Male Voice", description: "Friendly, conversational male voice" },
  "casual_female_1": { name: "Casual Female Voice", description: "Warm, approachable female voice" },
  "news_anchor_1": { name: "News Anchor Voice", description: "Clear, broadcast-quality voice" }
};

const POSITION_OPTIONS = {
  "center": { name: "Center", description: "Avatar centered in frame" },
  "left": { name: "Left", description: "Avatar positioned on left side" },
  "right": { name: "Right", description: "Avatar positioned on right side" }
};

const BACKGROUND_OPTIONS = {
  "white": { name: "White", hex: "#FFFFFF", description: "Clean white background" },
  "light_gray": { name: "Light Gray", hex: "#F5F5F5", description: "Subtle light gray" },
  "dark_gray": { name: "Dark Gray", hex: "#2D2D2D", description: "Professional dark gray" },
  "blue": { name: "Blue", hex: "#4A90E2", description: "Professional blue" },
  "green": { name: "Green", hex: "#50C878", description: "Fresh green" },
  "custom": { name: "Custom", hex: "", description: "Custom hex color" }
};

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
  video_avatar_enabled: false,
  selected_avatar: '',
  selected_voice: '',
  selected_position: 'center',
  selected_background: 'white',
  custom_avatar_id: '',
  custom_voice_id: '',
  elevenlabs_voice_id: '',
  custom_background_hex: '',
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
                        Enable and customize your agent's video avatar for video generation
                      </p>
                    </div>

                    {/* Video Avatar Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label htmlFor="video-avatar-enabled" className="text-sm font-medium">
                          Enable Video Avatar
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Allow this agent to generate videos with a custom avatar
                        </p>
                      </div>
                      <Switch
                        id="video-avatar-enabled"
                        checked={formData.video_avatar_enabled || false}
                        onCheckedChange={(checked) => handleInputChange('video_avatar_enabled', checked)}
                        disabled={createAgentMutation.isPending}
                      />
                    </div>

                    {/* Avatar Configuration (shown when enabled) */}
                    {formData.video_avatar_enabled && (
                      <div className="space-y-6 border-t pt-6">
                        {/* Avatar Selection */}
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="selected-avatar" className="text-sm font-medium">
                              Choose Avatar
                            </Label>
                            <select
                              id="selected-avatar"
                              value={formData.selected_avatar || ''}
                              onChange={(e) => handleInputChange('selected_avatar', e.target.value)}
                              className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm"
                              disabled={createAgentMutation.isPending}
                            >
                              <option value="">Select an avatar...</option>
                              {Object.entries(AVATAR_OPTIONS).map(([key, avatar]) => (
                                <option key={key} value={key}>
                                  {avatar.name} - {avatar.description}
                                </option>
                              ))}
                              <option value="custom">🎨 Custom Avatar (specify ID below)</option>
                            </select>
                          </div>

                          {/* Custom Avatar ID (shown when custom is selected) */}
                          {formData.selected_avatar === 'custom' && (
                            <div className="space-y-2">
                              <Label htmlFor="custom-avatar-id" className="text-sm font-medium">
                                Custom Avatar ID
                              </Label>
                              <Input
                                id="custom-avatar-id"
                                value={formData.custom_avatar_id || ''}
                                onChange={(e) => handleInputChange('custom_avatar_id', e.target.value)}
                                placeholder="e.g., Wayne_20240711"
                                className="h-10"
                                disabled={createAgentMutation.isPending}
                              />
                              <p className="text-xs text-muted-foreground">
                                Enter your custom HeyGen avatar ID
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Voice Selection */}
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="selected-voice" className="text-sm font-medium">
                              Choose Voice
                            </Label>
                            <select
                              id="selected-voice"
                              value={formData.selected_voice || ''}
                              onChange={(e) => handleInputChange('selected_voice', e.target.value)}
                              className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm"
                              disabled={createAgentMutation.isPending}
                            >
                              <option value="">Select a voice...</option>
                              {Object.entries(VOICE_OPTIONS).map(([key, voice]) => (
                                <option key={key} value={key}>
                                  {voice.name} - {voice.description}
                                </option>
                              ))}
                              <option value="elevenlabs">🎤 ElevenLabs Voice (premium quality)</option>
                              <option value="custom_heygen">🎵 Custom HeyGen Voice</option>
                            </select>
                          </div>

                          {/* ElevenLabs Voice ID */}
                          {formData.selected_voice === 'elevenlabs' && (
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
                                Enter your ElevenLabs voice ID for premium quality
                              </p>
                            </div>
                          )}

                          {/* Custom HeyGen Voice ID */}
                          {formData.selected_voice === 'custom_heygen' && (
                            <div className="space-y-2">
                              <Label htmlFor="custom-voice-id" className="text-sm font-medium">
                                Custom HeyGen Voice ID
                              </Label>
                              <Input
                                id="custom-voice-id"
                                value={formData.custom_voice_id || ''}
                                onChange={(e) => handleInputChange('custom_voice_id', e.target.value)}
                                placeholder="e.g., 2EiwWnXFnvU5JabPnv8n"
                                className="h-10"
                                disabled={createAgentMutation.isPending}
                              />
                              <p className="text-xs text-muted-foreground">
                                Enter your custom HeyGen voice ID
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Position and Background */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="selected-position" className="text-sm font-medium">
                              Avatar Position
                            </Label>
                            <select
                              id="selected-position"
                              value={formData.selected_position || 'center'}
                              onChange={(e) => handleInputChange('selected_position', e.target.value)}
                              className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm"
                              disabled={createAgentMutation.isPending}
                            >
                              {Object.entries(POSITION_OPTIONS).map(([key, position]) => (
                                <option key={key} value={key}>
                                  {position.name} - {position.description}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="selected-background" className="text-sm font-medium">
                              Background Color
                            </Label>
                            <select
                              id="selected-background"
                              value={formData.selected_background || 'white'}
                              onChange={(e) => handleInputChange('selected_background', e.target.value)}
                              className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm"
                              disabled={createAgentMutation.isPending}
                            >
                              {Object.entries(BACKGROUND_OPTIONS).map(([key, bg]) => (
                                <option key={key} value={key}>
                                  {bg.name} {bg.hex && `(${bg.hex})`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Custom Background Hex */}
                        {formData.selected_background === 'custom' && (
                          <div className="space-y-2">
                            <Label htmlFor="custom-background-hex" className="text-sm font-medium">
                              Custom Background Color
                            </Label>
                            <Input
                              id="custom-background-hex"
                              value={formData.custom_background_hex || ''}
                              onChange={(e) => handleInputChange('custom_background_hex', e.target.value)}
                              placeholder="#4A90E2"
                              className="h-10"
                              disabled={createAgentMutation.isPending}
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter a hex color code (e.g., #4A90E2)
                            </p>
                          </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                          <h4 className="font-medium text-blue-900 mb-2">💡 Configuration Tips</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Choose from curated avatars or use your own custom HeyGen avatar</li>
                            <li>• ElevenLabs voices provide the highest quality but require an API key</li>
                            <li>• Position and background can be customized for your brand</li>
                            <li>• All settings can be changed later in the agent editor</li>
                          </ul>
                        </div>
                      </div>
                    )}
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