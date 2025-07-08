BEGIN;

-- Add missing database functions for agent sharing functionality

-- Function to create agent share link (called by API)
CREATE OR REPLACE FUNCTION create_agent_share_link(
    p_agent_id UUID,
    p_share_type TEXT,
    p_expires_in_hours INTEGER DEFAULT NULL,
    p_max_uses INTEGER DEFAULT NULL,
    p_sharing_preferences JSONB DEFAULT '{}'
)
RETURNS TABLE (
    share_id UUID,
    token TEXT,
    share_url TEXT,
    expires_at TIMESTAMPTZ,
    sharing_preferences JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_creator_account_id UUID;
    v_new_share agent_shares%ROWTYPE;
    v_expires_at TIMESTAMPTZ;
    v_base_url TEXT;
BEGIN
    -- Get the agent owner
    SELECT account_id INTO v_creator_account_id
    FROM agents 
    WHERE agent_id = p_agent_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agent not found';
    END IF;
    
    -- Check if user has permission to share the agent
    IF v_creator_account_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied - not agent owner';
    END IF;
    
    -- Calculate expiration for ephemeral links
    IF p_share_type = 'ephemeral' AND p_expires_in_hours IS NOT NULL THEN
        v_expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;
    ELSE
        v_expires_at := NULL;
    END IF;
    
    -- Create the share link
    INSERT INTO agent_shares (
        agent_id,
        creator_account_id,
        share_type,
        expires_at,
        sharing_preferences,
        max_uses
    ) VALUES (
        p_agent_id,
        v_creator_account_id,
        p_share_type,
        v_expires_at,
        p_sharing_preferences,
        p_max_uses
    ) RETURNING * INTO v_new_share;
    
    -- Build share URL (use placeholder that frontend will replace)
    v_base_url := 'https://placeholder.com';
    
    RETURN QUERY SELECT 
        v_new_share.id as share_id,
        v_new_share.token,
        v_base_url || '/shared-agents/' || v_new_share.token as share_url,
        v_new_share.expires_at,
        v_new_share.sharing_preferences;
END;
$$;

-- Function to get shared agent (called by API - maps to our existing function)
CREATE OR REPLACE FUNCTION get_shared_agent(p_token TEXT)
RETURNS TABLE (
    agent_data JSONB,
    sharing_preferences JSONB,
    share_info JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result_record RECORD;
BEGIN
    -- Call our existing function
    SELECT * INTO result_record
    FROM get_shared_agent_by_token(p_token);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Share not found' USING ERRCODE = 'P0002';
    END IF;
    
    -- Return in the format expected by the API
    RETURN QUERY SELECT 
        result_record.agent_data,
        (result_record.share_info->>'sharing_preferences')::JSONB as sharing_preferences,
        result_record.share_info;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_agent_share_link(UUID, TEXT, INTEGER, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shared_agent(TEXT) TO authenticated;

COMMIT; 