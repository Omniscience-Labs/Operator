BEGIN;

-- FIX GET_MARKETPLACE_AGENTS FUNCTION BEFORE TEAM VISIBILITY MIGRATION
-- This migration drops the get_marketplace_agents function that was created by 
-- the 20250528000000_fix_custom_mcp_sharing.sql migration to prevent conflicts
-- with the 20250530000000_team_agent_visibility.sql migration

-- Drop the function that was created by the previous migration
DROP FUNCTION IF EXISTS get_marketplace_agents(INTEGER, INTEGER, TEXT, TEXT[], UUID);

COMMIT; 