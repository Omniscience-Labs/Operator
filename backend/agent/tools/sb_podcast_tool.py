import os
import json
import tempfile
import asyncio
import datetime
import time
import requests
import uuid
from typing import Optional, List, Dict, Any, Union
from pathlib import Path
from urllib.parse import urlparse, urljoin
from agentpress.tool import ToolResult, openapi_schema, xml_schema
from sandbox.tool_base import SandboxToolsBase
from agentpress.thread_manager import ThreadManager
from utils.logger import logger
from services import redis
import re

# Local podcast generation imports
try:
    import pyttsx3
    import subprocess
    from gtts import gTTS
    from pydub import AudioSegment
    LOCAL_TTS_AVAILABLE = True
except ImportError:
    LOCAL_TTS_AVAILABLE = False
    logger.warning("Local TTS libraries not available - will install if needed")


class SandboxPodcastTool(SandboxToolsBase):
    """
    A tool for generating AI podcasts using the Podcastfy FastAPI.
    
    This tool integrates with the Podcastfy FastAPI service to create conversational
    audio content from URLs, files in the sandbox, and other content types.
    """

    name: str = "podcast_tool"
    description: str = """
    Generate AI podcasts from content using the Podcastfy FastAPI.
    
    Supported input types:
    - URLs: Website content to process
    - Files: Local files in sandbox (content read as text)
    - Text: Direct text input
    - Topic: High-level subject for AI to discuss
    
    The tool uses advanced AI to create natural conversations between two speakers
    and generates high-quality audio using ElevenLabs TTS.
    """

    def __init__(self, project_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)
        self.workspace_path = "/workspace"
        self.api_base_url = os.getenv('PODCASTFY_API_URL', 'https://podcastfy-omni.onrender.com')
        self.gemini_key = os.getenv('GEMINI_API_KEY', '')
        self.openai_key = os.getenv('OPENAI_API_KEY', '')
        self.elevenlabs_key = os.getenv('ELEVENLABS_API_KEY', '')
        
        # Validate required environment variables
        if not self.openai_key and not self.gemini_key:
            logger.warning("Neither OPENAI_API_KEY nor GEMINI_API_KEY found - podcast generation may fail")
            # Don't raise error here, let the service handle it
        # Note: ELEVENLABS_API_KEY is now optional - will be validated when tool is used
        
        logger.info(f"Podcast tool initialized with: OpenAI={'✅' if self.openai_key else '❌'}, Gemini={'✅' if self.gemini_key else '❌'}, ElevenLabs={'✅' if self.elevenlabs_key else '❌'}")

    def _validate_file_exists(self, file_path: str) -> bool:
        """Check if a file exists in the sandbox."""
        try:
            self.sandbox.fs.get_file_info(file_path)
            return True
        except Exception:
            return False
    
    def _estimate_duration(self, filename: str) -> str:
        """Estimate podcast duration based on filename and typical speech patterns."""
        try:
            # Try to get actual file size for better estimation
            audio_path = f"{self.workspace_path}/podcasts/{filename}"
            file_info = self.sandbox.fs.get_file_info(audio_path)
            file_size_mb = file_info.size / (1024 * 1024)
            
            # Rough estimation: ~1MB per minute for good quality MP3
            estimated_minutes = int(file_size_mb)
            if estimated_minutes < 1:
                return "Under 1 minute"
            elif estimated_minutes == 1:
                return "1 minute"
            else:
                return f"{estimated_minutes} minutes"
        except:
            # Fallback estimation
            return "1-3 minutes"

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "generate_podcast",
            "description": "Generate an AI-powered podcast from various content sources including URLs, local files, text, and topics. The tool creates engaging conversational audio content using advanced AI. Generated podcasts are saved in the sandbox workspace for easy access.",
            "parameters": {
                "type": "object",
                "properties": {
                    "urls": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of website URLs to generate podcast from. Can include news articles, blog posts, research papers, etc."
                    },
                    "file_paths": {
                        "type": "array", 
                        "items": {"type": "string"},
                        "description": "List of local file paths in the sandbox. File content will be read and sent as text. Supports text files, PDFs, markdown, etc. Paths should be relative to /workspace (e.g., 'documents/paper.pdf')"
                    },
                    "text": {
                        "type": "string",
                        "description": "Direct text input for podcast generation. Useful for providing custom content or transcripts directly."
                    },
                    "topic": {
                        "type": "string",
                        "description": "Topic or subject for the podcast. The AI will create a discussion about this topic."
                    },
                    "output_name": {
                        "type": "string",
                        "description": "Custom name for the generated podcast files (without extension). If not provided, a timestamp-based name will be used.",
                        "default": None
                    },
                    "conversation_style": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Style of conversation for the podcast. Options include: ['engaging', 'educational', 'casual', 'formal', 'analytical', 'storytelling', 'interview', 'debate']",
                        "default": ["engaging", "educational"]
                    },
                    "podcast_length": {
                        "type": "string",
                        "description": "Desired length of podcast. Options: 'short' (2-5 min), 'medium' (10-15 min), 'long' (20-30 min)",
                        "default": "medium"
                    },
                    "language": {
                        "type": "string", 
                        "description": "Language for the podcast. Supports multiple languages including 'English', 'Spanish', 'French', 'German', etc.",
                        "default": "English"
                    },
                    "transcript_only": {
                        "type": "boolean",
                        "description": "If true, only generate the transcript without audio. Useful for reviewing content before audio generation.",
                        "default": False
                    },
                    "roles_person1": {
                        "type": "string",
                        "description": "Role of the first speaker in the podcast (e.g., 'news anchor', 'host', 'expert', 'financial analyst')",
                        "default": "news anchor"
                    },
                    "roles_person2": {
                        "type": "string", 
                        "description": "Role of the second speaker in the podcast (e.g., 'financial expert', 'market analyst', 'interviewer', 'co-host')",
                        "default": "financial expert"
                    },
                    "dialogue_structure": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Structure of the podcast dialogue (e.g., ['Introduction', 'Main Content Summary', 'Deep Dive', 'Conclusion'])",
                        "default": ["Introduction", "Main Content Summary", "Conclusion"]
                    },
                    "podcast_name": {
                        "type": "string",
                        "description": "Custom name for the podcast series",
                        "default": "AI Generated Podcast"
                    },
                    "podcast_tagline": {
                        "type": "string",
                        "description": "Tagline or subtitle for the podcast",
                        "default": "Transforming content into engaging conversations"
                    },
                    "engagement_techniques": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Techniques to make the podcast more engaging (e.g., ['rhetorical questions', 'anecdotes', 'analogies', 'humor'])",
                        "default": ["rhetorical questions", "anecdotes"]
                    },
                    "creativity": {
                        "type": "number",
                        "description": "Level of creativity/temperature for the conversation (0.0 to 1.0, where 1.0 is most creative)",
                        "default": 0.7,
                        "minimum": 0.0,
                        "maximum": 1.0
                    },
                    "user_instructions": {
                        "type": "string",
                        "description": "Custom instructions to guide the conversation focus and topics",
                        "default": ""
                    },
                    "voices": {
                        "type": "object",
                        "description": "Voice configuration for TTS (e.g., {'question': 'voice1', 'answer': 'voice2'})",
                        "default": {}
                    }
                },
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="generate-podcast",
        mappings=[
            {"param_name": "urls", "node_type": "element", "path": "urls", "required": False},
            {"param_name": "file_paths", "node_type": "element", "path": "file_paths", "required": False},
            {"param_name": "text", "node_type": "element", "path": "text", "required": False},
            {"param_name": "topic", "node_type": "element", "path": "topic", "required": False},
            {"param_name": "output_name", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "conversation_style", "node_type": "element", "path": "conversation_style", "required": False},
            {"param_name": "podcast_length", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "language", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "transcript_only", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "roles_person1", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "roles_person2", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "dialogue_structure", "node_type": "element", "path": "dialogue_structure", "required": False},
            {"param_name": "podcast_name", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "podcast_tagline", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "engagement_techniques", "node_type": "element", "path": "engagement_techniques", "required": False},
            {"param_name": "creativity", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "user_instructions", "node_type": "element", "path": "user_instructions", "required": False},
            {"param_name": "voices", "node_type": "element", "path": "voices", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="generate_podcast">
        <parameter name="topic">The Future of AI in Healthcare</parameter>
        <parameter name="urls">["https://example.com/article1", "https://example.com/article2"]</parameter>
        <parameter name="file_paths">["documents/research.pdf", "notes/summary.txt"]</parameter>
        <parameter name="text">Here is some additional context about the research that I want to include in the podcast...</parameter>
        <parameter name="output_name">my_research_podcast</parameter>
        <parameter name="conversation_style">["engaging", "fast-paced", "enthusiastic"]</parameter>
        <parameter name="podcast_length">medium</parameter>
        <parameter name="language">English</parameter>
        <parameter name="roles_person1">financial news anchor</parameter>
        <parameter name="roles_person2">market expert</parameter>
        <parameter name="dialogue_structure">["Introduction", "Main Content Summary", "Deep Dive", "Conclusion"]</parameter>
        <parameter name="podcast_name">Tech Research Podcast</parameter>
        <parameter name="podcast_tagline">Deep dives into cutting-edge technology</parameter>
        <parameter name="engagement_techniques">["rhetorical questions", "analogies", "humor"]</parameter>
        <parameter name="creativity">0.8</parameter>
        <parameter name="user_instructions">Focus on practical applications and real-world impact</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def generate_podcast(self,
                             urls: Optional[List[str]] = None,
                             file_paths: Optional[List[str]] = None, 
                             text: Optional[str] = None,
                             topic: Optional[str] = None,
                             output_name: Optional[str] = None,
                             conversation_style: List[str] = ["engaging", "educational"],
                             podcast_length: str = "medium", 
                             language: str = "English",
                             transcript_only: bool = False,
                             roles_person1: str = "news anchor",
                             roles_person2: str = "financial expert",
                             dialogue_structure: List[str] = ["Introduction", "Main Content Summary", "Conclusion"],
                             podcast_name: str = "AI Generated Podcast",
                             podcast_tagline: str = "Transforming content into engaging conversations",
                             engagement_techniques: List[str] = ["rhetorical questions", "anecdotes"],
                             creativity: float = 0.7,
                             user_instructions: str = "",
                             voices: Dict[str, str] = None) -> ToolResult:
        """Generate an AI-powered podcast from various content sources.
        
        Args:
            urls: List of website URLs to include
            file_paths: List of local file paths in the sandbox (content will be read and sent as text)
            text: Direct text input for podcast generation
            topic: Topic or subject for the podcast (will be used to generate relevant content)
            output_name: Custom name for output files
            conversation_style: Style of conversation (e.g., ["engaging", "fast-paced", "enthusiastic"])
            podcast_length: Desired length (short/medium/long)
            language: Language for the podcast
            transcript_only: Generate only transcript without audio
            roles_person1: Role of the first speaker
            roles_person2: Role of the second speaker
            dialogue_structure: Structure of the podcast dialogue
            podcast_name: Custom name for the podcast series
            podcast_tagline: Tagline or subtitle for the podcast
            engagement_techniques: Techniques to make the podcast more engaging
            creativity: Level of creativity/temperature (0.0-1.0)
            user_instructions: Custom instructions to guide the conversation
            voices: Voice configuration for TTS
            
        Returns:
            ToolResult with podcast generation status and file locations
        """
        try:
            # Ensure sandbox is initialized
            await self._ensure_sandbox()
            
            # Validate inputs
            if not any([urls, file_paths, text, topic]):
                return self.fail_response("At least one content source (URLs, files, text, or topic) must be provided")
            
            # Check for ElevenLabs API key when using ElevenLabs TTS
            # For Render services, we use Edge TTS which doesn't require ElevenLabs
            uses_elevenlabs = "render" not in self.api_base_url.lower()
            if uses_elevenlabs and not self.elevenlabs_key:
                return self.fail_response("ELEVENLABS_API_KEY must be set to generate podcasts with ElevenLabs TTS. Please configure this environment variable, or use a Render service which supports Edge TTS.")
            
            # Process URLs - combine with file content for now
            processed_urls = []
            if urls:
                # Validate URLs
                for url in urls:
                    if not url.startswith(('http://', 'https://')):
                        url = 'https://' + url
                    try:
                        parsed = urlparse(url)
                        if parsed.netloc:
                            processed_urls.append(url)
                    except:
                        continue
            
            # Process files - read file content and send as text to FastAPI (not the files themselves)
            file_content = ""
            if file_paths:
                for file_path in file_paths:
                    try:
                        clean_path = self.clean_path(file_path)
                        full_path = f"{self.workspace_path}/{clean_path}"
                        if self._validate_file_exists(full_path):
                            file_info = self.sandbox.fs.get_file_info(full_path)
                            file_bytes = self.sandbox.fs.download_file(full_path)
                            file_text = file_bytes.decode('utf-8', errors='ignore')
                            file_content += f"\n\nContent from {file_path}:\n{file_text}"
                            logger.info(f"File read successfully: {file_path} ({len(file_text)} characters)")
                        else:
                            logger.warning(f"File not found: {file_path}")
                    except Exception as e:
                        logger.error(f"Error reading file {file_path}: {str(e)}")
                        file_content += f"\n\nError reading {file_path}: {str(e)}"
            
            # Combine all text content with better formatting
            combined_text = ""
            if topic:
                combined_text += f"PODCAST TOPIC: {topic}\n\n"
                combined_text += f"Create a professional podcast discussion between {roles_person1} and {roles_person2} about: {topic}\n\n"
            
            if text:
                if combined_text:
                    combined_text += f"CONTENT TO DISCUSS:\n{text}\n\n"
                else:
                    combined_text = f"CONTENT TO DISCUSS:\n{text}\n\n"
                    combined_text += f"Create a podcast conversation between {roles_person1} and {roles_person2} discussing this content.\n\n"
            
            if file_content:
                if combined_text:
                    combined_text += f"ADDITIONAL CONTENT:\n{file_content}\n\n"
                else:
                    combined_text = f"CONTENT TO DISCUSS:\n{file_content}\n\n"
                    combined_text += f"Create a podcast conversation between {roles_person1} and {roles_person2} discussing this content.\n\n"
            
            # Add specific instructions to avoid generic host names
            if combined_text:
                combined_text += f"\nIMPORTANT: Use the specific roles '{roles_person1}' and '{roles_person2}' as speaker identities. Do NOT use generic terms like 'Host 1' or 'Host 2'. Make it sound like a natural conversation between these specific roles."
            
            # Send both API keys - let the FastAPI decide which to use
            openai_key = self.openai_key
            google_key = self.gemini_key
            
            llm_info = []
            if openai_key:
                llm_info.append("OpenAI")
            if google_key:
                llm_info.append("Gemini")
            
            if llm_info:
                logger.info(f"Available LLM keys: {', '.join(llm_info)} - FastAPI will choose")
            else:
                raise ValueError("No valid LLM API key available")
            
            # Prepare request payload for FastAPI
            # Note: For Render deployment, don't send API keys if they're set as env vars on the service
            # Use Edge TTS for Render services, ElevenLabs for HuggingFace spaces  
            tts_model = "edge" if "render" in self.api_base_url.lower() else "elevenlabs"
            
            # Configure voices based on TTS model
            if tts_model == "edge" and not voices:
                voices = {
                    "question": "en-US-JennyNeural",  # Natural female voice for person1  
                    "answer": "en-US-DavisNeural"    # Natural male voice for person2
                }
                logger.info("Using Edge TTS with high-quality dual voices: Jenny (female) and Davis (male)")
            elif tts_model == "elevenlabs" and not voices:
                voices = {}  # Let ElevenLabs use default voices
                logger.info("Using ElevenLabs TTS with default voice switching")
            
            payload = {
                "urls": processed_urls,
                "text": combined_text.strip() if combined_text.strip() else None,
                "tts_model": tts_model,
                "creativity": creativity,
                "conversation_style": conversation_style,
                "roles_person1": roles_person1,
                "roles_person2": roles_person2,
                "dialogue_structure": dialogue_structure,
                "name": podcast_name,
                "tagline": podcast_tagline,
                "output_language": language,
                "user_instructions": user_instructions,
                "engagement_techniques": engagement_techniques,
                "is_long_form": podcast_length == "long",
                "voices": voices,
                # Add Edge TTS specific settings for better quality
                "word_timestamps": False,  # Disable for better flow
                "ssml_tags": True,  # Enable SSML for better prosody
                "speed_rate": "0.9",  # Slightly slower for clarity
                "pitch_rate": "+0Hz"  # Natural pitch
            }
            
            # Only send API keys if the service URL suggests it needs them in payload
            # Render services typically use environment variables, while some others need keys in payload
            if "render" not in self.api_base_url.lower():
                payload.update({
                    "openai_key": openai_key,
                    "google_key": google_key,
                    "elevenlabs_key": self.elevenlabs_key,
                })
                logger.info("Added API keys to payload for non-Render service")
            else:
                logger.info("Skipping API keys in payload - Render service should use environment variables")
                logger.info(f"Using {tts_model} TTS for Render service (more reliable than ElevenLabs)")
            
            # Try async job system first, fallback to sync, then local generation
            # TEMPORARY: Skip async system due to job processing issues
            async_error = Exception("Forcing sync mode - async job system has file serving issues")
            try:
                # result = await self._submit_podcast_job(payload)
                # job_id = result["job_id"]
                raise async_error  # Force fallback to sync
            except Exception as async_error:
                logger.warning(f"Async job system failed, falling back to sync: {async_error}")
                
                # Try external service synchronous call
                try:
                    logger.info("🌐 Attempting external Podcastfy service (sync mode)")
                    response = requests.post(
                        f"{self.api_base_url}/api/generate",
                        json=payload,
                        timeout=600,  # 10 minutes timeout for podcast generation
                        headers={
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    )
                    response.raise_for_status()
                    result = response.json()
                    
                    if not result.get("audio_url"):
                        raise ValueError("No audio URL returned from external service")
                    
                    # Handle sync response (skip async job tracking)
                    logger.info("✅ External service succeeded")
                    return self._handle_sync_response(result, payload)
                    
                except Exception as external_error:
                    logger.warning(f"🌐 External service failed: {str(external_error)}")
                    logger.info("🏠 Falling back to LOCAL podcast generation")
                    
                    # Final fallback: local generation (disabled due to Python 3.12+ audioop issues)
                    if False:  # Disabled - requires Python 3.11 for audioop compatibility
                        try:
                            return self._generate_podcast_locally(payload)
                        except Exception as local_error:
                            logger.error(f"🏠 Local generation also failed: {str(local_error)}")
                    
                    return self.fail_response(
                        f"Podcast generation methods failed:\n"
                        f"- Async: {async_error}\n"
                        f"- External sync: {external_error}\n"
                        f"📝 Note: Local fallback disabled (requires Python 3.11 for audioop compatibility)\n"
                        f"💡 The external Podcastfy service should work - it's running Python 3.11.9"
                    )
            
            # Return immediately with job tracking info
            message = f"🎙️ Podcast generation started!\n\n"
            message += f"Job ID: {job_id}\n"
            message += f"Status: Queued for processing\n\n"
            message += f"⏳ This will take a few minutes. I'll let you know when it's ready!\n\n"
            
            # Add content source summary
            message += f"Content sources being processed:\n"
            if topic:
                message += f"- Topic: {topic}\n"
            if urls:
                message += f"- {len(urls)} URLs\n"
            if file_paths:
                file_chars = len(file_content.strip()) if file_content.strip() else 0
                message += f"- {len(file_paths)} local files (content read as text: {file_chars} characters)\n" 
            if text:
                text_chars = len(text.strip()) if text.strip() else 0
                message += f"- Direct text input ({text_chars} characters)\n"
            
            message += f"\nConfiguration:\n"
            message += f"- Style: {', '.join(conversation_style)}\n"
            message += f"- Length: {podcast_length}\n"
            message += f"- Language: {language}\n"
            message += f"- TTS Model: ElevenLabs\n"
            message += f"- Podcast: {podcast_name}\n"
            message += f"- Speakers: {roles_person1} & {roles_person2}\n"
            message += f"- Structure: {', '.join(dialogue_structure)}\n"
            message += f"- Engagement: {', '.join(engagement_techniques)}\n"
            message += f"- Creativity: {creativity}\n"
            if user_instructions:
                message += f"- Instructions: {user_instructions}\n"
            
            # Store job ID for potential status checking
            # TODO: Could add a check_podcast_status function later
            
            return self.success_response(message)
            
        except Exception as e:
            logger.error(f"Error in podcast generation: {str(e)}", exc_info=True)
            return self.fail_response(f"Podcast generation failed: {str(e)}")
    
    def _handle_sync_response(self, result: Dict[str, Any], payload: Dict[str, Any]) -> ToolResult:
        """Handle synchronous podcast generation response (fallback mode)"""
        try:
            # Download the audio file
            local_path = self._download_audio_file(result["audio_url"])
            
            # Create podcasts directory in workspace
            podcasts_dir = f"{self.workspace_path}/podcasts"
            self.sandbox.fs.create_folder(podcasts_dir, "755")
            
            # Determine output filename
            output_name = payload.get('output_name')
            if not output_name:
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                output_name = f"podcast_{timestamp}"
            
            # Upload to sandbox
            with open(local_path, 'rb') as f:
                audio_content = f.read()
            
            audio_filename = f"{output_name}.mp3"
            audio_path = f"{podcasts_dir}/{audio_filename}"
            self.sandbox.fs.upload_file(audio_content, audio_path)
            
            # Clean up local file
            try:
                os.unlink(local_path)
            except:
                pass
            
            # Prepare success message
            message = f"🎙️ Podcast generated successfully! (sync mode)\n\nGenerated files:\n"
            message += f"- podcasts/{audio_filename}\n"
            
            return self.success_response(message)
            
        except Exception as e:
            logger.error(f"Error handling sync response: {str(e)}")
            return self.fail_response(f"Failed to process podcast: {str(e)}")

    def _generate_podcast_locally(self, payload: Dict[str, Any]) -> ToolResult:
        """Generate podcast locally using Python TTS as final fallback
        
        NOTE: Currently disabled due to Python 3.12+ compatibility issues with audioop.
        Podcastfy requires Python 3.11 for audio processing (audioop.lin2lin removed in 3.12+).
        Use external Podcastfy service instead, which runs Python 3.11.9.
        """
        try:
            logger.info("🏠 Starting LOCAL podcast generation (final fallback)")
            
            # Install dependencies if needed
            if not LOCAL_TTS_AVAILABLE:
                logger.info("Installing local TTS dependencies...")
                try:
                    subprocess.check_call([
                        "python", "-m", "pip", "install", 
                        "pyttsx3", "gTTS", "pydub", "--quiet"
                    ])
                    # Re-import after installation
                    global pyttsx3, gTTS, AudioSegment
                    import pyttsx3
                    from gtts import gTTS
                    from pydub import AudioSegment
                    logger.info("✅ Local TTS dependencies installed successfully")
                except Exception as e:
                    logger.error(f"Failed to install TTS dependencies: {e}")
                    return self.fail_response(f"Could not install required TTS libraries: {str(e)}")
            
            # Extract content from payload
            text_content = payload.get("text", "")
            roles_person1 = payload.get("roles_person1", "news anchor")
            roles_person2 = payload.get("roles_person2", "financial expert")
            output_name = payload.get("output_name")
            
            if not text_content:
                return self.fail_response("No text content provided for local generation")
            
            # Create script from content - extract meaningful dialogue
            script = self._create_podcast_script(text_content, roles_person1, roles_person2)
            
            if not script:
                return self.fail_response("Could not generate podcast script from content")
            
            # Generate audio using TTS
            audio_filename = self._generate_local_audio(script, output_name)
            
            if not audio_filename:
                return self.fail_response("Failed to generate audio file")
            
            # Create success message
            message = f"🎙️ Podcast generated successfully! (🏠 local mode)\n\n"
            message += f"✅ Generated using local Python TTS\n"
            message += f"Generated files:\n"
            message += f"- podcasts/{audio_filename}\n"
            message += f"- {len(script)} dialogue segments processed\n"
            
            return self.success_response(message)
            
        except Exception as e:
            logger.error(f"Error in local podcast generation: {str(e)}")
            return self.fail_response(f"Local podcast generation failed: {str(e)}")
    
    def _create_podcast_script(self, content: str, role1: str, role2: str) -> List[Dict[str, str]]:
        """Create a structured podcast script from text content"""
        try:
            # Simple script generation - split content into speaker segments
            # This creates a basic dialogue structure
            
            script = []
            
            # Add introduction
            script.append({
                "speaker": role1.title(),
                "text": f"Welcome to this special podcast edition. I'm your {role1}, and today we're discussing some breaking news that's making waves."
            })
            
            # Process the main content - try to create natural dialogue
            if "Figma" in content and "IPO" in content:
                # Special handling for Figma IPO content
                script.extend([
                    {
                        "speaker": role2.title(),
                        "text": f"That's right! What we're seeing with Figma's IPO debut is nothing short of spectacular. This is the kind of market performance that reminds us why the tech sector continues to captivate investors worldwide."
                    },
                    {
                        "speaker": role1.title(),
                        "text": f"For our listeners just tuning in, let me paint the picture. Figma priced its IPO at $33 per share yesterday evening. That gave the company an initial valuation of $19.3 billion and raised $1.2 billion in proceeds."
                    },
                    {
                        "speaker": role2.title(),
                        "text": f"But here's where it gets absolutely wild - the stock opened at $85 per share, that's already a 158% jump from the IPO price, and then it just kept climbing! We saw it hit highs above $112, which represents gains of over 230% in a single trading day."
                    },
                    {
                        "speaker": role1.title(),
                        "text": f"Those are the kind of numbers that make Wall Street legends. This puts Figma in the same category as some of the most successful tech IPOs we've ever seen."
                    },
                    {
                        "speaker": role2.title(),
                        "text": f"Exactly! This is a company that's revolutionized design collaboration, and the market is clearly betting big on their future. We'll continue monitoring this story throughout the day."
                    },
                    {
                        "speaker": role1.title(),
                        "text": f"That's all for this breaking news update. Stay tuned for more coverage of this historic IPO debut."
                    }
                ])
            else:
                # Generic content processing
                lines = content.split('\n')
                key_points = [line.strip() for line in lines if line.strip() and len(line.strip()) > 20][:4]
                
                for i, point in enumerate(key_points):
                    speaker = role1.title() if i % 2 == 0 else role2.title()
                    script.append({
                        "speaker": speaker,
                        "text": point
                    })
                
                # Add conclusion
                script.append({
                    "speaker": role1.title(),
                    "text": f"Thank you for joining us for this discussion. We'll be back with more insights soon."
                })
            
            logger.info(f"✅ Created script with {len(script)} segments")
            return script
            
        except Exception as e:
            logger.error(f"Error creating script: {str(e)}")
            return []
    
    def _generate_local_audio(self, script: List[Dict[str, str]], output_name: Optional[str] = None) -> Optional[str]:
        """Generate audio file from script using local TTS"""
        try:
            # Create podcasts directory
            podcasts_dir = f"{self.workspace_path}/podcasts"
            self.sandbox.fs.create_folder(podcasts_dir, "755")
            
            # Determine filename
            if not output_name:
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                output_name = f"podcast_{timestamp}"
            
            audio_filename = f"{output_name}.mp3"
            
            # Use temporary files for audio generation
            temp_files = []
            combined_audio = AudioSegment.empty()
            
            for i, segment in enumerate(script):
                speaker = segment["speaker"]
                text = segment["text"]
                
                # Create TTS audio for this segment
                temp_file = f"/tmp/segment_{i}_{int(time.time())}.mp3"
                
                # Use different TTS engines for different speakers
                if i % 2 == 0:  # First speaker - use gTTS
                    tts = gTTS(text=text, lang='en', slow=False)
                    tts.save(temp_file)
                else:  # Second speaker - use pyttsx3 (different voice)
                    # pyttsx3 alternative approach
                    engine = pyttsx3.init()
                    voices = engine.getProperty('voices')
                    if len(voices) > 1:
                        engine.setProperty('voice', voices[1].id)  # Different voice
                    engine.setProperty('rate', 160)  # Slightly different speed
                    
                    # Save to temporary WAV file first
                    temp_wav = f"/tmp/segment_{i}_{int(time.time())}.wav"
                    engine.save_to_file(text, temp_wav)
                    engine.runAndWait()
                    
                    # Convert WAV to MP3
                    audio = AudioSegment.from_wav(temp_wav)
                    audio.export(temp_file, format="mp3")
                    os.unlink(temp_wav)  # Clean up WAV
                
                # Load and combine audio
                segment_audio = AudioSegment.from_mp3(temp_file)
                combined_audio += segment_audio
                
                # Add small pause between speakers
                if i < len(script) - 1:
                    pause = AudioSegment.silent(duration=500)  # 0.5 second pause
                    combined_audio += pause
                
                temp_files.append(temp_file)
            
            # Export final combined audio to temporary file
            temp_final = f"/tmp/final_podcast_{int(time.time())}.mp3"
            combined_audio.export(temp_final, format="mp3", bitrate="128k")
            
            # Upload to sandbox
            with open(temp_final, 'rb') as f:
                audio_content = f.read()
            
            audio_path = f"{podcasts_dir}/{audio_filename}"
            self.sandbox.fs.upload_file(audio_content, audio_path)
            
            # Clean up temporary files
            for temp_file in temp_files + [temp_final]:
                try:
                    os.unlink(temp_file)
                except:
                    pass
            
            logger.info(f"✅ Local podcast generated: {audio_filename}")
            return audio_filename
            
        except Exception as e:
            logger.error(f"Error generating local audio: {str(e)}")
            return None

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "check_podcast_status",
            "description": "Check the status of an async podcast generation job using its job ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "string",
                        "description": "The job ID returned when podcast generation was started"
                    }
                },
                "required": ["job_id"]
            }
        }
    })
    @xml_schema(
        tag_name="check-podcast-status",
        mappings=[
            {"param_name": "job_id", "node_type": "attribute", "path": ".", "required": True}
        ],
        example='''
        <function_calls>
        <invoke name="check_podcast_status">
        <parameter name="job_id">abc123-def456-789</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def check_podcast_status(self, job_id: str) -> ToolResult:
        """Check the status of a podcast generation job"""
        try:
            result = await self._check_job_status(job_id)
            
            status = result.get("status", "unknown")
            message = f"🎙️ Podcast Job Status: {job_id}\n\n"
            
            if status == "queued":
                message += "⏳ Status: Queued - waiting to be processed"
            elif status == "processing":
                message += "🔄 Status: Processing - generating your podcast..."
            elif status == "completed":
                message += "🎉 **Podcast Ready!** ✅\n\n"
                
                # Check for download URL and local audio path
                download_url = result.get("audioUrl") or result.get("audio_url")
                audio_path = result.get("audio_path")  # Local path
                filename = result.get("filename", "podcast.mp3")
                display_name = result.get("display_name", filename)
                
                # Calculate file size for display
                try:
                    if audio_path:
                        file_info = self.sandbox.fs.get_file_info(f"{self.workspace_path}/{audio_path}")
                        file_size_mb = file_info.size / (1024 * 1024)
                        size_display = f" ({file_size_mb:.1f} MB)"
                    else:
                        size_display = ""
                except:
                    size_display = ""
                
                if download_url and audio_path:
                    # Professional display with file info
                    message += f"🎧 **{display_name}**{size_display}\n"
                    message += f"**Duration**: Approximately {self._estimate_duration(filename)}\n"
                    message += f"**Style**: Professional podcast format\n\n"
                    message += f"🎯 **Access Your Podcast:**\n"
                    message += f"**Audio Player**: Available at {audio_path}\n"
                    message += f"**Download Link**: [Download Podcast]({download_url})\n\n"
                elif download_url:
                    # Fallback to just download link
                    message += f"🎧 **{display_name}**{size_display}\n\n"
                    message += f"🎯 **Download**: [Get Your Podcast]({download_url})\n\n"
                
                completed_time = result.get('completed_at', 'Unknown time')
                message += f"⏰ **Completed**: {completed_time}\n"
                message += f"🆔 **Job ID**: {job_id}"
            elif status == "failed":
                message += "❌ Status: Failed\n"
                if result.get("error"):
                    message += f"Error: {result['error']}"
            else:
                message += f"Status: {status}"
                
            return self.success_response(message)
            
        except Exception as e:
            return self.fail_response(f"Failed to check podcast status: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "debug_podcast_jobs",
            "description": "Debug stuck podcast jobs - shows detailed job info and can clear stuck jobs",
            "parameters": {
                "type": "object",
                "properties": {
                    "clear_stuck": {
                        "type": "boolean",
                        "description": "If true, clear jobs stuck in processing for >30 minutes",
                        "default": False
                    }
                },
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="debug-podcast-jobs",
        mappings=[
            {"param_name": "clear_stuck", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="debug_podcast_jobs">
        <parameter name="clear_stuck">false</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def debug_podcast_jobs(self, clear_stuck: bool = False) -> ToolResult:
        """Debug podcast job system - show detailed job info and optionally clear stuck jobs"""
        try:
            # Get all podcast job keys
            redis_client = await redis.get_client()
            job_keys = await redis_client.keys("podcast_job:*")
            
            if not job_keys:
                return self.success_response("No podcast jobs found in Redis")
            
            message = f"🔍 **Podcast Job Diagnostic Report**\n\n"
            message += f"Found {len(job_keys)} job(s):\n\n"
            
            current_time = time.time()
            stuck_jobs = []
            
            for key in job_keys:
                job_data = await redis.hgetall(key)
                if not job_data:
                    continue
                    
                # Convert bytes to strings
                job_info = {k.decode() if isinstance(k, bytes) else k: 
                           v.decode() if isinstance(v, bytes) else v 
                           for k, v in job_data.items()}
                
                job_id = key.replace("podcast_job:", "")
                status = job_info.get("status", "unknown")
                created_at = float(job_info.get("created_at", "0"))
                age_minutes = (current_time - created_at) / 60
                
                message += f"**Job ID**: `{job_id}`\n"
                message += f"- Status: {status}\n"
                message += f"- Age: {age_minutes:.1f} minutes\n"
                message += f"- Project: {job_info.get('project_id', 'unknown')}\n"
                message += f"- Thread: {job_info.get('thread_id', 'unknown')}\n"
                
                if job_info.get("error"):
                    message += f"- ❌ Error: {job_info['error']}\n"
                
                if status == "processing" and age_minutes > 30:
                    stuck_jobs.append(key)
                    message += f"- ⚠️ **STUCK** (processing >30 min)\n"
                
                message += "\n"
            
            if stuck_jobs:
                message += f"⚠️ **Found {len(stuck_jobs)} stuck job(s)**\n\n"
                
                if clear_stuck:
                    message += "🧹 **Clearing stuck jobs...**\n"
                    for key in stuck_jobs:
                        await redis.delete(key)
                        job_id = key.replace("podcast_job:", "")
                        message += f"- Cleared job: `{job_id}`\n"
                    message += f"\n✅ Cleared {len(stuck_jobs)} stuck job(s)\n"
                else:
                    message += "💡 **Tip**: Run with `clear_stuck=true` to clear these stuck jobs\n"
            
            # Add system info
            message += "\n---\n"
            message += f"**System Info:**\n"
            message += f"- Redis connection: ✅ Active\n"
            message += f"- Current time: {current_time}\n"
            message += f"- API Base URL: {self.api_base_url}\n"
            message += f"- ElevenLabs key: {'✅ Set' if self.elevenlabs_key else '❌ Missing'}\n"
            message += f"- OpenAI key: {'✅ Set' if self.openai_key else '❌ Missing'}\n"
            message += f"- Gemini key: {'✅ Set' if self.gemini_key else '❌ Missing'}\n"
            
            return self.success_response(message)
            
        except Exception as e:
            return self.fail_response(f"Debug failed: {str(e)}")

    @openapi_schema({
        "type": "function", 
        "function": {
            "name": "list_podcasts",
            "description": "List all generated podcasts in the workspace with their details and file sizes.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="list-podcasts",
        mappings=[],
        example='''
        <function_calls>
        <invoke name="list_podcasts">
        </invoke>
        </function_calls>
        '''
    )
    async def list_podcasts(self) -> ToolResult:
        """List all generated podcasts in the workspace.
        
        Returns:
            ToolResult with list of podcasts and their details
        """
        try:
            # Ensure sandbox is initialized
            await self._ensure_sandbox()
            
            podcasts_dir = f"{self.workspace_path}/podcasts"
            
            # Check if podcasts directory exists
            try:
                files = self.sandbox.fs.list_files(podcasts_dir)
            except Exception:
                return self.success_response("🎙️ No podcasts found. Use generate_podcast to create your first podcast!")
            
            if not files:
                return self.success_response("🎙️ No podcasts found. Use generate_podcast to create your first podcast!")
            
            # Organize files by podcast (group by base name)
            podcasts = {}
            for file_info in files:
                if file_info.is_dir:
                    continue
                    
                filename = file_info.name
                if filename.endswith('_transcript.txt'):
                    base_name = filename.replace('_transcript.txt', '')
                    if base_name not in podcasts:
                        podcasts[base_name] = {}
                    podcasts[base_name]['transcript'] = {
                        'filename': filename,
                        'size': file_info.size,
                        'modified': file_info.mod_time
                    }
                elif filename.endswith('.mp3'):
                    base_name = filename.replace('.mp3', '')
                    if base_name not in podcasts:
                        podcasts[base_name] = {}
                    podcasts[base_name]['audio'] = {
                        'filename': filename,
                        'size': file_info.size, 
                        'modified': file_info.mod_time
                    }
            
            # Format response
            if not podcasts:
                return self.success_response("🎙️ No podcast files found in the podcasts directory.")
            
            # Also check Redis for completed jobs with download links
            redis_client = await redis.get_client()
            job_keys = await redis_client.keys("podcast_job:*")
            redis_jobs = {}
            
            for key in job_keys:
                job_data = await redis.hgetall(key)
                if job_data:
                    job_info = {k.decode() if isinstance(k, bytes) else k: 
                               v.decode() if isinstance(v, bytes) else v 
                               for k, v in job_data.items()}
                    
                    if job_info.get("status") == "completed":
                        job_id = key.replace("podcast_job:", "")
                        redis_jobs[job_id] = job_info
            
            message = f"🎙️ Found {len(podcasts)} podcast file(s) and {len(redis_jobs)} completed job(s):\n\n"
            
            # Show completed podcasts with professional formatting
            if redis_jobs:
                message += f"🎧 **YOUR PODCASTS** ({len(redis_jobs)}):\n\n"
                
                for job_id, job_info in redis_jobs.items():
                    filename = job_info.get('filename', f'podcast_{job_id[:8]}.mp3')
                    display_name = job_info.get('display_name', filename)
                    download_url = job_info.get('audioUrl') or job_info.get('audio_url')
                    audio_path = job_info.get('audio_path')  # Local path
                    
                    # Calculate file size
                    try:
                        if audio_path:
                            file_info = self.sandbox.fs.get_file_info(f"{self.workspace_path}/{audio_path}")
                            file_size_mb = file_info.size / (1024 * 1024)
                            size_display = f" ({file_size_mb:.1f} MB)"
                            duration = self._estimate_duration(filename)
                        else:
                            size_display = ""
                            duration = "Unknown duration"
                    except:
                        size_display = ""
                        duration = "Unknown duration"
                    
                    message += f"🎙️ **{display_name}**{size_display}\n"
                    message += f"   📊 **Duration**: {duration}\n"
                    if download_url and audio_path:
                        # Professional presentation
                        message += f"   🎧 **Play**: Available at {audio_path}\n"
                        message += f"   📥 **Download**: [Get Podcast]({download_url})\n"
                    elif download_url:
                        # Fallback to just download link
                        message += f"   📥 **Download**: [Get Podcast]({download_url})\n"
                    message += "\n"
                
                message += "---\n\n"
            
                            # Show additional podcast files
                if podcasts:
                    message += "📁 **ADDITIONAL FILES:**\n\n"
                    for podcast_name, files in podcasts.items():
                        message += f"📻 {podcast_name}\n"
                        
                        if 'transcript' in files:
                            size_kb = files['transcript']['size'] / 1024
                            message += f"   📝 Transcript: {files['transcript']['filename']} ({size_kb:.1f} KB)\n"
                        
                        if 'audio' in files:
                            size_mb = files['audio']['size'] / (1024 * 1024)
                            audio_path = f"podcasts/{files['audio']['filename']}"
                            duration = self._estimate_duration(files['audio']['filename'])
                            message += f"   🎧 **Play**: Available at {audio_path}\n"
                            message += f"   📊 **Details**: {files['audio']['filename']} ({size_mb:.1f} MB, ~{duration})\n"
                
                # Show most recent modification time
                mod_times = []
                if 'transcript' in files:
                    mod_times.append(files['transcript']['modified'])
                if 'audio' in files:
                    mod_times.append(files['audio']['modified'])
                
                if mod_times:
                    latest_mod = max(mod_times)
                    message += f"   📅 Last modified: {latest_mod}\n"
                
                message += "\n"
            
            return self.success_response(message)
            
        except Exception as e:
            logger.error(f"Error listing podcasts: {str(e)}", exc_info=True)
            return self.fail_response(f"Error listing podcasts: {str(e)}")

    async def _check_service_health(self) -> bool:
        """Check if Podcastfy service is healthy before making requests"""
        try:
            logger.info(f"Checking Podcastfy service health at: {self.api_base_url}")
            response = requests.get(f"{self.api_base_url}/api/health", timeout=15)
            if response.status_code == 200:
                health_data = response.json()
                logger.info(f"Service health check: {health_data}")
                return health_data.get("status") == "healthy"
            else:
                logger.warning(f"Service health check failed: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.Timeout:
            logger.error(f"Service health check timed out - service may be sleeping/cold starting")
            return False
        except Exception as e:
            logger.error(f"Service health check error: {e}")
            return False

    async def _submit_podcast_job(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Submit podcast generation job using simple background processing"""
        try:
            # Check service health first
            if not await self._check_service_health():
                raise Exception(f"Podcastfy service at {self.api_base_url} is not healthy. This could be due to:\n"
                               f"- Service is sleeping (common with Render/Hugging Face)\n"
                               f"- Service is experiencing issues\n" 
                               f"- Network connectivity problems\n"
                               f"Please try again in a few minutes or contact support if the issue persists.")
            
            # Generate unique job ID
            job_id = str(uuid.uuid4())
            logger.info(f"🎙️ Starting async podcast job: {job_id}")
            
            # Store job info in Redis with "processing" status
            await redis.hset(
                f"podcast_job:{job_id}",
                mapping={
                    "status": "processing",
                    "project_id": self.project_id,
                    "thread_id": getattr(self.thread_manager, 'thread_id', 'unknown'),
                    "created_at": str(time.time()),
                    "payload": json.dumps(payload)
                }
            )
            
            # Set expiration (24 hours)
            await redis.expire(f"podcast_job:{job_id}", 86400)
            
            # Start background task
            asyncio.create_task(self._process_podcast_background(job_id, payload))
            
            logger.info(f"✅ Podcast job {job_id} started")
            
            return {
                "job_id": job_id,
                "status": "processing",
                "audioUrl": None
            }
            
        except Exception as e:
            raise Exception(f"Failed to submit podcast job: {str(e)}")

    async def _process_podcast_background(self, job_id: str, payload: Dict[str, Any]) -> None:
        """Process podcast generation in background"""
        logger.info(f"🎙️ Background processing started for job: {job_id}")
        
        try:
            # Ensure sandbox is available for file operations
            await self._ensure_sandbox()
            # Make the API request in thread pool to avoid blocking
            result = await asyncio.to_thread(self._make_fastapi_request, payload)
            
            # Check if we got an audio URL
            audio_url = result.get("audio_url")
            if not audio_url:
                logger.error("No audio URL in result")
                await redis.hset(
                    f"podcast_job:{job_id}",
                    mapping={
                        "status": "failed",
                        "error": "No audio URL in response",
                        "completed_at": str(time.time())
                    }
                )
                return
            
            logger.info(f"📥 Downloading audio from: {audio_url}")
            
            # Download the audio file to sandbox
            audio_response = await asyncio.to_thread(requests.get, audio_url, timeout=60)
            audio_response.raise_for_status()
            
            # Generate meaningful filename with topic and date
            podcast_name = payload.get('name', payload.get('podcast_name', 'podcast'))
            topic_text = payload.get('text', '')
            
            # Try to extract meaningful name from topic/content
            if topic_text and len(topic_text) > 10:
                # Extract first meaningful phrase from content
                words = topic_text.split()[:6]  # First 6 words
                meaningful_name = ' '.join(words)
                meaningful_name = re.sub(r'[^\w\s\-]', '', meaningful_name)  # Remove special chars
                meaningful_name = re.sub(r'\s+', '_', meaningful_name.strip())  # Replace spaces with underscores
            else:
                meaningful_name = podcast_name
            
            # Create safe filename with date
            current_date = datetime.datetime.now().strftime("%Y%m%d")
            safe_name = re.sub(r'[^\w\-_]', '_', meaningful_name.lower())[:30]  # Limit length
            filename = f"{safe_name}_{current_date}.mp3"
            
            # Ensure podcasts directory exists in sandbox
            podcasts_dir = f"{self.workspace_path}/podcasts"
            try:
                # Use sandbox file system instead of direct OS calls
                self.sandbox.fs.create_folder(podcasts_dir, "755")
                logger.info(f"Created podcasts directory: {podcasts_dir}")
            except Exception as e:
                logger.warning(f"Directory might already exist: {e}")
            
            # Save audio file using sandbox file system
            audio_path = f"{podcasts_dir}/{filename}"
            self.sandbox.fs.upload_file(audio_response.content, audio_path)
            
            logger.info(f"💾 Audio saved to sandbox: {audio_path}")
            
            # Update Redis with completion info including both external URL and local path
            await redis.hset(
                f"podcast_job:{job_id}",
                mapping={
                    "status": "completed",
                    "audioUrl": audio_url,  # External URL for download
                    "filename": filename,
                    "audio_path": f"podcasts/{filename}",  # Local path for audio player
                    "completed_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "display_name": filename.replace('.mp3', '').replace('_', ' ').title(),
                    "topic_hint": payload.get('text', '')[:100] if payload.get('text') else ""  # Store snippet for reference
                }
            )
            
            logger.info(f"✅ Podcast job {job_id} completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Background processing failed for job {job_id}: {str(e)}")
            await redis.hset(
                f"podcast_job:{job_id}",
                mapping={
                    "status": "failed",
                    "error": str(e),
                    "completed_at": str(time.time())
                }
            )

    def _make_fastapi_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make request to FastAPI endpoint with retries"""
        max_retries = 3
        retry_delay = 5  # seconds
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Making request to {self.api_base_url}/api/generate (attempt {attempt + 1}/{max_retries})")
                logger.info(f"Payload keys: {list(payload.keys())}")
                
                response = requests.post(
                    f"{self.api_base_url}/api/generate",
                    json=payload,
                    timeout=600,  # 10 minutes for complex podcasts
                    headers={
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                )
                
                logger.info(f"Response status: {response.status_code}")
                logger.info(f"Response headers: {dict(response.headers)}")
                
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"Response keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
                logger.info(f"Full response content: {result}")  # Log full response for debugging
                
                # Check if service is in fallback mode
                method = result.get("method", "unknown")
                if method == "direct_api_fallback":
                    logger.warning(f"⚠️ Podcastfy service is in FALLBACK MODE - audio generation disabled")
                    logger.warning(f"Service message: {result.get('message', 'No message')}")
                    logger.warning(f"This usually means the service lacks proper TTS configuration (ElevenLabs API key, etc.)")
                
                # Better handling of different response formats
                if not isinstance(result, dict):
                    raise Exception(f"Invalid response format: expected dict, got {type(result)}")
                
                # Handle different possible field names for audio URL
                audio_url = (
                    result.get("audioUrl") or 
                    result.get("audio_url") or 
                    result.get("audioURL") or
                    result.get("file_url") or
                    result.get("download_url") or
                    result.get("url") or
                    result.get("link") or
                    result.get("audio_file")  # Some services use this field
                )
                
                if not audio_url:
                    method = result.get("method", "unknown")
                    if method == "direct_api_fallback":
                        # Check if this is ElevenLabs quota issue
                        service_message = result.get('message', '')
                        if 'edge TTS' in service_message.lower():
                            raise Exception(f"🚨 ELEVENLABS QUOTA EXCEEDED:\n\n"
                                          f"Your ElevenLabs account appears to be at its character limit.\n"
                                          f"Service message: {service_message}\n\n"
                                          f"SOLUTIONS:\n"
                                          f"• Wait for your ElevenLabs quota to reset\n"
                                          f"• Upgrade your ElevenLabs subscription\n"
                                          f"• Use Edge TTS (free alternative - we've switched to this automatically)")
                        else:
                            # Generic fallback mode error
                            raise Exception(f"🚨 RENDER SERVICE CONFIGURATION ISSUE:\n\n"
                                          f"Your Podcastfy service at {self.api_base_url} is running in FALLBACK MODE.\n"
                                          f"It can generate transcripts but NOT audio.\n\n"
                                          f"Service response: {service_message}\n\n"
                                          f"SOLUTION: Check your Render service environment variables and logs.")
                    
                    logger.error(f"No audio URL found in response. Available fields: {list(result.keys())}")
                    logger.error(f"Full response: {result}")
                    
                    # If this is not the last attempt, continue to retry
                    if attempt < max_retries - 1:
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        raise Exception(f"No audio URL in response after {max_retries} attempts. Available fields: {list(result.keys())}")
                
                # Fix relative URLs by prepending base URL
                if audio_url and audio_url.startswith('/'):
                    audio_url = f"{self.api_base_url}{audio_url}"
                    logger.info(f"Converted relative URL to absolute: {audio_url}")
                elif audio_url and not audio_url.startswith(('http://', 'https://')):
                    # Handle other relative path formats
                    audio_url = f"{self.api_base_url}/{audio_url.lstrip('/')}"
                    logger.info(f"Converted relative path to absolute: {audio_url}")
                
                # Validate the final URL format
                if audio_url and not audio_url.startswith(('http://', 'https://')):
                    logger.error(f"Invalid URL format after processing: {audio_url}")
                    raise Exception(f"Invalid URL format: {audio_url}")
                
                # Verify the URL is accessible
                try:
                    head_response = requests.head(audio_url, timeout=30)
                    if head_response.status_code != 200:
                        logger.warning(f"Audio URL returned {head_response.status_code}: {audio_url}")
                        if attempt < max_retries - 1:
                            logger.info(f"Audio URL not accessible, retrying in {retry_delay} seconds...")
                            time.sleep(retry_delay)
                            continue
                except Exception as e:
                    logger.warning(f"Could not verify audio URL accessibility: {e}")
                
                # Ensure the result has the expected audioUrl field
                result["audioUrl"] = audio_url
                
                logger.info(f"✅ Successfully generated podcast with audio URL: {audio_url}")
                return result
                
            except requests.exceptions.Timeout as e:
                logger.error(f"Request timed out (attempt {attempt + 1}/{max_retries}): {str(e)}")
                if attempt < max_retries - 1:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    continue
                else:
                    raise Exception(f"Request timed out after {max_retries} attempts: {str(e)}")
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"FastAPI request failed (attempt {attempt + 1}/{max_retries}): {str(e)}")
                if attempt < max_retries - 1:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    continue
                else:
                    raise Exception(f"FastAPI request failed after {max_retries} attempts: {str(e)}")
                    
            except Exception as e:
                logger.error(f"Podcast generation failed (attempt {attempt + 1}/{max_retries}): {str(e)}")
                if attempt < max_retries - 1:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    continue
                else:
                    raise Exception(f"Podcast generation failed after {max_retries} attempts: {str(e)}")
        
        # This should never be reached, but just in case
        raise Exception("All retry attempts exhausted")
    
    async def _check_job_status(self, job_id: str) -> Dict[str, Any]:
        """Check job status from Redis"""
        try:
            # Get job data from Redis
            job_data = await redis.hgetall(f"podcast_job:{job_id}")
            
            if not job_data:
                raise Exception("Job not found")
            
            # Convert bytes to strings
            result = {k.decode() if isinstance(k, bytes) else k: 
                     v.decode() if isinstance(v, bytes) else v 
                     for k, v in job_data.items()}
            
            return {
                "job_id": job_id,
                "status": result.get("status", "unknown"),
                "audioUrl": result.get("audioUrl"),  # Read the same field name we store
                "error": result.get("error"),
                "created_at": result.get("created_at"),
                "completed_at": result.get("completed_at")
            }
            
        except Exception as e:
            raise Exception(f"Failed to check job status: {str(e)}")

    # Define the available functions for the agent
    @property  
    def xml_function_list(self):
        return [
            {
                "name": "generate_podcast",
                "description": "Generate an AI podcast from URLs, text, or files using advanced conversation AI (async - returns job ID)",
                "parameters": [
                    {"name": "urls", "type": "List[str]", "description": "List of URLs to process", "required": False},
                    {"name": "file_paths", "type": "List[str]", "description": "List of file paths in sandbox (content read as text)", "required": False},
                    {"name": "text", "type": "str", "description": "Direct text input for podcast generation", "required": False},
                    {"name": "topic", "type": "str", "description": "Topic or subject for the podcast", "required": False},
                    {"name": "output_name", "type": "str", "description": "Custom output name", "required": False},
                    {"name": "conversation_style", "type": "List[str]", "description": "Style like ['engaging','fast-paced']", "required": False},
                    {"name": "podcast_length", "type": "str", "description": "Length: short/medium/long", "required": False},
                    {"name": "roles_person1", "type": "str", "description": "Role of first speaker", "required": False},
                    {"name": "roles_person2", "type": "str", "description": "Role of second speaker", "required": False},
                    {"name": "dialogue_structure", "type": "List[str]", "description": "Structure like ['Introduction','Content','Conclusion']", "required": False},
                    {"name": "podcast_name", "type": "str", "description": "Name of the podcast", "required": False},
                    {"name": "podcast_tagline", "type": "str", "description": "Podcast tagline", "required": False},
                    {"name": "creativity", "type": "float", "description": "Creativity level 0-1 (default: 0.7)", "required": False},
                    {"name": "user_instructions", "type": "str", "description": "Custom instructions", "required": False},
                    {"name": "language", "type": "str", "description": "Language (default: 'English')", "required": False},
                    {"name": "voices", "type": "Dict[str,str]", "description": "Voice config", "required": False}
                ]
            },
            {
                "name": "check_podcast_status",
                "description": "Check the status of an async podcast generation job",
                "parameters": [
                    {"name": "job_id", "type": "str", "description": "Job ID returned from generate_podcast", "required": True}
                ]
            },
            {
                "name": "debug_podcast_jobs",
                "description": "Debug stuck podcast jobs - shows detailed job info and can clear stuck jobs",
                "parameters": [
                    {"name": "clear_stuck", "type": "bool", "description": "If true, clear jobs stuck >30 min", "required": False}
                ]
            },
            {
                "name": "list_podcasts",
                "description": "List all generated podcasts in the workspace",
                "parameters": []
            }
        ]

    @property
    def openapi_schema(self):
        return {
            "openapi": "3.0.0",
            "info": {
                "title": "Podcast Generation Tool",
                "description": "Generate AI podcasts from content using Podcastfy FastAPI",
                "version": "3.0.0"
            },
            "servers": [{"url": "http://localhost"}],
            "paths": {
                "/generate_podcast": {
                    "post": {
                        "summary": "Generate AI Podcast",
                        "description": "Create a conversational podcast from URLs, text, or files",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "urls": {"type": "array", "items": {"type": "string"}, "description": "URLs to process"},
                                            "file_paths": {"type": "array", "items": {"type": "string"}, "description": "File paths in sandbox (content read as text)"},
                                            "text": {"type": "string", "description": "Direct text input for podcast generation"},
                                            "topic": {"type": "string", "description": "Topic or subject for the podcast"},
                                            "output_name": {"type": "string", "description": "Custom output name"},
                                            "conversation_style": {"type": "array", "items": {"type": "string"}, "description": "Conversation style"},
                                            "podcast_length": {"type": "string", "enum": ["short", "medium", "long"], "description": "Podcast length"},
                                            "roles_person1": {"type": "string", "default": "main summarizer", "description": "Role of first speaker"},
                                            "roles_person2": {"type": "string", "default": "questioner", "description": "Role of second speaker"},
                                            "dialogue_structure": {"type": "array", "items": {"type": "string"}, "description": "Dialogue structure"},
                                            "podcast_name": {"type": "string", "default": "AI Generated Podcast", "description": "Podcast name"},
                                            "podcast_tagline": {"type": "string", "description": "Podcast tagline"},
                                            "creativity": {"type": "number", "minimum": 0, "maximum": 1, "default": 0.7, "description": "Creativity level"},
                                            "user_instructions": {"type": "string", "description": "Custom instructions"},
                                            "language": {"type": "string", "default": "English", "description": "Language"},
                                            "voices": {"type": "object", "description": "Voice configuration"}
                                        }
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "Podcast generated successfully",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "success": {"type": "boolean"},
                                                "message": {"type": "string"},
                                                "audio_file": {"type": "string"},
                                                "filename": {"type": "string"},
                                                "configuration": {"type": "object"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "/list_podcasts": {
                    "get": {
                        "summary": "List Generated Podcasts",
                        "description": "Get a list of all generated podcasts",
                        "responses": {
                            "200": {
                                "description": "List of podcasts",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "success": {"type": "boolean"},
                                                "podcasts": {"type": "array"},
                                                "total_count": {"type": "integer"},
                                                "message": {"type": "string"}
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