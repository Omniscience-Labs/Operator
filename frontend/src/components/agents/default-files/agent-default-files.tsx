import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Upload, File, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useUploadAgentDefaultFile, useDeleteAgentDefaultFile, useListAgentDefaultFiles } from '@/hooks/react-query/agents/use-agent-default-files';

interface AgentDefaultFilesProps {
  agentId: string;
  isEditable?: boolean;
  className?: string;
}

interface DefaultFile {
  name: string;
  storage_path: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
}

export function AgentDefaultFiles({ agentId, isEditable = true, className }: AgentDefaultFilesProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: files = [], isLoading, refetch } = useListAgentDefaultFiles(agentId);
  const uploadMutation = useUploadAgentDefaultFile();
  const deleteMutation = useDeleteAgentDefaultFile();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        if (file.size > 500 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds 500MB limit`);
          continue;
        }

        await uploadMutation.mutateAsync({
          agentId,
          file
        });
        
        toast.success(`Uploaded ${file.name}`);
      }
      
      refetch();
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileDelete = async (filename: string) => {
    try {
      await deleteMutation.mutateAsync({ agentId, filename });
      toast.success(`Deleted ${filename}`);
      refetch();
    } catch (error: any) {
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('text')) return '📋';
    return '📎';
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Default Files</CardTitle>
        {isEditable && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8"
            >
              <Upload className="h-4 w-4 mr-1" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept="*/*"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <File className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No default files uploaded</p>
            <p className="text-xs mt-1">
              Files uploaded here will be available in every new chat session
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file: DefaultFile) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg">{getFileIcon(file.mime_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • Uploaded {new Date(file.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {isEditable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFileDelete(file.name)}
                    disabled={deleteMutation.isPending}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {files.length > 0 && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              💡 These files will be automatically available in <code>/workspace/agent-defaults/</code> for every new chat session with this agent.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              📁 Maximum file size: 500MB per file. For better performance, consider keeping files under 50MB when possible.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}