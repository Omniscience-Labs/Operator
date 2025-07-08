'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FileAudio, Download, Loader, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRendererProps {
  url: string;
  fileName: string;
  className?: string;
  onDownload?: () => void;
  isDownloading?: boolean;
}

export function AudioRenderer({
  url,
  fileName,
  className,
  onDownload,
  isDownloading = false,
}: AudioRendererProps) {
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioLoaded(true);
      setAudioError(null);
      console.log(`[AUDIO RENDERER] Metadata loaded for ${fileName}`);
    };

    const handleError = (e: Event) => {
      const error = (e.target as HTMLAudioElement).error;
      let errorMessage = 'Audio playback error';
      
      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio loading was aborted';
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred';
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = 'Audio decoding error - file may be corrupted';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported';
            break;
          default:
            errorMessage = 'Unknown audio error';
        }
      }
      
      setAudioError(errorMessage);
      setAudioLoaded(false);
      console.error(`[AUDIO RENDERER] Error loading audio: ${errorMessage}`, error);
    };

    const handleLoadStart = () => {
      console.log(`[AUDIO RENDERER] Starting to load audio: ${fileName}`);
    };

    const handleCanPlay = () => {
      console.log(`[AUDIO RENDERER] Audio can start playing: ${fileName}`);
    };

    const handleDurationChange = () => {
      const duration = audio.duration;
      if (isFinite(duration)) {
        console.log(`[AUDIO RENDERER] Duration available: ${duration}s for ${fileName}`);
      } else {
        console.warn(`[AUDIO RENDERER] Duration not available for ${fileName} - timeline may not work`);
      }
    };

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('durationchange', handleDurationChange);

    // Cleanup
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('durationchange', handleDurationChange);
    };
  }, [fileName, url]);
  
  // Handle download - use external handler if provided, fallback to direct URL
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (url) {
      console.log(`[AUDIO RENDERER] Using fallback download for ${fileName}`);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.split('/').pop() || 'audio';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error('[AUDIO RENDERER] No download URL or handler available');
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 space-y-6',
        className,
      )}
    >
      {/* Audio icon and file info */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <FileAudio className="h-16 w-16 text-blue-500" />
          <div className="absolute -bottom-1 -right-1 bg-background rounded-sm px-1.5 py-0.5 text-xs font-medium text-muted-foreground border">
            {fileExtension.toUpperCase()}
          </div>
        </div>
        
        <h3 className="text-lg font-semibold mb-2 text-center max-w-md break-words">
          {fileName.split('/').pop()}
        </h3>
      </div>

      {/* Audio player */}
      <div className="w-full max-w-md space-y-3">
        <audio
          ref={audioRef}
          controls
          className="w-full"
          preload="metadata"
          style={{ height: '40px' }}
        >
          <source src={url} type={`audio/${fileExtension === 'webm' ? 'webm' : fileExtension}`} />
          <source src={url} type="audio/mpeg" />
          <source src={url} type="audio/wav" />
          <source src={url} type="audio/ogg" />
          Your browser does not support the audio element.
        </audio>
        
        {/* Error message or info about WebM limitations */}
        {audioError && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{audioError}</span>
          </div>
        )}
        
        {fileExtension === 'webm' && audioLoaded && (
          <div className="text-xs text-muted-foreground text-center">
            <p>Note: WebM recordings may have limited timeline functionality due to how they're created.</p>
            <p>Audio playback should work normally.</p>
          </div>
        )}
      </div>

      {/* Download button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={isDownloading}
        className="min-w-[120px]"
      >
        {isDownloading ? (
          <Loader className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Download
      </Button>
    </div>
  );
} 