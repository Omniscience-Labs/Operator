'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface OutlookIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function OutlookIntegrationDialog({
  open,
  onOpenChange,
  onSuccess,
}: OutlookIntegrationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [pollTimeoutId, setPollTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const initiateConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${API_URL}/integrations/composio/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integration_type: 'outlook',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to initiate connection');
      }

      const data = await response.json();
      
      if (data.status === 'already_connected') {
        toast.success('Outlook is already connected!');
        onSuccess?.();
        onOpenChange(false);
        return;
      }
      
      setRedirectUrl(data.redirect_url);
      setConnectionId(data.connected_account_id);
      
      // Open the redirect URL in a new window
      const authWindow = window.open(data.redirect_url, '_blank', 'width=600,height=700');
      
      // Poll for connection status
      if (authWindow) {
        startStatusPolling();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate connection');
      console.error('Error initiating Outlook connection:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    if (!connectionId) return false;
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return false;

      const response = await fetch(`${API_URL}/integrations/composio/status/outlook`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('Status check failed with status:', response.status);
        return false;
      }

      const data = await response.json();
      
      // Log detailed status for debugging
      console.log('Connection status check:', {
        status: data.status,
        callbackReceived: data.callback_received,
        details: data.details
      });
      
      return data.status === 'connected';
    } catch (err) {
      console.error('Error checking connection status:', err);
      return false;
    }
  };

  const startStatusPolling = () => {
    setCheckingStatus(true);
    
    let pollCount = 0;
    let pollDelay = 1000; // Start with 1 second
    const maxDelay = 10000; // Max 10 seconds between polls
    const maxPollTime = 300000; // 5 minutes total
    const startTime = Date.now();
    
    const poll = async () => {
      // Check if dialog was closed
      if (!open) {
        setCheckingStatus(false);
        return;
      }
      
      // Check if we've exceeded max polling time
      if (Date.now() - startTime > maxPollTime) {
        setCheckingStatus(false);
        if (open) {
          setError('Connection timeout. Please try again.');
        }
        return;
      }
      
      const isConnected = await checkConnectionStatus();
      
      if (isConnected) {
        setCheckingStatus(false);
        toast.success('Outlook connected successfully!');
        onSuccess?.();
        onOpenChange(false);
      } else {
        // Exponential backoff with max delay
        pollCount++;
        pollDelay = Math.min(pollDelay * 1.5, maxDelay);
        
        // Schedule next poll
        const timeoutId = setTimeout(poll, pollDelay);
        setPollTimeoutId(timeoutId);
      }
    };
    
    // Start polling after a short initial delay to allow OAuth callback to process
    const timeoutId = setTimeout(poll, 2000);
    setPollTimeoutId(timeoutId);
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsLoading(false);
      setError(null);
      setRedirectUrl(null);
      setCheckingStatus(false);
      setConnectionId(null);
      
      // Clear any pending timeouts
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
        setPollTimeoutId(null);
      }
    }
  }, [open, pollTimeoutId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[475px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>Connect Microsoft Outlook</DialogTitle>
              <DialogDescription>
                Connect your Outlook account to send and manage emails directly from the chat.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {checkingStatus ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Waiting for authorization...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please complete the authentication in the popup window
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Secure OAuth Connection</p>
                    <p className="text-sm text-muted-foreground">
                      Your credentials are handled securely by Microsoft
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Email Management</p>
                    <p className="text-sm text-muted-foreground">
                      Send emails, read inbox, and manage your messages
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Privacy First</p>
                    <p className="text-sm text-muted-foreground">
                      Disconnect anytime from the tools dropdown
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A popup window will open for Microsoft authentication. Please make sure popups are allowed for this site.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading || checkingStatus}
          >
            Cancel
          </Button>
          <Button
            onClick={initiateConnection}
            disabled={isLoading || checkingStatus}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect Outlook
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 