'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface TourContextType {
  currentTour: string | null;
  setCurrentTour: (tour: string | null) => void;
  isFirstTimeUser: boolean;
  setIsFirstTimeUser: (isFirstTime: boolean) => void;
  hasCompletedDashboardTour: boolean;
  setHasCompletedDashboardTour: (completed: boolean) => void;
  hasCompletedAgentsTour: boolean;
  setHasCompletedAgentsTour: (completed: boolean) => void;
  getTourForPage: (pathname: string) => string | null;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [currentTour, setCurrentTour] = useState<string | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [hasCompletedDashboardTour, setHasCompletedDashboardTour] = useState(false);
  const [hasCompletedAgentsTour, setHasCompletedAgentsTour] = useState(false);

  // Load tour completion state from localStorage
  useEffect(() => {
    const dashboardCompleted = localStorage.getItem('dashboard-tour-completed') === 'true';
    const agentsCompleted = localStorage.getItem('agents-tour-completed') === 'true';
    const isFirstTime = localStorage.getItem('is-first-time-user') === 'true';
    
    setHasCompletedDashboardTour(dashboardCompleted);
    setHasCompletedAgentsTour(agentsCompleted);
    setIsFirstTimeUser(isFirstTime);
  }, []);

  // Save tour completion state to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-tour-completed', hasCompletedDashboardTour.toString());
  }, [hasCompletedDashboardTour]);

  useEffect(() => {
    localStorage.setItem('agents-tour-completed', hasCompletedAgentsTour.toString());
  }, [hasCompletedAgentsTour]);

  useEffect(() => {
    localStorage.setItem('is-first-time-user', isFirstTimeUser.toString());
  }, [isFirstTimeUser]);

  // Determine which tour should be shown for the current page
  const getTourForPage = (pathname: string): string | null => {
    if (pathname === '/dashboard') {
      return 'dashboard';
    } else if (pathname === '/agents') {
      return 'agents';
    }
    // Add more pages as needed
    return null;
  };

  // Auto-set tour based on current page
  useEffect(() => {
    const tourForPage = getTourForPage(pathname);
    setCurrentTour(tourForPage);
  }, [pathname]);

  const value: TourContextType = {
    currentTour,
    setCurrentTour,
    isFirstTimeUser,
    setIsFirstTimeUser,
    hasCompletedDashboardTour,
    setHasCompletedDashboardTour,
    hasCompletedAgentsTour,
    setHasCompletedAgentsTour,
    getTourForPage,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
} 