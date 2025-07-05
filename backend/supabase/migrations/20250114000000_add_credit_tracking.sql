BEGIN;

-- Add reasoning and credit tracking columns to agent_runs
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS reasoning_mode VARCHAR(10) DEFAULT 'none';
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS total_time_minutes DECIMAL(10,4) DEFAULT 0;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS conversation_credits DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS tool_credits DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS total_credits DECIMAL(10,2) DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_runs_reasoning_mode ON agent_runs(reasoning_mode);
CREATE INDEX IF NOT EXISTS idx_agent_runs_total_credits ON agent_runs(total_credits);

-- Create credit_usage table for detailed tracking
CREATE TABLE IF NOT EXISTS credit_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    usage_type VARCHAR(20) NOT NULL, -- 'conversation', 'tool', 'reasoning', 'data_provider'
    tool_name VARCHAR(100), -- NULL for conversation credits
    data_provider_name VARCHAR(50), -- Specific provider name (linkedin, twitter, etc.)
    credit_amount DECIMAL(10,2) NOT NULL,
    calculation_details JSONB DEFAULT '{}'::jsonb, -- Store rate, time, multipliers, payload info
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_usage_agent_run_id ON credit_usage(agent_run_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_type ON credit_usage(usage_type);
CREATE INDEX IF NOT EXISTS idx_credit_usage_tool_name ON credit_usage(tool_name);
CREATE INDEX IF NOT EXISTS idx_credit_usage_data_provider ON credit_usage(data_provider_name);
CREATE INDEX IF NOT EXISTS idx_credit_usage_created_at ON credit_usage(created_at);

-- Enable RLS
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;

-- Credit usage policies (inherit from agent_runs)
DROP POLICY IF EXISTS credit_usage_select_policy ON credit_usage;
CREATE POLICY credit_usage_select_policy ON credit_usage
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM agent_runs ar
            JOIN threads t ON ar.thread_id = t.thread_id
            WHERE ar.id = credit_usage.agent_run_id
            AND basejump.has_role_on_account(t.account_id) = true
        )
    );

DROP POLICY IF EXISTS credit_usage_insert_policy ON credit_usage;
CREATE POLICY credit_usage_insert_policy ON credit_usage
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM agent_runs ar
            JOIN threads t ON ar.thread_id = t.thread_id
            WHERE ar.id = credit_usage.agent_run_id
            AND basejump.has_role_on_account(t.account_id) = true
        )
    );

DROP POLICY IF EXISTS credit_usage_update_policy ON credit_usage;
CREATE POLICY credit_usage_update_policy ON credit_usage
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM agent_runs ar
            JOIN threads t ON ar.thread_id = t.thread_id
            WHERE ar.id = credit_usage.agent_run_id
            AND basejump.has_role_on_account(t.account_id) = true
        )
    );

DROP POLICY IF EXISTS credit_usage_delete_policy ON credit_usage;
CREATE POLICY credit_usage_delete_policy ON credit_usage
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM agent_runs ar
            JOIN threads t ON ar.thread_id = t.thread_id
            WHERE ar.id = credit_usage.agent_run_id
            AND basejump.has_role_on_account(t.account_id) = true
        )
    );

-- Create a function to get credit usage summary
CREATE OR REPLACE FUNCTION get_credit_usage_summary(p_agent_run_id UUID)
RETURNS TABLE (
    usage_type VARCHAR(20),
    total_credits DECIMAL(10,2),
    usage_count INTEGER,
    details JSONB
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cu.usage_type,
        SUM(cu.credit_amount) as total_credits,
        COUNT(*)::INTEGER as usage_count,
        json_agg(
            json_build_object(
                'tool_name', cu.tool_name,
                'data_provider_name', cu.data_provider_name,
                'credit_amount', cu.credit_amount,
                'created_at', cu.created_at
            )
        ) as details
    FROM credit_usage cu
    WHERE cu.agent_run_id = p_agent_run_id
    GROUP BY cu.usage_type
    ORDER BY total_credits DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_credit_usage_summary(UUID) TO authenticated, service_role;

COMMIT; 