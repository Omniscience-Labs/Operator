import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentsPageTour } from '../AgentsPageTour';

// Mock Shepherd.js
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

describe('AgentsPageTour', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockSteps.length = 0;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Component Rendering', () => {
    it('renders tour button for manual tour starts', () => {
      render(<AgentsPageTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      expect(tourButton).toBeInTheDocument();
      expect(tourButton).toHaveTextContent('Agents Tour');
    });

    it('auto-starts tour for first-time users', async () => {
      render(<AgentsPageTour isFirstTime={true} />);
      
      await waitFor(() => {
        expect(mockTour.start).toHaveBeenCalled();
      });
    });
  });

  describe('Tour Steps - No Agents Scenario', () => {
    it('creates basic steps when no agents exist', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={false} />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        // Should have basic steps: welcome, sidebar-agents, new-agent-button, what-you-can-do
        expect(mockSteps.length).toBeGreaterThanOrEqual(4);
        
        const stepIds = mockSteps.map(step => step.id);
        expect(stepIds).toContain('welcome-agents');
        expect(stepIds).toContain('sidebar-agents');
        expect(stepIds).toContain('new-agent-button');
        expect(stepIds).toContain('what-you-can-do');
      });
    });

    it('includes Loom video in welcome step', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={false} />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const welcomeStep = mockSteps.find(step => step.id === 'welcome-agents');
        expect(welcomeStep.text).toContain('iframe');
        expect(welcomeStep.text).toContain('loom.com/embed');
      });
    });

    it('shows what-you-can-do step when no agents', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={false} />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const whatYouCanDoStep = mockSteps.find(step => step.id === 'what-you-can-do');
        expect(whatYouCanDoStep).toBeDefined();
        expect(whatYouCanDoStep.title).toBe('What You Can Do With Agents');
        expect(whatYouCanDoStep.text).toContain('Chat');
        expect(whatYouCanDoStep.text).toContain('Edit');
        expect(whatYouCanDoStep.text).toContain('Publish');
        expect(whatYouCanDoStep.text).toContain('Share');
        expect(whatYouCanDoStep.text).toContain('Delete');
      });
    });
  });

  describe('Tour Steps - With Agents Scenario', () => {
    beforeEach(() => {
      // Create mock agent elements
      const agentCard = document.createElement('div');
      agentCard.setAttribute('data-agent-id', 'test-agent-1');
      
      const chatButton = document.createElement('button');
      const chatIcon = document.createElement('svg');
      chatIcon.classList.add('lucide-message-circle');
      chatButton.appendChild(chatIcon);
      
      const editButton = document.createElement('button');
      const editIcon = document.createElement('svg');
      editIcon.classList.add('lucide-wrench');
      editButton.appendChild(editIcon);
      
      const publishButton = document.createElement('button');
      const publishIcon = document.createElement('svg');
      publishIcon.classList.add('lucide-globe');
      publishButton.appendChild(publishIcon);
      
      const shareButton = document.createElement('button');
      const shareIcon = document.createElement('svg');
      shareIcon.classList.add('lucide-share-2');
      shareButton.appendChild(shareIcon);
      
      const deleteButton = document.createElement('button');
      const deleteIcon = document.createElement('svg');
      deleteIcon.classList.add('lucide-trash-2');
      deleteButton.appendChild(deleteIcon);
      
      agentCard.appendChild(chatButton);
      agentCard.appendChild(editButton);
      agentCard.appendChild(publishButton);
      agentCard.appendChild(shareButton);
      agentCard.appendChild(deleteButton);
      
      document.body.appendChild(agentCard);
    });

    it('creates extended steps when agents exist', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={true} firstAgentId="test-agent-1" />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        // Should have all 9 steps when agents exist
        expect(mockSteps.length).toBe(9);
        
        const expectedSteps = [
          'welcome-agents',
          'sidebar-agents',
          'new-agent-button',
          'agent-card-overview',
          'chat-button',
          'edit-button',
          'publish-button',
          'share-button',
          'delete-agent'
        ];
        
        const stepIds = mockSteps.map(step => step.id);
        expectedSteps.forEach(expectedId => {
          expect(stepIds).toContain(expectedId);
        });
      });
    });

    it('creates agent card overview step with correct agent ID', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={true} firstAgentId="test-agent-1" />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const agentCardStep = mockSteps.find(step => step.id === 'agent-card-overview');
        expect(agentCardStep).toBeDefined();
        expect(agentCardStep.title).toBe('Your Agent Card');
        expect(agentCardStep.attachTo.element).toContain('test-agent-1');
      });
    });

    it('creates chat button step', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={true} firstAgentId="test-agent-1" />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const chatStep = mockSteps.find(step => step.id === 'chat-button');
        expect(chatStep).toBeDefined();
        expect(chatStep.title).toBe('Use This Agent!');
        expect(chatStep.attachTo.element).toContain('lucide-message-circle');
      });
    });

    it('creates edit button step', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={true} firstAgentId="test-agent-1" />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const editStep = mockSteps.find(step => step.id === 'edit-button');
        expect(editStep).toBeDefined();
        expect(editStep.title).toBe('Edit Your Agent');
        expect(editStep.attachTo.element).toContain('lucide-wrench');
      });
    });

    it('creates publish button step', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={true} firstAgentId="test-agent-1" />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const publishStep = mockSteps.find(step => step.id === 'publish-button');
        expect(publishStep).toBeDefined();
        expect(publishStep.title).toBe('Publish Your Agent');
        expect(publishStep.attachTo.element).toContain('lucide-globe');
      });
    });

    it('creates share button step', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={true} firstAgentId="test-agent-1" />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const shareStep = mockSteps.find(step => step.id === 'share-button');
        expect(shareStep).toBeDefined();
        expect(shareStep.title).toBe('Share Your Agent');
        expect(shareStep.attachTo.element).toContain('lucide-share-2');
      });
    });

    it('creates delete agent step with warning', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={true} firstAgentId="test-agent-1" />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const deleteStep = mockSteps.find(step => step.id === 'delete-agent');
        expect(deleteStep).toBeDefined();
        expect(deleteStep.title).toBe('Delete Your Agent');
        expect(deleteStep.text).toContain('Warning');
        expect(deleteStep.text).toContain('permanent');
        expect(deleteStep.attachTo.element).toContain('lucide-trash-2');
      });
    });
  });

  describe('Navigation Buttons', () => {
    it('has correct buttons on first step', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={false} />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const firstStep = mockSteps[0];
        expect(firstStep.buttons).toHaveLength(1);
        expect(firstStep.buttons[0].text).toBe('Next');
      });
    });

    it('has Back and Next buttons on middle steps', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={true} firstAgentId="test-agent-1" />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        // Check middle steps (not first or last)
        const middleSteps = mockSteps.slice(1, -1);
        middleSteps.forEach(step => {
          expect(step.buttons).toHaveLength(2);
          expect(step.buttons.some((btn: any) => btn.text === 'Back')).toBe(true);
          expect(step.buttons.some((btn: any) => btn.text === 'Next')).toBe(true);
        });
      });
    });

    it('has Finish Tour button on last step', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={false} />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const lastStep = mockSteps[mockSteps.length - 1];
        expect(lastStep.buttons.some((btn: any) => btn.text === 'Finish Tour')).toBe(true);
      });
    });
  });

  describe('Event Handlers', () => {
    it('sets up completion and cancellation handlers', async () => {
      const onComplete = jest.fn();
      render(<AgentsPageTour isFirstTime={false} onComplete={onComplete} />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        expect(mockTour.on).toHaveBeenCalledWith('complete', expect.any(Function));
        expect(mockTour.on).toHaveBeenCalledWith('cancel', expect.any(Function));
      });
    });

    it('calls onComplete when tour completes', async () => {
      const onComplete = jest.fn();
      render(<AgentsPageTour isFirstTime={false} onComplete={onComplete} />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        const completeHandler = mockTour.on.mock.calls.find(call => call[0] === 'complete')?.[1];
        if (completeHandler) {
          completeHandler();
        }
      });

      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Element Highlighting', () => {
    it('adds and removes highlights correctly', async () => {
      const testElement = document.createElement('div');
      testElement.setAttribute('data-testid', 'test-element');
      document.body.appendChild(testElement);

      render(<AgentsPageTour isFirstTime={false} hasAgents={false} />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      // The tour should have beforeShowPromise and beforeHidePromise functions
      // that handle highlighting - we can't easily test the internal highlighting
      // but we can verify the promises exist
      await waitFor(() => {
        const stepsWithPromises = mockSteps.filter(step => step.beforeShowPromise);
        expect(stepsWithPromises.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('handles missing elements gracefully', async () => {
      // No agent elements in DOM
      render(<AgentsPageTour isFirstTime={false} hasAgents={true} firstAgentId="nonexistent" />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      // Should still create steps even if elements are missing
      await waitFor(() => {
        expect(mockSteps.length).toBeGreaterThan(0);
      });
    });

    it('adapts to different agent states', async () => {
      render(<AgentsPageTour isFirstTime={false} hasAgents={false} />);
      
      const tourButton = screen.getByTestId('agents-tour-button');
      await user.click(tourButton);

      await waitFor(() => {
        // Should show different content when no agents exist
        const whatYouCanDoStep = mockSteps.find(step => step.id === 'what-you-can-do');
        expect(whatYouCanDoStep).toBeDefined();
      });
    });
  });
});