BEGIN;

-- Update the function to also track running/connecting states
CREATE OR REPLACE FUNCTION get_thread_statuses_for_account(p_account_id UUID)
RETURNS TABLE (
    thread_id UUID,
    has_completed_agent_run BOOLEAN,
    latest_completion_at TIMESTAMPTZ,
    last_viewed_at TIMESTAMPTZ,
    has_unread_completion BOOLEAN,
    is_currently_running BOOLEAN,
    current_agent_status TEXT
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
    thread_running AS (
        -- Get currently running/connecting agent runs
        SELECT 
            ar.thread_id,
            ar.status as current_status,
            true as is_running
        FROM agent_runs ar
        JOIN threads t ON ar.thread_id = t.thread_id
        WHERE ar.status IN ('running', 'connecting', 'streaming')
        AND ar.started_at > NOW() - INTERVAL '2 hours'  -- Only recent runs
        AND (
            basejump.has_role_on_account(t.account_id) = true OR 
            EXISTS (
                SELECT 1 FROM projects p 
                WHERE p.project_id = t.project_id 
                AND basejump.has_role_on_account(p.account_id) = true
            )
        )
        ORDER BY ar.started_at DESC
        LIMIT 1  -- Most recent running agent per thread
    ),
    thread_views_info AS (
        -- Get last viewed times for user
        SELECT 
            tv.thread_id,
            tv.last_viewed_at
        FROM thread_views tv
        WHERE tv.account_id = p_account_id
    ),
    all_threads AS (
        -- Combine completed and running threads
        SELECT thread_id FROM thread_completions
        UNION
        SELECT thread_id FROM thread_running
    )
    SELECT 
        at.thread_id,
        COALESCE(tc.has_completed_agent_run, false) as has_completed_agent_run,
        tc.latest_completion_at,
        tv.last_viewed_at,
        CASE 
            WHEN tc.latest_completion_at IS NOT NULL 
            AND (tv.last_viewed_at IS NULL OR tc.latest_completion_at > tv.last_viewed_at)
            THEN true
            ELSE false
        END as has_unread_completion,
        COALESCE(tr.is_running, false) as is_currently_running,
        tr.current_status
    FROM all_threads at
    LEFT JOIN thread_completions tc ON at.thread_id = tc.thread_id
    LEFT JOIN thread_running tr ON at.thread_id = tr.thread_id
    LEFT JOIN thread_views_info tv ON at.thread_id = tv.thread_id
    WHERE tc.has_completed_agent_run = true OR tr.is_running = true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_thread_statuses_for_account(UUID) TO authenticated;

COMMIT; 