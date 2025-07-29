'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import 'shepherd.js/dist/css/shepherd.css';
import '../tour/tour-styles.css';
import '../tour/types';

import { Button } from '@/components/ui/button';
import { HelpCircle, X } from 'lucide-react';

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

  // Add highlight to element
  const addHighlight = (element: Element) => {
    element.classList.add('shepherd-highlight');
  };

  // Remove highlight from element
  const removeHighlight = (element: Element) => {
    element.classList.remove('shepherd-highlight');
  };

  // Enhanced element finding functions
  const findSidebarAgentsLink = () => {
    const selectors = [
      'a[href="/agents"]',
      'a:has(.lucide-bot)',
      '[data-testid="agents-link"]',
      '.sidebar a:has(.lucide-bot)'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        continue;
      }
    }
    return null;
  };

  const findNewAgentButton = () => {
    const selectors = [
      '[data-testid="new-agent-button"]',
      'button:has(.lucide-plus)',
      '.space-y-1 + div button:has(.lucide-plus)'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element && element.textContent?.includes('Agent')) return element;
      } catch (e) {
        continue;
      }
    }
    
    // If no specific match, look for any plus button and validate text content
    const allPlusButtons = document.querySelectorAll('button:has(.lucide-plus)');
    for (const button of allPlusButtons) {
      if (button.textContent?.includes('Agent')) {
        return button as Element;
      }
    }
    
    return null;
  };

  const findFirstAgentCard = () => {
    const selectors = [
      `[data-agent-id="${firstAgentId}"]`,
      '.grid > div:first-child',
      '.agent-card:first-child',
      '[class*="ProfileCard"]:first-child'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        continue;
      }
    }
    return null;
  };

  const findChatButton = () => {
    const selectors = [
      'button:has(.lucide-message-circle)',
      '[data-testid="chat-button"]',
      '.grid button:has(.lucide-message-circle)'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        continue;
      }
    }
    
    // Look for buttons with "Chat" text
    const allButtons = document.querySelectorAll('button');
    for (const button of allButtons) {
      if (button.textContent?.includes('Chat')) {
        return button as Element;
      }
    }
    
    return null;
  };

  const findEditButton = () => {
    const selectors = [
      'button:has(.lucide-wrench)',
      'button[title*="Customize"]',
      'button[title*="Edit"]',
      '[data-testid="edit-button"]',
      '.grid button:has(.lucide-wrench)'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        continue;
      }
    }
    return null;
  };

  const findPublishButton = () => {
    const selectors = [
      'button:has(.lucide-globe)',
      '[data-testid="publish-button"]',
      '.grid button:has(.lucide-globe)'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        continue;
      }
    }
    
    // Look for buttons with "Publish" text
    const allButtons = document.querySelectorAll('button');
    for (const button of allButtons) {
      if (button.textContent?.includes('Publish')) {
        return button as Element;
      }
    }
    
    return null;
  };

  const findShareButton = () => {
    const selectors = [
      'button:has(.lucide-share-2)',
      'button[title*="Share"]',
      '[data-testid="share-button"]',
      '.grid button:has(.lucide-share-2)'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        continue;
      }
    }
    return null;
  };

  const findDeleteButton = () => {
    const selectors = [
      'button:has(.lucide-trash-2)',
      'button[title*="Delete"]',
      '[data-testid="delete-button"]',
      '.grid button:has(.lucide-trash-2)'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        continue;
      }
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

      // Step 1: Welcome to Agents Page
      tourRef.current.addStep({
        id: 'welcome-agents',
        title: 'Welcome to Your Agents!',
        text: `
          <div class="space-y-4">
            <p>This is your Agents page where you can create, manage, and customize AI agents.</p>
            <p>Watch this quick video to see how agents work:</p>
            
            <!-- Embedded Loom Video -->
            <div class="relative w-full" style="padding-bottom: 56.25%; height: 0; margin: 1rem 0;">
              <iframe 
                src="https://www.loom.com/embed/YOUR_LOOM_VIDEO_ID?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&autoplay=false&loop=false" 
                frameborder="0" 
                webkitallowfullscreen 
                mozallowfullscreen 
                allowfullscreen
                loading="lazy"
                title="Agents Demo Video"
                class="absolute top-0 left-0 w-full h-full rounded-lg"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
              </iframe>
            </div>
            
            <p><strong>Tip:</strong> AI agents are specialized assistants that can help you with specific tasks, workflows, and projects.</p>
            <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">
              <em>Click the video to play. You can continue the tour while it plays!</em>
            </p>
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

      // Step 2: Sidebar Agents Link
      tourRef.current.addStep({
        id: 'sidebar-agents',
        title: 'Your Agents in Sidebar',
        text: `
          <div class="space-y-3">
            <p>This is your Agents link in the sidebar! Click here anytime to access your agents.</p>
            <p>You can see all your agents, create new ones, and manage them from this central location.</p>
          </div>
        `,
        attachTo: {
          element: 'a[href="/agents"], a:has(.lucide-bot), .sidebar a:has(.lucide-bot)',
          on: 'right'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [20, 0],
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
              const element = findSidebarAgentsLink();
              if (element) {
                addHighlight(element);
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
            const element = findSidebarAgentsLink();
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

      // Step 3: New Agent Button
      tourRef.current.addStep({
        id: 'new-agent-button',
        title: 'Create New Agent',
        text: `
          <div class="space-y-3">
            <p>This is the "+ New Agent" button! Click here to create a new AI agent.</p>
            <p>You'll be able to customize your agent's name, personality, tools, and capabilities to match your specific needs.</p>
          </div>
        `,
        attachTo: {
          element: 'button:has(.lucide-plus), [data-testid="new-agent-button"]',
          on: 'left'
        },
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [-20, 0],
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
                fallbackPlacements: ['right', 'top', 'bottom'],
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              const element = findNewAgentButton();
              if (element) {
                addHighlight(element);
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
            const element = findNewAgentButton();
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

      // Step 4: Agent Card Overview (if agents exist)
      if (hasAgents && firstAgentId) {
        tourRef.current.addStep({
          id: 'agent-card-overview',
          title: 'Your Agent Card',
          text: `
            <div class="space-y-3">
              <p>This is one of your AI agents! Each agent card shows the agent's details and provides quick actions.</p>
              <p>Let's explore the different buttons and features available on each agent card.</p>
            </div>
          `,
          attachTo: {
            element: `[data-agent-id="${firstAgentId}"], .grid > div:first-child, .agent-card:first-child`,
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
            ],
          },
          beforeShowPromise: () => {
            return new Promise<void>((resolve) => {
              setTimeout(() => {
                const element = findFirstAgentCard();
                if (element) {
                  addHighlight(element);
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
              const element = findFirstAgentCard();
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

        // Step 5: Chat Button
        tourRef.current.addStep({
          id: 'chat-button',
          title: 'Use This Agent!',
          text: `
            <div class="space-y-3">
              <p>This is the Chat button! Click here to start a conversation with this agent.</p>
              <p>The agent will use its specialized knowledge and tools to help you with your tasks.</p>
            </div>
          `,
          attachTo: {
            element: 'button:has(.lucide-message-circle), [data-testid="chat-button"], .grid button:has(.lucide-message-circle)',
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
                const element = findChatButton();
                if (element) {
                  addHighlight(element);
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
              const element = findChatButton();
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

        // Step 6: Edit Button
        tourRef.current.addStep({
          id: 'edit-button',
          title: 'Edit Your Agent',
          text: `
            <div class="space-y-3">
              <p>This is the Edit button (wrench icon)! Click here to customize and modify your agent.</p>
              <p>You can change the agent's instructions, add tools, modify its personality, and more.</p>
            </div>
          `,
          attachTo: {
            element: 'button:has(.lucide-wrench), button[title*="Customize"], .grid button:has(.lucide-wrench)',
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
                const element = findEditButton();
                if (element) {
                  addHighlight(element);
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
              const element = findEditButton();
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

        // Step 7: Publish Button
        tourRef.current.addStep({
          id: 'publish-button',
          title: 'Publish Your Agent',
          text: `
            <div class="space-y-3">
              <p>This is the Publish button (globe icon)! Click here to publish your agent to the marketplace.</p>
              <p>Other users will be able to discover and use your agent once it's published.</p>
            </div>
          `,
          attachTo: {
            element: 'button:has(.lucide-globe), [data-testid="publish-button"], .grid button:has(.lucide-globe)',
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
                const element = findPublishButton();
                if (element) {
                  addHighlight(element);
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
              const element = findPublishButton();
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

        // Step 8: Share Button
        tourRef.current.addStep({
          id: 'share-button',
          title: 'Share Your Agent',
          text: `
            <div class="space-y-3">
              <p>This is the Share button! Click here to share your agent with specific people.</p>
              <p>You can create share links and control who has access to your agent.</p>
            </div>
          `,
          attachTo: {
            element: 'button:has(.lucide-share-2), button[title*="Share"], .grid button:has(.lucide-share-2)',
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
                const element = findShareButton();
                if (element) {
                  addHighlight(element);
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
              const element = findShareButton();
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

        // Step 9: Delete Agent
        tourRef.current.addStep({
          id: 'delete-agent',
          title: 'Delete Your Agent',
          text: `
            <div class="space-y-3">
              <p>To delete an agent, look for the delete button (trash icon) in the agent's options or settings.</p>
              <p><strong>Warning:</strong> Deleting an agent is permanent and cannot be undone. Use this feature carefully!</p>
            </div>
          `,
          attachTo: {
            element: 'button:has(.lucide-trash-2), button[title*="Delete"], .grid button:has(.lucide-trash-2)',
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
                const element = findDeleteButton();
                if (element) {
                  addHighlight(element);
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
              const element = findDeleteButton();
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
              text: 'Finish Tour',
              action: () => {
                tourRef.current?.complete();
              },
              classes: 'shepherd-button-primary'
            }
          ]
        });
      } else {
        // No agents exist - show what they can do after creating one
        tourRef.current.addStep({
          id: 'what-you-can-do',
          title: 'What You Can Do With Agents',
          text: `
            <div class="space-y-3">
              <p>Once you create agents, you'll be able to:</p>
              <ul class="list-disc list-inside space-y-1 text-sm">
                <li><strong>Chat:</strong> Start conversations with your agents</li>
                <li><strong>Edit:</strong> Customize instructions and tools</li>
                <li><strong>Publish:</strong> Share with the marketplace</li>
                <li><strong>Share:</strong> Give access to specific people</li>
                <li><strong>Delete:</strong> Remove agents you no longer need</li>
              </ul>
              <p>Create your first agent to get started!</p>
            </div>
          `,
          attachTo: {
            element: '.space-y-1, [data-testid="agents-description"], .text-md',
            on: 'top'
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
      }

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
  }, [isFirstTime, hasAgents, firstAgentId, cleanup]);

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
            {isLoading ? 'Loading...' : 'Agents Tour'}
          </>
        )}
      </Button>
    </div>
  );
} 