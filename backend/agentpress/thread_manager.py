"""
Conversation thread management system for AgentPress.

This module provides comprehensive conversation management, including:
- Thread creation and persistence
- Message handling with support for text and images
- Tool registration and execution
- LLM interaction with streaming support
- Error handling and cleanup
- Context summarization to manage token limits
- Memory management using mem0
"""

import json
from typing import List, Dict, Any, Optional, Type, Union, AsyncGenerator, Literal
from services.llm import make_llm_api_call
from agentpress.tool import Tool
from agentpress.tool_registry import ToolRegistry
from agentpress.context_manager import ContextManager
from agentpress.response_processor import (
    ResponseProcessor,
    ProcessorConfig
)
from services.supabase import DBConnection
from services.memory import memory_service
from utils.logger import logger
from langfuse.client import StatefulGenerationClient, StatefulTraceClient
from services.langfuse import langfuse
import datetime
from litellm import token_counter

# Type alias for tool choice
ToolChoice = Literal["auto", "required", "none"]

class ThreadManager:
    """Manages conversation threads with LLM models and tool execution.

    Provides comprehensive conversation management, handling message threading,
    tool registration, and LLM interactions with support for both standard and
    XML-based tool execution patterns.
    """

    def __init__(self, trace: Optional[StatefulTraceClient] = None, is_agent_builder: bool = False, target_agent_id: Optional[str] = None):
        """Initialize ThreadManager.

        Args:
            trace: Optional trace client for logging
            is_agent_builder: Whether this is an agent builder session
            target_agent_id: ID of the agent being built (if in agent builder mode)
        """
        self.db = DBConnection()
        self.tool_registry = ToolRegistry()
        self.trace = trace
        self.is_agent_builder = is_agent_builder
        self.target_agent_id = target_agent_id
        if not self.trace:
            self.trace = langfuse.trace(name="anonymous:thread_manager")
        self.response_processor = ResponseProcessor(
            tool_registry=self.tool_registry,
            add_message_callback=self.add_message,
            trace=self.trace,
            is_agent_builder=self.is_agent_builder,
            target_agent_id=self.target_agent_id
        )
        self.context_manager = ContextManager()

    def _is_tool_result_message(self, msg: Dict[str, Any]) -> bool:
        if not ("content" in msg and msg['content']):
            return False
        content = msg['content']
        if isinstance(content, str) and "ToolResult" in content: return True
        if isinstance(content, dict) and "tool_execution" in content: return True
        if isinstance(content, dict) and "interactive_elements" in content: return True
        if isinstance(content, str):
            try:
                parsed_content = json.loads(content)
                if isinstance(parsed_content, dict) and "tool_execution" in parsed_content: return True
                if isinstance(parsed_content, dict) and "interactive_elements" in content: return True
            except (json.JSONDecodeError, TypeError):
                pass
        return False
    
    def _compress_message(self, msg_content: Union[str, dict], message_id: Optional[str] = None, max_length: int = 3000) -> Union[str, dict]:
        """Compress the message content."""
        # print("max_length", max_length)
        if isinstance(msg_content, str):
            if len(msg_content) > max_length:
                return msg_content[:max_length] + "... (truncated)" + f"\n\nmessage_id \"{message_id}\"\nUse expand-message tool to see contents"
            else:
                return msg_content
        elif isinstance(msg_content, dict):
            if len(json.dumps(msg_content)) > max_length:
                return json.dumps(msg_content)[:max_length] + "... (truncated)" + f"\n\nmessage_id \"{message_id}\"\nUse expand-message tool to see contents"
            else:
                return msg_content
        
    def _safe_truncate(self, msg_content: Union[str, dict], max_length: int = 100000) -> Union[str, dict]:
        """Truncate the message content safely by removing the middle portion."""
        max_length = min(max_length, 100000)
        if isinstance(msg_content, str):
            if len(msg_content) > max_length:
                # Calculate how much to keep from start and end
                keep_length = max_length - 150  # Reserve space for truncation message
                start_length = keep_length // 2
                end_length = keep_length - start_length
                
                start_part = msg_content[:start_length]
                end_part = msg_content[-end_length:] if end_length > 0 else ""
                
                return start_part + f"\n\n... (middle truncated) ...\n\n" + end_part + f"\n\nThis message is too long, repeat relevant information in your response to remember it"
            else:
                return msg_content
        elif isinstance(msg_content, dict):
            json_str = json.dumps(msg_content)
            if len(json_str) > max_length:
                # Calculate how much to keep from start and end
                keep_length = max_length - 150  # Reserve space for truncation message
                start_length = keep_length // 2
                end_length = keep_length - start_length
                
                start_part = json_str[:start_length]
                end_part = json_str[-end_length:] if end_length > 0 else ""
                
                return start_part + f"\n\n... (middle truncated) ...\n\n" + end_part + f"\n\nThis message is too long, repeat relevant information in your response to remember it"
            else:
                return msg_content
  
    def _compress_tool_result_messages(self, messages: List[Dict[str, Any]], llm_model: str, max_tokens: Optional[int], token_threshold: Optional[int] = 1000) -> List[Dict[str, Any]]:
        """Compress the tool result messages except the most recent one."""
        uncompressed_total_token_count = token_counter(model=llm_model, messages=messages)

        if uncompressed_total_token_count > (max_tokens or (100 * 1000)):
            _i = 0 # Count the number of ToolResult messages
            for msg in reversed(messages): # Start from the end and work backwards
                if self._is_tool_result_message(msg): # Only compress ToolResult messages
                    _i += 1 # Count the number of ToolResult messages
                    msg_token_count = token_counter(messages=[msg]) # Count the number of tokens in the message
                    if msg_token_count > token_threshold: # If the message is too long
                        if _i > 1: # If this is not the most recent ToolResult message
                            message_id = msg.get('message_id') # Get the message_id
                            if message_id:
                                msg["content"] = self._compress_message(msg["content"], message_id, token_threshold * 3)
                            else:
                                logger.warning(f"UNEXPECTED: Message has no message_id {str(msg)[:100]}")
                        else:
                            msg["content"] = self._safe_truncate(msg["content"], int(max_tokens * 2))
        return messages

    def _compress_user_messages(self, messages: List[Dict[str, Any]], llm_model: str, max_tokens: Optional[int], token_threshold: Optional[int] = 1000) -> List[Dict[str, Any]]:
        """Compress the user messages except the most recent one."""
        uncompressed_total_token_count = token_counter(model=llm_model, messages=messages)

        if uncompressed_total_token_count > (max_tokens or (100 * 1000)):
            _i = 0 # Count the number of User messages
            for msg in reversed(messages): # Start from the end and work backwards
                if msg.get('role') == 'user': # Only compress User messages
                    _i += 1 # Count the number of User messages
                    msg_token_count = token_counter(messages=[msg]) # Count the number of tokens in the message
                    if msg_token_count > token_threshold: # If the message is too long
                        if _i > 1: # If this is not the most recent User message
                            message_id = msg.get('message_id') # Get the message_id
                            if message_id:
                                msg["content"] = self._compress_message(msg["content"], message_id, token_threshold * 3)
                            else:
                                logger.warning(f"UNEXPECTED: Message has no message_id {str(msg)[:100]}")
                        else:
                            msg["content"] = self._safe_truncate(msg["content"], int(max_tokens * 2))
        return messages

    def _compress_assistant_messages(self, messages: List[Dict[str, Any]], llm_model: str, max_tokens: Optional[int], token_threshold: Optional[int] = 1000) -> List[Dict[str, Any]]:
        """Compress the assistant messages except the most recent one."""
        uncompressed_total_token_count = token_counter(model=llm_model, messages=messages)
        if uncompressed_total_token_count > (max_tokens or (100 * 1000)):
            _i = 0 # Count the number of Assistant messages
            for msg in reversed(messages): # Start from the end and work backwards
                if msg.get('role') == 'assistant': # Only compress Assistant messages
                    _i += 1 # Count the number of Assistant messages
                    msg_token_count = token_counter(messages=[msg]) # Count the number of tokens in the message
                    if msg_token_count > token_threshold: # If the message is too long
                        if _i > 1: # If this is not the most recent Assistant message
                            message_id = msg.get('message_id') # Get the message_id
                            if message_id:
                                msg["content"] = self._compress_message(msg["content"], message_id, token_threshold * 3)
                            else:
                                logger.warning(f"UNEXPECTED: Message has no message_id {str(msg)[:100]}")
                        else:
                            msg["content"] = self._safe_truncate(msg["content"], int(max_tokens * 2))
                            
        return messages


    def _remove_meta_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove meta messages from the messages."""
        result: List[Dict[str, Any]] = []
        for msg in messages:
            msg_content = msg.get('content')
            # Try to parse msg_content as JSON if it's a string
            if isinstance(msg_content, str):
                try: msg_content = json.loads(msg_content)
                except json.JSONDecodeError: pass
            if isinstance(msg_content, dict):
                # Create a copy to avoid modifying the original
                msg_content_copy = msg_content.copy()
                if "tool_execution" in msg_content_copy:
                    tool_execution = msg_content_copy["tool_execution"].copy()
                    if "arguments" in tool_execution:
                        del tool_execution["arguments"]
                    msg_content_copy["tool_execution"] = tool_execution
                # Create a new message dict with the modified content
                new_msg = msg.copy()
                new_msg["content"] = json.dumps(msg_content_copy)
                result.append(new_msg)
            else:
                result.append(msg)
        return result

    def _compress_messages(self, messages: List[Dict[str, Any]], llm_model: str, max_tokens: Optional[int] = 41000, token_threshold: Optional[int] = 4096, max_iterations: int = 5) -> List[Dict[str, Any]]:
        """Compress the messages.
            token_threshold: must be a power of 2
        """

        if 'sonnet' in llm_model.lower():
            max_tokens = 200 * 1000 - 64000 - 28000
        elif 'gpt' in llm_model.lower():
            max_tokens = 128 * 1000 - 28000
        elif 'gemini' in llm_model.lower():
            max_tokens = 1000 * 1000 - 300000
        elif 'deepseek' in llm_model.lower():
            max_tokens = 128 * 1000 - 28000
        else:
            max_tokens = 41 * 1000 - 10000

        result = messages
        result = self._remove_meta_messages(result)

        uncompressed_total_token_count = token_counter(model=llm_model, messages=result)

        result = self._compress_tool_result_messages(result, llm_model, max_tokens, token_threshold)
        result = self._compress_user_messages(result, llm_model, max_tokens, token_threshold)
        result = self._compress_assistant_messages(result, llm_model, max_tokens, token_threshold)

        compressed_token_count = token_counter(model=llm_model, messages=result)

        logger.info(f"_compress_messages: {uncompressed_total_token_count} -> {compressed_token_count}") # Log the token compression for debugging later

        if max_iterations <= 0:
            logger.warning(f"_compress_messages: Max iterations reached, omitting messages")
            result = self._compress_messages_by_omitting_messages(messages, llm_model, max_tokens)
            return result

        if (compressed_token_count > max_tokens):
            logger.warning(f"Further token compression is needed: {compressed_token_count} > {max_tokens}")
            result = self._compress_messages(messages, llm_model, max_tokens, int(token_threshold / 2), max_iterations - 1)

        return result
    
    def _compress_messages_by_omitting_messages(
            self, 
            messages: List[Dict[str, Any]], 
            llm_model: str, 
            max_tokens: Optional[int] = 41000,
            removal_batch_size: int = 10,
            min_messages_to_keep: int = 10
        ) -> List[Dict[str, Any]]:
        """Compress the messages by omitting messages from the middle.
        
        Args:
            messages: List of messages to compress
            llm_model: Model name for token counting
            max_tokens: Maximum allowed tokens
            removal_batch_size: Number of messages to remove per iteration
            min_messages_to_keep: Minimum number of messages to preserve
        """
        if not messages:
            return messages
            
        result = messages
        result = self._remove_meta_messages(result)

        # Early exit if no compression needed
        initial_token_count = token_counter(model=llm_model, messages=result)
        max_allowed_tokens = max_tokens or (100 * 1000)
        
        if initial_token_count <= max_allowed_tokens:
            return result

        # Separate system message (assumed to be first) from conversation messages
        system_message = messages[0] if messages and messages[0].get('role') == 'system' else None
        conversation_messages = result[1:] if system_message else result
        
        safety_limit = 500
        current_token_count = initial_token_count
        
        while current_token_count > max_allowed_tokens and safety_limit > 0:
            safety_limit -= 1
            
            if len(conversation_messages) <= min_messages_to_keep:
                logger.warning(f"Cannot compress further: only {len(conversation_messages)} messages remain (min: {min_messages_to_keep})")
                break

            # Calculate removal strategy based on current message count
            if len(conversation_messages) > (removal_batch_size * 2):
                # Remove from middle, keeping recent and early context
                middle_start = len(conversation_messages) // 2 - (removal_batch_size // 2)
                middle_end = middle_start + removal_batch_size
                conversation_messages = conversation_messages[:middle_start] + conversation_messages[middle_end:]
            else:
                # Remove from earlier messages, preserving recent context
                messages_to_remove = min(removal_batch_size, len(conversation_messages) // 2)
                if messages_to_remove > 0:
                    conversation_messages = conversation_messages[messages_to_remove:]
                else:
                    # Can't remove any more messages
                    break

            # Recalculate token count
            messages_to_count = ([system_message] + conversation_messages) if system_message else conversation_messages
            current_token_count = token_counter(model=llm_model, messages=messages_to_count)

        # Prepare final result
        final_messages = ([system_message] + conversation_messages) if system_message else conversation_messages
        final_token_count = token_counter(model=llm_model, messages=final_messages)
        
        logger.info(f"_compress_messages_by_omitting_messages: {initial_token_count} -> {final_token_count} tokens ({len(messages)} -> {len(final_messages)} messages)")
            
        return final_messages


    def add_tool(self, tool_class: Type[Tool], function_names: Optional[List[str]] = None, **kwargs):
        """Add a tool to the ThreadManager."""
        self.tool_registry.register_tool(tool_class, function_names, **kwargs)
    
    async def _get_thread_context(self, thread_id: str) -> Dict[str, Optional[str]]:
        """
        Get user_id and agent_id from thread context.
        
        Args:
            thread_id: The thread ID to get context for
            
        Returns:
            Dictionary containing user_id and agent_id (if available)
        """
        try:
            client = await self.db.client
            thread_result = await client.table('threads').select('account_id, agent_id').eq('thread_id', thread_id).execute()
            
            if thread_result.data:
                thread_data = thread_result.data[0]
                return {
                    'user_id': thread_data.get('account_id'),
                    'agent_id': thread_data.get('agent_id')
                }
            else:
                logger.warning(f"Thread {thread_id} not found for memory context")
                return {'user_id': None, 'agent_id': None}
                
        except Exception as e:
            logger.error(f"Failed to get thread context for {thread_id}: {e}")
            return {'user_id': None, 'agent_id': None}
    
    async def _add_message_to_memory(self, thread_id: str, message_data: Dict[str, Any]):
        """
        Add a message to memory if it's a user or assistant message.
        
        Args:
            thread_id: The thread ID
            message_data: The message data that was added to the database
        """
        if not memory_service.is_available:
            return
            
        try:
            message_type = message_data.get('type')
            
            # Only add user and assistant messages to memory
            if message_type not in ['user', 'assistant']:
                return
            
            # Get thread context for user_id and agent_id
            context = await self._get_thread_context(thread_id)
            user_id = context.get('user_id')
            agent_id = context.get('agent_id')
            
            if not user_id:
                logger.debug(f"No user_id found for thread {thread_id}, skipping memory addition")
                return
            
            # Format message for memory
            content = message_data.get('content', '')
            if isinstance(content, dict):
                # Extract text content from structured content
                text_content = content.get('content', str(content))
            else:
                text_content = str(content)
            
            # Create memory message
            memory_message = {
                'role': message_type,
                'content': text_content
            }
            
            # Add to memory
            await memory_service.add_memory_async(
                messages=[memory_message],
                user_id=user_id,
                agent_id=agent_id,
                metadata={
                    'thread_id': thread_id,
                    'message_id': message_data.get('message_id')
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to add message to memory for thread {thread_id}: {e}")
    
    async def search_memory(self, thread_id: str, query: str, limit: int = 10) -> Optional[List[Dict[str, Any]]]:
        """
        Search memory for a thread.
        
        Args:
            thread_id: The thread ID to search memory for
            query: The search query
            limit: Maximum number of results to return
            
        Returns:
            List of memory results or None if failed
        """
        if not memory_service.is_available:
            logger.debug("Memory service not available")
            return None
            
        try:
            # Get thread context for user_id and agent_id
            context = await self._get_thread_context(thread_id)
            user_id = context.get('user_id')
            agent_id = context.get('agent_id')
            
            if not user_id:
                logger.debug(f"No user_id found for thread {thread_id}, cannot search memory")
                return None
            
            # Search memory
            results = await memory_service.search_memory_async(
                query=query,
                user_id=user_id,
                agent_id=agent_id,
                limit=limit
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to search memory for thread {thread_id}: {e}")
            return None
    
    async def _get_relevant_memories(self, thread_id: str, recent_messages: List[Dict[str, Any]], limit: int = 5) -> Optional[str]:
        """
        Get relevant memories based on recent conversation context.
        
        Args:
            thread_id: The thread ID
            recent_messages: Recent messages to use as context for memory search
            limit: Maximum number of memories to retrieve
            
        Returns:
            Formatted memory context string or None if no memories found
        """
        if not memory_service.is_available:
            return None
            
        try:
            # Extract text content from recent messages to create search query
            search_context = []
            for msg in recent_messages[-3:]:  # Use last 3 messages as context
                if msg.get('role') in ['user', 'assistant']:
                    content = msg.get('content', '')
                    if isinstance(content, dict):
                        text_content = content.get('content', str(content))
                    elif isinstance(content, list):
                        # Handle multipart content
                        text_parts = []
                        for part in content:
                            if isinstance(part, dict) and part.get('type') == 'text':
                                text_parts.append(part.get('text', ''))
                        text_content = ' '.join(text_parts) if text_parts else str(content)
                    else:
                        text_content = str(content)
                    
                    if text_content.strip():
                        search_context.append(text_content.strip()[:200])  # Limit length
            
            if not search_context:
                return None
                
            # Create search query from recent context
            search_query = ' '.join(search_context)
            
            # Search for relevant memories
            context = await self._get_thread_context(thread_id)
            user_id = context.get('user_id')
            agent_id = context.get('agent_id')
            
            if not user_id:
                return None
            
            results = await memory_service.search_memory_async(
                query=search_query,
                user_id=user_id,
                agent_id=agent_id,
                limit=limit
            )
            
            if not results:
                return None
            
            # Format memories for context
            memory_context = "--- Relevant Memories ---\n"
            memory_context += "Based on our previous conversations, here are some relevant memories:\n\n"
            
            for i, result in enumerate(results, 1):
                memory_content = result.get('memory', '').strip()
                confidence = result.get('score', 0.0)
                
                if memory_content and confidence > 0.3:  # Only include memories with reasonable confidence
                    memory_context += f"{i}. {memory_content}\n"
            
            memory_context += "\n--- End of Memories ---\n\n"
            
            logger.debug(f"Added {len(results)} memories to context for thread {thread_id}")
            return memory_context
            
        except Exception as e:
            logger.error(f"Failed to get relevant memories for thread {thread_id}: {e}")
            return None

    async def add_message(
        self,
        thread_id: str,
        type: str,
        content: Union[Dict[str, Any], List[Any], str],
        is_llm_message: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Add a message to the thread in the database.

        Args:
            thread_id: The ID of the thread to add the message to.
            type: The type of the message (e.g., 'text', 'image_url', 'tool_call', 'tool', 'user', 'assistant').
            content: The content of the message. Can be a dictionary, list, or string.
                     It will be stored as JSONB in the database.
            is_llm_message: Flag indicating if the message originated from the LLM.
                            Defaults to False (user message).
            metadata: Optional dictionary for additional message metadata.
                      Defaults to None, stored as an empty JSONB object if None.
        """
        logger.debug(f"Adding message of type '{type}' to thread {thread_id}")
        client = await self.db.client

        # Prepare data for insertion
        data_to_insert = {
            'thread_id': thread_id,
            'type': type,
            'content': content,
            'is_llm_message': is_llm_message,
            'metadata': metadata or {},
        }

        try:
            # Add returning='representation' to get the inserted row data including the id
            result = await client.table('messages').insert(data_to_insert, returning='representation').execute()
            logger.info(f"Successfully added message to thread {thread_id}")

            if result.data and len(result.data) > 0 and isinstance(result.data[0], dict) and 'message_id' in result.data[0]:
                message_data = result.data[0]
                
                # Add to memory asynchronously (don't wait for completion to avoid blocking)
                try:
                    await self._add_message_to_memory(thread_id, message_data)
                except Exception as memory_error:
                    # Log memory errors but don't fail the message addition
                    logger.warning(f"Failed to add message to memory, but message was saved to database: {memory_error}")
                
                return message_data
            else:
                logger.error(f"Insert operation failed or did not return expected data structure for thread {thread_id}. Result data: {result.data}")
                return None
        except Exception as e:
            logger.error(f"Failed to add message to thread {thread_id}: {str(e)}", exc_info=True)
            raise

    async def get_llm_messages(self, thread_id: str) -> List[Dict[str, Any]]:
        """Get all messages for a thread.

        This method uses the SQL function which handles context truncation
        by considering summary messages.

        Args:
            thread_id: The ID of the thread to get messages for.

        Returns:
            List of message objects.
        """
        logger.debug(f"Getting messages for thread {thread_id}")
        client = await self.db.client

        try:
            # result = await client.rpc('get_llm_formatted_messages', {'p_thread_id': thread_id}).execute()
            result = await client.table('messages').select('message_id, content').eq('thread_id', thread_id).eq('is_llm_message', True).order('created_at').execute()

            # Parse the returned data which might be stringified JSON
            if not result.data:
                return []

            # Return properly parsed JSON objects
            messages = []
            for item in result.data:
                if isinstance(item['content'], str):
                    try:
                        parsed_item = json.loads(item['content'])
                        parsed_item['message_id'] = item['message_id']
                        messages.append(parsed_item)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse message: {item['content']}")
                else:
                    content = item['content']
                    content['message_id'] = item['message_id']
                    messages.append(content)

            return messages

        except Exception as e:
            logger.error(f"Failed to get messages for thread {thread_id}: {str(e)}", exc_info=True)
            return []

    async def run_thread(
        self,
        thread_id: str,
        system_prompt: Dict[str, Any],
        stream: bool = True,
        temporary_message: Optional[Dict[str, Any]] = None,
        llm_model: str = "gpt-4o",
        llm_temperature: float = 0,
        llm_max_tokens: Optional[int] = None,
        processor_config: Optional[ProcessorConfig] = None,
        tool_choice: ToolChoice = "auto",
        native_max_auto_continues: int = 25,
        max_xml_tool_calls: int = 0,
        include_xml_examples: bool = False,
        enable_thinking: Optional[bool] = False,
        reasoning_effort: Optional[str] = 'low',
        enable_context_manager: bool = True,
        generation: Optional[StatefulGenerationClient] = None,
    ) -> Union[Dict[str, Any], AsyncGenerator]:
        """Run a conversation thread with LLM integration and tool execution.

        Args:
            thread_id: The ID of the thread to run
            system_prompt: System message to set the assistant's behavior
            stream: Use streaming API for the LLM response
            temporary_message: Optional temporary user message for this run only
            llm_model: The name of the LLM model to use
            llm_temperature: Temperature parameter for response randomness (0-1)
            llm_max_tokens: Maximum tokens in the LLM response
            processor_config: Configuration for the response processor
            tool_choice: Tool choice preference ("auto", "required", "none")
            native_max_auto_continues: Maximum number of automatic continuations when
                                      finish_reason="tool_calls" (0 disables auto-continue)
            max_xml_tool_calls: Maximum number of XML tool calls to allow (0 = no limit)
            include_xml_examples: Whether to include XML tool examples in the system prompt
            enable_thinking: Whether to enable thinking before making a decision
            reasoning_effort: The effort level for reasoning
            enable_context_manager: Whether to enable automatic context summarization.

        Returns:
            An async generator yielding response chunks or error dict
        """

        logger.info(f"Starting thread execution for thread {thread_id}")
        logger.info(f"Using model: {llm_model}")
        # Log parameters
        logger.info(f"Parameters: model={llm_model}, temperature={llm_temperature}, max_tokens={llm_max_tokens}")
        logger.info(f"Auto-continue: max={native_max_auto_continues}, XML tool limit={max_xml_tool_calls}")

        # Log model info
        logger.info(f"🤖 Thread {thread_id}: Using model {llm_model}")

        # Apply max_xml_tool_calls if specified and not already set in config
        if max_xml_tool_calls > 0 and not processor_config.max_xml_tool_calls:
            processor_config.max_xml_tool_calls = max_xml_tool_calls

        # Create a working copy of the system prompt to potentially modify
        working_system_prompt = system_prompt.copy()

        # Add XML examples to system prompt if requested, do this only ONCE before the loop
        if include_xml_examples and processor_config.xml_tool_calling:
            xml_examples = self.tool_registry.get_xml_examples()
            if xml_examples:
                examples_content = """
--- XML TOOL CALLING ---

In this environment you have access to a set of tools you can use to answer the user's question. The tools are specified in XML format.
Format your tool calls using the specified XML tags. Place parameters marked as 'attribute' within the opening tag (e.g., `<tag attribute='value'>`). Place parameters marked as 'content' between the opening and closing tags. Place parameters marked as 'element' within their own child tags (e.g., `<tag><element>value</element></tag>`). Refer to the examples provided below for the exact structure of each tool.
String and scalar parameters should be specified as attributes, while content goes between tags.
Note that spaces for string values are not stripped. The output is parsed with regular expressions.

Here are the XML tools available with examples:
"""
                for tag_name, example in xml_examples.items():
                    examples_content += f"<{tag_name}> Example: {example}\\n"

                # # Save examples content to a file
                # try:
                #     with open('xml_examples.txt', 'w') as f:
                #         f.write(examples_content)
                #     logger.debug("Saved XML examples to xml_examples.txt")
                # except Exception as e:
                #     logger.error(f"Failed to save XML examples to file: {e}")

                system_content = working_system_prompt.get('content')

                if isinstance(system_content, str):
                    working_system_prompt['content'] += examples_content
                    logger.debug("Appended XML examples to string system prompt content.")
                elif isinstance(system_content, list):
                    appended = False
                    for item in working_system_prompt['content']: # Modify the copy
                        if isinstance(item, dict) and item.get('type') == 'text' and 'text' in item:
                            item['text'] += examples_content
                            logger.debug("Appended XML examples to the first text block in list system prompt content.")
                            appended = True
                            break
                    if not appended:
                        logger.warning("System prompt content is a list but no text block found to append XML examples.")
                else:
                    logger.warning(f"System prompt content is of unexpected type ({type(system_content)}), cannot add XML examples.")
        # Control whether we need to auto-continue due to tool_calls finish reason
        auto_continue = True
        auto_continue_count = 0

        # Define inner function to handle a single run
        async def _run_once(temp_msg=None):
            try:
                # Ensure processor_config is available in this scope
                nonlocal processor_config
                # Note: processor_config is now guaranteed to exist due to check above

                # 1. Get messages from thread for LLM call
                messages = await self.get_llm_messages(thread_id)

                # 1.5. Add relevant memories to context
                memory_context = await self._get_relevant_memories(thread_id, messages, limit=5)
                if memory_context:
                    # Add memory context as a system-style message before recent messages
                    memory_message = {
                        "role": "system",
                        "content": memory_context
                    }
                    # Insert memory context before the last few messages to provide relevant context
                    if len(messages) > 2:
                        messages.insert(-2, memory_message)
                    else:
                        messages.insert(0, memory_message)
                    logger.debug(f"Added memory context to thread {thread_id}")

                # 2. Check token count before proceeding
                token_count = 0
                try:
                    # Use the potentially modified working_system_prompt for token counting
                    token_count = token_counter(model=llm_model, messages=[working_system_prompt] + messages)
                    token_threshold = self.context_manager.token_threshold
                    logger.info(f"Thread {thread_id} token count: {token_count}/{token_threshold} ({(token_count/token_threshold)*100:.1f}%)")

                    # if token_count >= token_threshold and enable_context_manager:
                    #     logger.info(f"Thread token count ({token_count}) exceeds threshold ({token_threshold}), summarizing...")
                    #     summarized = await self.context_manager.check_and_summarize_if_needed(
                    #         thread_id=thread_id,
                    #         add_message_callback=self.add_message,
                    #         model=llm_model,
                    #         force=True
                    #     )
                    #     if summarized:
                    #         logger.info("Summarization complete, fetching updated messages with summary")
                    #         messages = await self.get_llm_messages(thread_id)
                    #         # Recount tokens after summarization, using the modified prompt
                    #         new_token_count = token_counter(model=llm_model, messages=[working_system_prompt] + messages)
                    #         logger.info(f"After summarization: token count reduced from {token_count} to {new_token_count}")
                    #     else:
                    #         logger.warning("Summarization failed or wasn't needed - proceeding with original messages")
                    # elif not enable_context_manager:
                    #     logger.info("Automatic summarization disabled. Skipping token count check and summarization.")

                except Exception as e:
                    logger.error(f"Error counting tokens or summarizing: {str(e)}")

                # 3. Prepare messages for LLM call + add temporary message if it exists
                # Use the working_system_prompt which may contain the XML examples
                prepared_messages = [working_system_prompt]

                # Find the last user message index
                last_user_index = -1
                for i, msg in enumerate(messages):
                    if msg.get('role') == 'user':
                        last_user_index = i

                # Insert temporary message before the last user message if it exists
                if temp_msg and last_user_index >= 0:
                    prepared_messages.extend(messages[:last_user_index])
                    prepared_messages.append(temp_msg)
                    prepared_messages.extend(messages[last_user_index:])
                    logger.debug("Added temporary message before the last user message")
                else:
                    # If no user message or no temporary message, just add all messages
                    prepared_messages.extend(messages)
                    if temp_msg:
                        prepared_messages.append(temp_msg)
                        logger.debug("Added temporary message to the end of prepared messages")

                # 4. Prepare tools for LLM call
                openapi_tool_schemas = None
                if processor_config.native_tool_calling:
                    openapi_tool_schemas = self.tool_registry.get_openapi_schemas()
                    logger.debug(f"Retrieved {len(openapi_tool_schemas) if openapi_tool_schemas else 0} OpenAPI tool schemas")

                prepared_messages = self._compress_messages(prepared_messages, llm_model)

                # 5. Make LLM API call
                logger.debug("Making LLM API call")
                try:
                    if generation:
                        generation.update(
                            input=prepared_messages,
                            start_time=datetime.datetime.now(datetime.timezone.utc),
                            model=llm_model,
                            model_parameters={
                              "max_tokens": llm_max_tokens,
                              "temperature": llm_temperature,
                              "enable_thinking": enable_thinking,
                              "reasoning_effort": reasoning_effort,
                              "tool_choice": tool_choice,
                              "tools": openapi_tool_schemas,
                            }
                        )
                    llm_response = await make_llm_api_call(
                        prepared_messages, # Pass the potentially modified messages
                        llm_model,
                        temperature=llm_temperature,
                        max_tokens=llm_max_tokens,
                        tools=openapi_tool_schemas,
                        tool_choice=tool_choice if processor_config.native_tool_calling else None,
                        stream=stream,
                        enable_thinking=enable_thinking,
                        reasoning_effort=reasoning_effort
                    )
                    logger.debug("Successfully received raw LLM API response stream/object")

                except Exception as e:
                    logger.error(f"Failed to make LLM API call: {str(e)}", exc_info=True)
                    raise

                # 6. Process LLM response using the ResponseProcessor
                if stream:
                    logger.debug("Processing streaming response")
                    response_generator = self.response_processor.process_streaming_response(
                        llm_response=llm_response,
                        thread_id=thread_id,
                        config=processor_config,
                        prompt_messages=prepared_messages,
                        llm_model=llm_model,
                    )

                    return response_generator
                else:
                    logger.debug("Processing non-streaming response")
                    # Pass through the response generator without try/except to let errors propagate up
                    response_generator = self.response_processor.process_non_streaming_response(
                        llm_response=llm_response,
                        thread_id=thread_id,
                        config=processor_config,
                        prompt_messages=prepared_messages,
                        llm_model=llm_model,
                    )
                    return response_generator # Return the generator

            except Exception as e:
                logger.error(f"Error in run_thread: {str(e)}", exc_info=True)
                # Return the error as a dict to be handled by the caller
                return {
                    "type": "status",
                    "status": "error",
                    "message": str(e)
                }

        # Define a wrapper generator that handles auto-continue logic
        async def auto_continue_wrapper():
            nonlocal auto_continue, auto_continue_count

            while auto_continue and (native_max_auto_continues == 0 or auto_continue_count < native_max_auto_continues):
                # Reset auto_continue for this iteration
                auto_continue = False

                # Run the thread once, passing the potentially modified system prompt
                # Pass temp_msg only on the first iteration
                try:
                    response_gen = await _run_once(temporary_message if auto_continue_count == 0 else None)

                    # Handle error responses
                    if isinstance(response_gen, dict) and "status" in response_gen and response_gen["status"] == "error":
                        logger.error(f"Error in auto_continue_wrapper: {response_gen.get('message', 'Unknown error')}")
                        yield response_gen
                        return  # Exit the generator on error

                    # Process each chunk
                    try:
                        async for chunk in response_gen:
                            # Check if this is a finish reason chunk with tool_calls or xml_tool_limit_reached
                            if chunk.get('type') == 'finish':
                                if chunk.get('finish_reason') == 'tool_calls':
                                    # Only auto-continue if enabled (max > 0)
                                    if native_max_auto_continues > 0:
                                        logger.info(f"Detected finish_reason='tool_calls', auto-continuing ({auto_continue_count + 1}/{native_max_auto_continues})")
                                        auto_continue = True
                                        auto_continue_count += 1
                                        # Don't yield the finish chunk to avoid confusing the client
                                        continue
                                elif chunk.get('finish_reason') == 'xml_tool_limit_reached':
                                    # Don't auto-continue if XML tool limit was reached
                                    logger.info(f"Detected finish_reason='xml_tool_limit_reached', stopping auto-continue")
                                    auto_continue = False
                                    # Still yield the chunk to inform the client

                            # Otherwise just yield the chunk normally
                            yield chunk

                        # If not auto-continuing, we're done
                        if not auto_continue:
                            break
                    except Exception as e:
                        # If there's an exception, log it, yield an error status, and stop execution
                        logger.error(f"Error in auto_continue_wrapper generator: {str(e)}", exc_info=True)
                        yield {
                            "type": "status",
                            "status": "error",
                            "message": f"Error in thread processing: {str(e)}"
                        }
                        return  # Exit the generator on any error
                except Exception as outer_e:
                    # Catch exceptions from _run_once itself
                    logger.error(f"Error executing thread: {str(outer_e)}", exc_info=True)
                    yield {
                        "type": "status",
                        "status": "error",
                        "message": f"Error executing thread: {str(outer_e)}"
                    }
                    return  # Exit immediately on exception from _run_once

            # If we've reached the max auto-continues, log a warning
            if auto_continue and auto_continue_count >= native_max_auto_continues:
                logger.warning(f"Reached maximum auto-continue limit ({native_max_auto_continues}), stopping.")
                yield {
                    "type": "content",
                    "content": f"\n[Agent reached maximum auto-continue limit of {native_max_auto_continues}]"
                }

        # If auto-continue is disabled (max=0), just run once
        if native_max_auto_continues == 0:
            logger.info("Auto-continue is disabled (native_max_auto_continues=0)")
            # Pass the potentially modified system prompt and temp message
            return await _run_once(temporary_message)

        # Otherwise return the auto-continue wrapper generator
        return auto_continue_wrapper()