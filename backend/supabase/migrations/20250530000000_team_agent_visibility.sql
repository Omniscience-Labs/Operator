BEGIN;

-- Add visibility column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'teams'));

-- Create team_agents table to track which teams have access to which agents
CREATE TABLE IF NOT EXISTS team_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    team_account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    shared_by_account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(agent_id, team_account_id)
);

CREATE INDEX IF NOT EXISTS idx_team_agents_agent_id ON team_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_team_agents_team_account_id ON team_agents(team_account_id);
CREATE INDEX IF NOT EXISTS idx_team_agents_shared_by ON team_agents(shared_by_account_id);

-- Enable RLS on team_agents table
ALTER TABLE team_agents ENABLE ROW LEVEL SECURITY;

-- Policy for viewing team agents: team members can see agents shared with their team
CREATE POLICY team_agents_select ON team_agents
    FOR SELECT
    USING (basejump.has_role_on_account(team_account_id));

-- Policy for sharing agents: only team owners/admins can share agents
CREATE POLICY team_agents_insert ON team_agents
    FOR INSERT
    WITH CHECK (
        -- User must be owner of the agent they're sharing
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agent_id = team_agents.agent_id 
            AND account_id = auth.uid()
        )
        AND
        -- User must be owner of the team they're sharing to
        basejump.has_role_on_account(team_account_id, 'owner')
    );

-- Policy for removing shared agents: team owners can remove
CREATE POLICY team_agents_delete ON team_agents
    FOR DELETE
    USING (
        basejump.has_role_on_account(team_account_id, 'owner')
        OR shared_by_account_id = auth.uid()
    );

-- Update agents select policy to include team visibility
DROP POLICY IF EXISTS agents_select_marketplace ON agents;
CREATE POLICY agents_select_marketplace ON agents
    FOR SELECT
    USING (
        -- Public agents are visible to all
        is_public = true 
        OR visibility = 'public'
        OR
        -- Own agents are visible
        basejump.has_role_on_account(account_id)
        OR
        -- Team-shared agents are visible to team members
        (visibility = 'teams' AND EXISTS (
            SELECT 1 FROM team_agents ta
            WHERE ta.agent_id = agents.agent_id
            AND basejump.has_role_on_account(ta.team_account_id)
        ))
    );

-- Migrate existing is_public to visibility column
UPDATE agents 
SET visibility = CASE 
    WHEN is_public = true THEN 'public'
    ELSE 'private'
END
WHERE visibility IS NULL;

-- Function to publish agent with team visibility
CREATE OR REPLACE FUNCTION publish_agent_with_visibility(
    p_agent_id UUID,
    p_visibility VARCHAR(20),
    p_team_ids UUID[] DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_agent_owner UUID;
BEGIN
    -- Get the agent owner
    SELECT account_id INTO v_agent_owner
    FROM agents 
    WHERE agent_id = p_agent_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agent not found';
    END IF;
    
    -- Check if user has permission to modify the agent
    IF NOT basejump.has_role_on_account(v_agent_owner, 'owner') THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    -- Update agent visibility
    UPDATE agents 
    SET 
        visibility = p_visibility,
        is_public = (p_visibility = 'public'),
        marketplace_published_at = CASE 
            WHEN p_visibility = 'public' THEN NOW()
            WHEN p_visibility = 'private' THEN NULL
            ELSE marketplace_published_at
        END
    WHERE agent_id = p_agent_id;
    
    -- Handle team sharing
    IF p_visibility = 'teams' AND p_team_ids IS NOT NULL THEN
        -- Remove existing team shares
        DELETE FROM team_agents WHERE agent_id = p_agent_id;
        
        -- Add new team shares
        INSERT INTO team_agents (agent_id, team_account_id, shared_by_account_id)
        SELECT 
            p_agent_id,
            unnest(p_team_ids),
            auth.uid()
        WHERE basejump.has_role_on_account(unnest(p_team_ids), 'owner');
    ELSIF p_visibility != 'teams' THEN
        -- Remove all team shares if not teams visibility
        DELETE FROM team_agents WHERE agent_id = p_agent_id;
    END IF;
END;
$$;

-- Update get_marketplace_agents function to support account filtering
DROP FUNCTION IF EXISTS get_marketplace_agents(INTEGER, INTEGER, TEXT, TEXT[]);
CREATE OR REPLACE FUNCTION get_marketplace_agents(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_account_id UUID DEFAULT NULL
)
RETURNS TABLE (
    agent_id UUID,
    name VARCHAR(255),
    description TEXT,
    system_prompt TEXT,
    configured_mcps JSONB,
    agentpress_tools JSONB,
    tags TEXT[],
    download_count INTEGER,
    marketplace_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    creator_name TEXT,
    avatar TEXT,
    avatar_color TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.agent_id,
        a.name,
        a.description,
        a.system_prompt,
        a.configured_mcps,
        a.agentpress_tools,
        a.tags,
        a.download_count,
        a.marketplace_published_at,
        a.created_at,
        COALESCE(acc.name, 'Anonymous')::TEXT as creator_name,
        a.avatar::TEXT,
        a.avatar_color::TEXT
    FROM agents a
    LEFT JOIN basejump.accounts acc ON a.account_id = acc.id
    WHERE (
        -- Public marketplace agents
        (p_account_id IS NULL AND (a.is_public = true OR a.visibility = 'public'))
        OR
        -- Account-specific agents (for teams)
        (p_account_id IS NOT NULL AND (
            -- Own agents
            a.account_id = p_account_id
            OR
            -- Public agents
            a.is_public = true 
            OR a.visibility = 'public'
            OR
            -- Team-shared agents
            (a.visibility = 'teams' AND EXISTS (
                SELECT 1 FROM team_agents ta
                WHERE ta.agent_id = a.agent_id
                AND ta.team_account_id = p_account_id
            ))
        ))
    )
    AND (p_search IS NULL OR 
         a.name ILIKE '%' || p_search || '%' OR 
         a.description ILIKE '%' || p_search || '%')
    AND (p_tags IS NULL OR a.tags && p_tags)
    ORDER BY a.marketplace_published_at DESC NULLS LAST, a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION publish_agent_with_visibility TO authenticated;
GRANT EXECUTE ON FUNCTION get_marketplace_agents(INTEGER, INTEGER, TEXT, TEXT[], UUID) TO authenticated, anon;
GRANT ALL PRIVILEGES ON TABLE team_agents TO authenticated, service_role;

-- Add custom_mcps column if it doesn't exist (some deployments might not have it)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='agents' AND column_name='custom_mcps') THEN
        ALTER TABLE agents ADD COLUMN custom_mcps JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

COMMIT; 
