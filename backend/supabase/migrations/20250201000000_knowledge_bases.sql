BEGIN;

-- Create knowledge_bases table
CREATE TABLE IF NOT EXISTS knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(agent_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    llama_index_id VARCHAR(255), -- LlamaCloud index ID
    index_type VARCHAR(50) DEFAULT 'managed', -- 'managed' or 'external'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'indexing', 'ready', 'error'
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create knowledge_base_files table for tracking uploaded files
CREATE TABLE IF NOT EXISTS knowledge_base_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'indexed', 'error'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_account_id ON knowledge_bases(account_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_agent_id ON knowledge_bases(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_status ON knowledge_bases(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_files_kb_id ON knowledge_base_files(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_files_status ON knowledge_base_files(status);

-- Enable RLS
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_files ENABLE ROW LEVEL SECURITY;

-- Policies for knowledge_bases
CREATE POLICY knowledge_bases_select_own ON knowledge_bases
    FOR SELECT
    USING (basejump.has_role_on_account(account_id));

CREATE POLICY knowledge_bases_insert_own ON knowledge_bases
    FOR INSERT
    WITH CHECK (basejump.has_role_on_account(account_id, 'owner'));

CREATE POLICY knowledge_bases_update_own ON knowledge_bases
    FOR UPDATE
    USING (basejump.has_role_on_account(account_id, 'owner'));

CREATE POLICY knowledge_bases_delete_own ON knowledge_bases
    FOR DELETE
    USING (basejump.has_role_on_account(account_id, 'owner'));

-- Policies for knowledge_base_files
CREATE POLICY knowledge_base_files_select_own ON knowledge_base_files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM knowledge_bases kb
            WHERE kb.id = knowledge_base_files.knowledge_base_id
            AND basejump.has_role_on_account(kb.account_id)
        )
    );

CREATE POLICY knowledge_base_files_insert_own ON knowledge_base_files
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM knowledge_bases kb
            WHERE kb.id = knowledge_base_files.knowledge_base_id
            AND basejump.has_role_on_account(kb.account_id, 'owner')
        )
    );

CREATE POLICY knowledge_base_files_update_own ON knowledge_base_files
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM knowledge_bases kb
            WHERE kb.id = knowledge_base_files.knowledge_base_id
            AND basejump.has_role_on_account(kb.account_id, 'owner')
        )
    );

CREATE POLICY knowledge_base_files_delete_own ON knowledge_base_files
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM knowledge_bases kb
            WHERE kb.id = knowledge_base_files.knowledge_base_id
            AND basejump.has_role_on_account(kb.account_id, 'owner')
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_bases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_knowledge_bases_updated_at
    BEFORE UPDATE ON knowledge_bases
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_bases_updated_at();

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE knowledge_bases TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE knowledge_base_files TO authenticated, service_role;

COMMIT;