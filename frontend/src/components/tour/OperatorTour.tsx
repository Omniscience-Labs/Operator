'use client';

import { useEffect, useRef, useState } from 'react';
import 'shepherd.js/dist/css/shepherd.css';
import './tour-styles.css';
import './types';

import { Button } from '@/components/ui/button';
import { Play, HelpCircle, X } from 'lucide-react';

interface OperatorTourProps {
  isFirstTime?: boolean;
  onComplete?: () => void;
}

export function OperatorTour({ isFirstTime = false, onComplete }: OperatorTourProps) {
  const tourRef = useRef<any | null>(null);
  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    // Auto-start tour for first-time users
    if (isFirstTime) {
      setTimeout(() => {
        startTour();
      }, 1000); // Small delay to ensure DOM is ready
    }

    return () => {
      if (tourRef.current) {
        tourRef.current.complete();
      }
    };
  }, [isFirstTime]);

  const startTour = async () => {
    try {
      console.log('🎬 startTour called');
      
      // Import Shepherd.js dynamically
      const shepherdModule = await import('shepherd.js');
      let TourConstructor = shepherdModule.Tour || shepherdModule.default?.Tour || shepherdModule.default;
      
      if (!TourConstructor || typeof TourConstructor !== 'function') {
        throw new Error('Tour constructor not found in shepherd.js module');
      }

      console.log('🏗️ Creating new Tour instance...', TourConstructor);
      
      // Create new tour instance
      tourRef.current = new TourConstructor({
        defaultStepOptions: {
          cancelIcon: {
            enabled: true,
            label: 'Close tour'
          },
          classes: 'shepherd-theme-arrows',
          scrollTo: true
        },
        useModalOverlay: true,
        modalOverlayOpeningPadding: 4
      });

      // Step 1: Welcome
      tourRef.current.addStep({
        id: 'welcome',
        title: 'Welcome to Operator!',
        text: `
          <div class="space-y-3">
            <p>Hey there! I'm Operator, your AI-powered assistant.</p>
            <p>I can help you with anything - from analyzing data to creating reports, just describe what you need!</p>
            <p><strong>Tip:</strong> Let's get you started with your first task!</p>
          </div>
        `,
        attachTo: {
          element: '.dashboard-content, [data-dashboard-content], .flex.flex-col.items-center.gap-3.justify-center',
          on: 'top-end'
        },
        buttons: [
          {
            text: 'Next',
            action: () => {
              console.log('🎯 Next button clicked, moving to step 2');
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 2: New Chat Guide
      tourRef.current.addStep({
        id: 'new-chat',
        title: 'Start Your First Chat',
        text: `
          <div class="space-y-3">
            <p>This is where you'll start your conversations with Operator! Type your message here to begin.</p>
            <p>You can ask me anything - from simple questions to complex tasks. I'm here to help you get things done!</p>
          </div>
        `,
        attachTo: {
          element: '[data-testid="chat-input"], .chat-input, textarea, input[placeholder*="help"], input[placeholder*="task"]',
          on: 'top'
        },
        buttons: [
          {
            text: 'Back',
            action: () => tourRef.current?.back(),
            classes: 'shepherd-button-secondary'
          },
          {
            text: 'Next',
            action: () => {
              console.log('🎯 Next button clicked, moving to step 3');
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 3: Attachments Guide
      tourRef.current.addStep({
        id: 'attachments',
        title: 'Attach Files & Documents',
        text: `
          <div class="space-y-3">
            <p>This is the attachments area! You can upload files, documents, images, and more to help me understand your task better.</p>
            <p>Simply drag and drop files here or click to browse. I can analyze PDFs, spreadsheets, images, and many other file types.</p>
          </div>
        `,
        attachTo: {
          element: '.file-upload-handler, [data-testid="file-upload"], button[aria-label*="upload"], button[aria-label*="file"], .attachment-area, .file-input',
          on: 'bottom'
        },
        buttons: [
          {
            text: 'Back',
            action: () => tourRef.current?.back(),
            classes: 'shepherd-button-secondary'
          },
          {
            text: 'Next',
            action: () => {
              console.log('🎯 Next button clicked, moving to step 4');
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 4: Plugins Guide
      tourRef.current.addStep({
        id: 'plugins',
        title: 'Integrations & Plugins',
        text: `
          <div class="space-y-3">
            <p>This is the integrations area! Connect external tools and services to extend my capabilities.</p>
            <p>You can integrate with databases, APIs, web services, and more to make me even more powerful for your specific needs.</p>
          </div>
        `,
        attachTo: {
          element: '.integrations-dropdown, [data-testid="integrations"], button[aria-label*="integration"], button[aria-label*="plugin"], .plugin-area, .integration-button',
          on: 'bottom'
        },
        buttons: [
          {
            text: 'Back',
            action: () => tourRef.current?.back(),
            classes: 'shepherd-button-secondary'
          },
          {
            text: 'Next',
            action: () => {
              console.log('🎯 Next button clicked, moving to step 5');
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 5: New Task Guide
      tourRef.current.addStep({
        id: 'new-task',
        title: 'Create Your First Task',
        text: `
          <div class="space-y-3">
            <p>This is where you create a new task with Operator! Click the "New Task" button to get started.</p>
            <p>Tasks are your way of telling Operator what you need help with - whether it's analyzing data, creating reports, or any other AI-powered workflow.</p>
          </div>
        `,
        attachTo: {
          element: 'button:contains("New Task"), .new-task-button, .add-task, [data-new-task], .task-create-button, .btn-new-task, button[aria-label*="task"], button[title*="task"]',
          on: 'left'
        },
        buttons: [
          {
            text: 'Back',
            action: () => tourRef.current?.back(),
            classes: 'shepherd-button-secondary'
          },
          {
            text: 'End Tour',
            action: () => {
              try {
                if (tourRef.current) {
                  tourRef.current.complete();
                }
                setIsTourActive(false);
                onComplete?.();
              } catch (error) {
                console.error('Error completing tour:', error);
                setIsTourActive(false);
                onComplete?.();
              }
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Event listeners
      tourRef.current.on('start', () => {
        console.log('🎬 Tour started');
        setIsTourActive(true);
      });

      tourRef.current.on('complete', () => {
        console.log('✅ Tour completed');
        try {
          setIsTourActive(false);
          onComplete?.();
        } catch (error) {
          console.error('Error in tour complete event:', error);
          setIsTourActive(false);
        }
      });

      tourRef.current.on('cancel', () => {
        console.log('❌ Tour cancelled');
        try {
          setIsTourActive(false);
          onComplete?.();
        } catch (error) {
          console.error('Error in tour cancel event:', error);
          setIsTourActive(false);
        }
      });

      console.log('🎯 Starting tour...');
      tourRef.current.start();
      console.log('✅ Tour started successfully!');
    } catch (error) {
      console.error('❌ Error starting tour:', error);
      console.error('Error details:', error.message, error.stack);
    }
  };

  const handleTourButtonClick = () => {
    console.log('🎯 Tour button clicked!', { 
      isTourActive, 
      tourRef: tourRef.current
    });
    
    if (isTourActive) {
      // If tour is active, end it
      console.log('🛑 Ending active tour...');
      if (tourRef.current) {
        try {
          tourRef.current.complete();
        } catch (error) {
          console.error('Error completing tour:', error);
        }
      }
      setIsTourActive(false);
      onComplete?.();
    } else {
      // Start a fresh tour
      console.log('🚀 Starting new tour...');
      
      // Clean up any existing tour
      if (tourRef.current) {
        try {
          tourRef.current.destroy();
        } catch (error) {
          console.error('Error destroying existing tour:', error);
        }
      }
      
      // Reset state and start new tour
      setIsTourActive(false);
      tourRef.current = null;
      
      // Start fresh tour
      startTour();
    }
  };

  console.log('Rendering tour component:', { isFirstTime, isTourActive });
  return (
    <div className="tour-container">
      {/* Tour trigger button - always show for now */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleTourButtonClick}
        className="fixed bottom-4 right-4 z-50 shadow-lg bg-white dark:bg-zinc-900 border-2 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
        data-testid="tour-button"
      >
        {isTourActive ? (
          <>
            <X className="h-4 w-4 mr-2" />
            End Tour
          </>
        ) : (
          <>
            <HelpCircle className="h-4 w-4 mr-2" />
            Tour
          </>
        )}
      </Button>
    </div>
  );
} 