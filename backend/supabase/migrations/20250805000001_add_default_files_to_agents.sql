BEGIN;

-- Add default_files column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS default_files JSONB DEFAULT '[]'::jsonb;

-- Create index for default_files queries  
CREATE INDEX IF NOT EXISTS idx_agents_default_files ON agents USING GIN (default_files);

-- Add comment explaining the column
COMMENT ON COLUMN agents.default_files IS 'Stores default file attachments with metadata for agent sessions';

-- Update default sharing preferences to include default files
UPDATE agents 
SET sharing_preferences = sharing_preferences || '{"include_default_files": true}'::jsonb
WHERE sharing_preferences IS NOT NULL;

-- Update default value for new agents
ALTER TABLE agents 
ALTER COLUMN sharing_preferences 
SET DEFAULT '{"include_knowledge_bases": true, "include_custom_mcp_tools": true, "include_default_files": true, "managed_agent": false, "disable_customization": false}'::jsonb;

-- Create agent-default-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agent-default-files', 'agent-default-files', false, 524288000, null) -- 500MB limit
ON CONFLICT (id) DO NOTHING;

-- RLS policies for agent-default-files bucket
-- Users can view files from accounts they belong to
DROP POLICY IF EXISTS "Users can view agent default files from their accounts" ON storage.objects;
CREATE POLICY "Users can view agent default files from their accounts" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'agent-default-files' AND
    (storage.foldername(name))[1]::uuid IN (
        SELECT account_id FROM basejump.account_user WHERE user_id = auth.uid()
    )
);

-- Users can upload files to accounts they own
DROP POLICY IF EXISTS "Users can upload agent default files to owned accounts" ON storage.objects;
CREATE POLICY "Users can upload agent default files to owned accounts" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'agent-default-files' AND
    (storage.foldername(name))[1]::uuid IN (
        SELECT account_id FROM basejump.account_user 
        WHERE user_id = auth.uid() AND account_role = 'owner'
    )
);

-- Users can update files in accounts they own
DROP POLICY IF EXISTS "Users can update agent default files in owned accounts" ON storage.objects;
CREATE POLICY "Users can update agent default files in owned accounts" ON storage.objects
FOR UPDATE TO authenticated USING (
    bucket_id = 'agent-default-files' AND
    (storage.foldername(name))[1]::uuid IN (
        SELECT account_id FROM basejump.account_user 
        WHERE user_id = auth.uid() AND account_role = 'owner'
    )
);

-- Users can delete files from accounts they own
DROP POLICY IF EXISTS "Users can delete agent default files from owned accounts" ON storage.objects;
CREATE POLICY "Users can delete agent default files from owned accounts" ON storage.objects
FOR DELETE TO authenticated USING (
    bucket_id = 'agent-default-files' AND
    (storage.foldername(name))[1]::uuid IN (
        SELECT account_id FROM basejump.account_user 
        WHERE user_id = auth.uid() AND account_role = 'owner'
    )
);

COMMIT;