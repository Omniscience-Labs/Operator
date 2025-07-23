'use client';

import { useEffect, useRef, useState } from 'react';
import { Tour, Step } from 'shepherd.js';
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
    if (tourRef.current) {
      tourRef.current.complete();
    }

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
          <p>Operator is your AI-powered assistant that can help you with complex tasks, research, and automation.</p>
          <p>Let's take a quick tour to show you around!</p>
        </div>
      `,
      buttons: [
        {
          text: 'Skip Tour',
          action: () => {
            tourRef.current?.complete();
            setIsTourActive(false);
            onComplete?.();
          },
          classes: 'shepherd-button-secondary'
        },
        {
          text: 'Start Tour',
          action: () => tourRef.current?.next(),
          classes: 'shepherd-button-primary'
        }
      ]
    });

    // Step 2: Chat Interface
    tourRef.current.addStep({
      id: 'chat-interface',
      title: 'Chat Interface 💬',
      text: `
        <div class="space-y-3">
          <p>This is where you'll interact with Operator. Simply type your questions or requests here.</p>
          <p>Operator can help with:</p>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li>Web research and data analysis</li>
            <li>Code development and debugging</li>
            <li>Document creation and editing</li>
            <li>File management and automation</li>
          </ul>
        </div>
      `,
      attachTo: {
        element: '.chat-input-container, .thread-content, [data-testid="chat-input"]',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          action: () => tourRef.current?.back(),
          classes: 'shepherd-button-secondary'
        },
        {
          text: 'Next',
          action: () => tourRef.current?.next(),
          classes: 'shepherd-button-primary'
        }
      ]
    });

    // Step 3: Model Selection
    tourRef.current.addStep({
      id: 'model-selection',
      title: 'AI Model Selection 🤖',
      text: `
        <div class="space-y-3">
          <p>Choose your preferred AI model for different tasks:</p>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li><strong>Omni 4</strong> - Recommended for most tasks (Claude 4)</li>
            <li><strong>Omni 3.5</strong> - Faster responses (Claude 3.5)</li>
            <li><strong>Omni 5</strong> - Alternative Claude 4 access</li>
          </ul>
        </div>
      `,
      attachTo: {
        element: '.model-selector, [data-testid="model-selector"]',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          action: () => tourRef.current?.back(),
          classes: 'shepherd-button-secondary'
        },
        {
          text: 'Next',
          action: () => tourRef.current?.next(),
          classes: 'shepherd-button-primary'
        }
      ]
    });

    // Step 4: Sidebar Navigation
    tourRef.current.addStep({
      id: 'sidebar-navigation',
      title: 'Navigation & Tools 🧭',
      text: `
        <div class="space-y-3">
          <p>Use the sidebar to navigate between different features:</p>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li><strong>Dashboard</strong> - Overview of your projects and usage</li>
            <li><strong>Agents</strong> - Manage your AI agents</li>
            <li><strong>Projects</strong> - Organize your work</li>
            <li><strong>Settings</strong> - Configure your preferences</li>
          </ul>
        </div>
      `,
      attachTo: {
        element: '.sidebar, [data-testid="sidebar"]',
        on: 'right'
      },
      buttons: [
        {
          text: 'Previous',
          action: () => tourRef.current?.back(),
          classes: 'shepherd-button-secondary'
        },
        {
          text: 'Next',
          action: () => tourRef.current?.next(),
          classes: 'shepherd-button-primary'
        }
      ]
    });

    // Step 5: File Upload
    tourRef.current.addStep({
      id: 'file-upload',
      title: 'File Upload & Management 📁',
      text: `
        <div class="space-y-3">
          <p>Upload files for Operator to analyze or work with:</p>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li>Documents (PDF, Word, Excel)</li>
            <li>Images and videos</li>
            <li>Code files</li>
            <li>Data files (CSV, JSON)</li>
          </ul>
          <p>Operator can read, analyze, and modify these files for you.</p>
        </div>
      `,
      attachTo: {
        element: '.file-upload, [data-testid="file-upload"]',
        on: 'top'
      },
      buttons: [
        {
          text: 'Previous',
          action: () => tourRef.current?.back(),
          classes: 'shepherd-button-secondary'
        },
        {
          text: 'Next',
          action: () => tourRef.current?.next(),
          classes: 'shepherd-button-primary'
        }
      ]
    });

    // Step 6: Tool Results
    tourRef.current.addStep({
      id: 'tool-results',
      title: 'Tool Results & Outputs 🔧',
      text: `
        <div class="space-y-3">
          <p>When Operator uses tools, you'll see detailed results here:</p>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li>Web search results</li>
            <li>Code execution outputs</li>
            <li>File operations</li>
            <li>Data analysis results</li>
          </ul>
          <p>Click on any result to expand and see more details.</p>
        </div>
      `,
      attachTo: {
        element: '.tool-results, [data-testid="tool-results"]',
        on: 'top'
      },
      buttons: [
        {
          text: 'Previous',
          action: () => tourRef.current?.back(),
          classes: 'shepherd-button-secondary'
        },
        {
          text: 'Next',
          action: () => tourRef.current?.next(),
          classes: 'shepherd-button-primary'
        }
      ]
    });

    // Step 7: Thread Management
    tourRef.current.addStep({
      id: 'thread-management',
      title: 'Thread Management 📝',
      text: `
        <div class="space-y-3">
          <p>Organize your conversations into threads:</p>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li>Create new threads for different topics</li>
            <li>Switch between ongoing conversations</li>
            <li>Share threads with team members</li>
            <li>Archive completed threads</li>
          </ul>
        </div>
      `,
      attachTo: {
        element: '.thread-list, [data-testid="thread-list"]',
        on: 'right'
      },
      buttons: [
        {
          text: 'Previous',
          action: () => tourRef.current?.back(),
          classes: 'shepherd-button-secondary'
        },
        {
          text: 'Next',
          action: () => tourRef.current?.next(),
          classes: 'shepherd-button-primary'
        }
      ]
    });

    // Step 8: Settings & Personalization
    tourRef.current.addStep({
      id: 'settings',
      title: 'Settings & Personalization ⚙️',
      text: `
        <div class="space-y-3">
          <p>Customize your Operator experience:</p>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li>Update your profile and preferences</li>
            <li>Configure billing and usage limits</li>
            <li>Manage team members and permissions</li>
            <li>Set up integrations and API keys</li>
          </ul>
        </div>
      `,
      attachTo: {
        element: '.settings-menu, [data-testid="settings-menu"]',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          action: () => tourRef.current?.back(),
          classes: 'shepherd-button-secondary'
        },
        {
          text: 'Next',
          action: () => tourRef.current?.next(),
          classes: 'shepherd-button-primary'
        }
      ]
    });

    // Step 9: Final Step
    tourRef.current.addStep({
      id: 'completion',
      title: "You're All Set! 🎉",
      text: `
        <div class="space-y-3">
          <p>Congratulations! You're ready to start using Operator.</p>
          <p>Here are some tips to get started:</p>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li>Try asking Operator to research a topic</li>
            <li>Upload a document and ask questions about it</li>
            <li>Request help with coding or data analysis</li>
            <li>Explore the different AI models for various tasks</li>
          </ul>
          <p>You can always restart this tour from the help menu!</p>
        </div>
      `,
      buttons: [
        {
          text: 'Previous',
          action: () => tourRef.current?.back(),
          classes: 'shepherd-button-secondary'
        },
        {
          text: 'Get Started!',
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

    tourRef.current.start();
  };

  const handleTourButtonClick = () => {
    if (isTourActive) {
      tourRef.current?.complete();
    } else {
      startTour();
    }
  };

  return (
    <div className="tour-container">
      {/* Tour trigger button - only show if not first time */}
      {!isFirstTime && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleTourButtonClick}
          className="fixed bottom-4 right-4 z-50 shadow-lg"
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
      )}
    </div>
  );
} 