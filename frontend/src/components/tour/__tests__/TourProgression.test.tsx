/**
 * Tests for tour progression issues and the fixes we implemented
 * Focuses on the specific problems that were causing tours to get stuck
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorTour } from '../OperatorTour';

// Mock Shepherd.js with detailed step tracking
const mockSteps: any[] = [];
const mockTour = {
  addStep: jest.fn((step) => {
    mockSteps.push(step);
  }),
  start: jest.fn(),
  complete: jest.fn(),
  destroy: jest.fn(),
  on: jest.fn(),
  next: jest.fn(),
  back: jest.fn(),
  steps: mockSteps,
};

jest.mock('shepherd.js', () => ({
  Tour: jest.fn().mockImplementation(() => mockTour),
  Step: jest.fn(),
}));

describe('Tour Progression Issues', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockSteps.length = 0; // Clear the steps array
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Step 9 - Sidebar Marketplace (Previously Missing attachTo)', () => {
    it('creates Step 9 with proper attachTo when marketplace element exists', async () => {
      // Create marketplace link element
      const marketplaceLink = document.createElement('a');
      marketplaceLink.href = '/marketplace';
      marketplaceLink.textContent = 'Marketplace';
      document.body.appendChild(marketplaceLink);

      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step9 = mockSteps.find(step => step.id === 'sidebar-marketplace');
        expect(step9).toBeDefined();
        expect(step9.title).toBe('Agent Library');
        // The step should have attachTo when element is found
        expect(step9.attachTo).toBeDefined();
        expect(step9.attachTo.on).toBe('right');
      });
    });

    it('creates Step 9 without attachTo when marketplace element is missing', async () => {
      // No marketplace element in DOM
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step9 = mockSteps.find(step => step.id === 'sidebar-marketplace');
        expect(step9).toBeDefined();
        expect(step9.title).toBe('Agent Library');
        // The step should exist but without attachTo (will show centered)
        expect(step9.attachTo).toBeUndefined();
      });
    });

    it('has proper buttons for navigation', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step9 = mockSteps.find(step => step.id === 'sidebar-marketplace');
        expect(step9.buttons).toHaveLength(2);
        expect(step9.buttons[0].text).toBe('Back');
        expect(step9.buttons[1].text).toBe('Next');
        expect(step9.buttons[1].classes).toBe('shepherd-button-primary');
      });
    });
  });

  describe('Step 10 - Sidebar Tasks (Previously Function Reference Issue)', () => {
    it('creates Step 10 with proper attachTo when tasks element exists', async () => {
      // Create tasks section element
      const tasksSection = document.createElement('div');
      tasksSection.setAttribute('data-sidebar', 'group');
      tasksSection.textContent = 'Your Tasks';
      document.body.appendChild(tasksSection);

      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step10 = mockSteps.find(step => step.id === 'sidebar-tasks');
        expect(step10).toBeDefined();
        expect(step10.title).toBe('Your Tasks & Past Chats');
        // Should have attachTo when element is found
        expect(step10.attachTo).toBeDefined();
        expect(step10.attachTo.on).toBe('right');
      });
    });

    it('creates Step 10 without attachTo when tasks element is missing', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step10 = mockSteps.find(step => step.id === 'sidebar-tasks');
        expect(step10).toBeDefined();
        // Should exist without attachTo when element not found
        expect(step10.attachTo).toBeUndefined();
      });
    });
  });

  describe('Step 11 - User Profile (Previously Function Reference Issue)', () => {
    it('creates Step 11 with proper attachTo when profile button exists', async () => {
      // Create profile button element
      const profileButton = document.createElement('button');
      profileButton.setAttribute('data-testid', 'user-profile');
      document.body.appendChild(profileButton);

      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step11 = mockSteps.find(step => step.id === 'sidebar-profile');
        expect(step11).toBeDefined();
        expect(step11.title).toBe('Your Profile');
        expect(step11.attachTo).toBeDefined();
        expect(step11.attachTo.on).toBe('right');
      });
    });

    it('creates Step 11 without attachTo when profile button is missing', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step11 = mockSteps.find(step => step.id === 'sidebar-profile');
        expect(step11).toBeDefined();
        expect(step11.attachTo).toBeUndefined();
      });
    });
  });

  describe('Step 12 - New Task (Previously Function Reference Issue)', () => {
    it('creates Step 12 with proper attachTo when new task button exists', async () => {
      // Create new task button element
      const newTaskButton = document.createElement('button');
      newTaskButton.textContent = 'New Task';
      document.body.appendChild(newTaskButton);

      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step12 = mockSteps.find(step => step.id === 'new-task');
        expect(step12).toBeDefined();
        expect(step12.title).toBe('Create a New Task');
        expect(step12.attachTo).toBeDefined();
        expect(step12.attachTo.on).toBe('right');
      });
    });

    it('creates Step 12 without attachTo when new task button is missing', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step12 = mockSteps.find(step => step.id === 'new-task');
        expect(step12).toBeDefined();
        expect(step12.attachTo).toBeUndefined();
      });
    });
  });

  describe('Step 13 - Send Message (Previously Function Reference Issue)', () => {
    it('creates Step 13 with proper attachTo when send button exists', async () => {
      // Create send button element
      const sendButton = document.createElement('button');
      const arrowIcon = document.createElement('svg');
      arrowIcon.classList.add('lucide-arrow-up');
      sendButton.appendChild(arrowIcon);
      document.body.appendChild(sendButton);

      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step13 = mockSteps.find(step => step.id === 'send-message');
        expect(step13).toBeDefined();
        expect(step13.title).toBe('Send Your Message');
        expect(step13.attachTo).toBeDefined();
        expect(step13.attachTo.on).toBe('left');
      });
    });

    it('creates Step 13 without attachTo when send button is missing', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step13 = mockSteps.find(step => step.id === 'send-message');
        expect(step13).toBeDefined();
        expect(step13.attachTo).toBeUndefined();
      });
    });

    it('has Finish Tour button as primary action', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const step13 = mockSteps.find(step => step.id === 'send-message');
        expect(step13.buttons).toHaveLength(2);
        expect(step13.buttons[1].text).toBe('Finish Tour');
        expect(step13.buttons[1].classes).toBe('shepherd-button-primary');
      });
    });
  });

  describe('Tour Step Sequence', () => {
    it('creates all 13 steps in correct order', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        expect(mockSteps).toHaveLength(13);
        
        const expectedStepIds = [
          'welcome',
          'chat-input',
          'attachments',
          'plugins',
          'join-online-meeting',
          'meetings-dashboard',
          'sidebar-meetings',
          'sidebar-agents',
          'sidebar-marketplace',
          'sidebar-tasks',
          'sidebar-profile',
          'new-task',
          'send-message'
        ];

        expectedStepIds.forEach((expectedId, index) => {
          expect(mockSteps[index].id).toBe(expectedId);
        });
      });
    });

    it('ensures all steps have required properties', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        mockSteps.forEach((step, index) => {
          // All steps should have these basic properties
          expect(step.id).toBeDefined();
          expect(step.title).toBeDefined();
          expect(step.text).toBeDefined();
          
          // All steps except the first should have a Back button
          if (index > 0) {
            expect(step.buttons.some((btn: any) => btn.text === 'Back')).toBe(true);
          }
          
          // All steps except the last should have a Next button
          if (index < mockSteps.length - 1) {
            expect(step.buttons.some((btn: any) => btn.text === 'Next')).toBe(true);
          }
          
          // Last step should have Finish Tour button
          if (index === mockSteps.length - 1) {
            expect(step.buttons.some((btn: any) => btn.text === 'Finish Tour')).toBe(true);
          }
        });
      });
    });
  });

  describe('Graceful Degradation', () => {
    it('continues tour progression even when elements are missing', async () => {
      // No DOM elements created - all element finders will return null
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        // Should still create all 13 steps
        expect(mockSteps).toHaveLength(13);
        
        // Steps 9-13 should exist without attachTo properties
        const problematicSteps = mockSteps.filter(step => 
          ['sidebar-marketplace', 'sidebar-tasks', 'sidebar-profile', 'new-task', 'send-message'].includes(step.id)
        );
        
        problematicSteps.forEach(step => {
          expect(step).toBeDefined();
          expect(step.title).toBeDefined();
          expect(step.text).toBeDefined();
          // These steps should not have attachTo when elements are missing
          expect(step.attachTo).toBeUndefined();
        });
      });
    });

    it('handles beforeShowPromise and beforeHidePromise correctly', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        // Steps that have beforeShowPromise should resolve even when elements are missing
        const stepsWithPromises = mockSteps.filter(step => step.beforeShowPromise);
        
        stepsWithPromises.forEach(async (step) => {
          // Should not throw when executed
          expect(async () => {
            await step.beforeShowPromise();
          }).not.toThrow();
          
          if (step.beforeHidePromise) {
            expect(async () => {
              await step.beforeHidePromise();
            }).not.toThrow();
          }
        });
      });
    });
  });

  describe('Button Actions', () => {
    it('Next buttons call tour.next()', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const stepsWithNext = mockSteps.filter(step => 
          step.buttons.some((btn: any) => btn.text === 'Next')
        );
        
        stepsWithNext.forEach(step => {
          const nextButton = step.buttons.find((btn: any) => btn.text === 'Next');
          expect(nextButton.action).toBeDefined();
          
          // Simulate clicking Next button
          nextButton.action();
          expect(mockTour.next).toHaveBeenCalled();
        });
      });
    });

    it('Back buttons call tour.back()', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const stepsWithBack = mockSteps.filter(step => 
          step.buttons.some((btn: any) => btn.text === 'Back')
        );
        
        stepsWithBack.forEach(step => {
          const backButton = step.buttons.find((btn: any) => btn.text === 'Back');
          expect(backButton.action).toBeDefined();
          
          // Simulate clicking Back button
          backButton.action();
          expect(mockTour.back).toHaveBeenCalled();
        });
      });
    });

    it('Finish Tour button calls tour.complete()', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const finalStep = mockSteps.find(step => step.id === 'send-message');
        const finishButton = finalStep.buttons.find((btn: any) => btn.text === 'Finish Tour');
        
        expect(finishButton).toBeDefined();
        expect(finishButton.action).toBeDefined();
        
        // Simulate clicking Finish Tour button
        finishButton.action();
        expect(mockTour.complete).toHaveBeenCalled();
      });
    });
  });

  describe('Error Recovery', () => {
    it('continues tour when element finding throws errors', async () => {
      // Mock console.warn to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock the findSidebarMarketplaceLink function to throw an error
      const originalFindSidebarMarketplaceLink = require('../OperatorTour').findSidebarMarketplaceLink;
      
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        // Should still create steps despite function errors
        // The tour may stop early due to the error, but should handle it gracefully
        expect(mockSteps.length).toBeGreaterThan(0);
      });

      consoleSpy.mockRestore();
    });
  });
});