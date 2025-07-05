"""
Meetings service for handling meeting creation, management, and real-time transcription.
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import HTTPException, WebSocket
from services.supabase import DBConnection
from utils.logger import logger
import aiohttp
from asyncio import create_task

class MeetingsService:
    """Service for managing meetings and transcriptions."""
    
    def __init__(self):
        self.db = DBConnection()
        self.active_transcriptions: Dict[str, WebSocket] = {}
        
    async def create_meeting(
        self, 
        account_id: str, 
        title: str, 
        folder_id: Optional[str] = None,
        recording_mode: str = "local"
    ) -> Dict[str, Any]:
        """Create a new meeting."""
        client = await self.db.client
        
        data = {
            "account_id": account_id,
            "title": title,
            "folder_id": folder_id,
            "recording_mode": recording_mode,
            "status": "active"
        }
        
        try:
            result = await client.table('meetings').insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating meeting: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create meeting")
    
    async def get_meetings(
        self, 
        account_id: str, 
        folder_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all meetings for an account, optionally filtered by folder."""
        client = await self.db.client
        
        query = client.table('meetings').select('*').eq('account_id', account_id)
        
        if folder_id is not None:
            query = query.eq('folder_id', folder_id)
        else:
            # For root folder, only show meetings with no folder_id
            query = query.is_('folder_id', 'null')
            
        try:
            result = await query.order('created_at', desc=True).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching meetings: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch meetings")
    
    async def get_all_meetings(self, account_id: str) -> List[Dict[str, Any]]:
        """Get ALL meetings for an account across all folders (for search)."""
        client = await self.db.client
        
        try:
            result = await client.table('meetings').select('*').eq('account_id', account_id).order('created_at', desc=True).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching all meetings: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch all meetings")
    
    async def get_meeting(self, meeting_id: str) -> Dict[str, Any]:
        """Get a specific meeting by ID."""
        client = await self.db.client
        
        try:
            result = await client.table('meetings').select('*').eq('meeting_id', meeting_id).single().execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching meeting: {str(e)}")
            raise HTTPException(status_code=404, detail="Meeting not found")
    
    async def update_meeting(
        self, 
        meeting_id: str, 
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a meeting."""
        client = await self.db.client
        
        # Remove fields that shouldn't be updated
        updates.pop('meeting_id', None)
        updates.pop('account_id', None)
        updates.pop('created_at', None)
        
        try:
            result = await client.table('meetings').update(updates).eq('meeting_id', meeting_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating meeting: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update meeting")
    
    async def append_transcript(
        self, 
        meeting_id: str, 
        text: str
    ) -> None:
        """Append text to the meeting transcript."""
        client = await self.db.client
        
        try:
            # First get the current transcript
            meeting = await self.get_meeting(meeting_id)
            current_transcript = meeting.get('transcript', '')
            
            # Append the new text with a newline to preserve line breaks
            new_transcript = current_transcript + '\n' + text if current_transcript else text
            
            # Update the transcript
            await client.table('meetings').update({
                'transcript': new_transcript
            }).eq('meeting_id', meeting_id).execute()
            
        except Exception as e:
            logger.error(f"Error appending to transcript: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update transcript")
    
    async def delete_meeting(self, meeting_id: str) -> None:
        """Delete a meeting."""
        client = await self.db.client
        
        try:
            await client.table('meetings').delete().eq('meeting_id', meeting_id).execute()
        except Exception as e:
            logger.error(f"Error deleting meeting: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete meeting")
    
    # Folder management methods
    async def create_folder(
        self, 
        account_id: str, 
        name: str, 
        parent_folder_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new folder."""
        client = await self.db.client
        
        data = {
            "account_id": account_id,
            "name": name,
            "parent_folder_id": parent_folder_id
        }
        
        try:
            result = await client.table('meeting_folders').insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating folder: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create folder")
    
    async def get_folders(
        self, 
        account_id: str, 
        parent_folder_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all folders for an account."""
        client = await self.db.client
        
        query = client.table('meeting_folders').select('*').eq('account_id', account_id)
        
        if parent_folder_id is not None:
            query = query.eq('parent_folder_id', parent_folder_id)
        else:
            query = query.is_('parent_folder_id', 'null')
            
        try:
            result = await query.order('position').order('name').execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching folders: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch folders")
    
    async def update_folder(
        self, 
        folder_id: str, 
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a folder."""
        client = await self.db.client
        
        # Remove fields that shouldn't be updated
        updates.pop('folder_id', None)
        updates.pop('account_id', None)
        updates.pop('created_at', None)
        
        try:
            result = await client.table('meeting_folders').update(updates).eq('folder_id', folder_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating folder: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update folder")
    
    async def delete_folder(self, folder_id: str) -> None:
        """Delete a folder and optionally move its contents."""
        client = await self.db.client
        
        try:
            # First, move all meetings in this folder to parent (null)
            await client.table('meetings').update({
                'folder_id': None
            }).eq('folder_id', folder_id).execute()
            
            # Move all subfolders to parent
            folder = await client.table('meeting_folders').select('parent_folder_id').eq('folder_id', folder_id).single().execute()
            parent_id = folder.data.get('parent_folder_id') if folder.data else None
            
            await client.table('meeting_folders').update({
                'parent_folder_id': parent_id
            }).eq('parent_folder_id', folder_id).execute()
            
            # Delete the folder
            await client.table('meeting_folders').delete().eq('folder_id', folder_id).execute()
        except Exception as e:
            logger.error(f"Error deleting folder: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete folder")
    
    # Search functionality
    async def search_meetings(
        self, 
        account_id: str, 
        query: str, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Search meetings using full-text search."""
        client = await self.db.client
        
        try:
            # First try the dedicated search function
            logger.info(f"Searching meetings for account {account_id} with query: '{query}'")
            result = await client.rpc('search_meetings', {
                'p_account_id': account_id,
                'p_search_query': query,
                'p_limit': limit
            }).execute()
            
            if result.data:
                logger.info(f"Search found {len(result.data)} results")
                return result.data
            else:
                logger.warning(f"Search function returned no results, trying fallback search")
                
                # Fallback to simple text matching if RPC returns empty
                fallback_result = await client.table('meetings')\
                    .select('meeting_id, title, transcript, created_at')\
                    .eq('account_id', account_id)\
                    .or_(f'title.ilike.%{query}%, transcript.ilike.%{query}%')\
                    .order('created_at', desc=True)\
                    .limit(limit)\
                    .execute()
                
                # Format results to match search function output
                formatted_results = []
                for meeting in fallback_result.data:
                    # Create a snippet from the transcript
                    transcript = meeting.get('transcript', '')
                    snippet = transcript[:200] + '...' if len(transcript) > 200 else transcript
                    
                    formatted_results.append({
                        'meeting_id': meeting['meeting_id'],
                        'title': meeting['title'],
                        'snippet': snippet,
                        'rank': 1.0,  # Default rank
                        'created_at': meeting['created_at']
                    })
                
                logger.info(f"Fallback search found {len(formatted_results)} results")
                return formatted_results
                
        except Exception as e:
            logger.error(f"Error searching meetings: {str(e)}")
            # Try a basic search as last resort
            try:
                basic_result = await client.table('meetings')\
                    .select('meeting_id, title, transcript, created_at')\
                    .eq('account_id', account_id)\
                    .limit(limit)\
                    .execute()
                    
                logger.info(f"Basic query found {len(basic_result.data) if basic_result.data else 0} total meetings")
                return []  # Return empty for search, but we logged the total count
            except Exception as basic_error:
                logger.error(f"Even basic query failed: {str(basic_error)}")
                raise HTTPException(status_code=500, detail="Failed to search meetings")
    
    # Sharing functionality
    async def share_meeting(
        self, 
        meeting_id: str, 
        shared_with_account_id: str,
        permission_level: str = "view"
    ) -> Dict[str, Any]:
        """Share a meeting with another account."""
        client = await self.db.client
        
        data = {
            "meeting_id": meeting_id,
            "shared_with_account_id": shared_with_account_id,
            "permission_level": permission_level
        }
        
        try:
            result = await client.table('meeting_shares').insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error sharing meeting: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to share meeting")
    
    async def unshare_meeting(
        self, 
        meeting_id: str, 
        shared_with_account_id: str
    ) -> None:
        """Remove meeting share."""
        client = await self.db.client
        
        try:
            await client.table('meeting_shares').delete()\
                .eq('meeting_id', meeting_id)\
                .eq('shared_with_account_id', shared_with_account_id)\
                .execute()
        except Exception as e:
            logger.error(f"Error unsharing meeting: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to unshare meeting")
    
    async def get_shared_meetings(self, account_id: str) -> List[Dict[str, Any]]:
        """Get all meetings shared with this account."""
        client = await self.db.client
        
        try:
            # Get meeting shares
            shares_result = await client.table('meeting_shares')\
                .select('meeting_id, permission_level')\
                .eq('shared_with_account_id', account_id)\
                .execute()
            
            if not shares_result.data:
                return []
            
            # Get the actual meetings
            meeting_ids = [share['meeting_id'] for share in shares_result.data]
            meetings_result = await client.table('meetings')\
                .select('*')\
                .in_('meeting_id', meeting_ids)\
                .execute()
            
            # Add permission level to each meeting
            meetings_dict = {m['meeting_id']: m for m in meetings_result.data}
            for share in shares_result.data:
                if share['meeting_id'] in meetings_dict:
                    meetings_dict[share['meeting_id']]['permission_level'] = share['permission_level']
            
            return list(meetings_dict.values())
            
        except Exception as e:
            logger.error(f"Error fetching shared meetings: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch shared meetings")
    
    # WebSocket handling for real-time transcription
    async def handle_transcription_websocket(
        self, 
        websocket: WebSocket, 
        meeting_id: str
    ):
        """Handle WebSocket connection for real-time transcription updates."""
        await websocket.accept()
        self.active_transcriptions[meeting_id] = websocket
        
        try:
            while True:
                # Receive transcription data from client
                data = await websocket.receive_json()
                
                if data.get('type') == 'transcript':
                    text = data.get('text', '')
                    if text:
                        # Append to database
                        await self.append_transcript(meeting_id, text)
                        
                        # Broadcast to other connected clients
                        for mid, ws in self.active_transcriptions.items():
                            if mid == meeting_id and ws != websocket:
                                try:
                                    await ws.send_json({
                                        'type': 'transcript_update',
                                        'text': text
                                    })
                                except:
                                    pass
                
                elif data.get('type') == 'status_update':
                    status = data.get('status')
                    if status:
                        await self.update_meeting(meeting_id, {'status': status})
                        
        except Exception as e:
            logger.error(f"WebSocket error for meeting {meeting_id}: {str(e)}")
        finally:
            if meeting_id in self.active_transcriptions:
                del self.active_transcriptions[meeting_id]
            try:
                await websocket.close()
            except:
                pass

# Create a singleton instance
meetings_service = MeetingsService() 