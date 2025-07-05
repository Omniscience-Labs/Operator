import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface KnowledgeBase {
  name: string;
  index_name: string;
  description: string;
}

interface AgentKnowledgeConfigurationProps {
  knowledgeBases: KnowledgeBase[];
  onKnowledgeBasesChange: (knowledgeBases: KnowledgeBase[]) => void;
}

export const AgentKnowledgeConfiguration = ({ 
  knowledgeBases, 
  onKnowledgeBasesChange 
}: AgentKnowledgeConfigurationProps) => {
  const [newName, setNewName] = useState('');
  const [newIndexName, setNewIndexName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Helper function to format the name field
  const formatKnowledgeBaseName = (input: string): string => {
    return input
      .toLowerCase() // Convert to lowercase
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/[^a-z-]/g, '') // Remove any character that's not a lowercase letter or dash
      .replace(/-+/g, '-') // Replace multiple consecutive dashes with single dash
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  };

  const handleAddKnowledgeBase = () => {
    if (newName.trim() && newIndexName.trim() && newDescription.trim()) {
      const newKnowledgeBase: KnowledgeBase = {
        name: newName.trim(),
        index_name: newIndexName.trim(),
        description: newDescription.trim()
      };
      onKnowledgeBasesChange([...knowledgeBases, newKnowledgeBase]);
      setNewName('');
      setNewIndexName('');
      setNewDescription('');
    }
  };

  const handleRemoveKnowledgeBase = (index: number) => {
    const updated = knowledgeBases.filter((_, i) => i !== index);
    onKnowledgeBasesChange(updated);
  };

  const handleUpdateKnowledgeBase = (index: number, field: keyof KnowledgeBase, value: string) => {
    const updated = [...knowledgeBases];
    // Format the name field to ensure it only contains lowercase letters and dashes
    const formattedValue = field === 'name' ? formatKnowledgeBaseName(value) : value;
    updated[index] = { ...updated[index], [field]: formattedValue };
    onKnowledgeBasesChange(updated);
  };

  return (
    <Card className="px-0 bg-transparent border-none shadow-none">
      <CardHeader className="px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Knowledge Bases</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>
                    Connect vector indices to give your agent access to specialized knowledge bases. 
                    Each knowledge base will appear as a separate search tool that the agent can use.
                    The index name (lowercase letters and dashes only) determines how the agent refers to it, while the index name is for LlamaCloud API calls.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-sm text-muted-foreground">
            {knowledgeBases.length} configured
          </span>
        </div>
        <CardDescription>
          Add vector indices to enable knowledge search capabilities. Each knowledge base becomes a named search tool for your agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        {/* Existing Knowledge Bases */}
        {knowledgeBases.length > 0 && (
          <div className="space-y-3">
            {knowledgeBases.map((kb, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-800/50 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${index}`} className="text-xs text-muted-foreground">
                      Index Name <span className="text-muted-foreground/70">(lowercase letters and dashes only)</span>
                    </Label>
                    <Input
                      id={`name-${index}`}
                      value={kb.name}
                      onChange={(e) => handleUpdateKnowledgeBase(index, 'name', e.target.value)}
                      placeholder="documentation-search"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`index-${index}`} className="text-xs text-muted-foreground">
                      Index Key
                    </Label>
                    <Input
                      id={`index-${index}`}
                      value={kb.index_name}
                      onChange={(e) => handleUpdateKnowledgeBase(index, 'index_name', e.target.value)}
                      placeholder="my-knowledge-index"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`desc-${index}`} className="text-xs text-muted-foreground">
                      Description
                    </Label>
                    <Textarea
                      id={`desc-${index}`}
                      value={kb.description}
                      onChange={(e) => handleUpdateKnowledgeBase(index, 'description', e.target.value)}
                      placeholder="Contains documentation about..."
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveKnowledgeBase(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Knowledge Base */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plus className="h-4 w-4" />
            Add New Knowledge Base
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-name" className="text-xs text-muted-foreground">
                Tool Name <span className="text-muted-foreground/70">(lowercase letters and dashes only)</span>
              </Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(formatKnowledgeBaseName(e.target.value))}
                placeholder="documentation-search"
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddKnowledgeBase();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-index" className="text-xs text-muted-foreground">
                Index Name
              </Label>
              <Input
                id="new-index"
                value={newIndexName}
                onChange={(e) => setNewIndexName(e.target.value)}
                placeholder="my-knowledge-index"
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddKnowledgeBase();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-desc" className="text-xs text-muted-foreground">
                Description
              </Label>
              <Textarea
                id="new-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What kind of information does this knowledge base contain?"
                className="min-h-[60px] resize-none"
              />
            </div>
            <Button
              onClick={handleAddKnowledgeBase}
              disabled={!newName.trim() || !newIndexName.trim() || !newDescription.trim()}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Knowledge Base
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};