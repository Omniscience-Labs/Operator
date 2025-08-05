BEGIN;

-- Fix for agent sharing: Update get_shared_agent_by_token to use direct columns for creator_name
CREATE OR REPLACE FUNCTION get_shared_agent_by_token(share_token TEXT)
RETURNS TABLE (
    agent_data JSONB,
    share_info JSONB
) AS $func$
DECLARE
    share_record agent_shares%ROWTYPE;
    agent_record agents%ROWTYPE;
    creator_name TEXT;
BEGIN
    -- Find the share record
    SELECT * INTO share_record
    FROM agent_shares
    WHERE token = share_token;
    
    -- Check if share exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Share not found' USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if share has expired
    IF share_record.expires_at IS NOT NULL AND share_record.expires_at < NOW() THEN
        RAISE EXCEPTION 'Share has expired' USING ERRCODE = 'P0003';
    END IF;
    
    -- Check if share has reached max uses
    IF share_record.max_uses IS NOT NULL AND share_record.access_count >= share_record.max_uses THEN
        RAISE EXCEPTION 'Share has reached maximum uses' USING ERRCODE = 'P0004';
    END IF;
    
    -- Get the agent
    SELECT * INTO agent_record
    FROM agents
    WHERE agent_id = share_record.agent_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agent not found' USING ERRCODE = 'P0002';
    END IF;
    
    -- Get creator name from accounts using direct columns
    SELECT
        COALESCE(
            name,
            full_name,
            email,
            'Unknown'
        ) INTO creator_name
    FROM basejump.accounts
    WHERE id = share_record.creator_account_id;
    
    -- Increment access count
    UPDATE agent_shares
    SET access_count = access_count + 1,
        updated_at = NOW()
    WHERE id = share_record.id;
    
    -- Apply sharing preferences to filter agent data
    IF share_record.sharing_preferences IS NOT NULL THEN
        -- Filter knowledge bases if not included
        IF (share_record.sharing_preferences->>'include_knowledge_bases')::boolean = false THEN
            agent_record.knowledge_bases = '[]'::jsonb;
        END IF;
        
        -- Filter custom MCP tools if not included
        IF (share_record.sharing_preferences->>'include_custom_mcp_tools')::boolean = false THEN
            agent_record.configured_mcps = '[]'::jsonb;
            agent_record.custom_mcps = '[]'::jsonb;
        END IF;
    END IF;
    
    -- Return the data
    RETURN QUERY SELECT
        row_to_json(agent_record)::jsonb AS agent_data,
        jsonb_build_object(
            'share_type', share_record.share_type,
            'expires_at', share_record.expires_at,
            'access_count', share_record.access_count + 1,
            'creator_name', creator_name,
            'sharing_preferences', share_record.sharing_preferences
        ) AS share_info;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_shared_agent_by_token(TEXT) TO authenticated;

COMMIT;