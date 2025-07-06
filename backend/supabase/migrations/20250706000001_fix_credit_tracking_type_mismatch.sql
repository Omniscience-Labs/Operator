BEGIN;

-- Fix the type mismatch in get_credit_usage_summary function
-- Change json_agg to jsonb_agg and json_build_object to jsonb_build_object
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
        jsonb_agg(
            jsonb_build_object(
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

COMMIT; 