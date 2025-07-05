'use client';

import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ChatInput,
  ChatInputHandles,
} from '@/components/thread/chat-input/chat-input';
import { BillingError } from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBillingError } from '@/hooks/useBillingError';
import { BillingErrorAlert } from '@/components/billing/usage-limit-alert';
import { useAccounts } from '@/hooks/use-accounts';
import { config } from '@/lib/config';
import { useInitiateAgentWithInvalidation } from '@/hooks/react-query/dashboard/use-initiate-agent';
import { ModalProviders } from '@/providers/modal-providers';
import { AgentSelector } from '@/components/dashboard/agent-selector';
import { cn } from '@/lib/utils';
import { useModal } from '@/hooks/use-modal-store';
import { Examples } from './suggestions/examples';
import { useThreadQuery } from '@/hooks/react-query/threads/use-threads';
import { normalizeFilenameToNFC } from '@/lib/utils/unicode';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { TypingText } from '@/components/animate-ui/text/typing';
import { GradientText } from '@/components/animate-ui/text/gradient';
import { useAgents } from '@/hooks/react-query/agents/use-agents';
import { isFlagEnabled } from '@/lib/feature-flags';
import Waves from '@/Backgrounds/Waves/Waves';
import { HexagonBackground } from '@/components/animate-ui/backgrounds/hexagon';
import { VantaWaves } from '@/components/animate-ui/backgrounds/vanta-waves';
import { Novatrix } from '@/components/eldoraui/novatrix';
import { useTheme } from 'next-themes';

const PENDING_PROMPT_KEY = 'pendingAgentPrompt';

// Utility function to get time-based greeting
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

export function DashboardContent() {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isLoadingUserName, setIsLoadingUserName] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [initiatedThreadId, setInitiatedThreadId] = useState<string | null>(
    null,
  );
  const [customAgentEnabled, setCustomAgentEnabled] = useState(false);
  
  // Animation state
  const [showChatInput, setShowChatInput] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [greetingComplete, setGreetingComplete] = useState(false);
  
  // Background selection
  const [backgroundType, setBackgroundType] = useState<'waves' | 'hexagon' | 'vanta' | 'novatrix'>('waves');
  const { billingError, handleBillingError, clearBillingError } =
    useBillingError();
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const { data: accounts } = useAccounts();
  const personalAccount = accounts?.find((account) => account.personal_account);
  const chatInputRef = useRef<ChatInputHandles>(null);
  const initiateAgentMutation = useInitiateAgentWithInvalidation();
  const { onOpen } = useModal();

  const threadQuery = useThreadQuery(initiatedThreadId || '');
  
  // Get agents to access selected agent's name
  const { data: agentsResponse } = useAgents({
    limit: 100,
    sort_by: 'name',
    sort_order: 'asc'
  });
  
  const agents = agentsResponse?.agents || [];
  const selectedAgent = agents?.find(a => a.agent_id === selectedAgentId);
  const defaultAgent = agents?.find(a => a.is_default);
  
  // Set default agent if no agent is selected
  useEffect(() => {
    if (!selectedAgentId && defaultAgent && agents.length > 0) {
      setSelectedAgentId(defaultAgent.agent_id);
    }
  }, [selectedAgentId, defaultAgent, agents.length]);

  // Trigger cascade animation after greeting completes
  useEffect(() => {
    if (!isLoadingUserName) {
      // Calculate total greeting animation time
      const firstTextLength = `Hey ${userName || 'there'}, I'm`.length;
      const secondTextLength = `What would you like to do this ${getTimeBasedGreeting()}?`.length;
      
      const firstAnimationTime = 400 + (firstTextLength * 50); // delay + duration per char
      const secondAnimationTime = 2000 + (secondTextLength * 80); // delay + duration per char
      
      const totalGreetingTime = Math.max(firstAnimationTime, secondAnimationTime) + 500; // Add buffer
      
      const timer = setTimeout(() => {
        setGreetingComplete(true);
        
        // Cascade chat input after greeting
        setTimeout(() => {
          setShowChatInput(true);
          
          // Cascade examples after chat input
          setTimeout(() => {
            setShowExamples(true);
          }, 400); // Stagger for cascade effect
        }, 300); // Small delay after greeting
      }, totalGreetingTime);

      return () => clearTimeout(timer);
    }
  }, [isLoadingUserName, userName]);

  // Check custom agent flag
  useEffect(() => {
    const checkFlag = async () => {
      const enabled = await isFlagEnabled('custom_agents');
      setCustomAgentEnabled(enabled);
    };
    checkFlag();
  }, []);

  // Random background selection on mount
  useEffect(() => {
    let backgrounds: string[];
    
    if (resolvedTheme === 'dark') {
      // Dark mode: waves, vanta, and novatrix
      backgrounds = ['waves', 'vanta', 'novatrix'];
    } else {
      // Light mode: waves, hexagon, and novatrix
      backgrounds = ['waves', 'hexagon', 'novatrix'];
    }
    
    const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)] as 'waves' | 'hexagon' | 'vanta' | 'novatrix';
    setBackgroundType(randomBg);
  }, [resolvedTheme]);

  // Load user name from Supabase auth and listen for changes
  useEffect(() => {
    const supabase = createClient();
    
    const loadUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const name = user?.user_metadata?.name;
        if (name) {
          setUserName(name);
          setNameInput(name);
        }
      } catch (error) {
        console.error('Error loading user name:', error);
      } finally {
        setIsLoadingUserName(false);
      }
    };

    // Load initial user name
    loadUserName();

    // Listen for auth state changes (including user metadata updates)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
          const name = session?.user?.user_metadata?.name;
          if (name) {
            setUserName(name);
            setNameInput(name);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const agentIdFromUrl = searchParams.get('agent_id');
    if (agentIdFromUrl && agentIdFromUrl !== selectedAgentId) {
      setSelectedAgentId(agentIdFromUrl);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('agent_id');
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, selectedAgentId, router]);

  // Handle meeting attachment
  useEffect(() => {
    const attachMeetingId = searchParams.get('attachMeeting');
    if (attachMeetingId) {
      // Load meeting transcript and attach it as a file
      import('@/lib/api-meetings').then(async ({ getMeeting }) => {
        try {
          const meeting = await getMeeting(attachMeetingId);
          if (meeting.transcript) {
            // Format transcript with enhanced metadata header
            const createdAt = new Date(meeting.created_at);
            const now = new Date();
            const formattedTranscript = `Meeting Transcript

MEETING INFORMATION:
- Title: ${meeting.title}
- Meeting Created: ${createdAt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })} at ${createdAt.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
- File Generated: ${now.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })} at ${now.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}

FULL TRANSCRIPT:
${meeting.transcript || '(No transcript available)'}`;

            console.log(
              'Formatted transcript for operator:',
              formattedTranscript.substring(0, 500) + '...',
            );

            // Create a file from the formatted transcript
            const blob = new Blob([formattedTranscript], {
              type: 'text/plain',
            });
            const file = new File([blob], `${meeting.title}_transcript.txt`, {
              type: 'text/plain',
            });

            // Add file to chat input
            if (chatInputRef.current) {
              chatInputRef.current.addExternalFile(file);
            }

            // Set initial prompt
            setInputValue(
              `I have a meeting transcript from "${meeting.title}". Please help me analyze it.`,
            );

            // Remove the query parameter
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('attachMeeting');
            router.replace(newUrl.pathname + newUrl.search, { scroll: false });
          }
        } catch (error) {
          console.error('Error loading meeting:', error);
        }
      });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (threadQuery.data && initiatedThreadId) {
      const thread = threadQuery.data;
      console.log('Thread data received:', thread);
      if (thread.project_id) {
        router.push(
          `/projects/${thread.project_id}/thread/${initiatedThreadId}`,
        );
      } else {
        router.push(`/agents/${initiatedThreadId}`);
      }
      setInitiatedThreadId(null);
    }
  }, [threadQuery.data, initiatedThreadId, router]);

  const secondaryGradient =
    'bg-gradient-to-r from-blue-500 to-blue-500 bg-clip-text text-transparent';

  // Dynamic wave colors based on theme - subtle gray lines for less jarring effect
  const isDark = resolvedTheme === 'dark';
  const waveColors = {
    lineColor: isDark ? '#666666' : '#888888',
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { name: trimmed },
      });

      if (error) {
        toast.error('Failed to save name: ' + error.message);
        return;
      }

      setUserName(trimmed);
      setIsNameFocused(false);
      toast.success(`Nice to meet you, ${trimmed}! 🎉`);
    } catch (error) {
      toast.error('Failed to save name');
      console.error('Error saving name:', error);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    }
    if (e.key === 'Escape') {
      setIsNameFocused(false);
      setNameInput('');
    }
  };

  const handleSubmit = async (
    message: string,
    options?: {
      model_name?: string;
      enable_thinking?: boolean;
      reasoning_effort?: string;
      stream?: boolean;
      enable_context_manager?: boolean;
    },
  ) => {
    if (
      (!message.trim() && !chatInputRef.current?.getPendingFiles().length) ||
      isSubmitting
    )
      return;

    setIsSubmitting(true);

    try {
      const files = chatInputRef.current?.getPendingFiles() || [];
      localStorage.removeItem(PENDING_PROMPT_KEY);

      const formData = new FormData();
      formData.append('prompt', message);

      // Add selected agent if one is chosen
      if (selectedAgentId) {
        formData.append('agent_id', selectedAgentId);
      }

      files.forEach((file, index) => {
        const normalizedName = normalizeFilenameToNFC(file.name);
        formData.append('files', file, normalizedName);
      });

      if (options?.model_name)
        formData.append('model_name', options.model_name);
      formData.append(
        'enable_thinking',
        String(options?.enable_thinking ?? false),
      );
      formData.append('reasoning_effort', options?.reasoning_effort ?? 'low');
      formData.append('stream', String(options?.stream ?? true));
      formData.append(
        'enable_context_manager',
        String(options?.enable_context_manager ?? false),
      );
      if (userName) {
        formData.append('user_name', userName);
      }

      console.log('FormData content:', Array.from(formData.entries()));

      const result = await initiateAgentMutation.mutateAsync(formData);
      console.log('Agent initiated:', result);

      if (result.thread_id) {
        setInitiatedThreadId(result.thread_id);
      } else {
        throw new Error('Agent initiation did not return a thread_id.');
      }
      chatInputRef.current?.clearPendingFiles();
    } catch (error: any) {
      console.error('Error during submission process:', error);
      if (error instanceof BillingError) {
        console.log('Handling BillingError:', error.detail);
        onOpen('paymentRequiredDialog');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const pendingPrompt = localStorage.getItem(PENDING_PROMPT_KEY);

      if (pendingPrompt) {
        setInputValue(pendingPrompt);
        setAutoSubmit(true);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (autoSubmit && inputValue && !isSubmitting) {
      const timer = setTimeout(() => {
        handleSubmit(inputValue);
        setAutoSubmit(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [autoSubmit, inputValue, isSubmitting]);

  // Render background based on selection
  const renderBackground = () => {
    switch (backgroundType) {
      case 'hexagon':
        return <HexagonBackground className="absolute inset-0" />;
      case 'vanta':
        return <VantaWaves className="absolute inset-0" />;
      case 'novatrix':
        return <div className="absolute inset-0"><Novatrix /></div>;
      case 'waves':
      default:
        return (
          <Waves
            lineColor={waveColors.lineColor}
            backgroundColor={waveColors.backgroundColor}
            waveSpeedX={0.02}
            waveSpeedY={0.01}
            waveAmpX={40}
            waveAmpY={20}
            xGap={12}
            yGap={36}
            friction={0.9}
            tension={0.01}
            maxCursorMove={120}
          />
        );
    }
  };

  return (
    <>
      <ModalProviders />
      <div className="flex flex-col h-screen w-full relative">
        {/* Dynamic Background */}
        {renderBackground()}
        
        {isMobile && (
          <div className="absolute top-4 left-4 z-20">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setOpenMobile(true)}
                >
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open menu</TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] max-w-[95%] z-10 relative">
          {/* Liquid Glass Background Container */}
          <motion.div 
            className="relative group"
            initial={{ 
              scale: 0.9, 
              opacity: 0, 
              y: 30,
              filter: "blur(20px)"
            }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              filter: "blur(0px)"
            }}
            transition={{ 
              duration: 1.2, 
              ease: [0.16, 1, 0.3, 1],
              type: "spring",
              stiffness: 80,
              damping: 20
            }}
          >
            {/* Glass Morphism Background */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-background/85 via-background/70 to-background/85 backdrop-blur-xl rounded-3xl border border-white/15 dark:border-white/8 shadow-2xl dark:shadow-black/30"
              animate={{ 
                height: greetingComplete ? 'auto' : 'auto'
              }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
            
            {/* Enhanced Inner Glow */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-white/8 rounded-3xl"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Animated Gradient Border */}
            <motion.div 
              className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl"
              animate={{ 
                background: [
                  "linear-gradient(90deg, rgba(59,130,246,0.2) 0%, rgba(168,85,247,0.2) 50%, rgba(236,72,153,0.2) 100%)",
                  "linear-gradient(90deg, rgba(168,85,247,0.2) 0%, rgba(236,72,153,0.2) 50%, rgba(59,130,246,0.2) 100%)",
                  "linear-gradient(90deg, rgba(236,72,153,0.2) 0%, rgba(59,130,246,0.2) 50%, rgba(168,85,247,0.2) 100%)"
                ]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Main Content Container */}
            <div className="relative flex flex-col items-center px-8 pt-8 pb-12 rounded-3xl overflow-hidden">
              {/* Greeting Section */}
              <motion.div 
                className="flex flex-col items-center text-center w-full"
                initial={{ y: 0 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                {isLoadingUserName ? (
                  <div className="flex flex-col items-center gap-4 justify-center">
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <Skeleton className="h-10 w-48 sm:h-8 sm:w-40" />
                      <Skeleton className="h-10 w-32 sm:h-8 sm:w-28" />
                    </div>
                    <Skeleton className="h-8 w-64 sm:h-7 sm:w-56" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 justify-center">
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <TypingText
                        text={`Hey ${userName || 'there'}, I'm`}
                        className="tracking-tight text-4xl text-muted-foreground leading-tight"
                        duration={60}
                        delay={400}
                      />
                      {customAgentEnabled ? (
                        <AgentSelector
                          selectedAgentId={selectedAgentId}
                          onAgentSelect={setSelectedAgentId}
                          variant="heading"
                        />
                      ) : (
                        <span className="tracking-tight text-4xl text-foreground leading-tight font-medium">
                          {selectedAgent?.name || defaultAgent?.name || 'Operator'}
                        </span>
                      )}
                    </div>
                    
                    <TypingText
                      text={`What would you like to do this ${getTimeBasedGreeting()}?`}
                      className="tracking-tight text-3xl font-normal text-muted-foreground/80"
                      duration={60} // Animation speed: milliseconds per character for typing effect
                      delay={1500} // Wait time: milliseconds before starting the typing animation
                    />
                    
                    {/* Name editing section for users without a name */}
                    {!userName && (
                      <div className="relative mt-4">
                        {!isNameFocused ? (
                          <button
                            onClick={() => setIsNameFocused(true)}
                            className="tracking-tight text-2xl text-muted-foreground hover:text-foreground leading-tight underline decoration-dashed underline-offset-4 transition-colors duration-200"
                          >
                            Click here to set your name
                          </button>
                        ) : (
                          <div className="relative">
                            <Input
                              value={nameInput}
                              onChange={(e) => setNameInput(e.target.value)}
                              onKeyDown={handleNameKeyDown}
                              onBlur={() => {
                                if (!nameInput.trim()) {
                                  setIsNameFocused(false);
                                }
                              }}
                              placeholder="your name"
                              className="h-12 w-40 text-2xl text-center font-medium bg-transparent border-0 border-b-2 border-muted-foreground/30 focus:border-primary rounded-none shadow-none focus:shadow-none transition-colors duration-200 px-0"
                              autoFocus
                            />
                            {nameInput.trim() && (
                              <button
                                onClick={handleSaveName}
                                className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 rounded-full bg-primary hover:bg-primary/90 transition-colors duration-200"
                              >
                                <Check className="h-4 w-4 text-primary-foreground" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Chat Input Section */}
              {showChatInput && (
                <motion.div 
                  className={cn('w-full', 'max-w-full', 'sm:max-w-3xl')}
                  initial={{ 
                    y: 112, 
                    opacity: 0, 
                    scale: 0.92,
                    filter: "blur(8px)"
                  }}
                  animate={{ 
                    y: 32, 
                    opacity: 1, 
                    scale: 1,
                    filter: "blur(0px)"
                  }}
                  transition={{ 
                    duration: 1.2, 
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                >
                  <ChatInput
                    ref={chatInputRef}
                    onSubmit={handleSubmit}
                    loading={isSubmitting}
                    placeholder="Describe what you need help with..."
                    value={inputValue}
                    onChange={setInputValue}
                    hideAttachments={false}
                  />
                </motion.div>
              )}

              {/* Examples Section */}
              {showExamples && (
                <motion.div 
                  className="w-full"
                  initial={{ 
                    y: 124, 
                    opacity: 0, 
                    scale: 0.85,
                    filter: "blur(15px)"
                  }}
                  animate={{ 
                    y: 24, 
                    opacity: 1, 
                    scale: 1,
                    filter: "blur(0px)"
                  }}
                  transition={{ 
                    duration: 1.8, 
                    ease: [0.16, 1, 0.3, 1]
                  }}
                >
                  <Examples onSelectPrompt={setInputValue} />
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="relative z-20">
          <BillingErrorAlert
            message={billingError?.message}
            currentUsage={billingError?.currentUsage}
            limit={billingError?.limit}
            accountId={personalAccount?.account_id}
            onDismiss={clearBillingError}
            isOpen={!!billingError}
          />
        </div>
      </div>
    </>
  );
}
