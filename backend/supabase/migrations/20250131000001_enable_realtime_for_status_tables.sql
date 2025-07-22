BEGIN;

-- Enable realtime for tables if not already enabled
-- Using DO block to check if tables are already in publication

DO $$
BEGIN
    -- Check and add agent_runs table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'agent_runs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE agent_runs;
        RAISE NOTICE 'Added agent_runs to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'agent_runs already in supabase_realtime publication';
    END IF;

    -- Check and add thread_views table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'thread_views'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE thread_views;
        RAISE NOTICE 'Added thread_views to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'thread_views already in supabase_realtime publication';
    END IF;

    -- Check and add threads table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'threads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE threads;
        RAISE NOTICE 'Added threads to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'threads already in supabase_realtime publication';
    END IF;
END $$;

COMMIT; 