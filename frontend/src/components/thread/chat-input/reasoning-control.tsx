'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Brain, Zap, Target, Rocket, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isLocalMode } from '@/lib/config';
import { useIsMobile } from '@/hooks/use-mobile';

export interface ReasoningSettings {
  enabled: boolean;
  effort: 'none' | 'medium' | 'high';
}

interface ReasoningControlProps {
  value: ReasoningSettings;
  onChange: (settings: ReasoningSettings) => void;
  disabled?: boolean;
  modelName?: string;
  subscriptionStatus?: string;
}

const REASONING_LEVELS = [
  {
    value: 'none',
    label: 'Chill',
    description: 'Standard speed, relaxed thinking',
    icon: Zap,
    color: 'text-white',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    isReasoning: false,
  },
  {
    value: 'medium',
    label: 'Focus',
    description: 'Concentrated reasoning for complex problems (+credits)',
    icon: Brain,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    isReasoning: true,
  },
  {
    value: 'high',
    label: 'Deep',
    description: 'Intensive deep thinking for maximum insight (+more credits)',
    icon: Rocket,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    isReasoning: true,
  },
] as const;

// localStorage key for persisting reasoning settings
const REASONING_SETTINGS_KEY = 'reasoning-settings';

// Helper function to save settings to localStorage
const saveReasoningSettings = (settings: ReasoningSettings) => {
  try {
    localStorage.setItem(REASONING_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save reasoning settings to localStorage:', error);
  }
};

// Helper function to load settings from localStorage
const loadReasoningSettings = (): ReasoningSettings | null => {
  try {
    const stored = localStorage.getItem(REASONING_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load reasoning settings from localStorage:', error);
  }
  return null;
};

export const ReasoningControl: React.FC<ReasoningControlProps> = ({
  value,
  onChange,
  disabled = false,
  modelName = '',
  subscriptionStatus = '',
}) => {
  const isMobile = useIsMobile();
  
  // Check if the model supports reasoning (Claude models)
  const supportsReasoning = modelName.toLowerCase().includes('claude');
  
  // Check if user is on free plan (same check as existing limitation logic)
  const isFreePlan = subscriptionStatus === 'no_subscription' && !isLocalMode();
  
  // Disable reasoning control for free plan users
  const isReasoningDisabled = disabled || isFreePlan;

  // Save settings whenever they change
  useEffect(() => {
    if (!isFreePlan) {
      saveReasoningSettings(value);
    }
  }, [value, isFreePlan]);

  const handleDotClick = (level: typeof REASONING_LEVELS[number], index: number) => {
    if (isFreePlan) return; // Prevent changes on free plan
    
    onChange({ 
      enabled: level.isReasoning,
      effort: level.value as 'none' | 'medium' | 'high'
    });
  };

  const handleToggle = () => {
    if (isFreePlan) return; // Prevent changes on free plan
    
    // Cycle through: none -> medium -> high -> none
    const currentIndex = REASONING_LEVELS.findIndex(level => level.value === value.effort);
    const nextIndex = (currentIndex + 1) % REASONING_LEVELS.length;
    const nextLevel = REASONING_LEVELS[nextIndex];
    
    onChange({ 
      enabled: nextLevel.isReasoning,
      effort: nextLevel.value as 'none' | 'medium' | 'high'
    });
  };

  if (!supportsReasoning) {
    return null;
  }

  // Hide reasoning control completely when on free plan
  if (isFreePlan) {
    return null;
  }

  const currentLevel = REASONING_LEVELS.find(level => level.value === value.effort) || REASONING_LEVELS[0];
  const currentLevelIndex = REASONING_LEVELS.findIndex(level => level.value === value.effort);
  const IconToShow = currentLevel.icon;

  // Mobile-optimized compact version
  if (isMobile) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleToggle}
              disabled={isReasoningDisabled}
              className={cn(
                "relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ease-out",
                "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                "border border-gray-200 dark:border-gray-700",
                "active:scale-95",
                isReasoningDisabled && "opacity-50 cursor-not-allowed"
              )}
              aria-label={`Current mode: ${currentLevel.label}. Click to cycle through modes.`}
            >
              {/* Mode Label */}
              <span className={cn(
                "text-xs font-medium transition-all duration-300 ease-out",
                currentLevelIndex === 0 
                  ? "text-gray-700 dark:text-white" 
                  : currentLevelIndex === 1 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-purple-600 dark:text-purple-400"
              )}>
                {currentLevel.label}
              </span>
              
              {/* Compact Dots Row */}
              <div className="flex items-center gap-0.5">
                {REASONING_LEVELS.map((level, index) => {
                  const isFilled = index <= currentLevelIndex;
                  const isActive = index === currentLevelIndex;
                  
                  return (
                    <div
                      key={level.value}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-500 ease-out",
                        isFilled 
                          ? currentLevelIndex === 0 
                            ? 'bg-white shadow-sm' 
                            : currentLevelIndex === 1 
                            ? 'bg-blue-500 shadow-sm' 
                            : 'bg-purple-500 shadow-sm'
                          : "bg-gray-300 dark:bg-gray-600",
                        isActive && "scale-125"
                      )}
                    />
                  );
                })}
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="flex flex-col gap-1">
              <p className="font-medium">{currentLevel.label}</p>
              <p className="text-muted-foreground">{currentLevel.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Tap to cycle modes</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className="flex items-center animate-in slide-in-from-left-2 duration-300 -ml-4">
          {/* Desktop: Pill-shaped Sand Timer Component */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleToggle}
                disabled={isReasoningDisabled}
                className={cn(
                  "relative flex items-center gap-1 px-6 py-2 rounded-lg transition-all duration-500 ease-out",
                  "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                  "border border-gray-200 dark:border-gray-700",
                  "hover:scale-105 active:scale-95 group",
                  isReasoningDisabled && "opacity-50 cursor-not-allowed"
                )}
                aria-label={`Current mode: ${currentLevel.label}. Click to cycle through modes.`}
              >
                {/* Icon */}
                <IconToShow 
                  className={cn(
                    "h-4 w-4 transition-all duration-500 ease-out",
                    currentLevelIndex === 0 
                      ? "text-gray-600 dark:text-gray-300" 
                      : currentLevelIndex === 1 
                      ? "text-blue-500 dark:text-blue-400" 
                      : "text-purple-500 dark:text-purple-400",
                    "group-hover:scale-110"
                  )} 
                />
                
                {/* Three Bulb Sand Timer */}
                <div className="flex items-center gap-1">
                  {REASONING_LEVELS.map((level, index) => {
                    const isFilled = index <= currentLevelIndex;
                    const isActive = index === currentLevelIndex;
                    
                    // Get current theme colors
                    const fillColor = currentLevelIndex === 0 
                      ? 'bg-white shadow-white/40' 
                      : currentLevelIndex === 1 
                      ? 'bg-blue-500 shadow-blue-500/40' 
                      : 'bg-purple-500 shadow-purple-500/40';
                    
                    const glowEffect = currentLevelIndex === 0 
                      ? 'drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]' 
                      : currentLevelIndex === 1 
                      ? 'drop-shadow-[0_0_3px_rgba(59,130,246,0.8)]' 
                      : 'drop-shadow-[0_0_3px_rgba(168,85,247,0.8)]';

                    return (
                      <div
                        key={level.value}
                        className={cn(
                          "relative w-3 h-3 rounded-full transition-all duration-700 ease-out",
                          "border border-gray-300 dark:border-gray-600",
                          isFilled 
                            ? `${fillColor} ${glowEffect} shadow-lg` 
                            : "bg-gray-200 dark:bg-gray-700",
                          isActive && "animate-pulse scale-110",
                          // Staggered animation delay for liquid fill effect
                          isFilled && `animate-in fill-mode-both duration-700`,
                          index === 0 && "delay-0",
                          index === 1 && "delay-150", 
                          index === 2 && "delay-300"
                        )}
                        style={{
                          animationDelay: isFilled ? `${index * 150}ms` : '0ms',
                        }}
                      >
                        {/* Liquid fill animation */}
                        {isFilled && (
                          <div 
                            className="absolute inset-0 rounded-full opacity-30 animate-ping"
                            style={{
                              background: currentLevelIndex === 0 
                                ? 'rgba(255,255,255,0.6)' 
                                : currentLevelIndex === 1 
                                ? 'rgba(59,130,246,0.6)' 
                                : 'rgba(168,85,247,0.6)',
                              animationDelay: `${index * 200}ms`,
                              animationDuration: '2s',
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Current Mode Label */}
                <span className={cn(
                  "text-sm font-medium transition-all duration-500 ease-out",
                  currentLevelIndex === 0 
                    ? "text-gray-700 dark:text-white" 
                    : currentLevelIndex === 1 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-purple-600 dark:text-purple-400",
                  "group-hover:scale-105"
                )}>
                  {currentLevel.label}
                </span>
                
                {/* Subtle background glow */}
                <div 
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{
                    background: currentLevelIndex === 0 
                      ? 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)'
                      : currentLevelIndex === 1 
                      ? 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)'
                      : 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)',
                  }}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="flex flex-col gap-1">
                <p className="font-medium">{currentLevel.label}</p>
                <p className="text-muted-foreground">{currentLevel.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Click to cycle modes</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}; 