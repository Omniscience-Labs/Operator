import os
import sys
import json
import asyncio
import subprocess
from typing import Dict, Any
from concurrent.futures import ThreadPoolExecutor
from fastapi import HTTPException # type: ignore
from utils.logger import logger
from mcp import ClientSession
from mcp.client.sse import sse_client # type: ignore
from mcp.client.streamable_http import streamablehttp_client # type: ignore
from mcp.client.stdio import stdio_client, StdioServerParameters # type: ignore

async def connect_streamable_http_server(url, headers=None):
    if headers is None:
        headers = {}
    
    try:
        # Try with headers first if provided
        if headers:
            async with streamablehttp_client(url, headers=headers) as (
                read_stream,
                write_stream,
                _,
            ):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    tool_result = await session.list_tools()
                    logger.info(f"Connected via HTTP with headers ({len(tool_result.tools)} tools)")
                    
                    tools_info = []
                    for tool in tool_result.tools:
                        tool_info = {
                            "name": tool.name,
                            "description": tool.description,
                            "inputSchema": tool.inputSchema
                        }
                        tools_info.append(tool_info)
                    
                    return tools_info
        else:
            # Fallback to no headers
            async with streamablehttp_client(url) as (
                read_stream,
                write_stream,
                _,
            ):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    tool_result = await session.list_tools()
                    logger.info(f"Connected via HTTP ({len(tool_result.tools)} tools)")
                    
                    tools_info = []
                    for tool in tool_result.tools:
                        tool_info = {
                            "name": tool.name,
                            "description": tool.description,
                            "inputSchema": tool.inputSchema
                        }
                        tools_info.append(tool_info)
                    
                    return tools_info
    except TypeError as e:
        if "unexpected keyword argument" in str(e) and headers:
            # Fallback for MCP client versions that don't support headers parameter
            logger.warning("MCP client doesn't support headers parameter, falling back to connection without headers")
            async with streamablehttp_client(url) as (
                read_stream,
                write_stream,
                _,
            ):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    tool_result = await session.list_tools()
                    logger.info(f"Connected via HTTP fallback ({len(tool_result.tools)} tools)")
                    
                    tools_info = []
                    for tool in tool_result.tools:
                        tool_info = {
                            "name": tool.name,
                            "description": tool.description,
                            "inputSchema": tool.inputSchema
                        }
                        tools_info.append(tool_info)
                    
                    return tools_info
        else:
            raise

async def discover_custom_tools(request_type: str, config: Dict[str, Any]):
    logger.info(f"Received custom MCP discovery request: type={request_type}")
    logger.debug(f"Request config: {config}")
    
    tools = []
    server_name = None
    
    if request_type == 'json':
        # Handle STDIO/JSON type MCP servers
        if 'command' not in config:
            raise HTTPException(status_code=400, detail="STDIO configuration must include 'command' field")
        
        command = config['command']
        args = config.get('args', [])
        env_vars = config.get('env', {})
        
        logger.info(f"Connecting to STDIO MCP server: command={command}, args={args}")
        
        try:
            # Create server parameters
            server_params = StdioServerParameters(
                command=command,
                args=args,
                env=env_vars
            )
            
            async with asyncio.timeout(15):
                async with stdio_client(server_params) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        tools_result = await session.list_tools()
                        
                        for tool in tools_result.tools:
                            tools.append({
                                "name": tool.name,
                                "description": tool.description,
                                "inputSchema": tool.inputSchema
                            })
                            
        except asyncio.TimeoutError:
            raise HTTPException(status_code=408, detail="Connection timeout - MCP server took too long to respond")
        except Exception as e:
            logger.error(f"Error connecting to STDIO MCP server: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to connect to MCP server: {str(e)}")
    
    elif request_type == 'http':
        if 'url' not in config:
            raise HTTPException(status_code=400, detail="HTTP configuration must include 'url' field")
        url = config['url']
        headers = config.get('headers', {})
        
        try:
            async with asyncio.timeout(15):
                tools_info = await connect_streamable_http_server(url, headers)
                for tool_info in tools_info:
                    tools.append({
                        "name": tool_info["name"],
                        "description": tool_info["description"],
                        "inputSchema": tool_info["inputSchema"]
                    })
        except asyncio.TimeoutError:
            raise HTTPException(status_code=408, detail="Connection timeout - server took too long to respond")
        except Exception as e:
            logger.error(f"Error connecting to HTTP MCP server: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to connect to MCP server: {str(e)}")

    elif request_type == 'sse':
        if 'url' not in config:
            raise HTTPException(status_code=400, detail="SSE configuration must include 'url' field")
        
        url = config['url']
        headers = config.get('headers', {})
        
        try:
            async with asyncio.timeout(15):
                try:
                    async with sse_client(url, headers=headers) as (read, write):
                        async with ClientSession(read, write) as session:
                            await session.initialize()
                            tools_result = await session.list_tools()
                            tools_info = []
                            for tool in tools_result.tools:
                                tool_info = {
                                    "name": tool.name,
                                    "description": tool.description,
                                    "input_schema": tool.inputSchema
                                }
                                tools_info.append(tool_info)
                            
                            for tool_info in tools_info:
                                tools.append({
                                    "name": tool_info["name"],
                                    "description": tool_info["description"],
                                    "inputSchema": tool_info["input_schema"]
                                })
                except TypeError as e:
                    if "unexpected keyword argument" in str(e):
                        async with sse_client(url) as (read, write):
                            async with ClientSession(read, write) as session:
                                await session.initialize()
                                tools_result = await session.list_tools()
                                tools_info = []
                                for tool in tools_result.tools:
                                    tool_info = {
                                        "name": tool.name,
                                        "description": tool.description,
                                        "input_schema": tool.inputSchema
                                    }
                                    tools_info.append(tool_info)
                                
                                for tool_info in tools_info:
                                    tools.append({
                                        "name": tool_info["name"],
                                        "description": tool_info["description"],
                                        "inputSchema": tool_info["input_schema"]
                                    })
                    else:
                        raise
        except asyncio.TimeoutError:
            raise HTTPException(status_code=408, detail="Connection timeout - server took too long to respond")
        except Exception as e:
            logger.error(f"Error connecting to SSE MCP server: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to connect to MCP server: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Invalid server type. Must be 'http', 'sse', or 'json'")
    
    response_data = {"tools": tools, "count": len(tools)}
    
    if server_name:
        response_data["serverName"] = server_name
    
    logger.info(f"Returning {len(tools)} tools for {request_type} server")
    return response_data 
