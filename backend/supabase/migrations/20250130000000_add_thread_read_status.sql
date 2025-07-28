BEGIN;

-- Create thread_views table to track when users last viewed threads
-- Check if threads table exists first
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'threads'
    ) THEN
        -- Threads table exists, create with foreign key
        CREATE TABLE IF NOT EXISTS thread_views (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            thread_id UUID NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
            account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
            last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            
            UNIQUE(thread_id, account_id)
        );
    ELSE
        -- Threads table doesn't exist yet, create without foreign key
        CREATE TABLE IF NOT EXISTS thread_views (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            thread_id UUID NOT NULL, -- No foreign key yet
            account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
            last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            
            UNIQUE(thread_id, account_id)
        );
        RAISE NOTICE 'thread_views table created without thread_id foreign key - will be added when threads table is created';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_thread_views_thread_id ON thread_views(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_views_account_id ON thread_views(account_id);
CREATE INDEX IF NOT EXISTS idx_thread_views_last_viewed_at ON thread_views(last_viewed_at);

-- Enable RLS
ALTER TABLE thread_views ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS thread_views_select_own ON thread_views;
CREATE POLICY thread_views_select_own ON thread_views
    FOR SELECT
    USING (basejump.has_role_on_account(account_id));

DROP POLICY IF EXISTS thread_views_insert_own ON thread_views;
CREATE POLICY thread_views_insert_own ON thread_views
    FOR INSERT
    WITH CHECK (basejump.has_role_on_account(account_id));

DROP POLICY IF EXISTS thread_views_update_own ON thread_views;
CREATE POLICY thread_views_update_own ON thread_views
    FOR UPDATE
    USING (basejump.has_role_on_account(account_id));

DROP POLICY IF EXISTS thread_views_delete_own ON thread_views;
CREATE POLICY thread_views_delete_own ON thread_views
    FOR DELETE
    USING (basejump.has_role_on_account(account_id));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_thread_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_thread_views_updated_at ON thread_views;
CREATE TRIGGER trigger_thread_views_updated_at
    BEFORE UPDATE ON thread_views
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_views_updated_at();

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE thread_views TO authenticated, service_role;

-- Drop the function if it exists to avoid conflicts with different return types
DROP FUNCTION IF EXISTS get_thread_statuses_for_account(UUID);

-- Function to get thread statuses for a user
CREATE OR REPLACE FUNCTION get_thread_statuses_for_account(p_account_id UUID)
RETURNS TABLE (
    thread_id UUID,
    has_completed_agent_run BOOLEAN,
    latest_completion_at TIMESTAMPTZ,
    last_viewed_at TIMESTAMPTZ,
    has_unread_completion BOOLEAN
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH thread_completions AS (
        -- Get the latest completed agent run for each thread
        SELECT 
            ar.thread_id,
            MAX(ar.completed_at) as latest_completion_at,
            COUNT(*) > 0 as has_completed_agent_run
        FROM agent_runs ar
        JOIN threads t ON ar.thread_id = t.thread_id
        WHERE ar.status = 'completed'
        AND ar.completed_at IS NOT NULL
        AND ar.completed_at > NOW() - INTERVAL '24 hours'  -- Only recent completions
        AND (
            basejump.has_role_on_account(t.account_id) = true OR 
            EXISTS (
                SELECT 1 FROM projects p 
                WHERE p.project_id = t.project_id 
                AND basejump.has_role_on_account(p.account_id) = true
            )
        )
        GROUP BY ar.thread_id
    ),
    thread_views_info AS (
        -- Get last viewed times for user
        SELECT 
            tv.thread_id,
            tv.last_viewed_at
        FROM thread_views tv
        WHERE tv.account_id = p_account_id
    )
    SELECT 
        tc.thread_id,
        COALESCE(tc.has_completed_agent_run, false) as has_completed_agent_run,
        tc.latest_completion_at,
        tv.last_viewed_at,
        CASE 
            WHEN tc.latest_completion_at IS NOT NULL 
            AND (tv.last_viewed_at IS NULL OR tc.latest_completion_at > tv.last_viewed_at)
            THEN true
            ELSE false
        END as has_unread_completion
    FROM thread_completions tc
    LEFT JOIN thread_views_info tv ON tc.thread_id = tv.thread_id
    WHERE tc.has_completed_agent_run = true;
END;
$$;

-- Function to mark thread as viewed
CREATE OR REPLACE FUNCTION mark_thread_as_viewed(p_thread_id UUID, p_account_id UUID)
RETURNS VOID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if user has access to thread
    IF NOT EXISTS (
        SELECT 1 FROM threads t
        LEFT JOIN projects p ON t.project_id = p.project_id
        WHERE t.thread_id = p_thread_id
        AND (
            basejump.has_role_on_account(t.account_id) = true OR 
            basejump.has_role_on_account(p.account_id) = true
        )
    ) THEN
        RAISE EXCEPTION 'Access denied to thread';
    END IF;

    -- Insert or update the view record
    INSERT INTO thread_views (thread_id, account_id, last_viewed_at)
    VALUES (p_thread_id, p_account_id, NOW())
    ON CONFLICT (thread_id, account_id)
    DO UPDATE SET 
        last_viewed_at = NOW(),
        updated_at = NOW();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_thread_statuses_for_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_thread_as_viewed(UUID, UUID) TO authenticated;

COMMIT; 