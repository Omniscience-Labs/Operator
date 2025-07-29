'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import 'shepherd.js/dist/css/shepherd.css';
import './tour-styles.css';
import './types';

import { Button } from '@/components/ui/button';
import { HelpCircle, X } from 'lucide-react';

interface OperatorTourProps {
  isFirstTime?: boolean;
  onComplete?: () => void;
}

// Add highlight to element
const addHighlight = (element: Element) => {
  element.classList.add('shepherd-highlight');
};

// Remove highlight from element
const removeHighlight = (element: Element) => {
  element.classList.remove('shepherd-highlight');
};

export function OperatorTour({ isFirstTime = false, onComplete }: OperatorTourProps) {
  const tourRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (tourRef.current) {
      try {
        tourRef.current.complete();
        tourRef.current = null;
      } catch (error) {
        console.warn('Error cleaning up tour:', error);
      }
    }
    
    // Remove any lingering highlights
    document.querySelectorAll('.shepherd-highlight').forEach(el => {
      el.classList.remove('shepherd-highlight');
    });
    
    setIsTourActive(false);
  }, []);

  // Enhanced element finding with better selectors
  const findAttachmentElement = () => {
    const selectors = [
      // Most specific first - target the actual button with Paperclip icon
      'button:has(.lucide-paperclip)',
      'button:has([data-lucide="paperclip"])',
      // Fallback selectors
      'button:has(.paperclip)',
      'button:has([data-testid="file-upload"])',
      '.file-upload-handler button',
      'button[aria-label*="upload"]',
      'button[aria-label*="file"]',
      'button[aria-label*="attach"]',
      '[data-tour="attachments"]',
      // Target by class structure we found
      'button.h-7.rounded-md.text-muted-foreground:has(.lucide-paperclip)'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  };

  const findPluginElement = () => {
    const selectors = [
      // Most specific first - target the actual button with Plug icon
      'button:has(.lucide-plug)',
      'button:has([data-lucide="plug"])',
      // Fallback selectors
      'button:has(.plug)',
      '[data-radix-collection-item]:has(.plug)',
      '.integrations-dropdown button',
      'button[aria-label*="integration"]',
      'button[aria-label*="plugin"]',
      '[data-tour="plugins"]',
      // Target by class structure we found
      'button.h-7.rounded-md.text-muted-foreground:has(.lucide-plug)'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  };

  const findMediaElement = () => {
    const selectors = [
      // Most specific first - target the actual button with FileAudio icon
      'button:has(.lucide-file-audio)',
      'button:has([data-lucide="file-audio"])',
      // Fallback selectors
      'button:has(.file-audio)',
      'button:has([data-testid="meeting-recorder"])',
      '.meeting-recorder button',
      'button[aria-label*="meeting"]',
      'button[aria-label*="audio"]',
      'button[aria-label*="media"]',
      '[data-tour="media"]',
      // Target by class structure we found
      'button.h-7.rounded-md.text-muted-foreground:has(.lucide-file-audio)'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  };


  const startTour = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setIsTourActive(true);
    
    try {
      // Import Shepherd.js dynamically
      const shepherdModule = await import('shepherd.js');
      let TourConstructor = shepherdModule.Tour || shepherdModule.default?.Tour || shepherdModule.default;
      
      if (!TourConstructor || typeof TourConstructor !== 'function') {
        throw new Error('Tour constructor not found in shepherd.js module');
      }
      
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
        modalOverlayOpeningPadding: 8
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
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 2: Chat Input
      tourRef.current.addStep({
        id: 'chat-input',
        title: 'Start Your Conversation',
        text: `
          <div class="space-y-3">
            <p>This is where the magic happens! Type your message or question here.</p>
            <p>I can help with tasks like:</p>
            <ul>
              <li>• Analyzing spreadsheets and data</li>
              <li>• Creating presentations and reports</li>
              <li>• Writing and editing documents</li>
              <li>• Research and web browsing</li>
              <li>• And much more!</li>
            </ul>
          </div>
        `,
        attachTo: {
          element: 'textarea[placeholder*="message"], input[placeholder*="message"], .chat-input textarea, [data-testid="chat-input"]',
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
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 3: Attachments Guide - IMPROVED POSITIONING
      tourRef.current.addStep({
        id: 'attachments',
        title: 'Attach Files & Documents',
        text: `
          <div class="space-y-3">
            <p>This is the attachments button! Click here to upload files, documents, images, and more to help me understand your task better.</p>
            <p>Simply drag and drop files here or click to browse. I can analyze PDFs, spreadsheets, images, and many other file types.</p>
          </div>
        `,
        attachTo: {
          element: 'button:has(.lucide-paperclip), button:has(.paperclip), button.h-7.rounded-md.text-muted-foreground:has(.lucide-paperclip)',
          on: 'top'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -20], // Position popup above the button with proper spacing
              },
            },
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 20,
              },
            },
            {
              name: 'flip',
              options: {
                fallbackPlacements: ['bottom', 'left', 'right'],
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = findAttachmentElement();
              if (element) {
                addHighlight(element);
                // Ensure element is scrolled into view with extra space
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest' 
                });
              }
              resolve();
            }, 100);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = findAttachmentElement();
            if (element) {
              removeHighlight(element);
            }
            resolve();
          });
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
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 4: Plugins Guide - IMPROVED POSITIONING
      tourRef.current.addStep({
        id: 'plugins',
        title: 'Integrations & Plugins',
        text: `
          <div class="space-y-3">
            <p>This is the integrations button! Click here to connect external tools and services to extend my capabilities.</p>
            <p>You can integrate with databases, APIs, web services, and more to make me even more powerful for your specific needs.</p>
          </div>
        `,
        attachTo: {
          element: 'button:has(.lucide-plug), button:has(.plug), button.h-7.rounded-md.text-muted-foreground:has(.lucide-plug)',
          on: 'top'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -20], // Position popup above the button with proper spacing
              },
            },
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 20,
              },
            },
            {
              name: 'flip',
              options: {
                fallbackPlacements: ['bottom', 'left', 'right'],
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = findPluginElement();
              if (element) {
                addHighlight(element);
                // Ensure element is scrolled into view with extra space
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest' 
                });
              }
              resolve();
            }, 100);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = findPluginElement();
            if (element) {
              removeHighlight(element);
            }
            resolve();
          });
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
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 5: Media/Meetings Guide - IMPROVED POSITIONING
      tourRef.current.addStep({
        id: 'meetings',
        title: 'Meeting Recorder',
        text: `
          <div class="space-y-3">
            <p>This is the meeting recorder button! Click here to open the meetings page where you can record and transcribe conversations.</p>
            <p>You can record in-person meetings or join online meetings with a bot that captures everything for you.</p>
          </div>
        `,
        attachTo: {
          element: 'button:has(.lucide-file-audio), button:has(.file-audio), button.h-7.rounded-md.text-muted-foreground:has(.lucide-file-audio)',
          on: 'top'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -20], // Position popup above the button with proper spacing
              },
            },
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 20,
              },
            },
            {
              name: 'flip',
              options: {
                fallbackPlacements: ['bottom', 'left', 'right'],
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = findMediaElement();
              if (element) {
                addHighlight(element);
                // Ensure element is scrolled into view with extra space
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest' 
                });
              }
              resolve();
            }, 100);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = findMediaElement();
            if (element) {
              removeHighlight(element);
            }
            resolve();
          });
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
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 6: Send Message
      tourRef.current.addStep({
        id: 'send-message',
        title: 'Send Your Message',
        text: `
          <div class="space-y-3">
            <p>Once you've typed your message and added any files, click this button to send it to me!</p>
            <p>I'll analyze your request and provide helpful responses, execute tasks, or ask clarifying questions if needed.</p>
          </div>
        `,
        attachTo: {
          element: 'button[type="submit"], .send-button, button:has(.send), button[aria-label*="send"]',
          on: 'left'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -80],
              },
            },
          ],
        },
        buttons: [
          {
            text: 'Back',
            action: () => tourRef.current?.back(),
            classes: 'shepherd-button-secondary'
          },
          {
            text: 'Finish Tour',
            action: () => {
              tourRef.current?.complete();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Tour event handlers
      tourRef.current.on('complete', () => {
        cleanup();
        onComplete?.();
      });

      tourRef.current.on('cancel', () => {
        cleanup();
        onComplete?.();
      });

      // Start the tour
      tourRef.current.start();
      
    } catch (error) {
      console.error('Failed to start tour:', error);
      setIsTourActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tour button click
  const handleTourButtonClick = () => {
    if (isTourActive) {
      // If tour is active, end it
      cleanup();
    } else {
      // Start a fresh tour
      // Clean up any existing tour first
      cleanup();
      
      // Start fresh tour
      startTour();
    }
  };

  useEffect(() => {
    if (isFirstTime) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startTour();
      }, 500);
      
      return () => clearTimeout(timer);
    }
    
    return cleanup;
  }, [isFirstTime, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className="tour-container">
      {/* Tour trigger button - show for manual tour starts */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleTourButtonClick}
        disabled={isLoading}
        className="fixed bottom-4 right-4 z-50 shadow-lg bg-white dark:bg-zinc-900 border-2 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
        data-testid="dashboard-tour-button"
      >
        {isTourActive ? (
          <>
            <X className="h-4 w-4 mr-2" />
            End Tour
          </>
        ) : (
          <>
            <HelpCircle className="h-4 w-4 mr-2" />
            {isLoading ? 'Loading...' : 'Tour'}
          </>
        )}
      </Button>
    </div>
  );
} 