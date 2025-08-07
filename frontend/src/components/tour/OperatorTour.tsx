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
        // Don't call complete() here as it would trigger the 'complete' event again
        // Just clean up the tour instance and references
        tourRef.current.destroy?.();
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
    console.log('Searching for Meetings Dashboard button...');
    
    // Most reliable - direct href selector
    let element = document.querySelector('a[href="/meetings"]');
    if (element) {
      console.log('Found meetings dashboard by href:', element);
      return element;
    }
    
    // Find by FileAudio icon (meetings use FileAudio icon)
    const fileAudioIcons = document.querySelectorAll('.lucide-file-audio, svg[data-lucide="file-audio"]');
    for (const icon of fileAudioIcons) {
      const link = icon.closest('a');
      if (link && link.getAttribute('href') === '/meetings') {
        console.log('Found meetings dashboard by FileAudio icon:', link);
        return link;
      }
    }
    
    // Search by text content in sidebar context
    const links = document.querySelectorAll('a');
    for (const link of links) {
      const text = link.textContent?.toLowerCase() || '';
      const href = link.getAttribute('href') || '';
      if (text.includes('meetings') && href.includes('/meetings')) {
        console.log('Found meetings dashboard by text and href:', link);
        return link;
      }
    }
    
    console.log('No meetings dashboard button found');
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
      if (button.getAttribute('type') === 'submit') {
        console.log('Found submit button:', button);
        return button;
      }
      
      // Look for buttons in chat input area that might be send buttons
      const isInChatInput = button.closest('[data-testid="chat-input"], .chat-input, form');
      if (isInChatInput && (hasArrowUp || button.getAttribute('type') === 'submit')) {
        console.log('Found send button in chat input:', button);
        return button;
      }
    }
    
    console.log('No Send button found');
    return null;
  };

    const findSidebarMeetingsLink = () => {
    console.log('🔍 Searching for Sidebar Meetings link...');
    
    // Enhanced search with multiple strategies and better timing
    const searchStrategies = [
      // Strategy 1: Direct href selector (most reliable)
      () => document.querySelector('a[href="/meetings"]'),
      
      // Strategy 2: FileAudio icon with meetings href
      () => {
        const fileAudioIcons = document.querySelectorAll('.lucide-file-audio, svg[data-lucide="file-audio"], [data-testid="meetings-icon"]');
        for (const icon of fileAudioIcons) {
          const link = icon.closest('a');
          if (link && (link.getAttribute('href') === '/meetings' || link.href?.endsWith('/meetings'))) {
            return link;
          }
        }
        return null;
      },
      
      // Strategy 3: Sidebar navigation context with meetings text
      () => {
        const sidebarNavs = document.querySelectorAll('nav, [role="navigation"], .sidebar, [data-sidebar]');
        for (const nav of sidebarNavs) {
          const links = nav.querySelectorAll('a');
          for (const link of links) {
            const text = link.textContent?.toLowerCase() || '';
            const href = link.getAttribute('href') || '';
            if (text.includes('meetings') && (href.includes('/meetings') || href === '/meetings')) {
              return link;
            }
          }
        }
        return null;
      },
      
      // Strategy 4: Any link with meetings text and proper href
      () => {
        const links = document.querySelectorAll('a[href*="/meetings"], a[href="/meetings"]');
        for (const link of links) {
          const text = link.textContent?.toLowerCase() || '';
          if (text.includes('meetings') || link.querySelector('.lucide-file-audio')) {
            return link;
          }
        }
        return null;
      },
      
      // Strategy 5: Fallback - any meetings link
      () => {
        return document.querySelector('a[href="/meetings"], a[href*="/meetings"]');
      }
    ];
    
    // Try each strategy
    for (let i = 0; i < searchStrategies.length; i++) {
      try {
        const element = searchStrategies[i]();
        if (element instanceof HTMLElement && element.offsetParent !== null) { // Check if element is visible
          console.log(`✅ Found meetings link using strategy ${i + 1}:`, element);
          return element;
        }
      } catch (error) {
        console.warn(`⚠️ Strategy ${i + 1} failed:`, error);
      }
    }
    
    console.log('❌ No sidebar meetings link found after trying all strategies');
    return null;
  };

  const findSidebarAgentsLink = () => {
    console.log('Searching for Sidebar Agents link...');
    
    const selectors = [
      'a[href="/agents"]',
      'a[href*="agents"]',
      '[data-testid="agents-nav"]'
    ];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
      if (element) {
        console.log('Found sidebar agents link:', element);
            return element;
          }
    }
    
    // Find by Bot icon (agents use Bot icon)
    const botIcons = document.querySelectorAll('.lucide-bot, svg[data-lucide="bot"]');
    for (const icon of botIcons) {
      const link = icon.closest('a');
      if (link && link.getAttribute('href') === '/agents') {
        console.log('Found agents link by Bot icon:', link);
        return link;
      }
    }
    
    // Search by text content
    const links = document.querySelectorAll('a');
    for (const link of links) {
      const text = link.textContent?.toLowerCase() || '';
      const href = link.getAttribute('href') || '';
      if ((text.includes('agents') || text.includes('team agents')) && href.includes('/agents')) {
        console.log('Found agents link by text and href:', link);
        return link;
      }
    }
    
    console.log('No sidebar agents link found');
    return null;
  };

  const findSidebarMarketplaceLink = () => {
    console.log('Searching for Sidebar Marketplace/Agent Library link...');
    
    const selectors = [
      'a[href="/marketplace"]',
      'a[href*="marketplace"]',
      '[data-testid="marketplace-nav"]'
    ];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
        console.log('Found sidebar marketplace link:', element);
            return element;
          }
    }
    
    // Find by Store icon (marketplace uses Store icon)
    const storeIcons = document.querySelectorAll('.lucide-store, svg[data-lucide="store"]');
    for (const icon of storeIcons) {
      const link = icon.closest('a');
      if (link && link.getAttribute('href') === '/marketplace') {
        console.log('Found marketplace link by Store icon:', link);
        return link;
      }
    }
    
    // Search by text content
    const links = document.querySelectorAll('a');
    for (const link of links) {
      const text = link.textContent?.toLowerCase() || '';
      const href = link.getAttribute('href') || '';
      if ((text.includes('marketplace') || text.includes('library')) && href.includes('/marketplace')) {
        console.log('Found marketplace link by text and href:', link);
        return link;
      }
    }
    
    console.log('No sidebar marketplace link found');
    return null;
  };

  const findSidebarTasksSection = () => {
    console.log('Searching for Sidebar Tasks/Past Chats section...');
    
    // Look for the NavAgents component or any tasks-related section
    const selectors = [
      '[data-testid="sidebar-tasks"]',
      '.sidebar-tasks',
      // Look for SidebarGroupLabel
      '[class*="SidebarGroupLabel"]',
      // Look for any group that contains tasks or chats
      '[data-sidebar="group"]'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent?.toLowerCase() || '';
        if (text.includes('tasks') || text.includes('chats') || text.includes('past')) {
          console.log('Found tasks section by group text:', element);
            return element;
          }
        }
    }
    
    // Look for any section with MessagesSquare icons (chat icons)
    const chatIcons = document.querySelectorAll('.lucide-messages-square, svg[data-lucide="messages-square"]');
    if (chatIcons.length > 0) {
      const firstChatIcon = chatIcons[0];
      const section = firstChatIcon.closest('[data-sidebar="group"], .sidebar-group, [class*="SidebarGroup"]');
      if (section) {
        console.log('Found tasks section by chat icons:', section);
        return section;
      }
    }
    
    // Fallback - look for any element containing "New Task" since that's in the NavAgents
    const newTaskElements = document.querySelectorAll('*');
    for (const element of newTaskElements) {
      if (element.textContent?.includes('New Task')) {
        const section = element.closest('[data-sidebar="group"], .sidebar-group, [class*="SidebarGroup"]');
        if (section) {
          console.log('Found tasks section by New Task button:', section);
          return section;
        }
      }
    }
    
    console.log('No sidebar tasks section found');
    return null;
  };

  const findUserProfileButton = () => {
    console.log('Searching for User Profile button...');
    
    const selectors = [
      '[data-testid="user-profile"]',
      '[data-testid="user-menu"]',
      'button[aria-label*="profile"]',
      'button[aria-label*="account"]',
      'button[aria-label*="user"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('Found user profile button:', element);
        return element;
      }
    }
    
    // Look for Avatar components in sidebar footer area
    const avatars = document.querySelectorAll('[class*="avatar"], img[alt*="profile"], img[alt*="user"]');
    for (const avatar of avatars) {
      const button = avatar.closest('button');
      const isInSidebar = avatar.closest('.sidebar, nav, [data-sidebar]');
      if (button && isInSidebar) {
        console.log('Found user profile button by avatar:', button);
        return button;
      }
    }
    
    // Look for buttons in sidebar with user-related content
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      const isInSidebar = button.closest('.sidebar, nav, [data-sidebar]');
      const hasUserIcon = button.querySelector('.lucide-user, .lucide-avatar, svg[data-lucide="user"]');
      const isInFooter = button.closest('[data-sidebar="footer"], .sidebar-footer, [class*="SidebarFooter"]');
      if (isInSidebar && (hasUserIcon || isInFooter)) {
        console.log('Found user profile button by icon or footer:', button);
        return button;
      }
    }
    
    console.log('No user profile button found');
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
      const meetingsDashboardStep: any = {
        id: 'meetings-dashboard',
        title: 'See All Meetings',
        text: `
          <div class="space-y-3">
            <p>This is where you can access all your meetings!</p>
            <p>Click on the Meetings link anytime to view, manage, and review your meeting recordings and transcripts.</p>
          </div>
        `,
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [20, 0],
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            // Wait for sidebar animations to complete (up to 0.6s + buffer)
            setTimeout(() => {
              const element = findMeetingsDashboardButton();
              console.log('Step 6 - Meetings dashboard button found:', element);
              if (element) {
                addHighlight(element);
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest' 
                });
              } else {
                console.warn('Step 6 - Meetings dashboard button not found, continuing anyway');
              }
              resolve();
            }, 800);
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
            action: () => tourRef.current?.back(),
            classes: 'shepherd-button-secondary'
          },
          {
            text: 'Next',
            action: () => {
              console.log('Step 6 Next button clicked, proceeding to step 7');
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      };

      // Add attachTo only if element is found
      const meetingsDashboardElement = findMeetingsDashboardButton();
      if (meetingsDashboardElement) {
        meetingsDashboardStep.attachTo = {
          element: meetingsDashboardElement,
          on: 'right'
        };
      }

      tourRef.current.addStep(meetingsDashboardStep);

      // Step 7: Sidebar Meetings Link
      const sidebarMeetingsStep: any = {
        id: 'sidebar-meetings',
        title: '🎙️ Meetings Hub',
        text: `
          <div class="space-y-4">
            <p><strong>Your Meeting Command Center!</strong></p>
            <p>This is where you can:</p>
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li>📝 View all your meeting recordings and transcripts</li>
              <li>🔍 Search through past meeting content</li>
              <li>📊 Review meeting analytics and insights</li>
              <li>🎯 Access AI-generated meeting summaries</li>
            </ul>
            <div class="bg-blue-50 border-l-4 border-blue-400 p-3 mt-3">
              <p class="text-sm"><strong>💡 Pro Tip:</strong> You can quickly search for specific topics discussed across all your meetings using the search feature!</p>
            </div>
          </div>
        `,
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [25, 10],
              },
            },
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 16,
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            // Enhanced timing with multiple attempts
            let attempts = 0;
            const maxAttempts = 5;
            
            const tryFindElement = () => {
              attempts++;
              const element = findSidebarMeetingsLink();
              console.log(`🔍 Step 7 - Attempt ${attempts} - Sidebar meetings element:`, element);
              
              if (element && element.offsetParent !== null) {
                // Element found and visible
                addHighlight(element);
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest' 
                });
                console.log('✅ Step 7 - Successfully found and highlighted meetings link');
                resolve();
              } else if (attempts < maxAttempts) {
                // Try again after a short delay
                setTimeout(tryFindElement, 300);
              } else {
                // Max attempts reached, continue anyway
                console.warn('⚠️ Step 7 - Meetings element not found after all attempts, continuing tour');
                resolve();
              }
            };
            
            // Start searching after initial delay for animations
            setTimeout(tryFindElement, 600);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = findSidebarMeetingsLink();
            if (element) {
              removeHighlight(element);
              console.log('✅ Step 7 - Removed highlight from meetings link');
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
            text: 'Got it! 👍',
            action: () => tourRef.current?.next(),
            classes: 'shepherd-button-primary'
          }
        ]
      };

      // Add attachTo only if element is found, otherwise show in center
      const meetingsElement = findSidebarMeetingsLink();
      if (meetingsElement) {
        sidebarMeetingsStep.attachTo = {
          element: meetingsElement,
          on: 'right'
        };
      }

      tourRef.current.addStep(sidebarMeetingsStep);

      // Step 8: Sidebar Agents Link  
      const sidebarAgentsStep: any = {
        id: 'sidebar-agents',
        title: 'Your Agents',
        text: `
          <div class="space-y-3">
            <p>This is where you can create and manage your custom AI agents!</p>
            <p>Build specialized agents with specific instructions, tools, and capabilities tailored to your needs.</p>
          </div>
        `,
        popperOptions: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [20, 0],
              },
            },
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            // Wait for sidebar animations to complete (up to 0.6s + buffer)
            setTimeout(() => {
              const element = findSidebarAgentsLink();
              console.log('Step 8 - Sidebar agents element:', element);
              if (element) {
                addHighlight(element);
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest' 
                });
              } else {
                console.warn('Step 8 - Sidebar agents element not found, continuing anyway');
              }
              resolve();
            }, 800);
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
              console.log('Step 8 Next button clicked, proceeding to step 9');
              tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      };

      // Add attachTo only if element is found
      const agentsElement = findSidebarAgentsLink();
      if (agentsElement) {
        sidebarAgentsStep.attachTo = {
          element: agentsElement,
          on: 'right'
        };
      }

      tourRef.current.addStep(sidebarAgentsStep);

      // Step 9: Sidebar Marketplace/Agent Library
      tourRef.current.addStep({
        id: 'sidebar-marketplace',
        title: 'Agent Library',
        text: `
          <div class="space-y-3">
            <p>Discover amazing agents created by the community in the Marketplace!</p>
            <p>Browse, try, and add pre-built agents to your library to expand your capabilities instantly.</p>
          </div>
        `,
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
              setTimeout(() => {
              const element = findSidebarMarketplaceLink();
              console.log('Step 9 - Sidebar marketplace element:', element);
              if (element) {
                addHighlight(element);
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest' 
                });
              } else {
                console.warn('Step 9 - Sidebar marketplace element not found, continuing anyway');
              }
              resolve();
            }, 800);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = findSidebarMarketplaceLink();
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
              console.log('Step 9 Next button clicked, proceeding to step 10');
                tourRef.current?.next();
            },
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 10: Sidebar Tasks/Past Chats
      tourRef.current.addStep({
        id: 'sidebar-tasks',
        title: 'Your Tasks & Past Chats',
        text: `
          <div class="space-y-3">
            <p>All your conversations and tasks are organized here!</p>
            <p>Easily access your chat history, continue previous conversations, and manage your ongoing projects.</p>
          </div>
        `,
        attachTo: {
          element: findSidebarTasksSection,
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
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            // Wait for sidebar animations to complete (up to 0.6s + buffer)
            setTimeout(() => {
              const element = findSidebarTasksSection();
              console.log('Step 10 - Sidebar tasks section element:', element);
              if (element) {
                addHighlight(element);
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest' 
                });
      } else {
                console.warn('Step 10 - Sidebar tasks section element not found, continuing anyway');
              }
              resolve();
            }, 800);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = findSidebarTasksSection();
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
            action: () => tourRef.current?.next(),
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 11: User Profile
      tourRef.current.addStep({
        id: 'sidebar-profile',
        title: 'Your Profile',
        text: `
          <div class="space-y-3">
            <p>Access your profile settings, account management, and preferences here!</p>
            <p>Manage your account, billing, team settings, and customize your Operator experience.</p>
          </div>
        `,
        attachTo: {
          element: findUserProfileButton,
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
          ],
        },
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            // Wait for sidebar animations to complete (up to 0.6s + buffer)
            setTimeout(() => {
              const element = findUserProfileButton();
              console.log('Step 11 - User profile button element:', element);
              if (element) {
                addHighlight(element);
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest' 
                });
              } else {
                console.warn('Step 11 - User profile button element not found, continuing anyway');
              }
              resolve();
            }, 800);
          });
        },
        beforeHidePromise: () => {
          return new Promise<void>((resolve) => {
            const element = findUserProfileButton();
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
            action: () => tourRef.current?.next(),
            classes: 'shepherd-button-primary'
          }
        ]
      });

      // Step 12: New Task Button
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

      // Step 13: Send Message
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
        console.log('Tour completed successfully');
        cleanup();
        onComplete?.();
      });

      tourRef.current.on('cancel', () => {
        console.log('Tour cancelled');
        cleanup();
        onComplete?.();
      });

      tourRef.current.on('show', (event) => {
        console.log('Tour step shown:', event.step?.id);
      });

      tourRef.current.on('hide', (event) => {
        console.log('Tour step hidden:', event.step?.id);
      });

      // Debug: Log tour steps
      console.log('Total tour steps created:', tourRef.current.steps.length);
      tourRef.current.steps.forEach((step, index) => {
        console.log(`Step ${index + 1}:`, step.id);
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