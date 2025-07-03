BEGIN;

-- Create knowledge indexes table for storing knowledge base configurations
CREATE TABLE IF NOT EXISTS knowledge_indexes (
    index_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL, -- This will be injected into tool description
    llamacloud_index_key VARCHAR(255) NOT NULL UNIQUE,
    index_type VARCHAR(50) NOT NULL DEFAULT 'uploaded', -- 'uploaded' or 'external'
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store additional LlamaCloud metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create knowledge files table to track uploaded files
CREATE TABLE IF NOT EXISTS knowledge_files (
    file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index_id UUID NOT NULL REFERENCES knowledge_indexes(index_id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    upload_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'uploading', 'completed', 'failed'
    error_message TEXT,
    llamacloud_document_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_indexes_account_id ON knowledge_indexes(account_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_indexes_llamacloud_key ON knowledge_indexes(llamacloud_index_key);
CREATE INDEX IF NOT EXISTS idx_knowledge_files_index_id ON knowledge_files(index_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_files_upload_status ON knowledge_files(upload_status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_knowledge_indexes_updated_at ON knowledge_indexes;
CREATE TRIGGER trigger_knowledge_indexes_updated_at
    BEFORE UPDATE ON knowledge_indexes
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_updated_at();

DROP TRIGGER IF EXISTS trigger_knowledge_files_updated_at ON knowledge_files;
CREATE TRIGGER trigger_knowledge_files_updated_at
    BEFORE UPDATE ON knowledge_files
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_updated_at();

-- Enable RLS on tables
ALTER TABLE knowledge_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_indexes
CREATE POLICY knowledge_indexes_select_own ON knowledge_indexes
    FOR SELECT
    USING (basejump.has_role_on_account(account_id));

CREATE POLICY knowledge_indexes_insert_own ON knowledge_indexes
    FOR INSERT
    WITH CHECK (basejump.has_role_on_account(account_id, 'owner'));

CREATE POLICY knowledge_indexes_update_own ON knowledge_indexes
    FOR UPDATE
    USING (basejump.has_role_on_account(account_id, 'owner'));

CREATE POLICY knowledge_indexes_delete_own ON knowledge_indexes
    FOR DELETE
    USING (basejump.has_role_on_account(account_id, 'owner'));

-- RLS Policies for knowledge_files (inherit from parent index permissions)
CREATE POLICY knowledge_files_select_own ON knowledge_files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM knowledge_indexes ki
            WHERE ki.index_id = knowledge_files.index_id
            AND basejump.has_role_on_account(ki.account_id)
        )
    );

CREATE POLICY knowledge_files_insert_own ON knowledge_files
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM knowledge_indexes ki
            WHERE ki.index_id = knowledge_files.index_id
            AND basejump.has_role_on_account(ki.account_id, 'owner')
        )
    );

CREATE POLICY knowledge_files_update_own ON knowledge_files
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM knowledge_indexes ki
            WHERE ki.index_id = knowledge_files.index_id
            AND basejump.has_role_on_account(ki.account_id, 'owner')
        )
    );

CREATE POLICY knowledge_files_delete_own ON knowledge_files
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM knowledge_indexes ki
            WHERE ki.index_id = knowledge_files.index_id
            AND basejump.has_role_on_account(ki.account_id, 'owner')
        )
    );

-- Add knowledge_indexes array to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS knowledge_indexes UUID[] DEFAULT '{}';

-- Create index on knowledge_indexes array
CREATE INDEX IF NOT EXISTS idx_agents_knowledge_indexes ON agents USING GIN(knowledge_indexes);

-- Add comment
COMMENT ON COLUMN agents.knowledge_indexes IS 'Array of knowledge index IDs enabled for this agent';

COMMIT;