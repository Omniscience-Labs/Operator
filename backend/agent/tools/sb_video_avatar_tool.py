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
        
        # HeyGen API configuration
        self.heygen_api_key = os.getenv('HEYGEN_API_KEY', '')
        self.heygen_api_base = os.getenv('HEYGEN_API_BASE', 'https://api.heygen.com')
        
        # Session management
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        
        if not self.heygen_api_key:
            logger.warning("HEYGEN_API_KEY not found in environment variables")

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
                        raise Exception(f"Failed to create session token: {response.status}")
                    
                    data = await response.json()
                    return data.get('token', '')
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
            session_token = await self._create_session_token()
            if not session_token:
                return self.fail_response("Failed to create HeyGen session token. Please check your API key.")
            
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
                        
                        # Store session information
                        self.active_sessions[session_name] = {
                            "session_id": session_data.get("session_id"),
                            "access_token": session_data.get("access_token"),
                            "websocket_url": session_data.get("url"),
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
                            "session_id": session_data.get("session_id"),
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
                        message += f"- Session ID: {session_data.get('session_id')}\n"
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
            
            # Prepare speak request
            speak_request = {
                "text": text,
                "task_type": task_type,
                "task_mode": task_mode
            }
            
            # Send speak command via HeyGen API
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{self.heygen_api_base}/v1/streaming.task",
                        headers={
                            "Authorization": f"Bearer {session_info['access_token']}",
                            "Content-Type": "application/json"
                        },
                        json=speak_request
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            return self.fail_response(f"Failed to send speak command: {response.status} - {error_text}")
                        
                        result = await response.json()
                        
                        message = f"🎭 Avatar '{session_name}' is now speaking!\n\n"
                        message += f"Text: \"{text}\"\n"
                        message += f"Task Type: {task_type}\n"
                        message += f"Mode: {task_mode}\n"
                        
                        if result.get("task_id"):
                            message += f"Task ID: {result.get('task_id')}\n"
                        
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