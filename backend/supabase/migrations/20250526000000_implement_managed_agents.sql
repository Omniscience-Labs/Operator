BEGIN;

-- Update add_agent_to_library function to handle managed agents
-- For managed agents, store a reference instead of creating a copy
-- This allows users to always see the latest version of the agent

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
    v_is_managed_agent BOOLEAN;
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
    v_sharing_prefs := COALESCE(v_original_agent.sharing_preferences, '{"include_knowledge_bases": true, "include_custom_mcp_tools": true, "managed_agent": false}'::jsonb);
    
    -- Check if this is a managed agent
    v_is_managed_agent := COALESCE((v_sharing_prefs->>'managed_agent')::boolean, false);
    
    IF v_is_managed_agent THEN
        -- For managed agents, just store a reference without creating a copy
        -- The agent_id in user_agent_library will be the same as original_agent_id
        INSERT INTO user_agent_library (
            user_account_id,
            original_agent_id,
            agent_id
        ) VALUES (
            p_user_account_id,
            p_original_agent_id,
            p_original_agent_id  -- Same ID - this is a reference, not a copy
        );
        
        v_new_agent_id := p_original_agent_id;
    ELSE
        -- For non-managed agents, create a copy as before
        -- Apply sharing preferences for knowledge bases
        v_knowledge_bases := CASE 
            WHEN COALESCE((v_sharing_prefs->>'include_knowledge_bases')::boolean, true) = true 
            THEN COALESCE(v_original_agent.knowledge_bases, '[]'::jsonb)
            ELSE '[]'::jsonb
        END;
        
        -- Apply sharing preferences for configured MCPs
        v_configured_mcps := CASE 
            WHEN COALESCE((v_sharing_prefs->>'include_custom_mcp_tools')::boolean, true) = true 
            THEN COALESCE(v_original_agent.configured_mcps, '[]'::jsonb)
            ELSE '[]'::jsonb
        END;
        
        -- Apply sharing preferences for custom MCPs
        v_custom_mcps := CASE 
            WHEN COALESCE((v_sharing_prefs->>'include_custom_mcp_tools')::boolean, true) = true 
            THEN COALESCE(v_original_agent.custom_mcps, '[]'::jsonb)
            ELSE '[]'::jsonb
        END;
        
        -- Create a copy of the agent
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
            -- Store metadata for the copied agent
            jsonb_build_object(
                'original_agent_id', p_original_agent_id,
                'is_marketplace_agent', true,
                'include_knowledge_bases', COALESCE((v_sharing_prefs->>'include_knowledge_bases')::boolean, true),
                'include_custom_mcp_tools', COALESCE((v_sharing_prefs->>'include_custom_mcp_tools')::boolean, true)
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
    END IF;
    
    -- Increment download count for the original agent
    UPDATE agents 
    SET download_count = download_count + 1 
    WHERE agent_id = p_original_agent_id;
    
    RETURN v_new_agent_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_agent_to_library(UUID, UUID) TO authenticated;

-- Create helper function to get managed agents for a user
CREATE OR REPLACE FUNCTION get_managed_agents_for_user(p_user_id UUID)
RETURNS TABLE(agent_id UUID, original_agent_id UUID)
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT ual.agent_id, ual.original_agent_id
    FROM user_agent_library ual
    WHERE ual.user_account_id = p_user_id 
    AND ual.agent_id = ual.original_agent_id;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_managed_agents_for_user(UUID) TO authenticated;

-- Create a comment explaining the managed agent workflow
COMMENT ON FUNCTION add_agent_to_library(UUID, UUID) IS 'Adds an agent to user library. For managed agents, creates a reference (live updates). For regular agents, creates a copy. Sharing preferences are applied at query time for managed agents.';
COMMENT ON FUNCTION get_managed_agents_for_user(UUID) IS 'Returns managed agents for a user (where agent_id equals original_agent_id in user_agent_library).';

COMMIT; 