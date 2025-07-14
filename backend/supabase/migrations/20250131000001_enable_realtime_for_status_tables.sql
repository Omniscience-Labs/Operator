BEGIN;

-- Enable realtime for agent_runs table
ALTER PUBLICATION supabase_realtime ADD TABLE agent_runs;

-- Enable realtime for thread_views table  
ALTER PUBLICATION supabase_realtime ADD TABLE thread_views;

-- Enable realtime for threads table
ALTER PUBLICATION supabase_realtime ADD TABLE threads;

COMMIT; 