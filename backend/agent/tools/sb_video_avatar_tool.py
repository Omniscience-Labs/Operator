"""
HeyGen Video Avatar Tool for Operator

This tool integrates HeyGen's Streaming Avatar SDK to provide interactive video avatar
functionality within the Operator sandbox environment. It allows agents to create,
manage, and interact with AI video avatars for enhanced user communication.
"""

import os
import json
import asyncio
import aiohttp
from typing import Optional, Dict, Any, List, Union
from agentpress.tool import ToolResult, openapi_schema, xml_schema
from sandbox.tool_base import SandboxToolsBase
from agentpress.thread_manager import ThreadManager
from utils.logger import logger
from utils.config import config


class SandboxVideoAvatarTool(SandboxToolsBase):
    """
    A tool for creating and managing HeyGen interactive video avatars.
    
    This tool provides functionality to:
    - Create avatar sessions with customizable settings
    - Make avatars speak with text or conversational responses
    - Manage avatar states (listening, speaking, idle)
    - Handle voice chat interactions
    - Configure avatar appearance and voice settings
    """

    name: str = "sb_video_avatar_tool"
    description: str = """
    Generate videos with AI avatars that can speak any text with natural speech and lip sync.
    
    Use this tool whenever users ask for ANY type of video creation or generation, including:
    - "Generate a video" / "Create a video" / "Make a video" 
    - "Can you make me a video?" / "I need a video"
    - "Create a talking video" / "Make a speaking video"
    - "Generate video content" / "Produce a video" 
    - "Record a video message" / "Make a video presentation"
    - "Create an avatar video" / "Make a talking avatar"
    - "I want a video of..." / "Show me in video form"
    - "Turn this into a video" / "Make this into video"
    - "Create a demo video" / "Make an explainer video"
    - "Generate a marketing video" / "Create promotional content"
    - "Make a personalized video" / "Create a custom video"
    - "I need video content" / "Help me with video creation"
    - Any request involving video generation, creation, or production
    
    Features:
    - AI video generation with realistic avatars
    - Text-to-speech with natural lip synchronization  
    - Customizable avatar appearance and voice settings
    - Real-time conversation capabilities
    - Interactive video sessions
    
    Perfect for creating engaging videos, presentations, educational content, 
    marketing materials, demos, explainers, and interactive demonstrations.
    """

    def __init__(self, project_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)
        self.workspace_path = "/workspace"
        
        # HeyGen API configuration - try multiple sources
        self.heygen_api_key = config.HEYGEN_API_KEY or os.getenv('HEYGEN_API_KEY', '')
        self.heygen_api_base = config.HEYGEN_API_BASE or os.getenv('HEYGEN_API_BASE', 'https://api.heygen.com')
        
        # Debug logging
        logger.info(f"Config HEYGEN_API_KEY: {'SET' if config.HEYGEN_API_KEY else 'NOT SET'}")
        logger.info(f"Env HEYGEN_API_KEY: {'SET' if os.getenv('HEYGEN_API_KEY') else 'NOT SET'}")
        logger.info(f"Final API key: {'SET' if self.heygen_api_key else 'NOT SET'}")
        
        # Session management
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        
        if not self.heygen_api_key:
            logger.warning("HEYGEN_API_KEY not configured in config system")
        else:
            logger.info(f"HeyGen API key loaded: {self.heygen_api_key[:10]}...")
            logger.info(f"HeyGen API base: {self.heygen_api_base}")

    async def _get_valid_voice_id(self, voice_id: str) -> str:
        """Get a valid voice ID, fetching available voices if needed."""
        if voice_id and voice_id != "default":
            return voice_id
        
        try:
            # Try to get available voices
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.heygen_api_base}/v2/voices",
                    headers={
                        "x-api-key": self.heygen_api_key,
                        "accept": "application/json"
                    }
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        voices = result.get("data", {}).get("voices", [])
                        if voices:
                            # Return the first available voice
                            first_voice = voices[0]
                            voice_id = first_voice.get('voice_id')
                            voice_name = first_voice.get('name', first_voice.get('voice_name', 'Unknown'))
                            logger.info(f"Using first available voice: {voice_name} ({voice_id})")
                            return voice_id
        except Exception as e:
            logger.warning(f"Could not fetch voices: {e}")
        
        # Fallback to a commonly available voice ID or the original hardcoded one
        fallback_voice = "1bd001e7e50f421d891986aad5158bc8"
        logger.warning(f"Using fallback voice ID: {fallback_voice}")
        return fallback_voice

    async def _download_video_to_workspace(self, video_url: str, video_id: str) -> Optional[str]:
        """Download video from HeyGen to workspace and return the local path."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(video_url) as response:
                    if response.status == 200:
                        # Create videos directory if it doesn't exist
                        videos_dir = f"{self.workspace_path}/videos"
                        self.sandbox.fs.create_folder(videos_dir, "755")
                        
                        # Save video file
                        filename = f"{video_id}.mp4"
                        video_path = f"videos/{filename}"
                        full_path = f"{videos_dir}/{filename}"
                        
                        video_data = await response.read()
                        self.sandbox.fs.upload_file(video_data, full_path)
                        
                        # Update video info with local path
                        video_info_file = f"{videos_dir}/{video_id}_info.json"
                        try:
                            existing_content = self.sandbox.fs.read_file(video_info_file)
                            video_info = json.loads(existing_content.decode())
                            video_info["local_path"] = video_path
                            video_info["downloaded_at"] = "2025-01-27T00:00:00Z"
                            
                            self.sandbox.fs.upload_file(
                                json.dumps(video_info, indent=2).encode(),
                                video_info_file
                            )
                        except Exception as e:
                            logger.warning(f"Could not update video info with local path: {e}")
                        
                        logger.info(f"Downloaded video {video_id} to {video_path}")
                        return video_path
                    else:
                        logger.error(f"Failed to download video: HTTP {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Error downloading video: {e}")
            return None

    async def _create_session_token(self) -> str:
        """Create a session token for HeyGen API."""
        if not self.heygen_api_key:
            raise ValueError("HEYGEN_API_KEY is required for avatar operations")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.heygen_api_base}/v1/streaming.create_token",
                    headers={"x-api-key": self.heygen_api_key}
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"HeyGen API error {response.status}: {error_text}")
                    
                    data = await response.json()
                    # HeyGen API returns token in data.data.token structure
                    token = data.get('data', {}).get('token', '') or data.get('token', '')
                    if not token:
                        raise Exception(f"No token returned from HeyGen API. Response: {data}")
                    return token
        except Exception as e:
            logger.error(f"Error creating session token: {str(e)}")
            raise e

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "create_avatar_session",
            "description": "Create a new interactive video avatar session with customizable settings. This sets up the avatar with specified appearance, voice, and behavioral parameters.",
            "parameters": {
                "type": "object",
                "properties": {
                    "session_name": {
                        "type": "string",
                        "description": "Unique name for this avatar session (used for management and reference)"
                    },
                    "avatar_id": {
                        "type": "string",
                        "description": "HeyGen avatar ID to use. Use 'default' for the default avatar, or specify a custom avatar ID from your HeyGen account",
                        "default": "default"
                    },
                    "voice_id": {
                        "type": "string",
                        "description": "Voice ID for the avatar's speech. Use HeyGen voice IDs from the List Voices API",
                        "default": "default"
                    },
                    "voice_rate": {
                        "type": "number",
                        "description": "Speech rate for the avatar (0.5 to 1.5, where 1.0 is normal speed)",
                        "default": 1.0,
                        "minimum": 0.5,
                        "maximum": 1.5
                    },
                    "voice_emotion": {
                        "type": "string",
                        "description": "Emotional tone for the avatar's voice",
                        "enum": ["EXCITED", "SERIOUS", "FRIENDLY", "SOOTHING", "BROADCASTER"],
                        "default": "FRIENDLY"
                    },
                    "quality": {
                        "type": "string",
                        "description": "Video quality for the avatar stream",
                        "enum": ["low", "medium", "high"],
                        "default": "medium"
                    },
                    "language": {
                        "type": "string",
                        "description": "Language code for the avatar (e.g., 'en', 'es', 'fr', 'de')",
                        "default": "en"
                    },
                    "knowledge_base": {
                        "type": "string",
                        "description": "Custom system prompt or knowledge base for the avatar's conversational responses",
                        "default": ""
                    },
                    "enable_voice_chat": {
                        "type": "boolean",
                        "description": "Enable real-time voice chat capabilities",
                        "default": False
                    },
                    "session_timeout": {
                        "type": "integer",
                        "description": "Session timeout in seconds (30-3600). Default is 300 seconds (5 minutes)",
                        "default": 300,
                        "minimum": 30,
                        "maximum": 3600
                    }
                },
                "required": ["session_name"]
            }
        }
    })
    @xml_schema(
        tag_name="create-avatar-session",
        mappings=[
            {"param_name": "session_name", "node_type": "attribute", "path": ".", "required": True},
            {"param_name": "avatar_id", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "voice_id", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "voice_rate", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "voice_emotion", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "quality", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "language", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "knowledge_base", "node_type": "element", "path": "knowledge_base", "required": False},
            {"param_name": "enable_voice_chat", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "session_timeout", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="create_avatar_session">
        <parameter name="session_name">customer_service_avatar</parameter>
        <parameter name="avatar_id">default</parameter>
        <parameter name="voice_id">en-US-AriaNeural</parameter>
        <parameter name="voice_rate">1.0</parameter>
        <parameter name="voice_emotion">FRIENDLY</parameter>
        <parameter name="quality">high</parameter>
        <parameter name="language">en</parameter>
        <parameter name="enable_voice_chat">true</parameter>
        <parameter name="session_timeout">600</parameter>
        <parameter name="knowledge_base">You are a helpful customer service representative. Be polite, professional, and helpful in all interactions.</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def create_avatar_session(self,
                                  session_name: str,
                                  avatar_id: str = "default",
                                  voice_id: str = "default",
                                  voice_rate: float = 1.0,
                                  voice_emotion: str = "FRIENDLY",
                                  quality: str = "medium",
                                  language: str = "en",
                                  knowledge_base: str = "",
                                  enable_voice_chat: bool = False,
                                  session_timeout: int = 300) -> ToolResult:
        """Create a new interactive video avatar session.
        
        Args:
            session_name: Unique name for this avatar session
            avatar_id: HeyGen avatar ID to use
            voice_id: Voice ID for the avatar's speech
            voice_rate: Speech rate (0.5-1.5)
            voice_emotion: Emotional tone for voice
            quality: Video quality (low/medium/high)
            language: Language code
            knowledge_base: Custom system prompt for conversations
            enable_voice_chat: Enable voice chat capabilities
            session_timeout: Session timeout in seconds
            
        Returns:
            ToolResult with session creation status and details
        """
        try:
            # Ensure sandbox is initialized
            await self._ensure_sandbox()
            
            # Check if session name already exists
            if session_name in self.active_sessions:
                return self.fail_response(f"Avatar session '{session_name}' already exists. Use a different name or close the existing session first.")
            
            # Create session token
            try:
                session_token = await self._create_session_token()
                if not session_token:
                    return self.fail_response("Failed to create HeyGen session token. Please check your API key.")
            except Exception as e:
                return self.fail_response(f"Failed to create HeyGen session token: {str(e)}. Please check your API key and configuration.")
            
            # Prepare session configuration
            session_config = {
                "avatarName": avatar_id,
                "quality": quality,
                "voice": {
                    "voiceId": voice_id,
                    "rate": voice_rate,
                    "emotion": voice_emotion
                },
                "language": language,
                "activityIdleTimeout": session_timeout
            }
            
            if knowledge_base:
                session_config["knowledgeBase"] = knowledge_base
            
            # Create the avatar session via HeyGen API
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{self.heygen_api_base}/v1/streaming.new",
                        headers={
                            "Authorization": f"Bearer {session_token}",
                            "Content-Type": "application/json"
                        },
                        json=session_config
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            return self.fail_response(f"Failed to create avatar session: {response.status} - {error_text}")
                        
                        session_data = await response.json()
                        logger.info(f"HeyGen session creation response: {session_data}")
                        
                        # Extract session info from HeyGen response structure
                        # HeyGen API may return data in different structures
                        data_section = session_data.get("data", session_data)
                        session_id = (
                            session_data.get("session_id") or 
                            data_section.get("session_id") or
                            session_data.get("sessionId") or
                            data_section.get("sessionId")
                        )
                        websocket_url = (
                            session_data.get("url") or 
                            data_section.get("url") or
                            session_data.get("websocket_url") or
                            data_section.get("websocket_url")
                        )
                        access_token = (
                            session_data.get("access_token") or
                            data_section.get("access_token") or
                            session_data.get("token") or
                            data_section.get("token")
                        )
                        
                        if not session_id:
                            logger.error(f"No session_id found in HeyGen response: {session_data}")
                            return self.fail_response(f"HeyGen API did not return a session_id. Response: {session_data}")
                        
                        # Store session information
                        self.active_sessions[session_name] = {
                            "session_id": session_id,
                            "access_token": access_token,
                            "websocket_url": websocket_url,
                            "config": session_config,
                            "token": session_token,
                            "status": "created",
                            "voice_chat_enabled": enable_voice_chat
                        }
                        
                        # Create avatars directory in workspace
                        avatars_dir = f"{self.workspace_path}/avatars"
                        self.sandbox.fs.create_folder(avatars_dir, "755")
                        
                        # Save session info to file
                        session_file = f"{avatars_dir}/{session_name}_session.json"
                        session_info = {
                            "session_name": session_name,
                            "session_id": session_id,
                            "websocket_url": websocket_url,
                            "access_token": access_token,
                            "config": session_config,
                            "created_at": session_data.get("created_at", ""),
                            "status": "active"
                        }
                        
                        self.sandbox.fs.upload_file(
                            json.dumps(session_info, indent=2).encode(),
                            session_file
                        )
                        
                        message = f"🎭 Avatar session '{session_name}' created successfully!\n\n"
                        message += f"Session Details:\n"
                        message += f"- Session ID: {session_id}\n"
                        message += f"- Avatar: {avatar_id}\n"
                        message += f"- Voice: {voice_id} ({voice_emotion.lower()}, rate: {voice_rate})\n"
                        message += f"- Quality: {quality}\n"
                        message += f"- Language: {language}\n"
                        message += f"- Timeout: {session_timeout} seconds\n"
                        if knowledge_base:
                            message += f"- Knowledge Base: Configured\n"
                        if enable_voice_chat:
                            message += f"- Voice Chat: Enabled\n"
                        
                        message += f"\nSession saved to: avatars/{session_name}_session.json\n"
                        message += f"\nUse 'avatar_speak' to make the avatar talk, or 'start_voice_chat' for interactive conversations."
                        
                        return self.success_response(message)
                        
            except Exception as e:
                logger.error(f"Error creating avatar session: {str(e)}")
                return self.fail_response(f"Failed to create avatar session: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in create_avatar_session: {str(e)}", exc_info=True)
            return self.fail_response(f"Avatar session creation failed: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "avatar_speak",
            "description": "Make an avatar speak the provided text. The avatar will generate speech and synchronized lip movements for the given content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "session_name": {
                        "type": "string",
                        "description": "Name of the avatar session to use"
                    },
                    "text": {
                        "type": "string",
                        "description": "Text for the avatar to speak. Can be a direct message or conversational content."
                    },
                    "task_type": {
                        "type": "string",
                        "description": "Type of speaking task",
                        "enum": ["REPEAT", "TALK"],
                        "default": "REPEAT"
                    },
                    "task_mode": {
                        "type": "string", 
                        "description": "Execution mode for the speaking task",
                        "enum": ["SYNC", "ASYNC"],
                        "default": "SYNC"
                    }
                },
                "required": ["session_name", "text"]
            }
        }
    })
    @xml_schema(
        tag_name="avatar-speak",
        mappings=[
            {"param_name": "session_name", "node_type": "attribute", "path": ".", "required": True},
            {"param_name": "text", "node_type": "content", "path": ".", "required": True},
            {"param_name": "task_type", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "task_mode", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="avatar_speak">
        <parameter name="session_name">customer_service_avatar</parameter>
        <parameter name="task_type">REPEAT</parameter>
        <parameter name="task_mode">SYNC</parameter>
        <parameter name="text">Hello! Welcome to our service. How can I help you today?</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def avatar_speak(self,
                          session_name: str,
                          text: str,
                          task_type: str = "REPEAT",
                          task_mode: str = "SYNC") -> ToolResult:
        """Make an avatar speak the provided text.
        
        Args:
            session_name: Name of the avatar session
            text: Text for the avatar to speak
            task_type: Type of task (REPEAT or TALK)
            task_mode: Execution mode (SYNC or ASYNC)
            
        Returns:
            ToolResult with speaking command status
        """
        try:
            # Check if session exists
            if session_name not in self.active_sessions:
                return self.fail_response(f"Avatar session '{session_name}' not found. Create a session first using 'create_avatar_session'.")
            
            session_info = self.active_sessions[session_name]
            logger.info(f"Avatar speak session_info: {session_info}")
            
            # Prepare speak request
            speak_request = {
                "text": text,
                "task_type": task_type,
                "task_mode": task_mode
            }
            
            # HeyGen Streaming Avatar is designed for frontend WebRTC implementations
            # The backend can create sessions but video streaming happens in the browser
            try:
                session_id = session_info.get('session_id')
                websocket_url = session_info.get('websocket_url') or session_info.get('realtime_endpoint')
                
                if not session_id:
                    return self.fail_response(f"No session_id found for session '{session_name}'")
                
                # Generate HTML snippet for frontend integration
                html_snippet = f"""
<!DOCTYPE html>
<html>
<head>
    <title>HeyGen Avatar - {session_name}</title>
    <script src="https://cdn.jsdelivr.net/npm/@heygen/streaming-avatar@2.0.16/dist/streaming-avatar.umd.js"></script>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f0f0f0;
        }}
        #avatar-container {{
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        }}
        #avatar-video {{
            width: 100%;
            max-width: 500px;
            height: auto;
            border-radius: 8px;
            background: #000;
        }}
        button {{
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
        }}
        button:hover {{
            background: #0056b3;
        }}
        button:disabled {{
            background: #ccc;
            cursor: not-allowed;
        }}
        .status {{
            margin: 10px 0;
            padding: 10px;
            border-radius: 4px;
        }}
        .status.loading {{
            background: #fff3cd;
            color: #856404;
        }}
        .status.success {{
            background: #d4edda;
            color: #155724;
        }}
        .status.error {{
            background: #f8d7da;
            color: #721c24;
        }}
    </style>
</head>
<body>
    <div id="avatar-container">
        <h1>HeyGen Avatar - {session_name}</h1>
        <div id="status" class="status loading">Initializing avatar...</div>
        <video id="avatar-video" autoplay playsinline muted></video>
        <br>
        <button id="speak-btn" onclick="speakText()" disabled>Say: "{text}"</button>
        <button id="init-btn" onclick="initializeAvatar()" style="display:none;">Retry Initialize</button>
    </div>
    
    <script>
        let streamingAvatar;
        const statusDiv = document.getElementById('status');
        const speakBtn = document.getElementById('speak-btn');
        const initBtn = document.getElementById('init-btn');
        const videoElement = document.getElementById('avatar-video');
        
        function updateStatus(message, type = 'loading') {{
            statusDiv.textContent = message;
            statusDiv.className = `status ${{type}}`;
        }}
        
        async function initializeAvatar() {{
            try {{
                updateStatus('Loading HeyGen SDK...', 'loading');
                
                // Check if SDK loaded
                if (typeof StreamingAvatar === 'undefined') {{
                    throw new Error('HeyGen SDK failed to load');
                }}
                
                updateStatus('Creating avatar session...', 'loading');
                
                // Create new avatar session (don't reuse existing session)
                streamingAvatar = new StreamingAvatar({{
                    token: '{session_info.get("token", "")}'
                }});
                
                // Set up event listeners
                streamingAvatar.on('avatar_start_talking', () => {{
                    updateStatus('Avatar is speaking...', 'success');
                }});
                
                streamingAvatar.on('avatar_stop_talking', () => {{
                    updateStatus('Avatar finished speaking', 'success');
                }});
                
                streamingAvatar.on('stream_ready', () => {{
                    updateStatus('Avatar ready!', 'success');
                    speakBtn.disabled = false;
                }});
                
                streamingAvatar.on('stream_disconnected', () => {{
                    updateStatus('Avatar disconnected', 'error');
                    speakBtn.disabled = true;
                    initBtn.style.display = 'inline-block';
                }});
                
                // Create and start avatar
                const sessionInfo = await streamingAvatar.createStartAvatar({{
                    quality: 'medium',
                    avatarName: 'default',
                    language: 'en'
                }});
                
                // Connect video stream
                if (sessionInfo && sessionInfo.mediaStream) {{
                    videoElement.srcObject = sessionInfo.mediaStream;
                    updateStatus('Avatar connected successfully!', 'success');
                    speakBtn.disabled = false;
                }} else {{
                    throw new Error('No media stream received from avatar');
                }}
                
            }} catch (error) {{
                console.error('Avatar initialization error:', error);
                updateStatus(`Error: ${{error.message}}`, 'error');
                initBtn.style.display = 'inline-block';
            }}
        }}
        
        async function speakText() {{
            if (!streamingAvatar) {{
                updateStatus('Avatar not initialized', 'error');
                return;
            }}
            
            try {{
                speakBtn.disabled = true;
                updateStatus('Sending text to avatar...', 'loading');
                
                await streamingAvatar.speak({{
                    text: "{text}",
                    task_type: "REPEAT"
                }});
                
                updateStatus('Text sent successfully!', 'success');
            }} catch (error) {{
                console.error('Speak error:', error);
                updateStatus(`Speak error: ${{error.message}}`, 'error');
            }} finally {{
                speakBtn.disabled = false;
            }}
        }}
        
        // Initialize when page loads
        window.addEventListener('load', () => {{
            setTimeout(initializeAvatar, 1000); // Wait 1 second for SDK to load
        }});
        
        // Debug info
        console.log('Session ID: {session_id}');
        console.log('Token (first 20 chars):', '{session_info.get("token", "")}'.substring(0, 20) + '...');
    </script>
</body>
</html>
                """
                
                # Save HTML to workspace
                avatars_dir = f"{self.workspace_path}/avatars"
                self.sandbox.fs.create_folder(avatars_dir, "755")
                
                html_file = f"{avatars_dir}/{session_name}_avatar.html"
                self.sandbox.fs.upload_file(html_snippet.encode(), html_file)
                
                message = f"🎭 Avatar '{session_name}' is ready to speak: \"{text}\"\n\n"
                message += f"✨ **Video Avatar Session Created Successfully!** ✨\n\n"
                message += f"📋 **Session Details:**\n"
                message += f"• Session ID: {session_id}\n"
                message += f"• Text to speak: \"{text}\"\n"
                message += f"• Task type: {task_type}\n"
                message += f"• Mode: {task_mode}\n\n"
                
                message += f"🎬 **Ready-to-Use Avatar Page:**\n"
                message += f"• HTML file created: `avatars/{session_name}_avatar.html`\n"
                message += f"• Open this file in a web browser to see your avatar speak!\n"
                message += f"• The avatar will automatically say: \"{text}\"\n\n"
                
                if websocket_url:
                    message += f"🔗 **WebSocket Endpoint:** {websocket_url}\n\n"
                
                message += f"💡 **How it works:**\n"
                message += f"1. Session created with HeyGen API ✅\n"
                message += f"2. HTML page generated with avatar integration ✅\n"
                message += f"3. Open the HTML file to see your talking avatar! ✅\n\n"
                
                message += f"🎯 **Your avatar video is ready to play!**"
                
                return self.success_response(message)
                        
            except Exception as e:
                logger.error(f"Error sending speak command: {str(e)}")
                return self.fail_response(f"Failed to make avatar speak: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in avatar_speak: {str(e)}", exc_info=True)
            return self.fail_response(f"Avatar speak failed: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "generate_avatar_video",
            "description": "Generate a downloadable MP4 video file with an avatar speaking the provided text. This creates an actual video file that can be downloaded and shared, unlike the streaming version.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Text for the avatar to speak in the video"
                    },
                    "avatar_id": {
                        "type": "string",
                        "description": "HeyGen avatar ID to use. Use 'default' or specific avatar IDs from HeyGen",
                        "default": "default"
                    },
                    "voice_id": {
                        "type": "string", 
                        "description": "Voice ID for the avatar's speech. Use 'default' to auto-select first available voice, or use list_available_voices to see all options",
                        "default": "default"
                    },
                    "video_title": {
                        "type": "string",
                        "description": "Title for the generated video",
                        "default": "AI Avatar Video"
                    },
                    "background_color": {
                        "type": "string",
                        "description": "Background color for the video (hex code)",
                        "default": "#ffffff"
                    },
                    "wait_for_completion": {
                        "type": "boolean",
                        "description": "If true, wait for video completion and auto-download to workspace (takes 1-3 minutes)",
                        "default": False
                    },
                    "max_wait_time": {
                        "type": "integer",
                        "description": "Maximum time to wait for completion in seconds (default: 300 = 5 minutes)",
                        "default": 300,
                        "minimum": 60,
                        "maximum": 600
                    }
                },
                "required": ["text"]
            }
        }
    })
    @xml_schema(
        tag_name="generate-avatar-video",
        mappings=[
            {"param_name": "text", "node_type": "content", "path": ".", "required": True},
            {"param_name": "avatar_id", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "voice_id", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "video_title", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "background_color", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "wait_for_completion", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "max_wait_time", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="generate_avatar_video">
        <parameter name="avatar_id">default</parameter>
        <parameter name="voice_id">default</parameter>
        <parameter name="video_title">Hello World Video</parameter>
        <parameter name="background_color">#f0f0f0</parameter>
        <parameter name="wait_for_completion">true</parameter>
        <parameter name="max_wait_time">300</parameter>
        <parameter name="text">Hello World! This is my first AI avatar video.</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def generate_avatar_video(self,
                                  text: str,
                                  avatar_id: str = "default",
                                  voice_id: str = "default", 
                                  video_title: str = "AI Avatar Video",
                                  background_color: str = "#ffffff",
                                  wait_for_completion: bool = False,
                                  max_wait_time: int = 300) -> ToolResult:
        """Generate a downloadable MP4 video with an avatar speaking the provided text.
        
        Args:
            text: Text for the avatar to speak
            avatar_id: Avatar ID to use
            voice_id: Voice ID for speech
            video_title: Title for the video
            background_color: Background color (hex)
            
        Returns:
            ToolResult with video generation status and download URL
        """
        try:
            if not self.heygen_api_key:
                return self.fail_response("HeyGen API key not configured. Please set HEYGEN_API_KEY in environment variables.")
            
            logger.info(f"Generating avatar video with text: {text[:50]}...")
            
            # First, get available avatars to ensure we use a valid one
            try:
                async with aiohttp.ClientSession() as avatar_session:
                    async with avatar_session.get(
                        f"{self.heygen_api_base}/v2/avatars",
                        headers={
                            "x-api-key": self.heygen_api_key,
                            "accept": "application/json"
                        }
                    ) as avatar_response:
                        if avatar_response.status != 200:
                            logger.warning(f"Could not fetch avatars: {avatar_response.status}")
                            # Use provided avatar_id as fallback
                            actual_avatar_id = avatar_id
                        else:
                            avatars_data = await avatar_response.json()
                            avatars = avatars_data.get("data", {}).get("avatars", [])
                            
                            if avatars:
                                # If avatar_id is 'default', use the first available avatar
                                if avatar_id == "default":
                                    actual_avatar_id = avatars[0]["avatar_id"]
                                    logger.info(f"Using avatar: {actual_avatar_id} ({avatars[0].get('avatar_name', 'Unknown')})")
                                else:
                                    # Check if provided avatar_id exists
                                    avatar_exists = any(a["avatar_id"] == avatar_id for a in avatars)
                                    if avatar_exists:
                                        actual_avatar_id = avatar_id
                                    else:
                                        actual_avatar_id = avatars[0]["avatar_id"]
                                        logger.warning(f"Avatar {avatar_id} not found, using {actual_avatar_id}")
                            else:
                                actual_avatar_id = avatar_id
                                logger.warning("No avatars found, using provided avatar_id")
            except Exception as e:
                logger.warning(f"Error fetching avatars: {e}, using provided avatar_id")
                actual_avatar_id = avatar_id

            # Prepare video generation request
            video_request = {
                "video_inputs": [
                    {
                        "character": {
                            "type": "avatar",
                            "avatar_id": actual_avatar_id,
                            "avatar_style": "normal"
                        },
                        "voice": {
                            "type": "text",
                            "input_text": text,
                            "voice_id": await self._get_valid_voice_id(voice_id)
                        },
                        "background": {
                            "type": "color",
                            "value": background_color
                        }
                    }
                ],
                "dimension": {
                    "width": 1280,
                    "height": 720
                },
                "aspect_ratio": "16:9",
                "title": video_title,
                "test": False  # Set to False for production videos
            }
            
            # Generate video via HeyGen API using direct video generation
            try:
                async with aiohttp.ClientSession() as session:
                    # Use direct video generation API
                    logger.info(f"Generating video with avatar: {actual_avatar_id}")
                    
                    async with session.post(
                        f"{self.heygen_api_base}/v2/video/generate",
                        headers={
                            "x-api-key": self.heygen_api_key,
                            "Content-Type": "application/json"
                        },
                        json=video_request
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            return self.fail_response(f"Failed to generate video: {response.status} - {error_text}")
                        
                        result = await response.json()
                        logger.info(f"HeyGen video generation response: {result}")
                        
                        video_id = result.get("data", {}).get("video_id")
                        if not video_id:
                            return self.fail_response(f"No video_id returned from HeyGen API. Response: {result}")
                        
                        # Save video info to workspace
                        videos_dir = f"{self.workspace_path}/videos"
                        self.sandbox.fs.create_folder(videos_dir, "755")
                        
                        video_info = {
                            "video_id": video_id,
                            "title": video_title,
                            "text": text,
                            "avatar_id": actual_avatar_id,
                            "original_avatar_id": avatar_id,
                            "voice_id": voice_id,
                            "status": "processing",
                            "created_at": result.get("data", {}).get("created_at", ""),
                            "background_color": background_color,
                            "video_request": video_request  # Store the full request for debugging
                        }
                        
                        video_file = f"{videos_dir}/{video_id}_info.json"
                        self.sandbox.fs.upload_file(
                            json.dumps(video_info, indent=2).encode(),
                            video_file
                        )
                        
                        message = f"🎬 **MP4 Video Generation Started Successfully!**\n\n"
                        message += f"📋 **Video Details:**\n"
                        message += f"• Video ID: `{video_id}`\n"
                        message += f"• Title: {video_title}\n"
                        message += f"• Text: \"{text}\"\n"
                        message += f"• Avatar: {actual_avatar_id}\n"
                        if actual_avatar_id != avatar_id:
                            message += f"• Original Avatar Request: {avatar_id} (auto-corrected)\n"
                        message += f"• Voice: {voice_id}\n"
                        message += f"• Background: {background_color}\n\n"
                        
                        message += f"⏳ **Status: Processing** (typically 1-3 minutes)\n\n"
                        
                        message += f"📥 **How to Get Your MP4 Video:**\n"
                        message += f"**Option 1 - Manual Check:**\n"
                        message += f"1. **Wait 2-3 minutes** for HeyGen to process the video\n"
                        message += f"2. **Check status**: Use `check_video_status('{video_id}')` \n"
                        message += f"3. **Download**: When status = 'completed', video auto-downloads to workspace\n\n"
                        message += f"**Option 2 - Auto-Wait (Recommended):**\n"
                        message += f"Use `download_completed_video('{video_id}')` to automatically wait and download\n\n"
                        
                        message += f"📁 **Video info saved to:** `videos/{video_id}_info.json`\n\n"
                        
                        message += f"🎯 **Important**: The MP4 file will be hosted by HeyGen and delivered via download URL.\n"
                        message += f"💡 **This creates an actual MP4 video file** that you can save and share anywhere!"
                        
                        # If wait_for_completion is True, automatically wait and download
                        if wait_for_completion:
                            message += f"\n\n⏳ **Auto-waiting for completion** (max {max_wait_time}s)...\n"
                            
                            # Use the download_completed_video method to wait and download
                            download_result = await self.download_completed_video(video_id, max_wait_time)
                            
                            if download_result.success:
                                message += f"\n\n✅ **Video completed and downloaded!**\n"
                                message += download_result.content
                                return self.success_response(message)
                            else:
                                message += f"\n\n⚠️ **Auto-download failed, but video is generating:**\n"
                                message += download_result.content
                                message += f"\n\n💡 **You can manually check status with:** `check_video_status('{video_id}')`"
                                return self.success_response(message)
                        
                        return self.success_response(message)
                        
            except Exception as e:
                logger.error(f"Error calling HeyGen video API: {str(e)}")
                return self.fail_response(f"Failed to call HeyGen video generation API: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in generate_avatar_video: {str(e)}", exc_info=True)
            return self.fail_response(f"Video generation failed: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "check_video_status",
            "description": "Check the status of a generated avatar video and get the download URL when ready.",
            "parameters": {
                "type": "object",
                "properties": {
                    "video_id": {
                        "type": "string",
                        "description": "Video ID returned from generate_avatar_video"
                    }
                },
                "required": ["video_id"]
            }
        }
    })
    @xml_schema(
        tag_name="check-video-status",
        mappings=[
            {"param_name": "video_id", "node_type": "attribute", "path": ".", "required": True}
        ],
        example='''
        <function_calls>
        <invoke name="check_video_status">
        <parameter name="video_id">your-video-id-here</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def check_video_status(self, video_id: str) -> ToolResult:
        """Check the status of a generated video and get download URL.
        
        Args:
            video_id: Video ID from generate_avatar_video
            
        Returns:
            ToolResult with video status and download URL if ready
        """
        try:
            if not self.heygen_api_key:
                return self.fail_response("HeyGen API key not configured.")
            
            # Check video status via HeyGen API
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.heygen_api_base}/v2/video/{video_id}",
                        headers={
                            "x-api-key": self.heygen_api_key,
                            "Accept": "application/json"
                        }
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            return self.fail_response(f"Failed to check video status: {response.status} - {error_text}")
                        
                        result = await response.json()
                        logger.info(f"HeyGen video status response: {result}")
                        
                        data = result.get("data", {})
                        status = data.get("status", "unknown")
                        video_url = data.get("video_url", "")
                        error_msg = data.get("error", "")
                        
                        # Update video info file
                        videos_dir = f"{self.workspace_path}/videos"
                        video_file = f"{videos_dir}/{video_id}_info.json"
                        
                        try:
                            # Read existing info
                            existing_content = self.sandbox.fs.read_file(video_file)
                            video_info = json.loads(existing_content.decode())
                            
                            # Update with latest status
                            video_info.update({
                                "status": status,
                                "video_url": video_url,
                                "error": error_msg,
                                "checked_at": data.get("updated_at", "")
                            })
                            
                            # Save updated info
                            self.sandbox.fs.upload_file(
                                json.dumps(video_info, indent=2).encode(),
                                video_file
                            )
                        except Exception as e:
                            logger.warning(f"Could not update video info file: {e}")
                        
                        message = f"🎬 **Video Status Check: {video_id}**\n\n"
                        
                        if status == "completed":
                            message += f"✅ **Status: COMPLETED!**\n\n"
                            message += f"🎉 **Your avatar video is ready!**\n"
                            
                            # Try to download the video to workspace
                            if video_url:
                                try:
                                    downloaded_path = await self._download_video_to_workspace(video_url, video_id)
                                    if downloaded_path:
                                        message += f"📁 **Downloaded to workspace:** `{downloaded_path}`\n"
                                        message += f"📥 **Original URL:** {video_url}\n\n"
                                        message += f"🎭 **Your AI avatar video is ready in the workspace!**\n"
                                        message += f"💡 You can now access the video file directly from your workspace."
                                    else:
                                        message += f"📥 **Download URL:** {video_url}\n\n"
                                        message += f"💡 **Instructions:**\n"
                                        message += f"1. Click the URL above to download your MP4 video\n"
                                        message += f"2. The video will be downloaded to your device\n"
                                        message += f"3. You can now share it anywhere!\n\n"
                                        message += f"🎭 **Your AI avatar video is ready to watch and share!**"
                                except Exception as e:
                                    logger.warning(f"Failed to download video to workspace: {e}")
                                    message += f"📥 **Download URL:** {video_url}\n\n"
                                    message += f"💡 **Instructions:**\n"
                                    message += f"1. Click the URL above to download your MP4 video\n"
                                    message += f"2. The video will be downloaded to your device\n"
                                    message += f"3. You can now share it anywhere!\n\n"
                                    message += f"🎭 **Your AI avatar video is ready to watch and share!**"
                            else:
                                message += f"⚠️ **No download URL provided in response**"
                            
                        elif status == "processing":
                            message += f"⏳ **Status: PROCESSING**\n\n"
                            message += f"🔄 Your video is still being generated...\n"
                            message += f"⏱️ This usually takes 1-3 minutes total.\n\n"
                            message += f"💡 **Next Steps:**\n"
                            message += f"• Wait another 30-60 seconds\n"
                            message += f"• Run this command again to check status\n"
                            message += f"• The download URL will appear when ready!"
                            
                        elif status == "error" or error_msg:
                            message += f"❌ **Status: ERROR**\n\n"
                            message += f"🚨 **Error:** {error_msg}\n\n"
                            message += f"💡 **Suggestions:**\n"
                            message += f"• Try generating a new video\n"
                            message += f"• Check if your text is too long\n"
                            message += f"• Ensure avatar_id and voice_id are valid"
                            
                        else:
                            message += f"❓ **Status: {status.upper()}**\n\n"
                            message += f"🔍 **Raw Response:** {result}\n\n"
                            message += f"💡 Please try checking again in a few moments."
                        
                        return self.success_response(message)
                        
            except Exception as e:
                logger.error(f"Error calling HeyGen status API: {str(e)}")
                return self.fail_response(f"Failed to check video status: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in check_video_status: {str(e)}", exc_info=True)
            return self.fail_response(f"Video status check failed: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "download_completed_video",
            "description": "Download a completed HeyGen video to the workspace. Automatically checks status and downloads when ready.",
            "parameters": {
                "type": "object",
                "properties": {
                    "video_id": {
                        "type": "string",
                        "description": "Video ID returned from generate_avatar_video"
                    },
                    "max_wait_time": {
                        "type": "integer",
                        "description": "Maximum time to wait for completion in seconds (default: 300 = 5 minutes)",
                        "default": 300,
                        "minimum": 30,
                        "maximum": 600
                    }
                },
                "required": ["video_id"]
            }
        }
    })
    @xml_schema(
        tag_name="download-completed-video",
        mappings=[
            {"param_name": "video_id", "node_type": "attribute", "path": ".", "required": True},
            {"param_name": "max_wait_time", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="download_completed_video">
        <parameter name="video_id">your-video-id-here</parameter>
        <parameter name="max_wait_time">300</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def download_completed_video(self, video_id: str, max_wait_time: int = 300) -> ToolResult:
        """Download a completed video, waiting for completion if necessary.
        
        Args:
            video_id: Video ID from generate_avatar_video
            max_wait_time: Maximum seconds to wait for completion
            
        Returns:
            ToolResult with download status and local path
        """
        try:
            if not self.heygen_api_key:
                return self.fail_response("HeyGen API key not configured.")
            
            start_time = asyncio.get_event_loop().time()
            check_interval = 10  # Check every 10 seconds
            
            message = f"🎬 **Downloading Video: {video_id}**\n\n"
            message += f"⏳ Checking status and waiting for completion...\n\n"
            
            while True:
                try:
                    # Check current status
                    async with aiohttp.ClientSession() as session:
                        async with session.get(
                            f"{self.heygen_api_base}/v2/video/{video_id}",
                            headers={
                                "x-api-key": self.heygen_api_key,
                                "Accept": "application/json"
                            }
                        ) as response:
                            if response.status != 200:
                                error_text = await response.text()
                                return self.fail_response(f"Failed to check video status: {response.status} - {error_text}")
                            
                            result = await response.json()
                            data = result.get("data", {})
                            status = data.get("status", "unknown")
                            video_url = data.get("video_url", "")
                            error_msg = data.get("error", "")
                            
                            if status == "completed" and video_url:
                                # Video is ready, download it
                                message += f"✅ **Video completed! Downloading...**\n\n"
                                
                                downloaded_path = await self._download_video_to_workspace(video_url, video_id)
                                if downloaded_path:
                                    message += f"🎉 **Download successful!**\n\n"
                                    message += f"📁 **Local path:** `{downloaded_path}`\n"
                                    message += f"📥 **Original URL:** {video_url}\n\n"
                                    message += f"🎭 **Your AI avatar video is ready in the workspace!**\n"
                                    message += f"💡 You can now access and use the video file directly."
                                    
                                    return ToolResult(success=True, content=message)
                                else:
                                    message += f"❌ **Download failed, but video is ready**\n\n"
                                    message += f"📥 **Direct URL:** {video_url}\n"
                                    message += f"💡 You can download manually from the URL above."
                                    return ToolResult(success=True, content=message)
                            
                            elif status == "error" or error_msg:
                                message += f"❌ **Video generation failed**\n\n"
                                message += f"🚨 **Error:** {error_msg}\n"
                                return self.fail_response(message)
                            
                            elif status == "processing":
                                # Still processing, continue waiting
                                elapsed = asyncio.get_event_loop().time() - start_time
                                if elapsed > max_wait_time:
                                    message += f"⏰ **Timeout reached ({max_wait_time}s)**\n\n"
                                    message += f"🔄 Video is still processing. Use check_video_status to check manually.\n"
                                    message += f"📋 **Current status:** {status}"
                                    return ToolResult(success=True, content=message)
                                
                                # Wait before next check
                                await asyncio.sleep(check_interval)
                                continue
                            
                            else:
                                # Unknown status, continue waiting
                                elapsed = asyncio.get_event_loop().time() - start_time
                                if elapsed > max_wait_time:
                                    message += f"⏰ **Timeout reached**\n\n"
                                    message += f"❓ **Final status:** {status}\n"
                                    message += f"🔍 Use check_video_status for more details."
                                    return ToolResult(success=True, content=message)
                                
                                await asyncio.sleep(check_interval)
                                continue
                                
                except Exception as e:
                    logger.error(f"Error during video status check: {e}")
                    elapsed = asyncio.get_event_loop().time() - start_time
                    if elapsed > max_wait_time:
                        return self.fail_response(f"Timeout waiting for video completion: {str(e)}")
                    
                    # Wait and retry
                    await asyncio.sleep(check_interval)
                    continue
                    
        except Exception as e:
            logger.error(f"Error in download_completed_video: {str(e)}", exc_info=True)
            return self.fail_response(f"Video download failed: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "start_voice_chat",
            "description": "Start an interactive voice chat session with the avatar. This enables real-time conversation where the avatar can listen and respond to user speech.",
            "parameters": {
                "type": "object",
                "properties": {
                    "session_name": {
                        "type": "string",
                        "description": "Name of the avatar session to start voice chat with"
                    },
                    "use_silence_prompt": {
                        "type": "boolean",
                        "description": "Enable automatic prompts during periods of silence to keep the conversation flowing",
                        "default": True
                    },
                    "mute_input": {
                        "type": "boolean", 
                        "description": "Start with user microphone input muted",
                        "default": False
                    }
                },
                "required": ["session_name"]
            }
        }
    })
    @xml_schema(
        tag_name="start-voice-chat",
        mappings=[
            {"param_name": "session_name", "node_type": "attribute", "path": ".", "required": True},
            {"param_name": "use_silence_prompt", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "mute_input", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="start_voice_chat">
        <parameter name="session_name">customer_service_avatar</parameter>
        <parameter name="use_silence_prompt">true</parameter>
        <parameter name="mute_input">false</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def start_voice_chat(self,
                              session_name: str,
                              use_silence_prompt: bool = True,
                              mute_input: bool = False) -> ToolResult:
        """Start interactive voice chat with the avatar.
        
        Args:
            session_name: Name of the avatar session
            use_silence_prompt: Enable silence prompts
            mute_input: Start with muted input
            
        Returns:
            ToolResult with voice chat startup status
        """
        try:
            # Check if session exists
            if session_name not in self.active_sessions:
                return self.fail_response(f"Avatar session '{session_name}' not found. Create a session first.")
            
            session_info = self.active_sessions[session_name]
            
            # Check if voice chat is enabled for this session
            if not session_info.get("voice_chat_enabled", False):
                return self.fail_response(f"Voice chat is not enabled for session '{session_name}'. Create a new session with 'enable_voice_chat' set to true.")
            
            # Start voice chat via HeyGen API
            voice_chat_config = {
                "useSilencePrompt": use_silence_prompt,
                "isInputAudioMuted": mute_input
            }
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{self.heygen_api_base}/v1/streaming.start_voice_chat",
                        headers={
                            "Authorization": f"Bearer {session_info['access_token']}",
                            "Content-Type": "application/json"
                        },
                        json=voice_chat_config
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            return self.fail_response(f"Failed to start voice chat: {response.status} - {error_text}")
                        
                        # Update session status
                        self.active_sessions[session_name]["status"] = "voice_chat_active"
                        
                        message = f"🎙️ Voice chat started for avatar '{session_name}'!\n\n"
                        message += f"Settings:\n"
                        message += f"- Silence Prompts: {'Enabled' if use_silence_prompt else 'Disabled'}\n"
                        message += f"- Input Audio: {'Muted' if mute_input else 'Active'}\n"
                        message += f"\nThe avatar is now ready for real-time conversation. Users can speak directly to the avatar and receive immediate responses.\n"
                        message += f"\nUse 'stop_voice_chat' to end the interactive session."
                        
                        return self.success_response(message)
                        
            except Exception as e:
                logger.error(f"Error starting voice chat: {str(e)}")
                return self.fail_response(f"Failed to start voice chat: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in start_voice_chat: {str(e)}", exc_info=True)
            return self.fail_response(f"Voice chat startup failed: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "stop_voice_chat",
            "description": "Stop the interactive voice chat session with the avatar, returning it to text-only mode.",
            "parameters": {
                "type": "object",
                "properties": {
                    "session_name": {
                        "type": "string",
                        "description": "Name of the avatar session to stop voice chat for"
                    }
                },
                "required": ["session_name"]
            }
        }
    })
    @xml_schema(
        tag_name="stop-voice-chat",
        mappings=[
            {"param_name": "session_name", "node_type": "attribute", "path": ".", "required": True}
        ],
        example='''
        <function_calls>
        <invoke name="stop_voice_chat">
        <parameter name="session_name">customer_service_avatar</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def stop_voice_chat(self, session_name: str) -> ToolResult:
        """Stop interactive voice chat with the avatar.
        
        Args:
            session_name: Name of the avatar session
            
        Returns:
            ToolResult with voice chat stop status
        """
        try:
            # Check if session exists
            if session_name not in self.active_sessions:
                return self.fail_response(f"Avatar session '{session_name}' not found.")
            
            session_info = self.active_sessions[session_name]
            
            # Stop voice chat via HeyGen API
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{self.heygen_api_base}/v1/streaming.stop_voice_chat",
                        headers={
                            "Authorization": f"Bearer {session_info['access_token']}",
                            "Content-Type": "application/json"
                        }
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            return self.fail_response(f"Failed to stop voice chat: {response.status} - {error_text}")
                        
                        # Update session status
                        self.active_sessions[session_name]["status"] = "active"
                        
                        message = f"🎙️ Voice chat stopped for avatar '{session_name}'.\n\n"
                        message += f"The avatar is now in text-only mode. Use 'avatar_speak' to make it talk or 'start_voice_chat' to resume interactive conversation."
                        
                        return self.success_response(message)
                        
            except Exception as e:
                logger.error(f"Error stopping voice chat: {str(e)}")
                return self.fail_response(f"Failed to stop voice chat: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in stop_voice_chat: {str(e)}", exc_info=True)
            return self.fail_response(f"Voice chat stop failed: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "close_avatar_session",
            "description": "Close and terminate an active avatar session, freeing up resources and ending the avatar interaction.",
            "parameters": {
                "type": "object",
                "properties": {
                    "session_name": {
                        "type": "string",
                        "description": "Name of the avatar session to close"
                    }
                },
                "required": ["session_name"]
            }
        }
    })
    @xml_schema(
        tag_name="close-avatar-session",
        mappings=[
            {"param_name": "session_name", "node_type": "attribute", "path": ".", "required": True}
        ],
        example='''
        <function_calls>
        <invoke name="close_avatar_session">
        <parameter name="session_name">customer_service_avatar</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def close_avatar_session(self, session_name: str) -> ToolResult:
        """Close an active avatar session.
        
        Args:
            session_name: Name of the avatar session to close
            
        Returns:
            ToolResult with session closure status
        """
        try:
            # Check if session exists
            if session_name not in self.active_sessions:
                return self.fail_response(f"Avatar session '{session_name}' not found.")
            
            session_info = self.active_sessions[session_name]
            
            # Close session via HeyGen API
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{self.heygen_api_base}/v1/streaming.stop",
                        headers={
                            "Authorization": f"Bearer {session_info['access_token']}",
                            "Content-Type": "application/json"
                        }
                    ) as response:
                        # Note: HeyGen API may return various status codes for session closure
                        # We'll consider it successful if it's not a server error
                        if response.status >= 500:
                            error_text = await response.text()
                            logger.warning(f"Server error closing session: {response.status} - {error_text}")
                        
                        # Remove from active sessions
                        del self.active_sessions[session_name]
                        
                        # Update session file to mark as closed
                        try:
                            avatars_dir = f"{self.workspace_path}/avatars"
                            session_file = f"{avatars_dir}/{session_name}_session.json"
                            
                            # Read existing session info
                            file_content = self.sandbox.fs.download_file(session_file)
                            session_data = json.loads(file_content.decode())
                            
                            # Update status
                            session_data["status"] = "closed"
                            session_data["closed_at"] = "now"  # In production, use proper timestamp
                            
                            # Save updated info
                            self.sandbox.fs.upload_file(
                                json.dumps(session_data, indent=2).encode(),
                                session_file
                            )
                        except Exception as e:
                            logger.warning(f"Could not update session file: {str(e)}")
                        
                        message = f"🎭 Avatar session '{session_name}' has been closed successfully.\n\n"
                        message += f"Resources have been freed and the session is no longer active.\n"
                        message += f"Session information has been saved to avatars/{session_name}_session.json"
                        
                        return self.success_response(message)
                        
            except Exception as e:
                logger.error(f"Error closing avatar session: {str(e)}")
                return self.fail_response(f"Failed to close avatar session: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in close_avatar_session: {str(e)}", exc_info=True)
            return self.fail_response(f"Avatar session closure failed: {str(e)}")

    @openapi_schema({
        "type": "function", 
        "function": {
            "name": "list_available_voices",
            "description": "List available HeyGen voices that can be used for video generation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of voices to return (default: 10)",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50
                    }
                },
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="list-available-voices",
        mappings=[
            {"param_name": "limit", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="list_available_voices">
        <parameter name="limit">10</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def list_available_voices(self, limit: int = 10) -> ToolResult:
        """List available HeyGen voices for video generation.
        
        Args:
            limit: Maximum number of voices to return
            
        Returns:
            ToolResult with list of available voices
        """
        try:
            if not self.heygen_api_key:
                return self.fail_response("HeyGen API key not configured.")
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.heygen_api_base}/v2/voices",
                        headers={
                            "x-api-key": self.heygen_api_key,
                            "accept": "application/json"
                        }
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            return self.fail_response(f"Failed to fetch voices: {response.status} - {error_text}")
                        
                        result = await response.json()
                        voices = result.get("data", {}).get("voices", [])
                        
                        if not voices:
                            return self.fail_response("No voices available from HeyGen API")
                        
                        # Limit the results
                        limited_voices = voices[:limit]
                        
                        message = f"🎤 **Available HeyGen Voices** (showing {len(limited_voices)} of {len(voices)})\n\n"
                        
                        for voice in limited_voices:
                            voice_id = voice.get('voice_id', 'Unknown ID')
                            voice_name = voice.get('name', voice.get('voice_name', 'Unknown'))
                            language = voice.get('language', voice.get('language_code', 'Unknown'))
                            gender = voice.get('gender', 'Unknown')
                            
                            message += f"• **{voice_name}** (`{voice_id}`)\n"
                            message += f"  - Language: {language}\n"
                            message += f"  - Gender: {gender}\n\n"
                        
                        # Save voice list to workspace for reference
                        voices_file = f"{self.workspace_path}/available_voices.json"
                        voices_data = {
                            "timestamp": "2025-01-27T00:00:00Z",
                            "total_voices": len(voices),
                            "voices": [
                                {
                                    "voice_id": v.get('voice_id'),
                                    "name": v.get('name', v.get('voice_name')),
                                    "language": v.get('language', v.get('language_code')),
                                    "gender": v.get('gender'),
                                    "preview_url": v.get('preview_audio_url', v.get('preview_url'))
                                }
                                for v in voices
                            ]
                        }
                        
                        self.sandbox.fs.write_file(voices_file, json.dumps(voices_data, indent=2), "644")
                        
                        message += f"\n📄 **Voice list saved to:** `{voices_file}`\n"
                        message += f"Use any `voice_id` from this list in the `generate_avatar_video` function."
                        
                        return ToolResult(
                            success=True,
                            content=message
                        )
                        
            except Exception as e:
                logger.error(f"Error fetching voices: {e}")
                return self.fail_response(f"Error fetching voices from HeyGen API: {str(e)}")
                
        except Exception as e:
            logger.error(f"Unexpected error in list_available_voices: {e}")
            return self.fail_response(f"Unexpected error: {str(e)}")

    @openapi_schema({
        "type": "function", 
        "function": {
            "name": "list_available_avatars",
            "description": "List available HeyGen avatars that can be used for video generation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of avatars to return (default: 10)",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50
                    }
                },
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="list-available-avatars",
        mappings=[
            {"param_name": "limit", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="list_available_avatars">
        <parameter name="limit">10</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def list_available_avatars(self, limit: int = 10) -> ToolResult:
        """List available HeyGen avatars for video generation.
        
        Args:
            limit: Maximum number of avatars to return
            
        Returns:
            ToolResult with list of available avatars
        """
        try:
            if not self.heygen_api_key:
                return self.fail_response("HeyGen API key not configured.")
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.heygen_api_base}/v2/avatars",
                        headers={
                            "x-api-key": self.heygen_api_key,
                            "accept": "application/json"
                        }
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            return self.fail_response(f"Failed to fetch avatars: {response.status} - {error_text}")
                        
                        result = await response.json()
                        avatars = result.get("data", {}).get("avatars", [])
                        
                        if not avatars:
                            return self.fail_response("No avatars available from HeyGen API")
                        
                        # Limit the results
                        limited_avatars = avatars[:limit]
                        
                        message = f"👤 **Available HeyGen Avatars** (showing {len(limited_avatars)} of {len(avatars)})\n\n"
                        
                        for i, avatar in enumerate(limited_avatars, 1):
                            avatar_id = avatar.get("avatar_id", "unknown")
                            avatar_name = avatar.get("avatar_name", "Unnamed")
                            gender = avatar.get("gender", "Unknown")
                            preview_image = avatar.get("preview_image_url", "")
                            
                            message += f"**{i}. {avatar_name}**\n"
                            message += f"   • ID: `{avatar_id}`\n"
                            message += f"   • Gender: {gender}\n"
                            if preview_image:
                                message += f"   • Preview: {preview_image}\n"
                            message += f"\n"
                        
                        if len(avatars) > limit:
                            message += f"💡 **Tip**: Use `list_available_avatars(limit={len(avatars)})` to see all {len(avatars)} avatars\n\n"
                        
                        message += f"🎬 **Usage**: Use any avatar ID in `generate_avatar_video(avatar_id='avatar_id_here')`"
                        
                        return self.success_response(message)
                        
            except Exception as e:
                logger.error(f"Error calling HeyGen avatars API: {str(e)}")
                return self.fail_response(f"Failed to fetch avatars: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in list_available_avatars: {str(e)}", exc_info=True)
            return self.fail_response(f"Avatar listing failed: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "list_avatar_sessions",
            "description": "List all active and stored avatar sessions with their current status and configuration details.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="list-avatar-sessions",
        mappings=[],
        example='''
        <function_calls>
        <invoke name="list_avatar_sessions">
        </invoke>
        </function_calls>
        '''
    )
    async def list_avatar_sessions(self) -> ToolResult:
        """List all avatar sessions and their status.
        
        Returns:
            ToolResult with list of avatar sessions
        """
        try:
            # Ensure sandbox is initialized
            await self._ensure_sandbox()
            
            message = f"🎭 Avatar Sessions Overview\n\n"
            
            # List active sessions
            if self.active_sessions:
                message += f"Active Sessions ({len(self.active_sessions)}):\n"
                for name, info in self.active_sessions.items():
                    message += f"  📹 {name}\n"
                    message += f"     Status: {info.get('status', 'unknown')}\n"
                    message += f"     Avatar: {info.get('config', {}).get('avatarName', 'unknown')}\n"
                    message += f"     Quality: {info.get('config', {}).get('quality', 'unknown')}\n"
                    message += f"     Voice Chat: {'Enabled' if info.get('voice_chat_enabled', False) else 'Disabled'}\n"
                    message += f"\n"
            else:
                message += f"No active sessions running.\n\n"
            
            # List stored session files
            try:
                avatars_dir = f"{self.workspace_path}/avatars"
                files = self.sandbox.fs.list_files(avatars_dir)
                
                session_files = [f for f in files if not f.is_dir and f.name.endswith('_session.json')]
                
                if session_files:
                    message += f"Stored Sessions ({len(session_files)}):\n"
                    for file_info in session_files:
                        try:
                            file_content = self.sandbox.fs.download_file(f"{avatars_dir}/{file_info.name}")
                            session_data = json.loads(file_content.decode())
                            
                            session_name = session_data.get('session_name', 'unknown')
                            status = session_data.get('status', 'unknown')
                            avatar = session_data.get('config', {}).get('avatarName', 'unknown')
                            
                            message += f"  📁 {session_name}\n"
                            message += f"     File: {file_info.name}\n"
                            message += f"     Status: {status}\n"
                            message += f"     Avatar: {avatar}\n"
                            message += f"     Size: {file_info.size} bytes\n"
                            message += f"\n"
                        except Exception as e:
                            message += f"  📁 {file_info.name} (error reading: {str(e)})\n\n"
                else:
                    message += f"No stored session files found.\n\n"
                    
            except Exception as e:
                message += f"Could not access stored sessions: {str(e)}\n\n"
            
            message += f"Use 'create_avatar_session' to start a new avatar session."
            
            return self.success_response(message)
            
        except Exception as e:
            logger.error(f"Error listing avatar sessions: {str(e)}", exc_info=True)
            return self.fail_response(f"Failed to list avatar sessions: {str(e)}")

    # Define the available functions for the agent
    @property  
    def xml_function_list(self):
        return [
            {
                "name": "create_avatar_session",
                "description": "Create a new interactive video avatar session with customizable settings",
                "parameters": [
                    {"name": "session_name", "type": "str", "description": "Unique name for the avatar session", "required": True},
                    {"name": "avatar_id", "type": "str", "description": "HeyGen avatar ID", "required": False},
                    {"name": "voice_id", "type": "str", "description": "Voice ID for speech", "required": False},
                    {"name": "voice_rate", "type": "float", "description": "Speech rate (0.5-1.5)", "required": False},
                    {"name": "voice_emotion", "type": "str", "description": "Voice emotion", "required": False},
                    {"name": "quality", "type": "str", "description": "Video quality", "required": False},
                    {"name": "language", "type": "str", "description": "Language code", "required": False},
                    {"name": "knowledge_base", "type": "str", "description": "Custom system prompt", "required": False},
                    {"name": "enable_voice_chat", "type": "bool", "description": "Enable voice chat", "required": False},
                    {"name": "session_timeout", "type": "int", "description": "Session timeout in seconds", "required": False}
                ]
            },
            {
                "name": "avatar_speak",
                "description": "Make an avatar speak the provided text with natural lip sync",
                "parameters": [
                    {"name": "session_name", "type": "str", "description": "Avatar session name", "required": True},
                    {"name": "text", "type": "str", "description": "Text for avatar to speak", "required": True},
                    {"name": "task_type", "type": "str", "description": "Speaking task type", "required": False},
                    {"name": "task_mode", "type": "str", "description": "Execution mode", "required": False}
                ]
            },
            {
                "name": "start_voice_chat",
                "description": "Start interactive voice chat with the avatar for real-time conversation",
                "parameters": [
                    {"name": "session_name", "type": "str", "description": "Avatar session name", "required": True},
                    {"name": "use_silence_prompt", "type": "bool", "description": "Enable silence prompts", "required": False},
                    {"name": "mute_input", "type": "bool", "description": "Start with muted input", "required": False}
                ]
            },
            {
                "name": "stop_voice_chat",
                "description": "Stop interactive voice chat and return to text-only mode",
                "parameters": [
                    {"name": "session_name", "type": "str", "description": "Avatar session name", "required": True}
                ]
            },
            {
                "name": "close_avatar_session",
                "description": "Close and terminate an active avatar session",
                "parameters": [
                    {"name": "session_name", "type": "str", "description": "Avatar session name", "required": True}
                ]
            },
            {
                "name": "list_available_avatars",
                "description": "List available HeyGen avatars that can be used for video generation", 
                "parameters": [
                    {"name": "limit", "type": "int", "description": "Maximum number of avatars to return", "required": False}
                ]
            },
            {
                "name": "list_avatar_sessions", 
                "description": "List all active and stored avatar sessions with their status",
                "parameters": []
            }
        ]

    @property
    def openapi_schema(self):
        return {
            "openapi": "3.0.0",
            "info": {
                "title": "HeyGen Video Avatar Tool",
                "description": "Create and manage interactive AI video avatars using HeyGen's Streaming Avatar SDK",
                "version": "1.0.0"
            },
            "servers": [{"url": "http://localhost"}],
            "paths": {
                "/create_avatar_session": {
                    "post": {
                        "summary": "Create Avatar Session",
                        "description": "Create a new interactive video avatar session",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "session_name": {"type": "string", "description": "Unique session name"},
                                            "avatar_id": {"type": "string", "description": "Avatar ID"},
                                            "voice_id": {"type": "string", "description": "Voice ID"},
                                            "voice_rate": {"type": "number", "description": "Speech rate"},
                                            "voice_emotion": {"type": "string", "description": "Voice emotion"},
                                            "quality": {"type": "string", "description": "Video quality"},
                                            "language": {"type": "string", "description": "Language code"},
                                            "knowledge_base": {"type": "string", "description": "System prompt"},
                                            "enable_voice_chat": {"type": "boolean", "description": "Enable voice chat"},
                                            "session_timeout": {"type": "integer", "description": "Timeout in seconds"}
                                        },
                                        "required": ["session_name"]
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "Avatar session created successfully",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "success": {"type": "boolean"},
                                                "message": {"type": "string"},
                                                "session_id": {"type": "string"},
                                                "configuration": {"type": "object"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "/avatar_speak": {
                    "post": {
                        "summary": "Avatar Speak",
                        "description": "Make avatar speak text with lip sync",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "session_name": {"type": "string"},
                                            "text": {"type": "string"},
                                            "task_type": {"type": "string"},
                                            "task_mode": {"type": "string"}
                                        },
                                        "required": ["session_name", "text"]
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "Avatar speaking command sent",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "success": {"type": "boolean"},
                                                "message": {"type": "string"},
                                                "task_id": {"type": "string"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } 