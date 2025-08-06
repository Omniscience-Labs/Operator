import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorTour } from '../OperatorTour';

// Mock Shepherd.js with more detailed implementation
const mockTour = {
  addStep: jest.fn(),
  start: jest.fn(),
  complete: jest.fn(),
  destroy: jest.fn(),
  on: jest.fn(),
  next: jest.fn(),
  back: jest.fn(),
  steps: [],
};

jest.mock('shepherd.js', () => ({
  Tour: jest.fn().mockImplementation(() => mockTour),
  Step: jest.fn(),
}));

// Mock DOM elements that the tour looks for
const createMockElement = (selector: string, textContent?: string) => {
  const element = document.createElement('div');
  element.setAttribute('data-testid', selector);
  if (textContent) {
    element.textContent = textContent;
  }
  document.body.appendChild(element);
  return element;
};

describe('OperatorTour - Enhanced Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Clear all mocks
    jest.clearAllMocks();
    // Clear DOM
    document.body.innerHTML = '';
    // Clear localStorage
    localStorage.clear();
    // Reset tour mock
    mockTour.steps = [];
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('Component Rendering', () => {
    it('renders tour button with correct text for non-first-time users', () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      expect(tourButton).toBeInTheDocument();
      expect(tourButton).toHaveTextContent('Tour');
    });

    it('does not render tour button for first-time users', () => {
      render(<OperatorTour isFirstTime={true} />);
      
      expect(screen.queryByTestId('dashboard-tour-button')).not.toBeInTheDocument();
    });

    it('shows loading state when tour is starting', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      
      // Mock a delay in tour start
      mockTour.start.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      
      await user.click(tourButton);
      
      // Should show loading text briefly
      await waitFor(() => {
        expect(tourButton).toHaveTextContent('Loading...');
      });
    });
  });

  describe('Tour Initialization', () => {
    it('automatically starts tour for first-time users', async () => {
      render(<OperatorTour isFirstTime={true} />);
      
      // Wait for the useEffect to trigger
      await waitFor(() => {
        expect(mockTour.start).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('creates tour with correct configuration', async () => {
      const { Tour } = require('shepherd.js');
      
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);
      
      await waitFor(() => {
        expect(Tour).toHaveBeenCalledWith({
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
      });
    });

    it('adds all 13 tour steps', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);
      
      await waitFor(() => {
        // Should have called addStep 13 times (for all steps)
        expect(mockTour.addStep).toHaveBeenCalledTimes(13);
      });
    });
  });

  describe('Tour Step Configuration', () => {
    it('creates welcome step with correct content', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);
      
      await waitFor(() => {
        expect(mockTour.addStep).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'welcome',
            title: 'Welcome to Operator!',
            text: expect.stringContaining('Hey there! I\'m Operator, your AI-powered assistant.')
          })
        );
      });
    });

    it('creates chat input step with correct attachTo', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);
      
      await waitFor(() => {
        expect(mockTour.addStep).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'chat-input',
            title: 'Start Your Conversation',
            attachTo: {
              element: 'textarea[placeholder*="message"], input[placeholder*="message"], .chat-input textarea, [data-testid="chat-input"]',
              on: 'top'
            }
          })
        );
      });
    });

    it('creates final step with finish button', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);
      
      await waitFor(() => {
        // Check for the final step (send-message)
        expect(mockTour.addStep).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'send-message',
            title: 'Send Your Message',
            buttons: expect.arrayContaining([
              expect.objectContaining({
                text: 'Finish Tour',
                classes: 'shepherd-button-primary'
              })
            ])
          })
        );
      });
    });
  });

  describe('Event Handlers', () => {
    it('sets up tour event handlers correctly', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);
      
      await waitFor(() => {
        // Should register event handlers
        expect(mockTour.on).toHaveBeenCalledWith('complete', expect.any(Function));
        expect(mockTour.on).toHaveBeenCalledWith('cancel', expect.any(Function));
        expect(mockTour.on).toHaveBeenCalledWith('show', expect.any(Function));
        expect(mockTour.on).toHaveBeenCalledWith('hide', expect.any(Function));
      });
    });

    it('calls onComplete when tour is completed', async () => {
      const onComplete = jest.fn();
      render(<OperatorTour isFirstTime={false} onComplete={onComplete} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);
      
      // Simulate tour completion
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
      render(<OperatorTour isFirstTime={false} onComplete={onComplete} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);
      
      // Simulate tour cancellation
      await waitFor(() => {
        const cancelHandler = mockTour.on.mock.calls.find(call => call[0] === 'cancel')?.[1];
        if (cancelHandler) {
          cancelHandler();
        }
      });
      
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Tour Button States', () => {
    it('changes button text when tour is active', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      
      // Initially should show "Tour"
      expect(tourButton).toHaveTextContent('Tour');
      
      await user.click(tourButton);
      
      // After clicking, should show "End Tour"
      await waitFor(() => {
        expect(tourButton).toHaveTextContent('End Tour');
      });
    });

    it('ends tour when clicking End Tour button', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      
      // Start tour
      await user.click(tourButton);
      
      await waitFor(() => {
        expect(tourButton).toHaveTextContent('End Tour');
      });
      
      // End tour
      await user.click(tourButton);
      
      expect(mockTour.destroy).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(tourButton).toHaveTextContent('Tour');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles Shepherd.js import failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock import failure
      jest.doMock('shepherd.js', () => {
        throw new Error('Failed to import Shepherd.js');
      });
      
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);
      
      // Should handle error gracefully
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to start tour:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    it('handles missing tour constructor gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock invalid tour constructor
      jest.doMock('shepherd.js', () => ({
        Tour: null
      }));
      
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      await user.click(tourButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to start tour:', 
          expect.objectContaining({
            message: 'Tour constructor not found in shepherd.js module'
          })
        );
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('cleans up tour on component unmount', () => {
      const { unmount } = render(<OperatorTour isFirstTime={false} />);
      
      unmount();
      
      // Should clean up any existing tour
      expect(mockTour.destroy).toHaveBeenCalled();
    });

    it('removes highlight classes on cleanup', async () => {
      // Add some elements with highlight classes
      const element1 = createMockElement('test-element-1');
      const element2 = createMockElement('test-element-2');
      element1.classList.add('shepherd-highlight');
      element2.classList.add('shepherd-highlight');
      
      const { unmount } = render(<OperatorTour isFirstTime={false} />);
      
      expect(element1).toHaveClass('shepherd-highlight');
      expect(element2).toHaveClass('shepherd-highlight');
      
      unmount();
      
      // Should remove highlight classes
      expect(element1).not.toHaveClass('shepherd-highlight');
      expect(element2).not.toHaveClass('shepherd-highlight');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes on tour button', () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      
      expect(tourButton).toHaveAttribute('type', 'button');
      expect(tourButton).toBeEnabled();
    });

    it('disables button when loading', async () => {
      render(<OperatorTour isFirstTime={false} />);
      
      const tourButton = screen.getByTestId('dashboard-tour-button');
      
      // Mock a delay in tour start to see loading state
      mockTour.start.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      
      await user.click(tourButton);
      
      await waitFor(() => {
        expect(tourButton).toBeDisabled();
      });
    });
  });
});