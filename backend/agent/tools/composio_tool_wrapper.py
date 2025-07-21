"""
Composio MCP Integration for AgentPress

This module provides first-party MCP integration for Composio services like Outlook.
It uses the MCP protocol to communicate with Composio's MCP endpoint.
"""

import os
from typing import Dict, List, Optional, Any
from utils.logger import logger
from services.supabase import DBConnection

# Environment variable for Outlook MCP server URL
OUTLOOK_MCP_URL = os.getenv("OUTLOOK_MCP_URL", "https://mcp.composio.dev/composio/server/9b3c30e6-93dc-45ef-83d2-49cc7d0ac576/mcp")

class ComposioOutlookMCP:
    """
    Generates MCP configuration for Outlook integration using Composio's MCP endpoint.
    This configuration is used by the MCP tool wrapper to handle Outlook tools.
    """
    
    @staticmethod
    async def get_mcp_config_for_account(account_id: str) -> Optional[Dict[str, Any]]:
        """
        Get MCP configuration for Outlook if the account has it enabled.
        
        Args:
            account_id: The account ID to check for Outlook integration
            
        Returns:
            MCP configuration dict or None if not enabled
        """
        try:
            db = DBConnection()
            client = await db.client
            
            # Check if account has Outlook integration enabled
            result = await client.table('user_integrations').select('*').eq('account_id', account_id).eq('integration_type', 'outlook').eq('status', 'connected').eq('is_enabled', True).single().execute()
            
            if not result.data:
                logger.debug(f"No enabled Outlook integration found for account {account_id}")
                return None
            
            integration = result.data
            connected_account_id = integration.get('composio_connection_id')
            
            if not connected_account_id:
                logger.warning(f"Outlook integration for account {account_id} missing connected_account_id")
                return None
            
            # Generate MCP configuration for Outlook
            mcp_config = {
                'name': 'Outlook',
                'qualifiedName': 'custom_http_outlook',
                'config': {
                    'url': f"{OUTLOOK_MCP_URL}?connected_account_id={connected_account_id}",
                    'headers': {}
                },
                'enabledTools': [],  # Empty means all tools are enabled
                'isCustom': True,
                'customType': 'http'
            }
            
            logger.info(f"Generated Outlook MCP config for account {account_id} with connected_account_id {connected_account_id}")
            return mcp_config
            
        except Exception as e:
            logger.error(f"Error getting Outlook MCP config for account {account_id}: {str(e)}")
            return None
    
    @staticmethod
    async def get_all_composio_mcp_configs(account_id: str) -> List[Dict[str, Any]]:
        """
        Get all Composio-based MCP configurations for an account.
        Currently only supports Outlook, but can be extended for other Composio integrations.
        
        Args:
            account_id: The account ID to get configurations for
            
        Returns:
            List of MCP configurations
        """
        configs = []
        
        # Get Outlook configuration if available
        outlook_config = await ComposioOutlookMCP.get_mcp_config_for_account(account_id)
        if outlook_config:
            configs.append(outlook_config)
        
        # Future: Add other Composio integrations here (Gmail, Slack, etc.)
        
        return configs 