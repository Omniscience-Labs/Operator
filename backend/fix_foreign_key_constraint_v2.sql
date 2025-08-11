-- ========================================
-- FIX AGENTS FOREIGN KEY CONSTRAINT V2
-- ========================================
-- This script handles the case where the constraint already exists

BEGIN;

-- Check the current constraint and what it's pointing to
DO $$
DECLARE
    constraint_info RECORD;
    user_exists_in_target BOOLEAN := false;
BEGIN
    -- Get information about the existing constraint
    SELECT 
        tc.constraint_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    INTO constraint_info
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'agents'
        AND kcu.column_name = 'account_id'
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE 'Found existing constraint: % references %.%', 
            constraint_info.constraint_name,
            constraint_info.foreign_table_schema,
            constraint_info.foreign_table_name;
        
        -- Check if the constraint is pointing to the right table
        IF constraint_info.foreign_table_schema = 'basejump' AND constraint_info.foreign_table_name = 'accounts' THEN
            RAISE NOTICE 'Constraint is correctly pointing to basejump.accounts';
            
            -- Check if the specific user exists in basejump.accounts
            SELECT EXISTS (
                SELECT 1 FROM basejump.accounts 
                WHERE id = '93589f94-0ff1-4ccf-8239-cf39bf4065b8'
            ) INTO user_exists_in_target;
            
            IF user_exists_in_target THEN
                RAISE NOTICE 'User exists in basejump.accounts - constraint should work!';
                RAISE NOTICE 'The foreign key error might be coming from elsewhere.';
            ELSE
                RAISE NOTICE 'User does NOT exist in basejump.accounts - this is the problem!';
            END IF;
            
        ELSIF constraint_info.foreign_table_schema = 'public' AND constraint_info.foreign_table_name = 'accounts' THEN
            RAISE NOTICE 'Constraint is incorrectly pointing to public.accounts - will fix it';
            
            -- Drop the incorrect constraint
            EXECUTE format('ALTER TABLE agents DROP CONSTRAINT %I', constraint_info.constraint_name);
            RAISE NOTICE 'Dropped incorrect constraint';
            
            -- Create the correct constraint pointing to basejump.accounts
            ALTER TABLE agents 
            ADD CONSTRAINT agents_account_id_fkey 
            FOREIGN KEY (account_id) 
            REFERENCES basejump.accounts(id) 
            ON DELETE CASCADE;
            
            RAISE NOTICE 'Created new constraint pointing to basejump.accounts';
            
        ELSE
            RAISE NOTICE 'Constraint points to unexpected table: %.% - will recreate',
                constraint_info.foreign_table_schema, constraint_info.foreign_table_name;
                
            -- Drop the unexpected constraint
            EXECUTE format('ALTER TABLE agents DROP CONSTRAINT %I', constraint_info.constraint_name);
            RAISE NOTICE 'Dropped unexpected constraint';
            
            -- Create the correct constraint pointing to basejump.accounts
            ALTER TABLE agents 
            ADD CONSTRAINT agents_account_id_fkey 
            FOREIGN KEY (account_id) 
            REFERENCES basejump.accounts(id) 
            ON DELETE CASCADE;
            
            RAISE NOTICE 'Created new constraint pointing to basejump.accounts';
        END IF;
        
    ELSE
        RAISE NOTICE 'No foreign key constraint found on agents.account_id - creating one';
        
        -- Create the constraint pointing to basejump.accounts
        ALTER TABLE agents 
        ADD CONSTRAINT agents_account_id_fkey 
        FOREIGN KEY (account_id) 
        REFERENCES basejump.accounts(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Created new constraint pointing to basejump.accounts';
    END IF;
END $$;

-- Ensure the specific user exists in basejump.accounts (if they don't)
INSERT INTO basejump.accounts (id, name, primary_owner_user_id, personal_account, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(split_part(au.email, '@', 1), 'user_' || substring(au.id::text, 1, 8)) as name,
    au.id,
    true,
    COALESCE(au.created_at, NOW()),
    NOW()
FROM auth.users au
WHERE au.id = '93589f94-0ff1-4ccf-8239-cf39bf4065b8'
    AND NOT EXISTS (
        SELECT 1 FROM basejump.accounts 
        WHERE id = '93589f94-0ff1-4ccf-8239-cf39bf4065b8'
    );

-- Ensure the user is in account_user table
INSERT INTO basejump.account_user (account_id, user_id, account_role, created_at, updated_at)
VALUES ('93589f94-0ff1-4ccf-8239-cf39bf4065b8', '93589f94-0ff1-4ccf-8239-cf39bf4065b8', 'owner', NOW(), NOW())
ON CONFLICT (account_id, user_id) DO NOTHING;

-- Final verification
DO $$
DECLARE
    user_exists BOOLEAN;
    constraint_info RECORD;
BEGIN
    -- Check if user exists
    SELECT EXISTS (
        SELECT 1 FROM basejump.accounts 
        WHERE id = '93589f94-0ff1-4ccf-8239-cf39bf4065b8'
    ) INTO user_exists;
    
    -- Get constraint info
    SELECT 
        tc.constraint_name,
        ccu.table_schema || '.' || ccu.table_name as references_table
    INTO constraint_info
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'agents'
        AND kcu.column_name = 'account_id'
    LIMIT 1;
    
    RAISE NOTICE '=== FINAL VERIFICATION ===';
    RAISE NOTICE 'User exists in basejump.accounts: %', CASE WHEN user_exists THEN 'YES ✓' ELSE 'NO ✗' END;
    RAISE NOTICE 'Constraint references: %', COALESCE(constraint_info.references_table, 'NO CONSTRAINT FOUND');
    
    IF user_exists AND constraint_info.references_table = 'basejump.accounts' THEN
        RAISE NOTICE 'RESULT: Agent creation should now work! ✓';
    ELSE
        RAISE NOTICE 'RESULT: There are still issues that need to be resolved ✗';
    END IF;
END $$;

COMMIT;
