"""
Composio Tool Wrapper for AgentPress

This module provides a tool wrapper that handles Composio integrations,
starting with Outlook but designed to be extensible for other integrations.
"""

import json
from typing import Any, Dict, List, Optional
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from utils.logger import logger
from composio import ComposioToolSet
from services.supabase import DBConnection
import os

class ComposioToolWrapper(Tool):
    """
    A tool wrapper that enables agents to use Composio-connected integrations.
    Initially supports Outlook with extensibility for other integrations.
    """
    
    def __init__(self, account_id: str, integration_types: Optional[List[str]] = None):
        """
        Initialize the Composio tool wrapper.
        
        Args:
            account_id: The account ID to use for checking enabled integrations
            integration_types: List of integration types to enable (e.g., ['outlook'])
        """
        super().__init__()
        self.account_id = account_id
        self.integration_types = integration_types or []
        self.db = DBConnection()
        self.toolset = ComposioToolSet(api_key=os.getenv("COMPOSIO_API_KEY", "7b5l47ekblv8mw58a90vz"))
        self._enabled_integrations = {}
        
    async def _load_enabled_integrations(self):
        """Load enabled integrations from the database"""
        try:
            client = await self.db.client
            result = await client.table('user_integrations').select('*').eq('account_id', self.account_id).eq('status', 'connected').eq('is_enabled', True).execute()
            
            self._enabled_integrations = {
                integration['integration_type']: integration 
                for integration in result.data
            }
            logger.info(f"Loaded {len(self._enabled_integrations)} enabled integrations for account {self.account_id}")
        except Exception as e:
            logger.error(f"Failed to load enabled integrations: {str(e)}")
            self._enabled_integrations = {}
    
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "send_outlook_email",
            "description": "Send an email using the connected Outlook account",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of recipient email addresses"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Email subject line"
                    },
                    "body": {
                        "type": "string",
                        "description": "Email body content (HTML supported)"
                    },
                    "cc": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of CC recipient email addresses",
                        "required": False
                    },
                    "bcc": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of BCC recipient email addresses",
                        "required": False
                    }
                },
                "required": ["to", "subject", "body"]
            }
        }
    })
    @xml_schema(
        tag_name="send-outlook-email",
        mappings=[
            {"param_name": "to", "node_type": "attribute", "path": ".", "required": True},
            {"param_name": "subject", "node_type": "attribute", "path": ".", "required": True},
            {"param_name": "body", "node_type": "content", "path": "."},
            {"param_name": "cc", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "bcc", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="send-outlook-email">
        <parameter name="to">["recipient@example.com"]</parameter>
        <parameter name="subject">Meeting Tomorrow</parameter>
        <parameter name="body">Hi, confirming our meeting tomorrow at 3 PM.</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def send_outlook_email(self, to: List[str], subject: str, body: str, cc: Optional[List[str]] = None, bcc: Optional[List[str]] = None) -> ToolResult:
        """Send an email using Outlook"""
        try:
            # Check if Outlook is enabled
            if not self._enabled_integrations:
                await self._load_enabled_integrations()
            
            if 'outlook' not in self._enabled_integrations:
                return self.fail_response("Outlook integration is not enabled. Please connect and enable Outlook first.")
            
            integration = self._enabled_integrations['outlook']
            entity_id = integration['composio_entity_id']
            
            # Prepare email data for Composio
            email_data = {
                "to": to,
                "subject": subject,
                "body": body,
                "bodyType": "HTML"  # Support HTML emails
            }
            
            if cc:
                email_data["cc"] = cc
            if bcc:
                email_data["bcc"] = bcc
            
            # Execute the Composio action
            result = self.toolset.execute_action(
                action="OUTLOOK_SEND_EMAIL",
                params=email_data,
                entity_id=entity_id
            )
            
            if result.get("success"):
                return self.success_response({
                    "status": "sent",
                    "message": f"Email sent successfully to {', '.join(to)}"
                })
            else:
                return self.fail_response(f"Failed to send email: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"Error sending Outlook email: {str(e)}")
            return self.fail_response(f"Error sending email: {str(e)}")
    
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "read_outlook_emails",
            "description": "Read emails from the connected Outlook account",
            "parameters": {
                "type": "object",
                "properties": {
                    "folder": {
                        "type": "string",
                        "description": "Email folder to read from (e.g., 'inbox', 'sent')",
                        "default": "inbox"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of emails to retrieve",
                        "default": 10
                    },
                    "unread_only": {
                        "type": "boolean",
                        "description": "Only retrieve unread emails",
                        "default": False
                    }
                },
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="read-outlook-emails",
        mappings=[
            {"param_name": "folder", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "limit", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "unread_only", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="read-outlook-emails">
        <parameter name="folder">inbox</parameter>
        <parameter name="limit">5</parameter>
        <parameter name="unread_only">true</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def read_outlook_emails(self, folder: str = "inbox", limit: int = 10, unread_only: bool = False) -> ToolResult:
        """Read emails from Outlook"""
        try:
            # Check if Outlook is enabled
            if not self._enabled_integrations:
                await self._load_enabled_integrations()
            
            if 'outlook' not in self._enabled_integrations:
                return self.fail_response("Outlook integration is not enabled. Please connect and enable Outlook first.")
            
            integration = self._enabled_integrations['outlook']
            entity_id = integration['composio_entity_id']
            
            # Prepare parameters for Composio
            params = {
                "folder": folder,
                "limit": limit,
                "filter": "isRead eq false" if unread_only else None
            }
            
            # Execute the Composio action
            result = self.toolset.execute_action(
                action="OUTLOOK_LIST_EMAILS",
                params=params,
                entity_id=entity_id
            )
            
            if result.get("success"):
                emails = result.get("data", {}).get("value", [])
                formatted_emails = []
                
                for email in emails[:limit]:
                    formatted_emails.append({
                        "id": email.get("id"),
                        "subject": email.get("subject"),
                        "from": email.get("from", {}).get("emailAddress", {}).get("address"),
                        "to": [r.get("emailAddress", {}).get("address") for r in email.get("toRecipients", [])],
                        "received": email.get("receivedDateTime"),
                        "is_read": email.get("isRead", False),
                        "body_preview": email.get("bodyPreview", "")
                    })
                
                return self.success_response({
                    "emails": formatted_emails,
                    "count": len(formatted_emails),
                    "folder": folder
                })
            else:
                return self.fail_response(f"Failed to read emails: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"Error reading Outlook emails: {str(e)}")
            return self.fail_response(f"Error reading emails: {str(e)}")
    
    def get_available_tools(self) -> List[str]:
        """Get list of available tool names"""
        # This could be dynamic based on enabled integrations
        tools = []
        if 'outlook' in self.integration_types:
            tools.extend(['send_outlook_email', 'read_outlook_emails'])
        return tools 