'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import 'shepherd.js/dist/css/shepherd.css';
import './tour-styles.css';
import './types';

import { Button } from '@/components/ui/button';
import { HelpCircle, X } from 'lucide-react';

interface PublishAgentTourProps {
  isActive?: boolean;
  onComplete?: () => void;
}

// Add highlight to element
const addHighlight = (element: Element) => {
  element.classList.add('tour-highlight');
};

// Remove highlight from element
const removeHighlight = (element: Element) => {
  element.classList.remove('tour-highlight');
};

export function PublishAgentTour({ isActive = false, onComplete }: PublishAgentTourProps) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const tourRef = useRef<any>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (tourRef.current) {
      try {
        tourRef.current.complete();
      } catch (e) {
        // Tour may already be completed
      }
      tourRef.current = null;
    }
    
    // Remove all highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      removeHighlight(el);
    });
    
    setIsTourActive(false);
    setIsLoading(false);
  }, []);

  // Effect to handle tour activation
  useEffect(() => {
    if (isActive && !isTourActive && !isLoading) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        startTour();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isActive, isTourActive, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const findPublishButton = () => {
    // Look for publish buttons in various ways
    const selectors = [
      'button:has(.lucide-globe)',
      'button[title*="Publish"]',
      'button:contains("Publish to Marketplace")',
      '[data-testid="publish-button"]',
      '.grid button:has(.lucide-globe)'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element && element.textContent?.includes('Publish')) {
          return element;
        }
      } catch (e) {
        continue;
      }
    }

    // Alternative approach: look for buttons with Globe icon and text containing "Publish"
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      const hasGlobeIcon = button.querySelector('.lucide-globe');
      const hasPublishText = button.textContent?.toLowerCase().includes('publish');
      if (hasGlobeIcon && hasPublishText) {
        return button;
      }
    }

    return null;
  };

  const findFirstAgent = () => {
    // Look for the first agent card
    const selectors = [
      '.grid > div:first-child',
      '[data-testid="agent-card"]:first-child',
      '.agent-card:first-child'
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

      // Step 1: Welcome - explain what we'll do
      tourRef.current.addStep({
        id: 'publish-welcome',
        title: 'Share Your Agents! 🚀',
        text: `
          <div class="space-y-3">
            <p>Great! Let's get your agents published to the marketplace so others can discover and use them.</p>
            <p>I'll show you exactly where to find the publish button on your agents.</p>
          </div>
        `,
        attachTo: {
          element: '.container, main, [data-main-content]',
          on: 'top'
        },
        buttons: [
          {
            text: 'Show Me!',
            action: () => {
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          },
          {
            text: 'Skip Tour',
            action: () => {
              cleanup();
              onComplete?.();
            },
            classes: 'shepherd-button-secondary'
          }
        ]
      });

      // Step 2: Point to the first agent (if available)
      const firstAgent = findFirstAgent();
      if (firstAgent) {
        tourRef.current.addStep({
          id: 'find-agent',
          title: 'Your Agents',
          text: `
            <div class="space-y-3">
              <p>Here are your personal agents. Each agent card has actions you can take.</p>
              <p>Look for agents you'd like to share with the community!</p>
            </div>
          `,
          attachTo: {
            element: firstAgent,
            on: 'top'
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
      }

      // Step 3: Find and highlight the publish button
      const publishButton = findPublishButton();
      if (publishButton) {
        addHighlight(publishButton);
        
        tourRef.current.addStep({
          id: 'publish-button',
          title: 'Publish to Marketplace',
          text: `
            <div class="space-y-3">
              <p><strong>Found it!</strong> This is the "Publish to Marketplace" button.</p>
              <p>Click this button on any of your agents to make them available to everyone in the marketplace.</p>
              <p><strong>Tip:</strong> You can choose what to include when publishing (knowledge bases, custom tools, etc.)</p>
            </div>
          `,
          attachTo: {
            element: publishButton,
            on: 'top'
          },
          buttons: [
            {
              text: 'Got It!',
              action: () => {
                removeHighlight(publishButton);
                tourRef.current?.next();
              },
              classes: 'shepherd-button-primary'
            }
          ]
        });
      } else {
        // If no publish button found, show general guidance
        tourRef.current.addStep({
          id: 'publish-guidance',
          title: 'Find the Publish Button',
          text: `
            <div class="space-y-3">
              <p>Look for the <strong>Globe icon (🌐)</strong> with "Publish to Marketplace" text on your agent cards.</p>
              <p>You might need to:</p>
              <ul class="list-disc pl-4 space-y-1">
                <li>Hover over an agent card to see the action buttons</li>
                <li>Click on an agent to open its modal</li>
                <li>Look for the Globe icon in the action buttons</li>
              </ul>
            </div>
          `,
          attachTo: {
            element: '.container, main, [data-main-content]',
            on: 'top'
          },
          buttons: [
            {
              text: 'I Found It!',
              action: () => {
                tourRef.current?.next();
              },
              classes: 'shepherd-button-primary'
            }
          ]
        });
      }

      // Step 4: Final encouragement
      tourRef.current.addStep({
        id: 'publish-complete',
        title: 'You\'re All Set! ✨',
        text: `
          <div class="space-y-3">
            <p>Perfect! Now you know how to publish your agents to the marketplace.</p>
            <p><strong>What happens when you publish:</strong></p>
            <ul class="list-disc pl-4 space-y-1">
              <li>Your agent becomes discoverable by all users</li>
              <li>Others can add it to their personal library</li>
              <li>You'll see download counts on published agents</li>
              <li>You can unpublish anytime by clicking "Make Private"</li>
            </ul>
            <p>Ready to share your first agent? 🚀</p>
          </div>
        `,
        attachTo: {
          element: '.container, main, [data-main-content]',
          on: 'top'
        },
        buttons: [
          {
            text: 'Start Publishing!',
            action: () => {
              cleanup();
              onComplete?.();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Handle tour completion
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
      console.error('Error starting publish agent tour:', error);
      cleanup();
      onComplete?.();
    } finally {
      setIsLoading(false);
    }
  };

  // Render tour trigger button (if needed)
  if (!isActive && !isTourActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={startTour}
        disabled={isLoading}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Show Publish Guide
      </Button>
    );
  }

  return null;
}