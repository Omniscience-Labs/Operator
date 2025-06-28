/**
 * Meeting Recorder Link Component
 * 
 * Links to the dedicated meetings feature for recording and transcription
 */

import React from 'react';
import { FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UploadedFile } from './chat-input';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface MeetingRecorderProps {
  onFileAttached: (file: UploadedFile) => void;
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  sandboxId?: string;
  messages?: any[];
  disabled?: boolean;
}

export const MeetingRecorder: React.FC<MeetingRecorderProps> = ({
  disabled = false,
}) => {
  const router = useRouter();

  const handleClick = () => {
    // Open meetings in a new tab to preserve current chat context
    window.open('/meetings', '_blank');
    toast.info('Opening meetings in a new tab. Create a meeting and use "Open in Chat" to attach the transcript.');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClick}
            disabled={disabled}
            className="h-8 w-8 p-0 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
          >
            <FileAudio className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Open Meetings</TooltipContent>
      </Tooltip>
    </TooltipProvider>
      );
  }; 
