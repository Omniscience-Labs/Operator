BEGIN;

-- This migration runs early to clean up any existing functions that might conflict with later migrations
-- Using CASCADE to ensure all dependent objects are also dropped

-- Drop get_managed_agents_for_user function if it exists
-- This function has conflicting return types across different migrations
DROP FUNCTION IF EXISTS get_managed_agents_for_user(UUID) CASCADE;

-- Drop get_thread_statuses_for_account function if it exists
-- This function is defined with different column counts in multiple migrations:
-- - 20250130000000_add_thread_read_status.sql: 5 columns
-- - 20250130000001_add_running_status_tracking.sql: 6 columns  
-- - 20250131000000_fix_thread_status_function.sql: 6 columns
-- - 20250131000002_fix_thread_status_function_v2.sql: 7 columns
DROP FUNCTION IF EXISTS get_thread_statuses_for_account(UUID) CASCADE;

-- Log what we're doing for debugging
DO $$
BEGIN
    RAISE NOTICE 'Cleaned up conflicting functions get_managed_agents_for_user and get_thread_statuses_for_account';
END $$;

COMMIT; 