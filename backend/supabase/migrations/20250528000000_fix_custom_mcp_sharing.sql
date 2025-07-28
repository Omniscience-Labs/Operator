BEGIN;

-- FIX CUSTOM MCP SHARING
-- This migration fixes the issue where custom MCPs weren't being shared when importing agents from marketplace
-- 
-- NOTE: This migration is now handled entirely by 20250715000000_final_cleanup_and_fixes.sql
-- to avoid dependency issues when agents/user_agent_library tables don't exist yet.

DO $$
BEGIN
    RAISE NOTICE 'fix_custom_mcp_sharing migration is now handled by final_cleanup_and_fixes migration to avoid dependency issues.';
END $$;

COMMIT; 