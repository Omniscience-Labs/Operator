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
    if (!connectionId) return false;
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return false;

      const response = await fetch(`${API_URL}/integrations/composio/status?integration_type=dropbox`, {
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
    const pollInterval = setInterval(async () => {
      const isConnected = await checkConnectionStatus();
      if (isConnected) {
        clearInterval(pollInterval);
        setCheckingStatus(false);
        toast.success('Dropbox connected successfully!');
        onSuccess?.();
        onOpenChange(false);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (checkingStatus) {
        setCheckingStatus(false);
        setError('Connection timeout. Please try again.');
      }
    }, 300000);
  };

  useEffect(() => {
    // Reset state when dialog closes
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Connect Dropbox
          </DialogTitle>
          <DialogDescription>
            Connect your Dropbox account to manage files and folders directly from your conversations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!redirectUrl && !checkingStatus && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium">What you'll be able to do:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• List and search files</li>
                  <li>• Upload and download files</li>
                  <li>• Create and manage folders</li>
                  <li>• Share files and get links</li>
                </ul>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You'll be redirected to Dropbox to authorize access. This is secure and you can revoke access at any time.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {checkingStatus && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <div>
                <p className="font-medium">Waiting for authorization...</p>
                <p className="text-sm text-muted-foreground">
                  Please complete the authorization in the popup window.
                </p>
              </div>
              {redirectUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(redirectUrl, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Reopen Authorization Window
                </Button>
              )}
            </div>
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
          {!checkingStatus && (
            <Button
              onClick={initiateConnection}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <FolderOpen className="h-4 w-4" />
                  Connect Dropbox
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 