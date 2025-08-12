/**
 * Join Online Meeting Dialog Component
 * 
 * Reusable dialog for joining online meetings (Zoom, etc.) with AI bot recording
 */

import React, { useState } from 'react';
import { Monitor, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createMeeting } from '@/lib/api-meetings';
import { createClient } from '@/lib/supabase/client';

interface JoinOnlineMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinOnlineMeetingDialog: React.FC<JoinOnlineMeetingDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const handleStartOnlineRecording = async () => {
    if (!meetingUrl.trim()) return;

    setIsStarting(true);
    try {
      // Create a meeting first for the bot to use
      const now = new Date();
      const meetingName = `Online Meeting ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      const meeting = await createMeeting(meetingName, undefined, 'online');

      // Get user session for authentication
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      if (!session?.access_token) {
        throw new Error('You must be logged in to start online recording');
      }

      // Start meeting bot
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meeting-bot/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          meeting_url: meetingUrl,
          sandbox_id: meeting.meeting_id, // Using meeting ID as sandbox ID
          user_id: user?.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Update meeting metadata with bot info and recording mode
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/meetings/${meeting.meeting_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            metadata: { bot_id: data.bot_id, meeting_url: meetingUrl },
            recording_mode: 'online',
            status: 'active',
          }),
        });

        toast.success('Meeting bot is joining the meeting...');
        
        // Open the meeting detail page in a new tab to preserve chat context
        window.open(`/meetings/${meeting.meeting_id}`, '_blank');
        
        // Close dialog and reset state
        onOpenChange(false);
        setMeetingUrl('');
      } else {
        throw new Error(data.error || 'Failed to start meeting bot');
      }
    } catch (error) {
      console.error('Error starting online recording:', error);
      toast.error('Failed to start online meeting recording. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleClose = () => {
    if (!isStarting) {
      onOpenChange(false);
      setMeetingUrl('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-4 bg-gradient-to-br from-card/95 via-card to-card/90 backdrop-blur border border-border/50 shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Join Online Meeting
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80 leading-relaxed text-sm">
            Enter the meeting URL to join with an AI bot that will record and transcribe the conversation
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6 py-4">
          <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
              <strong>Google Meet temporarily unavailable:</strong> Our bot is currently experiencing issues with Google Meet. Please use Zoom or other supported platforms. We're working on a fix!
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="meeting-url" className="text-sm font-medium text-foreground/90">
              Meeting URL
            </Label>
            <Input
              id="meeting-url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/123456789"
              onKeyDown={(e) => e.key === 'Enter' && !isStarting && handleStartOnlineRecording()}
              disabled={isStarting}
              className="h-11 bg-background/50 backdrop-blur border-border/50 shadow-sm focus:shadow-md transition-colors duration-200 placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
        
        <DialogFooter className="gap-3 flex-col sm:flex-row">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isStarting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleStartOnlineRecording} 
            disabled={!meetingUrl.trim() || isStarting}
            className="w-full sm:w-auto"
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Monitor className="h-4 w-4 mr-2" />
            )}
            <span className="flex items-center gap-2">
              <span className="hidden sm:inline">
                {isStarting ? 'Starting...' : 'Start Bot Recording'}
              </span>
              <span className="sm:hidden">
                {isStarting ? 'Starting...' : 'Start Recording'}
              </span>
              <Badge variant="beta" className="bg-blue-500 text-white border-blue-500 text-xs px-1.5 py-0.5">
                Beta
              </Badge>
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};