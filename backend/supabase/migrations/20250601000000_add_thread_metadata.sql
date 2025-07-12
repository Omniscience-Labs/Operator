-- Add metadata column to threads table to store additional context
ALTER TABLE threads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_threads_metadata ON threads USING GIN (metadata);

-- Comment on the column
COMMENT ON COLUMN threads.metadata IS 'Stores additional thread context like agent builder mode and target agent'; 