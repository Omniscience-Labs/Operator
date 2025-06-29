import os
import asyncio
from typing import List, Dict, Any, Optional
from utils.logger import logger

try:
    from mem0 import AsyncMemoryClient
    MEM0_AVAILABLE = True
except ImportError:
    logger.warning("mem0 package not installed. Memory functionality will be disabled.")
    MEM0_AVAILABLE = False
    AsyncMemoryClient = None

class MemoryService:
    """Service for managing conversation memories using mem0."""
    
    def __init__(self):
        self.client = None
        self._initialized = False
        
    async def initialize(self):
        """Initialize the memory client if available."""
        if not MEM0_AVAILABLE:
            logger.warning("mem0 not available, memory service disabled")
            return
            
        if self._initialized:
            return
            
        try:
            # Check if API key is set
            api_key = os.environ.get("MEM0_API_KEY")
            if not api_key:
                logger.warning("MEM0_API_KEY not set, memory service disabled")
                return
                
            self.client = AsyncMemoryClient()
            self._initialized = True
            logger.info("Memory service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize memory service: {str(e)}")
            
    async def add_memory(
        self, 
        messages: List[Dict[str, Any]], 
        user_id: str, 
        agent_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Add conversation messages to memory.
        
        Args:
            messages: List of messages in OpenAI format [{"role": "user/assistant", "content": "..."}]
            user_id: User ID for default operator messages
            agent_id: Agent ID for custom agents (optional)
        
        Returns:
            Response from mem0 or None if memory service unavailable
        """
        if not self._initialized or not self.client:
            return None
            
        try:
            if agent_id:
                # For custom agents, include both user_id and agent_id
                response = await self.client.add(
                    messages=messages, 
                    user_id=user_id, 
                    agent_id=agent_id
                )
            else:
                # For default operator, just use user_id
                response = await self.client.add(
                    messages=messages, 
                    user_id=user_id
                )
            
            logger.debug(f"Added memory for user {user_id}, agent {agent_id}: {len(messages)} messages")
            return response
        except Exception as e:
            logger.error(f"Failed to add memory: {str(e)}")
            return None
    
    async def search_memory(
        self, 
        query: str, 
        user_id: str, 
        agent_id: Optional[str] = None,
        limit: int = 5
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Search memories for relevant context.
        
        Args:
            query: Search query
            user_id: User ID for default operator messages
            agent_id: Agent ID for custom agents (optional)
            limit: Maximum number of memories to return
        
        Returns:
            List of relevant memories or None if memory service unavailable
        """
        if not self._initialized or not self.client:
            return None
            
        try:
            if agent_id:
                # For custom agents, include both user_id and agent_id
                memories = await self.client.search(
                    query=query, 
                    user_id=user_id, 
                    agent_id=agent_id,
                    limit=limit
                )
            else:
                # For default operator, just use user_id
                memories = await self.client.search(
                    query=query, 
                    user_id=user_id,
                    limit=limit
                )
            
            logger.debug(f"Found {len(memories) if memories else 0} memories for query: {query[:50]}...")
            return memories
        except Exception as e:
            logger.error(f"Failed to search memory: {str(e)}")
            return None

# Global memory service instance
memory_service = MemoryService()

async def get_memory_service() -> MemoryService:
    """Get the global memory service instance."""
    if not memory_service._initialized:
        await memory_service.initialize()
    return memory_service