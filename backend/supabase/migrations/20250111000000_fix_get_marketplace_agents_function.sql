BEGIN;

-- FIX GET_MARKETPLACE_AGENTS FUNCTION CONFLICT
-- This migration drops existing get_marketplace_agents functions before recreating them
-- to avoid the "cannot change return type of existing function" error

-- Drop all existing variants of get_marketplace_agents function
DROP FUNCTION IF EXISTS get_marketplace_agents(INTEGER, INTEGER, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS get_marketplace_agents(INTEGER, INTEGER, TEXT, TEXT[], UUID);

-- Drop any other variants that might exist
DROP FUNCTION IF EXISTS get_marketplace_agents(INTEGER);
DROP FUNCTION IF EXISTS get_marketplace_agents(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_marketplace_agents(INTEGER, INTEGER, TEXT);

COMMIT; 