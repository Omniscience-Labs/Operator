BEGIN;

-- Create user_integrations table for storing external tool integrations
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL, -- 'outlook', 'gmail', 'slack', etc.
    integration_provider VARCHAR(50) NOT NULL DEFAULT 'composio', -- Provider handling the integration
    composio_entity_id VARCHAR(255), -- Entity ID from Composio
    composio_connection_id VARCHAR(255), -- Connected account ID from Composio
    integration_id VARCHAR(255), -- Integration ID from Composio
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'failed', 'disconnected')),
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store additional integration-specific data
    error_message TEXT,
    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one integration per type per account
    UNIQUE(account_id, integration_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_integrations_account_id ON user_integrations(account_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_integration_type ON user_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_user_integrations_status ON user_integrations(status);
CREATE INDEX IF NOT EXISTS idx_user_integrations_is_enabled ON user_integrations(is_enabled);

-- Enable RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own integrations
DROP POLICY IF EXISTS user_integrations_select_own ON user_integrations;
CREATE POLICY user_integrations_select_own ON user_integrations
    FOR SELECT
    USING (basejump.has_role_on_account(account_id));

-- Users can insert their own integrations
DROP POLICY IF EXISTS user_integrations_insert_own ON user_integrations;
CREATE POLICY user_integrations_insert_own ON user_integrations
    FOR INSERT
    WITH CHECK (basejump.has_role_on_account(account_id));

-- Users can update their own integrations
DROP POLICY IF EXISTS user_integrations_update_own ON user_integrations;
CREATE POLICY user_integrations_update_own ON user_integrations
    FOR UPDATE
    USING (basejump.has_role_on_account(account_id));

-- Users can delete their own integrations
DROP POLICY IF EXISTS user_integrations_delete_own ON user_integrations;
CREATE POLICY user_integrations_delete_own ON user_integrations
    FOR DELETE
    USING (basejump.has_role_on_account(account_id));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_integrations_updated_at ON user_integrations;
CREATE TRIGGER trigger_user_integrations_updated_at
    BEFORE UPDATE ON user_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_integrations_updated_at();

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE user_integrations TO authenticated, service_role;

COMMIT; 