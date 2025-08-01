from fastapi import APIRouter, HTTPException, Depends, Request, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import json
from composio import Composio
from composio.types import auth_scheme
from services.supabase import DBConnection
from utils.auth_utils import get_current_user_id_from_jwt
from utils.logger import logger
import uuid
from datetime import datetime, timezone
from fastapi.responses import JSONResponse

router = APIRouter()
db = DBConnection()

# Initialize Composio with API key
COMPOSIO_API_KEY = os.getenv("COMPOSIO_API_KEY")
if not COMPOSIO_API_KEY:
    raise ValueError("COMPOSIO_API_KEY environment variable is required")

composio = Composio(api_key=COMPOSIO_API_KEY)

# Composio integration IDs (these are public identifiers, not secrets)
OUTLOOK_INTEGRATION_ID = os.getenv("COMPOSIO_OUTLOOK_INTEGRATION_ID")
DROPBOX_INTEGRATION_ID = os.getenv("COMPOSIO_DROPBOX_INTEGRATION_ID")

class InitiateIntegrationRequest(BaseModel):
    integration_type: str
    account_id: Optional[str] = None  # Optional team account ID

class ToggleIntegrationRequest(BaseModel):
    integration_type: str
    is_enabled: bool

@router.post("/integrations/composio/initiate")
async def initiate_composio_integration(
    body: InitiateIntegrationRequest = Body(...),
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Initiate a Composio integration connection flow"""
    try:
        client = await db.client
        
        # Determine the account_id to use
        effective_account_id = body.account_id if body.account_id else user_id
        
        # Verify user has access to the account if different from personal
        if body.account_id and body.account_id != user_id:
            # Check if user has access to this account via basejump account_user table
            account_access = await client.schema('basejump').from_('account_user').select('account_role').eq('user_id', user_id).eq('account_id', body.account_id).execute()
            if not (account_access.data and len(account_access.data) > 0):
                logger.warning(f"User {user_id} attempted to access account {body.account_id} without permission")
                raise HTTPException(status_code=403, detail="Not authorized to access this account")
        
        # Get integration ID based on type
        integration_id = None
        if body.integration_type == "outlook":
            integration_id = OUTLOOK_INTEGRATION_ID
        elif body.integration_type == "dropbox":
            integration_id = DROPBOX_INTEGRATION_ID
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported integration type: {body.integration_type}")
        
        # Use account_id as user_id for Composio
        user_id = effective_account_id
        
        # Check if integration already exists
        existing = await client.table('user_integrations').select('*').eq('account_id', effective_account_id).eq('integration_type', body.integration_type).execute()
        
        if existing.data and existing.data[0].get('status') == 'connected':
            return {
                "status": "already_connected",
                "integration": existing.data[0]
            }
        
        # Initiate connection with Composio using the new API
        connection_request = composio.connected_accounts.initiate(
            user_id=user_id,
            auth_config_id=integration_id
        )
        
        # Store or update integration record
        integration_data = {
            "account_id": effective_account_id,
            "integration_type": body.integration_type,
            "integration_provider": "composio",
            "composio_entity_id": user_id,
            "composio_connection_id": connection_request.id,
            "integration_id": integration_id,
            "status": "pending",
            "metadata": {
                "redirect_url": connection_request.redirect_url,
                "connection_request_id": connection_request.id
            }
        }
        
        if existing.data:
            # Update existing record
            result = await client.table('user_integrations').update(integration_data).eq('id', existing.data[0]['id']).execute()
        else:
            # Insert new record
            result = await client.table('user_integrations').insert(integration_data).execute()
        
        return {
            "redirect_url": connection_request.redirect_url,
            "connected_account_id": connection_request.id,
            "integration_id": result.data[0]['id'] if result.data else None
        }
        
    except Exception as e:
        logger.error(f"Failed to initiate Composio integration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/integrations/composio/status/{integration_type}")
async def get_integration_status(
    integration_type: str,
    account_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Get the status of a Composio integration"""
    try:
        client = await db.client
        
        # Determine the account_id to use
        effective_account_id = account_id if account_id else user_id
        
        # Verify user has access to the account if different from personal
        if account_id and account_id != user_id:
            # Check if user has access to this account via basejump account_user table
            account_access = await client.schema('basejump').from_('account_user').select('account_role').eq('user_id', user_id).eq('account_id', account_id).execute()
            if not (account_access.data and len(account_access.data) > 0):
                logger.warning(f"User {user_id} attempted to access account {account_id} without permission")
                raise HTTPException(status_code=403, detail="Not authorized to access this account")
        
        # Get integration record
        result = await client.table('user_integrations').select('*').eq('account_id', effective_account_id).eq('integration_type', integration_type).execute()
        
        if not result.data:
            return {
                "status": "not_found",
                "is_connected": False,
                "is_enabled": False
            }
        
        integration = result.data[0]
        
        # Check if we need to verify Composio connection
        if integration['status'] == 'pending' and integration.get('composio_connection_id'):
            # Try to verify if the connection is now active
            try:
                # Get the Composio entity ID (user_id in Composio)
                composio_entity_id = integration.get('composio_entity_id')
                
                if composio_entity_id:
                    # Check if connection exists by listing connected accounts for this user
                    try:
                        # List all connected accounts for this user
                        connected_accounts = composio.connected_accounts.list(
                            user_ids=[composio_entity_id]
                        )
                        
                        # Check if we have any connected accounts
                        if connected_accounts and hasattr(connected_accounts, 'items') and connected_accounts.items:
                            for account in connected_accounts.items:
                                # Check if this account matches our integration and is connected
                                if (hasattr(account, 'status') and account.status == 'ACTIVE' and 
                                    hasattr(account, 'toolkit') and hasattr(account.toolkit, 'slug')):
                                    
                                    # Map integration type to toolkit slug
                                    toolkit_slug = None
                                    if integration_type == 'outlook':
                                        toolkit_slug = 'outlook'
                                    elif integration_type == 'gmail':
                                        toolkit_slug = 'gmail'
                                    elif integration_type == 'dropbox':
                                        toolkit_slug = 'dropbox'
                                    
                                    # Check if this is the right integration
                                    if account.toolkit.slug == toolkit_slug:
                                        # Connection is active! Update the database
                                        update_data = {
                                            "status": "connected",
                                            "connected_at": datetime.now(timezone.utc).isoformat(),
                                            "updated_at": datetime.now(timezone.utc).isoformat()
                                        }
                                        
                                        # Store the connected account ID if available
                                        if hasattr(account, 'id'):
                                            metadata = integration.get('metadata', {})
                                            if isinstance(metadata, str):
                                                try:
                                                    metadata = json.loads(metadata)
                                                except:
                                                    metadata = {}
                                            metadata['connected_account_id'] = account.id
                                            update_data['metadata'] = metadata
                                            update_data['composio_connection_id'] = account.id
                                        
                                        await client.table('user_integrations').update(update_data).eq('id', integration['id']).execute()
                                        
                                        return JSONResponse({"status": "connected", "message": "Successfully connected"})
                        
                        # No active connection found yet
                        logger.debug(f"No active connection found for {integration_type} user {composio_entity_id}")
                        return JSONResponse({
                            "status": "pending",
                            "message": "Waiting for authorization. Please complete the authentication flow."
                        })
                        
                    except Exception as e:
                        logger.warning(f"Error checking connection for {integration_type}: {str(e)}")
                        # Fall back to checking if we have a connection request ID
                        metadata = integration.get('metadata', {})
                        if isinstance(metadata, str):
                            try:
                                metadata = json.loads(metadata)
                            except:
                                metadata = {}
                        
                        connection_request_id = metadata.get('connection_request_id') or integration.get('composio_connection_id')
                        
                        if connection_request_id:
                            try:
                                # Try wait_for_connection as a fallback
                                connected_account = composio.connected_accounts.wait_for_connection(
                                    connection_request_id=connection_request_id,
                                    timeout=1
                                )
                                
                                # If successful, update the database
                                await client.table('user_integrations').update({
                                    "status": "connected",
                                    "connected_at": datetime.now(timezone.utc).isoformat(),
                                    "updated_at": datetime.now(timezone.utc).isoformat(),
                                    "composio_connection_id": connected_account.id if hasattr(connected_account, 'id') else connection_request_id
                                }).eq('id', integration['id']).execute()
                                
                                return JSONResponse({"status": "connected", "message": "Successfully connected"})
                            except:
                                pass
                        
                        return JSONResponse({
                            "status": "pending",
                            "message": "Still waiting for authorization"
                        })
                else:
                    # No entity ID means not properly initialized
                    return JSONResponse({
                        "status": "error",
                        "message": "Integration not properly initialized"
                    })
            except Exception as e:
                logger.warning(f"Failed to verify Composio connection: {str(e)}")
        
        return {
            "status": integration['status'],
            "is_connected": integration['status'] == 'connected',
            "is_enabled": integration.get('is_enabled', False),
            "integration_id": integration['id'],
            "connected_at": integration.get('connected_at'),
            "error_message": integration.get('error_message')
        }
        
    except Exception as e:
        logger.error(f"Failed to get integration status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/integrations/composio/toggle")
async def toggle_integration(
    body: ToggleIntegrationRequest = Body(...),
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Toggle an integration on or off"""
    try:
        client = await db.client
        
        # Get integration record
        result = await client.table('user_integrations').select('*').eq('account_id', user_id).eq('integration_type', body.integration_type).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        integration = result.data[0]
        
        if integration['status'] != 'connected':
            raise HTTPException(status_code=400, detail="Integration is not connected")
        
        # Update is_enabled status
        update_result = await client.table('user_integrations').update({
            "is_enabled": body.is_enabled
        }).eq('id', integration['id']).execute()
        
        return {
            "success": True,
            "is_enabled": body.is_enabled
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to toggle integration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/integrations/composio/list")
async def list_integrations(
    account_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """List all integrations for the user"""
    try:
        client = await db.client
        
        # Determine the account_id to use
        effective_account_id = account_id if account_id else user_id
        
        # Get all integrations for the account
        result = await client.table('user_integrations').select('*').eq('account_id', effective_account_id).execute()
        
        # Define available integrations with their metadata
        available_integrations = [
            {
                "type": "outlook",
                "name": "Microsoft Outlook",
                "description": "Connect your Outlook account to send and manage emails",
                "icon": "📧",
                "status": "not_connected",
                "is_enabled": False
            },
            {
                "type": "dropbox",
                "name": "Dropbox",
                "description": "Connect your Dropbox account to manage files and folders",
                "icon": "📁",
                "status": "not_connected",
                "is_enabled": False
            }
            # Add more integrations here in the future
        ]
        
        # Update status for connected integrations
        for integration in available_integrations:
            connected = next(
                (i for i in result.data if i['integration_type'] == integration['type']),
                None
            )
            if connected:
                integration['status'] = connected['status']
                integration['is_enabled'] = connected.get('is_enabled', False)
                integration['connected_at'] = connected.get('connected_at')
                integration['integration_id'] = connected['id']
        
        return {
            "integrations": available_integrations
        }
        
    except Exception as e:
        logger.error(f"Failed to list integrations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/integrations/composio/disconnect")
async def disconnect_integration(
    body: InitiateIntegrationRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Disconnect a Composio integration for the user."""
    try:
        client = await db.client
        
        # Determine the account_id to use
        effective_account_id = body.account_id if body.account_id else user_id
        
        # Verify user has access to the account if different from personal
        if body.account_id and body.account_id != user_id:
            # Check if user has access to this account via basejump account_user table
            account_access = await client.schema('basejump').from_('account_user').select('account_role').eq('user_id', user_id).eq('account_id', body.account_id).execute()
            if not (account_access.data and len(account_access.data) > 0):
                logger.warning(f"User {user_id} attempted to access account {body.account_id} without permission")
                raise HTTPException(status_code=403, detail="Not authorized to access this account")
        
        # Check if integration exists
        existing = await client.table('user_integrations').select('*').eq('account_id', effective_account_id).eq('integration_type', body.integration_type).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail=f"Integration {body.integration_type} not found")
        
        # Delete the integration from database
        await client.table('user_integrations').delete().eq('account_id', effective_account_id).eq('integration_type', body.integration_type).execute()
        
        logger.info(f"Successfully disconnected {body.integration_type} integration for account {effective_account_id}")
        
        return {
            "status": "disconnected",
            "message": f"{body.integration_type} integration disconnected successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to disconnect integration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 