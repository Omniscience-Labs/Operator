'use client';

import { useEffect, useRef, useState } from 'react';
import 'shepherd.js/dist/css/shepherd.css';
import '../tour/tour-styles.css';
import '../tour/types';

import { Button } from '@/components/ui/button';
import { Play, HelpCircle, X } from 'lucide-react';

interface AgentsPageTourProps {
  isFirstTime?: boolean;
  onComplete?: () => void;
  hasAgents?: boolean;
  firstAgentId?: string;
}

export function AgentsPageTour({ 
  isFirstTime = false, 
  onComplete, 
  hasAgents = false,
  firstAgentId 
}: AgentsPageTourProps) {
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
  }, [isFirstTime, hasAgents, firstAgentId]);

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

      // Step 1: Welcome to Agents Page
      tourRef.current.addStep({
        id: 'welcome-agents',
        title: 'Welcome to Your Agents!',
        text: `
          <div class="space-y-3">
            <p>This is your Agents page where you can create, manage, and customize AI agents.</p>
            <p>AI agents are specialized assistants that can help you with specific tasks, workflows, and projects.</p>
          </div>
        `,
        attachTo: {
          element: 'h1, .text-2xl, [data-testid="agents-title"]',
          on: 'bottom'
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

      // Step 2: What are Agents (if no agents exist)
      if (!hasAgents) {
        tourRef.current.addStep({
          id: 'what-are-agents',
          title: 'What are AI Agents?',
          text: `
            <div class="space-y-3">
              <p><strong>AI Agents</strong> are specialized AI assistants that you can customize for specific tasks and workflows.</p>
              <p>You can create agents for:</p>
              <ul class="list-disc list-inside space-y-1 text-sm">
                <li><strong>Data Analysis:</strong> Research, analyze data, create reports</li>
                <li><strong>Content Creation:</strong> Write articles, create presentations, generate ideas</li>
                <li><strong>Project Management:</strong> Plan projects, track progress, manage tasks</li>
                <li><strong>Customer Support:</strong> Answer questions, provide assistance</li>
                <li><strong>Creative Work:</strong> Design, brainstorm, create art</li>
              </ul>
            </div>
          `,
          attachTo: {
            element: '.space-y-1, [data-testid="agents-description"]',
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
      }

      // Step 3: First Agent (if agents exist)
      if (hasAgents && firstAgentId) {
        tourRef.current.addStep({
          id: 'first-agent',
          title: 'Your First Agent',
          text: `
            <div class="space-y-3">
              <p>This is one of your AI agents! Each agent is a specialized assistant with its own personality, tools, and capabilities.</p>
              <p>You can chat with agents, customize their behavior, or create new ones for different tasks.</p>
            </div>
          `,
          attachTo: {
            element: `[data-agent-id="${firstAgentId}"], .agent-card:first-child, .grid > div:first-child`,
            on: 'top'
          },
          beforeShowPromise: () => {
            return new Promise<void>((resolve) => {
              setTimeout(() => {
                const element = document.querySelector(`[data-agent-id="${firstAgentId}"], .agent-card:first-child, .grid > div:first-child`);
                if (element) {
                  addHighlight(element);
                }
                resolve();
              }, 100);
            });
          },
          beforeHidePromise: () => {
            return new Promise<void>((resolve) => {
              const element = document.querySelector(`[data-agent-id="${firstAgentId}"], .agent-card:first-child, .grid > div:first-child`);
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
      }

      // Step 4: Create New Agent
      tourRef.current.addStep({
        id: 'create-agent',
        title: 'Create Your First Agent',
        text: `
          <div class="space-y-3">
            <p>Ready to create your own AI agent? Click the "New Agent" button to get started!</p>
            <p>You'll be able to customize your agent's name, personality, tools, and capabilities to match your specific needs.</p>
          </div>
        `,
        attachTo: {
          element: 'button:has(.plus), button:has([class*="New Agent"]), button[aria-label*="agent"], button[title*="agent"]',
          on: 'left'
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = document.querySelector('button:has(.plus), button:has([class*="New Agent"]), button[aria-label*="agent"], button[title*="agent"]');
              if (element) {
                addHighlight(element);
              }
              resolve();
            }, 100);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = document.querySelector('button:has(.plus), button:has([class*="New Agent"]), button[aria-label*="agent"], button[title*="agent"]');
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
        data-testid="agents-tour-button"
      >
        {isTourActive ? (
          <>
            <X className="h-4 w-4 mr-2" />
            End Tour
          </>
        ) : (
          <>
            <HelpCircle className="h-4 w-4 mr-2" />
            Agents Tour
          </>
        )}
      </Button>
    </div>
  );
} 