BEGIN;

-- FIX SHARING PREFERENCES COLUMN
-- This migration adds the missing sharing_preferences column to the agents table
-- before the 20250113000000_restore_managed_agent_functionality.sql migration tries to use it

-- Only run if agents table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
    ) THEN
        -- Add sharing_preferences column if it doesn't exist
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS sharing_preferences JSONB DEFAULT '{"include_knowledge_bases": true, "include_custom_mcp_tools": true, "managed_agent": false, "disable_customization": false}'::jsonb;

        -- Create index for sharing_preferences for better performance
        CREATE INDEX IF NOT EXISTS idx_agents_sharing_preferences ON agents USING GIN (sharing_preferences);

        -- Update existing agents to have default sharing preferences if null
        UPDATE agents 
        SET sharing_preferences = '{"include_knowledge_bases": true, "include_custom_mcp_tools": true, "managed_agent": false, "disable_customization": false}'::jsonb
        WHERE sharing_preferences IS NULL;

        -- Add comment explaining the column
        COMMENT ON COLUMN agents.sharing_preferences IS 'Stores sharing preferences for marketplace agents including knowledge bases, MCP tools, managed agent settings, and customization restrictions';
        
        RAISE NOTICE 'Added/updated sharing_preferences column on agents table';
    ELSE
        RAISE NOTICE 'Skipping sharing_preferences column addition - agents table does not exist yet';
    END IF;
END $$;

COMMIT; 