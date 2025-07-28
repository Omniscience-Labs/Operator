BEGIN;

-- Drop the existing get_managed_agents_for_user function before the restore migration tries to recreate it
-- The existing function returns 3 columns (agent_id, original_agent_id, created_at)
-- but the restore migration wants to create a function that returns only 2 columns (agent_id, original_agent_id)
-- This causes a conflict: "cannot change return type of existing function"
DROP FUNCTION IF EXISTS get_managed_agents_for_user(UUID);

-- Also drop get_thread_statuses_for_account function as it has conflicting return types across migrations
-- The function is redefined with different column counts in multiple migrations
DROP FUNCTION IF EXISTS get_thread_statuses_for_account(UUID);

COMMIT; 