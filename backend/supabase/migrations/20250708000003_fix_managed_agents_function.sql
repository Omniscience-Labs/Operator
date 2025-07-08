BEGIN;

-- Ensure user_agent_library table has the created_at column
ALTER TABLE user_agent_library 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows to have created_at if they don't
UPDATE user_agent_library 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- Drop and recreate the function with proper error handling
DROP FUNCTION IF EXISTS get_managed_agents_for_user(UUID);

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
        COALESCE(ual.created_at, NOW()) as created_at
    FROM user_agent_library ual
    WHERE ual.user_account_id = p_user_id
    AND ual.agent_id = ual.original_agent_id  -- Only return managed agents (references, not copies)
    ORDER BY COALESCE(ual.created_at, NOW()) DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_managed_agents_for_user(UUID) TO authenticated;

COMMIT; 