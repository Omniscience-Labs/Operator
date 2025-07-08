import os
import json
import tempfile
import openai
from typing import Optional, List, Tuple
from pydub import AudioSegment
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from agentpress.thread_manager import ThreadManager
from sandbox.tool_base import SandboxToolsBase
from utils.logger import logger



class AudioTranscriptionTool(SandboxToolsBase):
    """Tool for transcribing audio files, including long recordings up to 2 hours.
    
    Handles chunking of large files that exceed OpenAI's 25MB limit and
    merges the results into a continuous transcript.
    """

    def __init__(self, project_id: str, thread_manager: Optional[ThreadManager] = None):
        super().__init__(project_id, thread_manager)
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.max_file_size = 20 * 1024 * 1024  # 20MB to be safe (OpenAI limit is 25MB)
        self.chunk_duration = 10 * 60 * 1000  # 10 minutes in milliseconds

    def _file_exists(self, path: str) -> bool:
        """Check if a file exists in the sandbox"""
        try:
            self.sandbox.fs.get_file_info(path)
            return True
        except Exception:
            return False

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "transcribe_audio",
            "description": "Transcribe an audio file to text. Supports files up to 2 hours in length and handles chunking for large files automatically.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the audio file to transcribe (e.g., '/workspace/meeting-recording.webm')"
                    },
                    "language": {
                        "type": "string",
                        "description": "Optional language code (e.g., 'en' for English, 'es' for Spanish). If not provided, the language will be auto-detected."
                    },
                    "prompt": {
                        "type": "string",
                        "description": "Optional prompt to guide the transcription style or provide context."
                    }
                },
                "required": ["file_path"]
            }
        }
    })
    @xml_schema(
        tag_name="transcribe-audio",
        mappings=[
            {"param_name": "file_path", "node_type": "element", "path": "file_path", "required": True},
            {"param_name": "language", "node_type": "element", "path": "language", "required": False},
            {"param_name": "prompt", "node_type": "element", "path": "prompt", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="transcribe_audio">
        <parameter name="file_path">/workspace/meeting-recording.webm</parameter>
        <parameter name="language">en</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def transcribe_audio(
        self,
        file_path: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None
    ) -> ToolResult:
        """Transcribe an audio file to text.
        
        Args:
            file_path: Path to the audio file
            language: Optional language code for transcription
            prompt: Optional context prompt
            
        Returns:
            ToolResult with the transcribed text or error
        """
        try:
            # Ensure sandbox is initialized
            await self._ensure_sandbox()
            
            # Clean and validate the file path
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            # Check if file exists using the sandbox filesystem
            if not self._file_exists(full_path):
                return self.fail_response(f"File not found: {file_path}")
            
            # Download the file to a temporary location
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_path)[1]) as temp_file:
                temp_path = temp_file.name
                
            try:
                # Read file content from sandbox using proper method
                content = self.sandbox.fs.download_file(full_path)
                with open(temp_path, 'wb') as f:
                    f.write(content)
                
                # Check file size
                file_size = os.path.getsize(temp_path)
                logger.info(f"Audio file size: {file_size / (1024*1024):.2f}MB")
                
                if file_size <= self.max_file_size:
                    # File is small enough, transcribe directly
                    transcript = await self._transcribe_file(temp_path, language, prompt)
                else:
                    # File is too large, need to chunk it
                    logger.info("File exceeds size limit, chunking for transcription...")
                    transcript = await self._transcribe_chunked(temp_path, language, prompt)
                
                # Save transcript to a text file
                transcript_path = file_path.rsplit('.', 1)[0] + '_transcript.txt'
                full_transcript_path = f"{self.workspace_path}/{transcript_path}"
                self.sandbox.fs.upload_file(transcript.encode(), full_transcript_path)
                
                return self.success_response({
                    "transcript": transcript,
                    "transcript_file": transcript_path,
                    "original_file": file_path,
                    "file_size_mb": round(file_size / (1024*1024), 2)
                })
                
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file {temp_path}: {e}")
                    
        except Exception as e:
            logger.error(f"Error transcribing audio file {file_path}: {str(e)}")
            return self.fail_response(f"Transcription failed: {str(e)}")
    
    async def _transcribe_file(self, file_path: str, language: Optional[str] = None, prompt: Optional[str] = None) -> str:
        """Transcribe a single audio file using OpenAI Whisper API."""
        try:
            with open(file_path, 'rb') as audio_file:
                transcription_params = {
                    "model": "gpt-4o-mini-transcribe",
                    "file": audio_file,
                    "response_format": "text"
                }
                
                if language:
                    transcription_params["language"] = language
                if prompt:
                    # Limit prompt to 224 tokens as per OpenAI's limit
                    transcription_params["prompt"] = prompt[:800]  # Rough character limit
                
                transcript = self.client.audio.transcriptions.create(**transcription_params)
                return transcript
        except Exception as e:
            logger.error(f"Error in direct transcription: {str(e)}")
            raise
    
    async def _transcribe_chunked(self, file_path: str, language: Optional[str] = None, prompt: Optional[str] = None) -> str:
        """Transcribe a large audio file by chunking it into smaller segments."""
        try:
            # Load audio file
            logger.info(f"Loading audio file for chunking: {file_path}")
            audio = AudioSegment.from_file(file_path)
            duration_ms = len(audio)
            duration_min = duration_ms / (1000 * 60)
            logger.info(f"Audio duration: {duration_min:.2f} minutes")
            
            # Calculate number of chunks
            num_chunks = (duration_ms + self.chunk_duration - 1) // self.chunk_duration
            logger.info(f"Splitting into {num_chunks} chunks")
            
            transcripts = []
            context_prompt = prompt or ""
            
            for i in range(num_chunks):
                start_ms = i * self.chunk_duration
                end_ms = min(start_ms + self.chunk_duration, duration_ms)
                
                # Extract chunk
                chunk = audio[start_ms:end_ms]
                
                # Export chunk to temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as chunk_file:
                    chunk_path = chunk_file.name
                    chunk.export(chunk_path, format="mp3", bitrate="128k")
                
                try:
                    # Transcribe chunk with context from previous chunks
                    logger.info(f"Transcribing chunk {i+1}/{num_chunks} ({start_ms/1000:.1f}s - {end_ms/1000:.1f}s)")
                    
                    # Use the last part of previous transcript as context
                    if i > 0 and transcripts:
                        # Get last ~100 words from previous transcript for context
                        prev_text = transcripts[-1].split()
                        context = " ".join(prev_text[-100:]) if len(prev_text) > 100 else transcripts[-1]
                        chunk_prompt = f"{context_prompt}\n\nPrevious context: {context}"
                    else:
                        chunk_prompt = context_prompt
                    
                    chunk_transcript = await self._transcribe_file(chunk_path, language, chunk_prompt)
                    transcripts.append(chunk_transcript.strip())
                    
                finally:
                    # Clean up chunk file
                    try:
                        os.unlink(chunk_path)
                    except Exception as e:
                        logger.warning(f"Failed to delete chunk file {chunk_path}: {e}")
            
            # Merge transcripts with proper spacing
            full_transcript = "\n\n".join(transcripts)
            
            # Post-process to remove potential duplicates at chunk boundaries
            full_transcript = self._clean_transcript(full_transcript)
            
            return full_transcript
            
        except Exception as e:
            logger.error(f"Error in chunked transcription: {str(e)}")
            raise
    
    def _clean_transcript(self, transcript: str) -> str:
        """Clean up the merged transcript to remove artifacts from chunking."""
        # Remove potential duplicate sentences at chunk boundaries
        lines = transcript.split('\n')
        cleaned_lines = []
        
        for i, line in enumerate(lines):
            if i == 0 or not line.strip():
                cleaned_lines.append(line)
            else:
                # Check if this line is very similar to the end of the previous line
                prev_line = cleaned_lines[-1] if cleaned_lines else ""
                if not self._is_duplicate_content(prev_line, line):
                    cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def _is_duplicate_content(self, text1: str, text2: str) -> bool:
        """Check if two text segments are duplicates (handling minor variations)."""
        # Simple check: if the beginning of text2 appears at the end of text1
        if not text1 or not text2:
            return False
            
        # Get the last 50 characters of text1 and first 50 of text2
        overlap_check_len = min(50, len(text1), len(text2))
        text1_end = text1[-overlap_check_len:].lower().strip()
        text2_start = text2[:overlap_check_len].lower().strip()
        
        # Check if there's significant overlap
        return text2_start in text1_end or text1_end in text2_start 