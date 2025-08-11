-- Ensure Dev2 has complete Basejump setup for account management
-- This migration ensures all necessary basejump components are in place

BEGIN;

-- 1. Create basejump schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS basejump;
GRANT USAGE ON SCHEMA basejump to authenticated;
GRANT USAGE ON SCHEMA basejump to service_role;

-- 2. Create account_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'basejump')) THEN
        CREATE TYPE basejump.account_role AS ENUM ('owner', 'member');
    END IF;
END $$;

-- 3. Create accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS basejump.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    slug TEXT UNIQUE,
    primary_owner_user_id UUID REFERENCES auth.users(id),
    personal_account BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_basejump_accounts_primary_owner ON basejump.accounts(primary_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_basejump_accounts_personal ON basejump.accounts(personal_account);

-- 4. Create account_user table if it doesn't exist
CREATE TABLE IF NOT EXISTS basejump.account_user (
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_role basejump.account_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (account_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_basejump_account_user_account_id ON basejump.account_user(account_id);
CREATE INDEX IF NOT EXISTS idx_basejump_account_user_user_id ON basejump.account_user(user_id);

-- 5. Create the critical trigger function for automatic account creation
CREATE OR REPLACE FUNCTION basejump.run_new_user_setup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    first_account_id UUID;
    generated_user_name TEXT;
BEGIN
    -- Generate username from email
    IF NEW.email IS NOT NULL THEN
        generated_user_name := split_part(NEW.email, '@', 1);
    ELSE
        generated_user_name := 'user_' || substring(NEW.id::text, 1, 8);
    END IF;
    
    -- Create personal account
    INSERT INTO basejump.accounts (name, primary_owner_user_id, personal_account, id)
    VALUES (generated_user_name, NEW.id, true, NEW.id)
    RETURNING id INTO first_account_id;
    
    -- Add to account_user table
    INSERT INTO basejump.account_user (account_id, user_id, account_role)
    VALUES (first_account_id, NEW.id, 'owner');
    
    RETURN NEW;
END;
$$;

-- 6. Create the trigger (drop and recreate to ensure it's active)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION basejump.run_new_user_setup();

-- 7. Create the permission check function
CREATE OR REPLACE FUNCTION basejump.has_role_on_account(account_id UUID, account_role basejump.account_role DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF account_role IS NULL THEN
        RETURN EXISTS(
            SELECT 1 FROM basejump.account_user au
            WHERE au.account_id = has_role_on_account.account_id
            AND au.user_id = auth.uid()
        );
    ELSE
        RETURN EXISTS(
            SELECT 1 FROM basejump.account_user au
            WHERE au.account_id = has_role_on_account.account_id
            AND au.user_id = auth.uid()
            AND au.account_role = has_role_on_account.account_role
        );
    END IF;
END;
$$;

-- 8. Enable RLS on basejump tables
ALTER TABLE basejump.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE basejump.account_user ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for accounts
DROP POLICY IF EXISTS accounts_select_own ON basejump.accounts;
CREATE POLICY accounts_select_own ON basejump.accounts
    FOR SELECT
    USING (basejump.has_role_on_account(id));

DROP POLICY IF EXISTS accounts_insert_own ON basejump.accounts;
CREATE POLICY accounts_insert_own ON basejump.accounts
    FOR INSERT
    WITH CHECK (primary_owner_user_id = auth.uid());

DROP POLICY IF EXISTS accounts_update_own ON basejump.accounts;
CREATE POLICY accounts_update_own ON basejump.accounts
    FOR UPDATE
    USING (basejump.has_role_on_account(id, 'owner'));

-- 10. Create RLS policies for account_user
DROP POLICY IF EXISTS account_user_select_own ON basejump.account_user;
CREATE POLICY account_user_select_own ON basejump.account_user
    FOR SELECT
    USING (basejump.has_role_on_account(account_id));

DROP POLICY IF EXISTS account_user_insert_own ON basejump.account_user;
CREATE POLICY account_user_insert_own ON basejump.account_user
    FOR INSERT
    WITH CHECK (basejump.has_role_on_account(account_id, 'owner'));

-- 11. Fix existing users without accounts
DO $migration$
DECLARE
    user_record RECORD;
    target_account_id UUID;
    user_count INTEGER := 0;
BEGIN
    -- Create missing personal accounts for users without accounts
    FOR user_record IN 
        SELECT au.id as user_id, au.email, au.created_at
        FROM auth.users au
        LEFT JOIN basejump.accounts ba ON au.id = ba.id
        WHERE ba.id IS NULL
    LOOP
        BEGIN
            -- Create personal account
            INSERT INTO basejump.accounts (id, name, primary_owner_user_id, personal_account, created_at, updated_at)
            VALUES (
                user_record.user_id, 
                COALESCE(split_part(user_record.email, '@', 1), 'user_' || substring(user_record.user_id::text, 1, 8)),
                user_record.user_id,
                true,
                COALESCE(user_record.created_at, NOW()),
                NOW()
            )
            ON CONFLICT (id) DO NOTHING;
            
            -- Add to account_user table
            INSERT INTO basejump.account_user (account_id, user_id, account_role, created_at, updated_at)
            VALUES (user_record.user_id, user_record.user_id, 'owner', NOW(), NOW())
            ON CONFLICT (account_id, user_id) DO NOTHING;
            
            user_count := user_count + 1;
            RAISE NOTICE 'Created account for user: % (ID: %)', COALESCE(user_record.email, 'unknown'), user_record.user_id;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to create account for user %: %', user_record.user_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Processed % users without accounts', user_count;
    
    -- Fix orphaned agents by assigning to first available account
    SELECT id INTO target_account_id 
    FROM basejump.accounts 
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF target_account_id IS NOT NULL THEN
        -- Update orphaned agents (if agents table exists)
        BEGIN
            UPDATE agents 
            SET account_id = target_account_id
            WHERE account_id NOT IN (SELECT id FROM basejump.accounts);
            
            RAISE NOTICE 'Fixed orphaned agents, assigned to account: %', target_account_id;
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE 'Agents table does not exist yet, skipping orphaned agents fix';
        END;
        
        -- Update orphaned projects (if projects table exists)
        BEGIN
            UPDATE projects 
            SET account_id = target_account_id
            WHERE account_id NOT IN (SELECT id FROM basejump.accounts);
            
            RAISE NOTICE 'Fixed orphaned projects, assigned to account: %', target_account_id;
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE 'Projects table does not exist yet, skipping orphaned projects fix';
        END;
    END IF;
    
    RAISE NOTICE 'Dev2 basejump setup completed successfully!';
END $migration$;

COMMIT;
