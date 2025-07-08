'use client';

import { useSubscription } from '@/hooks/react-query/subscriptions/use-subscriptions';
import { useState, useEffect, useMemo } from 'react';
import { isLocalMode } from '@/lib/config';
import { useAvailableModels } from '@/hooks/react-query/subscriptions/use-model';

export const STORAGE_KEY_MODEL = 'operator-preferred-model';
export const STORAGE_KEY_CUSTOM_MODELS = 'customModels';
export const DEFAULT_FREE_MODEL_ID = 'claude-sonnet-4';
export const DEFAULT_PREMIUM_MODEL_ID = 'claude-sonnet-4';

export type SubscriptionStatus = 'no_subscription' | 'active';

export interface ModelOption {
  id: string;
  label: string;
  requiresSubscription: boolean;
  description?: string;
  top?: boolean;
  isCustom?: boolean;
  priority?: number;
}

export interface CustomModel {
  id: string;
  label: string;
}

// SINGLE SOURCE OF TRUTH for all model data
export const MODELS = {
  // Premium high-priority models
  'claude-sonnet-4': { 
    tier: 'free',
    priority: 100, 
    recommended: true,
    lowQuality: false,
    description: 'Omni 4 - Advanced AI assistant with cutting-edge capabilities'
  },
  
  // 'claude-sonnet-3.7': { 
  //   tier: 'premium', 
  //   priority: 95, 
  //   recommended: true,
  //   lowQuality: false,
  //   description: 'Claude 3.7 - Anthropic\'s most powerful AI assistant'
  // },
  // 'claude-sonnet-3.7-reasoning': { 
  //   tier: 'premium', 
  //   priority: 95, 
  //   recommended: true,
  //   lowQuality: false,
  //   description: 'Claude 3.7 with enhanced reasoning capabilities'
  // },
  // 'gpt-4.1': { 
  //   tier: 'premium', 
  //   priority: 95,
  //   recommended: true,
  //   lowQuality: false,
  //   description: 'GPT-4.1 - OpenAI\'s latest advanced model with enhanced capabilities'
  // },
  // 'gpt-4.1-mini': { 
  //   tier: 'premium', 
  //   priority: 90,
  //   recommended: false,
  //   lowQuality: false,
  //   description: 'GPT-4.1 Mini - Faster, more efficient version of GPT-4.1'
  // },
  // 'gemini-2.5-pro': { 
  //   tier: 'premium', 
  //   priority: 95,
  //   recommended: true,
  //   lowQuality: false,
  //   description: 'Gemini Pro 2.5 - Google\'s latest advanced model'
  // },
  
  // 'claude-sonnet-3.5': { 
  //   tier: 'premium', 
  //   priority: 90,
  //   recommended: true,
  //   lowQuality: false,
  //   description: 'Claude 3.5 - Anthropic\'s balanced model with solid capabilities'
  // },
  // 'gemini-2.5': { 
  //   tier: 'premium', 
  //   priority: 85,
  //   recommended: false,
  //   lowQuality: false,
  //   description: 'Gemini 2.5 - Google\'s advanced model with balanced performance'
  // },
  // 'gpt-4o': { 
  //   tier: 'premium', 
  //   priority: 80,
  //   recommended: false,
  //   lowQuality: false,
  //   description: 'GPT-4o - OpenAI\'s current flagship model'
  // },
  // 'claude-haiku-3.5': { 
  //   tier: 'premium', 
  //   priority: 75,
  //   recommended: false,
  //   lowQuality: false,
  //   description: 'Claude Haiku 3.5 - Fast and efficient for quick tasks'
  // },
  // 'grok-3': { 
  //   tier: 'premium', 
  //   priority: 85,
  //   recommended: false,
  //   lowQuality: false,
  //   description: 'Grok-3 - X.AI\'s advanced model with real-time information'
  // },
  // 'gpt-4': { 
  //   tier: 'premium', 
  //   priority: 70,
  //   recommended: false,
  //   lowQuality: false,
  //   description: 'GPT-4 - OpenAI\'s highly capable model with advanced reasoning'
  // },
  // 'deepseek-chat-v3-0324': { 
  //   tier: 'premium', 
  //   priority: 75,
  //   recommended: true,
  //   lowQuality: false,
  //   description: 'DeepSeek Chat - Advanced AI assistant with strong reasoning'
  // },
  
  // Free tier models
  // 'deepseek-r1': { 
  //   tier: 'free', 
  //   priority: 60,
  //   recommended: false,
  //   lowQuality: false,
  //   description: 'DeepSeek R1 - Advanced model with enhanced reasoning and coding capabilities'
  // },
  // 'deepseek': { 
  //   tier: 'free', 
  //   priority: 50,
  //   recommended: false,
  //   lowQuality: true,
  //   description: 'DeepSeek - Free tier model with good general capabilities'
  // },
  // 'gemini-flash-2.5': { 
  //   tier: 'free', 
  //   priority: 50,
  //   recommended: false,
  //   lowQuality: true,
  //   description: 'Gemini Flash - Google\'s faster, more efficient model'
  // },
  // 'grok-3-mini': { 
  //   tier: 'free', 
  //   priority: 45,
  //   recommended: false,
  //   lowQuality: true,
  //   description: 'Grok-3 Mini - Smaller, faster version of Grok-3 for simpler tasks'
  // },
  // 'qwen3': { 
  //   tier: 'free', 
  //   priority: 40,
  //   recommended: false,
  //   lowQuality: true,
  //   description: 'Qwen3 - Alibaba\'s powerful multilingual language model'
  // },
};

// Model tier definitions
export const MODEL_TIERS = {
  premium: {
    requiresSubscription: true,
    baseDescription: 'Advanced model with superior capabilities'
  },
  free: {
    requiresSubscription: false,
    baseDescription: 'Available to all users'
  },
  custom: {
    requiresSubscription: false,
    baseDescription: 'User-defined model'
  }
};

// Helper to check if a user can access a model based on subscription status
export const canAccessModel = (
  subscriptionStatus: SubscriptionStatus,
  requiresSubscription: boolean,
): boolean => {
  if (isLocalMode()) {
    return true;
  }
  return subscriptionStatus === 'active' || !requiresSubscription;
};

// Helper to format a model name for display
export const formatModelName = (name: string): string => {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Add openrouter/ prefix to custom models
export const getPrefixedModelId = (modelId: string, isCustom: boolean): string => {
  if (isCustom && !modelId.startsWith('openrouter/')) {
    return `openrouter/${modelId}`;
  }
  return modelId;
};

// Helper to get custom models from localStorage
export const getCustomModels = (): CustomModel[] => {
  if (!isLocalMode() || typeof window === 'undefined') return [];
  
  try {
    const storedModels = localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS);
    if (!storedModels) return [];
    
    const parsedModels = JSON.parse(storedModels);
    if (!Array.isArray(parsedModels)) return [];
    
    return parsedModels
      .filter((model: any) => 
        model && typeof model === 'object' && 
        typeof model.id === 'string' && 
        typeof model.label === 'string');
  } catch (e) {
    console.error('Error parsing custom models:', e);
    return [];
  }
};

// Helper to save model preference to localStorage safely
const saveModelPreference = (modelId: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY_MODEL, modelId);
  } catch (error) {
    console.warn('Failed to save model preference to localStorage:', error);
  }
};

export const useModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_FREE_MODEL_ID);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  
  const { data: subscriptionData } = useSubscription();
  const { data: modelsData, isLoading: isLoadingModels } = useAvailableModels({
    refetchOnMount: false,
  });
  
  const subscriptionStatus: SubscriptionStatus = subscriptionData?.status === 'active' 
    ? 'active' 
    : 'no_subscription';

  // Function to refresh custom models from localStorage
  const refreshCustomModels = () => {
    if (isLocalMode() && typeof window !== 'undefined') {
      const freshCustomModels = getCustomModels();
      setCustomModels(freshCustomModels);
    }
  };

  // Load custom models from localStorage
  useEffect(() => {
    refreshCustomModels();
  }, []);

  // Generate model options list with consistent structure
  const MODEL_OPTIONS = useMemo(() => {
    let models = [];
    
    // Default models if API data not available
    if (!modelsData?.models || isLoadingModels) {
      models = [
        { 
          id: DEFAULT_FREE_MODEL_ID, 
          label: 'Omni 4', 
          requiresSubscription: false,
          description: MODELS[DEFAULT_FREE_MODEL_ID]?.description || MODEL_TIERS.free.baseDescription,
          priority: MODELS[DEFAULT_FREE_MODEL_ID]?.priority || 50
        },
        { 
          id: DEFAULT_PREMIUM_MODEL_ID, 
          label: 'Omni 4', 
          requiresSubscription: false, 
          description: MODELS[DEFAULT_PREMIUM_MODEL_ID]?.description || MODEL_TIERS.premium.baseDescription,
          priority: MODELS[DEFAULT_PREMIUM_MODEL_ID]?.priority || 100
        },
      ];
    } else {
      // Process API-provided models
      models = modelsData.models.map(model => {
        const shortName = model.short_name || model.id;
        // const displayName = model.display_name || shortName;  // OLD: Use API display name
        
        // NEW: Override display name for our custom model, otherwise use API display name
        let cleanLabel;
        if (shortName === 'claude-sonnet-4') {
          // Use our custom name for Claude Sonnet 4
          cleanLabel = 'Omni 4';
        } else {
          // OLD LOGIC: Use API display name and format it
          // const displayName = model.display_name || shortName;
          // cleanLabel = displayName;
          // if (cleanLabel.includes('/')) {
          //   cleanLabel = cleanLabel.split('/').pop() || cleanLabel;
          // }
          // cleanLabel = cleanLabel
          //   .replace(/-/g, ' ')
          //   .split(' ')
          //   .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          //   .join(' ');
          
          // NEW: Since we only have one model now, this shouldn't be reached
          const displayName = model.display_name || shortName;
          cleanLabel = displayName;
          if (cleanLabel.includes('/')) {
            cleanLabel = cleanLabel.split('/').pop() || cleanLabel;
          }
          cleanLabel = cleanLabel
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        
        // Get model data from our central MODELS constant
        const modelData = MODELS[shortName] || {};
        const isPremium = model?.requires_subscription || modelData.tier === 'premium' || false;
        
        return {
          id: shortName,
          label: cleanLabel,
          requiresSubscription: isPremium,
          description: modelData.description || 
            (isPremium ? MODEL_TIERS.premium.baseDescription : MODEL_TIERS.free.baseDescription),
          top: modelData.priority >= 90, // Mark high-priority models as "top"
          priority: modelData.priority || 0,
          lowQuality: modelData.lowQuality || false,
          recommended: modelData.recommended || false
        };
      });
    }
    
    // Add custom models if in local mode
    if (isLocalMode() && customModels.length > 0) {
      const customModelOptions = customModels.map(model => ({
        id: model.id,
        label: model.label || formatModelName(model.id),
        requiresSubscription: false,
        description: MODEL_TIERS.custom.baseDescription,
        top: false,
        isCustom: true,
        priority: 30, // Low priority by default
        lowQuality: false,
        recommended: false
      }));
      
      models = [...models, ...customModelOptions];
    }
    
    // Sort models consistently in one place:
    // 1. First by free/premium (free first)
    // 2. Then by priority (higher first)
    // 3. Finally by name (alphabetical)
    return models.sort((a, b) => {
      // First by free/premium status
      if (a.requiresSubscription !== b.requiresSubscription) {
        return a.requiresSubscription ? 1 : -1;
      }
      
      // Then by priority (higher first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Finally by name
      return a.label.localeCompare(b.label);
    });
  }, [modelsData, isLoadingModels, customModels]);

  // Get filtered list of models the user can access (no additional sorting)
  const availableModels = useMemo(() => {
    return isLocalMode() 
      ? MODEL_OPTIONS 
      : MODEL_OPTIONS.filter(model => 
          canAccessModel(subscriptionStatus, model.requiresSubscription)
        );
  }, [MODEL_OPTIONS, subscriptionStatus]);

  // Initialize selected model from localStorage or defaults
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const savedModel = localStorage.getItem(STORAGE_KEY_MODEL);
      
      // Local mode - allow any model
      if (isLocalMode()) {
        if (savedModel && MODEL_OPTIONS.find(option => option.id === savedModel)) {
          setSelectedModel(savedModel);
        } else {
          setSelectedModel(DEFAULT_PREMIUM_MODEL_ID);
          saveModelPreference(DEFAULT_PREMIUM_MODEL_ID);
        }
        return;
      }
      
      // Premium subscription - ALWAYS use premium model
      if (subscriptionStatus === 'active') {
        // If they had a premium model saved and it's still valid, use it
        const hasSavedPremiumModel = savedModel && 
          MODEL_OPTIONS.find(option => 
            option.id === savedModel && 
            option.requiresSubscription && 
            canAccessModel(subscriptionStatus, true)
          );
        
        // Otherwise use the default premium model
        if (hasSavedPremiumModel) {
          setSelectedModel(savedModel!);
        } else {
          setSelectedModel(DEFAULT_PREMIUM_MODEL_ID);
          saveModelPreference(DEFAULT_PREMIUM_MODEL_ID);
        }
        return;
      }
      
      // No subscription - use saved model if accessible (free tier), or default free
      if (savedModel) {
        const modelOption = MODEL_OPTIONS.find(option => option.id === savedModel);
        if (modelOption && canAccessModel(subscriptionStatus, modelOption.requiresSubscription)) {
          setSelectedModel(savedModel);
        } else {
          setSelectedModel(DEFAULT_FREE_MODEL_ID);
          saveModelPreference(DEFAULT_FREE_MODEL_ID);
        }
      } else {
        setSelectedModel(DEFAULT_FREE_MODEL_ID);
        saveModelPreference(DEFAULT_FREE_MODEL_ID);
      }
    } catch (error) {
      console.warn('Failed to load preferences from localStorage:', error);
      setSelectedModel(DEFAULT_FREE_MODEL_ID);
    }
  }, [subscriptionStatus, MODEL_OPTIONS]);

  // Handle model selection change
  const handleModelChange = (modelId: string) => {
    console.log('handleModelChange', modelId);
    
    // Refresh custom models from localStorage to ensure we have the latest
    if (isLocalMode()) {
      refreshCustomModels();
    }
    
    // First check if it's a custom model in local mode
    const isCustomModel = isLocalMode() && customModels.some(model => model.id === modelId);
    
    // Then check if it's in standard MODEL_OPTIONS
    const modelOption = MODEL_OPTIONS.find(option => option.id === modelId);
    
    // Check if model exists in either custom models or standard options
    if (!modelOption && !isCustomModel) {
      console.warn('Model not found in options:', modelId, MODEL_OPTIONS, isCustomModel, customModels);
      
      // Reset to default model when the selected model is not found
      const defaultModel = isLocalMode() ? DEFAULT_PREMIUM_MODEL_ID : DEFAULT_FREE_MODEL_ID;
      setSelectedModel(defaultModel);
      saveModelPreference(defaultModel);
      return;
    }

    // Check access permissions (except for custom models in local mode)
    if (!isCustomModel && !isLocalMode() && 
        !canAccessModel(subscriptionStatus, modelOption?.requiresSubscription ?? false)) {
      console.warn('Model not accessible:', modelId);
      return;
    }
    console.log('setting selected model', modelId);
    setSelectedModel(modelId);
    saveModelPreference(modelId);
  };

  // Get the actual model ID to send to the backend
  const getActualModelId = (modelId: string): string => {
    // No need for automatic prefixing in most cases - just return as is
    return modelId;
  };

  return {
    selectedModel,
    setSelectedModel: (modelId: string) => {
      handleModelChange(modelId);
    },
    subscriptionStatus,
    availableModels,
    allModels: MODEL_OPTIONS,  // Already pre-sorted
    customModels,
    getActualModelId,
    refreshCustomModels,
    canAccessModel: (modelId: string) => {
      if (isLocalMode()) return true;
      const model = MODEL_OPTIONS.find(m => m.id === modelId);
      return model ? canAccessModel(subscriptionStatus, model.requiresSubscription) : false;
    },
    isSubscriptionRequired: (modelId: string) => {
      return MODEL_OPTIONS.find(m => m.id === modelId)?.requiresSubscription || false;
    }
  };
};

// Export the hook but not any sorting logic - sorting is handled internally
