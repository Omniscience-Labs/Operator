import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Search,
  FileText,
  Clock,
  Hash,
  Star,
  Globe,
  ChevronDown,
  ChevronUp,
  Database,
} from 'lucide-react';
import { ToolViewProps } from '../types';
import { formatTimestamp, getToolTitle, normalizeContentToString } from '../utils';
import { cn, truncateString } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LoadingState } from '../shared/LoadingState';
import { extractKnowledgeSearchData } from './_utils';

export function KnowledgeSearchToolView({
  name = 'search-knowledge',
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false,
}: ToolViewProps) {
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const [expandedResults, setExpandedResults] = useState<Record<number, boolean>>({});

  const {
    query,
    results,
    indexName,
    knowledgeBaseName,
    description,
    actualIsSuccess,
    actualToolTimestamp,
    actualAssistantTimestamp
  } = extractKnowledgeSearchData(
    assistantContent,
    toolContent,
    isSuccess,
    toolTimestamp,
    assistantTimestamp
  );

  const toolTitle = knowledgeBaseName ? `Search ${knowledgeBaseName}` : getToolTitle(name);

  const toggleExpand = (idx: number) => {
    setExpandedResults(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 0.6) return 'text-blue-600 dark:text-blue-400';
    if (score >= 0.4) return 'text-amber-600 dark:text-amber-400';
    return 'text-zinc-500 dark:text-zinc-400';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (score >= 0.6) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (score >= 0.4) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300';
  };

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1);
  };

  const getPageInfo = (metadata: any) => {
    if (metadata.page_label) {
      return `Page ${metadata.page_label}`;
    }
    if (metadata.start_page_index !== undefined) {
      return `Page ${metadata.start_page_index + 1}`;
    }
    return null;
  };

  const getFileInfo = (metadata: any) => {
    if (metadata.file_name) {
      return metadata.file_name;
    }
    if (metadata.file_path) {
      return metadata.file_path.split('/').pop() || metadata.file_path;
    }
    return null;
  };

  return (
    <Card className="gap-0 flex border shadow-none border-t border-b-0 border-x-0 p-0 rounded-none flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
      <CardHeader className="h-14 bg-purple-50/80 dark:bg-purple-900/20 backdrop-blur-sm border-b p-2 px-4 space-y-2">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20">
              <BookOpen className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                {toolTitle}
              </CardTitle>
              {description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>

          {!isStreaming && (
            <Badge
              variant="secondary"
              className={
                actualIsSuccess
                  ? "bg-gradient-to-b from-emerald-200 to-emerald-100 text-emerald-700 dark:from-emerald-800/50 dark:to-emerald-900/60 dark:text-emerald-300"
                  : "bg-gradient-to-b from-rose-200 to-rose-100 text-rose-700 dark:from-rose-800/50 dark:to-rose-900/60 dark:text-rose-300"
              }
            >
              {actualIsSuccess ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {actualIsSuccess ? 'Search completed' : 'Search failed'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 h-full flex-1 overflow-hidden relative">
        {isStreaming && results.length === 0 ? (
          <LoadingState
            icon={BookOpen}
            iconColor="text-purple-500 dark:text-purple-400"
            bgColor="bg-gradient-to-b from-purple-100 to-purple-50 shadow-inner dark:from-purple-800/40 dark:to-purple-900/60 dark:shadow-purple-950/20"
            title="Searching knowledge base"
            filePath={query}
            showProgress={true}
          />
        ) : results.length > 0 ? (
          <ScrollArea className="h-full w-full">
            <div className="p-4 py-0 my-4">
              {/* Query Display */}
              {query && (
                <div className="mb-4 p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Search className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Query</span>
                  </div>
                  <code className="text-sm text-purple-800 dark:text-purple-200 font-mono bg-purple-100/50 dark:bg-purple-900/20 px-2 py-1 rounded">
                    {query}
                  </code>
                </div>
              )}

              {/* Results Header */}
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span>Knowledge Results ({results.length})</span>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  <Clock className="h-3 w-3 mr-1.5 opacity-70" />
                  {indexName || 'Unknown Index'}
                </Badge>
              </div>

              <div className="space-y-4">
                {results.map((result, idx) => {
                  const isExpanded = expandedResults[idx] || false;
                  const pageInfo = getPageInfo(result.metadata);
                  const fileInfo = getFileInfo(result.metadata);
                  const score = result.score || 0;

                  return (
                    <div
                      key={idx}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm hover:shadow transition-shadow"
                    >
                      <div className="p-4">
                        {/* Result Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className={cn("h-6 px-2 py-0 text-xs font-medium", getScoreBadgeColor(score))}>
                              <Star className="h-3 w-3 mr-1" />
                              {formatScore(score)}%
                            </Badge>
                            <Badge variant="outline" className="h-6 px-2 py-0 text-xs font-normal">
                              #{result.rank}
                            </Badge>
                          </div>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-full"
                                  onClick={() => toggleExpand(idx)}
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{isExpanded ? 'Show less' : 'Show more'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {/* Content Preview */}
                        <div className={cn(
                          "text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed",
                          isExpanded ? "whitespace-pre-wrap break-words" : "line-clamp-3"
                        )}>
                          {result.text}
                        </div>

                        {/* Metadata */}
                        {(pageInfo || fileInfo) && (
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                            {fileInfo && (
                              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                <FileText className="h-3 w-3" />
                                <span>{fileInfo}</span>
                              </div>
                            )}
                            {pageInfo && (
                              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                <Hash className="h-3 w-3" />
                                <span>{pageInfo}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expanded Metadata */}
                      {isExpanded && result.metadata && Object.keys(result.metadata).length > 0 && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 p-3">
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 font-medium">
                            Additional Metadata
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(result.metadata)
                              .filter(([key, value]) => 
                                key !== 'file_name' && 
                                key !== 'file_path' && 
                                key !== 'page_label' && 
                                key !== 'start_page_index' &&
                                value !== null && 
                                value !== undefined
                              )
                              .slice(0, 6)
                              .map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                  <span className="text-zinc-400 dark:text-zinc-500 capitalize">
                                    {key.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-zinc-600 dark:text-zinc-300 font-mono truncate">
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gradient-to-b from-purple-100 to-purple-50 shadow-inner dark:from-purple-800/40 dark:to-purple-900/60">
              <BookOpen className="h-10 w-10 text-purple-400 dark:text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
              No Results Found
            </h3>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 w-full max-w-md text-center mb-4 shadow-sm">
              <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300 break-all">
                {query || 'Unknown query'}
              </code>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
              No relevant content found in the {knowledgeBaseName || 'knowledge base'}
            </p>
          </div>
        )}
      </CardContent>

      <div className="px-4 py-2 h-10 bg-gradient-to-r from-purple-50/90 to-purple-100/90 dark:from-purple-900/20 dark:to-purple-800/20 backdrop-blur-sm border-t border-purple-200/50 dark:border-purple-800/50 flex justify-between items-center gap-4">
        <div className="h-full flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          {!isStreaming && results.length > 0 && (
            <Badge variant="outline" className="h-6 py-0.5">
              <Database className="h-3 w-3" />
              {results.length} results
            </Badge>
          )}
          {knowledgeBaseName && (
            <Badge variant="outline" className="h-6 py-0.5 bg-purple-50/50 dark:bg-purple-900/20">
              <BookOpen className="h-3 w-3" />
              {knowledgeBaseName}
            </Badge>
          )}
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {actualToolTimestamp && !isStreaming
            ? formatTimestamp(actualToolTimestamp)
            : actualAssistantTimestamp
              ? formatTimestamp(actualAssistantTimestamp)
              : ''}
        </div>
      </div>
    </Card>
  );
} 