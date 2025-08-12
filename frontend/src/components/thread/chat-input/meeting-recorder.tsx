/**
 * Meeting Recorder Link Component
 * 
 * Opens the Join Online Meeting dialog for AI bot recording and transcription
 */

import React, { useState } from 'react';
import { FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UploadedFile } from './chat-input';
import { JoinOnlineMeetingDialog } from './join-online-meeting-dialog';

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
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  const handleClick = () => {
    setShowJoinDialog(true);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={handleClick}
              disabled={disabled}
              className="h-7 rounded-md text-muted-foreground"
              data-testid="join-online-meeting-button"
            >
              <FileAudio className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-black text-white border-black">
            Join Online Meeting
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <JoinOnlineMeetingDialog
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
      />
    </>
  );
}; 
