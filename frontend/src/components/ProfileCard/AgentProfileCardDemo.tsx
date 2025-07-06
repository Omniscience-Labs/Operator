import React, { useState } from 'react';
import AgentProfileCard from './AgentProfileCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Sample agent data
const sampleAgents = [
  {
    agent_id: 'agent-1',
    account_id: 'user-1',
    name: 'Code Assistant',
    description: 'Expert programming companion that helps with code review, debugging, and best practices across multiple languages.',
    system_prompt: 'You are a helpful coding assistant...',
    configured_mcps: [
      { name: 'github-mcp', type: 'git' },
      { name: 'terminal-mcp', type: 'system' }
    ],
    custom_mcps: [],
    agentpress_tools: {
      sb_files_tool: { enabled: true },
      sb_shell_tool: { enabled: true },
      web_search_tool: { enabled: true }
    },
    is_default: true,
    is_public: false,
    is_managed: false,
    is_owned: true,
    visibility: 'private' as const,
    knowledge_bases: [
      { name: 'programming-docs', type: 'documentation' }
    ],
    tags: ['coding', 'development', 'debugging'],
    avatar: '💻',
    avatar_color: '#4ECDC4',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z'
  },
  {
    agent_id: 'agent-2',
    account_id: 'user-2',
    name: 'Data Analyst Pro',
    description: 'Advanced data analysis and visualization specialist. Transforms raw data into actionable insights using statistical methods.',
    system_prompt: 'You are a data analysis expert...',
    configured_mcps: [
      { name: 'pandas-mcp', type: 'data' },
      { name: 'plotly-mcp', type: 'visualization' }
    ],
    custom_mcps: [],
    agentpress_tools: {
      sb_excel_tool: { enabled: true },
      sb_files_tool: { enabled: true }
    },
    is_default: false,
    is_public: true,
    is_managed: false,
    is_owned: false,
    visibility: 'public' as const,
    knowledge_bases: [],
    marketplace_published_at: '2024-01-10T09:15:00Z',
    download_count: 324,
    tags: ['data', 'analytics', 'visualization', 'statistics'],
    sharing_preferences: {
      managed_agent: false
    },
    avatar: '📊',
    avatar_color: '#FF6B6B',
    creator_name: 'DataWiz Studio',
    created_at: '2024-01-05T08:00:00Z',
    updated_at: '2024-01-18T12:45:00Z'
  },
  {
    agent_id: 'agent-3',
    account_id: 'user-3',
    name: 'Marketing Genius',
    description: 'Creative marketing strategist with expertise in social media, content creation, and campaign optimization.',
    system_prompt: 'You are a marketing expert...',
    configured_mcps: [
      { name: 'social-media-mcp', type: 'marketing' }
    ],
    custom_mcps: [],
    agentpress_tools: {
      web_search_tool: { enabled: true },
      sb_vision_tool: { enabled: true }
    },
    is_default: false,
    is_public: true,
    is_managed: true,
    is_owned: false,
    visibility: 'public' as const,
    knowledge_bases: [
      { name: 'marketing-trends', type: 'industry' },
      { name: 'brand-guidelines', type: 'company' }
    ],
    marketplace_published_at: '2024-01-08T14:20:00Z',
    download_count: 156,
    tags: ['marketing', 'creative', 'social-media', 'branding'],
    sharing_preferences: {
      managed_agent: true
    },
    avatar: '🚀',
    avatar_color: '#96CEB4',
    creator_name: 'Creative Labs',
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-22T16:20:00Z'
  }
];

export default function AgentProfileCardDemo() {
  const [loadingAgent, setLoadingAgent] = useState<string | null>(null);
  const [mode, setMode] = useState<'library' | 'marketplace' | 'preview'>('library');

  const handleAction = async (action: string, agentId: string, agentName?: string) => {
    setLoadingAgent(agentId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success(`${action} action completed for ${agentName || 'agent'}`);
    setLoadingAgent(null);
  };

  const handleChat = (agentId: string) => {
    const agent = sampleAgents.find(a => a.agent_id === agentId);
    toast.success(`Starting chat with ${agent?.name}`);
  };

  const handleCustomize = (agentId: string) => {
    const agent = sampleAgents.find(a => a.agent_id === agentId);
    toast.success(`Customizing ${agent?.name}`);
  };

  const handleDelete = (agentId: string) => {
    const agent = sampleAgents.find(a => a.agent_id === agentId);
    handleAction('Delete', agentId, agent?.name);
  };

  const handleAddToLibrary = (agentId: string) => {
    const agent = sampleAgents.find(a => a.agent_id === agentId);
    handleAction('Add to Library', agentId, agent?.name);
  };

  const handlePreview = (agentId: string) => {
    const agent = sampleAgents.find(a => a.agent_id === agentId);
    toast.success(`Previewing ${agent?.name}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Agent Profile Cards Demo
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Experience the next-generation agent cards with stunning holographic effects 
            and comprehensive functionality for agent management.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex justify-center gap-4">
          <Button
            variant={mode === 'library' ? 'default' : 'outline'}
            onClick={() => setMode('library')}
          >
            Library Mode
          </Button>
          <Button
            variant={mode === 'marketplace' ? 'default' : 'outline'}
            onClick={() => setMode('marketplace')}
          >
            Marketplace Mode
          </Button>
          <Button
            variant={mode === 'preview' ? 'default' : 'outline'}
            onClick={() => setMode('preview')}
          >
            Preview Mode
          </Button>
        </div>

        {/* Mode Description */}
        <div className="text-center">
          <Badge variant="outline" className="text-sm">
            {mode === 'library' && 'Personal agent collection with full management capabilities'}
            {mode === 'marketplace' && 'Public agents available for download and installation'}
            {mode === 'preview' && 'Quick preview mode for browsing agents'}
          </Badge>
        </div>

        {/* Agent Cards Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {sampleAgents.map((agent, index) => (
            <div key={agent.agent_id} className="flex justify-center">
              <AgentProfileCard
                agent={agent}
                mode={mode}
                enableTilt={true}
                onChat={handleChat}
                onCustomize={handleCustomize}
                onDelete={mode === 'library' ? handleDelete : undefined}
                onAddToLibrary={mode === 'marketplace' ? handleAddToLibrary : undefined}
                onPreview={mode === 'preview' ? handlePreview : undefined}
                isLoading={loadingAgent === agent.agent_id}
                loadingAction={mode === 'marketplace' ? 'Adding to library...' : ''}
                showActions={true}
                compact={mode === 'preview'}
                className={`animate-fade-in`}
                style={{
                  animationDelay: `${index * 200}ms`,
                  animationFillMode: 'both'
                }}
              />
            </div>
          ))}
        </div>

        {/* Features List */}
        <div className="mt-16 bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            ✨ Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold text-white">🎨 Visual Effects</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• Interactive 3D tilt animations</li>
                <li>• Holographic background gradients</li>
                <li>• Smooth hover transitions</li>
                <li>• Dynamic lighting effects</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-white">⚡ Functionality</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• Multiple display modes</li>
                <li>• Agent management actions</li>
                <li>• Detailed modal dialogs</li>
                <li>• Loading states & feedback</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-white">🔧 Agent Features</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• Tool and MCP integration</li>
                <li>• Knowledge base indicators</li>
                <li>• Marketplace statistics</li>
                <li>• Status badges & tags</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            🚀 How to Use
          </h2>
          <div className="text-gray-300 space-y-4">
            <p>
              <strong>Hover:</strong> Experience the 3D tilt effects and holographic animations
            </p>
            <p>
              <strong>Click Card:</strong> Open detailed modal with agent information and tools
            </p>
            <p>
              <strong>Action Buttons:</strong> Use the bottom action bar for quick operations
            </p>
            <p>
              <strong>Modes:</strong> Switch between Library, Marketplace, and Preview modes for different use cases
            </p>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
} 