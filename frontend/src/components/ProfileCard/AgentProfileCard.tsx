import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { Settings, Trash2, Star, MessageCircle, Wrench, Globe, GlobeLock, Download, Plus, Bot, User, Calendar, Tags, AlertTriangle, CheckCircle, ExternalLink, Eye, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import './ProfileCard.css';

interface Agent {
  agent_id: string;
  account_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  configured_mcps: Array<{ name: string; [key: string]: any }>;
  custom_mcps?: Array<{ name: string; [key: string]: any }>;
  agentpress_tools: Record<string, any>;
  is_default: boolean;
  is_public?: boolean;
  is_managed?: boolean;
  is_owned?: boolean;
  visibility?: 'public' | 'teams' | 'private';
  knowledge_bases?: Array<{ [key: string]: any }>;
  marketplace_published_at?: string;
  download_count?: number;
  tags?: string[];
  sharing_preferences?: {
    managed_agent?: boolean;
    [key: string]: any;
  };
  avatar?: string;
  avatar_color?: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

interface AgentProfileCardProps {
  agent: Agent;
  mode?: 'library' | 'marketplace' | 'preview';
  className?: string;
  style?: React.CSSProperties;
  enableTilt?: boolean;
  onChat?: (agentId: string) => void;
  onCustomize?: (agentId: string) => void;
  onDelete?: (agentId: string) => void;
  onRemoveFromLibrary?: (agentId: string) => void;
  onAddToLibrary?: (agentId: string) => void;
  onPublish?: (agentId: string) => void;
  onUnpublish?: (agentId: string) => void;
  onToggleDefault?: (agentId: string, isDefault: boolean) => void;
  onPreview?: (agentId: string) => void;
  isLoading?: boolean;
  loadingAction?: string;
  showActions?: boolean;
  compact?: boolean;
}

const DEFAULT_BEHIND_GRADIENT =
  'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(266,100%,90%,var(--card-opacity)) 4%,hsla(266,50%,80%,calc(var(--card-opacity)*0.75)) 10%,hsla(266,25%,70%,calc(var(--card-opacity)*0.5)) 50%,hsla(266,0%,60%,0) 100%),radial-gradient(35% 52% at 55% 20%,#00ffaac4 0%,#073aff00 100%),radial-gradient(100% 100% at 50% 50%,#00c1ffff 1%,#073aff00 76%),conic-gradient(from 124deg at 50% 50%,#c137ffff 0%,#07c6ffff 40%,#07c6ffff 60%,#c137ffff 100%)';

const DEFAULT_INNER_GRADIENT =
  'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)';

const ANIMATION_CONFIG = {
  SMOOTH_DURATION: 600,
  INITIAL_DURATION: 1500,
  INITIAL_X_OFFSET: 70,
  INITIAL_Y_OFFSET: 60,
} as const;

const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(Math.max(value, min), max);

const round = (value: number, precision = 3): number =>
  parseFloat(value.toFixed(precision));

const adjust = (
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number,
): number =>
  round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin));

const easeInOutCubic = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

const getAgentAvatar = (agentId: string) => {
  const avatars = ['🤖', '🎭', '🧠', '⚡', '🔥', '🌟', '🚀', '💎', '🎯', '🎪', '🎨', '🔮', '🌈', '⭐', '🎵'];
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'];
  
  const avatarIndex = parseInt(agentId?.slice(-2), 16) % avatars.length;
  const colorIndex = parseInt(agentId?.slice(-3, -1), 16) % colors.length;
  
  return {
    avatar: avatars[avatarIndex] || '🤖',
    color: colors[colorIndex] || '#4ECDC4'
  };
};

const truncateDescription = (description?: string, maxLength = 120) => {
  if (!description) return '';
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength).trim() + '...';
};

const getToolsCount = (agent: Agent) => {
  const mcpCount = agent.configured_mcps?.length || 0;
  const customMcpCount = agent.custom_mcps?.length || 0;
  const agentpressCount = Object.values(agent.agentpress_tools || {}).filter(
    tool => tool && typeof tool === 'object' && tool.enabled
  ).length;
  return mcpCount + customMcpCount + agentpressCount;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const AgentProfileCard: React.FC<AgentProfileCardProps> = ({
  agent,
  mode = 'library',
  className = '',
  style,
  enableTilt = true,
  onChat,
  onCustomize,
  onDelete,
  onRemoveFromLibrary,
  onAddToLibrary,
  onPublish,
  onUnpublish,
  onToggleDefault,
  onPreview,
  isLoading = false,
  loadingAction = '',
  showActions = true,
  compact = false,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Get agent styling
  const agentStyling = useMemo(() => {
    if (agent.avatar && agent.avatar_color) {
      return {
        avatar: agent.avatar,
        color: agent.avatar_color,
      };
    }
    return getAgentAvatar(agent.agent_id);
  }, [agent.agent_id, agent.avatar, agent.avatar_color]);

  // Animation handlers
  const animationHandlers = useMemo(() => {
    if (!enableTilt) return null;

    let rafId: number | null = null;

    const updateCardTransform = (
      offsetX: number,
      offsetY: number,
      card: HTMLElement,
      wrap: HTMLElement,
    ) => {
      const width = card.clientWidth;
      const height = card.clientHeight;

      const percentX = clamp((100 / width) * offsetX);
      const percentY = clamp((100 / height) * offsetY);

      const centerX = percentX - 50;
      const centerY = percentY - 50;

      const properties = {
        '--pointer-x': `${percentX}%`,
        '--pointer-y': `${percentY}%`,
        '--background-x': `${adjust(percentX, 0, 100, 35, 65)}%`,
        '--background-y': `${adjust(percentY, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        '--pointer-from-top': `${percentY / 100}`,
        '--pointer-from-left': `${percentX / 100}`,
        '--rotate-x': `${round(-(centerX / 5))}deg`,
        '--rotate-y': `${round(centerY / 4)}deg`,
      };

      Object.entries(properties).forEach(([property, value]) => {
        wrap.style.setProperty(property, value);
      });
    };

    const createSmoothAnimation = (
      duration: number,
      startX: number,
      startY: number,
      card: HTMLElement,
      wrap: HTMLElement,
    ) => {
      const startTime = performance.now();
      const targetX = wrap.clientWidth / 2;
      const targetY = wrap.clientHeight / 2;

      const animationLoop = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = clamp(elapsed / duration);
        const easedProgress = easeInOutCubic(progress);

        const currentX = adjust(easedProgress, 0, 1, startX, targetX);
        const currentY = adjust(easedProgress, 0, 1, startY, targetY);

        updateCardTransform(currentX, currentY, card, wrap);

        if (progress < 1) {
          rafId = requestAnimationFrame(animationLoop);
        }
      };

      rafId = requestAnimationFrame(animationLoop);
    };

    return {
      updateCardTransform,
      createSmoothAnimation,
      cancelAnimation: () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      },
    };
  }, [enableTilt]);

  // Event handlers
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const card = cardRef.current;
      const wrap = wrapRef.current;

      if (!card || !wrap || !animationHandlers) return;

      const rect = card.getBoundingClientRect();
      animationHandlers.updateCardTransform(
        event.clientX - rect.left,
        event.clientY - rect.top,
        card,
        wrap,
      );
    },
    [animationHandlers],
  );

  const handlePointerEnter = useCallback(() => {
    const card = cardRef.current;
    const wrap = wrapRef.current;

    if (!card || !wrap || !animationHandlers) return;

    animationHandlers.cancelAnimation();
    wrap.classList.add('active');
    card.classList.add('active');
  }, [animationHandlers]);

  const handlePointerLeave = useCallback(
    (event: PointerEvent) => {
      const card = cardRef.current;
      const wrap = wrapRef.current;

      if (!card || !wrap || !animationHandlers) return;

      animationHandlers.createSmoothAnimation(
        ANIMATION_CONFIG.SMOOTH_DURATION,
        event.offsetX,
        event.offsetY,
        card,
        wrap,
      );
      wrap.classList.remove('active');
      card.classList.remove('active');
    },
    [animationHandlers],
  );

  // Initialize animations
  useEffect(() => {
    if (!enableTilt || !animationHandlers) return;

    const card = cardRef.current;
    const wrap = wrapRef.current;

    if (!card || !wrap) return;

    const pointerMoveHandler = handlePointerMove as EventListener;
    const pointerEnterHandler = handlePointerEnter as EventListener;
    const pointerLeaveHandler = handlePointerLeave as EventListener;

    card.addEventListener('pointerenter', pointerEnterHandler);
    card.addEventListener('pointermove', pointerMoveHandler);
    card.addEventListener('pointerleave', pointerLeaveHandler);

    const initialX = wrap.clientWidth - ANIMATION_CONFIG.INITIAL_X_OFFSET;
    const initialY = ANIMATION_CONFIG.INITIAL_Y_OFFSET;

    animationHandlers.updateCardTransform(initialX, initialY, card, wrap);
    animationHandlers.createSmoothAnimation(
      ANIMATION_CONFIG.INITIAL_DURATION,
      initialX,
      initialY,
      card,
      wrap,
    );

    return () => {
      card.removeEventListener('pointerenter', pointerEnterHandler);
      card.removeEventListener('pointermove', pointerMoveHandler);
      card.removeEventListener('pointerleave', pointerLeaveHandler);
      animationHandlers.cancelAnimation();
    };
  }, [
    enableTilt,
    animationHandlers,
    handlePointerMove,
    handlePointerEnter,
    handlePointerLeave,
  ]);

  // Card style with agent color
  const cardStyle = useMemo(
    () => ({
      '--behind-gradient': DEFAULT_BEHIND_GRADIENT,
      '--inner-gradient': DEFAULT_INNER_GRADIENT,
    }) as React.CSSProperties,
    [],
  );

  // Action handlers
  const handleChatClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChat?.(agent.agent_id);
  }, [onChat, agent.agent_id]);

  const handleCustomizeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCustomize?.(agent.agent_id);
  }, [onCustomize, agent.agent_id]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  }, []);

  const handleAddToLibraryClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToLibrary?.(agent.agent_id);
  }, [onAddToLibrary, agent.agent_id]);

  const handleCardClick = useCallback(() => {
    if (mode === 'preview') {
      onPreview?.(agent.agent_id);
    } else {
      setShowModal(true);
    }
  }, [mode, onPreview, agent.agent_id]);

  const toolsCount = getToolsCount(agent);

  return (
    <TooltipProvider>
      <div
        ref={wrapRef}
        className={cn(
          'pc-card-wrapper cursor-pointer',
          compact && 'scale-90',
          className
        )}
        style={{ ...cardStyle, ...style }}
        onClick={handleCardClick}
      >
        <section ref={cardRef} className={cn('pc-card', compact && 'h-64')}>
          <div className="pc-inside">
            <div className="pc-shine" />
            <div className="pc-glare" />
            
            {/* Agent Avatar Background */}
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <Star className="h-4 w-4 text-white fill-white" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Default Agent</TooltipContent>
                  </Tooltip>
                )}
                
                {agent.is_public && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <Globe className="h-4 w-4 text-white" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Public Agent</TooltipContent>
                  </Tooltip>
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
            
            {/* Agent Info Overlay */}
            <div className="pc-content">
              <div className="pc-details">
                <h3 className="text-2xl font-bold">{agent.name}</h3>
                <p className="text-sm opacity-90">
                  {agent.description ? truncateDescription(agent.description, 60) : 'AI Agent'}
                </p>
                
                {/* Tools Count */}
                {toolsCount > 0 && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {toolsCount} tool{toolsCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            
            {/* Bottom Action Bar */}
            {showActions && (
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                        <div 
                          className="w-full h-full flex items-center justify-center text-sm"
                          style={{ backgroundColor: agentStyling.color }}
                        >
                          {agentStyling.avatar}
                        </div>
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {agent.name}
                        </div>
                        <div className="text-white/70 text-xs">
                          {mode === 'marketplace' && agent.creator_name 
                            ? `By ${agent.creator_name}`
                            : agent.is_managed ? 'Managed' : 'Personal'
                          }
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="flex gap-2">
                      {mode === 'marketplace' ? (
                        <Button
                          onClick={handleAddToLibraryClick}
                          disabled={isLoading}
                          size="sm"
                          className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                        >
                          {isLoading ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Download className="h-3 w-3 mr-2" />
                              Add
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleChatClick}
                          size="sm"
                          className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                        >
                          <MessageCircle className="h-3 w-3 mr-2" />
                          Chat
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Detailed Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: agentStyling.color }}
              >
                {agentStyling.avatar}
              </div>
              <div>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  {agent.name}
                  {agent.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Default
                    </Badge>
                  )}
                  {agent.is_public && (
                    <Badge variant="outline" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  )}
                  {agent.is_managed && (
                    <Badge variant="secondary" className="text-xs">
                      Managed
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {agent.description || 'No description available'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Agent Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{toolsCount}</div>
                <div className="text-sm text-muted-foreground">Tools</div>
              </div>
              
              {mode === 'marketplace' && (
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{agent.download_count || 0}</div>
                  <div className="text-sm text-muted-foreground">Downloads</div>
                </div>
              )}
              
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{agent.knowledge_bases?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Knowledge</div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-sm font-medium text-primary">
                  {formatDate(agent.created_at)}
                </div>
                <div className="text-sm text-muted-foreground">Created</div>
              </div>
            </div>

            {/* Tags */}
            {agent.tags && agent.tags.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {agent.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      <Tags className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tools */}
            {toolsCount > 0 && (
              <div>
                <h4 className="font-medium mb-2">Available Tools</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {agent.configured_mcps.map(mcp => (
                    <div key={mcp.name} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{mcp.name}</span>
                    </div>
                  ))}
                  {Object.entries(agent.agentpress_tools || {}).map(([name, tool]) => 
                    tool && typeof tool === 'object' && tool.enabled ? (
                      <div key={name} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{name.replace('_', ' ')}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Marketplace Info */}
            {mode === 'marketplace' && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Created by {agent.creator_name}</span>
                  </div>
                  {agent.marketplace_published_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Published {formatDate(agent.marketplace_published_at)}</span>
                    </div>
                  )}
                </div>
                
                {agent.sharing_preferences?.managed_agent && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-blue-900 dark:text-blue-100">
                          Managed Agent
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-200">
                          This agent receives live updates from the creator. You'll always have the latest version.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex gap-2 w-full">
              {mode === 'marketplace' ? (
                <Button 
                  onClick={handleAddToLibraryClick}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                      Adding to Library...
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
                  {agent.is_managed ? (
                    <Button variant="outline" className="flex-1" disabled>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Contact Creator
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleCustomizeClick} className="flex-1">
                      <Wrench className="h-4 w-4 mr-2" />
                      Customize
                    </Button>
                  )}
                  <Button onClick={handleChatClick} className="flex-1">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Start Chat
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{agent.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete?.(agent.agent_id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default AgentProfileCard; 