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
import { Loader2, FolderOpen, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface DropboxIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DropboxIntegrationDialog({
  open,
  onOpenChange,
  onSuccess,
}: DropboxIntegrationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);

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
          integration_type: 'dropbox',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to initiate connection');
      }

      const data = await response.json();
      
      if (data.status === 'already_connected') {
        toast.success('Dropbox is already connected!');
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
      console.error('Error initiating Dropbox connection:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return false;

      const response = await fetch(`${API_URL}/integrations/composio/status/dropbox`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.status === 'connected';
    } catch (err) {
      console.error('Error checking connection status:', err);
      return false;
    }
  };

  const startStatusPolling = () => {
    setCheckingStatus(true);
    
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes total (60 * 2 seconds)
    
    const pollInterval = setInterval(async () => {
      attempts++;
      console.log(`Checking Dropbox connection status (attempt ${attempts}/${maxAttempts})...`);
      
      const isConnected = await checkConnectionStatus();
      
      if (isConnected) {
        clearInterval(pollInterval);
        setCheckingStatus(false);
        toast.success('Dropbox connected successfully!');
        onSuccess?.();
        onOpenChange(false);
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        setCheckingStatus(false);
        setError('Connection timeout. Please try again.');
        toast.error('Connection timeout. Please try again.');
      }
    }, 2000); // Poll every 2 seconds

    // Clean up interval if dialog is closed
    return () => clearInterval(pollInterval);
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsLoading(false);
      setError(null);
      setRedirectUrl(null);
      setCheckingStatus(false);
      setConnectionId(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[475px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>Connect Dropbox</DialogTitle>
              <DialogDescription>
                Connect your Dropbox account to manage files and folders directly from the chat.
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
                      Your credentials are handled securely by Dropbox
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium">File Management</p>
                    <p className="text-sm text-muted-foreground">
                      Upload, download, and organize your files and folders
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
                  A popup window will open for Dropbox authentication. Please make sure popups are allowed for this site.
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
                Connect Dropbox
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 