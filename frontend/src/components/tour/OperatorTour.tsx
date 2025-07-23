'use client';

import { useEffect, useRef, useState } from 'react';
import { Tour } from 'shepherd.js';
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
  const tourRef = useRef<Tour | null>(null);
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

  const startTour = () => {
    console.log('🎬 startTour called, Tour constructor:', typeof Tour);
    if (tourRef.current) {
      console.log('🔄 Completing existing tour before starting new one');
      tourRef.current.complete();
    }

    try {
      console.log('🏗️ Creating new Tour instance...');
      tourRef.current = new Tour({
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
      title: 'Welcome to Operator! 🚀',
      text: `
        <div class="space-y-3">
          <p>Welcome to Operator! This is your AI-powered assistant.</p>
          <p>Click the tour button anytime to get help with features.</p>
        </div>
      `,
      buttons: [
        {
          text: 'Got it!',
          action: () => {
            tourRef.current?.complete();
            setIsTourActive(false);
            onComplete?.();
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
      setIsTourActive(false);
      onComplete?.();
    });

    tourRef.current.on('cancel', () => {
      setIsTourActive(false);
      onComplete?.();
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
      tourRef: tourRef.current,
      Tour: typeof Tour 
    });
    if (isTourActive) {
      console.log('🛑 Completing existing tour...');
      tourRef.current?.complete();
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