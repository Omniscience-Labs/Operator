BEGIN;

-- Fix get_marketplace_agents function to return ALL expected fields
-- This addresses the KeyError: 'account_id' issue when get_agents is called with account_id parameter

DROP FUNCTION IF EXISTS get_marketplace_agents(INTEGER, INTEGER, TEXT, TEXT[], UUID);

CREATE OR REPLACE FUNCTION get_marketplace_agents(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_account_id UUID DEFAULT NULL
)
RETURNS TABLE (
    agent_id UUID,
    account_id UUID,
    name VARCHAR(255),
    description TEXT,
    system_prompt TEXT,
    configured_mcps JSONB,
    custom_mcps JSONB,
    agentpress_tools JSONB,
    knowledge_bases JSONB,
    sharing_preferences JSONB,
    is_default BOOLEAN,
    is_public BOOLEAN,
    visibility VARCHAR(20),
    tags TEXT[],
    download_count INTEGER,
    marketplace_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
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
        a.account_id,
        a.name,
        a.description,
        a.system_prompt,
        a.configured_mcps,
        COALESCE(a.custom_mcps, '[]'::jsonb) as custom_mcps,
        a.agentpress_tools,
        COALESCE(a.knowledge_bases, '[]'::jsonb) as knowledge_bases,
        COALESCE(a.sharing_preferences, '{"include_knowledge_bases": true, "include_custom_mcp_tools": true}'::jsonb) as sharing_preferences,
        a.is_default,
        a.is_public,
        COALESCE(a.visibility, 'private') as visibility,
        a.tags,
        a.download_count,
        a.marketplace_published_at,
        a.created_at,
        a.updated_at,
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_marketplace_agents(INTEGER, INTEGER, TEXT, TEXT[], UUID) TO authenticated, anon;

COMMIT; 