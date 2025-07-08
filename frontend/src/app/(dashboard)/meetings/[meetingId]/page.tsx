'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Monitor,
  User,
  Download,
  Share2,
  Search,
  MessageSquare,
  Loader2,
  Pause,
  Play,
  Square,
  AlertCircle,
  FileAudio,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  getMeeting,
  updateMeeting,
  TranscriptionWebSocket,
  type Meeting,
} from '@/lib/api-meetings';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/AuthProvider';
import { ScrollProgress } from '@/components/animate-ui/components/scroll-progress';
import { useScroll, useSpring, motion } from 'framer-motion';

// Speech recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.meetingId as string;
  const { user, session } = useAuth(); // Get current user and session for security
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ index: number; text: string }[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  
  // Recording states
  const [recordingMode, setRecordingMode] = useState<'local' | 'online' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [wsConnection, setWsConnection] = useState<TranscriptionWebSocket | null>(null);
  const [botStatus, setBotStatus] = useState<string>('');
  const [currentBotId, setCurrentBotId] = useState<string | null>(null);
  
  // Meeting URL dialog state
  const [showMeetingUrlDialog, setShowMeetingUrlDialog] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState('');
  
  // Timestamp tracking for local recordings
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState<number>(0);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const searchHighlightRefs = useRef<(HTMLSpanElement | null)[]>([]);
  
  // Custom scroll progress tracking
  const { scrollYProgress } = useScroll({ container: transcriptRef });
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 250,
    damping: 40,
    bounce: 0,
  });

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (transcriptRef.current && (isRecording || interimTranscript)) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript, isRecording]);

  // Calculate current elapsed time (excluding paused time)
  const getCurrentElapsedTime = (): number => {
    if (!recordingStartTime) return 0;
    const now = Date.now();
    const currentPausedTime = isPaused && pauseStartTime ? now - pauseStartTime : 0;
    return now - recordingStartTime - totalPausedTime - currentPausedTime;
  };

  // Load meeting data
  useEffect(() => {
    loadMeeting();
  }, [meetingId]);

  // Check bot status after meeting loads if there's an active bot
  useEffect(() => {
    if (!meeting || !currentBotId || !session?.access_token) return;
    
    // Only check if meeting is active with a bot
    if (meeting.status === 'active' && currentBotId) {
      const checkInitialBotStatus = async () => {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
          const response = await fetch(`${backendUrl}/meeting-bot/${currentBotId}/status`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          const botData = await response.json();
          
          if (botData.success) {
            const status = botData.status;
            setBotStatus(status);
            
            // If bot is in stopping/ended state, show processing pill
            if (['stopping', 'ended'].includes(status)) {
              setIsProcessingTranscript(true);
              toast.info('Meeting ended - waiting for transcript to process...');
              // Start polling for completion
              checkBotStatusWithPolling(currentBotId);
            } else if (['starting', 'joining', 'waiting', 'in_call', 'recording'].includes(status)) {
              // Bot is still active - show recording UI
              setRecordingMode('online');
              setIsRecording(true);
              toast.info('Reconnecting to existing meeting bot...');
              checkBotStatus(currentBotId);
            } else if (status === 'completed') {
              // Bot completed but meeting still marked active - clean up
              await updateMeeting(meetingId, {
                status: 'completed',
                metadata: { ...meeting.metadata, bot_id: undefined }
              });
              setMeeting(prev => prev ? {
                ...prev,
                status: 'completed',
                metadata: { ...prev.metadata, bot_id: undefined }
              } : prev);
              setCurrentBotId(null);
            }
          }
        } catch (error) {
          console.error('Error checking initial bot status:', error);
          // Default to showing recording UI
          setRecordingMode('online');
          setIsRecording(true);
          checkBotStatus(currentBotId);
        }
      };
      
      checkInitialBotStatus();
    }
  }, [meeting, currentBotId, session, meetingId]);

  // Periodically check for transcript updates when bot is recording
  useEffect(() => {
    if (!isRecording || recordingMode !== 'online' || !meeting) return;

    // Check for transcript updates every 30 seconds (less aggressive)
    const checkForTranscriptUpdates = async () => {
      try {
        const latestData = await getMeeting(meetingId);
        
        // If meeting completed and has transcript, update local state
        if (latestData.status === 'completed' && latestData.transcript && 
            latestData.transcript !== transcript) {
          console.log('[PERIODIC] Found updated transcript from webhook');
          setTranscript(latestData.transcript);
          setMeeting(latestData);
          setIsRecording(false);
          setRecordingMode(null);
          toast.success('Transcript received from webhook!');
        }
      } catch (error) {
        console.error('[PERIODIC] Error checking for transcript updates:', error);
      }
    };

    const intervalId = setInterval(checkForTranscriptUpdates, 30000); // 30 seconds

    // Cleanup interval on unmount or when recording stops
    return () => clearInterval(intervalId);
  }, [isRecording, recordingMode, meeting, meetingId, transcript]);

  const loadMeeting = async () => {
    try {
      setIsLoading(true);
      const data = await getMeeting(meetingId);
      setMeeting(data);
      setTranscript(data.transcript || '');
      
      // If meeting is active and has bot metadata, mark for reconnection
      if (data.status === 'active' && data.metadata?.bot_id) {
        const botId = data.metadata.bot_id;
        setCurrentBotId(botId);  // Restore bot ID
        setBotStatus('checking...');
        // Defer bot status check until after component mounts
      } else if (data.status === 'completed' && data.metadata?.bot_id) {
        // Meeting is completed but still has bot_id - clean it up
        await updateMeeting(meetingId, {
          metadata: { ...data.metadata, bot_id: undefined }
        });
        // Update local state
        setMeeting(prev => prev ? {
          ...prev,
          metadata: { ...prev.metadata, bot_id: undefined }
        } : prev);
      }
    } catch (error) {
      console.error('Error loading meeting:', error);
      toast.error('Failed to load meeting');
      router.push('/meetings');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (!meeting || meeting.status !== 'active') return;

    const initWebSocket = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const ws = new TranscriptionWebSocket(
        meetingId,
        session.access_token,
        (text) => {
          // Don't add WebSocket text if it's duplicate from speech recognition
          setTranscript((prev) => {
            const cleanText = text.trim();
            if (!cleanText || prev.includes(cleanText)) return prev;
            const cleanPrev = prev.trim();
            return cleanPrev + (cleanPrev ? '\n' : '') + cleanText;
          });
        },
        (status) => {
          if (status === 'completed') {
            setMeeting((prev) => prev ? { ...prev, status: 'completed' } : null);
            setIsRecording(false);
          }
        },
        (error) => {
          console.error('WebSocket error:', error);
          toast.error('Connection error');
        }
      );

      ws.connect();
      setWsConnection(ws);
    };

    initWebSocket();

    return () => {
      wsConnection?.disconnect();
    };
  }, [meeting, meetingId]);

  // Initialize speech recognition for local recording
  const initSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition is not supported in your browser');
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript.trim()) {
        // Send final transcript through WebSocket and add to local state
        wsConnection?.sendTranscript(finalTranscript.trim());
        setTranscript((prev) => {
          const cleanPrev = prev.trim(); // Remove trailing whitespace
          return cleanPrev + (cleanPrev ? '\n' : '') + finalTranscript.trim();
        });
      }
      
      // Store interim results separately for display only
      setInterimTranscript(interimTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Restart recognition on no-speech error
        recognition.stop();
        setTimeout(() => recognition.start(), 100);
      } else {
        toast.error(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      if (isRecording && !isPaused) {
        // Restart if still recording and not paused
        recognition.start();
      }
    };

    return recognition;
  }, [wsConnection, isRecording, isPaused]);

  // Start recording
  const startRecording = async (mode: 'local' | 'online') => {
    setRecordingMode(mode);

    if (mode === 'local') {
      const rec = initSpeechRecognition();
      if (!rec) return;

      setRecognition(rec);
      try {
        await rec.start();
        setIsRecording(true);
        setIsPaused(false);
        setRecordingStartTime(Date.now());
        setTotalPausedTime(0);
        setPauseStartTime(null);
        wsConnection?.updateStatus('active');
        
        // Add timestamp header for local recording session
        const now = new Date();
        const timestampHeader = `=== Recording Session Started: ${now.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })} at ${now.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        })} ===`;
        
        setTranscript(prev => {
          const newHeader = prev.trim() ? `\n\n${timestampHeader}\n\n` : `${timestampHeader}\n\n`;
          return prev + newHeader;
        });
        
        // If meeting was completed, reactivate it
        if (meeting?.status === 'completed') {
          await updateMeeting(meetingId, { status: 'active' });
        }
        
        toast.success('Recording started');
      } catch (error) {
        console.error('Error starting recording:', error);
        toast.error('Failed to start recording');
      }
    } else {
      // For online mode, show meeting URL input dialog
      setShowMeetingUrlDialog(true);
    }
  };

  // Continue recording (start a new session on existing transcript)
  const continueRecording = async (mode: 'local' | 'online') => {
    // No need for manual separators - webhook handles session tracking
    
    // Update meeting status to active
    await updateMeeting(meetingId, { 
      status: 'active'
    });
    
    // Start recording normally
    await startRecording(mode);
  };

  // Enhanced bot status display with progress indicators
  const getBotStatusDisplay = (status: string) => {
    switch (status) {
      case 'starting':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>Bot Starting...</span>
          </div>
        );
      case 'joining':
        return (
          <div className="flex items-center gap-2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Joining Meeting...</span>
          </div>
        );
      case 'waiting':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
            <span>Waiting for Access</span>
          </div>
        );
      case 'in_call':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>In Meeting</span>
          </div>
        );
      case 'recording':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Recording Active</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-600 rounded-full" />
            <span>Recording Complete</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-600 rounded-full" />
            <span>Bot Failed</span>
          </div>
        );
      case 'ended':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full" />
            <span>Meeting Ended</span>
          </div>
        );
      default:
        return `Bot ${status}`;
    }
  };

  // Handle starting online recording with URL
  const handleStartOnlineRecording = async () => {
    if (!meetingUrl.trim()) return;

    setShowMeetingUrlDialog(false);

    try {
      // Start meeting bot
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meeting-bot/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          meeting_url: meetingUrl,
          sandbox_id: meetingId, // Using meeting ID as sandbox ID
          user_id: user?.id, // Add user ID to the request (optional if not loaded)
        }),
      });

      const data = await response.json();
      if (data.success) {
        setBotStatus(data.status);
        setIsRecording(true);
        setCurrentBotId(data.bot_id);  // Store bot ID in state
        
        // Update meeting metadata with bot info and recording mode
        await updateMeeting(meetingId, {
          metadata: { bot_id: data.bot_id, meeting_url: meetingUrl },
          recording_mode: 'online',
          status: 'active',
        });

        // Also update local state immediately
        setMeeting(prev => prev ? {
          ...prev,
          metadata: { bot_id: data.bot_id, meeting_url: meetingUrl },
          recording_mode: 'online',
          status: 'active'
        } : prev);

        toast.success('Meeting bot is joining the meeting...');
        
        // Start polling for bot status
        checkBotStatus(data.bot_id);
      } else {
        throw new Error(data.error || 'Failed to start meeting bot');
      }
    } catch (error) {
      console.error('Error starting online recording:', error);
      
      // If error is "AlreadyStarted", try to find existing bot
      if (error.message.includes('AlreadyStarted')) {
        try {
          // Try to get existing bot for this meeting URL
          const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meeting-bot/find`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              meeting_url: meetingUrl,
              sandbox_id: meetingId,
            }),
          });

          const statusData = await statusResponse.json();
          if (statusData.success && statusData.bot_id) {
            setBotStatus(statusData.status || 'in_call');
            setIsRecording(true);
            
            // Update meeting metadata with existing bot info
            await updateMeeting(meetingId, {
              metadata: { bot_id: statusData.bot_id, meeting_url: meetingUrl },
              recording_mode: 'online',
              status: 'active',
            });

            toast.success('Reconnected to existing meeting bot!');
            checkBotStatus(statusData.bot_id);
          } else {
            toast.error('Bot already exists but could not reconnect');
          }
        } catch (findError) {
          console.error('Error finding existing bot:', findError);
          toast.error('Bot already running for this meeting URL. Please try again.');
        }
      } else {
        toast.error('Failed to start meeting bot');
      }
    }

    // Clear the URL for next time
    setMeetingUrl('');
  };

  // Stop recording
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);

  const stopRecording = async () => {
    if (recordingMode === 'local') {
      recognition?.stop();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingMode(null);
      setRecordingStartTime(null);
      setTotalPausedTime(0);
      setPauseStartTime(null);
      wsConnection?.updateStatus('completed');
      
      // Save transcript
      await updateMeeting(meetingId, {
        transcript,
        status: 'completed',
      });
      
      toast.success('Recording stopped and saved');
    } else if (recordingMode === 'online') {
      // Use currentBotId or meeting metadata bot_id
      const botId = currentBotId || meeting?.metadata?.bot_id;
      
      if (!botId) {
        toast.error('No bot ID found - cannot stop recording');
        setIsRecording(false);
        setRecordingMode(null);
        setBotStatus('');
        return;
      }
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meeting-bot/${botId}/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            sandbox_id: meetingId,
          }),
        });

        const data = await response.json();
        if (data.success && data.content) {
          // Webhook will handle transcript appending - just clean up UI
          setIsRecording(false);
          setRecordingMode(null);
          setBotStatus('completed');
          setCurrentBotId(null);
          
          // Refresh meeting data from database
          loadMeeting();
          toast.success('Meeting recording completed');
          setIsProcessingTranscript(true);
        } else if (data.success && data.status === 'stopping') {
          // Bot is stopping, wait for final transcript via polling
          toast.info('Stopping meeting bot, waiting for final transcript...');
          setBotStatus('stopping');
          setIsProcessingTranscript(true);
          
          // Continue polling for the final result
          setTimeout(() => {
            if (meeting?.metadata?.bot_id) {
              checkBotStatusWithPolling(meeting.metadata.bot_id);
            }
          }, 2000);
          
          return; // Don't set recording to false yet
        } else if (data.success) {
          // Meeting ended but transcript not ready yet. Keep polling until it arrives.
          toast.info('Meeting ended - waiting for transcript to finalize...');
          setBotStatus('stopping');
          setIsProcessingTranscript(true);
          // Continue polling for the final result
          setTimeout(() => {
            if (botId) {
              checkBotStatusWithPolling(botId);
            }
          }, 1000);
          return; // Defer clearing recording state until transcript is ready
        } else {
          // Handle partial success or informational errors
          const errorMessage = data.error || 'Unknown error occurred';
          if (data.transcript) {
            // Webhook will handle transcript - just refresh and show warning
            loadMeeting();
            toast.warning(`Meeting ended with issues: ${errorMessage}`);
          } else {
            // No transcript available
            await updateMeeting(meetingId, {
              status: 'completed',
              metadata: { ...meeting?.metadata, bot_id: undefined }
            });
            toast.error(`Failed to get transcript: ${errorMessage}`);
          }
        }
        
        setIsRecording(false);
        setRecordingMode(null);
        setBotStatus('completed');
        setCurrentBotId(null);  // Clear current bot ID
        toast.success('Meeting recording completed');
        setIsProcessingTranscript(true);
      } catch (error) {
        console.error('Error stopping bot:', error);
        // Even on error, clean up the UI state
        setIsRecording(false);
        setRecordingMode(null);
        setBotStatus('');
        toast.error('Failed to stop meeting bot');
      }
    }
  };

  // Pause recording (local only)
  const pauseRecording = () => {
    if (recordingMode === 'local' && recognition) {
      recognition.stop();
      setIsPaused(true);
      setPauseStartTime(Date.now());
      toast.info('Recording paused');
    }
  };

  // Resume recording (local only)
  const resumeRecording = () => {
    if (recordingMode === 'local' && recognition && isPaused && pauseStartTime) {
      const pauseDuration = Date.now() - pauseStartTime;
      setTotalPausedTime(prev => prev + pauseDuration);
      setPauseStartTime(null);
      recognition.start();
      setIsPaused(false);
      toast.info('Recording resumed');
    }
  };

  // Real-time bot status with SSE and enhanced polling
  const [sseConnection, setSseConnection] = useState<EventSource | null>(null);
  const [statusRetryCount, setStatusRetryCount] = useState(0);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<number>(Date.now());

  // Enhanced bot status checking with real-time updates
  const startBotStatusMonitoring = (botId: string) => {
    // Start polling immediately as primary method
    console.log(`[MONITOR] Starting bot status monitoring for ${botId}`);
    checkBotStatusWithPolling(botId);
    
    // Also setup SSE for real-time updates (as enhancement)
    const setupSSE = () => {
      try {
        const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meeting-bot/${botId}/events`);
        
        eventSource.onopen = () => {
          console.log('[SSE] Connected to bot status stream');
        };
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'status_update') {
              const newStatus = data.status;
              console.log(`[SSE] Bot status update: ${newStatus}`);
              setBotStatus(newStatus);
              setLastStatusUpdate(Date.now());
              
              // Handle status-specific actions
              if (['starting', 'joining', 'waiting', 'in_call', 'recording'].includes(newStatus)) {
                setIsRecording(true);
                setRecordingMode('online');
              } else if (newStatus === 'completed') {
                // Simply refresh the meeting data - webhook handles all transcript logic
                console.log('[SSE] Meeting completed, refreshing data from database');
                loadMeeting(); // Refresh from database
                toast.success('Meeting recording completed');
                
                setIsRecording(false);
                setRecordingMode(null);
                setCurrentBotId(null);
                eventSource.close();
                setSseConnection(null);
              } else if (['failed'].includes(newStatus)) {
                setIsRecording(false);
                setRecordingMode(null);
                setCurrentBotId(null);
                // Persist meeting completion so UI allows new recordings
                updateMeeting(meetingId, {
                  status: 'completed',
                  metadata: { ...(meeting?.metadata || {}), bot_id: undefined },
                }).catch((e) => console.error('Failed to update meeting after end', e));

                setBotStatus(newStatus);
                eventSource.close();
                setSseConnection(null);
              }
            }
          } catch (parseError) {
            console.error('[SSE] Error parsing message:', parseError);
          }
        };
        
        eventSource.onerror = (error) => {
          console.error('[SSE] Connection error:', error);
          eventSource.close();
          setSseConnection(null);
          // Polling continues in background
        };
        
        setSseConnection(eventSource);
      } catch (error) {
        console.error('[SSE] Failed to setup EventSource:', error);
        // Polling continues in background
      }
    };
    
    // Setup SSE after a short delay
    setTimeout(setupSSE, 500);
  };

  // Enhanced polling with adaptive intervals
  const checkBotStatusWithPolling = async (botId: string) => {
    // Stop if bot ID has changed or been cleared
    if (!currentBotId || currentBotId !== botId) {
      console.log('[POLLING] Stopping - bot ID changed or cleared');
      return;
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meeting-bot/${botId}/status`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        const newStatus = data.status;
        console.log(`[POLLING] Bot ${botId} status: ${newStatus}`);
        setBotStatus(newStatus);
        setLastStatusUpdate(Date.now());
        
        // If we just reconnected and bot is still active, continue recording
        if (['starting', 'joining', 'waiting', 'in_call', 'recording'].includes(newStatus)) {
          setIsRecording(true);
          setRecordingMode('online');
        }
        
        if (newStatus === 'completed') {
          // Simply refresh the meeting data - webhook handles all transcript logic  
          console.log('[POLLING] Meeting completed, refreshing data from database');
          await loadMeeting(); // Refresh from database
          
          setIsRecording(false);
          setRecordingMode(null);
          setCurrentBotId(null);
          setIsProcessingTranscript(false); // Clear processing state
          
          // Stop monitoring
          if (sseConnection) {
            sseConnection.close();
            setSseConnection(null);
          }
          return;
        } else if (['failed'].includes(newStatus)) {
          setIsRecording(false);
          setRecordingMode(null);
          setCurrentBotId(null);
          await updateMeeting(meetingId, { 
            status: 'completed',
            metadata: { ...meeting?.metadata, bot_id: undefined }
          });
          
          // Stop monitoring
          if (sseConnection) {
            sseConnection.close();
            setSseConnection(null);
          }
          return;
        } else {
          // Continue polling with adaptive intervals
          let pollInterval;
          switch (newStatus) {
            case 'starting':
              pollInterval = 200; // Ultra frequent during bot startup
              break;
            case 'joining':
              pollInterval = 300; // Very frequent during critical joining phase
              break;
            case 'waiting':
              pollInterval = 500; // More frequent while waiting
              break;
            case 'in_call':
              pollInterval = 1000; // More frequent once in call
              break;
            case 'recording':
              pollInterval = 2000; // More frequent even when recording
              break;
            case 'stopping':
            case 'ended':
              pollInterval = 500; // Very frequent while waiting for transcript
              break;
            default:
              pollInterval = 1000;
          }
          
          // Continue polling
          setTimeout(() => checkBotStatusWithPolling(botId), pollInterval);
        }
      } else {
        // Bot not found or error - clear bot data
        setIsRecording(false);
        setRecordingMode(null);
        setBotStatus('');
        setCurrentBotId(null);
        await updateMeeting(meetingId, {
          metadata: { ...meeting?.metadata, bot_id: undefined }
        });
        
        if (sseConnection) {
          sseConnection.close();
          setSseConnection(null);
        }
      }
    } catch (error) {
      console.error('Error checking bot status:', error);
      
      // Check if we've lost connection for too long
      const timeSinceLastUpdate = Date.now() - lastStatusUpdate;
      if (timeSinceLastUpdate > 30000) { // 30 seconds without update
        // Clean up the bot state
        if (isRecording && recordingMode === 'online') {
          setIsRecording(false);
          setRecordingMode(null);
          setBotStatus('');
          setCurrentBotId(null);
          await updateMeeting(meetingId, {
            status: 'completed',
            metadata: { ...meeting?.metadata, bot_id: undefined }
          });
          toast.info('Bot session ended - meeting status has been updated');
        }
        
        if (sseConnection) {
          sseConnection.close();
          setSseConnection(null);
        }
      } else {
        // Retry with exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, statusRetryCount), 10000);
        setTimeout(() => {
          setStatusRetryCount(prev => prev + 1);
          checkBotStatusWithPolling(botId);
        }, retryDelay);
      }
    }
  };

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (sseConnection) {
        sseConnection.close();
        setSseConnection(null);
      }
    };
  }, [sseConnection]);

  // Legacy function for backward compatibility
  const checkBotStatus = (botId: string) => {
    startBotStatusMonitoring(botId);
  };

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const results: { index: number; text: string }[] = [];
    const query = searchQuery.toLowerCase();
    const lines = transcript.split('\n');

    lines.forEach((line, lineIndex) => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes(query)) {
        results.push({ index: lineIndex, text: line });
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [searchQuery, transcript]);

  // Navigate search results
  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;

    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    }

    setCurrentSearchIndex(newIndex);
    searchHighlightRefs.current[newIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  // Download transcript
  const downloadTranscript = () => {
    if (!meeting || !transcript) return;
    
    // Format transcript with metadata header
    const createdAt = new Date(meeting.created_at);
    const header = `Meeting Transcript
Generated: ${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})} at ${new Date().toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})}
Meeting: ${meeting.title}
Created: ${createdAt.toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})} at ${createdAt.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})}

Full Transcript:
${transcript}`;

    const blob = new Blob([header], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Start chat with transcript
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  
  const startChatWithTranscript = async () => {
    if (isOpeningChat) return; // Prevent double clicks
    
    setIsOpeningChat(true);
    
    try {
      // If there's a transcript, save it first
      if (transcript && transcript.trim()) {
        console.log('[CHAT] Saving transcript before opening chat...');
        await updateMeeting(meetingId, { transcript });
        console.log('[CHAT] Transcript saved successfully');
      } else {
        console.log('[CHAT] No transcript to save, proceeding to chat...');
      }
      
      // Navigate to dashboard with meeting attachment
      console.log('[CHAT] Navigating to dashboard with meeting attachment');
      router.push(`/dashboard?attachMeeting=${meetingId}`);
    } catch (error) {
      console.error('[CHAT] Error opening chat:', error);
      
      // Show user-friendly error
      if (error instanceof Error && error.message.includes('auth')) {
        toast.error('Please log in again to open chat');
      } else {
        toast.error('Failed to open chat. Please try again.');
      }
      
      // Still try to navigate without saving if there's an error
      // This ensures the button always works even if the save fails
      setTimeout(() => {
        console.log('[CHAT] Fallback: navigating anyway');
        router.push(`/dashboard?attachMeeting=${meetingId}`);
      }, 1000);
    } finally {
      setIsOpeningChat(false);
    }
  };

  // Poll for transcript while processing
  useEffect(() => {
    if (!isProcessingTranscript) return;
    const interval = setInterval(async () => {
      try {
        const latest = await getMeeting(meetingId);
        // Check if we got a transcript (either new or existing)
        if (latest.transcript && latest.transcript !== transcript) {
          setMeeting(latest);
          setTranscript(latest.transcript);
          setIsProcessingTranscript(false);
          toast.success('Transcript ready');
        } else if (latest.status === 'completed' && !latest.transcript) {
          // Meeting completed but no transcript - stop waiting
          setIsProcessingTranscript(false);
          toast.info('Meeting completed without transcript');
        }
      } catch (err) {
        console.error('[PROCESSING] failed to poll', err);
      }
    }, 10000); // every 10s
    return () => clearInterval(interval);
  }, [isProcessingTranscript, meetingId, transcript]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="border-b px-6 py-4">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Meeting not found</h2>
          <Button onClick={() => router.push('/meetings')}>
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-gradient-to-r from-background/95 via-background to-background/95 backdrop-blur-sm px-4 sm:px-6 py-4 sm:py-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/meetings')}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text truncate">
                {meeting.title}
              </h1>
              <div className="flex items-center gap-2 text-xs sm:text-sm mt-1 sm:mt-2 flex-wrap">
                <span className="text-muted-foreground/80 flex-shrink-0">
                  {format(new Date(meeting.created_at), 'MMM d, yyyy h:mm a')}
                </span>
                <Badge 
                  variant={meeting.status === 'active' ? 'default' : 'secondary'}
                  className="shadow-sm text-xs"
                >
                  {meeting.status}
                </Badge>
                {botStatus && (
                  <Badge variant="outline" className="shadow-sm text-xs">
                    {botStatus}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTranscript}
                disabled={!transcript}
                className="flex-shrink-0"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Sharing coming soon')}
                className="flex-shrink-0"
              >
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </div>
            <Button
              size="sm"
              onClick={startChatWithTranscript}
              disabled={isOpeningChat}
              className="flex-shrink-0"
            >
              {isOpeningChat ? (
                <>
                  <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                  <span className="hidden sm:inline">Opening...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Open in Chat</span>
                  <span className="sm:hidden">Chat</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b bg-gradient-to-r from-background/50 to-background/80 backdrop-blur">
        <div className="relative w-full sm:max-w-lg">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60">
            <Search className="h-4 w-4" />
          </div>
          <Input
            placeholder="Search within transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-20 sm:pr-24 h-10 bg-card/50 backdrop-blur border-border/50 shadow-sm focus:shadow-md transition-colors duration-200 placeholder:text-muted-foreground/60"
          />
          {searchResults.length > 0 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2 text-xs">
              <span className="text-muted-foreground/80 bg-background/80 px-1.5 sm:px-2 py-1 rounded-md font-medium text-xs">
                {currentSearchIndex + 1}/{searchResults.length}
              </span>
              <div className="flex bg-background/80 backdrop-blur rounded-md border border-border/30 shadow-sm">
                <button
                  onClick={() => navigateSearch('prev')}
                  className="p-1 sm:p-1.5 hover:bg-accent/80 rounded-l-md transition-all duration-200 shadow-sm hover:shadow-md text-muted-foreground hover:text-foreground"
                  aria-label="Previous result"
                >
                  ↑
                </button>
                <button
                  onClick={() => navigateSearch('next')}
                  className="p-1 sm:p-1.5 hover:bg-accent/80 rounded-r-md transition-all duration-200 shadow-sm hover:shadow-md text-muted-foreground hover:text-foreground"
                  aria-label="Next result"
                >
                  ↓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transcript area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div 
          className="h-full px-4 sm:px-6 py-4 bg-gradient-to-b from-background to-muted/10 overflow-y-auto"
          ref={transcriptRef}
        >
          <div className="max-w-4xl mx-auto">
          {transcript || interimTranscript ? (
            <div className="bg-card/50 backdrop-blur border rounded-xl p-4 sm:p-6 shadow-sm">
              <div className="prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {transcript.split('\n').map((line, index) => {
                    const isSearchMatch = searchResults.some((r) => r.index === index);
                    const isCurrentMatch = searchResults[currentSearchIndex]?.index === index;

                    return (
                      <div
                        key={index}
                        className={cn(
                          'py-1 px-2 rounded transition-all duration-200',
                          isSearchMatch && 'bg-yellow-100 dark:bg-yellow-900/30',
                          isCurrentMatch && 'bg-yellow-200 dark:bg-yellow-800/50 shadow-sm'
                        )}
                      >
                        <span
                          ref={(el) => {
                            if (isCurrentMatch) {
                              searchHighlightRefs.current[currentSearchIndex] = el;
                            }
                          }}
                        >
                          {line || '\u00A0'}
                        </span>
                      </div>
                    );
                  })}
                  {interimTranscript && (
                    <div className="text-muted-foreground italic mt-2">
                      {interimTranscript}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 sm:py-20 px-4">
              <div className="mx-auto w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                <FileAudio className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {meeting.status === 'active' ? 'Ready to Record' : 'No Transcript Available'}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base">
                {meeting.status === 'active' 
                  ? 'Start recording to see the real-time transcript appear here. Choose between in-person or online meeting recording.'
                  : 'This meeting doesn\'t have any recorded transcript yet.'
                }
              </p>
              {meeting.status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={async () => {
                    // Rate limit: disable button temporarily
                    const button = document.querySelector('[data-refresh-button]') as HTMLButtonElement;
                    if (button) {
                      button.disabled = true;
                      button.textContent = 'Checking...';
                    }
                    
                    try {
                      await loadMeeting();
                      if (transcript) {
                        toast.success('Transcript loaded!');
                      } else {
                        toast.info('No transcript available yet. The bot may still be processing.');
                      }
                    } catch (error) {
                      toast.error('Failed to check for updates');
                    } finally {
                      // Re-enable after 5 seconds (rate limiting)
                      setTimeout(() => {
                        if (button) {
                          button.disabled = false;
                          button.textContent = 'Check for Updates';
                        }
                      }, 5000);
                    }
                  }}
                  data-refresh-button
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check for Updates
                </Button>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Recording controls */}
      {(meeting.status === 'active' || (meeting.status === 'completed' && transcript)) && (
        <div className="flex-shrink-0 border-t bg-gradient-to-r from-background/95 via-background to-background/95 backdrop-blur-sm">
          {/* Scroll Progress Bar */}
          {(transcript || interimTranscript) && (
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 origin-left"
              style={{ scaleX }}
            />
          )}
          <div className="px-4 sm:px-6 py-4">
            <div className="max-w-4xl mx-auto">
              {!isRecording ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  {meeting.status === 'completed' ? (
                    /* Continue Recording Section */
                    <>
                      <div className="text-center mb-2">
                        <p className="text-sm font-medium text-foreground/90 mb-1">Meeting Completed</p>
                        <p className="text-xs text-muted-foreground/80">Start a new recording session to continue adding to this transcript</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <Button
                          onClick={() => continueRecording('local')}
                          variant="outline"
                          className="flex items-center gap-2 w-full sm:w-auto"
                        >
                          <User className="h-4 w-4" />
                          <span className="hidden sm:inline">Continue In Person</span>
                          <span className="sm:hidden">In Person</span>
                        </Button>
                        
                        <Button
                          onClick={() => continueRecording('online')}
                          className="flex items-center gap-2 w-full sm:w-auto"
                        >
                          <Monitor className="h-4 w-4" />
                          <span className="hidden sm:inline">Continue Online</span>
                          <span className="sm:hidden">Online</span>
                          <Badge variant="beta" className="bg-blue-500 text-white border-blue-500 text-xs px-1.5 py-0.5">
                            Beta
                          </Badge>
                        </Button>
                      </div>
                    </>
                  ) : (
                    /* Initial Recording Section */
                    <>
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <Button
                          onClick={() => startRecording('local')}
                          variant="outline"
                          className="flex items-center gap-2 w-full sm:w-auto"
                        >
                          <User className="h-4 w-4" />
                          In Person
                        </Button>
                        
                        <Button
                          onClick={() => startRecording('online')}
                          className="flex items-center gap-2 w-full sm:w-auto"
                        >
                          <Monitor className="h-4 w-4" />
                          Online
                          <Badge variant="beta" className="bg-blue-500 text-white border-blue-500 text-xs px-1.5 py-0.5">
                            Beta
                          </Badge>
                        </Button>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground/80 max-w-lg mx-auto leading-relaxed px-4">
                          Choose <span className="font-medium text-blue-600 dark:text-blue-400">In Person</span> for real-time speech-to-text or <span className="font-medium text-green-600 dark:text-green-400">Online</span> to join virtual meetings with a bot
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-card/80 backdrop-blur border border-border/50 rounded-2xl px-4 sm:px-6 py-4 shadow-lg shadow-black/5 w-full sm:w-auto">
                    {/* Recording indicator and mode */}
                    <div className="flex items-center gap-4 justify-center">
                      {recordingMode === 'local' ? (
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={cn(
                              "w-4 h-4 rounded-full transition-all duration-300",
                              isPaused 
                                ? "bg-amber-500 shadow-lg shadow-amber-500/30" 
                                : "bg-red-500 animate-pulse shadow-lg shadow-red-500/40"
                            )} />
                            {!isPaused && (
                              <div className="absolute inset-0 w-4 h-4 rounded-full bg-red-500 animate-ping opacity-75" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center">
                              <User className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                            </div>
                            <span className="text-sm font-medium text-foreground/90 tabular-nums">
                              {isPaused ? 'Recording Paused' : 'Recording...'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/40" />
                            <div className="absolute inset-0 w-4 h-4 rounded-full bg-green-500 animate-ping opacity-75" />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                              <Monitor className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-sm font-medium text-foreground/90 tabular-nums">
                              {getBotStatusDisplay(botStatus)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Control buttons */}
                    <div className="flex items-center gap-3 justify-center">
                      {/* Pause/Resume button for local recording */}
                      {recordingMode === 'local' && (
                        <Button
                          onClick={isPaused ? resumeRecording : pauseRecording}
                          size="sm"
                          variant={isPaused ? "default" : "secondary"}
                          className="min-w-[80px]"
                        >
                          {isPaused ? (
                            <>
                              <Play className="h-3.5 w-3.5 fill-current mr-1" />
                              Resume
                            </>
                          ) : (
                            <>
                              <Pause className="h-3.5 w-3.5 fill-current mr-1" />
                              Pause
                            </>
                          )}
                        </Button>
                      )}
                      
                      {!isProcessingTranscript && (
                        <Button
                          onClick={stopRecording}
                          size="sm"
                          variant="destructive"
                          className="min-w-[70px]"
                        >
                          <Square className="h-3.5 w-3.5 fill-current mr-1" />
                          Stop
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meeting URL Dialog */}
      <Dialog open={showMeetingUrlDialog} onOpenChange={(open) => {
        setShowMeetingUrlDialog(open);
        if (!open) setMeetingUrl('');
      }}>
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
                onKeyDown={(e) => e.key === 'Enter' && handleStartOnlineRecording()}
                className="h-11 bg-background/50 backdrop-blur border-border/50 shadow-sm focus:shadow-md transition-colors duration-200 placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 flex-col sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setShowMeetingUrlDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleStartOnlineRecording} 
              disabled={!meetingUrl.trim()}
              className="w-full sm:w-auto"
            >
              <Monitor className="h-4 w-4 mr-2" />
              <span className="flex items-center gap-2">
                <span className="hidden sm:inline">Start Bot Recording</span>
                <span className="sm:hidden">Start Recording</span>
                <Badge variant="beta" className="bg-blue-500 text-white border-blue-500 text-xs px-1.5 py-0.5">
                  Beta
                </Badge>
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isProcessingTranscript && (
        <div className="fixed bottom-4 right-4 flex items-center gap-3 bg-card/90 backdrop-blur border border-border/40 rounded-full px-4 py-2 shadow-lg animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Processing transcription… this may take a few minutes</span>
        </div>
      )}
    </div>
  );
} 