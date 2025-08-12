-- Add avatar and voice settings to agents table for custom video avatars
BEGIN;

-- Add new columns for video avatar configuration
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS video_avatar_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS selected_avatar VARCHAR(100),
ADD COLUMN IF NOT EXISTS selected_voice VARCHAR(100),
ADD COLUMN IF NOT EXISTS selected_position VARCHAR(50) DEFAULT 'center',
ADD COLUMN IF NOT EXISTS selected_background VARCHAR(50) DEFAULT 'white',
ADD COLUMN IF NOT EXISTS custom_avatar_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS custom_voice_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS elevenlabs_voice_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS custom_background_hex VARCHAR(7),
ADD COLUMN IF NOT EXISTS video_avatar_settings JSONB DEFAULT '{}'::jsonb;

-- Add indexes for lookups
CREATE INDEX IF NOT EXISTS idx_agents_video_avatar_enabled ON agents(video_avatar_enabled);
CREATE INDEX IF NOT EXISTS idx_agents_selected_avatar ON agents(selected_avatar);

-- Add comments for documentation
COMMENT ON COLUMN agents.video_avatar_enabled IS 'Whether video avatar is enabled for this agent';
COMMENT ON COLUMN agents.selected_avatar IS 'Selected avatar option key (e.g., wayne_professional)';
COMMENT ON COLUMN agents.selected_voice IS 'Selected voice option key (e.g., professional_male_1)';
COMMENT ON COLUMN agents.selected_position IS 'Avatar position (center, left, right)';
COMMENT ON COLUMN agents.selected_background IS 'Background option key (white, blue, custom, etc.)';
COMMENT ON COLUMN agents.custom_avatar_id IS 'Custom HeyGen avatar ID if using custom avatar';
COMMENT ON COLUMN agents.custom_voice_id IS 'Custom HeyGen voice ID if using custom voice';
COMMENT ON COLUMN agents.elevenlabs_voice_id IS 'ElevenLabs voice ID for high-quality TTS';
COMMENT ON COLUMN agents.custom_background_hex IS 'Custom hex color if background is set to custom';
COMMENT ON COLUMN agents.video_avatar_settings IS 'Additional avatar settings (voice_rate, voice_emotion, quality, etc.)';

COMMIT;