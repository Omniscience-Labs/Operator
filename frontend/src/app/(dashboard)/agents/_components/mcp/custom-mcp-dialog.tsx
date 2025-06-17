import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Zap, Globe, Code, ChevronRight, Sparkles, Database, Wifi, Server, Plus, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface CustomMCPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: CustomMCPConfiguration) => void;
}

interface CustomMCPConfiguration {
  name: string;
  type: 'http' | 'sse' | 'json';
  config: any;
  enabledTools: string[];
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema?: any;
}

interface HeaderPair {
  key: string;
  value: string;
}

export const CustomMCPDialog: React.FC<CustomMCPDialogProps> = ({
  open,
  onOpenChange,
  onSave
}) => {
  const [step, setStep] = useState<'setup' | 'tools'>('setup');
  const [serverType, setServerType] = useState<'http' | 'sse' | 'json'>('sse');
  const [configText, setConfigText] = useState('');
  const [serverName, setServerName] = useState('');
  const [manualServerName, setManualServerName] = useState('');
  const [headers, setHeaders] = useState<HeaderPair[]>([{ key: '', value: '' }]);
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [envVars, setEnvVars] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [discoveredTools, setDiscoveredTools] = useState<MCPTool[]>([]);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [processedConfig, setProcessedConfig] = useState<any>(null);

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    if (headers.length > 1) {
      const newHeaders = headers.filter((_, i) => i !== index);
      setHeaders(newHeaders);
    }
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const getHeadersObject = () => {
    const headersObj: Record<string, string> = {};
    headers.forEach(({ key, value }) => {
      if (key.trim() && value.trim()) {
        headersObj[key.trim()] = value.trim();
      }
    });
    return headersObj;
  };

  const validateAndDiscoverTools = async () => {
    setIsValidating(true);
    setValidationError(null);
    setDiscoveredTools([]);
    
    try {
      let parsedConfig: any;
      
      if (serverType === 'sse' || serverType === 'http') {
        const url = configText.trim();
        if (!url) {
          throw new Error('Please enter the connection URL.');
        }
        if (!manualServerName.trim()) {
          throw new Error('Please enter a name for this connection.');
        }
        
        parsedConfig = { 
          url,
          headers: getHeadersObject()
        };
        setServerName(manualServerName.trim());
      } else if (serverType === 'json') {
        if (!command.trim()) {
          throw new Error('Please enter the command to run the MCP server.');
        }
        if (!manualServerName.trim()) {
          throw new Error('Please enter a name for this connection.');
        }
        
        const argsArray = args.trim() ? args.trim().split(/\s+/) : [];
        const envObject = envVars.trim() ? JSON.parse(envVars.trim()) : {};
        
        parsedConfig = {
          command: command.trim(),
          args: argsArray,
          env: envObject
        };
        setServerName(manualServerName.trim());
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('You must be logged in to discover tools');
      }

      const response = await fetch(`${API_URL}/mcp/discover-custom-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: serverType,
          config: parsedConfig
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to connect to the service. Please check your configuration.');
      }

      const data = await response.json();
      
      if (!data.tools || data.tools.length === 0) {
        throw new Error('No tools found. Please check your configuration.');
      }

      if (data.serverName) {
        setServerName(data.serverName);
      }

      if (data.processedConfig) {
        setProcessedConfig(data.processedConfig);
      }

      setDiscoveredTools(data.tools);
      setSelectedTools(new Set(data.tools.map((tool: MCPTool) => tool.name)));
      setStep('tools');
      
    } catch (error: any) {
      setValidationError(error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    if (discoveredTools.length === 0 || selectedTools.size === 0) {
      setValidationError('Please select at least one tool to continue.');
      return;
    }

    if (!serverName.trim()) {
      setValidationError('Please provide a name for this connection.');
      return;
    }

    try {
      let configToSave: any;
      
      if (serverType === 'json') {
        // Save STDIO configuration
        const argsArray = args.trim() ? args.trim().split(/\s+/) : [];
        const envObject = envVars.trim() ? JSON.parse(envVars.trim()) : {};
        
        configToSave = {
          command: command.trim(),
          args: argsArray,
          env: envObject
        };
      } else {
        // Save URL-based configuration (http/sse)
        configToSave = { 
          url: configText.trim(),
          headers: getHeadersObject()
        };
      }
      
      onSave({
        name: serverName,
        type: serverType,
        config: configToSave,
        enabledTools: Array.from(selectedTools)
      });
      
      setConfigText('');
      setManualServerName('');
      setHeaders([{ key: '', value: '' }]);
      setCommand('');
      setArgs('');
      setEnvVars('');
      setDiscoveredTools([]);
      setSelectedTools(new Set());
      setServerName('');
      setProcessedConfig(null);
      setValidationError(null);
      setStep('setup');
      onOpenChange(false);
    } catch (error) {
      setValidationError('Invalid configuration format.');
    }
  };

  const handleToolToggle = (toolName: string) => {
    const newTools = new Set(selectedTools);
    if (newTools.has(toolName)) {
      newTools.delete(toolName);
    } else {
      newTools.add(toolName);
    }
    setSelectedTools(newTools);
  };

  const handleBack = () => {
    setStep('setup');
    setValidationError(null);
  };

  const handleReset = () => {
    setConfigText('');
    setManualServerName('');
    setHeaders([{ key: '', value: '' }]);
    setCommand('');
    setArgs('');
    setEnvVars('');
    setDiscoveredTools([]);
    setSelectedTools(new Set());
    setServerName('');
    setProcessedConfig(null);
    setValidationError(null);
    setStep('setup');
  };

  const exampleConfigs = {
    http: `https://server.example.com/mcp`,
    sse: `https://mcp.composio.dev/partner/composio/gmail/sse?customerId=YOUR_CUSTOMER_ID`
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) handleReset();
    }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle>Connect New Service</DialogTitle>
          </div>
          <DialogDescription>
            {step === 'setup' 
              ? 'Connect to external services to expand your capabilities with new tools and integrations.'
              : 'Choose which tools you\'d like to enable from this service connection.'
            }
          </DialogDescription>
          <div className="flex items-center gap-2 pt-2">
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium",
              step === 'setup' ? "text-primary" : "text-muted-foreground"
            )}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                step === 'setup' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                1
              </div>
              Setup Connection
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium",
              step === 'tools' ? "text-primary" : "text-muted-foreground"
            )}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                step === 'tools' ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                2
              </div>
              Select Tools
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <div className="p-6 space-y-6">
            {step === 'setup' ? (
              <>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">How would you like to connect?</Label>
                    <RadioGroup 
                      value={serverType} 
                      onValueChange={(value: 'http' | 'sse' | 'json') => setServerType(value)}
                      className="grid grid-cols-1 gap-3"
                    >
                      <div className={cn(
                        "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
                        serverType === 'http' ? "border-primary bg-primary/5" : "border-border"
                      )}>
                        <RadioGroupItem value="http" id="http" className="mt-1" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-primary" />
                            <Label htmlFor="http" className="text-base font-medium cursor-pointer">
                              Streamable HTTP
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Standard streamable HTTP connection
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
                        serverType === 'sse' ? "border-primary bg-primary/5" : "border-border"
                      )}>
                        <RadioGroupItem value="sse" id="sse" className="mt-1" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Wifi className="h-4 w-4 text-primary" />
                            <Label htmlFor="sse" className="text-base font-medium cursor-pointer">
                              SSE (Server-Sent Events)
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Real-time connection using Server-Sent Events for streaming updates
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
                        serverType === 'json' ? "border-primary bg-primary/5" : "border-border"
                      )}>
                        <RadioGroupItem value="json" id="json" className="mt-1" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Code className="h-4 w-4 text-primary" />
                            <Label htmlFor="json" className="text-base font-medium cursor-pointer">
                              Local STDIO (Command)
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Run a local MCP server using command-line interface (STDIO)
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="serverName" className="text-base font-medium">
                      Connection Name
                    </Label>
                    <Input
                      id="serverName"
                      type="text"
                      placeholder={
                        serverType === 'json' 
                          ? "e.g., Pandoc Converter, File Processor" 
                          : "e.g., Gmail, Slack, Customer Support Tools"
                      }
                      value={manualServerName}
                      onChange={(e) => setManualServerName(e.target.value)}
                      className="w-full px-4 py-3 border border-input bg-background rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    />
                    <p className="text-sm text-muted-foreground">
                      Give this connection a memorable name
                    </p>
                  </div>

                  {serverType === 'json' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="command" className="text-base font-medium">
                          Command
                        </Label>
                        <Input
                          id="command"
                          type="text"
                          placeholder="e.g., npx, python, node"
                          value={command}
                          onChange={(e) => setCommand(e.target.value)}
                          className="w-full px-4 py-3 border border-input bg-muted rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent font-mono"
                        />
                        <p className="text-sm text-muted-foreground">
                          The command to execute the MCP server
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="args" className="text-base font-medium">
                          Arguments
                        </Label>
                        <Input
                          id="args"
                          type="text"
                          placeholder="e.g., -y @SundaramManickam/mcp-pandoc"
                          value={args}
                          onChange={(e) => setArgs(e.target.value)}
                          className="w-full px-4 py-3 border border-input bg-muted rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent font-mono"
                        />
                        <p className="text-sm text-muted-foreground">
                          Command arguments separated by spaces
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="envVars" className="text-base font-medium">
                          Environment Variables (Optional)
                        </Label>
                        <Textarea
                          id="envVars"
                          placeholder='{"DISPLAY": ":1", "NODE_ENV": "production"}'
                          value={envVars}
                          onChange={(e) => setEnvVars(e.target.value)}
                          className="w-full px-4 py-3 border border-input bg-muted rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent font-mono"
                          rows={3}
                        />
                        <p className="text-sm text-muted-foreground">
                          JSON object with environment variables (optional)
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="config" className="text-base font-medium">
                        Connection URL
                      </Label>
                      <Input
                          id="config"
                          type="url"
                          placeholder={exampleConfigs[serverType]}
                          value={configText}
                          onChange={(e) => setConfigText(e.target.value)}
                          className="w-full px-4 py-3 border border-input bg-muted rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent font-mono"
                        />
                      <p className="text-sm text-muted-foreground">
                        Paste the complete connection URL provided by your service
                      </p>
                    </div>
                  )}

                  {serverType !== 'json' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">
                          Custom Headers (Optional)
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addHeader}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Header
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Add custom headers for authentication or other requirements (e.g., Authorization, X-API-Key)
                      </p>
                      <div className="space-y-3">
                        {headers.map((header, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <div className="flex-1">
                              <Input
                                placeholder="Header name (e.g., Authorization)"
                                value={header.key}
                                onChange={(e) => updateHeader(index, 'key', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <Input
                                placeholder="Header value (e.g., Bearer your-token)"
                                value={header.value}
                                onChange={(e) => updateHeader(index, 'value', e.target.value)}
                                className="text-sm"
                                type={header.key.toLowerCase().includes('authorization') || header.key.toLowerCase().includes('token') || header.key.toLowerCase().includes('key') ? 'password' : 'text'}
                              />
                            </div>
                            {headers.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeHeader(index)}
                                className="p-2 h-9 w-9 flex-shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {validationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <>
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div className="ml-2">
                    <h3 className="font-medium text-green-900 mb-1">
                      Connection Successful!
                    </h3>
                    <p className="text-sm text-green-700">
                      Found {discoveredTools.length} available tools from <strong>{serverName}</strong>
                    </p>
                  </div>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium">Available Tools</h3>
                      <p className="text-sm text-muted-foreground">
                        Select the tools you want to enable
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedTools.size === discoveredTools.length) {
                          setSelectedTools(new Set());
                        } else {
                          setSelectedTools(new Set(discoveredTools.map(t => t.name)));
                        }
                      }}
                    >
                      {selectedTools.size === discoveredTools.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {discoveredTools.map((tool) => (
                      <div 
                        key={tool.name} 
                        className={cn(
                          "flex items-start space-x-3 p-4 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
                          selectedTools.has(tool.name) 
                            ? "border-primary bg-primary/5" 
                            : "border-border"
                        )}
                        onClick={() => handleToolToggle(tool.name)}
                      >
                        <Checkbox
                          id={tool.name}
                          checked={selectedTools.has(tool.name)}
                          onCheckedChange={() => handleToolToggle(tool.name)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2 min-w-0">
                          <Label
                            htmlFor={tool.name}
                            className="text-base font-medium cursor-pointer block"
                          >
                            {tool.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                          {tool.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed break-words">
                              {tool.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {validationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t bg-background">
          {step === 'tools' ? (
            <>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={selectedTools.size === 0}
              >
                Add Connection ({selectedTools.size} tools)
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={validateAndDiscoverTools}
                disabled={
                  !manualServerName.trim() || 
                  (serverType === 'json' ? !command.trim() : !configText.trim()) || 
                  isValidating
                }
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Discovering tools...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Connect
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};