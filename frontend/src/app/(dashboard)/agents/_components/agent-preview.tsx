import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getAgentAvatar } from '../_utils/get-agent-style';
import {
  ChatInput,
  ChatInputHandles
} from '@/components/thread/chat-input/chat-input';
import { ThreadContent } from '@/components/thread/content/ThreadContent';
import { UnifiedMessage } from '@/components/thread/types';
import { useInitiateAgentWithInvalidation } from '@/hooks/react-query/dashboard/use-initiate-agent';
import { useAgentStream } from '@/hooks/useAgentStream';
import { useAddUserMessageMutation } from '@/hooks/react-query/threads/use-messages';
import { useStartAgentMutation, useStopAgentMutation } from '@/hooks/react-query/threads/use-agent-run';
import { BillingError } from '@/lib/api';
import { normalizeFilenameToNFC } from '@/lib/utils/unicode';
import { createClient } from '@/lib/supabase/client';
import { useAgentStatus } from '@/contexts/AgentStatusContext';

interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  configured_mcps: Array<{ name: string; qualifiedName: string; config: any; enabledTools?: string[] }>;
  agentpress_tools: Record<string, { enabled: boolean; description: string }>;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AgentPreviewProps {
  agent: Agent;
}

export const AgentPreview = ({ agent }: AgentPreviewProps) => {
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [agentRunId, setAgentRunId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'connecting' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStartedConversation, setHasStartedConversation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputHandles>(null);

  const getAgentStyling = () => {
    const agentData = agent as any;
    if (agentData.avatar && agentData.avatar_color) {
      return {
        avatar: agentData.avatar,
        color: agentData.avatar_color,
      };
    }
    return getAgentAvatar(agent.agent_id);
  };

  const { avatar, color } = getAgentStyling();

  const initiateAgentMutation = useInitiateAgentWithInvalidation();
  const addUserMessageMutation = useAddUserMessageMutation();
  const startAgentMutation = useStartAgentMutation();
  const stopAgentMutation = useStopAgentMutation();
  const { updateThreadStatus } = useAgentStatus();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewMessageFromStream = useCallback((message: UnifiedMessage) => {
    console.log(`[PREVIEW STREAM] Received message: ID=${message.message_id}, Type=${message.type}`);

    setMessages((prev) => {
      const messageExists = prev.some((m) => m.message_id === message.message_id);
      if (messageExists) {
        return prev.map((m) => m.message_id === message.message_id ? message : m);
      } else {
        return [...prev, message];
      }
    });
  }, []);

  const handleStreamStatusChange = useCallback((hookStatus: string) => {
    console.log(`[PREVIEW] Stream status changed: ${hookStatus}`);
    switch (hookStatus) {
      case 'idle':
        setAgentStatus('idle');
        setAgentRunId(null);
        if (threadId) updateThreadStatus(threadId, 'idle');
        break;
      case 'completed':
        setAgentStatus('idle');
        setAgentRunId(null);
        if (threadId) updateThreadStatus(threadId, 'completed');
        break;
      case 'stopped':
      case 'agent_not_running':
      case 'error':
      case 'failed':
        setAgentStatus('idle');
        setAgentRunId(null);
        if (threadId) updateThreadStatus(threadId, 'idle');
        break;
      case 'connecting':
        setAgentStatus('connecting');
        if (threadId) updateThreadStatus(threadId, 'connecting');
        break;
      case 'streaming':
        setAgentStatus('running');
        if (threadId) updateThreadStatus(threadId, 'running');
        break;
    }
  }, [threadId, updateThreadStatus]);

  const handleStreamError = useCallback((errorMessage: string) => {
    console.error(`[PREVIEW] Stream error: ${errorMessage}`);
    if (!errorMessage.toLowerCase().includes('not found') &&
      !errorMessage.toLowerCase().includes('agent run is not running')) {
      toast.error(`Stream Error: ${errorMessage}`);
    }
  }, []);

  const handleStreamClose = useCallback(() => {
    console.log(`[PREVIEW] Stream closed`);
  }, []);

  const {
    status: streamHookStatus,
    textContent: streamingTextContent,
    toolCall: streamingToolCall,
    error: streamError,
    agentRunId: currentHookRunId,
    startStreaming,
    stopStreaming,
  } = useAgentStream(
    {
      onMessage: handleNewMessageFromStream,
      onStatusChange: handleStreamStatusChange,
      onError: handleStreamError,
      onClose: handleStreamClose,
    },
    threadId,
    setMessages,
  );

  useEffect(() => {
    if (agentRunId && agentRunId !== currentHookRunId && threadId) {
      console.log(`[PREVIEW] Starting stream for agentRunId: ${agentRunId}, threadId: ${threadId}`);
      startStreaming(agentRunId);
    }
  }, [agentRunId, startStreaming, currentHookRunId, threadId]);

  useEffect(() => {
    console.log('[PREVIEW] State update:', {
      threadId,
      agentRunId,
      currentHookRunId,
      agentStatus,
      streamHookStatus,
      messagesCount: messages.length,
      hasStartedConversation
    });
  }, [threadId, agentRunId, currentHookRunId, agentStatus, streamHookStatus, messages.length, hasStartedConversation]);

  useEffect(() => {
    if (streamingTextContent) {
      scrollToBottom();
    }
  }, [streamingTextContent]);

  const handleSubmitFirstMessage = async (
    message: string,
    options?: {
      model_name?: string;
      enable_thinking?: boolean;
      reasoning_effort?: string;
      stream?: boolean;
      enable_context_manager?: boolean;
    },
  ) => {
    if (!message.trim() && !chatInputRef.current?.getPendingFiles().length) return;

    setIsSubmitting(true);
    setHasStartedConversation(true);

    try {
      const files = chatInputRef.current?.getPendingFiles() || [];

      const formData = new FormData();
      formData.append('prompt', message);
      formData.append('agent_id', agent.agent_id);

      files.forEach((file, index) => {
        const normalizedName = normalizeFilenameToNFC(file.name);
        formData.append('files', file, normalizedName);
      });

      if (options?.model_name) formData.append('model_name', options.model_name);
      formData.append('enable_thinking', String(options?.enable_thinking ?? false));
      formData.append('reasoning_effort', options?.reasoning_effort ?? 'low');
      formData.append('stream', String(options?.stream ?? true));
      formData.append('enable_context_manager', String(options?.enable_context_manager ?? false));

      console.log('[PREVIEW] Initiating agent...');
      const result = await initiateAgentMutation.mutateAsync(formData);
      console.log('[PREVIEW] Agent initiated:', result);

      if (result.thread_id) {
        setThreadId(result.thread_id);
        if (result.agent_run_id) {
          console.log('[PREVIEW] Setting agent run ID:', result.agent_run_id);
          setAgentRunId(result.agent_run_id);
        } else {
          console.log('[PREVIEW] No agent_run_id in result, starting agent manually...');
          try {
            // Get user name from Supabase auth
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const userName = user?.user_metadata?.name;

            const agentResult = await startAgentMutation.mutateAsync({
              threadId: result.thread_id,
              options: { ...options, user_name: userName || undefined }
            });
            console.log('[PREVIEW] Agent started manually:', agentResult);
            setAgentRunId(agentResult.agent_run_id);
          } catch (startError) {
            console.error('[PREVIEW] Error starting agent manually:', startError);
            toast.error('Failed to start agent');
          }
        }
        const userMessage: UnifiedMessage = {
          message_id: `user-${Date.now()}`,
          thread_id: result.thread_id,
          type: 'user',
          is_llm_message: false,
          content: message,
          metadata: '{}',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setMessages([userMessage]);
      }

      chatInputRef.current?.clearPendingFiles();
      setInputValue('');
    } catch (error: any) {
      console.error('[PREVIEW] Error during initiation:', error);
      if (error instanceof BillingError) {
        toast.error('Billing limit reached. Please upgrade your plan.');
      } else {
        toast.error('Failed to start conversation');
      }
      setHasStartedConversation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMessage = useCallback(
    async (
      message: string,
      options?: { model_name?: string; enable_thinking?: boolean },
    ) => {
      if (!message.trim() || !threadId) return;
      setIsSubmitting(true);

      const optimisticUserMessage: UnifiedMessage = {
        message_id: `temp-${Date.now()}`,
        thread_id: threadId,
        type: 'user',
        is_llm_message: false,
        content: message,
        metadata: '{}',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMessage]);
      setInputValue('');

      try {
        const messagePromise = addUserMessageMutation.mutateAsync({
          threadId,
          message
        });

        // Get user name from Supabase auth
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userName = user?.user_metadata?.name;

        const agentPromise = startAgentMutation.mutateAsync({
          threadId,
          options: { ...options, user_name: userName || undefined }
        });

        const results = await Promise.allSettled([messagePromise, agentPromise]);

        if (results[0].status === 'rejected') {
          throw new Error(`Failed to send message: ${results[0].reason?.message || results[0].reason}`);
        }

        if (results[1].status === 'rejected') {
          const error = results[1].reason;
          if (error instanceof BillingError) {
            toast.error('Billing limit reached. Please upgrade your plan.');
            setMessages(prev => prev.filter(m => m.message_id !== optimisticUserMessage.message_id));
            return;
          }
          throw new Error(`Failed to start agent: ${error?.message || error}`);
        }

        const agentResult = results[1].value;
        setAgentRunId(agentResult.agent_run_id);

      } catch (err) {
        console.error('[PREVIEW] Error sending message:', err);
        toast.error(err instanceof Error ? err.message : 'Operation failed');
        setMessages((prev) => prev.filter((m) => m.message_id !== optimisticUserMessage.message_id));
      } finally {
        setIsSubmitting(false);
      }
    },
    [threadId, addUserMessageMutation, startAgentMutation],
  );

  const handleStopAgent = useCallback(async () => {
    console.log('[PREVIEW] Stopping agent...');
    setAgentStatus('idle');
    await stopStreaming();

    if (agentRunId) {
      try {
        await stopAgentMutation.mutateAsync(agentRunId);
      } catch (error) {
        console.error('[PREVIEW] Error stopping agent:', error);
      }
    }
  }, [stopStreaming, agentRunId, stopAgentMutation]);

  const handleToolClick = useCallback((assistantMessageId: string | null, toolName: string) => {
    console.log('[PREVIEW] Tool clicked:', toolName);
    toast.info(`Tool: ${toolName} (Preview mode - tool details not available)`);
  }, []);


  return (
    <div className="h-full flex flex-col bg-muted dark:bg-muted/30">
      <div className="flex-shrink-0 flex items-center gap-3 p-8">
        <div
          className="h-10 w-10 flex items-center justify-center rounded-lg text-lg"
          style={{ backgroundColor: color }}
        >
          {avatar}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{agent.name || 'Unnamed Agent'}</h3>
        </div>
        <Badge variant="highlight" className="text-sm">Preview Mode</Badge>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto scrollbar-hide">
          <ThreadContent
            messages={messages}
            streamingTextContent={streamingTextContent}
            streamingToolCall={streamingToolCall}
            agentStatus={agentStatus}
            handleToolClick={handleToolClick}
            handleOpenFileViewer={() => { }}
            streamHookStatus={streamHookStatus}
            isPreviewMode={true}
            agentName={agent.name}
            agentAvatar={avatar}
            isSidePanelOpen={false}
            isAgentBuilder={true}
            emptyStateComponent={
              <div className="flex flex-col items-center text-center text-muted-foreground/80">
                <div className="flex w-20 aspect-square items-center justify-center rounded-2xl bg-muted-foreground/10 p-4 mb-4">
                  <div className="text-4xl">{avatar}</div>
                </div>
                <p className='w-[60%] text-2xl'>Start conversation with your new agent <span className='text-primary/80 font-semibold'>{agent.name}</span></p>
              </div>
            }
          />
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="flex-shrink-0">
        <div className="p-0 md:p-4 md:px-10">
          <ChatInput
            ref={chatInputRef}
            onSubmit={threadId ? handleSubmitMessage : handleSubmitFirstMessage}
            loading={isSubmitting}
            placeholder={`Message ${agent.name || 'agent'}...`}
            value={inputValue}
            onChange={setInputValue}
            disabled={isSubmitting}
            isAgentRunning={agentStatus === 'running' || agentStatus === 'connecting'}
            onStopAgent={handleStopAgent}
            agentName={agent.name}
            hideAttachments={true}
            bgColor='bg-muted-foreground/10'

          />
        </div>
      </div>
    </div>
  );
};