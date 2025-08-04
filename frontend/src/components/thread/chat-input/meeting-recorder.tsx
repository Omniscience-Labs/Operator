/**
 * Meeting Recorder Link Component
 * 
 * Creates a new meeting directly and opens it for recording and transcription
 */

import React, { useState } from 'react';
import { FileAudio, Loader2 } from 'lucide-react';
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
import { createMeeting } from '@/lib/api-meetings';

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
  const [isCreating, setIsCreating] = useState(false);

  const handleClick = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      // Generate a default meeting name with timestamp
      const now = new Date();
      const defaultName = `Chat Meeting ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      // Create meeting directly
      const meeting = await createMeeting(defaultName, undefined, 'local');
      
      // Open the created meeting in a new tab to preserve current chat context
      window.open(`/meetings/${meeting.meeting_id}`, '_blank');
      toast.success('Meeting created! Opening in new tab for recording.');
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to create meeting. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={handleClick}
            disabled={disabled || isCreating}
            className="h-7 rounded-md text-muted-foreground"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileAudio className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-black text-white border-black">
          {isCreating ? 'Creating Meeting...' : 'Start New Meeting'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
      );
  }; 
