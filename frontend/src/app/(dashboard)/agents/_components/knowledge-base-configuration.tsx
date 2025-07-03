import React, { useState, useCallback } from 'react';
import { 
  Folder, 
  Upload, 
  Key, 
  Trash2, 
  Plus, 
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDropzone } from 'react-dropzone';
import { 
  useKnowledgeBases,
  useCreateKnowledgeBase,
  useDeleteKnowledgeBase,
  useKnowledgeBaseFiles,
  useUploadKnowledgeFile,
  useDeleteKnowledgeFile,
  type KnowledgeBase
} from '@/hooks/react-query/knowledge/use-knowledge-bases';

interface KnowledgeBaseConfigurationProps {
  agentId?: string;
}

export function KnowledgeBaseConfiguration({ agentId }: KnowledgeBaseConfigurationProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [deleteConfirmKb, setDeleteConfirmKb] = useState<KnowledgeBase | null>(null);

  const { data: knowledgeBases, isLoading } = useKnowledgeBases(agentId);
  const createKnowledgeBase = useCreateKnowledgeBase();
  const deleteKnowledgeBase = useDeleteKnowledgeBase();

  const handleCreateKnowledgeBase = async (data: {
    name: string;
    description?: string;
    type: 'managed' | 'external';
    externalIndexId?: string;
  }) => {
    await createKnowledgeBase.mutateAsync({
      name: data.name,
      description: data.description,
      agent_id: agentId,
      index_type: data.type,
      llama_index_id: data.type === 'external' ? data.externalIndexId : undefined,
    });
    setIsCreateDialogOpen(false);
  };

  const handleDeleteKnowledgeBase = async (kb: KnowledgeBase) => {
    await deleteKnowledgeBase.mutateAsync(kb.id);
    setDeleteConfirmKb(null);
    if (selectedKnowledgeBase?.id === kb.id) {
      setSelectedKnowledgeBase(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Ready</Badge>;
      case 'indexing':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Indexing</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Knowledge Bases</h3>
          <p className="text-sm text-muted-foreground">
            Add custom knowledge bases to enhance your agent's capabilities
          </p>
        </div>
        <CreateKnowledgeBaseDialog
          isOpen={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreate={handleCreateKnowledgeBase}
        />
      </div>

      {!knowledgeBases || knowledgeBases.length === 0 ? (
        <Card className="p-6 text-center">
          <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h4 className="text-sm font-medium mb-2">No knowledge bases yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Create a knowledge base to give your agent access to custom documents and data
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Knowledge Base
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {knowledgeBases.map((kb) => (
            <Card
              key={kb.id}
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedKnowledgeBase(kb)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{kb.name}</h4>
                    {getStatusBadge(kb.status)}
                  </div>
                  {kb.description && (
                    <p className="text-sm text-muted-foreground mt-1">{kb.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{kb.index_type === 'external' ? 'External Index' : 'Managed Index'}</span>
                    {kb.llama_index_id && (
                      <span className="flex items-center gap-1">
                        <Key className="h-3 w-3" />
                        {kb.llama_index_id}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmKb(kb);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Knowledge Base Details Dialog */}
      {selectedKnowledgeBase && (
        <KnowledgeBaseDetailsDialog
          knowledgeBase={selectedKnowledgeBase}
          isOpen={!!selectedKnowledgeBase}
          onClose={() => setSelectedKnowledgeBase(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmKb} onOpenChange={() => setDeleteConfirmKb(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Base</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmKb?.name}"? This will permanently delete
              all associated files and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmKb && handleDeleteKnowledgeBase(deleteConfirmKb)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Create Knowledge Base Dialog
function CreateKnowledgeBaseDialog({
  isOpen,
  onOpenChange,
  onCreate,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'managed' as 'managed' | 'external',
    externalIndexId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    setFormData({ name: '', description: '', type: 'managed', externalIndexId: '' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Knowledge Base
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Knowledge Base</DialogTitle>
          <DialogDescription>
            Create a new knowledge base to store and index your documents
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Company Documentation"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this knowledge base contains"
              rows={3}
            />
          </div>
          <Tabs value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="managed">Upload Files</TabsTrigger>
              <TabsTrigger value="external">Existing Index</TabsTrigger>
            </TabsList>
            <TabsContent value="managed" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Create a new index by uploading documents. Files will be processed and indexed in LlamaCloud.
              </p>
            </TabsContent>
            <TabsContent value="external" className="space-y-2">
              <div>
                <Label htmlFor="indexId">LlamaCloud Index ID</Label>
                <Input
                  id="indexId"
                  value={formData.externalIndexId}
                  onChange={(e) => setFormData({ ...formData, externalIndexId: e.target.value })}
                  placeholder="Enter existing index ID"
                  required={formData.type === 'external'}
                />
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Knowledge Base Details Dialog
function KnowledgeBaseDetailsDialog({
  knowledgeBase,
  isOpen,
  onClose,
}: {
  knowledgeBase: KnowledgeBase;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: files, isLoading: filesLoading } = useKnowledgeBaseFiles(knowledgeBase.id);
  const uploadFile = useUploadKnowledgeFile();
  const deleteFile = useDeleteKnowledgeFile();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        await uploadFile.mutateAsync({
          knowledgeBaseId: knowledgeBase.id,
          file,
        });
      }
    },
    [knowledgeBase.id, uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': [],
      'application/pdf': [],
      'application/msword': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
    },
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{knowledgeBase.name}</DialogTitle>
          {knowledgeBase.description && (
            <DialogDescription>{knowledgeBase.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {knowledgeBase.index_type === 'managed' ? (
            <>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}
                `}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports text files, PDFs, and Word documents
                </p>
              </div>

              {filesLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : files && files.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Files ({files.length})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.file_size)} • {file.status}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            deleteFile.mutate({
                              knowledgeBaseId: knowledgeBase.id,
                              fileId: file.id,
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No files uploaded yet
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This knowledge base is connected to an external LlamaCloud index.
              </p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <Key className="h-4 w-4 text-muted-foreground" />
                <code className="text-sm">{knowledgeBase.llama_index_id}</code>
              </div>
            </div>
          )}

          {knowledgeBase.error_message && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <p className="text-sm">{knowledgeBase.error_message}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}