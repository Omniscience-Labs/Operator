BEGIN;

-- Add disable_customization to default sharing preferences
-- This allows agent creators to prevent others from customizing their agents when shared to marketplace

-- First ensure the sharing_preferences column exists
DO $$
BEGIN
    -- Check if agents table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
    ) THEN
        RAISE NOTICE 'Skipping disable_customization migration - agents table does not exist yet';
        RETURN;
    END IF;
    
    -- Add sharing_preferences column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'sharing_preferences'
    ) THEN
        ALTER TABLE agents ADD COLUMN sharing_preferences JSONB DEFAULT '{"include_knowledge_bases": true, "include_custom_mcp_tools": true, "disable_customization": false}'::jsonb;
        RAISE NOTICE 'Added sharing_preferences column to agents table';
    END IF;
    
    -- Update existing agents to have default sharing preferences with the new field
    UPDATE agents 
    SET sharing_preferences = COALESCE(
        sharing_preferences,
        '{}'::jsonb
    ) || '{"disable_customization": false}'::jsonb
    WHERE sharing_preferences IS NULL 
       OR NOT sharing_preferences ? 'disable_customization';
    
    -- Update the default sharing preferences for new agents
    -- This ensures all new agents have the disable_customization field set to false by default
    ALTER TABLE agents 
    ALTER COLUMN sharing_preferences 
    SET DEFAULT '{"include_knowledge_bases": true, "include_custom_mcp_tools": true, "disable_customization": false}'::jsonb;
    
    -- Create a comment explaining the new field
    COMMENT ON COLUMN agents.sharing_preferences IS 'JSONB containing sharing preferences: include_knowledge_bases, include_custom_mcp_tools, disable_customization';
    
    RAISE NOTICE 'Updated sharing_preferences with disable_customization field';
END $$;

-- Note: add_agent_to_library function update is handled by the final_cleanup_and_fixes migration
-- to avoid dependency issues when agents table doesn't exist yet

COMMIT; 