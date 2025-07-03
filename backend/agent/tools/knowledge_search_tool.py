"""
Knowledge Search Tool for AgentPress

This tool provides semantic search capabilities across custom knowledge bases
using LlamaIndex and LlamaCloud for indexing and retrieval.
"""

import os
import json
from typing import Optional, List, Dict, Any
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from agentpress.thread_manager import ThreadManager
from utils.logger import logger
from services.supabase import DBConnection
import asyncio
from datetime import datetime


class KnowledgeSearchTool(Tool):
    """
    Tool for searching through custom knowledge bases using LlamaCloud.
    
    This tool dynamically creates search methods for each knowledge base
    associated with the current agent, allowing semantic search across
    uploaded documents and external indexes.
    """

    def __init__(self, thread_manager: ThreadManager, agent_id: Optional[str] = None):
        """
        Initialize the knowledge search tool.
        
        Args:
            thread_manager: ThreadManager instance for thread operations
            agent_id: The agent ID to get knowledge bases for
        """
        self.thread_manager = thread_manager
        self.agent_id = agent_id
        self.db = DBConnection()
        self.llama_api_key = os.getenv("LLAMA_CLOUD_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not self.llama_api_key:
            logger.warning("LLAMA_CLOUD_API_KEY not found in environment variables")
        
        # Initialize with parent class
        super().__init__()
        
        # Initialize knowledge bases
        self._knowledge_bases = []
        self._initialized = False
        
    async def _initialize(self):
        """Initialize knowledge bases for the agent."""
        if self._initialized:
            return
            
        try:
            client = await self.db.client
            
            # Query knowledge bases for this agent
            query = client.table('knowledge_bases').select('*').eq('status', 'ready')
            
            if self.agent_id:
                query = query.eq('agent_id', self.agent_id)
            
            result = await query.execute()
            
            if result.data:
                self._knowledge_bases = result.data
                logger.info(f"Loaded {len(self._knowledge_bases)} knowledge bases for agent {self.agent_id}")
            
            self._initialized = True
            
        except Exception as e:
            logger.error(f"Error initializing knowledge bases: {e}")
            self._initialized = True  # Prevent retry loops

    async def _ensure_initialized(self):
        """Ensure knowledge bases are initialized."""
        if not self._initialized:
            await self._initialize()

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "search_knowledge",
            "description": "Search through available knowledge bases using semantic search. Returns relevant information from indexed documents.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant information"
                    },
                    "knowledge_base_name": {
                        "type": "string",
                        "description": "Optional: Specific knowledge base to search in. If not provided, searches all available knowledge bases."
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Number of top results to return (default: 5)",
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
            {"param_name": "knowledge_base_name", "node_type": "element", "path": "knowledge_base_name", "required": False},
            {"param_name": "top_k", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="search_knowledge">
        <parameter name="query">What is the company's refund policy?</parameter>
        <parameter name="knowledge_base_name">Company Policies</parameter>
        <parameter name="top_k">3</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def search_knowledge(
        self,
        query: str,
        knowledge_base_name: Optional[str] = None,
        top_k: int = 5
    ) -> ToolResult:
        """
        Search through knowledge bases for relevant information.
        
        Args:
            query: The search query
            knowledge_base_name: Optional specific knowledge base to search
            top_k: Number of results to return
            
        Returns:
            ToolResult with search results or error
        """
        await self._ensure_initialized()
        
        try:
            if not self.llama_api_key:
                return self.fail_response("LlamaCloud API key not configured")
            
            # Filter knowledge bases
            if knowledge_base_name:
                kb_list = [kb for kb in self._knowledge_bases if kb['name'] == knowledge_base_name]
                if not kb_list:
                    return self.fail_response(f"Knowledge base '{knowledge_base_name}' not found")
            else:
                kb_list = self._knowledge_bases
            
            if not kb_list:
                return self.fail_response("No knowledge bases available for search")
            
            all_results = []
            
            # Search each knowledge base
            for kb in kb_list:
                if not kb.get('llama_index_id'):
                    logger.warning(f"Knowledge base {kb['name']} has no index ID")
                    continue
                
                try:
                    # Query the index using LlamaCloud API
                    results = await self._query_llama_cloud_index(kb['llama_index_id'], query, top_k)
                    
                    # Format results
                    for result in results:
                        all_results.append({
                            "knowledge_base": kb['name'],
                            "content": result.get('text', ''),
                            "score": result.get('score', 0),
                            "metadata": result.get('metadata', {})
                        })
                        
                except Exception as e:
                    logger.error(f"Error searching knowledge base {kb['name']}: {e}")
                    continue
            
            # Sort by score and limit to top_k
            all_results.sort(key=lambda x: x['score'], reverse=True)
            all_results = all_results[:top_k]
            
            if not all_results:
                return self.success_response({
                    "message": "No relevant results found",
                    "results": []
                })
            
            # Format response
            response_text = f"Found {len(all_results)} relevant results:\n\n"
            for i, result in enumerate(all_results, 1):
                response_text += f"{i}. From '{result['knowledge_base']}':\n"
                response_text += f"   {result['content'][:500]}...\n"
                response_text += f"   (Relevance: {result['score']:.2f})\n\n"
            
            return self.success_response({
                "message": response_text,
                "results": all_results,
                "total_results": len(all_results)
            })
            
        except Exception as e:
            logger.error(f"Error in knowledge search: {e}")
            return self.fail_response(f"Error searching knowledge: {str(e)}")
    
    async def _query_llama_cloud_index(self, index_id: str, query: str, top_k: int) -> List[Dict[str, Any]]:
        """Query a LlamaCloud index via API."""
        # TODO: Implement actual LlamaCloud API integration
        # This is a placeholder implementation
        logger.info(f"Would query LlamaCloud index {index_id} with query: {query}")
        
        # For now, return empty results
        # In production, this would make an actual API call to LlamaCloud
        return []

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "list_knowledge_bases",
            "description": "List all available knowledge bases and their descriptions",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="list-knowledge-bases",
        mappings=[],
        example='''
        <function_calls>
        <invoke name="list_knowledge_bases">
        </invoke>
        </function_calls>
        '''
    )
    async def list_knowledge_bases(self) -> ToolResult:
        """
        List all available knowledge bases.
        
        Returns:
            ToolResult with list of knowledge bases
        """
        await self._ensure_initialized()
        
        try:
            if not self._knowledge_bases:
                return self.success_response({
                    "message": "No knowledge bases configured",
                    "knowledge_bases": []
                })
            
            kb_list = []
            for kb in self._knowledge_bases:
                kb_list.append({
                    "name": kb['name'],
                    "description": kb.get('description', 'No description'),
                    "type": kb.get('index_type', 'managed'),
                    "status": kb.get('status', 'unknown')
                })
            
            response_text = f"Available knowledge bases ({len(kb_list)}):\n\n"
            for kb in kb_list:
                response_text += f"• {kb['name']}: {kb['description']}\n"
                response_text += f"  Type: {kb['type']}, Status: {kb['status']}\n\n"
            
            return self.success_response({
                "message": response_text,
                "knowledge_bases": kb_list
            })
            
        except Exception as e:
            logger.error(f"Error listing knowledge bases: {e}")
            return self.fail_response(f"Error listing knowledge bases: {str(e)}")