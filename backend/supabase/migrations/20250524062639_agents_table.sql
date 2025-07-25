BEGIN;

-- Create agents table for storing agent configurations
CREATE TABLE IF NOT EXISTS agents (
    agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    configured_mcps JSONB DEFAULT '[]'::jsonb,
    agentpress_tools JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    avatar VARCHAR(10),
    avatar_color VARCHAR(7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance on agents table
CREATE INDEX IF NOT EXISTS idx_agents_account_id ON agents(account_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_default ON agents(is_default);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at);

-- Add unique constraint to ensure only one default agent per account
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_account_default ON agents(account_id, is_default) WHERE is_default = true;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at (drop first if exists to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_agents_updated_at ON agents;
CREATE TRIGGER trigger_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_agents_updated_at();

-- Enable RLS on agents table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS agents_select_own ON agents;
DROP POLICY IF EXISTS agents_insert_own ON agents;
DROP POLICY IF EXISTS agents_update_own ON agents;
DROP POLICY IF EXISTS agents_delete_own ON agents;

-- Policy for users to see their own agents
CREATE POLICY agents_select_own ON agents
    FOR SELECT
    USING (basejump.has_role_on_account(account_id));

-- Policy for users to insert their own agents
CREATE POLICY agents_insert_own ON agents
    FOR INSERT
    WITH CHECK (basejump.has_role_on_account(account_id, 'owner'));

-- Policy for users to update their own agents
CREATE POLICY agents_update_own ON agents
    FOR UPDATE
    USING (basejump.has_role_on_account(account_id, 'owner'));

-- Policy for users to delete their own agents (except default)
CREATE POLICY agents_delete_own ON agents
    FOR DELETE
    USING (basejump.has_role_on_account(account_id, 'owner') AND is_default = false);

-- NOTE: Default agent insertion has been removed per requirement

-- Add agent_id column to threads table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='threads' AND column_name='agent_id') THEN
        ALTER TABLE threads ADD COLUMN agent_id UUID REFERENCES agents(agent_id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_threads_agent_id ON threads(agent_id);
        COMMENT ON COLUMN threads.agent_id IS 'ID of the agent used for this conversation thread. If NULL, uses account default agent.';
    END IF;
END $$;

-- Update existing threads to leave agent_id NULL (no default agents inserted)
-- (Optional: if you prefer to leave existing threads with NULL agent_id, this step can be omitted.)
-- UPDATE threads 
-- SET agent_id = NULL
-- WHERE agent_id IS NULL;

-- Add foreign key constraint to agent_shares if it exists without the constraint
-- This handles the case where agent_shares was created before agents table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_shares'
    ) THEN
        -- Add foreign key if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_schema = 'public' 
            AND table_name = 'agent_shares' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%agent_id%'
        ) THEN
            ALTER TABLE agent_shares 
            ADD CONSTRAINT agent_shares_agent_id_fkey 
            FOREIGN KEY (agent_id) 
            REFERENCES agents(agent_id) 
            ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraint for agent_shares.agent_id';
        END IF;
        
        -- Also update the INSERT policy to include agent ownership check
        DROP POLICY IF EXISTS "Users can create shares for their own agents" ON agent_shares;
        CREATE POLICY "Users can create shares for their own agents" ON agent_shares
            FOR INSERT WITH CHECK (
                creator_account_id = auth.uid() AND
                EXISTS (
                    SELECT 1 FROM agents 
                    WHERE agent_id = agent_shares.agent_id 
                    AND account_id = auth.uid()
                )
            );
        RAISE NOTICE 'Updated agent_shares INSERT policy to include agent ownership check';
        
        -- Also create the get_shared_agent_by_token function now that agents table exists
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
            
            -- Get creator name from profiles or accounts
            SELECT
                COALESCE(
                    (profile_data->>'name'),
                    (profile_data->>'full_name'),
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
                    'access_count', share_record.access_count + 1, -- Return updated count
                    'creator_name', creator_name,
                    'sharing_preferences', share_record.sharing_preferences
                ) AS share_info;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Grant execute permission on the function
        GRANT EXECUTE ON FUNCTION get_shared_agent_by_token(TEXT) TO authenticated;
        
        RAISE NOTICE 'Created get_shared_agent_by_token function';
    END IF;
    
    -- Check if we need to create the managed agent functions that were skipped
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'add_agent_to_library' 
        AND pg_function_is_visible(oid)
    ) THEN
        -- Run the restore managed agent functionality migration inline
        RAISE NOTICE 'Creating add_agent_to_library and get_managed_agents_for_user functions';
        
        -- Include the content from 20250113000000_restore_managed_agent_functionality.sql
        -- This ensures these functions are created when the agents table exists
        
        -- TODO: Copy the function definitions here or source them from the migration
        -- For now, just log that they should be created
        RAISE NOTICE 'Note: Run 20250113000000_restore_managed_agent_functionality.sql to create managed agent functions';
    END IF;
END $$;

COMMIT;
