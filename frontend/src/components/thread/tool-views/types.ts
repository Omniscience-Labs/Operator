import { Project } from '@/lib/api';

export interface ToolViewProps {
  assistantContent?: string;
  toolContent?: string;
  assistantTimestamp?: string;
  toolTimestamp?: string;
  isSuccess?: boolean;
  isStreaming?: boolean;
  project?: Project;
  agent?: {
    knowledge_bases?: Array<{ name?: string; index_name?: string; description?: string }>;
  };
  name?: string;
  messages?: any[];
  agentStatus?: string;
  currentIndex?: number;
  totalCalls?: number;
  onFileClick?: (filePath: string) => void;
}

export interface BrowserToolViewProps extends ToolViewProps {
  name?: string;
}
