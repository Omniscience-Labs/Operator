import React, { useRef, useCallback, useMemo } from 'react';
import { Settings, Trash2, Star, MessageCircle, Wrench, Globe, Download, Bot, User, Calendar, Tags, Sparkles, Zap, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import './AgentProfileCard.css';

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
  knowledge_bases?: Array<{ name: string; [key: string]: any }>;
  sharing_preferences?: {
    managed_agent?: boolean;
    include_knowledge_bases?: boolean;
    include_custom_mcp_tools?: boolean;
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
  onRemoveFromLibrary?: (agentId: string) => void;
  onAddToLibrary?: (agentId: string) => void;
  onPublish?: (agentId: string) => void;
  onMakePrivate?: (agentId: string) => void;
  isLoading?: boolean;
  enableTilt?: boolean;
}

const getAgentAvatar = (agentId: string) => {
  const avatars = ['🤖', '🎭', '🧠', '⚡', '🔥', '🌟', '🚀', '💎', '🎯', '🎪', '🎨', '🔮', '🌈', '⭐', '🎵'];
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#8B5CF6', '#06B6D4'];
  
  const avatarIndex = parseInt(agentId?.slice(-2), 16) % avatars.length;
  const colorIndex = parseInt(agentId?.slice(-3, -1), 16) % colors.length;
  
  return {
    avatar: avatars[avatarIndex] || '🤖',
    color: colors[colorIndex] || '#3B82F6'
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

const getKnowledgeBasesCount = (agent: Agent) => {
  return agent.knowledge_bases?.length || 0;
};

const truncateDescription = (description?: string, maxLength = 100) => {
  if (!description) return 'AI Agent ready to help you with various tasks';
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength).trim() + '...';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export const AgentProfileCard: React.FC<AgentProfileCardProps> = ({
  agent,
  mode = 'library',
  className = '',
  onChat,
  onCustomize,
  onDelete,
  onRemoveFromLibrary,
  onAddToLibrary,
  onPublish,
  onMakePrivate,
  isLoading = false,
  enableTilt = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Get agent styling
  const agentStyling = useMemo(() => {
    if (agent.avatar && agent.avatar_color) {
      return { avatar: agent.avatar, color: agent.avatar_color };
    }
    return getAgentAvatar(agent.agent_id);
  }, [agent.agent_id, agent.avatar, agent.avatar_color]);

  // Enhanced tilt effect with subtle rotation
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRef.current) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 25; // Slightly more pronounced
    const rotateY = (centerX - x) / 25; // Slightly more pronounced
    
    // Calculate position percentages for gradient effects
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(5px)`;
    card.style.setProperty('--mouse-x', `${xPercent}%`);
    card.style.setProperty('--mouse-y', `${yPercent}%`);
  }, [enableTilt]);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
  }, []);

  const toolsCount = getToolsCount(agent);

  return (
    <div
      ref={cardRef}
      className={cn(
        'group relative w-full h-[400px] rounded-2xl overflow-hidden transition-all duration-500 ease-out cursor-pointer',
        'hover:shadow-2xl hover:shadow-black/30 hover:-translate-y-2',
        // Enhanced hover glow effect
        'before:absolute before:inset-0 before:rounded-2xl before:p-[1px] before:bg-gradient-to-br before:opacity-0',
        'hover:before:opacity-100 before:transition-opacity before:duration-500',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        background: `
          linear-gradient(135deg, 
            ${agentStyling.color}08 0%, 
            ${agentStyling.color}03 100%
          ),
          linear-gradient(145deg, 
            rgba(255, 255, 255, 0.1) 0%, 
            rgba(255, 255, 255, 0.05) 100%
          )
        `,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        // CSS variables for mouse position
        '--mouse-x': '50%',
        '--mouse-y': '50%',
      } as React.CSSProperties}
    >
      {/* Animated border glow on hover */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 card-border-glow"
        style={{
          background: `
            linear-gradient(135deg, 
              ${agentStyling.color}40 0%, 
              ${agentStyling.color}20 50%,
              ${agentStyling.color}40 100%
            )
          `,
          filter: 'blur(8px)',
          zIndex: -1,
        }}
      />
      
      {/* Spotlight effect following mouse */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              200px circle at var(--mouse-x) var(--mouse-y),
              ${agentStyling.color}20 0%,
              transparent 50%
            )
          `,
        }}
      />
      
      {/* Enhanced Colored Glare Effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none overflow-hidden glare-sweep-colored-animation"
        style={{
          background: `
            linear-gradient(
              75deg,
              transparent 20%,
              ${agentStyling.color}40 35%,
              ${agentStyling.color}80 45%,
              ${agentStyling.color}60 55%,
              ${agentStyling.color}40 65%,
              transparent 80%
            )
          `,
        }}
      />
      
      {/* Subtle gradient overlay with enhanced hover effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500"
        style={{
          background: `
            linear-gradient(135deg, 
              ${agentStyling.color}12 0%, 
              ${agentStyling.color}06 100%
            )
          `,
        }}
      />
      
      {/* Content */}
      <div className="relative h-full flex flex-col p-6 z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 agent-avatar"
              style={{
                background: `linear-gradient(135deg, ${agentStyling.color}25 0%, ${agentStyling.color}45 100%)`,
                border: `1px solid ${agentStyling.color}40`,
                boxShadow: `0 4px 15px ${agentStyling.color}20`,
                '--agent-color': agentStyling.color,
              } as React.CSSProperties}
            >
              {agentStyling.avatar}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white/90 truncate max-w-[200px] transition-colors duration-300 group-hover:text-white">
                {agent.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {agent.is_default && (
                  <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-200 border-amber-500/30 transition-all duration-300 group-hover:bg-amber-500/30 group-hover:text-amber-100">
                    <Star className="h-3 w-3 mr-1" />
                    Default
                  </Badge>
                )}
                {agent.is_public && (
                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-200 border-green-500/30 transition-all duration-300 group-hover:bg-green-500/30 group-hover:text-green-100">
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </Badge>
                )}
                {(agent.is_managed || (mode === 'marketplace' && agent.sharing_preferences?.managed_agent)) && (
                  <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-200 border-blue-500/30 transition-all duration-300 group-hover:bg-blue-500/30 group-hover:text-blue-100">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Managed
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Download count for marketplace */}
            {mode === 'marketplace' && (
              <div className="flex items-center gap-1 text-white/60 text-sm transition-colors duration-300 group-hover:text-white/80">
                <Download className="h-4 w-4" />
                <span>{agent.download_count || 0}</span>
              </div>
            )}
            
            {/* Delete/Remove from Library button for library mode */}
            {mode === 'library' && !agent.is_default && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500/20 hover:text-red-300 text-white/60"
                    disabled={isLoading}
                    title={agent.is_managed ? "Remove from library" : "Delete agent"}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl">
                      {agent.is_managed ? 'Remove from Library' : 'Delete Agent'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {agent.is_managed ? (
                        <>
                          Are you sure you want to remove &quot;{agent.name}&quot; from your library? 
                          This will not delete the original agent, just remove your access to it.
                        </>
                      ) : (
                        <>
                          Are you sure you want to delete &quot;{agent.name}&quot;? This action cannot be undone.
                          {agent.is_public && (
                            <span className="block mt-2 text-amber-600 dark:text-amber-400">
                              Note: This agent is currently published to the marketplace and will be removed from there as well.
                            </span>
                          )}
                        </>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.stopPropagation();
                        if (agent.is_managed) {
                          onRemoveFromLibrary?.(agent.agent_id);
                        } else {
                          onDelete?.(agent.agent_id);
                        }
                      }}
                      disabled={isLoading}
                      className="bg-destructive hover:bg-destructive/90 text-white"
                    >
                      {isLoading ? 
                        (agent.is_managed ? 'Removing...' : 'Deleting...') : 
                        (agent.is_managed ? 'Remove' : 'Delete')
                      }
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 mb-4">
          <p className="text-white/70 text-sm leading-relaxed transition-colors duration-300 group-hover:text-white/85">
            {truncateDescription(agent.description)}
          </p>
        </div>

                  {/* Tools and Info */}
        <div className="space-y-3 mb-4">
          {/* Tools - show count based on what's actually available in marketplace vs library */}
          {(() => {
            if (mode === 'marketplace') {
              // In marketplace, only show tools that will actually be shared
              const mcpCount = (agent.configured_mcps?.length || 0) + (agent.custom_mcps?.length || 0);
              const mcpToolsIncluded = agent.sharing_preferences?.include_custom_mcp_tools !== false;
              const agentpressCount = Object.values(agent.agentpress_tools || {}).filter(
                tool => tool && typeof tool === 'object' && tool.enabled
              ).length;
              
              const displayCount = (mcpToolsIncluded ? mcpCount : 0) + agentpressCount;
              
              if (displayCount > 0) {
                return (
                  <div className="flex items-center gap-2 transition-colors duration-300 group-hover:text-white/90">
                    <Zap className="h-4 w-4 text-white/60 group-hover:text-white/80 transition-colors duration-300" />
                    <span className="text-white/80 text-sm group-hover:text-white/90 transition-colors duration-300">
                      {displayCount} tool{displayCount !== 1 ? 's' : ''} available
                    </span>
                  </div>
                );
              }
            } else {
              // In library mode, show all tools
              if (toolsCount > 0) {
                return (
                  <div className="flex items-center gap-2 transition-colors duration-300 group-hover:text-white/90">
                    <Zap className="h-4 w-4 text-white/60 group-hover:text-white/80 transition-colors duration-300" />
                    <span className="text-white/80 text-sm group-hover:text-white/90 transition-colors duration-300">
                      {toolsCount} tool{toolsCount !== 1 ? 's' : ''} available
                    </span>
                  </div>
                );
              }
            }
            return null;
          })()}

          {/* Knowledge Bases - only show if shared in marketplace mode */}
          {(() => {
            const knowledgeBasesCount = getKnowledgeBasesCount(agent);
            const shouldShow = knowledgeBasesCount > 0 && (
              mode === 'library' || 
              (mode === 'marketplace' && agent.sharing_preferences?.include_knowledge_bases !== false)
            );
            
            if (shouldShow) {
              return (
                <div className="flex items-center gap-2 transition-colors duration-300 group-hover:text-white/90">
                  <BookOpen className="h-4 w-4 text-white/60 group-hover:text-white/80 transition-colors duration-300" />
                  <span className="text-white/80 text-sm group-hover:text-white/90 transition-colors duration-300">
                    {knowledgeBasesCount} knowledge base{knowledgeBasesCount !== 1 ? 's' : ''} connected
                  </span>
                </div>
              );
            }
            return null;
          })()}

          {/* Creator info for marketplace */}
          {mode === 'marketplace' && agent.creator_name && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-white/60 group-hover:text-white/80 transition-colors duration-300" />
              <span className="text-white/60 text-sm group-hover:text-white/80 transition-colors duration-300">
                By {agent.creator_name}
              </span>
            </div>
          )}

          {/* Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-white/60 group-hover:text-white/80 transition-colors duration-300" />
            <span className="text-white/60 text-sm group-hover:text-white/80 transition-colors duration-300">
              {mode === 'marketplace' ? 
                `Published ${formatDate(agent.marketplace_published_at)}` : 
                `Created ${formatDate(agent.created_at)}`
              }
            </span>
          </div>

          {/* Tags */}
          {agent.tags && agent.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.tags.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs bg-white/10 text-white/70 border-white/20 transition-all duration-300 group-hover:bg-white/15 group-hover:text-white/85"
                >
                  {tag}
                </Badge>
              ))}
              {agent.tags.length > 3 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-white/10 text-white/70 border-white/20 transition-all duration-300 group-hover:bg-white/15 group-hover:text-white/85"
                >
                  +{agent.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {mode === 'marketplace' ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onAddToLibrary?.(agent.agent_id);
              }}
              disabled={isLoading}
              size="sm"
              className="flex-1 bg-white/10 hover:bg-white/25 text-white border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
              style={{
                boxShadow: `0 4px 15px ${agentStyling.color}10`,
              }}
            >
              {isLoading ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Add to Library
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onChat?.(agent.agent_id);
                }}
                size="sm"
                className="flex-1 bg-white/10 hover:bg-white/25 text-white border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
                style={{
                  boxShadow: `0 4px 15px ${agentStyling.color}10`,
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat
              </Button>
              
              {!agent.is_managed && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCustomize?.(agent.agent_id);
                  }}
                  size="sm"
                  variant="outline"
                  className="bg-white/5 hover:bg-white/15 text-white/80 border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:text-white"
                >
                  <Wrench className="h-4 w-4" />
                </Button>
              )}
              
              {/* Publish/Make Private Button with confirmation for managed agents */}
              {!agent.is_managed && agent.is_owned && (
                agent.is_public || agent.marketplace_published_at ? (
                  agent.sharing_preferences?.managed_agent ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          onClick={(e) => e.stopPropagation()}
                          size="sm"
                          variant="outline"
                          className="bg-white/5 hover:bg-white/15 text-white/80 border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:text-white"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          Make Private
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl">
                            Make Managed Agent Private
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to make &quot;{agent.name}&quot; private? 
                            <br /><br />
                            <strong>This will:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>Remove it from the marketplace</li>
                              <li>Remove it from all users&apos; libraries who added it</li>
                              <li>Stop all live updates to users who had this agent</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation();
                              onMakePrivate?.(agent.agent_id);
                            }}
                            disabled={isLoading}
                            className="bg-destructive hover:bg-destructive/90 text-white"
                          >
                            {isLoading ? 'Making Private...' : 'Make Private'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMakePrivate?.(agent.agent_id);
                      }}
                      size="sm"
                      variant="outline"
                      className="bg-white/5 hover:bg-white/15 text-white/80 border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:text-white"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Make Private
                    </Button>
                  )
                ) : (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublish?.(agent.agent_id);
                    }}
                    size="sm"
                    variant="outline"
                    className="bg-white/5 hover:bg-white/15 text-white/80 border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:text-white"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Publish
                  </Button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentProfileCard;