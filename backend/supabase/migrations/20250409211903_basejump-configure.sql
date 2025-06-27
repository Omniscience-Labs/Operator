UPDATE basejump.config SET enable_team_accounts = TRUE;
UPDATE basejump.config SET enable_personal_account_billing = TRUE;
UPDATE basejump.config SET enable_team_account_billing = TRUE;

-- Remove duplicate config rows immediately
DELETE FROM basejump.config WHERE ctid NOT IN (SELECT min(ctid) FROM basejump.config);
