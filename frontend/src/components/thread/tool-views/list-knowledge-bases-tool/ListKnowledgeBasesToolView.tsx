import React from 'react';
import { BookOpen, Database, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToolViewProps } from '../types';
import { extractListKnowledgeBasesData, type ListKnowledgeBasesData, type KnowledgeBase } from './_utils';

interface KnowledgeBaseCardProps {
  knowledgeBase: KnowledgeBase;
}

function KnowledgeBaseCard({ knowledgeBase }: KnowledgeBaseCardProps) {
  return (
    <Card className="border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            {knowledgeBase.name}
          </CardTitle>
          <Badge variant="outline" className="text-purple-700 border-purple-300 dark:text-purple-300 dark:border-purple-600">
            <Search className="h-3 w-3 mr-1" />
            {knowledgeBase.search_method}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {knowledgeBase.description}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {knowledgeBase.index_name}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ListKnowledgeBasesToolView({ toolContent }: ToolViewProps) {
  const data = extractListKnowledgeBasesData(toolContent);
  
  if (!data) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
          <BookOpen className="h-5 w-5" />
          <span className="font-medium">Error loading knowledge bases</span>
        </div>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Unable to parse the knowledge bases data. Please check the tool output format.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900 dark:text-purple-100">
              Available Knowledge Bases
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              {data.message}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200">
          {data.count} {data.count === 1 ? 'knowledge base' : 'knowledge bases'}
        </Badge>
      </div>

      {/* Knowledge Bases Grid */}
      {data.knowledge_bases.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
            No knowledge bases found
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Add knowledge bases to your agent to enable knowledge search capabilities.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {data.knowledge_bases.map((kb, index) => {
            const cardKey = `${kb.index_name}-${index}`;
            return (
              <KnowledgeBaseCard 
                key={cardKey}
                knowledgeBase={kb} 
              />
            );
          })}
        </div>
      )}
    </div>
  );
} 