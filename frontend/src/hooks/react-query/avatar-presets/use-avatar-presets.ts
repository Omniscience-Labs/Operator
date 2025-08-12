import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { backendApi } from '@/lib/api-client';

export interface CustomAvatarPreset {
  preset_id: string;
  account_id: string;
  preset_name: string;
  description?: string;
  avatar_type: 'heygen' | 'custom';
  avatar_id: string;
  voice_type: 'heygen' | 'elevenlabs' | 'custom';
  voice_id: string;
  position: 'center' | 'left' | 'right';
  background_type: 'preset' | 'custom';
  background_value: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomAvatarPresetRequest {
  preset_name: string;
  description?: string;
  avatar_type: 'heygen' | 'custom';
  avatar_id: string;
  voice_type: 'heygen' | 'elevenlabs' | 'custom';
  voice_id: string;
  position: 'center' | 'left' | 'right';
  background_type: 'preset' | 'custom';
  background_value: string;
}

export interface UpdateCustomAvatarPresetRequest {
  preset_name?: string;
  description?: string;
  avatar_type?: 'heygen' | 'custom';
  avatar_id?: string;
  voice_type?: 'heygen' | 'elevenlabs' | 'custom';
  voice_id?: string;
  position?: 'center' | 'left' | 'right';
  background_type?: 'preset' | 'custom';
  background_value?: string;
}

// Get all custom avatar presets
export const useCustomAvatarPresets = () => {
  return useQuery({
    queryKey: ['custom-avatar-presets'],
    queryFn: async (): Promise<CustomAvatarPreset[]> => {
      const response = await backendApi.get('/api/custom-avatar-presets');
      return response.data;
    },
  });
};

// Create a new custom avatar preset
export const useCreateCustomAvatarPreset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateCustomAvatarPresetRequest): Promise<CustomAvatarPreset> => {
      const response = await backendApi.post('/api/custom-avatar-presets', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-avatar-presets'] });
    },
  });
};

// Update a custom avatar preset
export const useUpdateCustomAvatarPreset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      preset_id, 
      data 
    }: { 
      preset_id: string; 
      data: UpdateCustomAvatarPresetRequest 
    }): Promise<CustomAvatarPreset> => {
      const response = await backendApi.put(`/api/custom-avatar-presets/${preset_id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-avatar-presets'] });
    },
  });
};

// Delete a custom avatar preset
export const useDeleteCustomAvatarPreset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (preset_id: string): Promise<{ message: string }> => {
      const response = await backendApi.delete(`/api/custom-avatar-presets/${preset_id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-avatar-presets'] });
    },
  });
};