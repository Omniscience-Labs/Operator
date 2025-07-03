"""
Knowledge search tool for searching across configured knowledge bases using LlamaCloud.

This tool allows agents to search through uploaded documents and knowledge bases
that have been indexed in LlamaCloud. It dynamically configures itself based on
the agent's enabled knowledge indexes.
"""

import os
import json
from typing import Optional, Dict, Any, List
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from agentpress.thread_manager import ThreadManager
from utils.logger import logger

# Try to import LlamaCloud, but don't fail if not available
try:
    from llama_cloud import LlamaCloud
    LLAMACLOUD_AVAILABLE = True
except ImportError:
    logger.warning("llama_cloud package not installed. Knowledge tool will have limited functionality.")
    LLAMACLOUD_AVAILABLE = False
    LlamaCloud = None


class SandboxKnowledgeTool(Tool):
    """Tool for searching knowledge bases indexed in LlamaCloud."""

    def __init__(self, knowledge_indexes: List[Dict[str, Any]], thread_manager: ThreadManager):
        """Initialize the knowledge tool with configured indexes.
        
        Args:
            knowledge_indexes: List of knowledge index configurations
            thread_manager: Thread manager instance
        """
        super().__init__()
        self.knowledge_indexes = knowledge_indexes
        self.thread_manager = thread_manager
        
        # Initialize LlamaCloud client
        api_key = os.getenv("LLAMACLOUD_API_KEY")
        if not api_key:
            logger.warning("LLAMACLOUD_API_KEY not set, knowledge tool will not function")
            self.client = None
        elif not LLAMACLOUD_AVAILABLE:
            logger.warning("llama_cloud package not installed, knowledge tool will not function")
            self.client = None
        else:
            self.client = LlamaCloud(api_key=api_key)
        
        # Build dynamic description based on available indexes
        self._build_dynamic_description()

    def _build_dynamic_description(self):
        """Build a dynamic description based on configured knowledge indexes."""
        if not self.knowledge_indexes:
            self.dynamic_description = "No knowledge bases configured."
            return
        
        descriptions = []
        for index in self.knowledge_indexes:
            descriptions.append(f"- {index['name']}: {index['description']}")
        
        self.dynamic_description = (
            "Search through the following knowledge bases:\n" + 
            "\n".join(descriptions)
        )

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "search_knowledge",
            "description": "Search through configured knowledge bases to find relevant information. The available knowledge bases and their contents will be described in the tool description.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant information"
                    },
                    "knowledge_base": {
                        "type": "string",
                        "description": "Optional: Specific knowledge base name to search in. If not provided, searches all available knowledge bases."
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Number of results to return (default: 5, max: 20)",
                        "minimum": 1,
                        "maximum": 20,
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        }
    })
    @xml_schema(
        tag_name="search-knowledge",
        mappings=[
            {"param_name": "query", "node_type": "element", "path": "query", "required": True},
            {"param_name": "knowledge_base", "node_type": "element", "path": "knowledge_base", "required": False},
            {"param_name": "num_results", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="search_knowledge">
        <parameter name="query">What is the deployment process?</parameter>
        <parameter name="knowledge_base">Engineering Documentation</parameter>
        <parameter name="num_results">5</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def search_knowledge(
        self,
        query: str,
        knowledge_base: Optional[str] = None,
        num_results: int = 5
    ) -> ToolResult:
        """Search through knowledge bases for relevant information.
        
        Args:
            query: The search query
            knowledge_base: Optional specific knowledge base to search
            num_results: Number of results to return
            
        Returns:
            ToolResult with search results or error
        """
        try:
            if not self.client:
                return self.fail_response("Knowledge search is not configured. Please set LLAMACLOUD_API_KEY.")
            
            if not self.knowledge_indexes:
                return self.fail_response("No knowledge bases are configured for this agent.")
            
            # Validate num_results
            num_results = min(max(num_results, 1), 20)
            
            # Determine which indexes to search
            indexes_to_search = []
            
            if knowledge_base:
                # Search specific knowledge base
                for index in self.knowledge_indexes:
                    if index['name'].lower() == knowledge_base.lower():
                        indexes_to_search.append(index)
                        break
                
                if not indexes_to_search:
                    available_bases = [idx['name'] for idx in self.knowledge_indexes]
                    return self.fail_response(
                        f"Knowledge base '{knowledge_base}' not found. "
                        f"Available bases: {', '.join(available_bases)}"
                    )
            else:
                # Search all knowledge bases
                indexes_to_search = self.knowledge_indexes
            
            # Perform searches
            all_results = []
            errors = []
            
            for index in indexes_to_search:
                try:
                    logger.info(f"Searching knowledge base '{index['name']}' with query: {query}")
                    
                    # Use LlamaCloud retrieval API
                    response = await self._search_index(
                        index_key=index['llamacloud_index_key'],
                        query=query,
                        top_k=num_results
                    )
                    
                    if response.get('success'):
                        results = response.get('results', [])
                        for result in results:
                            all_results.append({
                                'knowledge_base': index['name'],
                                'content': result.get('text', ''),
                                'score': result.get('score', 0),
                                'metadata': result.get('metadata', {})
                            })
                    else:
                        errors.append(f"{index['name']}: {response.get('error', 'Unknown error')}")
                        
                except Exception as e:
                    logger.error(f"Error searching index {index['name']}: {str(e)}")
                    errors.append(f"{index['name']}: {str(e)}")
            
            # Sort results by score
            all_results.sort(key=lambda x: x['score'], reverse=True)
            
            # Limit total results
            all_results = all_results[:num_results]
            
            if not all_results and errors:
                return self.fail_response(f"Search failed: {'; '.join(errors)}")
            
            # Format results
            formatted_results = []
            for i, result in enumerate(all_results, 1):
                formatted_results.append(
                    f"{i}. [{result['knowledge_base']}] (Score: {result['score']:.2f})\n"
                    f"{result['content']}\n"
                )
            
            output = f"Found {len(all_results)} results for '{query}':\n\n" + "\n---\n".join(formatted_results)
            
            if errors:
                output += f"\n\nWarnings: {'; '.join(errors)}"
            
            return self.success_response(output)
            
        except Exception as e:
            logger.error(f"Error in knowledge search: {str(e)}", exc_info=True)
            return self.fail_response(f"Knowledge search error: {str(e)}")

    async def _search_index(self, index_key: str, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Search a specific LlamaCloud index.
        
        Args:
            index_key: The LlamaCloud index key
            query: Search query
            top_k: Number of results to retrieve
            
        Returns:
            Dict with success status and results or error
        """
        try:
            # Use LlamaCloud's retrieval API
            # Note: This is a placeholder - actual implementation depends on LlamaCloud SDK
            # The real implementation would use the LlamaCloud client to search
            
            # For now, return a mock response structure
            # In production, this would call: self.client.index(index_key).search(query, top_k=top_k)
            
            logger.warning(f"LlamaCloud search not fully implemented. Would search index {index_key} with query: {query}")
            
            return {
                'success': False,
                'error': 'LlamaCloud integration pending implementation'
            }
            
        except Exception as e:
            logger.error(f"Error searching LlamaCloud index {index_key}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_description(self) -> str:
        """Get the dynamic description for this tool."""
        base_description = "Search through configured knowledge bases to find relevant information."
        if hasattr(self, 'dynamic_description'):
            return f"{base_description}\n\n{self.dynamic_description}"
        return base_description