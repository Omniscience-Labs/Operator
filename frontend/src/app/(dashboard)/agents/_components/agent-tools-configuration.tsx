import React, { useState } from 'react';
import { Search, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFAULT_AGENTPRESS_TOOLS, getToolDisplayName } from '../_data/tools';

interface AgentToolsConfigurationProps {
  tools: Record<string, { enabled: boolean; description: string }>;
  onToolsChange: (tools: Record<string, { enabled: boolean; description: string }>) => void;
}

export const AgentToolsConfiguration = ({ tools, onToolsChange }: AgentToolsConfigurationProps) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getToolBadge = (toolName: string) => {
    // Add "new" badge to Excel tool, Audio transcription tool, and Data providers tool
    if (toolName === 'sb_excel_tool' || toolName === 'sb_audio_transcription_tool' || toolName === 'data_providers_tool') {
      return <Badge variant="new" className="ml-2 h-4 text-xs">New</Badge>;
    }
    // Add "beta" badge to PDF form filling tool
    if (toolName === 'sb_pdf_form_tool') {
      return <Badge variant="beta" className="ml-2 h-4 text-xs">Beta</Badge>;
    }
    return null;
  };

  const handleToolToggle = (toolName: string, enabled: boolean) => {
    const updatedTools = {
      ...tools,
      [toolName]: {
        ...tools[toolName],
        enabled
      }
    };
    onToolsChange(updatedTools);
  };

  const getSelectedToolsCount = (): number => {
    return Object.values(tools).filter(tool => tool.enabled).length;
  };

  const getFilteredTools = (): Array<[string, any]> => {
    let toolEntries = Object.entries(DEFAULT_AGENTPRESS_TOOLS);
    
    if (searchQuery) {
      toolEntries = toolEntries.filter(([toolName, toolInfo]) => 
        getToolDisplayName(toolName).toLowerCase().includes(searchQuery.toLowerCase()) ||
        toolInfo.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return toolEntries;
  };

  return (
    <Card className='px-0 bg-transparent border-none shadow-none'>
      <CardHeader className='px-0'>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {getSelectedToolsCount()} selected
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {getFilteredTools().map(([toolName, toolInfo]) => (
            <div 
              key={toolName} 
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border hover:border-border/80 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg ${toolInfo.color} flex items-center justify-center flex-shrink-0`}>
                <span className="text-lg">{toolInfo.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <h4 className="font-medium text-sm">
                      {getToolDisplayName(toolName)}
                    </h4>
                    {getToolBadge(toolName)}
                  </div>
                  <Switch
                    checked={tools[toolName]?.enabled || false}
                    onCheckedChange={(checked) => handleToolToggle(toolName, checked)}
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
      </CardContent>
    </Card>
  );
}; 