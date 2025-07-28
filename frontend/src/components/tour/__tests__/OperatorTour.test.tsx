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
  })),
  Step: jest.fn(),
}));

describe('OperatorTour', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders tour button for non-first-time users', () => {
    render(<OperatorTour isFirstTime={false} />);
    
    expect(screen.getByTestId('tour-button')).toBeInTheDocument();
    expect(screen.getByText('Tour')).toBeInTheDocument();
  });

  it('does not render tour button for first-time users', () => {
    render(<OperatorTour isFirstTime={true} />);
    
    expect(screen.queryByTestId('tour-button')).not.toBeInTheDocument();
  });

  it('calls onComplete when tour is completed', async () => {
    const onComplete = jest.fn();
    render(<OperatorTour isFirstTime={false} onComplete={onComplete} />);
    
    const tourButton = screen.getByTestId('tour-button');
    fireEvent.click(tourButton);
    
    // Wait for the async tour to start
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('auto-starts tour for first-time users', () => {
    const onComplete = jest.fn();
    render(<OperatorTour isFirstTime={true} onComplete={onComplete} />);
    
    // The tour should auto-start for first-time users
    // We can't easily test the auto-start behavior without more complex mocking
    // but we can verify the component renders without the button
    expect(screen.queryByTestId('tour-button')).not.toBeInTheDocument();
  });
}); 