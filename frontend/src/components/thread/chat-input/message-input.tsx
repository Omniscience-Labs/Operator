import React, { forwardRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Square, Loader2, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UploadedFile } from './chat-input';
import { FileUploadHandler } from './file-upload-handler';
import { VoiceRecorder } from './voice-recorder';
import { MeetingRecorder } from './meeting-recorder';
import { ModelSelector } from './model-selector';
import { ReasoningControl, ReasoningSettings } from './reasoning-control';
import { SubscriptionStatus } from './_use-model-selection';
import { isLocalMode } from '@/lib/config';
import { TooltipContent } from '@/components/ui/tooltip';
import { Tooltip } from '@/components/ui/tooltip';
import { TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import { LiquidButton } from '@/components/animate-ui/buttons/liquid';
import { Crown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';
import { IntegrationsDropdown } from './integrations-dropdown';

interface MessageInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTranscription: (text: string) => void;
  placeholder: string;
  loading: boolean;
  disabled: boolean;
  isAgentRunning: boolean;
  onStopAgent?: () => void;
  isDraggingOver: boolean;
  uploadedFiles: UploadedFile[];

  fileInputRef: React.RefObject<HTMLInputElement>;
  isUploading: boolean;
  sandboxId?: string;
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  hideAttachments?: boolean;
  messages?: any[]; // Add messages prop

  selectedModel: string;
  onModelChange: (model: string) => void;
  modelOptions: any[];
  subscriptionStatus: SubscriptionStatus;
  canAccessModel: (modelId: string) => boolean;
  refreshCustomModels?: () => void;
  
  // New reasoning props
  reasoningSettings: ReasoningSettings;
  onReasoningChange: (settings: ReasoningSettings) => void;
  hideReasoningControl?: boolean;
}

export const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      onTranscription,
      placeholder,
      loading,
      disabled,
      isAgentRunning,
      onStopAgent,
      isDraggingOver,
      uploadedFiles,

      fileInputRef,
      isUploading,
      sandboxId,
      setPendingFiles,
      setUploadedFiles,
      setIsUploading,
      hideAttachments = false,
      messages = [],

      selectedModel,
      onModelChange,
      modelOptions,
      subscriptionStatus,
      canAccessModel,
      refreshCustomModels,
      
      // New reasoning props
      reasoningSettings,
      onReasoningChange,
      hideReasoningControl = false,
    },
    ref,
  ) => {
    const isMobile = useIsMobile();
    const router = useRouter();
    
    useEffect(() => {
      const textarea = ref as React.RefObject<HTMLTextAreaElement>;
      if (!textarea.current) return;

      const adjustHeight = () => {
        textarea.current!.style.height = 'auto';
        const newHeight = Math.min(
          Math.max(textarea.current!.scrollHeight, 24),
          200,
        );
        textarea.current!.style.height = `${newHeight}px`;
      };

      adjustHeight();

      // Call it twice to ensure proper height calculation
      adjustHeight();

      window.addEventListener('resize', adjustHeight);
      return () => window.removeEventListener('resize', adjustHeight);
    }, [value, ref]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (
          (value.trim() || uploadedFiles.length > 0) &&
          !loading &&
          (!disabled || isAgentRunning)
        ) {
          onSubmit(e as unknown as React.FormEvent);
        }
      }
    };

    return (
      <div className="relative flex flex-col w-full h-auto gap-4 justify-between">

        <div className="flex flex-col gap-2 items-center px-2">
          <Textarea
            ref={ref}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              'w-full bg-transparent dark:bg-transparent border-none shadow-none focus-visible:ring-0 px-2 py-1 text-base min-h-[40px] max-h-[200px] overflow-y-auto resize-none',
              isDraggingOver ? 'opacity-40' : '',
            )}
            disabled={loading || (disabled && !isAgentRunning)}
            rows={2}
          />
        </div>


        <div className="flex items-center justify-between mt-1 ml-3 mb-1 pr-2 gap-1 sm:gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {!hideAttachments && (
              <FileUploadHandler
                ref={fileInputRef}
                loading={loading}
                disabled={disabled}
                isAgentRunning={isAgentRunning}
                isUploading={isUploading}
                sandboxId={sandboxId}
                setPendingFiles={setPendingFiles}
                setUploadedFiles={setUploadedFiles}
                setIsUploading={setIsUploading}
                messages={messages}
              />
            )}
            <IntegrationsDropdown
              disabled={loading || (disabled && !isAgentRunning)}
            />
            {!hideAttachments && (
              <MeetingRecorder
                onFileAttached={(file) => setUploadedFiles(prev => [...prev, file])}
                setPendingFiles={setPendingFiles}
                setUploadedFiles={setUploadedFiles}
                setIsUploading={setIsUploading}
                sandboxId={sandboxId}
                messages={messages}
                disabled={loading || (disabled && !isAgentRunning)}
              />
            )}
          </div>
          {subscriptionStatus === 'no_subscription' && !isLocalMode() &&
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-amber-500/10"
                    onClick={() => router.push('/settings/billing')}
                  >
                    <Crown className='h-4 w-4 text-amber-500' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>The free tier is severely limited by inferior models; upgrade to experience the true full Operator experience.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
          <div className='flex items-center gap-1 sm:gap-2 flex-shrink-0'>
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              modelOptions={modelOptions}
              subscriptionStatus={subscriptionStatus}
              canAccessModel={canAccessModel}
              refreshCustomModels={refreshCustomModels}
            />
            {!hideReasoningControl && (
              <ReasoningControl
                value={reasoningSettings}
                onChange={onReasoningChange}
                disabled={loading || (disabled && !isAgentRunning)}
                modelName={selectedModel}
                subscriptionStatus={subscriptionStatus}
              />
            )}
            <VoiceRecorder
              onTranscription={onTranscription}
              disabled={loading || (disabled && !isAgentRunning)}
            />
            {isAgentRunning ? (
              <Button
                type="button"
                onClick={onStopAgent}
                size="icon"
                variant="destructive"
                className="w-8 h-8 flex-shrink-0 rounded-lg p-0"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <LiquidButton
                type="submit"
                onClick={onSubmit}
                size="icon"
                variant="default"
                className={cn(
                  'w-8 h-8 flex-shrink-0 rounded-lg p-0',
                  (!value.trim() && uploadedFiles.length === 0) ||
                    loading ||
                    disabled
                    ? 'opacity-50'
                    : '',
                )}
                disabled={
                  (!value.trim() && uploadedFiles.length === 0) ||
                  loading ||
                  disabled
                }
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </LiquidButton>
            )}
          </div>
        </div>
      </div>
    );
  },
);

MessageInput.displayName = 'MessageInput';