'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FileVideo, Download, Loader, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoRendererProps {
  url: string;
  fileName: string;
  className?: string;
  onDownload?: () => void;
  isDownloading?: boolean;
}

export function VideoRenderer({
  url,
  fileName,
  className,
  onDownload,
  isDownloading = false,
}: VideoRendererProps) {
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoLoaded(true);
      setVideoError(null);
      console.log(`[VIDEO RENDERER] Metadata loaded for ${fileName}`);
    };

    const handleError = (e: Event) => {
      const error = (e.target as HTMLVideoElement).error;
      let errorMessage = 'Video playback error';
      
      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = 'Video loading was aborted';
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred';
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = 'Video decoding error - file may be corrupted';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported by browser';
            break;
          default:
            errorMessage = 'Unknown video error';
        }
      }
      
      setVideoError(errorMessage);
      setVideoLoaded(false);
      console.error(`[VIDEO RENDERER] Error loading video: ${errorMessage}`, error);
    };

    const handleLoadStart = () => {
      console.log(`[VIDEO RENDERER] Starting to load video: ${fileName}`);
    };

    const handleCanPlay = () => {
      console.log(`[VIDEO RENDERER] Video can start playing: ${fileName}`);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleDurationChange = () => {
      const duration = video.duration;
      if (isFinite(duration)) {
        console.log(`[VIDEO RENDERER] Duration available: ${duration}s for ${fileName}`);
      } else {
        console.warn(`[VIDEO RENDERER] Duration not available for ${fileName} - timeline may not work`);
      }
    };

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('durationchange', handleDurationChange);

    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('durationchange', handleDurationChange);
    };
  }, [fileName, url]);
  
  // Handle download - use external handler if provided, fallback to direct URL
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (url) {
      console.log(`[VIDEO RENDERER] Using fallback download for ${fileName}`);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.split('/').pop() || 'video';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error('[VIDEO RENDERER] No download URL or handler available');
    }
  };

  // Get MIME type for video source
  const getVideoMimeType = () => {
    switch (fileExtension) {
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'ogg':
        return 'video/ogg';
      case 'mov':
        return 'video/quicktime';
      case 'avi':
        return 'video/x-msvideo';
      case 'wmv':
        return 'video/x-ms-wmv';
      case 'flv':
        return 'video/x-flv';
      case 'mkv':
        return 'video/x-matroska';
      case 'm4v':
        return 'video/x-m4v';
      case '3gp':
        return 'video/3gpp';
      case 'ts':
        return 'video/mp2t';
      default:
        return 'video/mp4'; // Default fallback
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 space-y-6',
        className,
      )}
    >
      {/* Video icon and file info */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <FileVideo className="h-16 w-16 text-purple-500" />
          <div className="absolute -bottom-1 -right-1 bg-background rounded-sm px-1.5 py-0.5 text-xs font-medium text-muted-foreground border">
            {fileExtension.toUpperCase()}
          </div>
        </div>
        
        <h3 className="text-lg font-semibold mb-2 text-center max-w-md break-words">
          {fileName.split('/').pop()}
        </h3>
      </div>

      {/* Video player */}
      <div className="w-full max-w-2xl space-y-3">
        <div className="relative">
          <video
            ref={videoRef}
            controls
            className="w-full rounded-lg border border-border"
            preload="metadata"
            style={{ maxHeight: '400px' }}
          >
            <source src={url} type={getVideoMimeType()} />
            <source src={url} type="video/mp4" />
            <source src={url} type="video/webm" />
            <source src={url} type="video/ogg" />
            Your browser does not support the video element.
          </video>
          
          {/* Play/Pause overlay indicator */}
          {videoLoaded && (
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {isPlaying ? 'Playing' : 'Paused'}
            </div>
          )}
        </div>
        
        {/* Error message */}
        {videoError && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{videoError}</span>
          </div>
        )}
        
        {/* Format-specific notes */}
        {videoLoaded && (
          <div className="text-xs text-muted-foreground text-center">
            <p>Format: {fileExtension.toUpperCase()}</p>
            {fileExtension === 'mov' && (
              <p className="text-amber-600 dark:text-amber-400">
                Note: MOV files may have limited browser support. Consider converting to MP4 for better compatibility.
              </p>
            )}
            {['avi', 'wmv', 'flv', 'mkv'].includes(fileExtension) && (
              <p className="text-amber-600 dark:text-amber-400">
                Note: This format may not be supported by all browsers. Consider converting to MP4 or WebM.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Download button */}
      <Button
        variant="outline"
        className="min-w-[150px]"
        onClick={handleDownload}
        disabled={isDownloading}
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