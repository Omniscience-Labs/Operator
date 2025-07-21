'use client';

import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Plus, Plug, Check, Loader2, AlertCircle, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntegrations } from '@/hooks/use-integrations';
import { OutlookIntegrationDialog } from './outlook-integration-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface IntegrationsDropdownProps {
  disabled?: boolean;
  className?: string;
}

export function IntegrationsDropdown({ disabled = false, className }: IntegrationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [outlookDialogOpen, setOutlookDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  
  const { integrations, isLoading, toggleIntegration, refreshIntegrations } = useIntegrations();

  // Refresh integrations when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refreshIntegrations();
    }
  }, [isOpen, refreshIntegrations]);

  const handleIntegrationClick = (integrationType: string) => {
    if (integrations[integrationType]?.status === 'connected') {
      // If connected, just close the dropdown
      setIsOpen(false);
    } else {
      // If not connected, open the connection dialog
      setSelectedIntegration(integrationType);
      if (integrationType === 'outlook') {
        setOutlookDialogOpen(true);
      }
      setIsOpen(false);
    }
  };

  const handleToggle = async (integrationType: string, checked: boolean) => {
    try {
      await toggleIntegration(integrationType, checked);
      toast.success(checked ? 'Integration enabled' : 'Integration disabled');
    } catch (error) {
      toast.error('Failed to toggle integration');
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'outlook':
        return Mail;
      default:
        return Plug;
    }
  };

  const getIntegrationStatus = (integration: any) => {
    if (!integration) return 'not_connected';
    return integration.status || 'not_connected';
  };

  const availableIntegrations = [
    {
      type: 'outlook',
      name: 'Microsoft Outlook',
      description: 'Send and manage emails',
      icon: Mail,
    },
    // Add more integrations here in the future
  ];

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="default"
                  className={cn(
                    "h-8 rounded-lg text-muted-foreground shadow-none border-none focus:ring-0 px-3",
                    className
                  )}
                  disabled={disabled}
                >
                  <Plug className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 p-2">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Connected Integrations
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    {availableIntegrations.map((integration) => {
                      const IntegrationIcon = integration.icon;
                      const status = getIntegrationStatus(integrations[integration.type]);
                      const isConnected = status === 'connected';
                      const isEnabled = integrations[integration.type]?.is_enabled || false;

                      return (
                        <DropdownMenuItem
                          key={integration.type}
                          className="flex items-center justify-between p-3 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            if (!isConnected) {
                              handleIntegrationClick(integration.type);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              isConnected ? "bg-green-100 dark:bg-green-900/20" : "bg-muted"
                            )}>
                              <IntegrationIcon className={cn(
                                "h-5 w-5",
                                isConnected ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                              )} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{integration.name}</span>
                                {isConnected && (
                                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {integration.description}
                              </p>
                            </div>
                            {isConnected ? (
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => {
                                  handleToggle(integration.type, checked);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="ml-2"
                              />
                            ) : (
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                    
                    {availableIntegrations.length === 0 && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No integrations available
                      </div>
                    )}
                  </>
                )}
                
                <DropdownMenuSeparator className="my-2" />
                
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Click + to connect a new integration</span>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Connected Integrations</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Integration dialogs */}
      <OutlookIntegrationDialog
        open={outlookDialogOpen}
        onOpenChange={setOutlookDialogOpen}
        onSuccess={() => {
          refreshIntegrations();
          setOutlookDialogOpen(false);
        }}
      />
    </>
  );
} 