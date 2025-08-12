-- Add avatar and voice settings to agents table for custom video avatars
BEGIN;

-- Add new columns for video avatar configuration
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS video_avatar_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS video_voice_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS elevenlabs_voice_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_preset VARCHAR(50),
ADD COLUMN IF NOT EXISTS video_avatar_settings JSONB DEFAULT '{}'::jsonb;

-- Add index for avatar preset lookups
CREATE INDEX IF NOT EXISTS idx_agents_avatar_preset ON agents(avatar_preset);

-- Add comments for documentation
COMMENT ON COLUMN agents.video_avatar_id IS 'HeyGen avatar ID for video generation';
COMMENT ON COLUMN agents.video_voice_id IS 'HeyGen voice ID for video generation';
COMMENT ON COLUMN agents.elevenlabs_voice_id IS 'ElevenLabs voice ID for high-quality TTS';
COMMENT ON COLUMN agents.avatar_preset IS 'Predefined avatar-voice combination (professional_male, professional_female, etc.)';
COMMENT ON COLUMN agents.video_avatar_settings IS 'Additional avatar settings (voice_rate, voice_emotion, quality, etc.)';

COMMIT;