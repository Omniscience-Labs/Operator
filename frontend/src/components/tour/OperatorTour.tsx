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
      if (tourRef.current) {
        console.log('🔄 Completing existing tour before starting new one');
        tourRef.current.complete();
      }

      // Dynamic import to ensure proper module loading
      const shepherdModule = await import('shepherd.js');
      console.log('📦 Shepherd module:', shepherdModule);
      
      // Try different ways to get the Tour constructor
      let TourConstructor = shepherdModule.Tour || shepherdModule.default?.Tour || shepherdModule.default;
      
      console.log('🏗️ Tour constructor found:', typeof TourConstructor, TourConstructor);
      
      if (!TourConstructor || typeof TourConstructor !== 'function') {
        throw new Error('Tour constructor not found in shepherd.js module');
      }
      
      tourRef.current = new TourConstructor({
        defaultStepOptions: {
          cancelIcon: {
            enabled: true,
            label: 'Close tour'
          },
          classes: 'shepherd-theme-arrows',
          scrollTo: true,
          popperOptions: {
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: [0, 12]
                }
              }
            ]
          }
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
            action: () => tourRef.current?.next(),
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 2: New Task Guide
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
        setIsTourActive(true);
      });

      tourRef.current.on('complete', () => {
        try {
          setIsTourActive(false);
          onComplete?.();
        } catch (error) {
          console.error('Error in tour complete event:', error);
          setIsTourActive(false);
        }
      });

      tourRef.current.on('cancel', () => {
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
      console.log('🛑 Completing existing tour...');
      try {
        if (tourRef.current) {
          tourRef.current.complete();
        }
      } catch (error) {
        console.error('Error completing tour from button:', error);
        setIsTourActive(false);
        onComplete?.();
      }
    } else {
      console.log('🚀 Starting new tour...');
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