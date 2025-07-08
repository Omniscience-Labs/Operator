"""
MeetingBaaS API Service

Simple API client for MeetingBaaS meeting transcription service.
Handles bot creation, status monitoring, and webhook events.
"""

import asyncio
import aiohttp
import os
from typing import Dict, Any, Optional


class MeetingBaaSService:
    """
    Service for interacting with MeetingBaaS API.
    
    Provides methods to:
    1. Send bots to join meetings
    2. Monitor bot status
    3. Stop bots and get transcripts
    """
    
    def __init__(self):
        self.api_key = os.getenv('MEETINGBAAS_API_KEY')
        self.base_url = 'https://api.meetingbaas.com'
        
    async def start_meeting_bot(self, meeting_url: str, bot_name: str = "Omni Operator", webhook_url: str = None) -> Dict[str, Any]:
        """
        Start a meeting bot to join and transcribe the meeting.
        
        Args:
            meeting_url: URL of the meeting (Zoom, Teams, Meet, etc.)
            bot_name: Name to display for the bot in the meeting
            webhook_url: URL to receive real-time webhook events
            
        Returns:
            Dictionary with bot_id and status
        """
        
        if not self.api_key:
            raise ValueError("MEETINGBAAS_API_KEY environment variable not set")
            
        headers = {
            'x-meeting-baas-api-key': self.api_key,  # Correct header format
            'Content-Type': 'application/json'
        }
        
        payload = {
            'meeting_url': meeting_url,
            'bot_name': bot_name,
            'recording_mode': 'audio_only',  # Required field
            'reserved': False,  # Join immediately
            'speech_to_text': {
                'provider': 'Default'  # Required speech-to-text config
            },
            'automatic_leave': {
                'waiting_room_timeout': 600  # 10 minutes timeout
            }
        }
        
        # Add webhook URL for real-time updates (replaces polling!)
        if webhook_url:
            payload['webhook_url'] = webhook_url
        
        print(f"[MEETING BAAS] Making request to: {self.base_url}/bots")
        print(f"[MEETING BAAS] Headers: {headers}")
        print(f"[MEETING BAAS] Payload: {payload}")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f'{self.base_url}/bots',
                    headers=headers,
                    json=payload
                ) as response:
                    
                    print(f"[MEETING BAAS] Response status: {response.status}")
                    response_text = await response.text()
                    print(f"[MEETING BAAS] Response body: {response_text}")
                    
                    if response.status in [200, 201]:  # Accept both 200 and 201
                        try:
                            result = await response.json()
                            print(f"[MEETING BAAS] Parsed JSON: {result}")
                            
                            # Try different possible field names for bot ID
                            bot_id = result.get('bot_id') or result.get('id') or result.get('botId')
                            
                            return {
                                'success': True,
                                'bot_id': bot_id,
                                'status': 'joining',
                                'meeting_url': meeting_url,
                                'message': f'Bot "{bot_name}" is joining the meeting...'
                            }
                        except Exception as json_error:
                            print(f"[MEETING BAAS] JSON parsing error: {json_error}")
                            return {
                                'success': False,
                                'error': f'Failed to parse response: {str(json_error)}',
                                'status_code': response.status
                            }
                    else:
                        return {
                            'success': False,
                            'error': f'API returned {response.status}: {response_text}',
                            'status_code': response.status
                        }
        except Exception as request_error:
            print(f"[MEETING BAAS] Request error: {request_error}")
            return {
                'success': False,
                'error': f'Request failed: {str(request_error)}'
            }
    
    async def get_bot_status(self, bot_id: str) -> Dict[str, Any]:
        """
        Get the current status of a meeting bot.
        
        Args:
            bot_id: ID of the bot to check
            
        Returns:
            Dictionary with bot status and transcript if available
        """
        
        if not self.api_key:
            return {
                'success': False,
                'error': 'MEETINGBAAS_API_KEY environment variable not set'
            }
        
        headers = {
            'x-meeting-baas-api-key': self.api_key,  # Correct header format
            'Content-Type': 'application/json'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f'{self.base_url}/bots/{bot_id}',
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)  # 10 second timeout
                ) as response:
                    
                    response_text = await response.text()
                    
                    if response.status == 200:
                        try:
                            result = await response.json()
                            return {
                                'success': True,
                                'status': result.get('status'),
                                'transcript': result.get('transcript', ''),
                                'participants': result.get('participants', []),
                                'duration': result.get('duration_seconds', 0),
                                'recording_url': result.get('recording_url')
                            }
                        except Exception as json_error:
                            return {
                                'success': False,
                                'error': f'Failed to parse response JSON: {str(json_error)}'
                            }
                    elif response.status == 401:
                        # Log API key details for debugging (without exposing full key)
                        key_preview = f"{self.api_key[:10]}..." if self.api_key else "None"
                        print(f"[MEETING BAAS] 401 Unauthorized for bot {bot_id}. API key: {key_preview}")
                        print(f"[MEETING BAAS] Response: {response_text}")
                        return {
                            'success': False,
                            'error': f'API returned 401: {response_text}',
                            'status_code': 401
                        }
                    elif response.status == 404:
                        return {
                            'success': False,
                            'error': f'Bot {bot_id} not found (may have been removed)',
                            'status_code': 404
                        }
                    else:
                        print(f"[MEETING BAAS] Unexpected status {response.status} for bot {bot_id}: {response_text}")
                        return {
                            'success': False,
                            'error': f'API returned {response.status}: {response_text}',
                            'status_code': response.status
                        }
        except asyncio.TimeoutError:
            return {
                'success': False,
                'error': 'Request timed out - MeetingBaaS API may be unreachable'
            }
        except aiohttp.ClientError as client_error:
            return {
                'success': False,
                'error': f'Network error: {str(client_error)}'
            }
        except Exception as unexpected_error:
            return {
                'success': False,
                'error': f'Unexpected error: {str(unexpected_error)}'
            }
    
    async def get_bot_transcript(self, bot_id: str) -> Dict[str, Any]:
        """
        Get the transcript for a completed meeting bot.
        
        Args:
            bot_id: ID of the bot to get transcript for
            
        Returns:
            Dictionary with transcript data
        """
        
        if not self.api_key:
            return {
                'success': False,
                'error': 'MEETINGBAAS_API_KEY environment variable not set'
            }
        
        headers = {
            'x-meeting-baas-api-key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f'{self.base_url}/bots/{bot_id}/transcript',
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=15)  # Longer timeout for transcript
                ) as response:
                    
                    response_text = await response.text()
                    
                    if response.status == 200:
                        try:
                            result = await response.json()
                            return {
                                'success': True,
                                'transcript': result.get('transcript', []),
                                'speakers': result.get('speakers', []),
                                'duration': result.get('duration_seconds', 0),
                                'recording_url': result.get('recording_url')
                            }
                        except Exception as json_error:
                            return {
                                'success': False,
                                'error': f'Failed to parse transcript JSON: {str(json_error)}'
                            }
                    elif response.status == 401:
                        key_preview = f"{self.api_key[:10]}..." if self.api_key else "None"
                        print(f"[MEETING BAAS] 401 Unauthorized getting transcript for bot {bot_id}. API key: {key_preview}")
                        return {
                            'success': False,
                            'error': f'API returned 401: {response_text}',
                            'status_code': 401
                        }
                    elif response.status == 404:
                        return {
                            'success': False,
                            'error': f'Transcript for bot {bot_id} not found',
                            'status_code': 404
                        }
                    else:
                        return {
                            'success': False,
                            'error': f'API returned {response.status}: {response_text}',
                            'status_code': response.status
                        }
        except Exception as e:
            return {
                'success': False,
                'error': f'Error getting transcript: {str(e)}'
            }
    
    async def stop_meeting_bot(self, bot_id: str) -> Dict[str, Any]:
        """
        Stop a meeting bot and get final transcript.
        
        Args:
            bot_id: ID of the bot to stop
            
        Returns:
            Dictionary with final transcript and metadata
        """
        
        headers = {
            'x-meeting-baas-api-key': self.api_key,  # Correct header format
            'Content-Type': 'application/json'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.delete(
                f'{self.base_url}/bots/{bot_id}',
                headers=headers
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    # MeetingBaaS returns {"ok": true} for DELETE requests
                    if result.get('ok'):
                        return {
                            'success': True,
                            'message': 'Bot successfully removed from meeting',
                            'transcript': '',  # Will be provided via webhook
                            'participants': [],
                            'duration': 0
                        }
                    else:
                        return {
                            'success': False,
                            'error': 'Bot removal not confirmed'
                        }
                else:
                    return {
                        'success': False,
                        'error': f'Failed to stop bot: {await response.text()}'
                    }


# Service instance for API usage
meeting_baas_service = MeetingBaaSService() 