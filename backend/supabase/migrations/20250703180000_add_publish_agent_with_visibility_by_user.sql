BEGIN;

-- Create a new function that accepts user_id explicitly instead of relying on auth.uid()
-- This fixes the issue where SERVICE_ROLE client doesn't have auth context
CREATE OR REPLACE FUNCTION publish_agent_with_visibility_by_user(
    p_agent_id UUID,
    p_visibility VARCHAR(20),
    p_user_id UUID,
    p_team_ids UUID[] DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_agent_owner UUID;
BEGIN
    -- Get the agent owner
    SELECT account_id INTO v_agent_owner
    FROM agents 
    WHERE agent_id = p_agent_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agent not found';
    END IF;
    
    -- Check if user has permission to modify the agent
    IF v_agent_owner != p_user_id THEN
        RAISE EXCEPTION 'Access denied - not agent owner';
    END IF;
    
    -- Check if user is owner of their account
    IF NOT EXISTS (
        SELECT 1 FROM basejump.account_user 
        WHERE user_id = p_user_id AND account_id = v_agent_owner AND account_role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Access denied - not account owner';
    END IF;
    
    -- Update agent visibility
    UPDATE agents 
    SET 
        visibility = p_visibility,
        is_public = (p_visibility = 'public'),
        marketplace_published_at = CASE 
            WHEN p_visibility = 'public' THEN NOW()
            WHEN p_visibility = 'private' THEN NULL
            ELSE marketplace_published_at
        END
    WHERE agent_id = p_agent_id;
    
    -- Handle team sharing
    IF p_visibility = 'teams' AND p_team_ids IS NOT NULL THEN
        -- Remove existing team shares
        DELETE FROM team_agents WHERE agent_id = p_agent_id;
        
        -- Validate user is owner of all target teams
        IF EXISTS (
            SELECT 1 FROM unnest(p_team_ids) AS team_id
            WHERE NOT EXISTS (
                SELECT 1 FROM basejump.account_user 
                WHERE user_id = p_user_id AND account_id = team_id AND account_role = 'owner'
            )
        ) THEN
            RAISE EXCEPTION 'Access denied - not owner of all target teams';
        END IF;
        
        -- Add new team shares
        INSERT INTO team_agents (agent_id, team_account_id, shared_by_account_id)
        SELECT 
            p_agent_id,
            unnest(p_team_ids),
            p_user_id;
    ELSIF p_visibility != 'teams' THEN
        -- Remove all team shares if not teams visibility
        DELETE FROM team_agents WHERE agent_id = p_agent_id;
    END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION publish_agent_with_visibility_by_user TO authenticated;

COMMIT; 