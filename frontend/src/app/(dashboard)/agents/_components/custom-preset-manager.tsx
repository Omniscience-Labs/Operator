import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCustomAvatarPresets,
  useCreateCustomAvatarPreset,
  useUpdateCustomAvatarPreset,
  useDeleteCustomAvatarPreset,
  CreateCustomAvatarPresetRequest,
  CustomAvatarPreset
} from '@/hooks/react-query/avatar-presets/use-avatar-presets';

// Avatar and voice options (should match backend)
const AVATAR_OPTIONS = {
  "wayne_professional": {
    "avatar_id": "Wayne_20240711",
    "name": "Wayne (Professional Male)",
    "description": "Professional businessman in suit",
    "category": "professional",
    "gender": "male"
  },
  "anna_casual": {
    "avatar_id": "Anna_public_3_20240108",
    "name": "Anna (Casual Female)",
    "description": "Friendly casual presenter",
    "category": "casual",
    "gender": "female"
  },
  "josh_presenter": {
    "avatar_id": "josh_lite3_20230714",
    "name": "Josh (Presenter Male)",
    "description": "Professional presenter style",
    "category": "professional",
    "gender": "male"
  }
};

const VOICE_OPTIONS = {
  "professional_male_1": {
    "voice_id": "2EiwWnXFnvU5JabPnv8n",
    "name": "Professional Male Voice",
    "description": "Clear, authoritative business voice",
    "gender": "male",
    "accent": "american"
  },
  "professional_female_1": {
    "voice_id": "21m00Tcm4TlvDq8ikWAM",
    "name": "Professional Female Voice", 
    "description": "Warm, professional female voice",
    "gender": "female",
    "accent": "american"
  },
  "friendly_male_1": {
    "voice_id": "D38z5RcWu1voky8WS1ja",
    "name": "Friendly Male Voice",
    "description": "Approachable, conversational tone",
    "gender": "male",
    "accent": "american"
  }
};

const POSITION_OPTIONS = {
  "center": { "name": "Center", "description": "Avatar centered in frame" },
  "left": { "name": "Left", "description": "Avatar positioned on left side" },
  "right": { "name": "Right", "description": "Avatar positioned on right side" }
};

const BACKGROUND_OPTIONS = {
  "white": { "name": "White", "hex": "#FFFFFF", "description": "Clean white background" },
  "blue": { "name": "Blue", "hex": "#3B82F6", "description": "Professional blue background" },
  "green": { "name": "Green", "hex": "#10B981", "description": "Fresh green background" },
  "gray": { "name": "Gray", "hex": "#6B7280", "description": "Neutral gray background" },
  "custom": { "name": "Custom", "hex": "", "description": "Custom hex color" }
};

interface CustomPresetManagerProps {
  onPresetSelect?: (preset: CustomAvatarPreset) => void;
}

export const CustomPresetManager: React.FC<CustomPresetManagerProps> = ({ onPresetSelect }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<CustomAvatarPreset | null>(null);
  const [formData, setFormData] = useState<CreateCustomAvatarPresetRequest>({
    preset_name: '',
    description: '',
    avatar_type: 'heygen',
    avatar_id: '',
    voice_type: 'heygen',
    voice_id: '',
    position: 'center',
    background_type: 'preset',
    background_value: 'white'
  });

  const { data: presets = [], isLoading } = useCustomAvatarPresets();
  const createMutation = useCreateCustomAvatarPreset();
  const updateMutation = useUpdateCustomAvatarPreset();
  const deleteMutation = useDeleteCustomAvatarPreset();

  const handleInputChange = (field: keyof CreateCustomAvatarPresetRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      preset_name: '',
      description: '',
      avatar_type: 'heygen',
      avatar_id: '',
      voice_type: 'heygen',
      voice_id: '',
      position: 'center',
      background_type: 'preset',
      background_value: 'white'
    });
  };

  const handleCreate = async () => {
    if (!formData.preset_name.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (!formData.avatar_id.trim()) {
      toast.error('Please enter an avatar ID');
      return;
    }

    if (!formData.voice_id.trim()) {
      toast.error('Please enter a voice ID');
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      toast.success('Custom preset created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create preset');
    }
  };

  const handleEdit = (preset: CustomAvatarPreset) => {
    setEditingPreset(preset);
    setFormData({
      preset_name: preset.preset_name,
      description: preset.description || '',
      avatar_type: preset.avatar_type,
      avatar_id: preset.avatar_id,
      voice_type: preset.voice_type,
      voice_id: preset.voice_id,
      position: preset.position,
      background_type: preset.background_type,
      background_value: preset.background_value
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingPreset) return;

    try {
      await updateMutation.mutateAsync({
        preset_id: editingPreset.preset_id,
        data: formData
      });
      toast.success('Preset updated successfully');
      setIsCreateDialogOpen(false);
      setEditingPreset(null);
      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update preset');
    }
  };

  const handleDelete = async (preset: CustomAvatarPreset) => {
    try {
      await deleteMutation.mutateAsync(preset.preset_id);
      toast.success('Preset deleted successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete preset');
    }
  };

  const getAvatarDisplayName = (avatarId: string, avatarType: string) => {
    if (avatarType === 'custom') return `Custom: ${avatarId}`;
    const option = Object.values(AVATAR_OPTIONS).find(opt => opt.avatar_id === avatarId);
    return option ? option.name : avatarId;
  };

  const getVoiceDisplayName = (voiceId: string, voiceType: string) => {
    if (voiceType === 'elevenlabs') return `ElevenLabs: ${voiceId}`;
    if (voiceType === 'custom') return `Custom HeyGen: ${voiceId}`;
    const option = Object.values(VOICE_OPTIONS).find(opt => opt.voice_id === voiceId);
    return option ? option.name : voiceId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading presets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">My Custom Presets</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { resetForm(); setEditingPreset(null); }}>
              <Plus className="h-4 w-4 mr-1" />
              Create Preset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPreset ? 'Edit Custom Preset' : 'Create Custom Preset'}</DialogTitle>
              <DialogDescription>
                Save your avatar and voice combinations as reusable presets.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Preset Name and Description */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preset-name">Preset Name *</Label>
                  <Input
                    id="preset-name"
                    value={formData.preset_name}
                    onChange={(e) => handleInputChange('preset_name', e.target.value)}
                    placeholder="e.g., Professional Wayne"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preset-description">Description</Label>
                  <Input
                    id="preset-description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              {/* Avatar Configuration */}
              <div className="space-y-4">
                <h4 className="font-medium">Avatar Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="avatar-type">Avatar Type</Label>
                    <select
                      id="avatar-type"
                      className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                      value={formData.avatar_type}
                      onChange={(e) => handleInputChange('avatar_type', e.target.value)}
                    >
                      <option value="heygen">HeyGen (Curated)</option>
                      <option value="custom">Custom Avatar ID</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avatar-id">
                      {formData.avatar_type === 'custom' ? 'Custom Avatar ID *' : 'Select Avatar *'}
                    </Label>
                    {formData.avatar_type === 'custom' ? (
                      <Input
                        id="avatar-id"
                        value={formData.avatar_id}
                        onChange={(e) => handleInputChange('avatar_id', e.target.value)}
                        placeholder="e.g., Wayne_20240711"
                      />
                    ) : (
                      <select
                        id="avatar-id"
                        className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                        value={formData.avatar_id}
                        onChange={(e) => handleInputChange('avatar_id', e.target.value)}
                      >
                        <option value="">Select Avatar</option>
                        {Object.entries(AVATAR_OPTIONS).map(([key, avatar]) => (
                          <option key={key} value={avatar.avatar_id}>
                            {avatar.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Voice Configuration */}
              <div className="space-y-4">
                <h4 className="font-medium">Voice Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="voice-type">Voice Type</Label>
                    <select
                      id="voice-type"
                      className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                      value={formData.voice_type}
                      onChange={(e) => handleInputChange('voice_type', e.target.value)}
                    >
                      <option value="heygen">HeyGen Voice</option>
                      <option value="elevenlabs">ElevenLabs Voice</option>
                      <option value="custom">Custom HeyGen Voice</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voice-id">
                      {formData.voice_type === 'elevenlabs' ? 'ElevenLabs Voice ID *' : 
                       formData.voice_type === 'custom' ? 'Custom Voice ID *' : 'Select Voice *'}
                    </Label>
                    {formData.voice_type === 'heygen' ? (
                      <select
                        id="voice-id"
                        className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                        value={formData.voice_id}
                        onChange={(e) => handleInputChange('voice_id', e.target.value)}
                      >
                        <option value="">Select Voice</option>
                        {Object.entries(VOICE_OPTIONS).map(([key, voice]) => (
                          <option key={key} value={voice.voice_id}>
                            {voice.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="voice-id"
                        value={formData.voice_id}
                        onChange={(e) => handleInputChange('voice_id', e.target.value)}
                        placeholder={
                          formData.voice_type === 'elevenlabs' 
                            ? 'e.g., 2EiwWnXFnvU5JabPnv8n' 
                            : 'Custom voice ID'
                        }
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Position and Background */}
              <div className="space-y-4">
                <h4 className="font-medium">Layout Settings</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <select
                      id="position"
                      className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                    >
                      {Object.entries(POSITION_OPTIONS).map(([key, pos]) => (
                        <option key={key} value={key}>
                          {pos.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="background-type">Background</Label>
                    <select
                      id="background-type"
                      className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                      value={formData.background_type}
                      onChange={(e) => handleInputChange('background_type', e.target.value)}
                    >
                      <option value="preset">Preset Color</option>
                      <option value="custom">Custom Hex</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="background-value">
                      {formData.background_type === 'custom' ? 'Hex Color' : 'Color'}
                    </Label>
                    {formData.background_type === 'custom' ? (
                      <Input
                        id="background-value"
                        value={formData.background_value}
                        onChange={(e) => handleInputChange('background_value', e.target.value)}
                        placeholder="#FFFFFF"
                      />
                    ) : (
                      <select
                        id="background-value"
                        className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                        value={formData.background_value}
                        onChange={(e) => handleInputChange('background_value', e.target.value)}
                      >
                        {Object.entries(BACKGROUND_OPTIONS).filter(([key]) => key !== 'custom').map(([key, bg]) => (
                          <option key={key} value={key}>
                            {bg.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingPreset(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingPreset ? handleUpdate : handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingPreset ? 'Update Preset' : 'Create Preset'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Presets List */}
      {presets.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">
          <p>No custom presets yet.</p>
          <p className="text-sm mt-1">Create your first preset to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {presets.map((preset) => (
            <Card key={preset.preset_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{preset.preset_name}</CardTitle>
                    {preset.description && (
                      <CardDescription className="mt-1">{preset.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {onPresetSelect && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPresetSelect(preset)}
                      >
                        Use Preset
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(preset)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Preset</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{preset.preset_name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(preset)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Avatar:</span>
                    <p className="text-muted-foreground mt-1">
                      {getAvatarDisplayName(preset.avatar_id, preset.avatar_type)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Voice:</span>
                    <p className="text-muted-foreground mt-1">
                      {getVoiceDisplayName(preset.voice_id, preset.voice_type)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Position:</span>
                    <p className="text-muted-foreground mt-1 capitalize">{preset.position}</p>
                  </div>
                  <div>
                    <span className="font-medium">Background:</span>
                    <p className="text-muted-foreground mt-1 capitalize">
                      {preset.background_type === 'custom' 
                        ? preset.background_value 
                        : BACKGROUND_OPTIONS[preset.background_value as keyof typeof BACKGROUND_OPTIONS]?.name || preset.background_value
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};