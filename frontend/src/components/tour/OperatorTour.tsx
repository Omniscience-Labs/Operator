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

  // Function to add highlight class to element
  const addHighlight = (element: Element) => {
    element.classList.add('shepherd-highlight');
  };

  // Function to remove highlight class from element
  const removeHighlight = (element: Element) => {
    element.classList.remove('shepherd-highlight');
  };

  const startTour = async () => {
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
          element: 'button:has(.paperclip), button:has([data-testid="file-upload"]), .file-upload-handler button, button[aria-label*="upload"], button[aria-label*="file"]',
          on: 'left'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -20], // Move popup higher so highlighted area is visible
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = document.querySelector('button:has(.paperclip), button:has([data-testid="file-upload"]), .file-upload-handler button, button[aria-label*="upload"], button[aria-label*="file"]');
              if (element) {
                addHighlight(element);
              }
              resolve();
            }, 100);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = document.querySelector('button:has(.paperclip), button:has([data-testid="file-upload"]), .file-upload-handler button, button[aria-label*="upload"], button[aria-label*="file"]');
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
          element: 'button:has(.plug), [data-radix-collection-item]:has(.plug), .integrations-dropdown button, button[aria-label*="integration"], button[aria-label*="plugin"]',
          on: 'top'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -20], // Move popup higher so highlighted area is visible
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = document.querySelector('button:has(.plug), [data-radix-collection-item]:has(.plug), .integrations-dropdown button, button[aria-label*="integration"], button[aria-label*="plugin"]');
              if (element) {
                addHighlight(element);
              }
              resolve();
            }, 100);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = document.querySelector('button:has(.plug), [data-radix-collection-item]:has(.plug), .integrations-dropdown button, button[aria-label*="integration"], button[aria-label*="plugin"]');
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

      // Step 5: Open Meetings Guide
      tourRef.current.addStep({
        id: 'meetings',
        title: 'Open Meetings',
        text: `
          <div class="space-y-3">
            <p>This is the meetings feature! Click here to open the meetings page where you can record and transcribe conversations.</p>
            <p>You can record in-person meetings or join online meetings with a bot that captures everything for you.</p>
          </div>
        `,
        attachTo: {
          element: 'button:has(.file-audio), button:has([data-testid="meeting-recorder"]), .meeting-recorder button, button[aria-label*="meeting"], button[aria-label*="audio"]',
          on: 'top'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -20], // Move popup higher so highlighted area is visible
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = document.querySelector('button:has(.file-audio), button:has([data-testid="meeting-recorder"]), .meeting-recorder button, button[aria-label*="meeting"], button[aria-label*="audio"]');
              if (element) {
                addHighlight(element);
              }
              resolve();
            }, 100);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = document.querySelector('button:has(.file-audio), button:has([data-testid="meeting-recorder"]), .meeting-recorder button, button[aria-label*="meeting"], button[aria-label*="audio"]');
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

      // Step 6: Agents Guide
      tourRef.current.addStep({
        id: 'agents',
        title: 'Create & Manage AI Agents',
        text: `
          <div class="space-y-3">
            <p>This is the Agents section! Here you can create and manage custom AI agents with specific instructions and tools.</p>
            <p>Build agents tailored to your workflow - from data analysts to content creators, each with their own specialized capabilities.</p>
          </div>
        `,
        attachTo: {
          element: 'a[href="/agents"], .sidebar-menu-button:has(.bot), button:has(.bot), [data-testid="agents-link"], .sidebar-content',
          on: 'right'
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

      // Step 7: Marketplace Guide
      tourRef.current.addStep({
        id: 'marketplace',
        title: 'Browse & Install Agents',
        text: `
          <div class="space-y-3">
            <p>This is the Marketplace! Discover and install pre-built AI agents from the community.</p>
            <p>Find agents for common tasks like project management, research, or creative work - all ready to use immediately.</p>
          </div>
        `,
        attachTo: {
          element: 'a[href="/marketplace"], .sidebar-menu-button:has(.store), button:has(.store), [data-testid="marketplace-link"], .sidebar-content',
          on: 'right'
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

      // Step 8: Quick Start Guide
      tourRef.current.addStep({
        id: 'quick-start',
        title: 'Quick Start Templates',
        text: `
          <div class="space-y-3">
            <p>This is the Quick Start section! Here you'll find pre-built templates to help you get started quickly.</p>
            <p>Choose from templates like project automation, UX research framework, or learning path generator to jumpstart your workflow.</p>
          </div>
        `,
        attachTo: {
          element: '.w-full.max-w-3xl.mx-auto.px-4, .examples, [data-testid="quick-starts"], .quick-starts, .suggestions, .templates',
          on: 'top'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -20], // Move popup higher so highlighted area is visible
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = document.querySelector('.w-full.max-w-3xl.mx-auto.px-4, .examples, [data-testid="quick-starts"], .quick-starts, .suggestions, .templates');
              if (element) {
                addHighlight(element);
              }
              resolve();
            }, 100);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = document.querySelector('.w-full.max-w-3xl.mx-auto.px-4, .examples, [data-testid="quick-starts"], .quick-starts, .suggestions, .templates');
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

      // Step 9: New Task Guide
      tourRef.current.addStep({
        id: 'new-task',
        title: 'Create Your First Task',
        text: `
          <div class="space-y-3">
            <p>This is where you create a new task with Operator! Click the "New Task" button in the sidebar to get started.</p>
            <p>Tasks are your way of telling Operator what you need help with - whether it's analyzing data, creating reports, or any other AI-powered workflow.</p>
          </div>
        `,
        attachTo: {
          element: '.liquid-button:has(.plus), .sidebar-menu-button:has(.plus), [data-testid="new-task-button"], .tasks-section .liquid-button, .sidebar-content .liquid-button:has(.plus)',
          on: 'right'
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = document.querySelector('.liquid-button:has(.plus), .sidebar-menu-button:has(.plus), [data-testid="new-task-button"], .tasks-section .liquid-button, .sidebar-content .liquid-button:has(.plus)');
              if (element) {
                addHighlight(element);
              }
              resolve();
            }, 100);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = document.querySelector('.liquid-button:has(.plus), .sidebar-menu-button:has(.plus), [data-testid="new-task-button"], .tasks-section .liquid-button, .sidebar-content .liquid-button:has(.plus)');
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
            text: 'End Tour',
            action: () => {
              try {
                if (tourRef.current) {
                  tourRef.current.complete();
                }
                setIsTourActive(false);
                onComplete?.();
              } catch (error) {
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
          // Remove any remaining highlights
          document.querySelectorAll('.shepherd-highlight').forEach(el => {
            removeHighlight(el);
          });
          setIsTourActive(false);
          onComplete?.();
        } catch (error) {
          setIsTourActive(false);
        }
      });

      tourRef.current.on('cancel', () => {
        try {
          // Remove any remaining highlights
          document.querySelectorAll('.shepherd-highlight').forEach(el => {
            removeHighlight(el);
          });
          setIsTourActive(false);
          onComplete?.();
        } catch (error) {
          setIsTourActive(false);
        }
      });

      tourRef.current.start();
    } catch (error) {
      // Silent error handling - no logging
    }
  };

  const handleTourButtonClick = () => {
    if (isTourActive) {
      // If tour is active, end it
      if (tourRef.current) {
        try {
          tourRef.current.complete();
        } catch (error) {
          // Silent error handling
        }
      }
      setIsTourActive(false);
      onComplete?.();
    } else {
      // Start a fresh tour
      // Clean up any existing tour
      if (tourRef.current) {
        try {
          tourRef.current.destroy();
        } catch (error) {
          // Silent error handling
        }
      }
      
      // Reset state and start new tour
      setIsTourActive(false);
      tourRef.current = null;
      
      // Start fresh tour
      startTour();
    }
  };

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