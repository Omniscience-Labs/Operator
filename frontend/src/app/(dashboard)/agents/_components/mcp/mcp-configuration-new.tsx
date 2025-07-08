import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Zap, Code2, Server } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { MCPConfigurationProps, MCPConfiguration as MCPConfigurationType } from './types';
import { ConfiguredMcpList } from './configured-mcp-list';
import { BrowseDialog } from './browse-dialog';
import { ConfigDialog } from './config-dialog';
import { CustomMCPDialog } from './custom-mcp-dialog';

export const MCPConfigurationNew: React.FC<MCPConfigurationProps> = ({
  configuredMCPs,
  onConfigurationChange,
}) => {
  const [showBrowseDialog, setShowBrowseDialog] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [configuringServer, setConfiguringServer] = useState<any>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCustomMCP, setEditingCustomMCP] = useState<MCPConfigurationType | null>(null);

  const handleAddMCP = (server: any) => {
    setConfiguringServer(server);
    setEditingIndex(null);
    setShowBrowseDialog(false);
  };

  const handleEditMCP = (index: number) => {
    const mcp = configuredMCPs[index];
    // Check if it's a custom MCP
    if (mcp.isCustom) {
      console.log('Setting up edit for custom MCP:', mcp);
      setEditingCustomMCP(mcp);
      setEditingIndex(index);
      // Use setTimeout to ensure state updates have completed before opening dialog
      setTimeout(() => {
        console.log('Opening custom dialog with edited MCP:', mcp);
        setShowCustomDialog(true);
      }, 0);
      return;
    }
    setConfiguringServer({
      qualifiedName: mcp.qualifiedName,
      displayName: mcp.name,
      name: mcp.name,
    });
    setEditingIndex(index);
  };

  const handleRemoveMCP = (index: number) => {
    const newMCPs = [...configuredMCPs];
    newMCPs.splice(index, 1);
    onConfigurationChange(newMCPs);
  };

  const handleSaveConfiguration = (config: MCPConfigurationType) => {
    const regularMCPConfig = {
      ...config,
      isCustom: false,
      customType: undefined
    };
    
    if (editingIndex !== null) {
      const newMCPs = [...configuredMCPs];
      newMCPs[editingIndex] = regularMCPConfig;
      onConfigurationChange(newMCPs);
    } else {
      onConfigurationChange([...configuredMCPs, regularMCPConfig]);
    }
    setConfiguringServer(null);
    setEditingIndex(null);
  };

  const handleSaveCustomMCP = (customConfig: any) => {
    console.log('Saving custom MCP config:', customConfig);
    const mcpConfig: MCPConfigurationType = {
      name: customConfig.name,
      qualifiedName: editingCustomMCP?.qualifiedName || `custom_${customConfig.type}_${Date.now()}`,
      config: customConfig.config,
      enabledTools: customConfig.enabledTools,
      isCustom: true,
      customType: customConfig.type as 'http' | 'sse'
    };
    console.log('Transformed MCP config:', mcpConfig);
    
    let newMCPs: MCPConfigurationType[];
    if (editingIndex !== null && editingCustomMCP) {
      // Edit mode - replace existing MCP
      newMCPs = [...configuredMCPs];
      newMCPs[editingIndex] = mcpConfig;
      console.log('Updated existing MCP at index:', editingIndex);
    } else {
      // Add mode - append new MCP
      newMCPs = [...configuredMCPs, mcpConfig];
      console.log('Added new MCP');
    }
    
    onConfigurationChange(newMCPs);
    console.log('Updated MCPs list:', newMCPs);
    
    // Reset editing state
    setEditingCustomMCP(null);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6 border">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                Connect Model Context Protocol servers to extend agent capabilities with external tools and data sources
              </p>
              {configuredMCPs.length > 0 && (
                <div className="flex items-center mt-3 space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {configuredMCPs.length} server{configuredMCPs.length !== 1 ? 's' : ''} configured
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCustomDialog(true)}
              className="transition-all duration-200"
            >
              <Server className="h-4 w-4" />
              Custom
            </Button>
            <Button
              size="sm"
              onClick={() => setShowBrowseDialog(true)}
              className="transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Browse
            </Button>
          </div>
        </div>
      </div>
      
      {configuredMCPs.length === 0 && (
        <div className="text-center py-12 px-6 bg-muted/30 rounded-xl border-2 border-dashed border-border">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="text-sm font-medium text-foreground mb-2">
            No MCP servers configured
          </h4>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Add your first MCP server to unlock powerful integrations and extend your agent's capabilities
          </p>
        </div>
      )}
      {configuredMCPs.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h4 className="text-sm font-medium text-foreground">
              Configured Servers
            </h4>
          </div>
          <div className="p-2 divide-y divide-border">
            <ConfiguredMcpList
              configuredMCPs={configuredMCPs}
              onEdit={handleEditMCP}
              onRemove={handleRemoveMCP}
            />
          </div>
        </div>
      )}
      <BrowseDialog
        open={showBrowseDialog}
        onOpenChange={setShowBrowseDialog}
        onServerSelect={handleAddMCP}
      />
      <CustomMCPDialog
        open={showCustomDialog}
        onOpenChange={(open) => {
          setShowCustomDialog(open);
          if (!open) {
            setEditingCustomMCP(null);
            setEditingIndex(null);
          }
        }}
        onSave={handleSaveCustomMCP}
        existingConfig={editingCustomMCP ? (() => {
          console.log('Passing existingConfig to dialog:', editingCustomMCP);
          return {
            name: editingCustomMCP.name,
            customType: editingCustomMCP.customType || (editingCustomMCP.qualifiedName?.includes('_sse_') ? 'sse' : 'http'),
            config: editingCustomMCP.config,
            enabledTools: editingCustomMCP.enabledTools || []
          };
        })() : undefined}
      />
      {configuringServer && (
        <Dialog open={!!configuringServer} onOpenChange={() => setConfiguringServer(null)}>
          <ConfigDialog
            server={configuringServer}
            existingConfig={editingIndex !== null ? configuredMCPs[editingIndex] : undefined}
            onSave={handleSaveConfiguration}
            onCancel={() => setConfiguringServer(null)}
          />
        </Dialog>
      )}
    </div>
  );
};