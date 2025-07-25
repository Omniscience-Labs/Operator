BEGIN;

-- RESTORE MANAGED AGENT FUNCTIONALITY
-- This migration restores the managed agent logic that was accidentally removed by 
-- the 20250705200732_fix_custom_mcp_sharing_final.sql migration.
-- 
-- The managed agent feature allows users to get live references to agents instead of copies.
-- When an agent is published as "managed", users get the latest version automatically.
-- 
-- NOTE: This migration is now handled entirely by 20250715000000_final_cleanup_and_fixes.sql
-- to avoid dependency issues when agents table doesn't exist yet.

DO $$
BEGIN
    RAISE NOTICE 'restore_managed_agent_functionality migration is now handled by final_cleanup_and_fixes migration to avoid dependency issues.';
END $$;

COMMIT; 