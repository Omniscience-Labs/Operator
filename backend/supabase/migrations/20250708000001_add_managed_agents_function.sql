BEGIN;

-- Drop existing get_managed_agents_for_user function first to avoid type conflicts
DROP FUNCTION IF EXISTS get_managed_agents_for_user(UUID);

-- Add get_managed_agents_for_user function that is referenced in Python code
-- This function returns managed agents (references) for a user

CREATE OR REPLACE FUNCTION get_managed_agents_for_user(
    p_user_id UUID
)
RETURNS TABLE (
    agent_id UUID,
    original_agent_id UUID,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ual.agent_id,
        ual.original_agent_id,
        ual.created_at
    FROM user_agent_library ual
    WHERE ual.user_account_id = p_user_id
    AND ual.agent_id = ual.original_agent_id  -- Only return managed agents (references, not copies)
    ORDER BY ual.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_managed_agents_for_user(UUID) TO authenticated;

COMMIT; 