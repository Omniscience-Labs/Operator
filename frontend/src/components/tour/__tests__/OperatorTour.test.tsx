import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OperatorTour } from '../OperatorTour';

// Mock Shepherd.js
jest.mock('shepherd.js', () => ({
  Tour: jest.fn().mockImplementation(() => ({
    addStep: jest.fn(),
    start: jest.fn(),
    complete: jest.fn(),
    destroy: jest.fn(),
    on: jest.fn(),
    next: jest.fn(),
    back: jest.fn(),
    steps: [],
  })),
  Step: jest.fn(),
}));

describe('OperatorTour - Basic Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders tour button for non-first-time users', () => {
    render(<OperatorTour isFirstTime={false} />);
    
    expect(screen.getByTestId('dashboard-tour-button')).toBeInTheDocument();
    expect(screen.getByText('Tour')).toBeInTheDocument();
  });

  it('does not render tour button for first-time users', () => {
    render(<OperatorTour isFirstTime={true} />);
    
    expect(screen.queryByTestId('dashboard-tour-button')).not.toBeInTheDocument();
  });

  it('calls onComplete when tour is completed', async () => {
    const onComplete = jest.fn();
    const mockTour = {
      addStep: jest.fn(),
      start: jest.fn(),
      complete: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn((event, handler) => {
        if (event === 'complete') {
          // Simulate immediate completion for testing
          setTimeout(() => handler(), 0);
        }
      }),
      next: jest.fn(),
      back: jest.fn(),
      steps: [],
    };

    const { Tour } = require('shepherd.js');
    Tour.mockImplementation(() => mockTour);

    render(<OperatorTour isFirstTime={false} onComplete={onComplete} />);
    
    const tourButton = screen.getByTestId('dashboard-tour-button');
    fireEvent.click(tourButton);
    
    // Wait for the async tour to start and complete
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('auto-starts tour for first-time users', async () => {
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

    const { Tour } = require('shepherd.js');
    Tour.mockImplementation(() => mockTour);

    render(<OperatorTour isFirstTime={true} />);
    
    // The tour should auto-start for first-time users
    await waitFor(() => {
      expect(mockTour.start).toHaveBeenCalled();
    });

    // Should not render the manual tour button
    expect(screen.queryByTestId('dashboard-tour-button')).not.toBeInTheDocument();
  });

  it('handles tour button click correctly', async () => {
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

    const { Tour } = require('shepherd.js');
    Tour.mockImplementation(() => mockTour);

    render(<OperatorTour isFirstTime={false} />);
    
    const tourButton = screen.getByTestId('dashboard-tour-button');
    
    // Initially should show "Tour"
    expect(tourButton).toHaveTextContent('Tour');
    
    fireEvent.click(tourButton);
    
    await waitFor(() => {
      expect(mockTour.start).toHaveBeenCalled();
      expect(tourButton).toHaveTextContent('End Tour');
    });
  });
}); 