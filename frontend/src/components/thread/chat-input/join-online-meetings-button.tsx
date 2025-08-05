/**
 * Join Online Meetings Button Component
 * 
 * A dedicated button for joining online meetings with a popup dialog
 */

import React, { useState } from 'react';
import { Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { JoinOnlineMeetingDialog } from './join-online-meeting-dialog';

interface JoinOnlineMeetingsButtonProps {
  disabled?: boolean;
}

export const JoinOnlineMeetingsButton: React.FC<JoinOnlineMeetingsButtonProps> = ({
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
              className="h-7 rounded-md text-muted-foreground join-online-meetings-btn"
              data-testid="join-online-meetings-button"
            >
              <Video className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-black text-white border-black">
            Join Online Meetings
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