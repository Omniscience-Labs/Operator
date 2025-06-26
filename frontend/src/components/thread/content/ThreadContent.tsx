import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, CircleDashed, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import { ThreeSpinner } from '@/components/ui/three-spinner';
import { UnifiedMessage, ParsedContent, ParsedMetadata } from '@/components/thread/types';
import { FileAttachmentGrid } from '@/components/thread/file-attachment';
import { useFilePreloader, FileCache } from '@/hooks/react-query/files';
import { useAuth } from '@/components/AuthProvider';
import { Project } from '@/lib/api';
import {
    extractPrimaryParam,
    getToolIcon,
    getUserFriendlyToolName,
    safeJsonParse,
} from '@/components/thread/utils';
import { OmniLogo } from '@/components/sidebar/omni-logo';
import { AgentLoader } from './loader';
import { parseXmlToolCalls, isNewXmlFormat, extractToolNameFromStream } from '@/components/thread/tool-views/xml-parser';
import { parseToolResult } from '@/components/thread/tool-views/tool-result-parser';

// Define the set of  tags whose raw XML should be hidden during streaming
const HIDE_STREAMING_XML_TAGS = new Set([
    'execute-command',
    'create-file',
    'delete-file',
    'full-file-rewrite',
    'str-replace',
    'browser-click-element',
    'browser-close-tab',
    'browser-drag-drop',
    'browser-get-dropdown-options',
    'browser-go-back',
    'browser-input-text',
    'browser-navigate-to',
    'browser-scroll-down',
    'browser-scroll-to-text',
    'browser-scroll-up',
    'browser-select-dropdown-option',
    'browser-send-keys',
    'browser-switch-tab',
    'browser-wait',
    'deploy',
    'ask',
    'complete',
    'crawl-webpage',
    'web-search',
    'see-image',
    'call-mcp-tool',

    'execute_data_provider_call',
    'execute_data_provider_endpoint',

    'execute-data-provider-call',
    'execute-data-provider-endpoint',
]);

// Helper function to render attachments (keeping original implementation for now)
export function renderAttachments(attachments: string[], fileViewerHandler?: (filePath?: string, filePathList?: string[]) => void, sandboxId?: string, project?: Project) {
    if (!attachments || attachments.length === 0) return null;

    // Note: Preloading is now handled by React Query in the main ThreadContent component
    // to avoid duplicate requests with different content types

    return <FileAttachmentGrid
        attachments={attachments}
        onFileClick={fileViewerHandler}
        showPreviews={true}
        sandboxId={sandboxId}
        project={project}
    />;
}

// Render Markdown content while preserving XML tags that should be displayed as tool calls
export function renderMarkdownContent(
    content: string,
    handleToolClick: (assistantMessageId: string | null, toolName: string) => void,
    messageId: string | null,
    fileViewerHandler?: (filePath?: string, filePathList?: string[]) => void,
    sandboxId?: string,
    project?: Project,
    debugMode?: boolean
) {
    // If in debug mode, just display raw content in a pre tag
    if (debugMode) {
        return (
            <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30 text-foreground">
                {content}
            </pre>
        );
    }

    // Check if content contains the new Cursor-style format
    if (isNewXmlFormat(content)) {
        const contentParts: React.ReactNode[] = [];
        let lastIndex = 0;
        
        // Find all function_calls blocks
        const functionCallsRegex = /<function_calls>([\s\S]*?)<\/function_calls>/gi;
        let match;
        
        while ((match = functionCallsRegex.exec(content)) !== null) {
            // Add text before the function_calls block
            if (match.index > lastIndex) {
                const textBeforeBlock = content.substring(lastIndex, match.index);
                if (textBeforeBlock.trim()) {
                    contentParts.push(
                        <Markdown key={`md-${lastIndex}`} className="text-sm prose prose-sm dark:prose-invert chat-markdown max-w-none break-words">
                            {textBeforeBlock}
                        </Markdown>
                    );
                }
            }
            
            // Parse the tool calls in this block
            const toolCalls = parseXmlToolCalls(match[0]);
            
            toolCalls.forEach((toolCall, index) => {
                const toolName = toolCall.functionName.replace(/_/g, '-');
                
                if (toolName === 'ask') {
                    // Handle ask tool specially - extract text and attachments
                    const askText = toolCall.parameters.text || '';
                    const attachments = toolCall.parameters.attachments || [];
                    
                    // Convert single attachment to array for consistent handling
                    const attachmentArray = Array.isArray(attachments) ? attachments : 
                                          (typeof attachments === 'string' ? attachments.split(',').map(a => a.trim()) : []);
                    
                    // Render ask tool content with attachment UI
                    contentParts.push(
                        <div key={`ask-${match.index}-${index}`} className="space-y-3">
                            <Markdown className="text-sm prose prose-sm dark:prose-invert chat-markdown max-w-none break-words [&>:first-child]:mt-0 prose-headings:mt-3">{askText}</Markdown>
                            {renderAttachments(attachmentArray, fileViewerHandler, sandboxId, project)}
                        </div>
                    );
                } else {
                    const IconComponent = getToolIcon(toolName);
                    
                    // Extract primary parameter for display
                    let paramDisplay = '';
                    if (toolCall.parameters.file_path) {
                        paramDisplay = toolCall.parameters.file_path;
                    } else if (toolCall.parameters.command) {
                        paramDisplay = toolCall.parameters.command;
                    } else if (toolCall.parameters.query) {
                        paramDisplay = toolCall.parameters.query;
                    } else if (toolCall.parameters.url) {
                        paramDisplay = toolCall.parameters.url;
                    }
                    
                    contentParts.push(
                        <div key={`tool-${match.index}-${index}`} className="my-1">
                            <button
                                onClick={() => handleToolClick(messageId, toolName)}
                                className="inline-flex items-center gap-1.5 py-1 px-1 text-xs text-muted-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700/50"
                            >
                                <div className='border-2 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center p-0.5 rounded-sm border-neutral-400/20 dark:border-neutral-600'>
                                    <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                </div>
                                <span className="font-mono text-xs text-foreground">{getUserFriendlyToolName(toolName)}</span>
                                {paramDisplay && <span className="ml-1 text-muted-foreground truncate max-w-[200px]" title={paramDisplay}>{paramDisplay}</span>}
                            </button>
                        </div>
                    );
                }
            });
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text after the last function_calls block
        if (lastIndex < content.length) {
            const remainingText = content.substring(lastIndex);
            if (remainingText.trim()) {
                contentParts.push(
                    <Markdown key={`md-${lastIndex}`} className="text-sm prose prose-sm dark:prose-invert chat-markdown max-w-none break-words">
                        {remainingText}
                    </Markdown>
                );
            }
        }
        
        return contentParts.length > 0 ? contentParts : <Markdown className="text-sm prose prose-sm dark:prose-invert chat-markdown max-w-none break-words">{content}</Markdown>;
    }

    // Fall back to old XML format handling
    const xmlRegex = /<(?!inform\b)([a-zA-Z\-_]+)(?:\s+[^>]*)?>(?:[\s\S]*?)<\/\1>|<(?!inform\b)([a-zA-Z\-_]+)(?:\s+[^>]*)?\/>/g;
    let lastIndex = 0;
    const contentParts: React.ReactNode[] = [];
    let match;

    // If no XML tags found, just return the full content as markdown
    if (!content.match(xmlRegex)) {
        return <Markdown className="text-sm prose prose-sm dark:prose-invert chat-markdown max-w-none break-words">{content}</Markdown>;
    }

    while ((match = xmlRegex.exec(content)) !== null) {
        // Add text before the tag as markdown
        if (match.index > lastIndex) {
            const textBeforeTag = content.substring(lastIndex, match.index);
            contentParts.push(
                <Markdown key={`md-${lastIndex}`} className="text-sm prose prose-sm dark:prose-invert chat-markdown max-w-none inline-block mr-1 break-words">{textBeforeTag}</Markdown>
            );
        }

        const rawXml = match[0];
        const toolName = match[1] || match[2];
        const toolCallKey = `tool-${match.index}`;

        if (toolName === 'ask') {
            // Extract attachments from the XML attributes
            const attachmentsMatch = rawXml.match(/attachments=["']([^"']*)["']/i);
            const attachments = attachmentsMatch
                ? attachmentsMatch[1].split(',').map(a => a.trim())
                : [];

            // Extract content from the ask tag
            const contentMatch = rawXml.match(/<ask[^>]*>([\s\S]*?)<\/ask>/i);
            const askContent = contentMatch ? contentMatch[1] : '';

            // Render <ask> tag content with attachment UI (using the helper)
            contentParts.push(
                <div key={`ask-${match.index}`} className="space-y-3">
                    <Markdown className="text-sm prose prose-sm dark:prose-invert chat-markdown max-w-none break-words [&>:first-child]:mt-0 prose-headings:mt-3">{askContent}</Markdown>
                    {renderAttachments(attachments, fileViewerHandler, sandboxId, project)}
                </div>
            );
        } else {
            const IconComponent = getToolIcon(toolName);
            const paramDisplay = extractPrimaryParam(toolName, rawXml);

            // Render tool button as a clickable element
            contentParts.push(
                <div key={toolCallKey} className="my-1">
                    <button
                        onClick={() => handleToolClick(messageId, toolName)}
                        className="inline-flex items-center gap-1.5 py-1 px-1 text-xs text-muted-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700/50"
                    >
                        <div className='border-2 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center p-0.5 rounded-sm border-neutral-400/20 dark:border-neutral-600'>
                            <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        </div>
                        <span className="font-mono text-xs text-foreground">{getUserFriendlyToolName(toolName)}</span>
                        {paramDisplay && <span className="ml-1 text-muted-foreground truncate max-w-[200px]" title={paramDisplay}>{paramDisplay}</span>}
                    </button>
                </div>
            ); 
        }
        lastIndex = xmlRegex.lastIndex;
    }

    // Add text after the last tag
    if (lastIndex < content.length) {
        contentParts.push(
            <Markdown key={`md-${lastIndex}`} className="text-sm prose prose-sm dark:prose-invert chat-markdown max-w-none break-words">{content.substring(lastIndex)}</Markdown>
        );
    }

    return contentParts;
}

export interface ThreadContentProps {
    messages: UnifiedMessage[];
    streamingTextContent?: string;
    streamingToolCall?: any;
    agentStatus: 'idle' | 'running' | 'connecting' | 'error';
    handleToolClick: (assistantMessageId: string | null, toolName: string) => void;
    handleOpenFileViewer: (filePath?: string, filePathList?: string[]) => void;
    readOnly?: boolean;
    visibleMessages?: UnifiedMessage[]; // For playback mode
    streamingText?: string; // For playback mode
    isStreamingText?: boolean; // For playback mode
    currentToolCall?: any; // For playback mode
    streamHookStatus?: string; // Add this prop
    sandboxId?: string; // Add sandboxId prop
    project?: Project; // Add project prop
    debugMode?: boolean; // Add debug mode parameter
    isPreviewMode?: boolean;
    agentName?: string;
    agentAvatar?: React.ReactNode;
    emptyStateComponent?: React.ReactNode; // Add custom empty state component prop
    isSidePanelOpen?: boolean; // Add side panel state prop
    isLeftSidebarOpen?: boolean; // Add left sidebar state prop
    onScrollStateChange?: (userHasScrolled: boolean, isAtBottom: boolean) => void; // Add scroll state callback
}

export const ThreadContent: React.FC<ThreadContentProps> = ({
    messages,
    streamingTextContent = "",
    streamingToolCall,
    agentStatus,
    handleToolClick,
    handleOpenFileViewer,
    readOnly = false,
    visibleMessages,
    streamingText = "",
    isStreamingText = false,
    currentToolCall,
    streamHookStatus = "idle",
    sandboxId,
    project,
    debugMode = false,
    isPreviewMode = false,
    agentName = 'Operator',
    agentAvatar = <OmniLogo />,
    emptyStateComponent,
    isSidePanelOpen = false,
    isLeftSidebarOpen = false,
    onScrollStateChange,
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const latestMessageRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [userHasScrolled, setUserHasScrolled] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const lastScrollTopRef = useRef(0);
    const autoScrollingRef = useRef(false);
    const { session } = useAuth();

    // React Query file preloader
    const { preloadFiles } = useFilePreloader();

    const containerClassName = isPreviewMode 
        ? "flex-1 overflow-y-auto scrollbar-thin scrollbar-track-secondary/0 scrollbar-thumb-primary/10 scrollbar-thumb-rounded-full hover:scrollbar-thumb-primary/10 px-6 py-4 pb-72"
        : "flex-1 overflow-y-auto scrollbar-thin scrollbar-track-secondary/0 scrollbar-thumb-primary/10 scrollbar-thumb-rounded-full hover:scrollbar-thumb-primary/10 px-6 py-4 pb-72 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60";

    // In playback mode, we use visibleMessages instead of messages
    const displayMessages = readOnly && visibleMessages ? visibleMessages : messages;

    const checkScrollPosition = useCallback(() => {
        if (!messagesContainerRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight <= 150; // Increased threshold
        const hasScrolledUp = scrollHeight - scrollTop - clientHeight > 50; // More sensitive threshold
        
        setIsAtBottom(isNearBottom);
        setShowScrollButton(hasScrolledUp);
        
        // Always respect user scroll actions, even during auto-scroll
        setUserHasScrolled(hasScrolledUp);
        // Notify parent of scroll state changes
        onScrollStateChange?.(hasScrolledUp, isNearBottom);
    }, [onScrollStateChange]);

    const handleScroll = useCallback(() => {
        if (!messagesContainerRef.current) return;
        
        const currentScrollTop = messagesContainerRef.current.scrollTop;
        
        // Clear any existing timeout
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Check if scroll direction indicates user interaction
        const scrollDelta = currentScrollTop - lastScrollTopRef.current;
        lastScrollTopRef.current = currentScrollTop;

        // If scrolling up (negative delta), immediately mark as user action
        if (scrollDelta < 0) {
            setUserHasScrolled(true);
            autoScrollingRef.current = false; // Stop any pending auto-scroll
        }

        checkScrollPosition();

        // Reset auto-scroll flag after a shorter delay
        scrollTimeoutRef.current = setTimeout(() => {
            autoScrollingRef.current = false;
        }, 150);
    }, [checkScrollPosition]);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            autoScrollingRef.current = true;
            messagesEndRef.current.scrollIntoView({ behavior });
            
            // Only reset position state, but let user scroll state be handled by scroll detection
            if (behavior === 'smooth') {
                setTimeout(() => {
                    setIsAtBottom(true);
                    autoScrollingRef.current = false;
                    // Don't automatically reset userHasScrolled - let natural scroll detection handle it
                }, 500);
            }
        }
    }, []);

    // Auto-scroll for new content when user is at bottom
    const autoScrollToBottomIfNeeded = useCallback(() => {
        if (isAtBottom && !userHasScrolled) {
            scrollToBottom('smooth');
        }
    }, [isAtBottom, userHasScrolled, scrollToBottom]);

    // Expose scroll function for parent components but with user position awareness
    const smartScrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth', force: boolean = false) => {
        if (force || isAtBottom || !userHasScrolled) {
            scrollToBottom(behavior);
        }
    }, [isAtBottom, userHasScrolled, scrollToBottom]);

    // Expose smart scroll function for parent components
    const exposedScrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth', force: boolean = false) => {
        smartScrollToBottom(behavior, force);
    }, [smartScrollToBottom]);

    // Auto-scroll when new messages arrive (only during active streaming, not on completion refetch)
    const previousMessageCount = React.useRef(displayMessages.length);
    React.useEffect(() => {
        const messageCountIncreased = displayMessages.length > previousMessageCount.current;
        previousMessageCount.current = displayMessages.length;
        
        if (messageCountIncreased && !userHasScrolled && (agentStatus === 'running' || agentStatus === 'connecting')) {
            autoScrollToBottomIfNeeded();
        }
    }, [displayMessages.length, autoScrollToBottomIfNeeded, userHasScrolled, agentStatus]);

    // Auto-scroll when streaming content arrives - but only if user hasn't manually scrolled up AND agent is actively working
    React.useEffect(() => {
        if (streamingTextContent && !userHasScrolled && (agentStatus === 'running' || agentStatus === 'connecting')) {
            // Use a timeout to reduce frequency of auto-scroll during streaming
            const timeoutId = setTimeout(() => {
                autoScrollToBottomIfNeeded();
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [streamingTextContent, userHasScrolled, autoScrollToBottomIfNeeded, agentStatus]);

    // Clean up timeout on unmount
    React.useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // Preload all message attachments when messages change or sandboxId is provided
    React.useEffect(() => {
        if (!sandboxId) return;

        // Extract all file attachments from messages
        const allAttachments: string[] = [];

        displayMessages.forEach(message => {
            if (message.type === 'user') {
                try {
                    const content = typeof message.content === 'string' ? message.content : '';
                    const attachmentsMatch = content.match(/\[Uploaded File: (.*?)\]/g);
                    if (attachmentsMatch) {
                        attachmentsMatch.forEach(match => {
                            const pathMatch = match.match(/\[Uploaded File: (.*?)\]/);
                            if (pathMatch && pathMatch[1]) {
                                allAttachments.push(pathMatch[1]);
                            }
                        });
                    }
                } catch (e) {
                    console.error('Error parsing message attachments:', e);
                }
            }
        });

        // Use React Query preloading if we have attachments AND a valid token
        if (allAttachments.length > 0 && session?.access_token) {
            // Preload files with React Query in background
            preloadFiles(sandboxId, allAttachments).catch(err => {
                console.error('React Query preload failed:', err);
            });
        }
    }, [displayMessages, sandboxId, session?.access_token, preloadFiles]);

    return (
        <>
            {displayMessages.length === 0 && !streamingTextContent && !streamingToolCall &&
                !streamingText && !currentToolCall && agentStatus === 'idle' ? (
                // Render empty state outside scrollable container
                <div className="flex-1 min-h-[60vh] flex items-center justify-center">
                    {emptyStateComponent || (
                        <div className="text-center text-muted-foreground">
                            {readOnly ? "No messages to display." : "Send a message to start."}
                        </div>
                    )}
                </div>
            ) : (
                // Render scrollable content container
                <div
                    ref={messagesContainerRef}
                    className={containerClassName}
                    onScroll={handleScroll}
                >
                    <div className="mx-auto max-w-3xl md:px-8 min-w-0">
                        <div className="space-y-8 min-w-0">
                            {(() => {

                                type MessageGroup = {
                                    type: 'user' | 'assistant_group';
                                    messages: UnifiedMessage[];
                                    key: string;
                                };
                                const groupedMessages: MessageGroup[] = [];
                                let currentGroup: MessageGroup | null = null;
                                let assistantGroupCounter = 0; // Counter for assistant groups

                                displayMessages.forEach((message, index) => {
                                    const messageType = message.type;
                                    const key = message.message_id || `msg-${index}`;

                                    if (messageType === 'user') {
                                        // Finalize any existing assistant group
                                        if (currentGroup) {
                                            groupedMessages.push(currentGroup);
                                            currentGroup = null;
                                        }
                                        // Create a new user message group
                                        groupedMessages.push({ type: 'user', messages: [message], key });
                                    } else if (messageType === 'assistant' || messageType === 'tool' || messageType === 'browser_state') {
                                        if (currentGroup && currentGroup.type === 'assistant_group') {
                                            // Add to existing assistant group
                                            currentGroup.messages.push(message);
                                        } else {
                                            // Finalize any existing group
                                            if (currentGroup) {
                                                groupedMessages.push(currentGroup);
                                            }
                                            // Create a new assistant group with a group-level key
                                            assistantGroupCounter++;
                                            currentGroup = {
                                                type: 'assistant_group',
                                                messages: [message],
                                                key: `assistant-group-${assistantGroupCounter}`
                                            };
                                        }
                                    } else if (messageType !== 'status') {
                                        // For any other message types, finalize current group
                                        if (currentGroup) {
                                            groupedMessages.push(currentGroup);
                                            currentGroup = null;
                                        }
                                    }
                                });

                                // Finalize any remaining group
                                if (currentGroup) {
                                    groupedMessages.push(currentGroup);
                                }

                                // Merge consecutive assistant groups
                                const mergedGroups: MessageGroup[] = [];
                                let currentMergedGroup: MessageGroup | null = null;

                                groupedMessages.forEach((group, index) => {
                                    if (group.type === 'assistant_group') {
                                        if (currentMergedGroup && currentMergedGroup.type === 'assistant_group') {
                                            // Merge with the current group
                                            currentMergedGroup.messages.push(...group.messages);
                                        } else {
                                            // Finalize previous group if it exists
                                            if (currentMergedGroup) {
                                                mergedGroups.push(currentMergedGroup);
                                            }
                                            // Start new merged group
                                            currentMergedGroup = { ...group };
                                        }
                                    } else {
                                        // Finalize current merged group if it exists
                                        if (currentMergedGroup) {
                                            mergedGroups.push(currentMergedGroup);
                                            currentMergedGroup = null;
                                        }
                                        // Add non-assistant group as-is
                                        mergedGroups.push(group);
                                    }
                                });

                                // Finalize any remaining merged group
                                if (currentMergedGroup) {
                                    mergedGroups.push(currentMergedGroup);
                                }

                                // Use merged groups instead of original grouped messages
                                const finalGroupedMessages = mergedGroups;

                                // Handle streaming content - only add to existing group or create new one if needed
                                if (streamingTextContent) {
                                    const lastGroup = finalGroupedMessages.at(-1);
                                    if (!lastGroup || lastGroup.type === 'user') {
                                        // Create new assistant group for streaming content
                                        assistantGroupCounter++;
                                        finalGroupedMessages.push({
                                            type: 'assistant_group',
                                            messages: [{
                                                content: streamingTextContent,
                                                type: 'assistant',
                                                message_id: 'streamingTextContent',
                                                metadata: 'streamingTextContent',
                                                created_at: new Date().toISOString(),
                                                updated_at: new Date().toISOString(),
                                                is_llm_message: true,
                                                thread_id: 'streamingTextContent',
                                                sequence: Infinity,
                                            }],
                                            key: `assistant-group-${assistantGroupCounter}-streaming`
                                        });
                                    } else if (lastGroup.type === 'assistant_group') {
                                        // Only add streaming content if it's not already represented in the last message
                                        const lastMessage = lastGroup.messages[lastGroup.messages.length - 1];
                                        if (lastMessage.message_id !== 'streamingTextContent') {
                                            lastGroup.messages.push({
                                                content: streamingTextContent,
                                                type: 'assistant',
                                                message_id: 'streamingTextContent',
                                                metadata: 'streamingTextContent',
                                                created_at: new Date().toISOString(),
                                                updated_at: new Date().toISOString(),
                                                is_llm_message: true,
                                                thread_id: 'streamingTextContent',
                                                sequence: Infinity,
                                            });
                                        }
                                    }
                                }

                                return finalGroupedMessages.map((group, groupIndex) => {
                                    if (group.type === 'user') {
                                        const message = group.messages[0];
                                        const messageContent = (() => {
                                            try {
                                                const parsed = safeJsonParse<ParsedContent>(message.content, { content: message.content });
                                                return parsed.content || message.content;
                                            } catch {
                                                return message.content;
                                            }
                                        })();

                                        // In debug mode, display raw message content
                                        if (debugMode) {
                                            return (
                                                <div key={group.key} className="flex justify-end">
                                                    <div className="flex max-w-[85%] rounded-xl bg-primary/10 px-4 py-3 break-words overflow-hidden">
                                                        <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto min-w-0 flex-1">
                                                            {message.content}
                                                        </pre>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Extract attachments from the message content
                                        const attachmentsMatch = messageContent.match(/\[Uploaded File: (.*?)\]/g);
                                        const attachments = attachmentsMatch
                                            ? attachmentsMatch.map(match => {
                                                const pathMatch = match.match(/\[Uploaded File: (.*?)\]/);
                                                return pathMatch ? pathMatch[1] : null;
                                            }).filter(Boolean)
                                            : [];

                                        // Remove attachment info from the message content
                                        const cleanContent = messageContent.replace(/\[Uploaded File: .*?\]/g, '').trim();

                                        return (
                                            <div key={group.key} className="flex justify-end">
                                                <div className="flex max-w-[85%] rounded-xl bg-primary/10 px-4 py-3 break-words overflow-hidden">
                                                    <div className="space-y-3 min-w-0 flex-1">
                                                        {cleanContent && (
                                                            <Markdown className="text-sm prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-wrap-anywhere">{cleanContent}</Markdown>
                                                        )}

                                                        {/* Use the helper function to render user attachments */}
                                                        {renderAttachments(attachments as string[], handleOpenFileViewer, sandboxId, project)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (group.type === 'assistant_group') {
                                        return (
                                            <div key={group.key} ref={groupIndex === groupedMessages.length - 1 ? latestMessageRef : null}>
                                                <div className="flex flex-col gap-2">
                                                    {/* Logo positioned above the message content - ONLY ONCE PER GROUP */}
                                                    <div className="flex items-center">
                                                        <div className="rounded-md flex items-center justify-center">
                                                            {agentAvatar}
                                                        </div>
                                                        <p className='ml-2 text-sm text-muted-foreground'>{agentName ? agentName : 'Operator'}</p>
                                                    </div>
                                                    
                                                    {/* Message content - ALL messages in the group */}
                                                    <div className="flex max-w-[90%] rounded-lg text-sm break-words overflow-hidden">
                                                        <div className="space-y-2 min-w-0 flex-1">
                                                            {(() => {
                                                                // In debug mode, just show raw messages content
                                                                if (debugMode) {
                                                                    return group.messages.map((message, msgIndex) => {
                                                                        const msgKey = message.message_id || `raw-msg-${msgIndex}`;
                                                                        return (
                                                                            <div key={msgKey} className="mb-4">
                                                                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                                                                    Type: {message.type} | ID: {message.message_id || 'no-id'}
                                                                                </div>
                                                                                <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                                                                    {message.content}
                                                                                </pre>
                                                                                {message.metadata && message.metadata !== '{}' && (
                                                                                    <div className="mt-2">
                                                                                        <div className="text-xs font-medium text-muted-foreground mb-1">
                                                                                            Metadata:
                                                                                        </div>
                                                                                        <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                                                                            {message.metadata}
                                                                                        </pre>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    });
                                                                }

                                                                const toolResultsMap = new Map<string | null, UnifiedMessage[]>();
                                                                group.messages.forEach(msg => {
                                                                    if (msg.type === 'tool') {
                                                                        const meta = safeJsonParse<ParsedMetadata>(msg.metadata, {});
                                                                        const assistantId = meta.assistant_message_id || null;
                                                                        if (!toolResultsMap.has(assistantId)) {
                                                                            toolResultsMap.set(assistantId, []);
                                                                        }
                                                                        toolResultsMap.get(assistantId)?.push(msg);
                                                                    }
                                                                });

                                                                const renderedToolResultIds = new Set<string>();
                                                                const elements: React.ReactNode[] = [];
                                                                let assistantMessageCount = 0; // Move this outside the loop

                                                                group.messages.forEach((message, msgIndex) => {
                                                                    if (message.type === 'assistant') {
                                                                        const parsedContent = safeJsonParse<ParsedContent>(message.content, {});
                                                                        const msgKey = message.message_id || `submsg-assistant-${msgIndex}`;
                                                                        
                                                                        if (!parsedContent.content) return;

                                                                        const renderedContent = renderMarkdownContent(
                                                                            parsedContent.content,
                                                                            handleToolClick,
                                                                            message.message_id,
                                                                            handleOpenFileViewer,
                                                                            sandboxId,
                                                                            project,
                                                                            debugMode
                                                                        );

                                                                        elements.push(
                                                                            <div key={msgKey} className={assistantMessageCount > 0 ? "mt-4" : ""}>
                                                                                <div className="prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-hidden">
                                                                                    {renderedContent}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                        
                                                                        assistantMessageCount++; // Increment after adding the element
                                                                    }
                                                                });

                                                                return elements;
                                                            })()}

                                                            {groupIndex === finalGroupedMessages.length - 1 && !readOnly && (streamHookStatus === 'streaming' || streamHookStatus === 'connecting') && (
                                                                <div className="mt-2">
                                                                    {(() => {
                                                                        // In debug mode, show raw streaming content
                                                                        if (debugMode && streamingTextContent) {
                                                                            return (
                                                                                <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                                                                    {streamingTextContent}
                                                                                </pre>
                                                                            );
                                                                        }

                                                                        let detectedTag: string | null = null;
                                                                        let tagStartIndex = -1;
                                                                        if (streamingTextContent) {
                                                                            // First check for new format
                                                                            const functionCallsIndex = streamingTextContent.indexOf('<function_calls>');
                                                                            if (functionCallsIndex !== -1) {
                                                                                detectedTag = 'function_calls';
                                                                                tagStartIndex = functionCallsIndex;
                                                                            } else {
                                                                                // Fall back to old format detection
                                                                                for (const tag of HIDE_STREAMING_XML_TAGS) {
                                                                                    const openingTagPattern = `<${tag}`;
                                                                                    const index = streamingTextContent.indexOf(openingTagPattern);
                                                                                    if (index !== -1) {
                                                                                        detectedTag = tag;
                                                                                        tagStartIndex = index;
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }
                                                                        }


                                                                        const textToRender = streamingTextContent || '';
                                                                        const textBeforeTag = detectedTag ? textToRender.substring(0, tagStartIndex) : textToRender;
                                                                        const showCursor = (streamHookStatus === 'streaming' || streamHookStatus === 'connecting') && !detectedTag;
                                                                        const IconComponent = detectedTag && detectedTag !== 'function_calls' ? getToolIcon(detectedTag) : null;

                                                                        return (
                                                                            <>
                                                                                {textBeforeTag && (
                                                                                    <Markdown className="text-sm prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-wrap-anywhere">{textBeforeTag}</Markdown>
                                                                                )}
                                                                                {showCursor && (
                                                                                    <span className="inline-block h-4 w-0.5 bg-primary ml-0.5 -mb-1 animate-pulse" />
                                                                                )}

                                                                                {detectedTag && detectedTag !== 'function_calls' && (
                                                                                    <div className="mt-2 mb-1">
                                                                                        <button
                                                                                            className="animate-shimmer inline-flex items-center gap-1.5 py-1 px-1 text-xs font-medium text-primary bg-muted hover:bg-muted/80 rounded-md transition-colors cursor-pointer border border-primary/20"
                                                                                        >
                                                                                            <div className='border-2 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center p-0.5 rounded-sm border-neutral-400/20 dark:border-neutral-600'>
                                                                                                <CircleDashed className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-spin animation-duration-2000" />
                                                                                            </div>
                                                                                            <span className="font-mono text-xs text-primary">{getUserFriendlyToolName(detectedTag)}</span>
                                                                                        </button>
                                                                                    </div>
                                                                                )}

                                                                                {detectedTag === 'function_calls' && (
                                                                                    <div className="mt-2 mb-1">
                                                                                        <button
                                                                                            className="animate-shimmer inline-flex items-center gap-1.5 py-1 px-1 text-xs font-medium text-primary bg-muted hover:bg-muted/80 rounded-md transition-colors cursor-pointer border border-primary/20"
                                                                                        >
                                                                                            <div className='border-2 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center p-0.5 rounded-sm border-neutral-400/20 dark:border-neutral-600'>
                                                                                                <CircleDashed className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-spin animation-duration-2000" />
                                                                                            </div>
                                                                                            <span className="font-mono text-xs text-primary">
                                                                                                {extractToolNameFromStream(streamingTextContent) || 'Using Tool...'}
                                                                                            </span>
                                                                                        </button>
                                                                                    </div>
                                                                                )}

                                                                                {streamingToolCall && !detectedTag && (
                                                                                    <div className="mt-2 mb-1">
                                                                                        {(() => {
                                                                                            const toolName = streamingToolCall.name || streamingToolCall.xml_tag_name || 'Tool';
                                                                                            const IconComponent = getToolIcon(toolName);
                                                                                            const paramDisplay = extractPrimaryParam(toolName, streamingToolCall.arguments || '');
                                                                                            return (
                                                                                                <button
                                                                                                    className="animate-shimmer inline-flex items-center gap-1.5 py-1 px-1 text-xs font-medium text-primary bg-muted hover:bg-muted/80 rounded-md transition-colors cursor-pointer border border-primary/20"
                                                                                                >
                                                                                                    <div className='border-2 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center p-0.5 rounded-sm border-neutral-400/20 dark:border-neutral-600'>
                                                                                                        <CircleDashed className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-spin animation-duration-2000" />
                                                                                                    </div>
                                                                                                    <span className="font-mono text-xs text-primary">{toolName}</span>
                                                                                                    {paramDisplay && <span className="ml-1 text-primary/70 truncate max-w-[200px]" title={paramDisplay}>{paramDisplay}</span>}
                                                                                                </button>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}

                                                            {/* For playback mode, show streaming text and tool calls */}
                                                            {readOnly && groupIndex === finalGroupedMessages.length - 1 && isStreamingText && (
                                                                <div className="mt-2">
                                                                    {(() => {
                                                                        let detectedTag: string | null = null;
                                                                        let tagStartIndex = -1;
                                                                        if (streamingText) {
                                                                            // First check for new format
                                                                            const functionCallsIndex = streamingText.indexOf('<function_calls>');
                                                                            if (functionCallsIndex !== -1) {
                                                                                detectedTag = 'function_calls';
                                                                                tagStartIndex = functionCallsIndex;
                                                                            } else {
                                                                                // Fall back to old format detection
                                                                                for (const tag of HIDE_STREAMING_XML_TAGS) {
                                                                                    const openingTagPattern = `<${tag}`;
                                                                                    const index = streamingText.indexOf(openingTagPattern);
                                                                                    if (index !== -1) {
                                                                                        detectedTag = tag;
                                                                                        tagStartIndex = index;
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }
                                                                        }

                                                                        const textToRender = streamingText || '';
                                                                        const textBeforeTag = detectedTag ? textToRender.substring(0, tagStartIndex) : textToRender;
                                                                        const showCursor = isStreamingText && !detectedTag;

                                                                        return (
                                                                            <>
                                                                                {/* In debug mode, show raw streaming content */}
                                                                                {debugMode && streamingText ? (
                                                                                    <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                                                                        {streamingText}
                                                                                    </pre>
                                                                                ) : (
                                                                                    <>
                                                                                        {textBeforeTag && (
                                                                                            <Markdown className="text-sm prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-wrap-anywhere">{textBeforeTag}</Markdown>
                                                                                        )}
                                                                                        {showCursor && (
                                                                                            <span className="inline-block h-4 w-0.5 bg-primary ml-0.5 -mb-1 animate-pulse" />
                                                                                        )}

                                                                                        {detectedTag && (
                                                                                            <div className="mt-2 mb-1">
                                                                                                <button
                                                                                                    className="animate-shimmer inline-flex items-center gap-1.5 py-1 px-2.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors cursor-pointer border border-primary/20"
                                                                                                >
                                                                                                    <CircleDashed className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-spin animation-duration-2000" />
                                                                                                    <span className="font-mono text-xs text-primary">
                                                                                                        {detectedTag === 'function_calls' ? (extractToolNameFromStream(streamingText) || 'Using Tool...') : detectedTag}
                                                                                                    </span>
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                });
                            })()}
                            {((agentStatus === 'running' || agentStatus === 'connecting') && !streamingTextContent &&
                                !readOnly &&
                                (messages.length === 0 || messages[messages.length - 1].type === 'user')) && (
                                    <div ref={latestMessageRef} className='w-full h-22 rounded'>
                                        {/* Show only the funny loading messages during generation phase - no extra logo */}
                                        <div className="space-y-2 w-full h-12">
                                            <AgentLoader />
                                        </div>
                                    </div>
                                )}

                            {/* For playback mode - Show tool call animation if active */}
                            {readOnly && currentToolCall && (
                                <div ref={latestMessageRef}>
                                    <div className="flex flex-col gap-2">
                                        {/* Logo positioned above the tool call */}
                                        <div className="flex justify-start">
                                            <div className="rounded-md flex items-center justify-center">
                                                {agentAvatar}
                                            </div>
                                            <p className='ml-2 text-sm text-muted-foreground'>{agentName}</p>
                                        </div>
                                        
                                        {/* Tool call content */}
                                        <div className="space-y-2">
                                            <div className="animate-shimmer inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium text-primary bg-primary/10 rounded-md border border-primary/20">
                                                <CircleDashed className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-spin animation-duration-2000" />
                                                <span className="font-mono text-xs text-primary">
                                                    {currentToolCall.name || 'Using Tool'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* For playback mode - Show streaming indicator if no messages yet */}
                            {readOnly && visibleMessages && visibleMessages.length === 0 && isStreamingText && (
                                <div ref={latestMessageRef}>
                                    <div className="flex flex-col gap-2">
                                        {/* Logo positioned above the streaming indicator */}
                                        <div className="flex justify-start">
                                            <div className="rounded-md flex items-center justify-center">
                                                {agentAvatar}
                                            </div>
                                            <p className='ml-2 text-sm text-muted-foreground'>{agentName}</p>
                                        </div>
                                        
                                        {/* Streaming indicator content */}
                                        <div className="max-w-[90%] px-4 py-3 text-sm">
                                            <div className="flex items-center gap-1.5 py-1">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-pulse" />
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-pulse delay-150" />
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-pulse delay-300" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div ref={messagesEndRef} className="h-1" />
                </div>
            )}

            {/* Unified floating pill - shows either "Working" or "Scroll to latest" */}
            {((!readOnly && (agentStatus === 'running' || agentStatus === 'connecting')) || showScrollButton) && (
                <div className={`fixed bottom-48 z-20 transform -translate-x-1/2 transition-all duration-200 ease-in-out ${
                    (() => {
                        if (isSidePanelOpen && isLeftSidebarOpen) {
                            // Both sidebars open - center between them
                            return 'left-[calc(50%-100px)] sm:left-[calc(50%-200px)] md:left-[calc(50%-225px)] lg:left-[calc(50%-250px)] xl:left-[calc(50%-275px)]';
                        } else if (isSidePanelOpen) {
                            // Only right side panel open
                            return 'left-[5%] sm:left-[calc(50%-225px)] md:left-[calc(50%-250px)] lg:left-[calc(50%-275px)] xl:left-[calc(50%-325px)]';
                        } else if (isLeftSidebarOpen) {
                            // Only left sidebar open - shift right to account for sidebar width
                            return 'left-[calc(50%+120px)] sm:left-[calc(50%+130px)] md:left-[calc(50%+140px)] lg:left-[calc(50%+150px)]';
                        } else {
                            // No sidebars open - center normally
                            return 'left-1/2';
                        }
                    })()
                }`}>
                    <AnimatePresence mode="wait">
                        {!readOnly && (agentStatus === 'running' || agentStatus === 'connecting') && (
                            <motion.div
                                key="working"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ 
                                    opacity: 1,
                                    y: 0,
                                    transition: { 
                                        duration: 0.3, 
                                        ease: [0.25, 0.46, 0.45, 0.94]
                                    }
                                }}
                                exit={{ 
                                    opacity: 0,
                                    y: 10,
                                    transition: { 
                                        duration: 0.2, 
                                        ease: [0.25, 0.46, 0.45, 0.94]
                                    } 
                                }}
                                className="relative"
                            >
                                {/* Floating spinner positioned above the text container */}
                                <div 
                                    className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-3/5 z-10 cursor-pointer"
                                    onClick={() => scrollToBottom('smooth')}
                                >
                                    <ThreeSpinner size={64} color="currentColor" />
                                </div>
                                
                                {/* Text container */}
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => scrollToBottom('smooth')}
                                    className="backdrop-blur-sm border border-primary/20 shadow-lg rounded-full px-4 py-2 text-sm font-medium text-primary transition-all duration-200"
                                    style={{
                                        animation: 'shimmer 4s ease-in-out infinite',
                                        backgroundImage: 'linear-gradient(110deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%)',
                                        backgroundSize: '200% 100%'
                                    }}
                                >
                                    <span>{agentName ? `${agentName} is working...` : 'Operator is working...'}</span>
                                </motion.button>
                            </motion.div>
                        )}
                        {showScrollButton && !(agentStatus === 'running' || agentStatus === 'connecting') && (
                            <motion.button
                                key="scroll"
                                initial={{ 
                                    opacity: 0,
                                    y: 10
                                }}
                                animate={{ 
                                    opacity: 1,
                                    y: 0,
                                    transition: { 
                                        duration: 0.3, 
                                        ease: [0.25, 0.46, 0.45, 0.94]
                                    }
                                }}
                                exit={{ 
                                    opacity: 0,
                                    y: 10,
                                    transition: { 
                                        duration: 0.2, 
                                        ease: [0.25, 0.46, 0.45, 0.94]
                                    }
                                }}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => scrollToBottom('smooth')}
                                className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
                            >
                                <ArrowDown className="h-4 w-4" />
                                <span>Scroll to latest</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </>
    );
};

export default ThreadContent; 
