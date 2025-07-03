import React, { useState } from 'react';
import { Plus, FolderOpen, Upload, Key, Trash2, Edit2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useKnowledgeIndexes, useCreateKnowledgeIndex, useUpdateKnowledgeIndex, useDeleteKnowledgeIndex, KnowledgeIndex } from '@/hooks/react-query/knowledge/use-knowledge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface KnowledgeConfigurationProps {
  selectedIndexes: string[];
  onIndexesChange: (indexes: string[]) => void;
}

export const KnowledgeConfiguration = ({ selectedIndexes, onIndexesChange }: KnowledgeConfigurationProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<KnowledgeIndex | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<KnowledgeIndex | null>(null);
  
  // Form state for create/edit dialog
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    index_type: 'uploaded' as 'uploaded' | 'external',
    llamacloud_index_key: ''
  });

  // Queries and mutations
  const { data: indexes, isLoading } = useKnowledgeIndexes();
  const createMutation = useCreateKnowledgeIndex();
  const updateMutation = useUpdateKnowledgeIndex();
  const deleteMutation = useDeleteKnowledgeIndex();

  const handleToggleIndex = (indexId: string) => {
    if (selectedIndexes.includes(indexId)) {
      onIndexesChange(selectedIndexes.filter(id => id !== indexId));
    } else {
      onIndexesChange([...selectedIndexes, indexId]);
    }
  };

  const handleCreateIndex = async () => {
    if (!formData.name || !formData.description) return;
    
    if (formData.index_type === 'external' && !formData.llamacloud_index_key) {
      return;
    }

    await createMutation.mutateAsync({
      name: formData.name,
      description: formData.description,
      index_type: formData.index_type,
      llamacloud_index_key: formData.index_type === 'external' ? formData.llamacloud_index_key : undefined
    });

    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleUpdateIndex = async () => {
    if (!editingIndex) return;

    await updateMutation.mutateAsync({
      indexId: editingIndex.index_id,
      data: {
        name: formData.name,
        description: formData.description
      }
    });

    setEditingIndex(null);
    resetForm();
  };

  const handleDeleteIndex = async () => {
    if (!deletingIndex) return;

    await deleteMutation.mutateAsync(deletingIndex.index_id);
    
    // Remove from selected indexes if it was selected
    if (selectedIndexes.includes(deletingIndex.index_id)) {
      onIndexesChange(selectedIndexes.filter(id => id !== deletingIndex.index_id));
    }

    setDeletingIndex(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      index_type: 'uploaded',
      llamacloud_index_key: ''
    });
  };

  const openEditDialog = (index: KnowledgeIndex) => {
    setEditingIndex(index);
    setFormData({
      name: index.name,
      description: index.description,
      index_type: index.index_type,
      llamacloud_index_key: index.llamacloud_index_key
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Knowledge Bases</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Select knowledge bases this agent can search through
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Knowledge Base
        </Button>
      </div>

      <div className="space-y-3">
        {indexes && indexes.length > 0 ? (
          indexes.map((index) => (
            <Card key={index.index_id} className="transition-all hover:shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIndexes.includes(index.index_id)}
                    onCheckedChange={() => handleToggleIndex(index.index_id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium text-sm">{index.name}</h4>
                      <Badge variant={index.index_type === 'external' ? 'outline' : 'secondary'} className="text-xs">
                        {index.index_type === 'external' ? 'External' : 'Uploaded'}
                      </Badge>
                      {index.file_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {index.file_count} files
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {index.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(index)}
                        className="h-7 px-2"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingIndex(index)}
                        className="h-7 px-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <FolderOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No knowledge bases configured yet.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create your first knowledge base
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={isCreateDialogOpen || !!editingIndex} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingIndex(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingIndex ? 'Edit Knowledge Base' : 'Add Knowledge Base'}
            </DialogTitle>
            <DialogDescription>
              {editingIndex 
                ? 'Update the knowledge base information.'
                : 'Create a new knowledge base by uploading files or connecting to an existing LlamaCloud index.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingIndex && (
              <div className="space-y-3">
                <Label>Type</Label>
                <RadioGroup
                  value={formData.index_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, index_type: value as 'uploaded' | 'external' }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="uploaded" id="uploaded" />
                    <Label htmlFor="uploaded" className="font-normal cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        <span>Upload files to create new index</span>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="external" id="external" />
                    <Label htmlFor="external" className="font-normal cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        <span>Connect existing LlamaCloud index</span>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Product Documentation"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description
                <span className="text-xs text-muted-foreground ml-2">
                  (This helps the agent understand when to search this knowledge base)
                </span>
              </Label>
              <Textarea
                id="description"
                placeholder="e.g., Contains all product documentation, API references, and user guides"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {!editingIndex && formData.index_type === 'external' && (
              <div className="space-y-2">
                <Label htmlFor="index_key">LlamaCloud Index Key</Label>
                <Input
                  id="index_key"
                  placeholder="Enter your existing LlamaCloud index key"
                  value={formData.llamacloud_index_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, llamacloud_index_key: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingIndex(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingIndex ? handleUpdateIndex : handleCreateIndex}
              disabled={
                !formData.name || 
                !formData.description || 
                (formData.index_type === 'external' && !formData.llamacloud_index_key) ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingIndex ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingIndex} onOpenChange={(open) => !open && setDeletingIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Base</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingIndex?.name}"? This action cannot be undone.
              {deletingIndex?.file_count && deletingIndex.file_count > 0 && (
                <span className="block mt-2 font-medium">
                  This will also delete {deletingIndex.file_count} associated file{deletingIndex.file_count > 1 ? 's' : ''}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIndex}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};