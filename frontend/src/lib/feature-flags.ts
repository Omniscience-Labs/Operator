import React from 'react';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/api` : 'http://localhost:8000');

export interface FeatureFlag {
  flag_name: string;
  enabled: boolean;
  details?: {
    description?: string;
    updated_at?: string;
  } | null;
}

export interface FeatureFlagsResponse {
  flags: Record<string, boolean>;
}

const flagCache = new Map<string, { value: boolean; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

let globalFlagsCache: { flags: Record<string, boolean>; timestamp: number } | null = null;

export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  
  private constructor() {}
  
  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }
  
  async isEnabled(flagName: string): Promise<boolean> {
    try {
      const cached = flagCache.get(flagName);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.value;
      }
      const response = await fetch(`${API_URL}/feature-flags/${flagName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.warn(`Failed to fetch feature flag ${flagName}: ${response.status}`);
        return false;
      }
      
      const data: FeatureFlag = await response.json();
      
      flagCache.set(flagName, {
        value: data.enabled,
        timestamp: Date.now(),
      });
      
      return data.enabled;
    } catch (error) {
      console.error(`Error checking feature flag ${flagName}:`, error);
      return false;
    }
  }
  
  async getFlagDetails(flagName: string): Promise<FeatureFlag | null> {
    try {
      const response = await fetch(`${API_URL}/feature-flags/${flagName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch feature flag details for ${flagName}: ${response.status}`);
        return null;
      }
      
      const data: FeatureFlag = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching feature flag details for ${flagName}:`, error);
      return null;
    }
  }
  
  async getAllFlags(): Promise<Record<string, boolean>> {
    try {
      if (globalFlagsCache && Date.now() - globalFlagsCache.timestamp < CACHE_DURATION) {
        return globalFlagsCache.flags;
      }
      
      const response = await fetch(`${API_URL}/feature-flags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch all feature flags: ${response.status}`);
        return {};
      }
      
      const data: FeatureFlagsResponse = await response.json();
      globalFlagsCache = {
        flags: data.flags,
        timestamp: Date.now(),
      };
      
      Object.entries(data.flags).forEach(([flagName, enabled]) => {
        flagCache.set(flagName, {
          value: enabled,
          timestamp: Date.now(),
        });
      });
      
      return data.flags;
    } catch (error) {
      console.error('Error fetching all feature flags:', error);
      return {};
    }
  }

  clearCache(): void {
    flagCache.clear();
    globalFlagsCache = null;
  }

  async preloadFlags(flagNames: string[]): Promise<void> {
    try {
      const promises = flagNames.map(flagName => this.isEnabled(flagName));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error preloading feature flags:', error);
    }
  }
}

const featureFlagManager = FeatureFlagManager.getInstance();

export const isEnabled = (flagName: string): Promise<boolean> => {
  return featureFlagManager.isEnabled(flagName);
};

export const isFlagEnabled = isEnabled;

export const getFlagDetails = (flagName: string): Promise<FeatureFlag | null> => {
  return featureFlagManager.getFlagDetails(flagName);
};

export const getAllFlags = (): Promise<Record<string, boolean>> => {
  return featureFlagManager.getAllFlags();
};

export const clearFlagCache = (): void => {
  featureFlagManager.clearCache();
};

export const preloadFlags = (flagNames: string[]): Promise<void> => {
  return featureFlagManager.preloadFlags(flagNames);
};

export const useFeatureFlag = (flagName: string) => {
  const [enabled, setEnabled] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    let mounted = true;
    
    const checkFlag = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await isFlagEnabled(flagName);
        if (mounted) {
          setEnabled(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setEnabled(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    checkFlag();
    
    return () => {
      mounted = false;
    };
  }, [flagName]);
  
  return { enabled, loading, error };
};

export const useFeatureFlags = (flagNames: string[]) => {
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    let mounted = true;
    
    const checkFlags = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const results = await Promise.all(
          flagNames.map(async (flagName) => {
            const enabled = await isFlagEnabled(flagName);
            return [flagName, enabled] as [string, boolean];
          })
        );
        
        if (mounted) {
          const flagsObject = Object.fromEntries(results);
          setFlags(flagsObject);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          const disabledFlags = Object.fromEntries(
            flagNames.map(name => [name, false])
          );
          setFlags(disabledFlags);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    if (flagNames.length > 0) {
      checkFlags();
    } else {
      setLoading(false);
    }
    
    return () => {
      mounted = false;
    };
  }, [flagNames.join(',')]);
  
  return { flags, loading, error };
};
