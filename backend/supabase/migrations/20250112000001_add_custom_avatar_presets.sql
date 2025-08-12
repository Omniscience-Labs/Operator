-- Add custom avatar presets table for user-defined avatar-voice combinations
BEGIN;

-- Create custom_avatar_presets table
CREATE TABLE IF NOT EXISTS custom_avatar_presets (
    preset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    preset_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Avatar configuration
    avatar_type VARCHAR(20) NOT NULL DEFAULT 'heygen', -- 'heygen' or 'custom'
    avatar_id VARCHAR(255), -- HeyGen avatar ID or custom avatar identifier
    
    -- Voice configuration  
    voice_type VARCHAR(20) NOT NULL DEFAULT 'heygen', -- 'heygen', 'elevenlabs', or 'custom'
    voice_id VARCHAR(255), -- Voice ID for the selected voice type
    
    -- Visual settings
    position VARCHAR(20) DEFAULT 'center', -- 'center', 'left', 'right'
    background_type VARCHAR(20) DEFAULT 'preset', -- 'preset' or 'custom'
    background_value VARCHAR(50) DEFAULT 'white', -- preset key or hex color
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_preset_name_per_account UNIQUE(account_id, preset_name),
    CONSTRAINT valid_avatar_type CHECK (avatar_type IN ('heygen', 'custom')),
    CONSTRAINT valid_voice_type CHECK (voice_type IN ('heygen', 'elevenlabs', 'custom')),
    CONSTRAINT valid_position CHECK (position IN ('center', 'left', 'right')),
    CONSTRAINT valid_background_type CHECK (background_type IN ('preset', 'custom'))
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_avatar_presets_account_id ON custom_avatar_presets(account_id);
CREATE INDEX IF NOT EXISTS idx_custom_avatar_presets_created_at ON custom_avatar_presets(created_at);

-- Add comments for documentation
COMMENT ON TABLE custom_avatar_presets IS 'User-defined custom avatar-voice presets for reusable video avatar configurations';
COMMENT ON COLUMN custom_avatar_presets.preset_name IS 'User-defined name for the preset (unique per account)';
COMMENT ON COLUMN custom_avatar_presets.avatar_type IS 'Type of avatar: heygen (curated) or custom (user-provided ID)';
COMMENT ON COLUMN custom_avatar_presets.avatar_id IS 'Avatar identifier - HeyGen avatar ID or custom reference';
COMMENT ON COLUMN custom_avatar_presets.voice_type IS 'Type of voice: heygen, elevenlabs, or custom';
COMMENT ON COLUMN custom_avatar_presets.voice_id IS 'Voice identifier for the selected voice type';
COMMENT ON COLUMN custom_avatar_presets.background_type IS 'Background type: preset (predefined) or custom (hex color)';
COMMENT ON COLUMN custom_avatar_presets.background_value IS 'Background value - preset key or hex color code';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_avatar_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_custom_avatar_presets_updated_at ON custom_avatar_presets;
CREATE TRIGGER trigger_custom_avatar_presets_updated_at
    BEFORE UPDATE ON custom_avatar_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_avatar_presets_updated_at();

-- Enable RLS on custom_avatar_presets table
ALTER TABLE custom_avatar_presets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS custom_avatar_presets_select_own ON custom_avatar_presets;
DROP POLICY IF EXISTS custom_avatar_presets_insert_own ON custom_avatar_presets;
DROP POLICY IF EXISTS custom_avatar_presets_update_own ON custom_avatar_presets;
DROP POLICY IF EXISTS custom_avatar_presets_delete_own ON custom_avatar_presets;

-- Policy for users to see their own presets
CREATE POLICY custom_avatar_presets_select_own ON custom_avatar_presets
    FOR SELECT
    USING (account_id = (select auth.jwt() ->> 'sub')::uuid);

-- Policy for users to insert their own presets
CREATE POLICY custom_avatar_presets_insert_own ON custom_avatar_presets
    FOR INSERT
    WITH CHECK (account_id = (select auth.jwt() ->> 'sub')::uuid);

-- Policy for users to update their own presets
CREATE POLICY custom_avatar_presets_update_own ON custom_avatar_presets
    FOR UPDATE
    USING (account_id = (select auth.jwt() ->> 'sub')::uuid)
    WITH CHECK (account_id = (select auth.jwt() ->> 'sub')::uuid);

-- Policy for users to delete their own presets
CREATE POLICY custom_avatar_presets_delete_own ON custom_avatar_presets
    FOR DELETE
    USING (account_id = (select auth.jwt() ->> 'sub')::uuid);

COMMIT;