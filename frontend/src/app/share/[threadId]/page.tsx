'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getMessages,
  getProject,
  getThread,
  Project,
  Message as BaseApiMessageType,
} from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { FileViewerModal } from '@/components/thread/file-viewer-modal';
import {
  ToolCallSidePanel,
  ToolCallInput,
} from '@/components/thread/tool-call-side-panel';
import { ThreadContent } from '@/components/thread/content/ThreadContent';
import {
  PlaybackControls,
  PlaybackController,
} from '@/components/thread/content/PlaybackControls';
import {
  UnifiedMessage,
  ParsedMetadata,
  ThreadParams,
} from '@/components/thread/types';
import { safeJsonParse } from '@/components/thread/utils';
import { useAgentStream } from '@/hooks/useAgentStream';
import { threadErrorCodeMessages } from '@/lib/constants/errorCodeMessages';
import { ThreadSkeleton } from '@/components/thread/content/ThreadSkeleton';
import { useAgent } from '@/hooks/react-query/agents/use-agents';

// Extend the base Message type with the expected database fields
interface ApiMessageType extends BaseApiMessageType {
  message_id?: string;
  thread_id?: string;
  is_llm_message?: boolean;
  metadata?: string;
  created_at?: string;
  updated_at?: string;
}

// Add a simple interface for streaming tool calls
interface StreamingToolCall {
  id?: string;
  name?: string;
  arguments?: string;
  index?: number;
  xml_tag_name?: string;
}

export default function ThreadPage({
  params,
}: {
  params: Promise<ThreadParams>;
}) {
  const unwrappedParams = React.use(params);
  const threadId = unwrappedParams.threadId;

  const router = useRouter();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentRunId, setAgentRunId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<
    'idle' | 'running' | 'connecting' | 'error'
  >('idle');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCallInput[]>([]);
  const [currentToolIndex, setCurrentToolIndex] = useState<number>(0);
  const [autoOpenedPanel, setAutoOpenedPanel] = useState(false);

  // Playback control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [streamingText, setStreamingText] = useState('');
  const [currentToolCall, setCurrentToolCall] =
    useState<StreamingToolCall | null>(null);

  const [externalNavIndex, setExternalNavIndex] = React.useState<number | undefined>(undefined);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const hasInitiallyScrolled = useRef<boolean>(false);

  const [project, setProject] = useState<Project | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [projectName, setProjectName] = useState<string>('');
  const [fileToView, setFileToView] = useState<string | null>(null);

  const initialLoadCompleted = useRef<boolean>(false);
  const messagesLoadedRef = useRef(false);
  const agentRunsCheckedRef = useRef(false);

  const [streamingTextContent, setStreamingTextContent] = useState('');

  const userClosedPanelRef = useRef(false);

  useEffect(() => {
    userClosedPanelRef.current = true;
    setIsSidePanelOpen(false);
  }, []);

  const toggleSidePanel = useCallback(() => {
    setIsSidePanelOpen((prev) => !prev);
  }, []);

  const handleSidePanelNavigate = useCallback((newIndex: number) => {
    setCurrentToolIndex(newIndex);
    console.log(`Tool panel manually set to index ${newIndex}`);
  }, []);

  const handleNewMessageFromStream = useCallback((message: UnifiedMessage) => {
    console.log(
      `[STREAM HANDLER] Received message: ID=${message.message_id}, Type=${message.type}`,
    );
    if (!message.message_id) {
      console.warn(
        `[STREAM HANDLER] Received message is missing ID: Type=${message.type}, Content=${message.content?.substring(0, 50)}...`,
      );
    }

    setMessages((prev) => {
      const messageExists = prev.some(
        (m) => m.message_id === message.message_id,
      );
      if (messageExists) {
        return prev.map((m) =>
          m.message_id === message.message_id ? message : m,
        );
      } else {
        return [...prev, message];
      }
    });

    if (message.type === 'tool') {
      setAutoOpenedPanel(false);
    }
  }, []);

  const handleStreamStatusChange = useCallback(
    (hookStatus: string) => {
      console.log(`[PAGE] Hook status changed: ${hookStatus}`);
      switch (hookStatus) {
        case 'idle':
        case 'completed':
        case 'stopped':
        case 'agent_not_running':
          setAgentStatus('idle');
          setAgentRunId(null);
          setAutoOpenedPanel(false);
          break;
        case 'connecting':
          setAgentStatus('connecting');
          break;
        case 'streaming':
          setAgentStatus('running');
          break;
        case 'error':
          setAgentStatus('error');
          setTimeout(() => {
            setAgentStatus('idle');
            setAgentRunId(null);
          }, 3000);
          break;
      }
    },
    [threadId],
  );

  const handleStreamError = useCallback((errorMessage: string) => {
    console.error(`[PAGE] Stream hook error: ${errorMessage}`);
    toast.error(errorMessage, { duration: 15000 });
  }, []);

  const handleStreamClose = useCallback(() => {
    console.log(`[PAGE] Stream hook closed with final status: ${agentStatus}`);
  }, [agentStatus]);

  // Handle streaming tool calls
  const handleStreamingToolCall = useCallback(
    (toolCall: StreamingToolCall | null) => {
      if (!toolCall) return;

      // Normalize the tool name by replacing underscores with hyphens
      const rawToolName = toolCall.name || toolCall.xml_tag_name || 'Unknown Tool';
      const toolName = rawToolName.replace(/_/g, '-').toLowerCase();

      console.log('[STREAM] Received tool call:', toolName, '(raw:', rawToolName, ')');

      // If user explicitly closed the panel, don't reopen it for streaming calls
      if (userClosedPanelRef.current) return;

      // Create a properly formatted tool call input for the streaming tool
      // that matches the format of historical tool calls
      const toolArguments = toolCall.arguments || '';

      // Format the arguments in a way that matches the expected XML format for each tool
      // This ensures the specialized tool views render correctly
      let formattedContent = toolArguments;
      if (
        toolName.includes('command') &&
        !toolArguments.includes('<execute-command>')
      ) {
        formattedContent = `<execute-command>${toolArguments}</execute-command>`;
      } else if (
        toolName.includes('file') ||
        toolName === 'create-file' ||
        toolName === 'delete-file' ||
        toolName === 'full-file-rewrite'
      ) {
        // For file operations, check if toolArguments contains a file path
        // If it's just a raw file path, format it properly
        const fileOpTags = ['create-file', 'delete-file', 'full-file-rewrite'];
        const matchingTag = fileOpTags.find((tag) => toolName === tag);
        if (matchingTag) {
          // Check if arguments already have the proper XML format
          if (!toolArguments.includes(`<${matchingTag}>`) && !toolArguments.includes('file_path=')) {
            // If toolArguments looks like a raw file path, format it properly
            const filePath = toolArguments.trim();
            if (filePath && !filePath.startsWith('<')) {
              formattedContent = `<${matchingTag} file_path="${filePath}">`;
            } else {
              formattedContent = `<${matchingTag}>${toolArguments}</${matchingTag}>`;
            }
          } else {
            formattedContent = toolArguments;
          }
        }
      }

      const newToolCall: ToolCallInput = {
        assistantCall: {
          name: toolName,  // Use normalized tool name
          content: formattedContent,
          timestamp: new Date().toISOString(),
        },
        // For streaming tool calls, provide empty content that indicates streaming
        toolResult: {
          content: 'STREAMING',
          isSuccess: true,
          timestamp: new Date().toISOString(),
        },
      };

      // Update the tool calls state to reflect the streaming tool
      setToolCalls((prev) => {
        // If the same tool is already being streamed, update it instead of adding a new one
        if (prev.length > 0 && prev[0].assistantCall.name === toolName) {
          return [
            {
              ...prev[0],
              assistantCall: {
                ...prev[0].assistantCall,
                content: formattedContent,
              },
            },
          ];
        }
        return [newToolCall];
      });

      setCurrentToolIndex(0);
      setIsSidePanelOpen(true);
    },
    [],
  );

  useEffect(() => {
    if (!isPlaying || messages.length === 0) return;

    let playbackTimeout: NodeJS.Timeout;

    const playbackNextMessage = async () => {
      if (currentMessageIndex >= messages.length) {
        setIsPlaying(false);
        return;
      }

      const currentMessage = messages[currentMessageIndex];
      console.log(
        `Playing message ${currentMessageIndex}:`,
        currentMessage.type,
        currentMessage.message_id,
      );

      setCurrentMessageIndex((prevIndex) => prevIndex + 1);
    };
    playbackTimeout = setTimeout(playbackNextMessage, 500);

    return () => {
      clearTimeout(playbackTimeout);
    };
  }, [isPlaying, currentMessageIndex, messages]);

  const {
    status: streamHookStatus,
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
    if (agentRunId && agentRunId !== currentHookRunId) {
      console.log(
        `[PAGE] Target agentRunId set to ${agentRunId}, initiating stream...`,
      );
      startStreaming(agentRunId);
    }
  }, [agentRunId, startStreaming, currentHookRunId]);

  // Handle streaming tool calls
  useEffect(() => {
    if (streamingToolCall) {
      handleStreamingToolCall(streamingToolCall);
    }
  }, [streamingToolCall, handleStreamingToolCall]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!initialLoadCompleted.current) setIsLoading(true);
      setError(null);

      try {
        if (!threadId) throw new Error('Thread ID is required');

        const [threadData, messagesData] = await Promise.all([
          getThread(threadId).catch((err) => {
            if (threadErrorCodeMessages[err.code]) {
              setError(threadErrorCodeMessages[err.code]);
            } else {
              throw new Error(err.message);
            }
            return null;
          }),
          getMessages(threadId).catch((err) => {
            console.warn('Failed to load messages:', err);
            return [];
          }),
        ]);

        if (!isMounted) return;

        const projectData = threadData?.project_id
          ? await getProject(threadData.project_id).catch((err) => {
            console.warn('[SHARE] Could not load project data:', err);
            return null;
          })
          : null;

        if (isMounted) {
          if (projectData) {
            setProject(projectData);
            if (typeof projectData.sandbox === 'string') {
              setSandboxId(projectData.sandbox);
            } else if (projectData.sandbox?.id) {
              setSandboxId(projectData.sandbox.id);
            }

            setProjectName(projectData.name || '');
          } else {
            setProjectName('Shared Conversation');
          }

          const unifiedMessages = (messagesData || [])
            .filter((msg) => msg.type !== 'status')
            .map((msg: ApiMessageType) => ({
              message_id: msg.message_id || null,
              thread_id: msg.thread_id || threadId,
              type: (msg.type || 'system') as UnifiedMessage['type'],
              is_llm_message: Boolean(msg.is_llm_message),
              content: msg.content || '',
              metadata: msg.metadata || '{}',
              created_at: msg.created_at || new Date().toISOString(),
              updated_at: msg.updated_at || new Date().toISOString(),
            }));

          setMessages(unifiedMessages);
          const historicalToolPairs: ToolCallInput[] = [];
          const assistantMessages = unifiedMessages.filter(
            (m) => m.type === 'assistant' && m.message_id,
          );

          assistantMessages.forEach((assistantMsg) => {
            const resultMessage = unifiedMessages.find((toolMsg) => {
              if (toolMsg.type !== 'tool' || !toolMsg.metadata || !assistantMsg.message_id) return false;
              try {
                const metadata = safeJsonParse<ParsedMetadata>(toolMsg.metadata, {});
                return metadata.assistant_message_id === assistantMsg.message_id;
              } catch (e) {
                return false;
              }
            });

            if (resultMessage) {
              // Determine tool name from assistant message content
              let toolName = 'unknown';
              try {
                // Parse the assistant content first
                const assistantContent = (() => {
                  try {
                    const parsed = safeJsonParse<{ content?: string }>(assistantMsg.content, {});
                    return parsed.content || assistantMsg.content;
                  } catch {
                    return assistantMsg.content;
                  }
                })();

                // Try to extract tool name from content
                const xmlMatch = assistantContent.match(
                  /<([a-zA-Z\-_]+)(?:\s+[^>]*)?>|<([a-zA-Z\-_]+)(?:\s+[^>]*)?\/>/,
                );
                if (xmlMatch) {
                  // Normalize tool name: replace underscores with hyphens and lowercase
                  const rawToolName = xmlMatch[1] || xmlMatch[2] || 'unknown';
                  toolName = rawToolName.replace(/_/g, '-').toLowerCase();
                } else {
                  // Fallback to checking for tool_calls JSON structure
                  const assistantContentParsed = safeJsonParse<{
                    tool_calls?: Array<{ function?: { name?: string }; name?: string }>;
                  }>(assistantMsg.content, {});
                  if (
                    assistantContentParsed.tool_calls &&
                    assistantContentParsed.tool_calls.length > 0
                  ) {
                    const firstToolCall = assistantContentParsed.tool_calls[0];
                    const rawName = firstToolCall.function?.name || firstToolCall.name || 'unknown';
                    // Normalize tool name here too
                    toolName = rawName.replace(/_/g, '-').toLowerCase();
                  }
                }
              } catch { }

              let isSuccess = true;
              try {
                // Parse tool result content
                const toolResultContent = (() => {
                  try {
                    const parsed = safeJsonParse<{ content?: string }>(resultMessage.content, {});
                    return parsed.content || resultMessage.content;
                  } catch {
                    return resultMessage.content;
                  }
                })();

                // Check for ToolResult pattern first
                if (toolResultContent && typeof toolResultContent === 'string') {
                  // Look for ToolResult(success=True/False) pattern
                  const toolResultMatch = toolResultContent.match(/ToolResult\s*\(\s*success\s*=\s*(True|False|true|false)/i);
                  if (toolResultMatch) {
                    isSuccess = toolResultMatch[1].toLowerCase() === 'true';
                  } else {
                    // Fallback: only check for error keywords if no ToolResult pattern found
                    const toolContent = toolResultContent.toLowerCase();
                    isSuccess = !(toolContent.includes('failed') ||
                      toolContent.includes('error') ||
                      toolContent.includes('failure'));
                  }
                }
              } catch { }

              historicalToolPairs.push({
                assistantCall: {
                  name: toolName,
                  content: assistantMsg.content,  // Store original content
                  timestamp: assistantMsg.created_at,
                },
                toolResult: {
                  content: resultMessage.content,  // Store original content
                  isSuccess: isSuccess,
                  timestamp: resultMessage.created_at,
                },
              });
            }
          });

          // Sort the tool calls chronologically by timestamp
          historicalToolPairs.sort((a, b) => {
            const timeA = new Date(a.assistantCall.timestamp || '').getTime();
            const timeB = new Date(b.assistantCall.timestamp || '').getTime();
            return timeA - timeB;
          });

          setToolCalls(historicalToolPairs);

          // When loading is complete, prepare for playback
          initialLoadCompleted.current = true;
        }
      } catch (err) {
        console.error('Error loading thread data:', err);
        if (isMounted) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load thread';
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [threadId]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollButton(isScrolledUp);
    setUserHasScrolled(isScrolledUp);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Handle tool clicks
  const handleToolClick = useCallback(
    (clickedAssistantMessageId: string | null, clickedToolName: string) => {
      if (!clickedAssistantMessageId) {
        console.warn(
          'Clicked assistant message ID is null. Cannot open side panel.',
        );
        toast.warning('Cannot view details: Assistant message ID is missing.');
        return;
      }

      // Reset user closed state when explicitly clicking a tool
      userClosedPanelRef.current = false;

      console.log(
        '[PAGE] Tool Click Triggered. Assistant Message ID:',
        clickedAssistantMessageId,
        'Tool Name:',
        clickedToolName,
      );

      // Find the index of the tool call associated with the clicked assistant message
      const toolIndex = toolCalls.findIndex((tc) => {
        // Check if the assistant message ID matches the one stored in the tool result's metadata
        if (!tc.toolResult?.content || tc.toolResult.content === 'STREAMING')
          return false; // Skip streaming or incomplete calls

        // Find the original assistant message based on the ID
        const assistantMessage = messages.find(
          (m) =>
            m.message_id === clickedAssistantMessageId &&
            m.type === 'assistant',
        );
        if (!assistantMessage) return false;

        // Find the corresponding tool message using metadata
        const toolMessage = messages.find((m) => {
          if (m.type !== 'tool' || !m.metadata) return false;
          try {
            const metadata = safeJsonParse<ParsedMetadata>(m.metadata, {});
            return (
              metadata.assistant_message_id === assistantMessage.message_id
            );
          } catch {
            return false;
          }
        });

        // Check if the current toolCall 'tc' corresponds to this assistant/tool message pair
        // Compare the original content directly without parsing
        return (
          tc.assistantCall?.content === assistantMessage.content &&
          tc.toolResult?.content === toolMessage?.content
        );
      });

      if (toolIndex !== -1) {
        console.log(
          `[PAGE] Found tool call at index ${toolIndex} for assistant message ${clickedAssistantMessageId}`,
        );
        setExternalNavIndex(toolIndex);
        setCurrentToolIndex(toolIndex);
        setIsSidePanelOpen(true); // Explicitly open the panel

        setTimeout(() => setExternalNavIndex(undefined), 100);
      } else {
        console.warn(
          `[PAGE] Could not find matching tool call in toolCalls array for assistant message ID: ${clickedAssistantMessageId}`,
        );
        toast.info('Could not find details for this tool call.');
      }
    },
    [messages, toolCalls],
  );

  const handleOpenFileViewer = useCallback((filePath?: string, filePathList?: string[]) => {
    if (filePath) {
      setFileToView(filePath);
    } else {
      setFileToView(null);
    }
    setFileViewerOpen(true);
  }, []);

  // Initialize PlaybackControls
  const playbackController: PlaybackController = PlaybackControls({
    messages,
    isSidePanelOpen,
    onToggleSidePanel: toggleSidePanel,
    toolCalls,
    setCurrentToolIndex,
    onFileViewerOpen: handleOpenFileViewer,
    projectName: projectName || 'Shared Conversation',
  });

  // Extract the playback state and functions
  const {
    playbackState,
    renderHeader,
    renderFloatingControls,
    renderWelcomeOverlay,
    togglePlayback,
    resetPlayback,
    skipToEnd,
  } = playbackController;

  // Connect playbackState to component state
  useEffect(() => {
    // Keep the isPlaying state in sync with playbackState
    setIsPlaying(playbackState.isPlaying);
    setCurrentMessageIndex(playbackState.currentMessageIndex);
  }, [playbackState.isPlaying, playbackState.currentMessageIndex]);

  // Auto-scroll when new messages appear during playback
  useEffect(() => {
    if (playbackState.visibleMessages.length > 0 && !userHasScrolled) {
      scrollToBottom('smooth');
    }
  }, [playbackState.visibleMessages, userHasScrolled]);

  // Scroll button visibility
  useEffect(() => {
    if (!latestMessageRef.current || playbackState.visibleMessages.length === 0)
      return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollButton(!entry?.isIntersecting),
      { root: messagesContainerRef.current, threshold: 0.1 },
    );
    observer.observe(latestMessageRef.current);
    return () => observer.disconnect();
  }, [playbackState.visibleMessages, streamingText, currentToolCall]);

  useEffect(() => {
    console.log(
      `[PAGE] 🔄 Page AgentStatus: ${agentStatus}, Hook Status: ${streamHookStatus}, Target RunID: ${agentRunId || 'none'}, Hook RunID: ${currentHookRunId || 'none'}`,
    );

    // If the stream hook reports completion/stopping but our UI hasn't updated
    if (
      (streamHookStatus === 'completed' ||
        streamHookStatus === 'stopped' ||
        streamHookStatus === 'agent_not_running' ||
        streamHookStatus === 'error') &&
      (agentStatus === 'running' || agentStatus === 'connecting')
    ) {
      console.log(
        '[PAGE] Detected hook completed but UI still shows running, updating status',
      );
      setAgentStatus('idle');
      setAgentRunId(null);
      setAutoOpenedPanel(false);
    }
  }, [agentStatus, streamHookStatus, agentRunId, currentHookRunId]);

  // Auto-scroll function for use throughout the component
  const autoScrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (!userHasScrolled && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior });
      }
    },
    [userHasScrolled],
  );

  // Very direct approach to update the tool index during message playback
  useEffect(() => {
    if (!isPlaying || currentMessageIndex <= 0 || !messages.length) return;

    // Check if current message is a tool message
    const currentMsg = messages[currentMessageIndex - 1]; // Look at previous message that just played

    if (currentMsg?.type === 'tool' && currentMsg.metadata) {
      try {
        const metadata = safeJsonParse<ParsedMetadata>(currentMsg.metadata, {});
        const assistantId = metadata.assistant_message_id;

        if (assistantId) {
          // Find the tool call that matches this assistant message
          const toolIndex = toolCalls.findIndex((tc) => {
            // Find the assistant message
            const assistantMessage = messages.find(
              (m) => m.message_id === assistantId && m.type === 'assistant'
            );
            if (!assistantMessage) return false;

            // Check if this tool call matches
            return tc.assistantCall?.content === assistantMessage.content;
          });

          if (toolIndex !== -1) {
            console.log(
              `Direct mapping: Setting tool index to ${toolIndex} for message ${assistantId}`,
            );
            setCurrentToolIndex(toolIndex);
          }
        }
      } catch (e) {
        console.error('Error in direct tool mapping:', e);
      }
    }
  }, [currentMessageIndex, isPlaying, messages, toolCalls]);

  // Force an explicit update to the tool panel based on the current message index
  useEffect(() => {
    // Skip if not playing or no messages
    if (!isPlaying || messages.length === 0 || currentMessageIndex <= 0) return;

    // Get all messages up to the current index
    const currentMessages = messages.slice(0, currentMessageIndex);

    // Find the most recent tool message to determine which panel to show
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const msg = currentMessages[i];
      if (msg.type === 'tool' && msg.metadata) {
        try {
          const metadata = safeJsonParse<ParsedMetadata>(msg.metadata, {});
          const assistantId = metadata.assistant_message_id;

          if (assistantId) {
            console.log(
              `Looking for tool panel for assistant message ${assistantId}`,
            );

            // Scan for matching tool call
            for (let j = 0; j < toolCalls.length; j++) {
              const content = toolCalls[j].assistantCall?.content || '';
              if (content.includes(assistantId)) {
                console.log(
                  `Found matching tool call at index ${j}, updating panel`,
                );
                setCurrentToolIndex(j);
                return;
              }
            }
          }
        } catch (e) {
          console.error('Error parsing tool message metadata:', e);
        }
      }
    }
  }, [currentMessageIndex, isPlaying, messages, toolCalls]);

  // Loading skeleton UI
  if (isLoading && !initialLoadCompleted.current) {
    return (
      <ThreadSkeleton isSidePanelOpen={isSidePanelOpen} showHeader={true} />
    );
  }

  // Error state UI
  if (error) {
    return (
      <div className="flex h-screen">
        <div
          className={`flex flex-col flex-1 overflow-hidden transition-all duration-200 ease-in-out ${isSidePanelOpen ? 'mr-[90%] sm:mr-[450px] md:mr-[500px] lg:mr-[550px] xl:mr-[650px]' : ''}`}
        >
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-[100]">
            <div className="flex h-14 items-center gap-4 px-4">
              <div className="flex-1">
                <span className="text-foreground font-medium">
                  Shared Conversation
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Error</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onClick={() => router.push('/')}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div
        className={`flex flex-col flex-1 overflow-hidden transition-all duration-200 ease-in-out ${isSidePanelOpen ? 'mr-[90%] sm:mr-[450px] md:mr-[500px] lg:mr-[550px] xl:mr-[650px]' : ''}`}
      >
        {renderHeader()}
        <ThreadContent
          messages={messages}
          agentStatus={agentStatus}
          handleToolClick={handleToolClick}
          handleOpenFileViewer={handleOpenFileViewer}
          readOnly={true}
          visibleMessages={playbackState.visibleMessages}
          streamingText={playbackState.streamingText}
          isStreamingText={playbackState.isStreamingText}
          currentToolCall={playbackState.currentToolCall}
          sandboxId={sandboxId || ''}
          project={project}
          isSidePanelOpen={isSidePanelOpen}
          isLeftSidebarOpen={false}
        />
        {renderWelcomeOverlay()}
        {renderFloatingControls()}
      </div>

      <ToolCallSidePanel
        isOpen={isSidePanelOpen}
        onClose={() => {
          setIsSidePanelOpen(false);
          userClosedPanelRef.current = true;
        }}
        toolCalls={toolCalls}
        messages={messages as ApiMessageType[]}
        agentStatus="idle"
        currentIndex={currentToolIndex}
        onNavigate={handleSidePanelNavigate}
        externalNavigateToIndex={externalNavIndex}
        project={project}
        onFileClick={handleOpenFileViewer}
      />

      <FileViewerModal
        open={fileViewerOpen}
        onOpenChange={setFileViewerOpen}
        sandboxId={sandboxId || ''}
        initialFilePath={fileToView}
        project={project}
      />
    </div>
  );
}
