BEGIN;

-- FINAL CLEANUP AND FIXES MIGRATION
-- This migration runs after all others to ensure everything is properly set up
-- It handles cases where migrations ran out of order or tables/functions were missing

-- First, ensure all base tables exist with proper structure
-- This is idempotent - won't affect existing tables

-- 1. Fix agent_shares table if it exists without foreign key
DO $$
BEGIN
    -- Check if agent_shares exists and needs the foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_shares'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_shares' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'agent_shares_agent_id_fkey'
    ) THEN
        ALTER TABLE agent_shares 
        ADD CONSTRAINT agent_shares_agent_id_fkey 
        FOREIGN KEY (agent_id) 
        REFERENCES agents(agent_id) 
        ON DELETE CASCADE;
        RAISE NOTICE 'Added missing foreign key constraint for agent_shares.agent_id';
    END IF;
END $$;

-- 2. Ensure sharing_preferences column exists on agents table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'sharing_preferences'
    ) THEN
        ALTER TABLE agents ADD COLUMN sharing_preferences JSONB DEFAULT '{"include_knowledge_bases": true, "include_custom_mcp_tools": true, "managed_agent": false, "disable_customization": false}'::jsonb;
        CREATE INDEX IF NOT EXISTS idx_agents_sharing_preferences ON agents USING GIN (sharing_preferences);
        RAISE NOTICE 'Added missing sharing_preferences column to agents table';
    END IF;
END $$;

-- 3. Create or update add_agent_to_library function
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
    ) THEN
        DROP FUNCTION IF EXISTS add_agent_to_library(UUID, UUID);
        
        CREATE OR REPLACE FUNCTION add_agent_to_library(
            p_original_agent_id UUID,
            p_user_account_id UUID
        )
        RETURNS UUID
        SECURITY DEFINER
        LANGUAGE plpgsql
        AS $func$
        DECLARE
            v_new_agent_id UUID;
            v_original_agent agents%ROWTYPE;
            v_sharing_prefs JSONB;
            v_knowledge_bases JSONB;
            v_configured_mcps JSONB;
            v_custom_mcps JSONB;
            v_is_managed_agent BOOLEAN;
            v_disable_customization BOOLEAN;
        BEGIN
            SELECT * INTO v_original_agent
            FROM agents 
            WHERE agent_id = p_original_agent_id AND (is_public = true OR visibility = 'public');
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Agent not found or not public';
            END IF;
            
            IF EXISTS (
                SELECT 1 FROM user_agent_library 
                WHERE user_account_id = p_user_account_id 
                AND original_agent_id = p_original_agent_id
            ) THEN
                RAISE EXCEPTION 'Agent already in your library';
            END IF;
            
            -- Get sharing preferences with all defaults
            v_sharing_prefs := COALESCE(v_original_agent.sharing_preferences, '{"include_knowledge_bases": true, "include_custom_mcp_tools": true, "managed_agent": false, "disable_customization": false}'::jsonb);
            
            -- Check if this is a managed agent
            v_is_managed_agent := COALESCE((v_sharing_prefs->>'managed_agent')::boolean, false);
            v_disable_customization := COALESCE((v_sharing_prefs->>'disable_customization')::boolean, false);
            
            IF v_is_managed_agent THEN
                -- For managed agents, just store a reference without creating a copy
                INSERT INTO user_agent_library (
                    user_account_id,
                    original_agent_id,
                    agent_id
                ) VALUES (
                    p_user_account_id,
                    p_original_agent_id,
                    p_original_agent_id  -- Same ID - this is a reference, not a copy
                );
                
                v_new_agent_id := p_original_agent_id;
            ELSE
                -- For non-managed agents, create a copy
                -- Apply sharing preferences for knowledge bases
                v_knowledge_bases := CASE 
                    WHEN COALESCE((v_sharing_prefs->>'include_knowledge_bases')::boolean, true) = true 
                    THEN COALESCE(v_original_agent.knowledge_bases, '[]'::jsonb)
                    ELSE '[]'::jsonb
                END;
                
                -- Apply sharing preferences for configured MCPs
                v_configured_mcps := CASE 
                    WHEN COALESCE((v_sharing_prefs->>'include_custom_mcp_tools')::boolean, true) = true 
                    THEN COALESCE(v_original_agent.configured_mcps, '[]'::jsonb)
                    ELSE '[]'::jsonb
                END;
                
                -- Apply sharing preferences for custom MCPs
                v_custom_mcps := CASE 
                    WHEN COALESCE((v_sharing_prefs->>'include_custom_mcp_tools')::boolean, true) = true 
                    THEN COALESCE(v_original_agent.custom_mcps, '[]'::jsonb)
                    ELSE '[]'::jsonb
                END;
                
                -- Create a copy of the agent
                INSERT INTO agents (
                    account_id,
                    name,
                    description,
                    system_prompt,
                    configured_mcps,
                    custom_mcps,
                    agentpress_tools,
                    knowledge_bases,
                    is_default,
                    is_public,
                    visibility,
                    tags,
                    avatar,
                    avatar_color,
                    sharing_preferences
                ) VALUES (
                    p_user_account_id,
                    v_original_agent.name || ' (from marketplace)',
                    v_original_agent.description,
                    v_original_agent.system_prompt,
                    v_configured_mcps,
                    v_custom_mcps,
                    v_original_agent.agentpress_tools,
                    v_knowledge_bases,
                    false,
                    false,
                    'private',
                    v_original_agent.tags,
                    v_original_agent.avatar,
                    v_original_agent.avatar_color,
                    -- Store metadata for the copied agent
                    jsonb_build_object(
                        'disable_customization', v_disable_customization,
                        'original_agent_id', p_original_agent_id,
                        'is_marketplace_agent', true,
                        'include_knowledge_bases', COALESCE((v_sharing_prefs->>'include_knowledge_bases')::boolean, true),
                        'include_custom_mcp_tools', COALESCE((v_sharing_prefs->>'include_custom_mcp_tools')::boolean, true)
                    )
                ) RETURNING agent_id INTO v_new_agent_id;
                
                INSERT INTO user_agent_library (
                    user_account_id,
                    original_agent_id,
                    agent_id
                ) VALUES (
                    p_user_account_id,
                    p_original_agent_id,
                    v_new_agent_id
                );
            END IF;
            
            -- Increment download count for the original agent
            UPDATE agents 
            SET download_count = download_count + 1 
            WHERE agent_id = p_original_agent_id;
            
            RETURN v_new_agent_id;
        END;
        $func$;
        
        GRANT EXECUTE ON FUNCTION add_agent_to_library(UUID, UUID) TO authenticated;
        RAISE NOTICE 'Created/updated add_agent_to_library function';
    END IF;
END $$;

-- 4. Create or update get_managed_agents_for_user function
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_agent_library'
    ) THEN
        DROP FUNCTION IF EXISTS get_managed_agents_for_user(UUID);
        
        CREATE OR REPLACE FUNCTION get_managed_agents_for_user(p_user_id UUID)
        RETURNS TABLE(agent_id UUID, original_agent_id UUID)
        SECURITY DEFINER
        LANGUAGE SQL
        AS $func$
            SELECT ual.agent_id, ual.original_agent_id
            FROM user_agent_library ual
            WHERE ual.user_account_id = p_user_id 
            AND ual.agent_id = ual.original_agent_id;
        $func$;
        
        GRANT EXECUTE ON FUNCTION get_managed_agents_for_user(UUID) TO authenticated;
        RAISE NOTICE 'Created/updated get_managed_agents_for_user function';
    END IF;
END $$;

-- 5. Create or update get_shared_agent_by_token function
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_shares'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
    ) THEN
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
                    'access_count', share_record.access_count + 1,
                    'creator_name', creator_name,
                    'sharing_preferences', share_record.sharing_preferences
                ) AS share_info;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        GRANT EXECUTE ON FUNCTION get_shared_agent_by_token(TEXT) TO authenticated;
        RAISE NOTICE 'Created/updated get_shared_agent_by_token function';
    END IF;
END $$;

-- 6. Update agent_shares policies to include agent ownership check
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_shares'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
    ) THEN
        -- Drop and recreate the INSERT policy with full agent check
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
        RAISE NOTICE 'Updated agent_shares INSERT policy with agent ownership check';
    END IF;
END $$;

-- 7. Fix thread_views table if it exists without foreign key
DO $$
BEGIN
    -- Check if thread_views exists and needs the foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'thread_views'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'threads'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'thread_views' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'thread_views_thread_id_fkey'
    ) THEN
        ALTER TABLE thread_views 
        ADD CONSTRAINT thread_views_thread_id_fkey 
        FOREIGN KEY (thread_id) 
        REFERENCES threads(thread_id) 
        ON DELETE CASCADE;
        RAISE NOTICE 'Added missing foreign key constraint for thread_views.thread_id';
    END IF;
END $$;

-- 8. Create get_thread_statuses_for_account function if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_thread_statuses_for_account' 
        AND pg_function_is_visible(oid)
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'threads'
    ) THEN
        -- Create the function with the expected signature
        -- Using the simplest version (5 columns) to avoid conflicts
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
        AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                t.thread_id,
                FALSE as has_completed_agent_run,
                NULL::TIMESTAMPTZ as latest_completion_at,
                NULL::TIMESTAMPTZ as last_viewed_at,
                FALSE as has_unread_completion
            FROM threads t
            WHERE basejump.has_role_on_account(t.account_id) = true
            LIMIT 0; -- Placeholder implementation
        END;
        $func$;
        
        GRANT EXECUTE ON FUNCTION get_thread_statuses_for_account(UUID) TO authenticated;
        RAISE NOTICE 'Created placeholder get_thread_statuses_for_account function';
    END IF;
END $$;

-- 9. Ensure all tables are added to realtime publication
DO $$
BEGIN
    -- Check agent_runs
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_runs'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'agent_runs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE agent_runs;
        RAISE NOTICE 'Added agent_runs to supabase_realtime publication';
    END IF;
    
    -- Check threads
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'threads'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'threads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE threads;
        RAISE NOTICE 'Added threads to supabase_realtime publication';
    END IF;
    
    -- Check thread_views
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'thread_views'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'thread_views'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE thread_views;
        RAISE NOTICE 'Added thread_views to supabase_realtime publication';
    END IF;
END $$;

-- 10. Final verification and summary
DO $$
DECLARE
    v_summary TEXT := '';
BEGIN
    -- Check what's been set up
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_agent_to_library') THEN
        v_summary := v_summary || 'add_agent_to_library function: ✓' || E'\n';
    ELSE
        v_summary := v_summary || 'add_agent_to_library function: ✗' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_managed_agents_for_user') THEN
        v_summary := v_summary || 'get_managed_agents_for_user function: ✓' || E'\n';
    ELSE
        v_summary := v_summary || 'get_managed_agents_for_user function: ✗' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_shared_agent_by_token') THEN
        v_summary := v_summary || 'get_shared_agent_by_token function: ✓' || E'\n';
    ELSE
        v_summary := v_summary || 'get_shared_agent_by_token function: ✗' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_thread_statuses_for_account') THEN
        v_summary := v_summary || 'get_thread_statuses_for_account function: ✓' || E'\n';
    ELSE
        v_summary := v_summary || 'get_thread_statuses_for_account function: ✗' || E'\n';
    END IF;
    
    RAISE NOTICE E'Final cleanup migration complete. Status:\n%', v_summary;
END $$;

COMMIT; 