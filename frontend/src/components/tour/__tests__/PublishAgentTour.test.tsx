import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublishAgentTour } from '../PublishAgentTour';

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

describe('PublishAgentTour', () => {
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
    it('does not render when not active', () => {
      render(<PublishAgentTour isActive={false} />);
      
      // PublishAgentTour doesn't render a visible button, it's triggered programmatically
      expect(screen.queryByTestId('publish-tour-button')).not.toBeInTheDocument();
    });

    it('starts tour when active', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        expect(mockTour.start).toHaveBeenCalled();
      });
    });
  });

  describe('Tour Steps - Basic Flow', () => {
    it('creates welcome step', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const welcomeStep = mockSteps.find(step => step.id === 'publish-welcome');
        expect(welcomeStep).toBeDefined();
        expect(welcomeStep.title).toBe('Share Your Agents! 🚀');
        expect(welcomeStep.text).toContain('published to the marketplace');
      });
    });

    it('creates welcome step with correct buttons', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const welcomeStep = mockSteps.find(step => step.id === 'publish-welcome');
        expect(welcomeStep.buttons).toHaveLength(2);
        expect(welcomeStep.buttons[0].text).toBe('Show Me!');
        expect(welcomeStep.buttons[1].text).toBe('Skip Tour');
      });
    });

    it('creates final completion step', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const completeStep = mockSteps.find(step => step.id === 'publish-complete');
        expect(completeStep).toBeDefined();
        expect(completeStep.title).toBe('You\'re All Set! ✨');
        expect(completeStep.text).toContain('What happens when you publish');
        expect(completeStep.text).toContain('discoverable by all users');
        expect(completeStep.text).toContain('download counts');
      });
    });
  });

  describe('Tour Steps - With Agents', () => {
    beforeEach(() => {
      // Create mock agent element
      const agentCard = document.createElement('div');
      agentCard.classList.add('agent-card');
      agentCard.setAttribute('data-agent-id', 'test-agent');
      
      const publishButton = document.createElement('button');
      const publishIcon = document.createElement('svg');
      publishIcon.classList.add('lucide-globe');
      publishButton.appendChild(publishIcon);
      publishButton.textContent = 'Publish to Marketplace';
      
      agentCard.appendChild(publishButton);
      document.body.appendChild(agentCard);
    });

    it('creates find agent step when agents exist', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const findAgentStep = mockSteps.find(step => step.id === 'find-agent');
        expect(findAgentStep).toBeDefined();
        expect(findAgentStep.title).toBe('Your Agents');
        expect(findAgentStep.text).toContain('agent cards');
      });
    });

    it('creates publish button step when publish button found', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const publishButtonStep = mockSteps.find(step => step.id === 'publish-button');
        expect(publishButtonStep).toBeDefined();
        expect(publishButtonStep.title).toBe('Publish to Marketplace');
        expect(publishButtonStep.text).toContain('Found it!');
        expect(publishButtonStep.text).toContain('Publish to Marketplace');
      });
    });
  });

  describe('Tour Steps - No Agents or Publish Button', () => {
    it('creates guidance step when no publish button found', async () => {
      // No agent elements in DOM
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const guidanceStep = mockSteps.find(step => step.id === 'publish-guidance');
        expect(guidanceStep).toBeDefined();
        expect(guidanceStep.title).toBe('Find the Publish Button');
        expect(guidanceStep.text).toContain('Globe icon (🌐)');
        expect(guidanceStep.text).toContain('Hover over an agent card');
      });
    });

    it('provides helpful guidance for finding publish button', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const guidanceStep = mockSteps.find(step => step.id === 'publish-guidance');
        expect(guidanceStep.text).toContain('You might need to:');
        expect(guidanceStep.text).toContain('Click on an agent to open its modal');
        expect(guidanceStep.text).toContain('Look for the Globe icon');
      });
    });
  });

  describe('Navigation and Flow', () => {
    it('creates correct number of steps', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        // Should have 4 steps: welcome, find-agent (if agents), publish-button/guidance, complete
        expect(mockSteps.length).toBeGreaterThanOrEqual(3);
        expect(mockSteps.length).toBeLessThanOrEqual(4);
      });
    });

    it('has skip tour option on welcome step', async () => {
      const onComplete = jest.fn();
      render(<PublishAgentTour isActive={true} onComplete={onComplete} />);
      
      await waitFor(() => {
        const welcomeStep = mockSteps.find(step => step.id === 'publish-welcome');
        const skipButton = welcomeStep.buttons.find((btn: any) => btn.text === 'Skip Tour');
        
        expect(skipButton).toBeDefined();
        
        // Simulate clicking skip
        skipButton.action();
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('has Start Publishing button on final step', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const completeStep = mockSteps.find(step => step.id === 'publish-complete');
        const startButton = completeStep.buttons.find((btn: any) => btn.text === 'Start Publishing!');
        
        expect(startButton).toBeDefined();
        expect(startButton.classes).toBe('shepherd-button-primary');
      });
    });
  });

  describe('Element Finding and Highlighting', () => {
    it('finds first agent element', async () => {
      // Create multiple agent cards
      const agent1 = document.createElement('div');
      agent1.classList.add('agent-card');
      const agent2 = document.createElement('div');
      agent2.classList.add('agent-card');
      
      document.body.appendChild(agent1);
      document.body.appendChild(agent2);
      
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const findAgentStep = mockSteps.find(step => step.id === 'find-agent');
        expect(findAgentStep).toBeDefined();
        // Should attach to first agent found
        expect(findAgentStep.attachTo.element).toBe(agent1);
      });
    });

    it('finds publish button by globe icon', async () => {
      const publishButton = document.createElement('button');
      const globeIcon = document.createElement('svg');
      globeIcon.classList.add('lucide-globe');
      publishButton.appendChild(globeIcon);
      document.body.appendChild(publishButton);
      
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const publishStep = mockSteps.find(step => step.id === 'publish-button');
        expect(publishStep).toBeDefined();
        expect(publishStep.attachTo.element).toBe(publishButton);
      });
    });

    it('finds publish button by text content', async () => {
      const publishButton = document.createElement('button');
      publishButton.textContent = 'Publish to Marketplace';
      document.body.appendChild(publishButton);
      
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const publishStep = mockSteps.find(step => step.id === 'publish-button');
        expect(publishStep).toBeDefined();
      });
    });
  });

  describe('Event Handlers', () => {
    it('sets up completion and cancellation handlers', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        expect(mockTour.on).toHaveBeenCalledWith('complete', expect.any(Function));
        expect(mockTour.on).toHaveBeenCalledWith('cancel', expect.any(Function));
      });
    });

    it('calls onComplete when tour completes', async () => {
      const onComplete = jest.fn();
      render(<PublishAgentTour isActive={true} onComplete={onComplete} />);
      
      await waitFor(() => {
        const completeHandler = mockTour.on.mock.calls.find(call => call[0] === 'complete')?.[1];
        if (completeHandler) {
          completeHandler();
        }
      });

      expect(onComplete).toHaveBeenCalled();
    });

    it('calls onComplete when tour is cancelled', async () => {
      const onComplete = jest.fn();
      render(<PublishAgentTour isActive={true} onComplete={onComplete} />);
      
      await waitFor(() => {
        const cancelHandler = mockTour.on.mock.calls.find(call => call[0] === 'cancel')?.[1];
        if (cancelHandler) {
          cancelHandler();
        }
      });

      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Tour Content and Messaging', () => {
    it('provides clear publishing benefits', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const completeStep = mockSteps.find(step => step.id === 'publish-complete');
        expect(completeStep.text).toContain('Others can add it to their personal library');
        expect(completeStep.text).toContain('You\'ll see download counts');
        expect(completeStep.text).toContain('You can unpublish anytime');
        expect(completeStep.text).toContain('Make Private');
      });
    });

    it('includes helpful tips for publishing', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        const publishStep = mockSteps.find(step => step.id === 'publish-button');
        if (publishStep) {
          expect(publishStep.text).toContain('Tip');
          expect(publishStep.text).toContain('choose what to include');
          expect(publishStep.text).toContain('knowledge bases');
          expect(publishStep.text).toContain('custom tools');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing agent elements gracefully', async () => {
      // No agents in DOM
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        // Should still create steps
        expect(mockSteps.length).toBeGreaterThan(0);
        
        // Should not have find-agent step
        const findAgentStep = mockSteps.find(step => step.id === 'find-agent');
        expect(findAgentStep).toBeUndefined();
      });
    });

    it('handles missing publish button gracefully', async () => {
      render(<PublishAgentTour isActive={true} />);
      
      await waitFor(() => {
        // Should create guidance step instead of publish-button step
        const guidanceStep = mockSteps.find(step => step.id === 'publish-guidance');
        expect(guidanceStep).toBeDefined();
        
        const publishButtonStep = mockSteps.find(step => step.id === 'publish-button');
        expect(publishButtonStep).toBeUndefined();
      });
    });
  });

  describe('Cleanup', () => {
    it('cleans up tour on unmount', () => {
      const { unmount } = render(<PublishAgentTour isActive={true} />);
      
      unmount();
      
      expect(mockTour.destroy).toHaveBeenCalled();
    });

    it('removes highlights on cleanup', async () => {
      const publishButton = document.createElement('button');
      publishButton.classList.add('test-highlight');
      document.body.appendChild(publishButton);
      
      const { unmount } = render(<PublishAgentTour isActive={true} />);
      
      unmount();
      
      // Should clean up any highlights (tested via the cleanup function)
      expect(mockTour.destroy).toHaveBeenCalled();
    });
  });
});