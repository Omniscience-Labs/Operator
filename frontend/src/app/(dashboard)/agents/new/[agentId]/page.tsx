'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Settings2, Sparkles, Check, Clock, Eye, Menu, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { useAgent, useUpdateAgent } from '@/hooks/react-query/agents/use-agents';
import { AgentMCPConfiguration } from '../../_components/agent-mcp-configuration';
import { toast } from 'sonner';
import { AgentToolsConfiguration } from '../../_components/agent-tools-configuration';
import { AgentKnowledgeConfiguration } from '../../_components/agent-knowledge-configuration';
import { AgentPreview } from '../../_components/agent-preview';
import { getAgentAvatar } from '../../_utils/get-agent-style';
import { EditableText } from '@/components/ui/editable';
import { StylePicker } from '../../_components/style-picker';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AgentBuilderChat } from '../../_components/agent-builder-chat';
import { useFeatureFlags } from '@/lib/feature-flags';
import { LiquidButton } from '@/components/animate-ui/buttons/liquid';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function AgentConfigurationPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  const { data: agent, isLoading, error } = useAgent(agentId);
  const updateAgentMutation = useUpdateAgent();
  const { state, setOpen, setOpenMobile } = useSidebar();
  const { flags } = useFeatureFlags(['custom_agents']);
  const agentBuilderEnabled = flags.custom_agents;

  // Ref to track if initial layout has been applied (for sidebar closing)
  const initialLayoutAppliedRef = useRef(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: '',
    agentpress_tools: {},
    configured_mcps: [],
    custom_mcps: [],
    is_default: false,
    avatar: '',
    avatar_color: '',
    knowledge_bases: [],
  });

  const originalDataRef = useRef<typeof formData | null>(null);
  const currentFormDataRef = useRef(formData);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showOmniGenie, setShowOmniGenie] = useState(false);
  const accordionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialLayoutAppliedRef.current) {
      setOpen(false);
      initialLayoutAppliedRef.current = true;
    }
  }, [setOpen]);

  useEffect(() => {
    if (agent) {
      const agentData = agent as any;
      const initialData = {
        name: agentData.name || '',
        description: agentData.description || '',
        system_prompt: agentData.system_prompt || '',
        agentpress_tools: agentData.agentpress_tools || {},
        configured_mcps: agentData.configured_mcps || [],
        custom_mcps: agentData.custom_mcps || [],
        is_default: agentData.is_default || false,
        avatar: agentData.avatar || '',
        avatar_color: agentData.avatar_color || '',
        knowledge_bases: agentData.knowledge_bases || [],
      };
      setFormData(initialData);
      originalDataRef.current = { ...initialData };
    }
  }, [agent]);

  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Access denied') || errorMessage.includes('403')) {
        toast.error('You don\'t have permission to edit this agent');
        router.push('/agents');
        return;
      }
    }
  }, [error, router]);

  // Check if this is a managed agent
  useEffect(() => {
    if (agent?.is_managed) {
      toast.error('This is a managed agent. Contact the creator of the agent for modifications.');
      router.push('/agents');
      return;
    }
  }, [agent, router]);

  useEffect(() => {
    currentFormDataRef.current = formData;
  }, [formData]);

  const hasDataChanged = useCallback((newData: typeof formData, originalData: typeof formData | null): boolean => {
    if (!originalData) return true;
    if (newData.name !== originalData.name ||
        newData.description !== originalData.description ||
        newData.system_prompt !== originalData.system_prompt ||
        newData.is_default !== originalData.is_default ||
        newData.avatar !== originalData.avatar ||
        newData.avatar_color !== originalData.avatar_color) {
      return true;
    }
    if (JSON.stringify(newData.agentpress_tools) !== JSON.stringify(originalData.agentpress_tools) ||
        JSON.stringify(newData.configured_mcps) !== JSON.stringify(originalData.configured_mcps) ||
        JSON.stringify(newData.custom_mcps) !== JSON.stringify(originalData.custom_mcps) ||
        JSON.stringify(newData.knowledge_bases) !== JSON.stringify(originalData.knowledge_bases)) {
      return true;
    }
    return false;
  }, []);

  const saveAgent = useCallback(async (data: typeof formData) => {
    try {
      setSaveStatus('saving');
      await updateAgentMutation.mutateAsync({
        agentId,
        ...data
      });
      originalDataRef.current = { ...data };
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error updating agent:', error);
      setSaveStatus('error');
      toast.error('Failed to update agent');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [agentId, updateAgentMutation]);

  const debouncedSave = useCallback((data: typeof formData) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (!hasDataChanged(data, originalDataRef.current)) {
      return;
    }
    const timer = setTimeout(() => {
      if (hasDataChanged(data, originalDataRef.current)) {
        saveAgent(data);
      }
    }, 500);
    
    debounceTimerRef.current = timer;
  }, [saveAgent, hasDataChanged]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    const newFormData = {
      ...currentFormDataRef.current,
      [field]: value
    };
    
    setFormData(newFormData);
    debouncedSave(newFormData);
  }, [debouncedSave]);

  const handleBatchMCPChange = useCallback((updates: { configured_mcps: any[]; custom_mcps: any[] }) => {
    const newFormData = {
      ...currentFormDataRef.current,
      configured_mcps: updates.configured_mcps,
      custom_mcps: updates.custom_mcps
    };
    
    setFormData(newFormData);
    debouncedSave(newFormData);
  }, [debouncedSave]);

  const scrollToAccordion = useCallback(() => {
    if (accordionRef.current) {
      accordionRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end' 
      });
    }
  }, []);

  const handleStyleChange = useCallback((emoji: string, color: string) => {
    const newFormData = {
      ...currentFormDataRef.current,
      avatar: emoji,
      avatar_color: color,
    };
    setFormData(newFormData);
    debouncedSave(newFormData);
  }, [debouncedSave]);

  const currentStyle = useMemo(() => {
    if (formData.avatar && formData.avatar_color) {
      return {
        avatar: formData.avatar,
        color: formData.avatar_color,
      };
    }
    return getAgentAvatar(agentId);
  }, [formData.avatar, formData.avatar_color, agentId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getSaveStatusBadge = () => {
    const showSaved = saveStatus === 'idle' && !hasDataChanged(formData, originalDataRef.current);
    switch (saveStatus) {
      case 'saving':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-600/30 hover:bg-amber-700/40">
            <Clock className="h-3 w-3 animate-pulse" />
            Saving...
          </Badge>
        );
      case 'saved':
        return (
          <Badge variant="default" className="flex items-center gap-1 text-green-700 dark:text-green-300 bg-green-600/30 hover:bg-green-700/40">
            <Check className="h-3 w-3" />
            Saved
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 text-red-700 dark:text-red-300 bg-red-600/30 hover:bg-red-700/40">
            Error saving
          </Badge>
        );

      default:
        return showSaved ? (
          <Badge variant="default" className="flex items-center gap-1 text-green-700 dark:text-green-300 bg-green-600/30 hover:bg-green-700/40">
            <Check className="h-3 w-3" />
            Saved
          </Badge>
        ) : (
          <Badge variant="destructive" className="flex items-center gap-1 text-red-700 dark:text-red-300 bg-red-600/30 hover:bg-red-700/40">
            Error saving
          </Badge>
        );
    }
  };

  const ConfigurationContent = useMemo(() => {
    return (
      <div className="h-full flex flex-col">
        <div className="md:hidden flex justify-between items-center mb-4 p-4 pb-0">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setOpenMobile(true)}
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Open menu</TooltipContent>
            </Tooltip>
            <div className="md:hidden flex justify-center">
              {getSaveStatusBadge()}
            </div>
          </div>
          <Drawer open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-[90vh] bg-muted">
              <DrawerHeader>
                <DrawerTitle>Agent Preview</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <AgentPreview agent={{ ...agent, ...formData }} />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className='w-full flex items-center justify-center flex-shrink-0 px-4 md:px-12 md:mt-10'>
            <div className='w-auto flex items-center gap-2'>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                {agentBuilderEnabled ? 'Agent Editor' : 'Agent Settings'}
              </h1>
            </div>
          </div>
          
          <div className="mt-0 flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-12 pb-4 md:pb-12 scrollbar-hide">
            <div className="max-w-full">
              <div className="hidden md:flex justify-end mb-4 mt-4">
                {getSaveStatusBadge()}
              </div>
              <div className='flex items-start md:items-center flex-col md:flex-row mt-6'>
                <StylePicker 
                  agentId={agentId} 
                  currentEmoji={currentStyle.avatar}
                  currentColor={currentStyle.color}
                  onStyleChange={handleStyleChange}
                >
                  <div 
                    className="flex-shrink-0 h-12 w-12 md:h-16 md:w-16 flex items-center justify-center rounded-2xl text-xl md:text-2xl cursor-pointer hover:opacity-80 transition-opacity mb-3 md:mb-0"
                    style={{ backgroundColor: currentStyle.color }}
                  >
                    {currentStyle.avatar}
                  </div>
                </StylePicker>
                <div className='flex flex-col md:ml-3 w-full min-w-0'>
                  <EditableText
                    value={formData.name}
                    onSave={(value) => handleFieldChange('name', value)}
                    className="text-lg md:text-xl font-semibold bg-transparent"
                    placeholder="Click to add agent name..."
                  />
                  <EditableText
                    value={formData.description}
                    onSave={(value) => handleFieldChange('description', value)}
                    className="text-muted-foreground text-sm md:text-base"
                    placeholder="Click to add description..."
                  />
                </div>
              </div>

              <div className='flex flex-col mt-6 md:mt-8'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='text-sm font-semibold text-muted-foreground'>Instructions</div>
                  {agentBuilderEnabled && (
                    <LiquidButton
                      size="sm"
                      variant="outline"
                      onClick={() => setShowOmniGenie(!showOmniGenie)}
                      className="h-7 px-2.5 gap-1.5 group"
                    >
                      {showOmniGenie ? (
                        <>
                          <Eye className="h-3.5 w-3.5 group-hover:text-primary-foreground transition-colors" />
                          <span className="text-xs group-hover:text-primary-foreground transition-colors">Preview</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 group-hover:text-primary-foreground transition-colors" />
                          <span className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:text-primary-foreground group-hover:bg-none transition-all">
                            Omni Genie
                          </span>
                        </>
                      )}
                    </LiquidButton>
                  )}
                </div>
                <EditableText
                  value={formData.system_prompt}
                  onSave={(value) => handleFieldChange('system_prompt', value)}
                  className='bg-transparent hover:bg-transparent border-none focus-visible:ring-0 shadow-none text-sm md:text-base'
                  placeholder='Click to set instructions...'
                  multiline={true}
                  minHeight="150px"
                  renderMarkdown={true}
                />
              </div>

              <div ref={accordionRef} className="mt-6 border-t">
                <Accordion 
                  type="multiple" 
                  defaultValue={[]} 
                  className="space-y-2"
                  onValueChange={scrollToAccordion}
                >
                  <AccordionItem value="tools" className="border-b">
                    <AccordionTrigger className="hover:no-underline text-sm md:text-base">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Tools
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 overflow-x-hidden">
                      <AgentToolsConfiguration
                        tools={formData.agentpress_tools}
                        onToolsChange={(tools) => handleFieldChange('agentpress_tools', tools)}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="mcp" className="border-b">
                    <AccordionTrigger className="hover:no-underline text-sm md:text-base">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Integrations (via MCP)
                        <Badge variant='new'>New</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 overflow-x-hidden">
                      <AgentMCPConfiguration
                        mcps={formData.configured_mcps}
                        customMcps={formData.custom_mcps}
                        onMCPsChange={(mcps) => handleBatchMCPChange({ configured_mcps: mcps, custom_mcps: formData.custom_mcps })}
                        onCustomMCPsChange={(customMcps) => handleBatchMCPChange({ configured_mcps: formData.configured_mcps, custom_mcps: customMcps })}
                        onBatchMCPChange={handleBatchMCPChange}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="knowledge" className="border-b">
                    <AccordionTrigger className="hover:no-underline text-sm md:text-base">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Knowledge Bases
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 overflow-x-hidden">
                      <AgentKnowledgeConfiguration
                        knowledgeBases={formData.knowledge_bases || []}
                        onKnowledgeBasesChange={(knowledgeBases) => handleFieldChange('knowledge_bases', knowledgeBases)}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    agentId,
    agent,
    formData,
    currentStyle,
    isPreviewOpen,
    handleFieldChange,
    handleStyleChange,
    setOpenMobile,
    setIsPreviewOpen,
    scrollToAccordion,
    getSaveStatusBadge,
    handleBatchMCPChange
  ]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading agent...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAccessDenied = errorMessage.includes('Access denied') || errorMessage.includes('403');
    
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="text-center space-y-4">
          {isAccessDenied ? (
            <Alert variant="destructive">
              <AlertDescription>
                You don't have permission to edit this agent. You can only edit agents that you created.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">Agent not found</h2>
              <p className="text-muted-foreground mb-4">The agent you're looking for doesn't exist.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen flex flex-col">
        <div className="flex-1 flex overflow-hidden">
          <div className="hidden md:flex w-full h-full">
          <div className="w-1/2 border-r bg-background h-full flex flex-col">
            {ConfigurationContent}
          </div>
          <div className="w-1/2 h-full flex flex-col relative">
            {agentBuilderEnabled && (
              <div className="absolute top-8 right-8 z-10 bg-background/95 backdrop-blur-sm rounded-lg border p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="view-toggle"
                    className={cn(
                      "text-sm font-medium transition-colors cursor-pointer",
                      showOmniGenie ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    Preview
                  </Label>
                  <Switch
                    id="view-toggle"
                    checked={showOmniGenie}
                    onCheckedChange={setShowOmniGenie}
                    className="h-5 w-9"
                  />
                  <Label
                    htmlFor="view-toggle"
                    className={cn(
                      "text-sm font-medium transition-colors cursor-pointer flex items-center gap-1",
                      showOmniGenie ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">
                      Omni Genie
                    </span>
                  </Label>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto h-full">
              {showOmniGenie && agentBuilderEnabled ? (
                <AgentBuilderChat
                  agentId={agentId}
                  formData={formData}
                  handleFieldChange={handleFieldChange}
                  handleStyleChange={handleStyleChange}
                  currentStyle={currentStyle}
                />
              ) : (
                <AgentPreview agent={{ ...agent, ...formData }} />
              )}
            </div>
          </div>
        </div>
        <div className="md:hidden w-full h-full flex flex-col">
          {showOmniGenie && agentBuilderEnabled ? (
            <div className="h-full">
              <div className="p-4 border-b bg-background flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Omni Genie
                  </span>
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOmniGenie(false)}
                >
                  Back to Settings
                </Button>
              </div>
              <div className="flex-1">
                <AgentBuilderChat
                  agentId={agentId}
                  formData={formData}
                  handleFieldChange={handleFieldChange}
                  handleStyleChange={handleStyleChange}
                  currentStyle={currentStyle}
                />
              </div>
            </div>
          ) : (
            ConfigurationContent
          )}
        </div>
      </div>
    </div>
  </>
  );
}