import { useState, useEffect } from 'react';

interface TourState {
  hasSeenTour: boolean;
  isFirstTime: boolean;
  isTourActive: boolean;
}

export function useTour() {
  const [tourState, setTourState] = useState<TourState>({
    hasSeenTour: false,
    isFirstTime: false,
    isTourActive: false
  });

  useEffect(() => {
    // Check if user has seen the tour before
    const hasSeenTour = localStorage.getItem('operator-tour-completed') === 'true';
    const isFirstTime = !hasSeenTour;
    
    setTourState(prev => ({
      ...prev,
      hasSeenTour,
      isFirstTime
    }));
  }, []);

  const markTourCompleted = () => {
    localStorage.setItem('operator-tour-completed', 'true');
    setTourState(prev => ({
      ...prev,
      hasSeenTour: true,
      isFirstTime: false,
      isTourActive: false
    }));
  };

  const startTour = () => {
    setTourState(prev => ({
      ...prev,
      isTourActive: true
    }));
  };

  const endTour = () => {
    setTourState(prev => ({
      ...prev,
      isTourActive: false
    }));
  };

  const resetTour = () => {
    localStorage.removeItem('operator-tour-completed');
    setTourState({
      hasSeenTour: false,
      isFirstTime: true,
      isTourActive: false
    });
  };

  return {
    ...tourState,
    markTourCompleted,
    startTour,
    endTour,
    resetTour
  };
} 