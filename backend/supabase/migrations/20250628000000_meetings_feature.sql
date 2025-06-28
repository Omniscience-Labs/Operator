BEGIN;

-- Create meeting folders table for organizing meetings
CREATE TABLE IF NOT EXISTS meeting_folders (
    folder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES meeting_folders(folder_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_folder_name_per_parent UNIQUE(account_id, parent_folder_id, name)
);

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
    meeting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES meeting_folders(folder_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    transcript TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}'::jsonb, -- For storing bot_id, meeting_url, etc.
    recording_mode TEXT CHECK (recording_mode IN ('local', 'online')) DEFAULT 'local',
    status TEXT CHECK (status IN ('active', 'completed', 'failed')) DEFAULT 'active',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create meeting shares table for sharing functionality
CREATE TABLE IF NOT EXISTS meeting_shares (
    share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    shared_with_account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    permission_level TEXT CHECK (permission_level IN ('view', 'edit')) DEFAULT 'view',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_meeting_share UNIQUE(meeting_id, shared_with_account_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_folders_account_id ON meeting_folders(account_id);
CREATE INDEX IF NOT EXISTS idx_meeting_folders_parent_folder_id ON meeting_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_meetings_account_id ON meetings(account_id);
CREATE INDEX IF NOT EXISTS idx_meetings_folder_id ON meetings(folder_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_shares_meeting_id ON meeting_shares(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_shares_shared_with_account_id ON meeting_shares(shared_with_account_id);

-- Full text search index on transcript
CREATE INDEX IF NOT EXISTS idx_meetings_transcript_search ON meetings USING gin(to_tsvector('english', transcript));

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meetings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_meeting_folders_updated_at ON meeting_folders;
CREATE TRIGGER update_meeting_folders_updated_at
    BEFORE UPDATE ON meeting_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_meetings_updated_at_column();

DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_meetings_updated_at_column();

-- Enable Row Level Security
ALTER TABLE meeting_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_shares ENABLE ROW LEVEL SECURITY;

-- Meeting folders policies
DROP POLICY IF EXISTS meeting_folders_select_policy ON meeting_folders;
CREATE POLICY meeting_folders_select_policy ON meeting_folders
    FOR SELECT
    USING (basejump.has_role_on_account(account_id) = true);

DROP POLICY IF EXISTS meeting_folders_insert_policy ON meeting_folders;
CREATE POLICY meeting_folders_insert_policy ON meeting_folders
    FOR INSERT
    WITH CHECK (basejump.has_role_on_account(account_id) = true);

DROP POLICY IF EXISTS meeting_folders_update_policy ON meeting_folders;
CREATE POLICY meeting_folders_update_policy ON meeting_folders
    FOR UPDATE
    USING (basejump.has_role_on_account(account_id) = true);

DROP POLICY IF EXISTS meeting_folders_delete_policy ON meeting_folders;
CREATE POLICY meeting_folders_delete_policy ON meeting_folders
    FOR DELETE
    USING (basejump.has_role_on_account(account_id) = true);

-- Meetings policies
DROP POLICY IF EXISTS meetings_select_policy ON meetings;
CREATE POLICY meetings_select_policy ON meetings
    FOR SELECT
    USING (
        is_public = TRUE OR
        basejump.has_role_on_account(account_id) = true OR
        EXISTS (
            SELECT 1 FROM meeting_shares
            WHERE meeting_shares.meeting_id = meetings.meeting_id
            AND basejump.has_role_on_account(meeting_shares.shared_with_account_id) = true
        )
    );

DROP POLICY IF EXISTS meetings_insert_policy ON meetings;
CREATE POLICY meetings_insert_policy ON meetings
    FOR INSERT
    WITH CHECK (basejump.has_role_on_account(account_id) = true);

DROP POLICY IF EXISTS meetings_update_policy ON meetings;
CREATE POLICY meetings_update_policy ON meetings
    FOR UPDATE
    USING (
        basejump.has_role_on_account(account_id) = true OR
        EXISTS (
            SELECT 1 FROM meeting_shares
            WHERE meeting_shares.meeting_id = meetings.meeting_id
            AND meeting_shares.shared_with_account_id = account_id
            AND meeting_shares.permission_level = 'edit'
        )
    );

DROP POLICY IF EXISTS meetings_delete_policy ON meetings;
CREATE POLICY meetings_delete_policy ON meetings
    FOR DELETE
    USING (basejump.has_role_on_account(account_id) = true);

-- Meeting shares policies
DROP POLICY IF EXISTS meeting_shares_select_policy ON meeting_shares;
CREATE POLICY meeting_shares_select_policy ON meeting_shares
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM meetings
            WHERE meetings.meeting_id = meeting_shares.meeting_id
            AND basejump.has_role_on_account(meetings.account_id) = true
        ) OR
        basejump.has_role_on_account(shared_with_account_id) = true
    );

DROP POLICY IF EXISTS meeting_shares_insert_policy ON meeting_shares;
CREATE POLICY meeting_shares_insert_policy ON meeting_shares
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM meetings
            WHERE meetings.meeting_id = meeting_shares.meeting_id
            AND basejump.has_role_on_account(meetings.account_id) = true
        )
    );

DROP POLICY IF EXISTS meeting_shares_update_policy ON meeting_shares;
CREATE POLICY meeting_shares_update_policy ON meeting_shares
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM meetings
            WHERE meetings.meeting_id = meeting_shares.meeting_id
            AND basejump.has_role_on_account(meetings.account_id) = true
        )
    );

DROP POLICY IF EXISTS meeting_shares_delete_policy ON meeting_shares;
CREATE POLICY meeting_shares_delete_policy ON meeting_shares
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM meetings
            WHERE meetings.meeting_id = meeting_shares.meeting_id
            AND basejump.has_role_on_account(meetings.account_id) = true
        )
    );

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE meeting_folders TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE meetings TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE meeting_shares TO authenticated, service_role;
GRANT SELECT ON TABLE meetings TO anon;

-- Create function for full-text search across meetings
CREATE OR REPLACE FUNCTION search_meetings(
    p_account_id UUID,
    p_search_query TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    meeting_id UUID,
    title TEXT,
    snippet TEXT,
    rank REAL,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH searchable_meetings AS (
        SELECT 
            m.meeting_id,
            m.title,
            m.transcript,
            m.created_at
        FROM meetings m
        LEFT JOIN meeting_shares ms ON m.meeting_id = ms.meeting_id
        WHERE 
            m.account_id = p_account_id OR 
            ms.shared_with_account_id = p_account_id OR
            m.is_public = TRUE
    )
    SELECT 
        sm.meeting_id,
        sm.title,
        ts_headline('english', sm.transcript, plainto_tsquery('english', p_search_query), 
            'MaxWords=30, MinWords=15, ShortWord=3, HighlightAll=FALSE, 
             MaxFragments=1, StartSel=<mark>, StopSel=</mark>') as snippet,
        ts_rank(to_tsvector('english', sm.transcript), plainto_tsquery('english', p_search_query)) as rank,
        sm.created_at
    FROM searchable_meetings sm
    WHERE to_tsvector('english', sm.transcript) @@ plainto_tsquery('english', p_search_query)
    ORDER BY rank DESC, sm.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Grant execute permission on search function
GRANT EXECUTE ON FUNCTION search_meetings TO authenticated, anon, service_role;

COMMIT; 