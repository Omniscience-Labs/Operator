"""
Memory service using mem0 for conversation memory management.

This service provides memory functionality for the agent platform:
- Automatic memory addition for user and assistant messages
- Memory search functionality
- Support for both default operators (user_id only) and custom agents (user_id + agent_id)
- Async/sync client selection based on context
- Production-ready error handling and logging
"""

import os
import json
from typing import List, Dict, Any, Optional, Union
from utils.logger import logger
from utils.config import config

try:
    from mem0 import MemoryClient, AsyncMemoryClient
    MEM0_AVAILABLE = True
except ImportError:
    logger.warning("mem0 not available - memory functionality will be disabled")
    MEM0_AVAILABLE = False
    MemoryClient = None
    AsyncMemoryClient = None


class MemoryService:
    """
    Service for managing conversation memory using mem0.
    
    Handles both sync and async operations with automatic client selection.
    Supports default operators (user_id only) and custom agents (user_id + agent_id).
    """
    
    def __init__(self):
        self._sync_client: Optional[MemoryClient] = None
        self._async_client: Optional[AsyncMemoryClient] = None
        self._initialized = False
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize mem0 clients if available."""
        if not MEM0_AVAILABLE:
            logger.warning("mem0 not available - memory service disabled")
            return
            
        try:
            # Get API key from environment
            api_key = os.environ.get("MEM0_API_KEY")
            if not api_key:
                logger.warning("MEM0_API_KEY not set - memory service disabled")
                return
            
            # Initialize clients
            self._sync_client = MemoryClient()
            self._async_client = AsyncMemoryClient()
            self._initialized = True
            logger.info("Memory service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize memory service: {e}")
            self._initialized = False
    
    @property
    def is_available(self) -> bool:
        """Check if memory service is available."""
        return MEM0_AVAILABLE and self._initialized
    
    def _format_messages_for_memory(self, messages: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """
        Format messages for mem0 consumption.
        
        Args:
            messages: List of message dictionaries
            
        Returns:
            List of formatted messages for mem0
        """
        formatted_messages = []
        
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            # Handle different content formats
            if isinstance(content, dict):
                # Extract text from structured content
                if 'content' in content:
                    text_content = content['content']
                elif isinstance(content, str):
                    text_content = content
                else:
                    text_content = json.dumps(content)
            elif isinstance(content, list):
                # Handle multipart content (text + images)
                text_parts = []
                for part in content:
                    if isinstance(part, dict) and part.get('type') == 'text':
                        text_parts.append(part.get('text', ''))
                text_content = ' '.join(text_parts) if text_parts else json.dumps(content)
            else:
                text_content = str(content)
            
            # Only add non-empty messages
            if text_content.strip():
                formatted_messages.append({
                    "role": role,
                    "content": text_content.strip()
                })
        
        return formatted_messages
    
    def _build_memory_params(self, user_id: str, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Build memory parameters for mem0 calls.
        
        Args:
            user_id: User ID for the memory
            agent_id: Optional agent ID for custom agents
            
        Returns:
            Dictionary of parameters for mem0 calls
        """
        # Create a combined memory identifier to ensure complete isolation
        # For managed agents, this ensures each user has their own memory even with same agent_id
        # 
        # Examples:
        # - Default operator: user_123 -> memory scope: "user_123"
        # - Custom agent: user_123 + agent_456 -> memory scope: "user_123:agent_456" 
        # - Managed agent: user_123 + managed_agent_789 -> memory scope: "user_123:managed_agent_789"
        # - Same managed agent, different user: user_999 + managed_agent_789 -> memory scope: "user_999:managed_agent_789"
        #
        # This ensures complete memory isolation between users, even for the same managed agent
        if agent_id:
            # Use combined user_id:agent_id for complete isolation
            memory_id = f"{user_id}:{agent_id}"
            params = {"user_id": memory_id}
        else:
            # Default operator uses just user_id
            params = {"user_id": user_id}
            
        return params
    
    async def add_memory_async(
        self,
        messages: List[Dict[str, Any]],
        user_id: str,
        agent_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Add memory asynchronously.
        
        Args:
            messages: List of messages to add to memory
            user_id: User ID for the memory
            agent_id: Optional agent ID for custom agents
            metadata: Optional metadata for the memory
            
        Returns:
            Memory response or None if failed
        """
        if not self.is_available:
            logger.debug("Memory service not available - skipping memory addition")
            return None
            
        try:
            formatted_messages = self._format_messages_for_memory(messages)
            if not formatted_messages:
                logger.debug("No valid messages to add to memory")
                return None
            
            params = self._build_memory_params(user_id, agent_id)
            if metadata:
                params["metadata"] = metadata
            
            logger.debug(f"Adding memory for user {user_id}" + (f" with agent {agent_id}" if agent_id else ""))
            
            response = await self._async_client.add(messages=formatted_messages, **params)
            
            logger.info(f"Successfully added memory for user {user_id}" + (f" with agent {agent_id}" if agent_id else ""))
            return response
            
        except Exception as e:
            logger.error(f"Failed to add memory for user {user_id}: {e}")
            return None
    
    def add_memory_sync(
        self,
        messages: List[Dict[str, Any]],
        user_id: str,
        agent_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Add memory synchronously.
        
        Args:
            messages: List of messages to add to memory
            user_id: User ID for the memory
            agent_id: Optional agent ID for custom agents
            metadata: Optional metadata for the memory
            
        Returns:
            Memory response or None if failed
        """
        if not self.is_available:
            logger.debug("Memory service not available - skipping memory addition")
            return None
            
        try:
            formatted_messages = self._format_messages_for_memory(messages)
            if not formatted_messages:
                logger.debug("No valid messages to add to memory")
                return None
            
            params = self._build_memory_params(user_id, agent_id)
            if metadata:
                params["metadata"] = metadata
            
            logger.debug(f"Adding memory for user {user_id}" + (f" with agent {agent_id}" if agent_id else ""))
            
            response = self._sync_client.add(messages=formatted_messages, **params)
            
            logger.info(f"Successfully added memory for user {user_id}" + (f" with agent {agent_id}" if agent_id else ""))
            return response
            
        except Exception as e:
            logger.error(f"Failed to add memory for user {user_id}: {e}")
            return None
    
    async def search_memory_async(
        self,
        query: str,
        user_id: str,
        agent_id: Optional[str] = None,
        limit: int = 10
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Search memory asynchronously.
        
        Args:
            query: Search query
            user_id: User ID for the memory search
            agent_id: Optional agent ID for custom agents
            limit: Maximum number of results to return
            
        Returns:
            List of memory results or None if failed
        """
        if not self.is_available:
            logger.debug("Memory service not available - skipping memory search")
            return None
            
        try:
            params = self._build_memory_params(user_id, agent_id)
            params["limit"] = limit
            
            logger.debug(f"Searching memory for user {user_id}" + (f" with agent {agent_id}" if agent_id else "") + f": {query}")
            
            response = await self._async_client.search(query=query, **params)
            
            logger.info(f"Memory search completed for user {user_id}" + (f" with agent {agent_id}" if agent_id else ""))
            return response
            
        except Exception as e:
            logger.error(f"Failed to search memory for user {user_id}: {e}")
            return None
    
    def search_memory_sync(
        self,
        query: str,
        user_id: str,
        agent_id: Optional[str] = None,
        limit: int = 10
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Search memory synchronously.
        
        Args:
            query: Search query
            user_id: User ID for the memory search
            agent_id: Optional agent ID for custom agents
            limit: Maximum number of results to return
            
        Returns:
            List of memory results or None if failed
        """
        if not self.is_available:
            logger.debug("Memory service not available - skipping memory search")
            return None
            
        try:
            params = self._build_memory_params(user_id, agent_id)
            params["limit"] = limit
            
            logger.debug(f"Searching memory for user {user_id}" + (f" with agent {agent_id}" if agent_id else "") + f": {query}")
            
            response = self._sync_client.search(query=query, **params)
            
            logger.info(f"Memory search completed for user {user_id}" + (f" with agent {agent_id}" if agent_id else ""))
            return response
            
        except Exception as e:
            logger.error(f"Failed to search memory for user {user_id}: {e}")
            return None


# Global memory service instance
memory_service = MemoryService()