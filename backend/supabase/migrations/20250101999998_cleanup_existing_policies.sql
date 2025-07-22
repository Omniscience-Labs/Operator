BEGIN;

-- This migration runs early to clean up any existing policies that might conflict with later migrations
-- This helps when re-running migrations after partial failures

-- Clean up team_agents policies
DROP POLICY IF EXISTS team_agents_select ON team_agents;
DROP POLICY IF EXISTS team_agents_insert ON team_agents;
DROP POLICY IF EXISTS team_agents_delete ON team_agents;

-- Log what we're doing
DO $$
BEGIN
    RAISE NOTICE 'Cleaned up existing policies that might conflict with migrations';
END $$;

COMMIT; 