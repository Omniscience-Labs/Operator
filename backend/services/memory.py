"""
Memory service for AgentPress using Mem0.

This module provides memory functionality including:
- Adding memories from conversations
- Searching relevant memories for context
- Support for both user-specific and agent-specific memories
"""

import os
import json
from typing import List, Dict, Any, Optional, Union
from utils.logger import logger
from utils.config import config

# Only import Mem0 if available and configured
MEM0_AVAILABLE = False
try:
    from mem0 import AsyncMemoryClient
    MEM0_AVAILABLE = True
except ImportError:
    logger.warning("Mem0 not available. Memory features will be disabled.")
    AsyncMemoryClient = None

class MemoryService:
    """Service for managing conversation memories using Mem0."""
    
    def __init__(self):
        """Initialize the memory service."""
        self.client = None
        self.enabled = False
        self._initialize()
    
    def _initialize(self):
        """Initialize Mem0 client if available and configured."""
        if not MEM0_AVAILABLE:
            logger.warning("Mem0 not available - memory features disabled")
            return
            
        api_key = os.environ.get("MEM0_API_KEY") or getattr(config, "MEM0_API_KEY", None)
        if not api_key:
            logger.warning("MEM0_API_KEY not configured - memory features disabled")
            return
            
        try:
            # Set the API key in environment if it was in config
            if not os.environ.get("MEM0_API_KEY"):
                os.environ["MEM0_API_KEY"] = api_key
            
            self.client = AsyncMemoryClient()
            self.enabled = True
            logger.info("Memory service initialized successfully with Mem0")
        except Exception as e:
            logger.error(f"Failed to initialize Mem0 client: {str(e)}")
            self.enabled = False
    
    async def add_memory(
        self, 
        messages: List[Dict[str, str]], 
        user_id: str, 
        agent_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Add memories from conversation messages.
        
        Args:
            messages: List of messages in format [{"role": "user/assistant", "content": "..."}]
            user_id: User identifier
            agent_id: Optional agent identifier for custom agents
            metadata: Optional additional metadata to store with the memory
            
        Returns:
            Response from Mem0 or None if disabled/failed
        """
        if not self.enabled:
            return None
            
        try:
            # Prepare memory data
            memory_data = {"user_id": user_id}
            
            # Add agent_id for custom agents only
            if agent_id and agent_id != "default":
                memory_data["agent_id"] = agent_id
            
            # Add metadata if provided
            if metadata:
                memory_data.update(metadata)
            
            logger.debug(f"Adding memory for user {user_id}" + (f" with agent {agent_id}" if agent_id else ""))
            
            response = await self.client.add(messages, **memory_data)
            
            logger.info(f"Successfully added memory for user {user_id}")
            return response
            
        except Exception as e:
            logger.error(f"Failed to add memory for user {user_id}: {str(e)}")
            return None
    
    async def search_memory(
        self, 
        query: str, 
        user_id: str, 
        agent_id: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant memories.
        
        Args:
            query: Search query
            user_id: User identifier
            agent_id: Optional agent identifier for custom agents
            limit: Maximum number of memories to return
            
        Returns:
            List of relevant memories or empty list if disabled/failed
        """
        if not self.enabled:
            return []
            
        try:
            # Prepare search parameters
            search_params = {"user_id": user_id, "limit": limit}
            
            # Add agent_id for custom agents only
            if agent_id and agent_id != "default":
                search_params["agent_id"] = agent_id
            
            logger.debug(f"Searching memories for user {user_id} with query: '{query[:100]}...'" + 
                        (f" (agent: {agent_id})" if agent_id else ""))
            
            response = await self.client.search(query, **search_params)
            
            # Extract memories from response
            memories = []
            if isinstance(response, dict) and "results" in response:
                memories = response["results"]
            elif isinstance(response, list):
                memories = response
            
            logger.info(f"Found {len(memories)} relevant memories for user {user_id}")
            return memories
            
        except Exception as e:
            logger.error(f"Failed to search memories for user {user_id}: {str(e)}")
            return []
    
    def format_memories_for_context(self, memories: List[Dict[str, Any]]) -> str:
        """
        Format memories for inclusion in LLM context.
        
        Args:
            memories: List of memory objects from search
            
        Returns:
            Formatted string for LLM context
        """
        if not memories:
            return ""
        
        formatted_memories = []
        for memory in memories:
            # Extract memory text/content
            memory_text = ""
            if isinstance(memory, dict):
                memory_text = memory.get("memory", memory.get("text", memory.get("content", str(memory))))
            else:
                memory_text = str(memory)
            
            if memory_text:
                formatted_memories.append(f"- {memory_text}")
        
        if not formatted_memories:
            return ""
        
        context = "## Relevant Memories\n\n"
        context += "\n".join(formatted_memories)
        context += "\n\n---\n\n"
        
        return context

# Global memory service instance
memory_service = MemoryService()