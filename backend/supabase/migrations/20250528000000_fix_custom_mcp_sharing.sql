BEGIN;

-- COMPREHENSIVE MCP SHARING FIX FOR MARKETPLACE AGENTS
-- This migration fixes the issue where custom MCPs weren't being shared when importing agents from marketplace
-- 
-- Key fixes:
-- 1. Ensures custom_mcps and sharing_preferences columns exist
-- 2. Updates get_marketplace_agents to include custom_mcps and proper team visibility
-- 3. Updates add_agent_to_library to respect sharing preferences for custom MCPs
-- 4. Adds proper indexes for performance

-- Ensure required columns exist for MCP sharing
ALTER TABLE agents ADD COLUMN IF NOT EXISTS custom_mcps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS sharing_preferences JSONB DEFAULT '{"include_knowledge_bases": true, "include_custom_mcp_tools": true}';

-- Update get_marketplace_agents function to include new fields and proper team visibility
DROP FUNCTION IF EXISTS get_marketplace_agents(INTEGER, INTEGER, TEXT, TEXT[], UUID);
DROP FUNCTION IF EXISTS get_marketplace_agents(INTEGER, INTEGER, TEXT, TEXT[]);

CREATE OR REPLACE FUNCTION get_marketplace_agents(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_account_id UUID DEFAULT NULL
)
RETURNS TABLE (
    agent_id UUID,
    name VARCHAR(255),
    description TEXT,
    system_prompt TEXT,
    configured_mcps JSONB,
    custom_mcps JSONB,
    agentpress_tools JSONB,
    knowledge_bases JSONB,
    sharing_preferences JSONB,
    tags TEXT[],
    download_count INTEGER,
    marketplace_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    creator_name TEXT,
    avatar TEXT,
    avatar_color TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.agent_id,
        a.name,
        a.description,
        a.system_prompt,
        a.configured_mcps,
        COALESCE(a.custom_mcps, '[]'::jsonb) as custom_mcps,
        a.agentpress_tools,
        COALESCE(a.knowledge_bases, '[]'::jsonb) as knowledge_bases,
        COALESCE(a.sharing_preferences, '{"include_knowledge_bases": true, "include_custom_mcp_tools": true}'::jsonb) as sharing_preferences,
        a.tags,
        a.download_count,
        a.marketplace_published_at,
        a.created_at,
        COALESCE(acc.name, 'Anonymous')::TEXT as creator_name,
        a.avatar::TEXT,
        a.avatar_color::TEXT
    FROM agents a
    LEFT JOIN basejump.accounts acc ON a.account_id = acc.id
    WHERE (
        -- Public marketplace agents (when no specific account context)
        (p_account_id IS NULL AND (a.is_public = true OR a.visibility = 'public'))
        OR
        -- Account-specific agents (for teams)
        (p_account_id IS NOT NULL AND (
            -- Own agents (created by the team)
            a.account_id = p_account_id
            OR
            -- Public agents (globally visible)
            a.is_public = true 
            OR a.visibility = 'public'
            OR
            -- Team-shared agents (shared with this team)
            (a.visibility = 'teams' AND EXISTS (
                SELECT 1 FROM team_agents ta
                WHERE ta.agent_id = a.agent_id
                AND ta.team_account_id = p_account_id
            ))
        ))
    )
    AND (p_search IS NULL OR 
         a.name ILIKE '%' || p_search || '%' OR 
         a.description ILIKE '%' || p_search || '%')
    AND (p_tags IS NULL OR a.tags && p_tags)
    ORDER BY a.marketplace_published_at DESC NULLS LAST, a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Update add_agent_to_library function to include knowledge_bases and respect sharing preferences
DROP FUNCTION IF EXISTS add_agent_to_library(UUID, UUID);

CREATE OR REPLACE FUNCTION add_agent_to_library(
    p_original_agent_id UUID,
    p_user_account_id UUID
)
RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_agent_id UUID;
    v_original_agent agents%ROWTYPE;
    v_sharing_prefs JSONB;
    v_knowledge_bases JSONB;
    v_configured_mcps JSONB;
    v_custom_mcps JSONB;
BEGIN
    SELECT * INTO v_original_agent
    FROM agents 
    WHERE agent_id = p_original_agent_id AND is_public = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agent not found or not public';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM user_agent_library 
        WHERE user_account_id = p_user_account_id 
        AND original_agent_id = p_original_agent_id
    ) THEN
        RAISE EXCEPTION 'Agent already in your library';
    END IF;
    
    -- Get sharing preferences
    v_sharing_prefs := COALESCE(v_original_agent.sharing_preferences, '{"include_knowledge_bases": true, "include_custom_mcp_tools": true}'::jsonb);
    
    -- Apply sharing preferences for knowledge bases
    v_knowledge_bases := CASE 
        WHEN (v_sharing_prefs->>'include_knowledge_bases')::boolean = true 
        THEN COALESCE(v_original_agent.knowledge_bases, '[]'::jsonb)
        ELSE '[]'::jsonb
    END;
    
    v_configured_mcps := CASE 
        WHEN (v_sharing_prefs->>'include_custom_mcp_tools')::boolean = true 
        THEN COALESCE(v_original_agent.configured_mcps, '[]'::jsonb)
        ELSE '[]'::jsonb
    END;
    
    v_custom_mcps := CASE 
        WHEN (v_sharing_prefs->>'include_custom_mcp_tools')::boolean = true 
        THEN COALESCE(v_original_agent.custom_mcps, '[]'::jsonb)
        ELSE '[]'::jsonb
    END;
    
    INSERT INTO agents (
        account_id,
        name,
        description,
        system_prompt,
        configured_mcps,
        custom_mcps,
        agentpress_tools,
        knowledge_bases,
        is_default,
        is_public,
        tags,
        avatar,
        avatar_color
    ) VALUES (
        p_user_account_id,
        v_original_agent.name || ' (from marketplace)',
        v_original_agent.description,
        v_original_agent.system_prompt,
        v_configured_mcps,
        v_custom_mcps,
        v_original_agent.agentpress_tools,
        v_knowledge_bases,
        false,
        false,
        v_original_agent.tags,
        v_original_agent.avatar,
        v_original_agent.avatar_color
    ) RETURNING agent_id INTO v_new_agent_id;
    
    INSERT INTO user_agent_library (
        user_account_id,
        original_agent_id,
        agent_id
    ) VALUES (
        p_user_account_id,
        p_original_agent_id,
        v_new_agent_id
    );
    
    UPDATE agents 
    SET download_count = download_count + 1 
    WHERE agent_id = p_original_agent_id;
    
    RETURN v_new_agent_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_marketplace_agents(INTEGER, INTEGER, TEXT, TEXT[], UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION add_agent_to_library(UUID, UUID) TO authenticated;

-- Create indexes if they don't exist for better performance
CREATE INDEX IF NOT EXISTS idx_agents_custom_mcps ON agents USING GIN (custom_mcps);
CREATE INDEX IF NOT EXISTS idx_agents_sharing_preferences ON agents USING GIN (sharing_preferences);

-- Update existing agents to have default sharing preferences if null
UPDATE agents 
SET sharing_preferences = '{"include_knowledge_bases": true, "include_custom_mcp_tools": true}'::jsonb
WHERE sharing_preferences IS NULL;

-- NOTE: This migration supersedes 20250705000000_fix_team_marketplace_agents.sql
-- which only fixes get_marketplace_agents but not add_agent_to_library.
-- This migration includes both fixes in one comprehensive update.

COMMIT; 