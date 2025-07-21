import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface Integration {
  type: string;
  name: string;
  description: string;
  icon: string;
  status: 'not_connected' | 'pending' | 'connected' | 'failed' | 'disconnected';
  is_enabled: boolean;
  connected_at?: string;
  integration_id?: string;
}

interface IntegrationsState {
  [key: string]: Integration;
}

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<IntegrationsState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${API_URL}/integrations/composio/list`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch integrations');
      }

      const data = await response.json();
      
      // Convert array to object keyed by integration type
      const integrationsMap: IntegrationsState = {};
      data.integrations.forEach((integration: Integration) => {
        integrationsMap[integration.type] = integration;
      });
      
      setIntegrations(integrationsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch integrations');
      console.error('Error fetching integrations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleIntegration = useCallback(async (integrationType: string, enabled: boolean) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${API_URL}/integrations/composio/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integration_type: integrationType,
          is_enabled: enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle integration');
      }

      // Update local state
      setIntegrations(prev => ({
        ...prev,
        [integrationType]: {
          ...prev[integrationType],
          is_enabled: enabled,
        },
      }));
    } catch (err) {
      console.error('Error toggling integration:', err);
      throw err;
    }
  }, []);

  const checkIntegrationStatus = useCallback(async (integrationType: string) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${API_URL}/integrations/composio/status/${integrationType}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check integration status');
      }

      const data = await response.json();
      
      // Update local state with the status
      setIntegrations(prev => ({
        ...prev,
        [integrationType]: {
          ...prev[integrationType],
          status: data.status,
          is_enabled: data.is_enabled,
          connected_at: data.connected_at,
        },
      }));
      
      return data;
    } catch (err) {
      console.error('Error checking integration status:', err);
      throw err;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  return {
    integrations,
    isLoading,
    error,
    refreshIntegrations: fetchIntegrations,
    toggleIntegration,
    checkIntegrationStatus,
  };
} 