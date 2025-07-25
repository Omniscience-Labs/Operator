BEGIN;

-- Agent Share Links Migration
-- This migration adds functionality for sharing agents via direct links
-- Based on the invitation system patterns but customized for agent sharing

-- Create agent_shares table
-- First check if agents table exists, if not create the foreign key later
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
    ) THEN
        -- Agents table exists, create with foreign key
        CREATE TABLE IF NOT EXISTS agent_shares (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
            creator_account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
            token TEXT UNIQUE NOT NULL DEFAULT basejump.generate_token(32),
            share_type TEXT NOT NULL CHECK (share_type IN ('persistent', 'ephemeral')),
            expires_at TIMESTAMPTZ, -- NULL for persistent, date for ephemeral
            sharing_preferences JSONB DEFAULT '{}',
            access_count INTEGER DEFAULT 0,
            max_uses INTEGER, -- NULL for unlimited, number for limited
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- Agents table doesn't exist yet, create without foreign key
        CREATE TABLE IF NOT EXISTS agent_shares (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id UUID NOT NULL, -- No foreign key yet
            creator_account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
            token TEXT UNIQUE NOT NULL DEFAULT basejump.generate_token(32),
            share_type TEXT NOT NULL CHECK (share_type IN ('persistent', 'ephemeral')),
            expires_at TIMESTAMPTZ, -- NULL for persistent, date for ephemeral
            sharing_preferences JSONB DEFAULT '{}',
            access_count INTEGER DEFAULT 0,
            max_uses INTEGER, -- NULL for unlimited, number for limited
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'agent_shares table created without agent_id foreign key - will be added when agents table is created';
    END IF;
END $$;

-- Create indexes for agent_shares
CREATE INDEX IF NOT EXISTS idx_agent_shares_agent_id ON agent_shares(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_shares_creator_account_id ON agent_shares(creator_account_id);
CREATE INDEX IF NOT EXISTS idx_agent_shares_token ON agent_shares(token);
CREATE INDEX IF NOT EXISTS idx_agent_shares_expires_at ON agent_shares(expires_at);

-- Enable RLS on agent_shares
ALTER TABLE agent_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_shares
-- Create policies conditionally based on whether agents table exists
DO $$
BEGIN
    -- Always create basic policies that don't depend on agents table
    DROP POLICY IF EXISTS "Users can view their own agent shares" ON agent_shares;
    CREATE POLICY "Users can view their own agent shares" ON agent_shares
        FOR SELECT USING (creator_account_id = auth.uid());

    DROP POLICY IF EXISTS "Users can update their own agent shares" ON agent_shares;
    CREATE POLICY "Users can update their own agent shares" ON agent_shares
        FOR UPDATE USING (creator_account_id = auth.uid());

    DROP POLICY IF EXISTS "Users can delete their own agent shares" ON agent_shares;
    CREATE POLICY "Users can delete their own agent shares" ON agent_shares
        FOR DELETE USING (creator_account_id = auth.uid());

    -- Create INSERT policy based on whether agents table exists
    DROP POLICY IF EXISTS "Users can create shares for their own agents" ON agent_shares;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
    ) THEN
        -- Agents table exists, create policy with agent ownership check
        CREATE POLICY "Users can create shares for their own agents" ON agent_shares
            FOR INSERT WITH CHECK (
                creator_account_id = auth.uid() AND
                EXISTS (
                    SELECT 1 FROM agents 
                    WHERE agent_id = agent_shares.agent_id 
                    AND account_id = auth.uid()
                )
            );
    ELSE
        -- Agents table doesn't exist yet, create simpler policy
        CREATE POLICY "Users can create shares for their own agents" ON agent_shares
            FOR INSERT WITH CHECK (creator_account_id = auth.uid());
        RAISE NOTICE 'Created simplified INSERT policy for agent_shares - full policy will be added when agents table exists';
    END IF;
END $$;

-- Function to validate and get shared agent
-- Only create if agents table exists, otherwise it will be created later
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
    ) THEN
        EXECUTE '
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
                RAISE EXCEPTION ''Share not found'' USING ERRCODE = ''P0002'';
            END IF;
            
            -- Check if share has expired
            IF share_record.expires_at IS NOT NULL AND share_record.expires_at < NOW() THEN
                RAISE EXCEPTION ''Share has expired'' USING ERRCODE = ''P0003'';
            END IF;
            
            -- Check if share has reached max uses
            IF share_record.max_uses IS NOT NULL AND share_record.access_count >= share_record.max_uses THEN
                RAISE EXCEPTION ''Share has reached maximum uses'' USING ERRCODE = ''P0004'';
            END IF;
            
            -- Get the agent
            SELECT * INTO agent_record
            FROM agents
            WHERE agent_id = share_record.agent_id;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION ''Agent not found'' USING ERRCODE = ''P0002'';
            END IF;
            
            -- Get creator name from profiles or accounts
            SELECT
                COALESCE(
                    (profile_data->>''name''),
                    (profile_data->>''full_name''),
                    email,
                    ''Unknown''
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
                IF (share_record.sharing_preferences->>''include_knowledge_bases'')::boolean = false THEN
                    agent_record.knowledge_bases = ''[]''::jsonb;
                END IF;
                
                -- Filter custom MCP tools if not included
                IF (share_record.sharing_preferences->>''include_custom_mcp_tools'')::boolean = false THEN
                    agent_record.configured_mcps = ''[]''::jsonb;
                    agent_record.custom_mcps = ''[]''::jsonb;
                END IF;
            END IF;
            
            -- Return the data
            RETURN QUERY SELECT
                row_to_json(agent_record)::jsonb AS agent_data,
                jsonb_build_object(
                    ''share_type'', share_record.share_type,
                    ''expires_at'', share_record.expires_at,
                    ''access_count'', share_record.access_count + 1, -- Return updated count
                    ''creator_name'', creator_name,
                    ''sharing_preferences'', share_record.sharing_preferences
                ) AS share_info;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER';
    ELSE
        RAISE NOTICE 'Skipping get_shared_agent_by_token function creation - will be created when agents table exists';
    END IF;
END $$;

-- Function to cleanup expired shares
-- This function doesn't depend on agents table, so create it unconditionally
CREATE OR REPLACE FUNCTION cleanup_expired_agent_shares()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM agent_shares
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_agent_shares_updated_at ON agent_shares;
CREATE TRIGGER trigger_update_agent_shares_updated_at
    BEFORE UPDATE ON agent_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_shares_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_shares TO authenticated;

-- Grant permissions on functions conditionally
DO $$
BEGIN
    -- Grant permission on get_shared_agent_by_token if it exists
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_shared_agent_by_token' 
        AND pg_function_is_visible(oid)
    ) THEN
        GRANT EXECUTE ON FUNCTION get_shared_agent_by_token(TEXT) TO authenticated;
    END IF;
END $$;

-- cleanup_expired_agent_shares doesn't depend on agents table, so grant unconditionally
GRANT EXECUTE ON FUNCTION cleanup_expired_agent_shares() TO authenticated;

COMMIT; 