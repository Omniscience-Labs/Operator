BEGIN;

-- Add disable_customization to default sharing preferences
-- This allows agent creators to prevent others from customizing their agents when shared to marketplace

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

-- Update get_marketplace_agents function to ensure it returns the disable_customization field
-- No changes needed to the function itself as it already returns the full sharing_preferences JSONB

-- Update add_agent_to_library function to store disable_customization metadata
-- This will be used to check if customization should be disabled for marketplace agents
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
    v_disable_customization BOOLEAN;
BEGIN
    SELECT * INTO v_original_agent
    FROM agents 
    WHERE agent_id = p_original_agent_id AND (is_public = true OR visibility = 'public');
    
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
    v_sharing_prefs := COALESCE(v_original_agent.sharing_preferences, '{"include_knowledge_bases": true, "include_custom_mcp_tools": true, "disable_customization": false}'::jsonb);
    
    -- Extract disable_customization preference
    v_disable_customization := COALESCE((v_sharing_prefs->>'disable_customization')::boolean, false);
    
    -- Apply sharing preferences for knowledge bases
    v_knowledge_bases := CASE 
        WHEN (v_sharing_prefs->>'include_knowledge_bases')::boolean = true 
        THEN COALESCE(v_original_agent.knowledge_bases, '[]'::jsonb)
        ELSE '[]'::jsonb
    END;
    
    -- Apply sharing preferences for configured MCPs
    v_configured_mcps := CASE 
        WHEN (v_sharing_prefs->>'include_custom_mcp_tools')::boolean = true 
        THEN COALESCE(v_original_agent.configured_mcps, '[]'::jsonb)
        ELSE '[]'::jsonb
    END;
    
    -- Apply sharing preferences for custom MCPs
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
        visibility,
        tags,
        avatar,
        avatar_color,
        -- Store customization restriction metadata
        sharing_preferences
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
        'private',
        v_original_agent.tags,
        v_original_agent.avatar,
        v_original_agent.avatar_color,
        -- Store the original sharing preferences including disable_customization
        -- This allows the frontend to check if customization should be disabled
        jsonb_build_object(
            'disable_customization', v_disable_customization,
            'original_agent_id', p_original_agent_id,
            'is_marketplace_agent', true
        )
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
GRANT EXECUTE ON FUNCTION add_agent_to_library(UUID, UUID) TO authenticated;

-- Create a comment explaining the new field
COMMENT ON COLUMN agents.sharing_preferences IS 'JSONB containing sharing preferences: include_knowledge_bases, include_custom_mcp_tools, disable_customization';

COMMIT; 