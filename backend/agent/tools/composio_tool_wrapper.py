"""
Composio MCP Integration for AgentPress

This module provides first-party MCP integration for Composio services like Outlook.
It uses the MCP protocol to communicate with Composio's MCP endpoint.
"""

import os
from typing import Dict, List, Optional, Any
from utils.logger import logger
from services.supabase import DBConnection

# Environment variables for MCP server URLs (required)
OUTLOOK_MCP_URL = os.getenv("OUTLOOK_MCP_URL")
DROPBOX_MCP_URL = os.getenv("DROPBOX_MCP_URL")

# Validate required MCP URLs
if not OUTLOOK_MCP_URL:
    logger.warning("OUTLOOK_MCP_URL not set - Outlook MCP tools will not work")
if not DROPBOX_MCP_URL:
    logger.warning("DROPBOX_MCP_URL not set - Dropbox MCP tools will not work")

class ComposioMCP:
    """
    Generates MCP configuration for Composio integrations (Outlook, Dropbox, etc.) using Composio's MCP endpoints.
    This configuration is used by the MCP tool wrapper to handle integration tools.
    """
    
    @staticmethod
    async def get_mcp_config_for_integration(account_id: str, integration_type: str) -> Optional[Dict[str, Any]]:
        """
        Get MCP configuration for a specific integration if the account has it enabled.
        
        Args:
            account_id: The account ID to check for integration
            integration_type: The type of integration ('outlook', 'dropbox', etc.)
            
        Returns:
            MCP configuration dict or None if not enabled
        """
        try:
            db = DBConnection()
            client = await db.client
            
            # Check if account has the integration enabled
            result = await client.table('user_integrations').select('*').eq('account_id', account_id).eq('integration_type', integration_type).eq('status', 'connected').eq('is_enabled', True).single().execute()
            
            if not result.data:
                logger.debug(f"No enabled {integration_type} integration found for account {account_id}")
                return None
            
            integration = result.data
            connected_account_id = integration.get('composio_connection_id')
            
            if not connected_account_id:
                logger.warning(f"{integration_type} integration for account {account_id} missing connected_account_id")
                return None
            
            # Get the appropriate MCP URL based on integration type
            mcp_url = None
            name = None
            qualified_name = None
            
            if integration_type == 'outlook':
                mcp_url = OUTLOOK_MCP_URL
                name = 'Outlook'
                qualified_name = 'custom_http_outlook'
            elif integration_type == 'dropbox':
                mcp_url = DROPBOX_MCP_URL
                name = 'Dropbox'
                qualified_name = 'custom_http_dropbox'
            else:
                logger.warning(f"Unknown integration type: {integration_type}")
                return None
            
            # Check if MCP URL is configured
            if not mcp_url:
                logger.warning(f"MCP URL not configured for {integration_type} - skipping")
                return None
            
            # Generate MCP configuration
            mcp_config = {
                'name': name,
                'qualifiedName': qualified_name,
                'config': {
                    'url': f"{mcp_url}?connected_account_id={connected_account_id}",
                    'headers': {}
                },
                'enabledTools': [],  # Empty means all tools are enabled
                'isCustom': True,
                'customType': 'http'
            }
            
            logger.info(f"Generated {integration_type} MCP config for account {account_id} with connected_account_id {connected_account_id}")
            return mcp_config
            
        except Exception as e:
            logger.error(f"Error getting {integration_type} MCP config for account {account_id}: {str(e)}")
            return None
    
    @staticmethod
    async def get_all_composio_mcp_configs(account_id: str) -> List[Dict[str, Any]]:
        """
        Get all Composio-based MCP configurations for an account.
        Supports Outlook, Dropbox, and can be extended for other Composio integrations.
        
        Args:
            account_id: The account ID to get configurations for
            
        Returns:
            List of MCP configurations
        """
        configs = []
        
        # List of supported integration types
        supported_integrations = ['outlook', 'dropbox']
        
        # Get configuration for each supported integration
        for integration_type in supported_integrations:
            config = await ComposioMCP.get_mcp_config_for_integration(account_id, integration_type)
            if config:
                configs.append(config)
        
        # Future: Add other Composio integrations here (Gmail, Slack, etc.)
        
        return configs 