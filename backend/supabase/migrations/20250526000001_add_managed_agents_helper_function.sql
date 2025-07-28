BEGIN;

-- ADD MANAGED AGENTS HELPER FUNCTION
-- This migration adds a helper function to get managed agents for a user
-- 
-- NOTE: This migration is now handled entirely by 20250715000000_final_cleanup_and_fixes.sql
-- to avoid dependency issues when user_agent_library table doesn't exist yet.

DO $$
BEGIN
    RAISE NOTICE 'add_managed_agents_helper_function migration is now handled by final_cleanup_and_fixes migration to avoid dependency issues.';
END $$;

COMMIT; 