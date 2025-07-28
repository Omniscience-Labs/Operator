BEGIN;

-- This migration runs early to clean up any existing policies that might conflict with later migrations
-- This helps when re-running migrations after partial failures

-- Clean up team_agents policies only if the table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'team_agents'
    ) THEN
        DROP POLICY IF EXISTS team_agents_select ON team_agents;
        DROP POLICY IF EXISTS team_agents_insert ON team_agents;
        DROP POLICY IF EXISTS team_agents_delete ON team_agents;
        RAISE NOTICE 'Cleaned up team_agents policies';
    ELSE
        RAISE NOTICE 'Skipping team_agents policy cleanup - table does not exist';
    END IF;
END $$;

COMMIT; 