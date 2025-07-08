import json
import httpx
from typing import Optional, Dict, Any, List
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from agentpress.thread_manager import ThreadManager

class UpdateAgentTool(Tool):
    """Tool for updating agent configuration.
    
    This tool is used by the agent builder to update agent properties
    based on user requirements.
    """

    def __init__(self, thread_manager: ThreadManager, db_connection, agent_id: str):
        super().__init__()
        self.thread_manager = thread_manager
        self.db = db_connection
        self.agent_id = agent_id
        # Smithery API configuration
        self.smithery_api_base_url = "https://registry.smithery.ai"
        import os
        self.smithery_api_key = os.getenv("SMITHERY_API_KEY")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "update_agent",
            "description": "Update the agent's configuration including name, description, system prompt, tools, and MCP servers. Call this whenever the user wants to modify any aspect of the agent.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the agent. Should be descriptive and indicate the agent's purpose."
                    },
                    "description": {
                        "type": "string",
                        "description": "A brief description of what the agent does and its capabilities."
                    },
                    "system_prompt": {
                        "type": "string",
                        "description": "The system instructions that define the agent's behavior, expertise, and approach. This should be comprehensive and well-structured."
                    },
                    "agentpress_tools": {
                        "type": "object",
                        "description": "Configuration for AgentPress tools. Each key is a tool name, and the value is an object with 'enabled' (boolean) and 'description' (string) properties.",
                        "additionalProperties": {
                            "type": "object",
                            "properties": {
                                "enabled": {"type": "boolean"},
                                "description": {"type": "string"}
                            }
                        }
                    },
                    "configured_mcps": {
                        "type": "array",
                        "description": "List of configured MCP servers for external integrations.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "qualifiedName": {"type": "string"},
                                "config": {"type": "object"},
                                "enabledTools": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                }
                            }
                        }
                    },
                    "avatar": {
                        "type": "string",
                        "description": "Emoji to use as the agent's avatar."
                    },
                    "avatar_color": {
                        "type": "string",
                        "description": "Hex color code for the agent's avatar background."
                    },
                    "knowledge_bases": {
                        "type": "array",
                        "description": "List of LlamaCloud knowledge base indices for the agent to search.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string", "description": "Name of the tool (used for method name generation)"},
                                "index_name": {"type": "string", "description": "Name of the LlamaCloud index (used for API calls)"},
                                "description": {"type": "string", "description": "Description of what this knowledge base contains"}
                            }
                        }
                    }
                },
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="update-agent",
        mappings=[
            {"param_name": "name", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "description", "node_type": "element", "path": "description", "required": False},
            {"param_name": "system_prompt", "node_type": "element", "path": "system_prompt", "required": False},
            {"param_name": "agentpress_tools", "node_type": "element", "path": "agentpress_tools", "required": False},
            {"param_name": "configured_mcps", "node_type": "element", "path": "configured_mcps", "required": False},
            {"param_name": "avatar", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "avatar_color", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "knowledge_bases", "node_type": "element", "path": "knowledge_bases", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="update_agent">
        <parameter name="name">Research Assistant</parameter>
        <parameter name="description">An AI assistant specialized in conducting research and providing comprehensive analysis</parameter>
        <parameter name="system_prompt">You are a research assistant with expertise in gathering, analyzing, and synthesizing information. Your approach is thorough and methodical...</parameter>
        <parameter name="agentpress_tools">{"web_search": {"enabled": true, "description": "Search the web for information"}, "sb_files": {"enabled": true, "description": "Read and write files"}}</parameter>
        <parameter name="avatar">🔬</parameter>
        <parameter name="avatar_color">#4F46E5</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def update_agent(
        self,
        name: Optional[str] = None,
        description: Optional[str] = None,
        system_prompt: Optional[str] = None,
        agentpress_tools: Optional[Dict[str, Dict[str, Any]]] = None,
        configured_mcps: Optional[list] = None,
        avatar: Optional[str] = None,
        avatar_color: Optional[str] = None,
        knowledge_bases: Optional[List[Dict[str, str]]] = None
    ) -> ToolResult:
        """Update agent configuration with provided fields.
        
        Args:
            name: Agent name
            description: Agent description
            system_prompt: System instructions for the agent
            agentpress_tools: AgentPress tools configuration
            configured_mcps: MCP servers configuration
            avatar: Emoji avatar
            avatar_color: Avatar background color
            knowledge_bases: List of LlamaCloud knowledge base configurations for the agent to search
            
        Returns:
            ToolResult with updated agent data or error
        """
        try:
            client = await self.db.client
            
            update_data = {}
            if name is not None:
                update_data["name"] = name
            if description is not None:
                update_data["description"] = description
            if system_prompt is not None:
                update_data["system_prompt"] = system_prompt
            if agentpress_tools is not None:
                formatted_tools = {}
                for tool_name, tool_config in agentpress_tools.items():
                    if isinstance(tool_config, dict):
                        formatted_tools[tool_name] = {
                            "enabled": tool_config.get("enabled", False),
                            "description": tool_config.get("description", "")
                        }
                update_data["agentpress_tools"] = formatted_tools
            if configured_mcps is not None:
                if isinstance(configured_mcps, str):
                    configured_mcps = json.loads(configured_mcps)
                update_data["configured_mcps"] = configured_mcps
            if avatar is not None:
                update_data["avatar"] = avatar
            if avatar_color is not None:
                update_data["avatar_color"] = avatar_color
            if knowledge_bases is not None:
                update_data["knowledge_bases"] = knowledge_bases
                
            if not update_data:
                return self.fail_response("No fields provided to update")
                
            result = await client.table('agents').update(update_data).eq('agent_id', self.agent_id).execute()
            
            if not result.data:
                return self.fail_response("Failed to update agent")

            return self.success_response({
                "message": "Agent updated successfully",
                "updated_fields": list(update_data.keys()),
                "agent": result.data[0]
            })
            
        except Exception as e:
            return self.fail_response(f"Error updating agent: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "get_current_agent_config",
            "description": "Get the current configuration of the agent being edited. Use this to check what's already configured before making updates.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="get-current-agent-config",
        mappings=[],
        example='''
        <function_calls>
        <invoke name="get_current_agent_config">
        </invoke>
        </function_calls>
        '''
    )
    async def get_current_agent_config(self) -> ToolResult:
        """Get the current agent configuration.
        
        Returns:
            ToolResult with current agent configuration
        """
        try:
            client = await self.db.client
            
            result = await client.table('agents').select('*').eq('agent_id', self.agent_id).execute()
            
            if not result.data:
                return self.fail_response("Agent not found")
                
            agent = result.data[0]
            
            config_summary = {
                "agent_id": agent["agent_id"],
                "name": agent.get("name", "Untitled Agent"),
                "description": agent.get("description", "No description set"),
                "system_prompt": agent.get("system_prompt", "No system prompt set"),
                "avatar": agent.get("avatar", "🤖"),
                "avatar_color": agent.get("avatar_color", "#6B7280"),
                "agentpress_tools": agent.get("agentpress_tools", {}),
                "configured_mcps": agent.get("configured_mcps", []),
                "knowledge_bases": agent.get("knowledge_bases", []),
                "created_at": agent.get("created_at"),
                "updated_at": agent.get("updated_at")
            }
            
            tools_count = len([t for t, cfg in config_summary["agentpress_tools"].items() if cfg.get("enabled")])
            mcps_count = len(config_summary["configured_mcps"])
            kb_count = len(config_summary["knowledge_bases"])
            
            return self.success_response({
                "summary": f"Agent '{config_summary['name']}' has {tools_count} tools enabled, {mcps_count} MCP servers configured, and {kb_count} knowledge bases.",
                "configuration": config_summary
            })
            
        except Exception as e:
            return self.fail_response(f"Error getting agent configuration: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "search_mcp_servers",
            "description": "Search for MCP servers from the Smithery registry based on user requirements. Use this when the user wants to add MCP tools to their agent.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query for finding relevant MCP servers (e.g., 'linear', 'github', 'database', 'search')"
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter",
                        "enum": ["AI & Search", "Development & Version Control", "Project Management", "Communication & Collaboration", "Data & Analytics", "Cloud & Infrastructure", "File Storage", "Marketing & Sales", "Customer Support", "Finance", "Automation & Productivity", "Utilities"]
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of servers to return (default: 10)",
                        "default": 10
                    }
                },
                "required": ["query"]
            }
        }
    })
    @xml_schema(
        tag_name="search-mcp-servers",
        mappings=[
            {"param_name": "query", "node_type": "attribute", "path": "."},
            {"param_name": "category", "node_type": "attribute", "path": "."},
            {"param_name": "limit", "node_type": "attribute", "path": "."}
        ],
        example='''
        <function_calls>
        <invoke name="search_mcp_servers">
        <parameter name="query">linear</parameter>
        <parameter name="limit">5</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def search_mcp_servers(
        self,
        query: str,
        category: Optional[str] = None,
        limit: int = 10
    ) -> ToolResult:
        """Search for MCP servers based on user requirements.
        
        Args:
            query: Search query for finding relevant MCP servers
            category: Optional category filter
            limit: Maximum number of servers to return
            
        Returns:
            ToolResult with matching MCP servers
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Accept": "application/json",
                    "User-Agent": "Suna-MCP-Integration/1.0"
                }
                
                if self.smithery_api_key:
                    headers["Authorization"] = f"Bearer {self.smithery_api_key}"
                
                params = {
                    "q": query,
                    "page": 1,
                    "pageSize": min(limit * 2, 50)  # Get more results to filter
                }
                
                response = await client.get(
                    f"{self.smithery_api_base_url}/servers",
                    headers=headers,
                    params=params,
                    timeout=30.0
                )
                
                response.raise_for_status()
                data = response.json()
                servers = data.get("servers", [])
                
                # Filter by category if specified
                if category:
                    filtered_servers = []
                    for server in servers:
                        server_category = self._categorize_server(server)
                        if server_category == category:
                            filtered_servers.append(server)
                    servers = filtered_servers
                
                # Sort by useCount and limit results
                servers = sorted(servers, key=lambda x: x.get("useCount", 0), reverse=True)[:limit]
                
                # Format results for user-friendly display
                formatted_servers = []
                for server in servers:
                    formatted_servers.append({
                        "name": server.get("displayName", server.get("qualifiedName", "Unknown")),
                        "qualifiedName": server.get("qualifiedName"),
                        "description": server.get("description", "No description available"),
                        "useCount": server.get("useCount", 0),
                        "category": self._categorize_server(server),
                        "homepage": server.get("homepage", ""),
                        "isDeployed": server.get("isDeployed", False)
                    })
                
                if not formatted_servers:
                    return ToolResult(
                        success=False,
                        output=json.dumps([], ensure_ascii=False)
                    )
                
                return ToolResult(
                    success=True,
                    output=json.dumps(formatted_servers, ensure_ascii=False)
                )
                
        except Exception as e:
            return self.fail_response(f"Error searching MCP servers: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "get_mcp_server_tools",
            "description": "Get detailed information about a specific MCP server including its available tools. Use this after the user selects a server they want to connect to.",
            "parameters": {
                "type": "object",
                "properties": {
                    "qualified_name": {
                        "type": "string",
                        "description": "The qualified name of the MCP server (e.g., 'exa', '@smithery-ai/github')"
                    }
                },
                "required": ["qualified_name"]
            }
        }
    })
    @xml_schema(
        tag_name="get-mcp-server-tools",
        mappings=[
            {"param_name": "qualified_name", "node_type": "attribute", "path": ".", "required": True}
        ],
        example='''
        <function_calls>
        <invoke name="get_mcp_server_tools">
        <parameter name="qualified_name">exa</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def get_mcp_server_tools(self, qualified_name: str) -> ToolResult:
        """Get detailed information about a specific MCP server and its tools.
        
        Args:
            qualified_name: The qualified name of the MCP server
            
        Returns:
            ToolResult with server details and available tools
        """
        try:
            # First get server metadata from registry
            async with httpx.AsyncClient() as client:
                headers = {
                    "Accept": "application/json",
                    "User-Agent": "Suna-MCP-Integration/1.0"
                }
                
                if self.smithery_api_key:
                    headers["Authorization"] = f"Bearer {self.smithery_api_key}"
                
                # URL encode the qualified name if it contains special characters
                from urllib.parse import quote
                if '@' in qualified_name or '/' in qualified_name:
                    encoded_name = quote(qualified_name, safe='')
                else:
                    encoded_name = qualified_name
                
                url = f"{self.smithery_api_base_url}/servers/{encoded_name}"
                
                response = await client.get(
                    url,
                    headers=headers,
                    timeout=30.0
                )
                
                response.raise_for_status()
                server_data = response.json()
            
            # Now connect to the MCP server to get actual tools using ClientSession
            try:
                # Import MCP components
                from mcp import ClientSession
                from mcp.client.streamable_http import streamablehttp_client
                import base64
                import os
                
                # Check if Smithery API key is available
                smithery_api_key = os.getenv("SMITHERY_API_KEY")
                if not smithery_api_key:
                    raise ValueError("SMITHERY_API_KEY environment variable is not set")
                
                # Create server URL with empty config for testing
                config_json = json.dumps({})
                config_b64 = base64.b64encode(config_json.encode()).decode()
                server_url = f"https://server.smithery.ai/{qualified_name}/mcp?config={config_b64}&api_key={smithery_api_key}"
                
                # Connect and get tools
                async with streamablehttp_client(server_url) as (read_stream, write_stream, _):
                    async with ClientSession(read_stream, write_stream) as session:
                        # Initialize the connection
                        await session.initialize()
                        
                        # List available tools
                        tools_result = await session.list_tools()
                        tools = tools_result.tools if hasattr(tools_result, 'tools') else tools_result
                
                # Format tools for user-friendly display
                formatted_tools = []
                for tool in tools:
                    tool_info = {
                        "name": tool.name,
                        "description": getattr(tool, 'description', 'No description available'),
                    }
                    
                    # Extract parameters from inputSchema if available
                    if hasattr(tool, 'inputSchema') and tool.inputSchema:
                        schema = tool.inputSchema
                        if isinstance(schema, dict):
                            tool_info["parameters"] = schema.get("properties", {})
                            tool_info["required_params"] = schema.get("required", [])
                        else:
                            tool_info["parameters"] = {}
                            tool_info["required_params"] = []
                    else:
                        tool_info["parameters"] = {}
                        tool_info["required_params"] = []
                    
                    formatted_tools.append(tool_info)
                
                # Extract configuration requirements from server metadata
                config_requirements = []
                security = server_data.get("security", {})
                if security:
                    for key, value in security.items():
                        if isinstance(value, dict):
                            config_requirements.append({
                                "name": key,
                                "description": value.get("description", f"Configuration for {key}"),
                                "required": value.get("required", False),
                                "type": value.get("type", "string")
                            })
                
                server_info = {
                    "name": server_data.get("displayName", qualified_name),
                    "qualifiedName": qualified_name,
                    "description": server_data.get("description", "No description available"),
                    "homepage": server_data.get("homepage", ""),
                    "iconUrl": server_data.get("iconUrl", ""),
                    "isDeployed": server_data.get("isDeployed", False),
                    "tools": formatted_tools,
                    "config_requirements": config_requirements,
                    "total_tools": len(formatted_tools)
                }
                
                return self.success_response({
                    "message": f"Found {len(formatted_tools)} tools for {server_info['name']}",
                    "server": server_info
                })
                
            except Exception as mcp_error:
                # If MCP connection fails, fall back to registry data
                tools = server_data.get("tools", [])
                formatted_tools = []
                for tool in tools:
                    formatted_tools.append({
                        "name": tool.get("name", "Unknown"),
                        "description": tool.get("description", "No description available"),
                        "parameters": tool.get("inputSchema", {}).get("properties", {}),
                        "required_params": tool.get("inputSchema", {}).get("required", [])
                    })
                
                config_requirements = []
                security = server_data.get("security", {})
                if security:
                    for key, value in security.items():
                        if isinstance(value, dict):
                            config_requirements.append({
                                "name": key,
                                "description": value.get("description", f"Configuration for {key}"),
                                "required": value.get("required", False),
                                "type": value.get("type", "string")
                            })
                
                server_info = {
                    "name": server_data.get("displayName", qualified_name),
                    "qualifiedName": qualified_name,
                    "description": server_data.get("description", "No description available"),
                    "homepage": server_data.get("homepage", ""),
                    "iconUrl": server_data.get("iconUrl", ""),
                    "isDeployed": server_data.get("isDeployed", False),
                    "tools": formatted_tools,
                    "config_requirements": config_requirements,
                    "total_tools": len(formatted_tools),
                    "note": "Tools listed from registry metadata (MCP connection failed - may need configuration)"
                }
                
                return self.success_response({
                    "message": f"Found {len(formatted_tools)} tools for {server_info['name']} (from registry)",
                    "server": server_info
                })
                
        except Exception as e:
            return self.fail_response(f"Error getting MCP server tools: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "configure_mcp_server",
            "description": "Configure and add an MCP server to the agent with selected tools. Use this after the user has chosen which tools they want from a server.",
            "parameters": {
                "type": "object",
                "properties": {
                    "qualified_name": {
                        "type": "string",
                        "description": "The qualified name of the MCP server"
                    },
                    "display_name": {
                        "type": "string",
                        "description": "Display name for the server"
                    },
                    "enabled_tools": {
                        "type": "array",
                        "description": "List of tool names to enable for this server",
                        "items": {"type": "string"}
                    },
                    "config": {
                        "type": "object",
                        "description": "Configuration object with API keys and other settings",
                        "additionalProperties": True
                    }
                },
                "required": ["qualified_name", "display_name", "enabled_tools"]
            }
        }
    })
    @xml_schema(
        tag_name="configure-mcp-server",
        mappings=[
            {"param_name": "qualified_name", "node_type": "attribute", "path": ".", "required": True},
            {"param_name": "display_name", "node_type": "attribute", "path": ".", "required": True},
            {"param_name": "enabled_tools", "node_type": "element", "path": "enabled_tools", "required": True},
            {"param_name": "config", "node_type": "element", "path": "config", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="configure_mcp_server">
        <parameter name="qualified_name">exa</parameter>
        <parameter name="display_name">Exa Search</parameter>
        <parameter name="enabled_tools">["search", "find_similar"]</parameter>
        <parameter name="config">{"exaApiKey": "user-api-key"}</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def configure_mcp_server(
        self,
        qualified_name: str,
        display_name: str,
        enabled_tools: List[str],
        config: Optional[Dict[str, Any]] = None
    ) -> ToolResult:
        """Configure and add an MCP server to the agent.
        
        Args:
            qualified_name: The qualified name of the MCP server
            display_name: Display name for the server
            enabled_tools: List of tool names to enable
            config: Configuration object with API keys and settings
            
        Returns:
            ToolResult with configuration status
        """
        try:
            client = await self.db.client
            
            # Get current agent configuration
            result = await client.table('agents').select('configured_mcps').eq('agent_id', self.agent_id).execute()
            
            if not result.data:
                return self.fail_response("Agent not found")
            
            current_mcps = result.data[0].get('configured_mcps', [])
            
            # Check if server is already configured
            existing_server_index = None
            for i, mcp in enumerate(current_mcps):
                if mcp.get('qualifiedName') == qualified_name:
                    existing_server_index = i
                    break
            
            # Create new MCP configuration
            new_mcp_config = {
                "name": display_name,
                "qualifiedName": qualified_name,
                "config": config or {},
                "enabledTools": enabled_tools
            }
            
            # Update or add the configuration
            if existing_server_index is not None:
                current_mcps[existing_server_index] = new_mcp_config
                action = "updated"
            else:
                current_mcps.append(new_mcp_config)
                action = "added"
            
            # Save to database
            update_result = await client.table('agents').update({
                'configured_mcps': current_mcps
            }).eq('agent_id', self.agent_id).execute()
            
            if not update_result.data:
                return self.fail_response("Failed to save MCP configuration")
            
            return self.success_response({
                "message": f"Successfully {action} MCP server '{display_name}' with {len(enabled_tools)} tools",
                "server": new_mcp_config,
                "total_mcp_servers": len(current_mcps),
                "action": action
            })
            
        except Exception as e:
            return self.fail_response(f"Error configuring MCP server: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "get_popular_mcp_servers",
            "description": "Get a list of popular and recommended MCP servers organized by category. Use this to show users popular options when they want to add MCP tools.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Optional category filter to show only servers from a specific category",
                        "enum": ["AI & Search", "Development & Version Control", "Project Management", "Communication & Collaboration", "Data & Analytics", "Cloud & Infrastructure", "File Storage", "Marketing & Sales", "Customer Support", "Finance", "Automation & Productivity", "Utilities"]
                    }
                },
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="get-popular-mcp-servers",
        mappings=[
            {"param_name": "category", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="get_popular_mcp_servers">
        <parameter name="category">AI & Search</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def get_popular_mcp_servers(self, category: Optional[str] = None) -> ToolResult:
        """Get popular MCP servers organized by category.
        
        Args:
            category: Optional category filter
            
        Returns:
            ToolResult with popular MCP servers
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Accept": "application/json",
                    "User-Agent": "Suna-MCP-Integration/1.0"
                }
                
                if self.smithery_api_key:
                    headers["Authorization"] = f"Bearer {self.smithery_api_key}"
                
                response = await client.get(
                    f"{self.smithery_api_base_url}/servers",
                    headers=headers,
                    params={"page": 1, "pageSize": 50},
                    timeout=30.0
                )
                
                response.raise_for_status()
                data = response.json()
                servers = data.get("servers", [])
                
                # Categorize servers
                categorized = {}
                for server in servers:
                    server_category = self._categorize_server(server)
                    if category and server_category != category:
                        continue
                        
                    if server_category not in categorized:
                        categorized[server_category] = []
                    
                    categorized[server_category].append({
                        "name": server.get("displayName", server.get("qualifiedName", "Unknown")),
                        "qualifiedName": server.get("qualifiedName"),
                        "description": server.get("description", "No description available"),
                        "useCount": server.get("useCount", 0),
                        "homepage": server.get("homepage", ""),
                        "isDeployed": server.get("isDeployed", False)
                    })
                
                # Sort categories and servers within each category
                for cat in categorized:
                    categorized[cat] = sorted(categorized[cat], key=lambda x: x["useCount"], reverse=True)[:5]
                
                return self.success_response({
                    "message": f"Found popular MCP servers" + (f" in category '{category}'" if category else ""),
                    "categorized_servers": categorized,
                    "total_categories": len(categorized)
                })
                
        except Exception as e:
            return self.fail_response(f"Error getting popular MCP servers: {str(e)}")

    def _categorize_server(self, server: Dict[str, Any]) -> str:
        """Categorize a server based on its qualified name and description."""
        qualified_name = server.get("qualifiedName", "").lower()
        description = server.get("description", "").lower()
        
        # Category mappings
        category_mappings = {
            "AI & Search": ["exa", "perplexity", "openai", "anthropic", "duckduckgo", "brave", "google", "search"],
            "Development & Version Control": ["github", "gitlab", "bitbucket", "git"],
            "Project Management": ["linear", "jira", "asana", "notion", "trello", "monday", "clickup"],
            "Communication & Collaboration": ["slack", "discord", "teams", "zoom", "telegram"],
            "Data & Analytics": ["postgres", "mysql", "mongodb", "bigquery", "snowflake", "sqlite", "redis", "database"],
            "Cloud & Infrastructure": ["aws", "gcp", "azure", "vercel", "netlify", "cloudflare", "docker"],
            "File Storage": ["gdrive", "google-drive", "dropbox", "box", "onedrive", "s3", "drive"],
            "Marketing & Sales": ["hubspot", "salesforce", "mailchimp", "sendgrid"],
            "Customer Support": ["zendesk", "intercom", "freshdesk", "helpscout"],
            "Finance": ["stripe", "quickbooks", "xero", "plaid"],
            "Automation & Productivity": ["playwright", "puppeteer", "selenium", "desktop-commander", "sequential-thinking", "automation"],
            "Utilities": ["filesystem", "memory", "fetch", "time", "weather", "currency", "file"]
        }
        
        # Check qualified name and description for category keywords
        for category, keywords in category_mappings.items():
            for keyword in keywords:
                if keyword in qualified_name or keyword in description:
                    return category
        
        return "Other"

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "test_mcp_server_connection",
            "description": "Test connectivity to an MCP server with provided configuration. Use this to validate that a server can be connected to before adding it to the agent.",
            "parameters": {
                "type": "object",
                "properties": {
                    "qualified_name": {
                        "type": "string",
                        "description": "The qualified name of the MCP server"
                    },
                    "config": {
                        "type": "object",
                        "description": "Configuration object with API keys and other settings",
                        "additionalProperties": True
                    }
                },
                "required": ["qualified_name"]
            }
        }
    })
    @xml_schema(
        tag_name="test-mcp-server-connection",
        mappings=[
            {"param_name": "qualified_name", "node_type": "attribute", "path": ".", "required": True},
            {"param_name": "config", "node_type": "element", "path": "config", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="test_mcp_server_connection">
        <parameter name="qualified_name">exa</parameter>
        <parameter name="config">{"exaApiKey": "user-api-key"}</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def test_mcp_server_connection(
        self,
        qualified_name: str,
        config: Optional[Dict[str, Any]] = None
    ) -> ToolResult:
        """Test connectivity to an MCP server with provided configuration.
        
        Args:
            qualified_name: The qualified name of the MCP server
            config: Configuration object with API keys and settings
            
        Returns:
            ToolResult with connection test results
        """
        try:
            # Import MCP components
            from mcp import ClientSession
            from mcp.client.streamable_http import streamablehttp_client
            import base64
            import os
            
            # Check if Smithery API key is available
            smithery_api_key = os.getenv("SMITHERY_API_KEY")
            if not smithery_api_key:
                return self.fail_response("SMITHERY_API_KEY environment variable is not set")
            
            # Create server URL with provided config
            config_json = json.dumps(config or {})
            config_b64 = base64.b64encode(config_json.encode()).decode()
            server_url = f"https://server.smithery.ai/{qualified_name}/mcp?config={config_b64}&api_key={smithery_api_key}"
            
            # Test connection
            async with streamablehttp_client(server_url) as (read_stream, write_stream, _):
                async with ClientSession(read_stream, write_stream) as session:
                    # Initialize the connection
                    await session.initialize()
                    
                    # List available tools to verify connection
                    tools_result = await session.list_tools()
                    tools = tools_result.tools if hasattr(tools_result, 'tools') else tools_result
                    
                    tool_names = [tool.name for tool in tools]
                    
                    return self.success_response({
                        "message": f"Successfully connected to {qualified_name}",
                        "qualified_name": qualified_name,
                        "connection_status": "success",
                        "available_tools": tool_names,
                        "total_tools": len(tool_names)
                    })
            
        except Exception as e:
            return self.fail_response(f"Failed to connect to {qualified_name}: {str(e)}") 