'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import { UnifiedMessage, ParsedContent } from '@/components/thread/types';
import { safeJsonParse } from '@/components/thread/utils';

interface ReasoningDisplayProps {
  reasoningMessage: UnifiedMessage;
  isStreaming?: boolean;
  className?: string;
}

export const ReasoningDisplay: React.FC<ReasoningDisplayProps> = ({
  reasoningMessage,
  isStreaming = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(isStreaming);

  // Parse reasoning content
  const parsedContent = safeJsonParse<ParsedContent>(reasoningMessage.content, {});
  const reasoningText = parsedContent.content || reasoningMessage.content;

  // Auto-collapse when streaming is complete
  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    } else {
      // Auto-collapse after a brief delay when streaming completes
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isStreaming]);

  const displayText = reasoningText;

  return (
    <div className={cn("mb-3", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-2 h-8 px-3 rounded-lg transition-all duration-200",
              "text-muted-foreground hover:text-foreground",
              "bg-muted/50 hover:bg-muted border border-border/50",
              isStreaming && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            )}
          >
            <Brain className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">
              {isStreaming ? 'Thinking...' : 'Reasoning'}
            </span>
            {isStreaming ? (
              <div className="flex items-center gap-0.5 ml-1">
                <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse delay-75" />
                <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse delay-150" />
              </div>
            ) : (
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </motion.div>
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-0">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "mt-2 rounded-lg border border-border/50 bg-muted/30 p-4",
              "prose prose-sm dark:prose-invert max-w-none",
              "[&>:first-child]:mt-0 [&>:last-child]:mb-0"
            )}
          >
            {typeof displayText === 'string' ? (
              isStreaming ? (
                <div className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {displayText}
                  <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
                </div>
              ) : (
                <Markdown className="text-sm text-muted-foreground">
                  {displayText}
                </Markdown>
              )
            ) : (
              <div className="text-sm text-muted-foreground">
                No reasoning content available
              </div>
            )}
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}; 