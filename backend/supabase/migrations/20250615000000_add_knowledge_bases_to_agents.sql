BEGIN;

-- Add knowledge_bases column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS knowledge_bases JSONB DEFAULT '[]'::jsonb;

-- Create index for knowledge_bases queries
CREATE INDEX IF NOT EXISTS idx_agents_knowledge_bases ON agents USING GIN (knowledge_bases);

-- Comment on the column
COMMENT ON COLUMN agents.knowledge_bases IS 'Stores configured LlamaCloud knowledge base indices with their descriptions';

COMMIT;