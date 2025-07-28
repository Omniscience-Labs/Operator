'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/thread/tool-views/shared/LoadingState';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';

interface SandboxPageProps {
  params: Promise<{
    projectId: string;
    path: string[];
  }>;
}

interface SandboxStatus {
  status: 'checking' | 'active' | 'restarting' | 'error';
  message?: string;
  directUrl?: string;
}

export default function SandboxPage({ params }: SandboxPageProps) {
  const router = useRouter();
  const [unwrappedParams] = React.useState(() => React.use(params));
  const { projectId, path } = unwrappedParams;
  
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>({ 
    status: 'checking' 
  });
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Construct the file path from the path array
  const filePath = path?.join('/') || 'index.html';

  // API URL for backend
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  const checkSandboxStatus = async (shouldRestart = true): Promise<void> => {
    try {
      setSandboxStatus({ status: 'checking' });
      const supabase = createClient();

      // Get project info to find the sandbox URL
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (projectError || !projectData?.sandbox?.id) {
        setSandboxStatus({
          status: 'error',
          message: 'Project or sandbox not found. The link may be invalid or the project may have been deleted.',
        });
        return;
      }

      const sandbox = projectData.sandbox;
      
      // Try to access the sandbox directly first
      try {
        // Extract base URL from sandbox_url and construct the file path URL
        const baseUrl = sandbox.sandbox_url?.replace(':8080', '') || '';
        const testUrl = `${baseUrl}:8080/${filePath}`;
        const testResponse = await fetch(testUrl, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(8000), // Increased timeout
        });
        
        if (testResponse.ok) {
          setSandboxStatus({ 
            status: 'active',
            directUrl: testUrl,
          });
          // Redirect immediately if sandbox is already active
          window.location.href = testUrl;
          return;
        }
      } catch (error) {
        // Sandbox is likely stopped, continue to restart logic
      }

      // If we get here, sandbox needs to be restarted
      if (shouldRestart) {
        setSandboxStatus({ status: 'restarting' });
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };

          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }

          const restartResponse = await fetch(`${API_URL}/project/${projectId}/sandbox/ensure-active`, {
            method: 'POST',
            headers,
            signal: AbortSignal.timeout(130000), // 130s timeout (slightly more than backend)
          });

          if (!restartResponse.ok) {
            let errorMessage = 'Failed to restart sandbox. Please try again.';
            
            try {
              const errorData = await restartResponse.json();
              if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                  errorMessage = errorData.detail;
                } else if (errorData.detail.message) {
                  errorMessage = errorData.detail.message;
                }
              }
            } catch (parseError) {
              console.log('Could not parse error response:', parseError);
            }
            
            setSandboxStatus({
              status: 'error',
              message: errorMessage,
            });
            return;
          }

          // Wait longer for sandbox services to start up properly
          await new Promise(resolve => setTimeout(resolve, 8000));
          
          // Retry with exponential backoff to ensure service is ready
          const baseUrl = sandbox.sandbox_url?.replace(':8080', '') || '';
          const finalUrl = `${baseUrl}:8080/${filePath}`;
          const pingUrl = `${baseUrl}:8080/ping`;
          const healthUrl = `${baseUrl}:8080/health`;
          
          // First, try to verify the service is responding at all
          let serviceIsResponding = false;
          
          for (let attempt = 1; attempt <= 5; attempt++) {
            try {
              // Try multiple approaches to verify the service
              console.log(`Attempt ${attempt}: Checking service availability`);
              
              // Approach 1: Try the lightweight ping endpoint first
              try {
                const pingCheck = await fetch(pingUrl, { 
                  method: 'GET',
                  signal: AbortSignal.timeout(6000),
                });
                
                if (pingCheck.ok) {
                  console.log('Ping check passed');
                  serviceIsResponding = true;
                }
              } catch (pingError) {
                console.log('Ping endpoint not available, trying health check');
              }
              
              // Approach 2: Try the health endpoint
              if (!serviceIsResponding) {
                try {
                  const healthCheck = await fetch(healthUrl, { 
                    method: 'GET',
                    signal: AbortSignal.timeout(8000),
                  });
                  
                  if (healthCheck.ok) {
                    console.log('Health check passed');
                    serviceIsResponding = true;
                  }
                } catch (healthError) {
                  console.log('Health endpoint not available, trying direct file check');
                }
              }
              
              // Approach 3: Try direct file access (fallback)
              if (!serviceIsResponding) {
                const directCheck = await fetch(finalUrl, { 
                  method: 'HEAD',
                  signal: AbortSignal.timeout(8000),
                });
                
                if (directCheck.ok) {
                  console.log('Direct file check passed');
                  serviceIsResponding = true;
                }
              }
              
              // Approach 4: Try any response from the server (even 404 means server is running)
              if (!serviceIsResponding) {
                const basicCheck = await fetch(`${baseUrl}:8080/`, { 
                  method: 'HEAD',
                  signal: AbortSignal.timeout(8000),
                });
                
                // Any response code means the server is running
                console.log(`Basic server check: ${basicCheck.status}`);
                serviceIsResponding = true;
              }
              
              if (serviceIsResponding) {
                setSandboxStatus({ 
                  status: 'active',
                  directUrl: finalUrl,
                });
                // Redirect to the actual sandbox
                window.location.href = finalUrl;
                return;
              }
            } catch (error) {
              console.log(`Service check attempt ${attempt} failed:`, error);
            }
            
            // Wait before next attempt: 3s, 5s, 7s, 9s, 11s
            const waitTime = 3000 + (attempt * 2000);
            console.log(`Waiting ${waitTime/1000}s before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          // If we get here, health checks failed
          setSandboxStatus({
            status: 'error',
            message: 'Sandbox restarted successfully, but the web server is still starting up. This can happen during high server load or if your project has many files to initialize.',
            directUrl: finalUrl,
          });
        } catch (restartError) {
          console.error('Sandbox restart error:', restartError);
          
          let errorMessage = 'Failed to restart sandbox. Please try again.';
          
          if (restartError.name === 'AbortError' || restartError.message?.includes('timeout')) {
            errorMessage = 'Sandbox restart is taking longer than expected. Please wait a few minutes and try again.';
          } else if (restartError.message) {
            errorMessage = restartError.message;
          }
          
          setSandboxStatus({
            status: 'error',
            message: errorMessage,
          });
          return;
        }
      } else {
        // After restart, try to get the final URL (legacy fallback)
        try {
          const baseUrl = sandbox.sandbox_url?.replace(':8080', '') || '';
          const finalUrl = `${baseUrl}:8080/${filePath}`;
          setSandboxStatus({ 
            status: 'active',
            directUrl: finalUrl,
          });
          // Redirect to the actual sandbox
          window.location.href = finalUrl;
        } catch (error) {
          setSandboxStatus({
            status: 'error',
            message: 'Sandbox restarted but still not accessible. Please try again in a moment.',
          });
        }
      }
    } catch (error) {
      console.error('Error checking sandbox status:', error);
      setSandboxStatus({
        status: 'error',
        message: 'Failed to check sandbox status. Please check your internet connection and try again.',
      });
    }
  };

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      checkSandboxStatus();
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  // Start checking on mount
  useEffect(() => {
    checkSandboxStatus();
  }, [projectId, filePath]);

  // Render loading state
  if (sandboxStatus.status === 'checking') {
    return (
      <LoadingState
        title="Checking Sandbox Status"
        subtitle="Verifying if your sandbox is active..."
        progressText="Connecting..."
        filePath={filePath}
      />
    );
  }

  // Render restarting state
  if (sandboxStatus.status === 'restarting') {
    return (
      <LoadingState
        icon={RefreshCw}
        iconColor="text-blue-500 dark:text-blue-400"
        bgColor="bg-gradient-to-b from-blue-100 to-blue-50 shadow-inner dark:from-blue-800/40 dark:to-blue-900/60 dark:shadow-blue-950/20"
        title="Starting Sandbox"
        subtitle="Your sandbox was inactive and is now being restarted. This usually takes 15-30 seconds."
        progressText="Starting services..."
        filePath={filePath}
      />
    );
  }

  // Render error state
  if (sandboxStatus.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-center w-full max-w-md">
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center bg-gradient-to-b from-red-100 to-red-50 shadow-inner dark:from-red-800/40 dark:to-red-900/60 dark:shadow-red-950/20">
            <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          
          <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Sandbox Starting Up
          </h3>
          
          {filePath && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 w-full text-center mb-6 shadow-sm">
              <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300 break-all">
                {filePath}
              </code>
            </div>
          )}
          
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {sandboxStatus.message}
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col gap-3">
            {retryCount < maxRetries && (
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry ({maxRetries - retryCount} attempts left)
              </Button>
            )}
            
            {sandboxStatus.directUrl && (
              <Button variant="outline" asChild className="w-full">
                <a href={sandboxStatus.directUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Direct URL
                </a>
              </Button>
            )}
            
            <Button variant="ghost" onClick={handleGoToDashboard} className="w-full">
              Go to Dashboard
            </Button>
          </div>
          
          <div className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            <p>Your sandbox is starting up. This usually takes 15-30 seconds.</p>
            <p className="mt-2">If the direct URL doesn't work immediately, wait 30 seconds and try again.</p>
          </div>
        </div>
      </div>
    );
  }

  // This should rarely be seen as we redirect on success
  return (
    <LoadingState
      title="Redirecting..."
      subtitle="Taking you to your sandbox..."
      filePath={filePath}
    />
  );
} 