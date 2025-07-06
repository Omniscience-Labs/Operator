BEGIN;

-- Create helper function to get managed agents for a user
-- This function safely identifies managed agents where agent_id equals original_agent_id
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

-- Add comment explaining the function
COMMENT ON FUNCTION get_managed_agents_for_user(UUID) IS 'Returns managed agents for a user (where agent_id equals original_agent_id in user_agent_library).';

COMMIT; 