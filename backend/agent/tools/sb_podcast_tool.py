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
        self.api_base_url = os.getenv('PODCASTFY_API_URL', 'https://podcastfy-8x6a.onrender.com')
        self.gemini_key = os.getenv('GEMINI_API_KEY', '')
        self.openai_key = os.getenv('OPENAI_API_KEY', '')
        self.elevenlabs_key = os.getenv('ELEVENLABS_API_KEY', '')
        
        # Validate required environment variables
        if not self.openai_key and not self.gemini_key:
            raise ValueError("Either OPENAI_API_KEY or GEMINI_API_KEY must be set")
        # Note: ELEVENLABS_API_KEY is now optional - will be validated when tool is used

    def _validate_file_exists(self, file_path: str) -> bool:
        """Check if a file exists in the sandbox."""
        try:
            self.sandbox.fs.get_file_info(file_path)
            return True
        except Exception:
            return False

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
                        "description": "Role of the first speaker in the podcast (e.g., 'main summarizer', 'host', 'expert')",
                        "default": "main summarizer"
                    },
                    "roles_person2": {
                        "type": "string", 
                        "description": "Role of the second speaker in the podcast (e.g., 'questioner/clarifier', 'co-host', 'interviewer')",
                        "default": "questioner/clarifier"
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
        <parameter name="roles_person1">main summarizer</parameter>
        <parameter name="roles_person2">questioner/clarifier</parameter>
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
                             roles_person1: str = "main summarizer",
                             roles_person2: str = "questioner/clarifier",
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
            
            # Check for ElevenLabs API key when actually using the tool
            if not self.elevenlabs_key:
                return self.fail_response("ELEVENLABS_API_KEY must be set to generate podcasts. Please configure this environment variable.")
            
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
            
            # Combine all text content
            combined_text = ""
            if topic:
                combined_text += f"Topic: {topic}\n\nPlease create a podcast discussion about: {topic}"
            if text:
                if combined_text:
                    combined_text += f"\n\nAdditional content: {text}"
                else:
                    combined_text = text
            if file_content:
                if combined_text:
                    combined_text += f"\n\n{file_content}"
                else:
                    combined_text = file_content
            
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
            payload = {
                "urls": processed_urls,
                "text": combined_text.strip() if combined_text.strip() else None,
                "openai_key": openai_key,
                "google_key": google_key,
                "elevenlabs_key": self.elevenlabs_key,
                "tts_model": "elevenlabs",
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
                "voices": voices or {}
            }
            
            # Try async job system first, fallback to sync if needed
            try:
                result = await self._submit_podcast_job(payload)
                job_id = result["job_id"]
            except Exception as async_error:
                logger.warning(f"Async job system failed, falling back to sync: {async_error}")
                
                # Fallback to original synchronous call
                response = requests.post(
                    f"{self.api_base_url}/generate",
                    json=payload,
                    timeout=360  # 5 minutes timeout for podcast generation
                )
                response.raise_for_status()
                result = response.json()
                
                if not result.get("audioUrl"):
                    return self.fail_response(f"Podcast generation failed: No audio URL returned")
                
                # Handle sync response (skip async job tracking)
                return self._handle_sync_response(result, payload)
            
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
            local_path = self._download_audio_file(result["audioUrl"])
            
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
                message += "✅ Status: Completed!\n"
                if result.get("audioUrl"):
                    message += f"Audio URL: {result['audioUrl']}\n"
                    message += "\nYour podcast is ready! You can download it from the URL above."
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
            
            message = f"🎙️ Found {len(podcasts)} podcast(s):\n\n"
            
            for podcast_name, files in podcasts.items():
                message += f"📻 {podcast_name}\n"
                
                if 'transcript' in files:
                    size_kb = files['transcript']['size'] / 1024
                    message += f"   📝 Transcript: {files['transcript']['filename']} ({size_kb:.1f} KB)\n"
                
                if 'audio' in files:
                    size_mb = files['audio']['size'] / (1024 * 1024)
                    message += f"   🎵 Audio: {files['audio']['filename']} ({size_mb:.1f} MB)\n"
                
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

    async def _submit_podcast_job(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Submit podcast generation job to Operator's job system"""
        try:
            import uuid
            
            # Try to import the dramatiq actor
            try:
                from run_agent_background import generate_podcast_background
            except ImportError as e:
                logger.error(f"Podcast generator not available: {e}")
                raise Exception("Podcast generation service is not available. Please try again later.")
            
            # Generate unique job ID
            job_id = str(uuid.uuid4())
            logger.info(f"Submitting podcast job with ID: {job_id}")
            
            # Submit job to dramatiq actor (Operator's worker system)
            generate_podcast_background.send(
                job_id=job_id,
                thread_id=getattr(self.thread_manager, 'thread_id', 'unknown'),
                project_id=self.project_id,
                payload=payload
            )
            
            # Store initial job info in Redis
            await redis.hset(
                f"podcast_job:{job_id}",
                mapping={
                    "status": "queued",
                    "project_id": self.project_id,
                    "thread_id": getattr(self.thread_manager, 'thread_id', 'unknown'),
                    "created_at": str(asyncio.get_event_loop().time())
                }
            )
            
            # Set expiration (24 hours)
            await redis.expire(f"podcast_job:{job_id}", 86400)
            
            logger.info(f"Job {job_id} submitted to Operator worker system")
            
            # Return job info immediately
            return {
                "job_id": job_id,
                "status": "queued",
                "audioUrl": None  # Will be populated when job completes
            }
            
        except Exception as e:
            raise Exception(f"Failed to submit podcast job: {str(e)}")
    
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
                "audioUrl": result.get("audio_url"),
                "error": result.get("error"),
                "created_at": result.get("created_at"),
                "completed_at": result.get("completed_at")
            }
            
        except Exception as e:
            raise Exception(f"Failed to check job status: {str(e)}")

    def _download_audio_file(self, audio_url: str) -> str:
        """Download the generated audio file from FastAPI"""
        try:
            # Construct full URL if relative
            if audio_url.startswith('/'):
                download_url = f"{self.api_base_url}{audio_url}"
            else:
                download_url = audio_url
            
            logger.info(f"Downloading audio from: {download_url}")
            
            # Download the file
            response = requests.get(download_url, timeout=60)
            response.raise_for_status()
            
            # Save to temporary location using tempfile
            import tempfile
            filename = audio_url.split('/')[-1]  # Extract filename from URL
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{filename}") as temp_file:
                temp_file.write(response.content)
                return temp_file.name
            
        except Exception as e:
            raise Exception(f"Failed to download audio file: {str(e)}")

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
                    {"name": "output_name", "type": "str", "description": "Custom name for output files", "required": False},
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