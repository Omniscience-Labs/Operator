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

  const findJoinOnlineMeetingButton = () => {
    console.log('Searching for join online meeting button...');
    
    const selectors = [
      // Simple and broad selectors that should work
      'button:has(.lucide-file-audio)',
      'button:has(svg[data-lucide="file-audio"])',
      'button svg.lucide-file-audio',
      // Check all buttons with file-audio class or aria-label
      'svg.lucide-file-audio',
      '.lucide-file-audio',
      // Generic button search
      'button'
    ];
    
    // First check for data-testid (most reliable)
    const testIdButton = document.querySelector('[data-testid="join-online-meeting-button"]');
    if (testIdButton) {
      console.log('Found Join Online Meeting button by testid:', testIdButton);
      return testIdButton;
    }

    // Manual search through all buttons
    const buttons = document.querySelectorAll('button');
    console.log(`Searching through ${buttons.length} buttons for meeting button`);
    
    for (const button of buttons) {
      // Check if button has file-audio icon
      const hasFileAudioIcon = button.querySelector('.lucide-file-audio, svg[data-lucide="file-audio"], [data-testid="lucide-file-audio"]');
      if (hasFileAudioIcon) {
        console.log('Found button with file-audio icon:', button);
        return button;
      }
      
      // Check tooltip text
      const tooltip = button.getAttribute('title') || button.getAttribute('aria-label') || '';
      if (tooltip.toLowerCase().includes('join') && tooltip.toLowerCase().includes('meeting')) {
        console.log('Found button with join meeting tooltip:', button);
        return button;
      }
      
      // Check if button opens join meeting dialog (look for nearby tooltip)
      const nextSibling = button.nextElementSibling;
      if (nextSibling && nextSibling.textContent?.toLowerCase().includes('join online meeting')) {
        console.log('Found button with join meeting tooltip nearby:', button);
        return button;
      }
    }
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`Found element with selector "${selector}":`, element);
          return element;
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log('No join online meeting button found');
    return null;
  };

  const findMeetingsDashboardButton = () => {
    const selectors = [
      // Target the meetings link in the sidebar
      'a[href="/meetings"]',
      'a[href="/meetings"] button',
      'a[href="/meetings"] .sidebar-menu-button',
      // Fallback selectors looking for meetings text
      'a:has-text("Meetings")',
      '[href="/meetings"]',
      // Look for FileAudio icon in sidebar context
      '.sidebar a:has(.lucide-file-audio)',
      'nav a:has(.lucide-file-audio)',
      // Generic fallback
      'a[href*="meetings"]'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        // Skip invalid selectors like :has-text
        continue;
      }
    }
    
    // Manual search for meetings link by text content
    const links = document.querySelectorAll('a');
    for (const link of links) {
      if (link.textContent?.toLowerCase().includes('meetings') && 
          (link.getAttribute('href') === '/meetings' || link.getAttribute('href')?.includes('meetings'))) {
        return link;
      }
    }
    
    return null;
  };

  const findNewTaskElement = () => {
    console.log('Searching for New Task button...');
    
    // Manual search through all buttons
    const buttons = document.querySelectorAll('button');
    console.log(`Searching through ${buttons.length} buttons for New Task button`);
    
    for (const button of buttons) {
      const text = button.textContent?.toLowerCase() || '';
      const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
      const testId = button.getAttribute('data-testid') || '';
      
      // Check for "New Task" text content
      if (text.includes('new task')) {
        console.log('Found New Task button by text:', button);
        return button;
      }
      
      // Check for data-testid
      if (testId === 'new-task-button') {
        console.log('Found New Task button by testid:', button);
        return button;
      }
      
      // Check for aria-label
      if (ariaLabel.includes('new task')) {
        console.log('Found New Task button by aria-label:', button);
        return button;
      }
      
      // Check if button has plus icon and is in sidebar context
      const hasPlus = button.querySelector('.lucide-plus, svg[data-lucide="plus"]');
      const isInSidebar = button.closest('.sidebar, nav, [class*="sidebar"]');
      if (hasPlus && isInSidebar) {
        console.log('Found plus button in sidebar:', button);
        return button;
      }
    }
    
    console.log('No New Task button found');
    return null;
  };

  const findSendButton = () => {
    console.log('Searching for Send button...');
    
    // Manual search through all buttons
    const buttons = document.querySelectorAll('button');
    console.log(`Searching through ${buttons.length} buttons for Send button`);
    
    for (const button of buttons) {
      // Look for arrow-up icon (send button)
      const hasArrowUp = button.querySelector('.lucide-arrow-up, svg[data-lucide="arrow-up"]');
      if (hasArrowUp) {
        console.log('Found Send button with arrow-up icon:', button);
        return button;
      }
      
      // Look for submit type
      if (button.type === 'submit') {
        console.log('Found submit button:', button);
        return button;
      }
      
      // Look for buttons in chat input area that might be send buttons
      const isInChatInput = button.closest('[data-testid="chat-input"], .chat-input, form');
      if (isInChatInput && (hasArrowUp || button.type === 'submit')) {
        console.log('Found send button in chat input:', button);
        return button;
      }
    }
    
    console.log('No Send button found');
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

      // Step 5: Join Online Meeting Button
      tourRef.current.addStep({
        id: 'join-online-meeting',
        title: 'Join Online Meeting',
        text: `
          <div class="space-y-3">
            <p>Click this button to join online meetings like Zoom, Google Meet, or Microsoft Teams!</p>
            <p>I can join meetings on your behalf to record and transcribe conversations for you.</p>
          </div>
        `,
        attachTo: {
          element: findJoinOnlineMeetingButton,
          on: 'top'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -20],
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
              const element = findJoinOnlineMeetingButton();
              console.log('Join meeting button found:', element);
              if (element) {
                addHighlight(element);
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest' 
                });
              } else {
                console.warn('Join online meeting button not found');
              }
              resolve();
            }, 100);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = findJoinOnlineMeetingButton();
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
              // Click the meetings dashboard button
              const meetingsButton = findMeetingsDashboardButton();
              if (meetingsButton && meetingsButton instanceof HTMLElement) {
                meetingsButton.click();
              }
              // Small delay to allow navigation, then show next step
              setTimeout(() => {
                tourRef.current?.next();
              }, 500);
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 6: Meetings Dashboard
      const meetingsDashboardButton = findMeetingsDashboardButton();
      const meetingsDashboardStepConfig: any = {
        id: 'meetings-dashboard',
        title: 'See All Meetings',
        text: `
          <div class="space-y-3">
            <p>See all meetings from here</p>
          </div>
        `,
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = findMeetingsDashboardButton();
              console.log('Meetings dashboard button found:', element);
              if (element) {
                addHighlight(element);
                // Ensure element is scrolled into view
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest' 
                });
              } else {
                console.warn('Meetings dashboard button not found');
              }
              resolve();
            }, 600); // Slightly longer delay to account for navigation
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = findMeetingsDashboardButton();
            if (element) {
              removeHighlight(element);
            }
            resolve();
          });
        },
        buttons: [
          {
            text: 'Back',
            action: () => {
              // Navigate back to dashboard before going back
              window.location.href = '/dashboard';
              setTimeout(() => {
                tourRef.current?.back();
              }, 500);
            },
            classes: 'shepherd-button-secondary'
          },
          {
            text: 'Next',
            action: () => {
              // Navigate back to dashboard for the next step
              window.location.href = '/dashboard';
              setTimeout(() => {
                tourRef.current?.next();
              }, 500);
            },
            classes: 'shepherd-button-primary'
          }
        ]
      };

      // Add attachTo only if we found the meetings dashboard button
      if (meetingsDashboardButton) {
        meetingsDashboardStepConfig.attachTo = {
          element: meetingsDashboardButton,
          on: 'right'
        };
      } else {
        console.warn('Meetings dashboard button not found, showing step without attachment');
      }

      tourRef.current.addStep(meetingsDashboardStepConfig);

      // Step 7: New Task Button
      tourRef.current.addStep({
        id: 'new-task',
        title: 'Create a New Task',
        text: `
          <div class="space-y-3">
            <p>This is the "New Task" button! Click here to create a new task in your workspace.</p>
            <p>You can add a title, description, and due date to organize your work efficiently.</p>
          </div>
        `,
        attachTo: {
          element: findNewTaskElement,
          on: 'right'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [20, 0], // Position popup to the right of the button with proper spacing
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
                fallbackPlacements: ['left', 'top', 'bottom'],
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = findNewTaskElement();
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
            const element = findNewTaskElement();
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

      // Step 8: Send Message
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
          element: findSendButton,
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