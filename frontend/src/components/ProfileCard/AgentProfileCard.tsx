import React, { useRef, useCallback, useMemo } from 'react';
import { Settings, Trash2, Star, MessageCircle, Wrench, Globe, Download, Bot, User, Calendar, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import './ProfileCard.css';

// Simple Agent interface matching existing codebase
interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  configured_mcps?: Array<{ name: string; [key: string]: any }>;
  custom_mcps?: Array<{ name: string; [key: string]: any }>;
  agentpress_tools?: Record<string, any>;
  is_default?: boolean;
  is_public?: boolean;
  is_managed?: boolean;
  is_owned?: boolean;
  download_count?: number;
  tags?: string[];
  avatar?: string;
  avatar_color?: string;
  created_at?: string;
  marketplace_published_at?: string;
  creator_name?: string;
  sharing_preferences?: {
    managed_agent?: boolean;
    [key: string]: any;
  };
}

interface AgentProfileCardProps {
  agent: Agent;
  mode?: 'library' | 'marketplace';
  className?: string;
  onChat?: (agentId: string) => void;
  onCustomize?: (agentId: string) => void;
  onDelete?: (agentId: string) => void;
  onAddToLibrary?: (agentId: string) => void;
  isLoading?: boolean;
  enableTilt?: boolean;
}

const getAgentAvatar = (agentId: string) => {
  const avatars = ['🤖', '🎭', '🧠', '⚡', '🔥', '🌟', '🚀', '💎', '🎯', '🎪', '🎨', '🔮', '🌈', '⭐', '🎵'];
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
  
  const avatarIndex = parseInt(agentId?.slice(-2), 16) % avatars.length;
  const colorIndex = parseInt(agentId?.slice(-3, -1), 16) % colors.length;
  
  return {
    avatar: avatars[avatarIndex] || '🤖',
    color: colors[colorIndex] || '#4ECDC4'
  };
};

const getToolsCount = (agent: Agent) => {
  const mcpCount = agent.configured_mcps?.length || 0;
  const customMcpCount = agent.custom_mcps?.length || 0;
  const agentpressCount = Object.values(agent.agentpress_tools || {}).filter(
    tool => tool && typeof tool === 'object' && tool.enabled
  ).length;
  return mcpCount + customMcpCount + agentpressCount;
};

const truncateDescription = (description?: string, maxLength = 80) => {
  if (!description) return 'AI Agent';
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength).trim() + '...';
};

export const AgentProfileCard: React.FC<AgentProfileCardProps> = ({
  agent,
  mode = 'library',
  className = '',
  onChat,
  onCustomize,
  onDelete,
  onAddToLibrary,
  isLoading = false,
  enableTilt = true,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Get agent styling
  const agentStyling = useMemo(() => {
    if (agent.avatar && agent.avatar_color) {
      return { avatar: agent.avatar, color: agent.avatar_color };
    }
    return getAgentAvatar(agent.agent_id);
  }, [agent.agent_id, agent.avatar, agent.avatar_color]);

  // Simple tilt effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRef.current || !wrapRef.current) return;
    
    const card = cardRef.current;
    const wrap = wrapRef.current;
    const rect = card.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    wrap.style.setProperty('--rotate-x', `${rotateX}deg`);
    wrap.style.setProperty('--rotate-y', `${rotateY}deg`);
    wrap.style.setProperty('--pointer-x', `${(x / rect.width) * 100}%`);
    wrap.style.setProperty('--pointer-y', `${(y / rect.height) * 100}%`);
  }, [enableTilt]);

  const handleMouseLeave = useCallback(() => {
    if (!wrapRef.current) return;
    const wrap = wrapRef.current;
    wrap.style.setProperty('--rotate-x', '0deg');
    wrap.style.setProperty('--rotate-y', '0deg');
  }, []);

  const toolsCount = getToolsCount(agent);

  return (
    <div
      ref={wrapRef}
      className={cn('pc-card-wrapper cursor-pointer', className)}
      style={{
        '--behind-gradient': 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(266,100%,90%,var(--card-opacity)) 4%,hsla(266,50%,80%,calc(var(--card-opacity)*0.75)) 10%,hsla(266,25%,70%,calc(var(--card-opacity)*0.5)) 50%,hsla(266,0%,60%,0) 100%)',
        '--inner-gradient': 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)',
      } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <section ref={cardRef} className="pc-card">
        <div className="pc-inside">
          <div className="pc-shine" />
          <div className="pc-glare" />
          
          {/* Agent Background */}
          <div className="pc-content pc-avatar-content">
            <div 
              className="absolute inset-0 rounded-[var(--card-radius)]"
              style={{
                background: `linear-gradient(135deg, ${agentStyling.color}40 0%, ${agentStyling.color}20 100%)`,
              }}
            />
            
            {/* Large Agent Avatar */}
            <div className="avatar text-8xl flex items-center justify-center h-full">
              {agentStyling.avatar}
            </div>
            
            {/* Status Indicators */}
            <div className="absolute top-6 right-6 flex gap-2">
              {agent.is_default && (
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <Star className="h-4 w-4 text-white fill-white" />
                </div>
              )}
              
              {agent.is_public && (
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <Globe className="h-4 w-4 text-white" />
                </div>
              )}
              
              {mode === 'marketplace' && (
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                  <Download className="h-3 w-3 text-white" />
                  <span className="text-white text-sm font-medium">
                    {agent.download_count || 0}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Agent Info */}
          <div className="pc-content">
            <div className="pc-details">
              <h3 className="text-2xl font-bold">{agent.name}</h3>
              <p className="text-sm opacity-90 mb-2">
                {truncateDescription(agent.description)}
              </p>
              
              {/* Additional Info */}
              <div className="flex flex-wrap gap-2 mb-4">
                {toolsCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {toolsCount} tool{toolsCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                
                {agent.is_managed && (
                  <Badge variant="secondary" className="text-xs">
                    Managed
                  </Badge>
                )}
                
                {mode === 'marketplace' && agent.creator_name && (
                  <div className="text-xs opacity-75">
                    By {agent.creator_name}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3">
              <div className="flex gap-2 justify-center">
                {mode === 'marketplace' ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToLibrary?.(agent.agent_id);
                    }}
                    disabled={isLoading}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm flex-1"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-2" />
                        Add to Library
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    {agent.is_managed ? (
                      <Button
                        disabled
                        size="sm"
                        className="bg-white/10 text-white/50 border-white/10 flex-1"
                      >
                        <Wrench className="h-3 w-3 mr-2" />
                        Managed
                      </Button>
                    ) : (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCustomize?.(agent.agent_id);
                        }}
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm flex-1"
                      >
                        <Wrench className="h-3 w-3 mr-2" />
                        Edit
                      </Button>
                    )}
                    
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onChat?.(agent.agent_id);
                      }}
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm flex-1"
                    >
                      <MessageCircle className="h-3 w-3 mr-2" />
                      Chat
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AgentProfileCard; 