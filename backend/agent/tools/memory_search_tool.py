"""
Memory search tool for agents using mem0.

This tool allows agents to search their conversation memory to recall
previous conversations, preferences, and context.
"""

from typing import List, Dict, Any, Optional
from agentpress.tool import Tool, SchemaType, ToolSchema
from agentpress.thread_manager import ThreadManager
from utils.logger import logger


class MemorySearchTool(Tool):
    """
    Tool for searching conversation memory using mem0.
    
    Allows agents to search through their conversation history and memory
    to recall previous interactions, user preferences, and context.
    """
    
    def __init__(self, thread_manager: ThreadManager):
        """
        Initialize the memory search tool.
        
        Args:
            thread_manager: ThreadManager instance for memory operations
        """
        super().__init__()
        self.thread_manager = thread_manager

    def get_schemas(self) -> Dict[str, List[ToolSchema]]:
        """Get the OpenAPI schemas for memory search operations."""
        return {
            "search_memory": [
                ToolSchema(
                    schema_type=SchemaType.OPENAPI,
                    schema={
                        "type": "function",
                        "function": {
                            "name": "search_memory",
                            "description": "Search conversation memory to recall previous interactions, user preferences, and context. Use this when you need to remember something specific from past conversations, find user preferences, or when the user asks about something you might have discussed before. Note: Relevant memories are automatically included in context, but use this tool for specific memory searches.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "query": {
                                        "type": "string",
                                        "description": "The search query to find relevant memories. Be specific about what you're looking for (e.g., 'user preferences about travel', 'previous discussion about project requirements', 'user's favorite food')."
                                    },
                                    "limit": {
                                        "type": "integer",
                                        "description": "Maximum number of memory results to return. Default is 5.",
                                        "default": 5,
                                        "minimum": 1,
                                        "maximum": 20
                                    }
                                },
                                "required": ["query"]
                            }
                        }
                    }
                )
            ]
        }

    async def search_memory(self, thread_id: str, query: str, limit: int = 5) -> Dict[str, Any]:
        """
        Search conversation memory.
        
        Args:
            thread_id: The current thread ID
            query: The search query
            limit: Maximum number of results to return
            
        Returns:
            Dictionary containing search results and metadata
        """
        try:
            logger.info(f"Searching memory for thread {thread_id} with query: '{query}'")
            
            # Validate limit
            limit = max(1, min(limit, 20))
            
            # Search memory using thread manager
            results = await self.thread_manager.search_memory(thread_id, query, limit)
            
            if not results:
                return {
                    "success": True,
                    "message": "No relevant memories found for your query. This could mean we haven't discussed this topic before, or the memory service is not available.",
                    "query": query,
                    "results": [],
                    "count": 0
                }
            
            # Format results for the agent
            formatted_results = []
            for result in results:
                # Extract relevant information from memory result
                memory_content = result.get('memory', '')
                confidence = result.get('score', 0.0)
                metadata = result.get('metadata', {})
                
                formatted_results.append({
                    "content": memory_content,
                    "confidence": confidence,
                    "metadata": metadata
                })
            
            return {
                "success": True,
                "message": f"Found {len(formatted_results)} relevant memories.",
                "query": query,
                "results": formatted_results,
                "count": len(formatted_results)
            }
            
        except Exception as e:
            logger.error(f"Error searching memory: {e}")
            return {
                "success": False,
                "message": f"Failed to search memory: {str(e)}",
                "query": query,
                "results": [],
                "count": 0
            }