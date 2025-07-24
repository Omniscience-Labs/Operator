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
            <p><strong>Tip:</strong> Let me show you what I can do!</p>
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

      // Step 2: Service Contract Example
      tourRef.current.addStep({
        id: 'service-contract',
        title: 'Start with a Service Contract',
        text: `
          <div class="space-y-3">
            <p>This is just a service contract — and we're starting with the header file. From here, the agent knows exactly what to do.</p>
            <p>It looks through your manuals, your material cost tables, and starts parsing relevant info.</p>
          </div>
        `,
        attachTo: {
          element: 'input[placeholder*="Describe what you need"], textarea, .chat-input',
          on: 'bottom-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 3: Context Awareness
      tourRef.current.addStep({
        id: 'context-awareness',
        title: 'Context Awareness',
        text: `
          <div class="space-y-3">
            <p>The system is smart. It knows what to look for — whether it's pricing data, technical references, or your previous project documents.</p>
            <p>You don't need to manually point it to every file.</p>
          </div>
        `,
        attachTo: {
          element: '.paperclip-icon, [data-attachment], .attachment-button',
          on: 'bottom-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 4: Style Matching
      tourRef.current.addStep({
        id: 'style-matching',
        title: 'Style Matching',
        text: `
          <div class="space-y-3">
            <p>We've trained the agent on real past contracts — hundreds or even thousands written by someone like Tim.</p>
            <p>So, it doesn't just fill in data. It writes like you, with quotations and phrasing that feel human and familiar.</p>
          </div>
        `,
        attachTo: {
          element: '.quick-starts, .examples, .suggestions',
          on: 'top-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 5: Easy Agent Setup
      tourRef.current.addStep({
        id: 'agent-setup',
        title: 'Easy Agent Setup',
        text: `
          <div class="space-y-3">
            <p>Setting up the agent is simple. You just give us one document — like a typical service contract — and we configure it to handle any document type you need.</p>
            <p>Whether that's a quotation, an invoice, or a full report.</p>
          </div>
        `,
        attachTo: {
          element: '.agent-selector, [data-agent-selector], .agent-dropdown',
          on: 'bottom-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 6: Recurring Workflows
      tourRef.current.addStep({
        id: 'recurring-workflows',
        title: 'Built for Recurring Workflows',
        text: `
          <div class="space-y-3">
            <p>If you're doing 4–5 quotes a day, or repeating similar tasks often, this changes the game.</p>
            <p>It speeds up the repetitive work, keeps everything consistent, and reduces back-and-forth.</p>
          </div>
        `,
        attachTo: {
          element: '.quick-starts, .examples, .suggestions',
          on: 'top-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 7: Approval-Driven Automation
      tourRef.current.addStep({
        id: 'approval-automation',
        title: 'Approval-Driven Automation',
        text: `
          <div class="space-y-3">
            <p>Once you're happy, just say 'I approve.' That's the signal.</p>
            <p>The agent then auto-generates the final Word and Excel documents — complete with letterhead, structure, and all the right sections.</p>
          </div>
        `,
        attachTo: {
          element: 'button[type="submit"], .submit-button, .send-button',
          on: 'top-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 8: Formatted Output
      tourRef.current.addStep({
        id: 'formatted-output',
        title: 'Fully Formatted Output',
        text: `
          <div class="space-y-3">
            <p>The Word doc includes your branding, your structure, and your tone — just like the references it learned from.</p>
          </div>
        `,
        attachTo: {
          element: '.file-export, .download-button, .export-options',
          on: 'bottom-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 9: Real-Time Collaboration
      tourRef.current.addStep({
        id: 'real-time-collaboration',
        title: 'Real-Time Agent Collaboration',
        text: `
          <div class="space-y-3">
            <p>You can chat with the agent, ask it to change details, fix numbers, update scope — and once it looks good, just approve.</p>
            <p>That's it. The agent handles the rest.</p>
          </div>
        `,
        attachTo: {
          element: '.chat-messages, .message-thread, .conversation',
          on: 'top-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 10: Multi-Format Export
      tourRef.current.addStep({
        id: 'multi-format-export',
        title: 'Multi-Format Export',
        text: `
          <div class="space-y-3">
            <p>Once approved, you instantly get a Word document and an Excel sheet.</p>
            <p>One's ready to send. The other breaks everything down.</p>
          </div>
        `,
        attachTo: {
          element: '.file-export, .download-button, .export-options',
          on: 'bottom-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 11: Excel Breakdown
      tourRef.current.addStep({
        id: 'excel-breakdown',
        title: 'Excel: Material + Labor Breakdown',
        text: `
          <div class="space-y-3">
            <p>The Excel file auto-generates all your key numbers: materials, labor, project summary — no manual spreadsheeting needed.</p>
          </div>
        `,
        attachTo: {
          element: '.file-export, .download-button, .export-options',
          on: 'bottom-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 12: Beyond Contracts
      tourRef.current.addStep({
        id: 'beyond-contracts',
        title: 'Explore Beyond Contracts',
        text: `
          <div class="space-y-3">
            <p>We've also experimented with other types of agents. Want to scrape the web for a summary on someone?</p>
            <p>Type in a name — the agent builds a full profile.</p>
          </div>
        `,
        attachTo: {
          element: 'input[placeholder*="Describe what you need"], textarea, .chat-input',
          on: 'bottom-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 13: Web Scraping
      tourRef.current.addStep({
        id: 'web-scraping',
        title: 'Name-Based Web Scraping',
        text: `
          <div class="space-y-3">
            <p>For example, when we typed in Sundaram, it pulled their full internet presence — professional background, LinkedIn data, roles, affiliations.</p>
            <p>Instant report.</p>
          </div>
        `,
        attachTo: {
          element: '.web-search, .browser-tool, .search-results',
          on: 'top-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 14: Web Reports
      tourRef.current.addStep({
        id: 'web-reports',
        title: 'Web-Published Reports',
        text: `
          <div class="space-y-3">
            <p>One experiment created a live hosted website — including HTML, CSS, and content — just from a company name.</p>
            <p>Fully deployable. Fully AI-written.</p>
          </div>
        `,
        attachTo: {
          element: '.web-search, .browser-tool, .search-results',
          on: 'top-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 15: Company Overviews
      tourRef.current.addStep({
        id: 'company-overviews',
        title: 'Auto-Generated Company Overviews',
        text: `
          <div class="space-y-3">
            <p>Here's what that webpage included: employee count, years in business, headquarters, founder name, even estimated revenue — all auto-scraped from the web.</p>
          </div>
        `,
        attachTo: {
          element: '.web-search, .browser-tool, .search-results',
          on: 'top-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 16: Market Intelligence
      tourRef.current.addStep({
        id: 'market-intelligence',
        title: 'Market Intelligence (Bonus!)',
        text: `
          <div class="space-y-3">
            <p>It didn't stop there. It added local construction data, market insights for the region, and even comparative charts — showing how your company stacks up.</p>
          </div>
        `,
        attachTo: {
          element: '.data-analysis, .charts, .analytics',
          on: 'top-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 17: Competitor Mapping
      tourRef.current.addStep({
        id: 'competitor-mapping',
        title: 'Competitor Mapping',
        text: `
          <div class="space-y-3">
            <p>The AI mapped competitors using public data — like Commonwealth Electric or Gaylor Electric — and visualized them side by side.</p>
          </div>
        `,
        attachTo: {
          element: '.data-analysis, .charts, .analytics',
          on: 'top-start'
        },
        buttons: [
          {
            text: 'Back',
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

      // Step 18: Download & Share
      tourRef.current.addStep({
        id: 'download-share',
        title: 'Download + Share',
        text: `
          <div class="space-y-3">
            <p>All your outputs — Word, Excel, web reports — are saved in the workspace. Download anytime.</p>
            <p>Or share your chat history! Generate a public link to show others what your agent built.</p>
          </div>
        `,
        attachTo: {
          element: '.share-button, .export-options, .download-options',
          on: 'bottom-start'
        },
        buttons: [
          {
            text: 'Back',
            action: () => tourRef.current?.back(),
            classes: 'shepherd-button-secondary'
          },
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
      tourRef: tourRef.current
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