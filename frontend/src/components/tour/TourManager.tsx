'use client';

import { useTour } from './TourContext';
import { OperatorTour } from './OperatorTour';
import { AgentsPageTour } from './AgentsPageTour';

export function TourManager() {
  const { 
    currentTour, 
    isFirstTimeUser, 
    hasCompletedDashboardTour, 
    setHasCompletedDashboardTour 
  } = useTour();

  // Determine if we should show the tour for the current page
  const shouldShowDashboardTour = currentTour === 'dashboard' && isFirstTimeUser && !hasCompletedDashboardTour;

  // Show the dashboard tour on the dashboard page
  if (currentTour === 'dashboard') {
    return (
      <OperatorTour 
        isFirstTime={shouldShowDashboardTour}
        onComplete={() => {
          setHasCompletedDashboardTour(true);
        }}
      />
    );
  }

  // For other pages, we don't show a global tour
  // Each page will handle its own tour
  return null;
} 