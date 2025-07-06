from fastapi import APIRouter, HTTPException, Depends, Request, Body, File, UploadFile, Form, Query
from fastapi.responses import StreamingResponse
import asyncio
import json
import traceback
from datetime import datetime, timezone
import uuid
from typing import Optional, List, Dict, Any
import jwt
from pydantic import BaseModel
import tempfile
import os

from agentpress.thread_manager import ThreadManager
from services.supabase import DBConnection
from services import redis
from utils.auth_utils import get_current_user_id_from_jwt, get_user_id_from_stream_auth, verify_thread_access
from utils.logger import logger, structlog
from services.billing import check_billing_status, can_use_model
from utils.config import config
from sandbox.sandbox import create_sandbox, delete_sandbox, get_or_start_sandbox
from services.llm import make_llm_api_call
from run_agent_background import run_agent_background, _cleanup_redis_response_list, update_agent_run_status
from utils.constants import MODEL_NAME_ALIASES
from flags.flags import is_enabled

# Initialize shared resources
router = APIRouter()
db = None
instance_id = None # Global instance ID for this backend instance

# TTL for Redis response lists (24 hours)
REDIS_RESPONSE_LIST_TTL = 3600 * 24


class AgentStartRequest(BaseModel):
    model_name: Optional[str] = None  # Will be set from config.MODEL_TO_USE in the endpoint
    enable_thinking: Optional[bool] = False
    reasoning_effort: Optional[str] = 'low'
    stream: Optional[bool] = True
    enable_context_manager: Optional[bool] = False
    agent_id: Optional[str] = None  # Custom agent to use
    user_name: Optional[str] = None

class InitiateAgentResponse(BaseModel):
    thread_id: str
    agent_run_id: Optional[str] = None

class AgentCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    system_prompt: str
    configured_mcps: Optional[List[Dict[str, Any]]] = []
    custom_mcps: Optional[List[Dict[str, Any]]] = []
    agentpress_tools: Optional[Dict[str, Any]] = {}
    is_default: Optional[bool] = False
    knowledge_bases: Optional[List[Dict[str, Any]]] = []
    avatar: Optional[str] = None
    avatar_color: Optional[str] = None

class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    configured_mcps: Optional[List[Dict[str, Any]]] = None
    custom_mcps: Optional[List[Dict[str, Any]]] = None
    agentpress_tools: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None
    knowledge_bases: Optional[List[Dict[str, Any]]] = None
    avatar: Optional[str] = None
    avatar_color: Optional[str] = None

class AgentResponse(BaseModel):
    agent_id: str
    account_id: str
    name: str
    description: Optional[str]
    system_prompt: str
    configured_mcps: List[Dict[str, Any]]
    custom_mcps: Optional[List[Dict[str, Any]]] = []
    agentpress_tools: Dict[str, Any]
    is_default: bool
    is_public: Optional[bool] = False
    visibility: Optional[str] = "private"  # "public", "teams", or "private"
    knowledge_bases: Optional[List[Dict[str, Any]]] = []
    marketplace_published_at: Optional[str] = None
    download_count: Optional[int] = 0
    tags: Optional[List[str]] = []
    sharing_preferences: Optional[Dict[str, Any]] = {}
    avatar: Optional[str]
    avatar_color: Optional[str]
    created_at: str
    updated_at: str
    is_managed: Optional[bool] = False  # True if this is a managed agent (live reference)
    is_owned: Optional[bool] = True  # True if user owns this agent

class PaginationInfo(BaseModel):
    page: int
    limit: int
    total: int
    pages: int

class AgentsResponse(BaseModel):
    agents: List[AgentResponse]
    pagination: PaginationInfo

class ThreadAgentResponse(BaseModel):
    agent: Optional[AgentResponse]
    source: str  # "thread", "default", "none", "missing"
    message: str

class AgentBuilderChatRequest(BaseModel):
    message: str
    conversation_history: List[Dict[str, str]] = []
    partial_config: Optional[Dict[str, Any]] = None

class AgentBuilderChatResponse(BaseModel):
    response: str
    suggested_config: Optional[Dict[str, Any]] = None
    next_step: Optional[str] = None

def initialize(
    _db: DBConnection,
    _instance_id: str = None
):
    """Initialize the agent API with resources from the main API."""
    global db, instance_id
    db = _db

    # Use provided instance_id or generate a new one
    if _instance_id:
        instance_id = _instance_id
    else:
        # Generate instance ID
        instance_id = str(uuid.uuid4())[:8]

    logger.info(f"Initialized agent API with instance ID: {instance_id}")

    # Note: Redis will be initialized in the lifespan function in api.py

async def cleanup():
    """Clean up resources and stop running agents on shutdown."""
    logger.info("Starting cleanup of agent API resources")

    # Use the instance_id to find and clean up this instance's keys
    try:
        if instance_id: # Ensure instance_id is set
            running_keys = await redis.keys(f"active_run:{instance_id}:*")
            logger.info(f"Found {len(running_keys)} running agent runs for instance {instance_id} to clean up")

            for key in running_keys:
                # Key format: active_run:{instance_id}:{agent_run_id}
                parts = key.split(":")
                if len(parts) == 3:
                    agent_run_id = parts[2]
                    await stop_agent_run(agent_run_id, error_message=f"Instance {instance_id} shutting down")
                else:
                    logger.warning(f"Unexpected key format found: {key}")
        else:
            logger.warning("Instance ID not set, cannot clean up instance-specific agent runs.")

    except Exception as e:
        logger.error(f"Failed to clean up running agent runs: {str(e)}")

    # Close Redis connection
    await redis.close()
    logger.info("Completed cleanup of agent API resources")

async def stop_agent_run(agent_run_id: str, error_message: Optional[str] = None):
    """Update database and publish stop signal to Redis."""
    logger.info(f"Stopping agent run: {agent_run_id}")
    client = await db.client
    final_status = "failed" if error_message else "stopped"

    # Attempt to fetch final responses from Redis
    response_list_key = f"agent_run:{agent_run_id}:responses"
    all_responses = []
    try:
        all_responses_json = await redis.lrange(response_list_key, 0, -1)
        all_responses = [json.loads(r) for r in all_responses_json]
        logger.info(f"Fetched {len(all_responses)} responses from Redis for DB update on stop/fail: {agent_run_id}")
    except Exception as e:
        logger.error(f"Failed to fetch responses from Redis for {agent_run_id} during stop/fail: {e}")
        # Try fetching from DB as a fallback? Or proceed without responses? Proceeding without for now.

    # Update the agent run status in the database
    update_success = await update_agent_run_status(
        client, agent_run_id, final_status, error=error_message, responses=all_responses
    )

    if not update_success:
        logger.error(f"Failed to update database status for stopped/failed run {agent_run_id}")

    # Send STOP signal to the global control channel
    global_control_channel = f"agent_run:{agent_run_id}:control"
    try:
        await redis.publish(global_control_channel, "STOP")
        logger.debug(f"Published STOP signal to global channel {global_control_channel}")
    except Exception as e:
        logger.error(f"Failed to publish STOP signal to global channel {global_control_channel}: {str(e)}")

    # Find all instances handling this agent run and send STOP to instance-specific channels
    try:
        instance_keys = await redis.keys(f"active_run:*:{agent_run_id}")
        logger.debug(f"Found {len(instance_keys)} active instance keys for agent run {agent_run_id}")

        for key in instance_keys:
            # Key format: active_run:{instance_id}:{agent_run_id}
            parts = key.split(":")
            if len(parts) == 3:
                instance_id_from_key = parts[1]
                instance_control_channel = f"agent_run:{agent_run_id}:control:{instance_id_from_key}"
                try:
                    await redis.publish(instance_control_channel, "STOP")
                    logger.debug(f"Published STOP signal to instance channel {instance_control_channel}")
                except Exception as e:
                    logger.warning(f"Failed to publish STOP signal to instance channel {instance_control_channel}: {str(e)}")
            else:
                 logger.warning(f"Unexpected key format found: {key}")

        # Clean up the response list immediately on stop/fail
        await _cleanup_redis_response_list(agent_run_id)

    except Exception as e:
        logger.error(f"Failed to find or signal active instances for {agent_run_id}: {str(e)}")

    logger.info(f"Successfully initiated stop process for agent run: {agent_run_id}")

# async def restore_running_agent_runs():
#     """Mark agent runs that were still 'running' in the database as failed and clean up Redis resources."""
#     logger.info("Restoring running agent runs after server restart")
#     client = await db.client
#     running_agent_runs = await client.table('agent_runs').select('id').eq("status", "running").execute()

#     for run in running_agent_runs.data:
#         agent_run_id = run['id']
#         logger.warning(f"Found running agent run {agent_run_id} from before server restart")

#         # Clean up Redis resources for this run
#         try:
#             # Clean up active run key
#             active_run_key = f"active_run:{instance_id}:{agent_run_id}"
#             await redis.delete(active_run_key)

#             # Clean up response list
#             response_list_key = f"agent_run:{agent_run_id}:responses"
#             await redis.delete(response_list_key)

#             # Clean up control channels
#             control_channel = f"agent_run:{agent_run_id}:control"
#             instance_control_channel = f"agent_run:{agent_run_id}:control:{instance_id}"
#             await redis.delete(control_channel)
#             await redis.delete(instance_control_channel)

#             logger.info(f"Cleaned up Redis resources for agent run {agent_run_id}")
#         except Exception as e:
#             logger.error(f"Error cleaning up Redis resources for agent run {agent_run_id}: {e}")

#         # Call stop_agent_run to handle status update and cleanup
#         await stop_agent_run(agent_run_id, error_message="Server restarted while agent was running")

async def check_for_active_project_agent_run(client, project_id: str):
    """
    Check if there is an active agent run for any thread in the given project.
    If found, returns the ID of the active run, otherwise returns None.
    """
    project_threads = await client.table('threads').select('thread_id').eq('project_id', project_id).execute()
    project_thread_ids = [t['thread_id'] for t in project_threads.data]

    if project_thread_ids:
        active_runs = await client.table('agent_runs').select('id').in_('thread_id', project_thread_ids).eq('status', 'running').execute()
        if active_runs.data and len(active_runs.data) > 0:
            return active_runs.data[0]['id']
    return None

async def get_agent_run_with_access_check(client, agent_run_id: str, user_id: str):
    """Get agent run data after verifying user access."""
    agent_run = await client.table('agent_runs').select('*').eq('id', agent_run_id).execute()
    if not agent_run.data:
        raise HTTPException(status_code=404, detail="Agent run not found")

    agent_run_data = agent_run.data[0]
    thread_id = agent_run_data['thread_id']
    await verify_thread_access(client, thread_id, user_id)
    return agent_run_data

async def enhance_system_prompt(agent_name: str, description: str, user_system_prompt: str) -> str:
    """
    Enhance a basic system prompt using GPT-4o to create a more comprehensive and effective system prompt.
    
    Args:
        agent_name: Name of the agent
        description: Description of the agent
        user_system_prompt: User's basic system prompt/instructions
        
    Returns:
        Enhanced system prompt generated by GPT-4o
    """
    try:
        system_message = """You are an expert at creating comprehensive system prompts for AI agents. Your task is to take basic agent information and transform it into a detailed, effective system prompt that will help the agent perform optimally.

Guidelines for creating system prompts:
1. Be specific about the agent's role, expertise, and capabilities
2. Include clear behavioral guidelines and interaction style
3. Specify the agent's knowledge domains and areas of expertise
4. Include guidance on how to handle different types of requests
5. Set appropriate boundaries and limitations
6. Make the prompt engaging and easy to understand
7. Ensure the prompt is comprehensive but not overly verbose
8. Include relevant context about tools and capabilities the agent might have

The enhanced prompt should be professional, clear, and actionable."""

        user_message = f"""Please create an enhanced system prompt for an AI agent with the following details:

Agent Name: {agent_name}
Agent Description: {description}
User's Instructions: {user_system_prompt}

Transform this basic information into a comprehensive, effective system prompt that will help the agent perform at its best. The prompt should be detailed enough to guide the agent's behavior while remaining clear and actionable."""

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]

        logger.info(f"Enhancing system prompt for agent: {agent_name}")
        response = await make_llm_api_call(
            messages=messages,
            model_name="openai/gpt-4o",
            max_tokens=2000,
            temperature=0.7
        )

        if response and response.get('choices') and response['choices'][0].get('message'):
            enhanced_prompt = response['choices'][0]['message'].get('content', '').strip()
            if enhanced_prompt:
                logger.info(f"Successfully enhanced system prompt for agent: {agent_name}")
                return enhanced_prompt
            else:
                logger.warning(f"GPT-4o returned empty enhanced prompt for agent: {agent_name}")
                return user_system_prompt
        else:
            logger.warning(f"Failed to get valid response from GPT-4o for agent: {agent_name}")
            return user_system_prompt

    except Exception as e:
        logger.error(f"Error enhancing system prompt for agent {agent_name}: {str(e)}")
        # Return the original prompt if enhancement fails
        return user_system_prompt

@router.post("/thread/{thread_id}/agent/start")
async def start_agent(
    thread_id: str,
    body: AgentStartRequest = Body(...),
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Start an agent for a specific thread in the background."""
    structlog.contextvars.bind_contextvars(
        thread_id=thread_id,
    )
    global instance_id # Ensure instance_id is accessible
    if not instance_id:
        raise HTTPException(status_code=500, detail="Agent API not initialized with instance ID")

    # Use model from config if not specified in the request
    model_name = body.model_name
    logger.info(f"Original model_name from request: {model_name}")

    if model_name is None:
        model_name = config.MODEL_TO_USE
        logger.info(f"Using model from config: {model_name}")

    # Log the model name after alias resolution
    resolved_model = MODEL_NAME_ALIASES.get(model_name, model_name)
    logger.info(f"Resolved model name: {resolved_model}")

    # Update model_name to use the resolved version
    model_name = resolved_model

    logger.info(f"Starting new agent for thread: {thread_id} with config: model={model_name}, thinking={body.enable_thinking}, effort={body.reasoning_effort}, stream={body.stream}, context_manager={body.enable_context_manager} (Instance: {instance_id})")
    client = await db.client

    await verify_thread_access(client, thread_id, user_id)
    thread_result = await client.table('threads').select('project_id', 'account_id', 'agent_id', 'metadata').eq('thread_id', thread_id).execute()
    if not thread_result.data:
        raise HTTPException(status_code=404, detail="Thread not found")
    thread_data = thread_result.data[0]
    project_id = thread_data.get('project_id')
    account_id = thread_data.get('account_id')
    thread_agent_id = thread_data.get('agent_id')
    thread_metadata = thread_data.get('metadata', {})

    structlog.contextvars.bind_contextvars(
        project_id=project_id,
        account_id=account_id,
        thread_agent_id=thread_agent_id,
        thread_metadata=thread_metadata,
    )
    
    # Check if this is an agent builder thread
    is_agent_builder = thread_metadata.get('is_agent_builder', False)
    target_agent_id = thread_metadata.get('target_agent_id')
    
    if is_agent_builder:
        logger.info(f"Thread {thread_id} is in agent builder mode, target_agent_id: {target_agent_id}")
    
    # Load agent configuration
    agent_config = None
    effective_agent_id = body.agent_id or thread_agent_id  # Use provided agent_id or the one stored in thread
    
    if effective_agent_id:
        # Use the same access logic as get_agent endpoint
        agent_result = await client.table('agents').select('*').eq('agent_id', effective_agent_id).execute()
        if not agent_result.data:
            if body.agent_id:
                raise HTTPException(status_code=404, detail="Agent not found or access denied")
            else:
                logger.warning(f"Stored agent_id {effective_agent_id} not found, falling back to default")
                effective_agent_id = None
        else:
            agent_data = agent_result.data[0]
            
            # Check access: owner, public agent, or agent in user's library
            has_access = False
            if agent_data['account_id'] == user_id:
                # User owns the agent
                has_access = True
            elif agent_data.get('is_public', False):
                # Public agent
                has_access = True
            else:
                # Check if user has this agent in their library (either managed or copied)
                library_check = await client.table('user_agent_library').select('*').eq(
                    'user_account_id', user_id
                ).eq('agent_id', effective_agent_id).execute()
                
                if library_check.data:
                    has_access = True
                    # Apply sharing preferences filtering for managed agents
                    library_entry = library_check.data[0]
                    is_managed_by_user = (library_entry['agent_id'] == library_entry['original_agent_id'])
                    if is_managed_by_user:
                        sharing_prefs = agent_data.get('sharing_preferences', {})
                        if not sharing_prefs.get('include_knowledge_bases', True):
                            agent_data['knowledge_bases'] = []
                        if not sharing_prefs.get('include_custom_mcp_tools', True):
                            agent_data['configured_mcps'] = []
                            agent_data['custom_mcps'] = []
            
            if not has_access:
                if body.agent_id:
                    raise HTTPException(status_code=404, detail="Agent not found or access denied")
                else:
                    logger.warning(f"Stored agent_id {effective_agent_id} not found or access denied, falling back to default")
                    effective_agent_id = None
                    agent_data = None
            
            if agent_data:
                agent_config = agent_data
                source = "request" if body.agent_id else "thread"
                logger.info(f"Using agent from {source}: {agent_config['name']} ({effective_agent_id})")
    
    # If no agent found yet, try to get default agent for the account
    if not agent_config:
        default_agent_result = await client.table('agents').select('*').eq('account_id', account_id).eq('is_default', True).execute()
        if default_agent_result.data:
            agent_config = default_agent_result.data[0]
            logger.info(f"Using default agent: {agent_config['name']} ({agent_config['agent_id']})")
    
    # Update thread's agent_id if a different agent was explicitly requested
    if body.agent_id and body.agent_id != thread_agent_id and agent_config:
        try:
            await client.table('threads').update({"agent_id": agent_config['agent_id']}).eq('thread_id', thread_id).execute()
            logger.info(f"Updated thread {thread_id} to use agent {agent_config['agent_id']}")
        except Exception as e:
            logger.warning(f"Failed to update thread agent_id: {e}")

    can_use, model_message, allowed_models = await can_use_model(client, account_id, model_name)
    if not can_use:
        raise HTTPException(status_code=403, detail={"message": model_message, "allowed_models": allowed_models})

    can_run, message, subscription = await check_billing_status(client, account_id)
    if not can_run:
        raise HTTPException(status_code=402, detail={"message": message, "subscription": subscription})

    active_run_id = await check_for_active_project_agent_run(client, project_id)
    if active_run_id:
        logger.info(f"Stopping existing agent run {active_run_id} for project {project_id}")
        await stop_agent_run(active_run_id)

    try:
        # Get project data to find sandbox ID
        project_result = await client.table('projects').select('*').eq('project_id', project_id).execute()
        if not project_result.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_data = project_result.data[0]
        sandbox_info = project_data.get('sandbox', {})
        if not sandbox_info.get('id'):
            raise HTTPException(status_code=404, detail="No sandbox found for this project")
            
        sandbox_id = sandbox_info['id']
        sandbox = await get_or_start_sandbox(sandbox_id)
        logger.info(f"Successfully started sandbox {sandbox_id} for project {project_id}")
    except Exception as e:
        logger.error(f"Failed to start sandbox for project {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize sandbox: {str(e)}")

    # Store reasoning mode in agent run
    reasoning_mode = body.reasoning_effort if body.enable_thinking else 'none'
    
    agent_run = await client.table('agent_runs').insert({
        "thread_id": thread_id, 
        "status": "running",
        "reasoning_mode": reasoning_mode,
        "started_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    agent_run_id = agent_run.data[0]['id']
    structlog.contextvars.bind_contextvars(
        agent_run_id=agent_run_id,
    )
    logger.info(f"Created new agent run: {agent_run_id}")

    # Register this run in Redis with TTL using instance ID
    instance_key = f"active_run:{instance_id}:{agent_run_id}"
    try:
        await redis.set(instance_key, "running", ex=redis.REDIS_KEY_TTL)
    except Exception as e:
        logger.warning(f"Failed to register agent run in Redis ({instance_key}): {str(e)}")

    request_id = structlog.contextvars.get_contextvars().get('request_id')

    # Run the agent in the background
    run_agent_background.send(
        agent_run_id=agent_run_id, thread_id=thread_id, instance_id=instance_id,
        project_id=project_id,
        model_name=model_name,  # Already resolved above
        enable_thinking=body.enable_thinking, reasoning_effort=body.reasoning_effort,
        stream=body.stream, enable_context_manager=body.enable_context_manager,
        agent_config=agent_config,  # Pass agent configuration
        is_agent_builder=is_agent_builder,
        target_agent_id=target_agent_id,
        request_id=request_id,
        user_name=body.user_name,
    )

    return {"agent_run_id": agent_run_id, "status": "running"}

@router.post("/agent-run/{agent_run_id}/stop")
async def stop_agent(agent_run_id: str, user_id: str = Depends(get_current_user_id_from_jwt)):
    """Stop a running agent."""
    structlog.contextvars.bind_contextvars(
        agent_run_id=agent_run_id,
    )
    logger.info(f"Received request to stop agent run: {agent_run_id}")
    client = await db.client
    await get_agent_run_with_access_check(client, agent_run_id, user_id)
    await stop_agent_run(agent_run_id)
    return {"status": "stopped"}

@router.get("/thread/{thread_id}/agent-runs")
async def get_agent_runs(thread_id: str, user_id: str = Depends(get_current_user_id_from_jwt)):
    """Get all agent runs for a thread."""
    structlog.contextvars.bind_contextvars(
        thread_id=thread_id,
    )
    logger.info(f"Fetching agent runs for thread: {thread_id}")
    client = await db.client
    await verify_thread_access(client, thread_id, user_id)
    agent_runs = await client.table('agent_runs').select('*').eq("thread_id", thread_id).order('created_at', desc=True).execute()
    logger.debug(f"Found {len(agent_runs.data)} agent runs for thread: {thread_id}")
    return {"agent_runs": agent_runs.data}

@router.get("/agent-run/{agent_run_id}/credit-usage")
async def get_agent_run_credit_usage(
    agent_run_id: str, 
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Get detailed credit usage for a specific agent run."""
    structlog.contextvars.bind_contextvars(
        agent_run_id=agent_run_id,
    )
    logger.info(f"Fetching credit usage for agent run: {agent_run_id}")
    
    try:
        from services.credit_tracker import CreditTracker
        credit_tracker = CreditTracker()
        
        # Get credit usage summary
        usage_summary = await credit_tracker.get_credit_usage_summary(agent_run_id)
        
        # Get data provider specific stats
        provider_stats = await credit_tracker.get_data_provider_usage_stats(agent_run_id=agent_run_id)
        
        return {
            "agent_run_id": agent_run_id,
            "usage_summary": usage_summary,
            "data_provider_stats": provider_stats
        }
        
    except Exception as e:
        logger.error(f"Error fetching credit usage for agent run {agent_run_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch credit usage: {str(e)}")

@router.get("/credit-rates")
async def get_credit_rates(user_id: str = Depends(get_current_user_id_from_jwt)):
    """Get current credit rates for tools and data providers."""
    try:
        from services.credit_calculator import CreditCalculator
        credit_calc = CreditCalculator()
        
        return {
            "base_rates": {
                "conversation_per_minute": credit_calc.credit_rates['base_rate'],
                "reasoning_multipliers": {
                    "medium": credit_calc.credit_rates['reasoning_rate_medium'],
                    "high": credit_calc.credit_rates['reasoning_rate_high']
                }
            },
            "tool_costs": credit_calc.get_all_tool_costs(),
            "data_provider_costs": credit_calc.get_all_data_provider_costs()
        }
        
    except Exception as e:
        logger.error(f"Error fetching credit rates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch credit rates: {str(e)}")

@router.get("/data-provider/{provider_name}/cost-estimate")
async def get_data_provider_cost_estimate(
    provider_name: str,
    route: str = None,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Get cost estimate for a specific data provider call."""
    try:
        from services.credit_calculator import CreditCalculator
        credit_calc = CreditCalculator()
        
        estimate = credit_calc.estimate_data_provider_call_cost(provider_name, route)
        
        return estimate
        
    except Exception as e:
        logger.error(f"Error getting cost estimate for {provider_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get cost estimate: {str(e)}")

@router.get("/tools/cost-estimates")
async def get_all_tool_cost_estimates(user_id: str = Depends(get_current_user_id_from_jwt)):
    """Get cost estimates for all available tools."""
    try:
        from services.credit_calculator import CreditCalculator
        credit_calc = CreditCalculator()
        
        # Get all tool costs
        all_tool_costs = credit_calc.get_all_tool_costs()
        
        # Create enhanced estimates with descriptions and categorization
        tool_estimates = []
        
        # Tool categories and descriptions
        tool_info = {
            # Infrastructure & Automation Tools
            "sb_browser_tool": {
                "display_name": "Browser Tool",
                "description": "Automate web browsing, clicking, form filling, and page interaction",
                "category": "automation",
                "icon": "🌐"
            },
            "sb_deploy_tool": {
                "display_name": "Deploy Tool", 
                "description": "Deploy applications and services with automated deployment",
                "category": "infrastructure",
                "icon": "🚀"
            },
            "sb_shell_tool": {
                "display_name": "Terminal",
                "description": "Execute shell commands and CLI operations in tmux sessions",
                "category": "development",
                "icon": "💻"
            },
            "web_search_tool": {
                "display_name": "Web Search",
                "description": "Search the web using Tavily API and scrape webpages with Firecrawl",
                "category": "research",
                "icon": "🔍"
            },
            
            # File & Media Tools
            "sb_files_tool": {
                "display_name": "File Manager",
                "description": "Create, read, update, and delete files with comprehensive file management",
                "category": "files",
                "icon": "📁"
            },
            "sb_excel_tool": {
                "display_name": "Excel Operations",
                "description": "Create, read, write, and format Excel spreadsheets",
                "category": "files",
                "icon": "📊"
            },
            "sb_pdf_form_tool": {
                "display_name": "PDF Form Filler",
                "description": "Read form fields, fill forms, and flatten PDF documents",
                "category": "files", 
                "icon": "📄"
            },
            "sb_vision_tool": {
                "display_name": "Image Processing",
                "description": "Vision and image processing capabilities for visual content analysis",
                "category": "ai",
                "icon": "👁️"
            },
            "sb_audio_transcription_tool": {
                "display_name": "Audio Transcription",
                "description": "Transcribe audio files to text using speech recognition",
                "category": "ai",
                "icon": "🎤"
            },
            "sb_podcast_tool": {
                "display_name": "Audio Overviews",
                "description": "Generate audio summaries and overviews from content",
                "category": "ai",
                "icon": "🎧"
            },
            
            # Data Provider Tools
            "linkedin_data_provider": {
                "display_name": "LinkedIn Data Provider",
                "description": "Access LinkedIn profiles, company data, and professional information",
                "category": "data_providers",
                "icon": "💼"
            },
            "apollo_data_provider": {
                "display_name": "Apollo Data Provider", 
                "description": "Lead generation, contact enrichment, and company discovery",
                "category": "data_providers",
                "icon": "🎯"
            },
            "twitter_data_provider": {
                "display_name": "Twitter Data Provider",
                "description": "Access Twitter/X social media data and user information", 
                "category": "data_providers",
                "icon": "🐦"
            },
            "amazon_data_provider": {
                "display_name": "Amazon Data Provider",
                "description": "Product data, pricing, and marketplace information from Amazon",
                "category": "data_providers", 
                "icon": "📦"
            },
            "yahoo_finance_data_provider": {
                "display_name": "Yahoo Finance Data Provider",
                "description": "Financial data, stock prices, and market information",
                "category": "data_providers",
                "icon": "📈"
            },
            "zillow_data_provider": {
                "display_name": "Zillow Data Provider",
                "description": "Real estate data, property values, and market analytics",
                "category": "data_providers",
                "icon": "🏠"
            },
            "activejobs_data_provider": {
                "display_name": "Active Jobs Data Provider",
                "description": "Job search data and employment opportunity information",
                "category": "data_providers",
                "icon": "💼"
            },
            
            # System Tools
            "sb_expose_tool": {
                "display_name": "Port Exposure",
                "description": "Expose services and manage ports for application accessibility",
                "category": "system",
                "icon": "🔌"
            },
            "mcp_tool": {
                "display_name": "MCP Tools",
                "description": "External Model Context Protocol integrations",
                "category": "integrations", 
                "icon": "🔗"
            },
            "data_providers_tool": {
                "display_name": "Legacy Data Providers",
                "description": "Fallback for unspecified data provider calls",
                "category": "legacy",
                "icon": "🗃️"
            }
        }
        
        # Build tool estimates
        for tool_name, cost in all_tool_costs.items():
            if tool_name == "default":
                continue
                
            info = tool_info.get(tool_name, {
                "display_name": tool_name.replace('_', ' ').title(),
                "description": f"Tool: {tool_name}",
                "category": "other",
                "icon": "🔧"
            })
            
            # Determine cost tier
            if cost >= 3.0:
                cost_tier = "high"
                tier_color = "#ef4444"  # red
            elif cost >= 1.5:
                cost_tier = "medium" 
                tier_color = "#f59e0b"  # amber
            else:
                cost_tier = "low"
                tier_color = "#10b981"  # emerald
            
            estimate = {
                "tool_name": tool_name,
                "display_name": info["display_name"],
                "description": info["description"],
                "category": info["category"],
                "icon": info["icon"],
                "credit_cost": cost,
                "cost_tier": cost_tier,
                "tier_color": tier_color,
                "cost_explanation": f"{info['display_name']} costs {cost} credits per use"
            }
            
            tool_estimates.append(estimate)
        
        # Sort by category, then by cost (high to low)
        category_order = ["automation", "data_providers", "ai", "development", "files", "research", "infrastructure", "system", "integrations", "legacy", "other"]
        
        def sort_key(tool):
            category_index = category_order.index(tool["category"]) if tool["category"] in category_order else len(category_order)
            return (category_index, -tool["credit_cost"])  # negative cost for descending order
        
        tool_estimates.sort(key=sort_key)
        
        # Group by category for better organization
        categorized_tools = {}
        for tool in tool_estimates:
            category = tool["category"]
            if category not in categorized_tools:
                categorized_tools[category] = []
            categorized_tools[category].append(tool)
        
        # Calculate summary stats
        total_tools = len(tool_estimates)
        avg_cost = sum(tool["credit_cost"] for tool in tool_estimates) / total_tools if total_tools > 0 else 0
        high_cost_tools = len([t for t in tool_estimates if t["cost_tier"] == "high"])
        medium_cost_tools = len([t for t in tool_estimates if t["cost_tier"] == "medium"])
        low_cost_tools = len([t for t in tool_estimates if t["cost_tier"] == "low"])
        
        return {
            "summary": {
                "total_tools": total_tools,
                "average_cost": round(avg_cost, 2),
                "cost_distribution": {
                    "high_cost": high_cost_tools,
                    "medium_cost": medium_cost_tools, 
                    "low_cost": low_cost_tools
                }
            },
            "tools": tool_estimates,
            "categorized_tools": categorized_tools,
            "cost_tiers": {
                "high": {"min_cost": 3.0, "color": "#ef4444", "description": "Resource-intensive tools"},
                "medium": {"min_cost": 1.5, "color": "#f59e0b", "description": "Standard functionality tools"},
                "low": {"min_cost": 0.0, "color": "#10b981", "description": "Basic operation tools"}
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting tool cost estimates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get tool cost estimates: {str(e)}")

@router.get("/tools/costs")
async def get_all_tool_costs_simple(user_id: str = Depends(get_current_user_id_from_jwt)):
    """Get a simple list of all tool costs."""
    try:
        from services.credit_calculator import CreditCalculator
        credit_calc = CreditCalculator()
        
        # Get all tool costs
        all_tool_costs = credit_calc.get_all_tool_costs()
        
        # Create simple mapping of display names to costs
        tool_display_names = {
            "sb_browser_tool": "Browser Tool",
            "sb_deploy_tool": "Deploy Tool", 
            "sb_shell_tool": "Terminal",
            "web_search_tool": "Web Search",
            "sb_files_tool": "File Manager",
            "sb_excel_tool": "Excel Operations",
            "sb_pdf_form_tool": "PDF Form Filler",
            "sb_vision_tool": "Image Processing",
            "sb_audio_transcription_tool": "Audio Transcription",
            "sb_podcast_tool": "Audio Overviews",
            "linkedin_data_provider": "LinkedIn Data Provider",
            "apollo_data_provider": "Apollo Data Provider",
            "twitter_data_provider": "Twitter Data Provider",
            "amazon_data_provider": "Amazon Data Provider",
            "yahoo_finance_data_provider": "Yahoo Finance Data Provider",
            "zillow_data_provider": "Zillow Data Provider",
            "activejobs_data_provider": "Active Jobs Data Provider",
            "sb_expose_tool": "Port Exposure",
            "mcp_tool": "MCP Tools",
            "data_providers_tool": "Legacy Data Providers"
        }
        
        simplified_costs = {}
        for tool_name, cost in all_tool_costs.items():
            if tool_name == "default":
                continue
            display_name = tool_display_names.get(tool_name, tool_name.replace('_', ' ').title())
            simplified_costs[display_name] = cost
        
        # Sort by cost (high to low)
        sorted_costs = dict(sorted(simplified_costs.items(), key=lambda x: x[1], reverse=True))
        
        return {
            "tool_costs": sorted_costs,
            "total_tools": len(sorted_costs),
            "cost_range": {
                "highest": max(sorted_costs.values()) if sorted_costs else 0,
                "lowest": min(sorted_costs.values()) if sorted_costs else 0,
                "average": round(sum(sorted_costs.values()) / len(sorted_costs), 2) if sorted_costs else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting simple tool costs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get tool costs: {str(e)}")

@router.get("/agent-run/{agent_run_id}")
async def get_agent_run(agent_run_id: str, user_id: str = Depends(get_current_user_id_from_jwt)):
    """Get agent run status and responses."""
    structlog.contextvars.bind_contextvars(
        agent_run_id=agent_run_id,
    )
    logger.info(f"Fetching agent run details: {agent_run_id}")
    client = await db.client
    agent_run_data = await get_agent_run_with_access_check(client, agent_run_id, user_id)
    # Note: Responses are not included here by default, they are in the stream or DB
    return {
        "id": agent_run_data['id'],
        "threadId": agent_run_data['thread_id'],
        "status": agent_run_data['status'],
        "startedAt": agent_run_data['started_at'],
        "completedAt": agent_run_data['completed_at'],
        "error": agent_run_data['error']
    }

@router.get("/thread/{thread_id}/agent", response_model=ThreadAgentResponse)
async def get_thread_agent(thread_id: str, user_id: str = Depends(get_current_user_id_from_jwt)):
    """Get the agent details for a specific thread."""
    structlog.contextvars.bind_contextvars(
        thread_id=thread_id,
    )
    logger.info(f"Fetching agent details for thread: {thread_id}")
    client = await db.client
    
    try:
        # Verify thread access and get thread data including agent_id
        await verify_thread_access(client, thread_id, user_id)
        thread_result = await client.table('threads').select('agent_id', 'account_id').eq('thread_id', thread_id).execute()
        
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        thread_data = thread_result.data[0]
        thread_agent_id = thread_data.get('agent_id')
        account_id = thread_data.get('account_id')
        
        # If no agent_id is set in the thread, try to get the default agent
        effective_agent_id = thread_agent_id
        agent_source = "thread"
        
        if not effective_agent_id:
            # No agent set in thread, get default agent for the account
            default_agent_result = await client.table('agents').select('agent_id').eq('account_id', account_id).eq('is_default', True).execute()
            if default_agent_result.data:
                effective_agent_id = default_agent_result.data[0]['agent_id']
                agent_source = "default"
            else:
                # No default agent found
                return {
                    "agent": None,
                    "source": "none",
                    "message": "No agent configured for this thread"
                }
        
        # Fetch the agent details
        agent_result = await client.table('agents').select('*').eq('agent_id', effective_agent_id).eq('account_id', account_id).execute()
        
        if not agent_result.data:
            # Agent was deleted or doesn't exist
            return {
                "agent": None,
                "source": "missing",
                "message": f"Agent {effective_agent_id} not found or was deleted"
            }
        
        agent_data = agent_result.data[0]
        
        return {
            "agent": AgentResponse(
                agent_id=agent_data['agent_id'],
                account_id=agent_data['account_id'],
                name=agent_data['name'],
                description=agent_data.get('description'),
                system_prompt=agent_data['system_prompt'],
                configured_mcps=agent_data.get('configured_mcps', []),
                custom_mcps=agent_data.get('custom_mcps', []),
                agentpress_tools=agent_data.get('agentpress_tools', {}),
                is_default=agent_data.get('is_default', False),
                is_public=agent_data.get('is_public', False),
                visibility=agent_data.get('visibility', 'private'),
                marketplace_published_at=agent_data.get('marketplace_published_at'),
                download_count=agent_data.get('download_count', 0),
                tags=agent_data.get('tags', []),
                avatar=agent_data.get('avatar'),
                avatar_color=agent_data.get('avatar_color'),
                created_at=agent_data['created_at'],
                updated_at=agent_data['updated_at']
            ),
            "source": agent_source,
            "message": f"Using {agent_source} agent: {agent_data['name']}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching agent for thread {thread_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch thread agent: {str(e)}")

@router.get("/agent-run/{agent_run_id}/stream")
async def stream_agent_run(
    agent_run_id: str,
    token: Optional[str] = None,
    request: Request = None
):
    """Stream the responses of an agent run using Redis Lists and Pub/Sub."""
    logger.info(f"Starting stream for agent run: {agent_run_id}")
    client = await db.client

    user_id = await get_user_id_from_stream_auth(request, token)
    agent_run_data = await get_agent_run_with_access_check(client, agent_run_id, user_id)

    structlog.contextvars.bind_contextvars(
        agent_run_id=agent_run_id,
        user_id=user_id,
    )

    response_list_key = f"agent_run:{agent_run_id}:responses"
    response_channel = f"agent_run:{agent_run_id}:new_response"
    control_channel = f"agent_run:{agent_run_id}:control" # Global control channel

    async def stream_generator():
        logger.debug(f"Streaming responses for {agent_run_id} using Redis list {response_list_key} and channel {response_channel}")
        last_processed_index = -1
        pubsub_response = None
        pubsub_control = None
        listener_task = None
        terminate_stream = False
        initial_yield_complete = False

        try:
            # 1. Fetch and yield initial responses from Redis list
            initial_responses_json = await redis.lrange(response_list_key, 0, -1)
            initial_responses = []
            if initial_responses_json:
                initial_responses = [json.loads(r) for r in initial_responses_json]
                logger.debug(f"Sending {len(initial_responses)} initial responses for {agent_run_id}")
                for response in initial_responses:
                    yield f"data: {json.dumps(response)}\n\n"
                last_processed_index = len(initial_responses) - 1
            initial_yield_complete = True

            # 2. Check run status *after* yielding initial data
            run_status = await client.table('agent_runs').select('status', 'thread_id').eq("id", agent_run_id).maybe_single().execute()
            current_status = run_status.data.get('status') if run_status.data else None

            if current_status != 'running':
                logger.info(f"Agent run {agent_run_id} is not running (status: {current_status}). Ending stream.")
                yield f"data: {json.dumps({'type': 'status', 'status': 'completed'})}\n\n"
                return
          
            structlog.contextvars.bind_contextvars(
                thread_id=run_status.data.get('thread_id'),
            )

            # 3. Set up Pub/Sub listeners for new responses and control signals
            pubsub_response = await redis.create_pubsub()
            await pubsub_response.subscribe(response_channel)
            logger.debug(f"Subscribed to response channel: {response_channel}")

            pubsub_control = await redis.create_pubsub()
            await pubsub_control.subscribe(control_channel)
            logger.debug(f"Subscribed to control channel: {control_channel}")

            # Queue to communicate between listeners and the main generator loop
            message_queue = asyncio.Queue()

            async def listen_messages():
                response_reader = pubsub_response.listen()
                control_reader = pubsub_control.listen()
                tasks = [asyncio.create_task(response_reader.__anext__()), asyncio.create_task(control_reader.__anext__())]

                while not terminate_stream:
                    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                    for task in done:
                        try:
                            message = task.result()
                            if message and isinstance(message, dict) and message.get("type") == "message":
                                channel = message.get("channel")
                                data = message.get("data")
                                if isinstance(data, bytes): data = data.decode('utf-8')

                                if channel == response_channel and data == "new":
                                    await message_queue.put({"type": "new_response"})
                                elif channel == control_channel and data in ["STOP", "END_STREAM", "ERROR"]:
                                    logger.info(f"Received control signal '{data}' for {agent_run_id}")
                                    await message_queue.put({"type": "control", "data": data})
                                    return # Stop listening on control signal

                        except StopAsyncIteration:
                            logger.warning(f"Listener {task} stopped.")
                            # Decide how to handle listener stopping, maybe terminate?
                            await message_queue.put({"type": "error", "data": "Listener stopped unexpectedly"})
                            return
                        except Exception as e:
                            logger.error(f"Error in listener for {agent_run_id}: {e}")
                            await message_queue.put({"type": "error", "data": "Listener failed"})
                            return
                        finally:
                            # Reschedule the completed listener task
                            if task in tasks:
                                tasks.remove(task)
                                if message and isinstance(message, dict) and message.get("channel") == response_channel:
                                     tasks.append(asyncio.create_task(response_reader.__anext__()))
                                elif message and isinstance(message, dict) and message.get("channel") == control_channel:
                                     tasks.append(asyncio.create_task(control_reader.__anext__()))

                # Cancel pending listener tasks on exit
                for p_task in pending: p_task.cancel()
                for task in tasks: task.cancel()


            listener_task = asyncio.create_task(listen_messages())

            # 4. Main loop to process messages from the queue
            while not terminate_stream:
                try:
                    queue_item = await message_queue.get()

                    if queue_item["type"] == "new_response":
                        # Fetch new responses from Redis list starting after the last processed index
                        new_start_index = last_processed_index + 1
                        new_responses_json = await redis.lrange(response_list_key, new_start_index, -1)

                        if new_responses_json:
                            new_responses = [json.loads(r) for r in new_responses_json]
                            num_new = len(new_responses)
                            # logger.debug(f"Received {num_new} new responses for {agent_run_id} (index {new_start_index} onwards)")
                            for response in new_responses:
                                yield f"data: {json.dumps(response)}\n\n"
                                # Check if this response signals completion
                                if response.get('type') == 'status' and response.get('status') in ['completed', 'failed', 'stopped']:
                                    logger.info(f"Detected run completion via status message in stream: {response.get('status')}")
                                    terminate_stream = True
                                    break # Stop processing further new responses
                            last_processed_index += num_new
                        if terminate_stream: break

                    elif queue_item["type"] == "control":
                        control_signal = queue_item["data"]
                        terminate_stream = True # Stop the stream on any control signal
                        yield f"data: {json.dumps({'type': 'status', 'status': control_signal})}\n\n"
                        break

                    elif queue_item["type"] == "error":
                        logger.error(f"Listener error for {agent_run_id}: {queue_item['data']}")
                        terminate_stream = True
                        yield f"data: {json.dumps({'type': 'status', 'status': 'error'})}\n\n"
                        break

                except asyncio.CancelledError:
                     logger.info(f"Stream generator main loop cancelled for {agent_run_id}")
                     terminate_stream = True
                     break
                except Exception as loop_err:
                    logger.error(f"Error in stream generator main loop for {agent_run_id}: {loop_err}", exc_info=True)
                    terminate_stream = True
                    yield f"data: {json.dumps({'type': 'status', 'status': 'error', 'message': f'Stream failed: {loop_err}'})}\n\n"
                    break

        except Exception as e:
            logger.error(f"Error setting up stream for agent run {agent_run_id}: {e}", exc_info=True)
            # Only yield error if initial yield didn't happen
            if not initial_yield_complete:
                 yield f"data: {json.dumps({'type': 'status', 'status': 'error', 'message': f'Failed to start stream: {e}'})}\n\n"
        finally:
            terminate_stream = True
            # Graceful shutdown order: unsubscribe → close → cancel
            if pubsub_response: await pubsub_response.unsubscribe(response_channel)
            if pubsub_control: await pubsub_control.unsubscribe(control_channel)
            if pubsub_response: await pubsub_response.close()
            if pubsub_control: await pubsub_control.close()

            if listener_task:
                listener_task.cancel()
                try:
                    await listener_task  # Reap inner tasks & swallow their errors
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.debug(f"listener_task ended with: {e}")
            # Wait briefly for tasks to cancel
            await asyncio.sleep(0.1)
            logger.debug(f"Streaming cleanup complete for agent run: {agent_run_id}")

    return StreamingResponse(stream_generator(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive",
        "X-Accel-Buffering": "no", "Content-Type": "text/event-stream",
        "Access-Control-Allow-Origin": "*"
    })

async def generate_and_update_project_name(project_id: str, prompt: str):
    """Generates a project name using an LLM and updates the database."""
    logger.info(f"Starting background task to generate name for project: {project_id}")
    try:
        db_conn = DBConnection()
        client = await db_conn.client

        model_name = "openai/gpt-4o-mini"
        system_prompt = "You are a helpful assistant that generates extremely concise titles (2-4 words maximum) for chat threads based on the user's message. Respond with only the title, no other text or punctuation."
        user_message = f"Generate an extremely brief title (2-4 words only) for a chat thread that starts with this message: \"{prompt}\""
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_message}]

        logger.debug(f"Calling LLM ({model_name}) for project {project_id} naming.")
        response = await make_llm_api_call(messages=messages, model_name=model_name, max_tokens=20, temperature=0.7)

        generated_name = None
        if response and response.get('choices') and response['choices'][0].get('message'):
            raw_name = response['choices'][0]['message'].get('content', '').strip()
            cleaned_name = raw_name.strip('\'" \n\t')
            if cleaned_name:
                generated_name = cleaned_name
                logger.info(f"LLM generated name for project {project_id}: '{generated_name}'")
            else:
                logger.warning(f"LLM returned an empty name for project {project_id}.")
        else:
            logger.warning(f"Failed to get valid response from LLM for project {project_id} naming. Response: {response}")

        if generated_name:
            update_result = await client.table('projects').update({"name": generated_name}).eq("project_id", project_id).execute()
            if hasattr(update_result, 'data') and update_result.data:
                logger.info(f"Successfully updated project {project_id} name to '{generated_name}'")
            else:
                logger.error(f"Failed to update project {project_id} name in database. Update result: {update_result}")
        else:
            logger.warning(f"No generated name, skipping database update for project {project_id}.")

    except Exception as e:
        logger.error(f"Error in background naming task for project {project_id}: {str(e)}\n{traceback.format_exc()}")
    finally:
        # No need to disconnect DBConnection singleton instance here
        logger.info(f"Finished background naming task for project: {project_id}")

@router.post("/agent/initiate", response_model=InitiateAgentResponse)
async def initiate_agent_with_files(
    prompt: str = Form(...),
    model_name: Optional[str] = Form(None),  # Default to None to use config.MODEL_TO_USE
    enable_thinking: Optional[bool] = Form(False),
    reasoning_effort: Optional[str] = Form("low"),
    stream: Optional[bool] = Form(True),
    enable_context_manager: Optional[bool] = Form(False),
    agent_id: Optional[str] = Form(None),  # Add agent_id parameter
    files: List[UploadFile] = File(default=[]),
    is_agent_builder: Optional[bool] = Form(False),
    target_agent_id: Optional[str] = Form(None),
    user_name: Optional[str] = Form(None),
    account_id: Optional[str] = Form(None),  # Add account_id parameter for team context
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Initiate a new agent session with optional file attachments."""
    global instance_id # Ensure instance_id is accessible
    if not instance_id:
        raise HTTPException(status_code=500, detail="Agent API not initialized with instance ID")

    # Use model from config if not specified in the request
    logger.info(f"Original model_name from request: {model_name}")
    

    if model_name is None:
        model_name = config.MODEL_TO_USE
        logger.info(f"Using model from config: {model_name}")

    # Log the model name after alias resolution
    resolved_model = MODEL_NAME_ALIASES.get(model_name, model_name)
    logger.info(f"Resolved model name: {resolved_model}")

    # Update model_name to use the resolved version
    model_name = resolved_model

    logger.info(f"Starting new agent in agent builder mode: {is_agent_builder}, target_agent_id: {target_agent_id}")

    logger.info(f"[\033[91mDEBUG\033[0m] Initiating new agent with prompt and {len(files)} files (Instance: {instance_id}), model: {model_name}, enable_thinking: {enable_thinking}")
    client = await db.client
    
    # Determine the account_id to use
    effective_account_id = account_id if account_id else user_id  # Default to personal account if not specified
    
    # Verify user has access to the specified account (if different from personal)
    if account_id and account_id != user_id:
        # Check if user has access to this account via basejump account_user table
        account_access = await client.schema('basejump').from_('account_user').select('account_role').eq('user_id', user_id).eq('account_id', account_id).execute()
        if not (account_access.data and len(account_access.data) > 0):
            logger.warning(f"User {user_id} attempted to access account {account_id} without permission")
            raise HTTPException(status_code=403, detail="Not authorized to access this account")
        logger.info(f"User {user_id} has access to account {account_id} with role: {account_access.data[0]['account_role']}")
    else:
        logger.info(f"Using personal account {user_id} for agent initiation")
    
    # Load agent configuration if agent_id is provided
    agent_config = None
    if agent_id:
        # Use the same access logic as get_agent endpoint
        agent_result = await client.table('agents').select('*').eq('agent_id', agent_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found")
            
        agent_data = agent_result.data[0]
        
        # Check access: owner, public agent, or agent in user's library
        has_access = False
        if agent_data['account_id'] == user_id:
            # User owns the agent
            has_access = True
        elif agent_data.get('is_public', False):
            # Public agent
            has_access = True
        else:
            # Check if user has this agent in their library (either managed or copied)
            library_check = await client.table('user_agent_library').select('*').eq(
                'user_account_id', user_id
            ).eq('agent_id', agent_id).execute()
            
            if library_check.data:
                has_access = True
                # Apply sharing preferences filtering for managed agents
                library_entry = library_check.data[0]
                is_managed_by_user = (library_entry['agent_id'] == library_entry['original_agent_id'])
                if is_managed_by_user:
                    sharing_prefs = agent_data.get('sharing_preferences', {})
                    if not sharing_prefs.get('include_knowledge_bases', True):
                        agent_data['knowledge_bases'] = []
                    if not sharing_prefs.get('include_custom_mcp_tools', True):
                        agent_data['configured_mcps'] = []
                        agent_data['custom_mcps'] = []
        
        if not has_access:
            raise HTTPException(status_code=404, detail="Agent not found or access denied")
            
        agent_config = agent_data
        logger.info(f"Using custom agent: {agent_config['name']} ({agent_id})")
    else:
        # Try to get default agent for the account
        default_agent_result = await client.table('agents').select('*').eq('account_id', effective_account_id).eq('is_default', True).execute()
        if default_agent_result.data:
            agent_config = default_agent_result.data[0]
            logger.info(f"Using default agent: {agent_config['name']} ({agent_config['agent_id']})")
    
    can_use, model_message, allowed_models = await can_use_model(client, effective_account_id, model_name)
    if not can_use:
        raise HTTPException(status_code=403, detail={"message": model_message, "allowed_models": allowed_models})

    can_run, message, subscription = await check_billing_status(client, effective_account_id)
    if not can_run:
        raise HTTPException(status_code=402, detail={"message": message, "subscription": subscription})

    try:
        # 1. Create Project
        placeholder_name = f"{prompt[:30]}..." if len(prompt) > 30 else prompt
        project = await client.table('projects').insert({
            "project_id": str(uuid.uuid4()), "account_id": effective_account_id, "name": placeholder_name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        project_id = project.data[0]['project_id']
        logger.info(f"Created new project: {project_id} for account: {effective_account_id}")

        # 2. Create Sandbox
        sandbox_id = None
        try:
          sandbox_pass = str(uuid.uuid4())
          sandbox = create_sandbox(sandbox_pass, project_id)
          sandbox_id = sandbox.id
          logger.info(f"Created new sandbox {sandbox_id} for project {project_id}")
          
          # Get preview links
          vnc_link = sandbox.get_preview_link(6080)
          website_link = sandbox.get_preview_link(8080)
          vnc_url = vnc_link.url if hasattr(vnc_link, 'url') else str(vnc_link).split("url='")[1].split("'")[0]
          website_url = website_link.url if hasattr(website_link, 'url') else str(website_link).split("url='")[1].split("'")[0]
          token = None
          if hasattr(vnc_link, 'token'):
              token = vnc_link.token
          elif "token='" in str(vnc_link):
              token = str(vnc_link).split("token='")[1].split("'")[0]
        except Exception as e:
            logger.error(f"Error creating sandbox: {str(e)}")
            await client.table('projects').delete().eq('project_id', project_id).execute()
            if sandbox_id:
              try: await delete_sandbox(sandbox_id)
              except Exception as e: pass
            raise Exception("Failed to create sandbox")


        # Update project with sandbox info
        update_result = await client.table('projects').update({
            'sandbox': {
                'id': sandbox_id, 'pass': sandbox_pass, 'vnc_preview': vnc_url,
                'sandbox_url': website_url, 'token': token
            }
        }).eq('project_id', project_id).execute()

        if not update_result.data:
            logger.error(f"Failed to update project {project_id} with new sandbox {sandbox_id}")
            if sandbox_id:
              try: await delete_sandbox(sandbox_id)
              except Exception as e: logger.error(f"Error deleting sandbox: {str(e)}")
            raise Exception("Database update failed")

        # 3. Create Thread
        thread_data = {
            "thread_id": str(uuid.uuid4()), 
            "project_id": project_id, 
            "account_id": effective_account_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        structlog.contextvars.bind_contextvars(
            thread_id=thread_data["thread_id"],
            project_id=project_id,
            account_id=effective_account_id,
        )
        
        # Store the agent_id in the thread if we have one
        if agent_config:
            thread_data["agent_id"] = agent_config['agent_id']
            logger.info(f"Storing agent_id {agent_config['agent_id']} in thread")
            structlog.contextvars.bind_contextvars(
                agent_id=agent_config['agent_id'],
            )
        
        # Store agent builder metadata if this is an agent builder session
        if is_agent_builder:
            thread_data["metadata"] = {
                "is_agent_builder": True,
                "target_agent_id": target_agent_id
            }
            logger.info(f"Storing agent builder metadata in thread: target_agent_id={target_agent_id}")
            structlog.contextvars.bind_contextvars(
                target_agent_id=target_agent_id,
            )
        
        thread = await client.table('threads').insert(thread_data).execute()
        thread_id = thread.data[0]['thread_id']
        logger.info(f"Created new thread: {thread_id} for account: {effective_account_id}")

        # Trigger Background Naming Task
        asyncio.create_task(generate_and_update_project_name(project_id=project_id, prompt=prompt))

        # 4. Upload Files to Sandbox (if any)
        message_content = prompt
        if files:
            successful_uploads = []
            failed_uploads = []
            for file in files:
                if file.filename:
                    try:
                        safe_filename = file.filename.replace('/', '_').replace('\\', '_')
                        target_path = f"/workspace/{safe_filename}"
                        logger.info(f"Attempting to upload {safe_filename} to {target_path} in sandbox {sandbox_id}")
                        content = await file.read()
                        upload_successful = False
                        try:
                            if hasattr(sandbox, 'fs') and hasattr(sandbox.fs, 'upload_file'):
                                import inspect
                                if inspect.iscoroutinefunction(sandbox.fs.upload_file):
                                    await sandbox.fs.upload_file(content, target_path)
                                else:
                                    sandbox.fs.upload_file(content, target_path)
                                logger.debug(f"Called sandbox.fs.upload_file for {target_path}")
                                upload_successful = True
                            else:
                                raise NotImplementedError("Suitable upload method not found on sandbox object.")
                        except Exception as upload_error:
                            logger.error(f"Error during sandbox upload call for {safe_filename}: {str(upload_error)}", exc_info=True)

                        if upload_successful:
                            try:
                                await asyncio.sleep(0.2)
                                parent_dir = os.path.dirname(target_path)
                                files_in_dir = sandbox.fs.list_files(parent_dir)
                                file_names_in_dir = [f.name for f in files_in_dir]
                                if safe_filename in file_names_in_dir:
                                    successful_uploads.append(target_path)
                                    logger.info(f"Successfully uploaded and verified file {safe_filename} to sandbox path {target_path}")
                                else:
                                    logger.error(f"Verification failed for {safe_filename}: File not found in {parent_dir} after upload attempt.")
                                    failed_uploads.append(safe_filename)
                            except Exception as verify_error:
                                logger.error(f"Error verifying file {safe_filename} after upload: {str(verify_error)}", exc_info=True)
                                failed_uploads.append(safe_filename)
                        else:
                            failed_uploads.append(safe_filename)
                    except Exception as file_error:
                        logger.error(f"Error processing file {file.filename}: {str(file_error)}", exc_info=True)
                        failed_uploads.append(file.filename)
                    finally:
                        await file.close()

            if successful_uploads:
                message_content += "\n\n" if message_content else ""
                for file_path in successful_uploads: message_content += f"[Uploaded File: {file_path}]\n"
            if failed_uploads:
                message_content += "\n\nThe following files failed to upload:\n"
                for failed_file in failed_uploads: message_content += f"- {failed_file}\n"

        # 5. Add initial user message to thread
        message_id = str(uuid.uuid4())
        message_payload = {"role": "user", "content": message_content}
        await client.table('messages').insert({
            "message_id": message_id, "thread_id": thread_id, "type": "user",
            "is_llm_message": True, "content": json.dumps(message_payload),
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        # 6. Start Agent Run with reasoning mode
        reasoning_mode = reasoning_effort if enable_thinking else 'none'
        
        agent_run = await client.table('agent_runs').insert({
            "thread_id": thread_id, 
            "status": "running",
            "reasoning_mode": reasoning_mode,
            "started_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        agent_run_id = agent_run.data[0]['id']
        logger.info(f"Created new agent run: {agent_run_id}")
        structlog.contextvars.bind_contextvars(
            agent_run_id=agent_run_id,
        )

        # Register run in Redis
        instance_key = f"active_run:{instance_id}:{agent_run_id}"
        try:
            await redis.set(instance_key, "running", ex=redis.REDIS_KEY_TTL)
        except Exception as e:
            logger.warning(f"Failed to register agent run in Redis ({instance_key}): {str(e)}")

        request_id = structlog.contextvars.get_contextvars().get('request_id')

        # Run agent in background
        run_agent_background.send(
            agent_run_id=agent_run_id, thread_id=thread_id, instance_id=instance_id,
            project_id=project_id,
            model_name=model_name,  # Already resolved above
            enable_thinking=enable_thinking, reasoning_effort=reasoning_effort,
            stream=stream, enable_context_manager=enable_context_manager,
            agent_config=agent_config,  # Pass agent configuration
            is_agent_builder=is_agent_builder,
            target_agent_id=target_agent_id,
            request_id=request_id,
            user_name=user_name,
        )

        return {"thread_id": thread_id, "agent_run_id": agent_run_id}

    except Exception as e:
        logger.error(f"Error in agent initiation: {str(e)}\n{traceback.format_exc()}")
        # TODO: Clean up created project/thread if initiation fails mid-way
        raise HTTPException(status_code=500, detail=f"Failed to initiate agent session: {str(e)}")



# Custom agents



@router.get("/agents", response_model=AgentsResponse)
async def get_agents(
    user_id: str = Depends(get_current_user_id_from_jwt),
    page: Optional[int] = Query(1, ge=1, description="Page number (1-based)"),
    limit: Optional[int] = Query(20, ge=1, le=100, description="Number of items per page"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    sort_by: Optional[str] = Query("created_at", description="Sort field: name, created_at, updated_at, tools_count"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc, desc"),
    has_default: Optional[bool] = Query(None, description="Filter by default agents"),
    has_mcp_tools: Optional[bool] = Query(None, description="Filter by agents with MCP tools"),
    has_agentpress_tools: Optional[bool] = Query(None, description="Filter by agents with AgentPress tools"),
    tools: Optional[str] = Query(None, description="Comma-separated list of tools to filter by"),
    account_id: Optional[str] = Query(None, description="Filter by specific account ID (for team contexts)")
):
    """Get agents for the current user with pagination, search, sort, and filter support."""
    if not await is_enabled("custom_agents"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agents currently disabled. This feature is not available at the moment."
        )
    logger.info(f"Fetching agents for user: {user_id} with page={page}, limit={limit}, search='{search}', sort_by={sort_by}, sort_order={sort_order}")
    client = await db.client
    
    try:
        # Calculate offset
        offset = (page - 1) * limit
        
        # Use account_id if provided (for team contexts), otherwise use user_id
        filter_account_id = account_id if account_id else user_id
        use_marketplace_data = False
        
        # If account_id is provided, we need to use a different query that includes team-shared agents
        if account_id and account_id != user_id:
            # Simplified validation: Let database RLS policies handle access control
            # The complex validation was causing schema access issues with basejump tables
            # If user doesn't have access, the query will return empty results due to RLS policies
            pass
            
            # For team accounts, use the database function that handles complex visibility logic
            # This includes: owned agents, team-shared agents, and public agents
            # Get a larger set first to allow for post-processing filters
            marketplace_result = await client.rpc('get_marketplace_agents', {
                'p_limit': limit * 3,  # Get more than needed for post-processing
                'p_offset': 0,  # Always start from beginning for filtering
                'p_search': search,
                'p_tags': None,
                'p_account_id': account_id
            }).execute()
            
            if not marketplace_result.data:
                marketplace_result.data = []
            
            # Convert marketplace result to agents format and continue with existing logic
            agents_data = marketplace_result.data
            total_count = len(agents_data)  # This will be recalculated after filters
            
            # Apply additional filters and sorting as needed
            if has_default is not None:
                agents_data = [a for a in agents_data if a.get('is_default') == has_default]
            
            # The rest of the filtering will be handled by the existing post-processing logic
            # Skip the normal query execution for team accounts
            use_marketplace_data = True
        else:
            # For personal accounts, just show their own agents
            query = client.table('agents').select('*', count='exact').eq("account_id", filter_account_id)
        
        # Execute query only if not using marketplace data
        if not use_marketplace_data:
            # Get both owned agents and managed agents (references)
            
            # 1. Get owned agents
            owned_query = client.table('agents').select('*').eq("account_id", filter_account_id)
            
            # Apply search filter to owned agents
            if search:
                search_term = f"%{search}%"
                owned_query = owned_query.or_(f"name.ilike.{search_term},description.ilike.{search_term}")
            
            # Apply filters to owned agents
            if has_default is not None:
                owned_query = owned_query.eq("is_default", has_default)
            
            owned_result = await owned_query.execute()
            owned_agents = owned_result.data or []
            
            # Add metadata to mark as owned
            for agent in owned_agents:
                agent['_is_managed'] = False
                agent['_is_owned'] = True
            
            # 2. Get managed agents (references from user_agent_library)
            # For managed agents, agent_id equals original_agent_id (indicating it's a reference, not a copy)
            managed_query = await client.rpc('get_managed_agents_for_user', {
                'p_user_id': filter_account_id
            }).execute()
            
            managed_agents = []
            if managed_query.data:
                # Get the actual agent data for managed agents
                managed_agent_ids = [ref['agent_id'] for ref in managed_query.data]
                if managed_agent_ids:
                    managed_agents_query = client.table('agents').select('*').in_('agent_id', managed_agent_ids)
                    
                    # Apply search filter to managed agents
                    if search:
                        search_term = f"%{search}%"
                        managed_agents_query = managed_agents_query.or_(f"name.ilike.{search_term},description.ilike.{search_term}")
                    
                    managed_result = await managed_agents_query.execute()
                    managed_agents = managed_result.data or []
                    
                    # Add metadata to mark as managed and apply sharing preferences filtering
                    for agent in managed_agents:
                        agent['_is_managed'] = True
                        agent['_is_owned'] = False
                        # Don't show "(from marketplace)" suffix for managed agents since they're live references
                        
                        # Apply sharing preferences filtering for managed agents
                        sharing_prefs = agent.get('sharing_preferences', {})
                        if not sharing_prefs.get('include_knowledge_bases', True):
                            agent['knowledge_bases'] = []
                        if not sharing_prefs.get('include_custom_mcp_tools', True):
                            agent['configured_mcps'] = []
                            agent['custom_mcps'] = []
            
            # 3. Combine owned and managed agents
            agents_data = owned_agents + managed_agents
            
            # Apply default filter after combining
            if has_default is not None:
                agents_data = [a for a in agents_data if a.get('is_default') == has_default]
            
            # Apply sorting
            if sort_by == "name":
                agents_data.sort(key=lambda x: x.get('name', '').lower(), reverse=(sort_order == "desc"))
            elif sort_by == "updated_at":
                agents_data.sort(key=lambda x: x.get('updated_at', ''), reverse=(sort_order == "desc"))
            elif sort_by == "created_at":
                agents_data.sort(key=lambda x: x.get('created_at', ''), reverse=(sort_order == "desc"))
            else:
                # Default to created_at
                agents_data.sort(key=lambda x: x.get('created_at', ''), reverse=(sort_order == "desc"))
            
            total_count = len(agents_data)
        
        # Apply tool-based filters (works for both marketplace and regular data)
        if has_mcp_tools is not None or has_agentpress_tools is not None or tools:
            filtered_agents = []
            tools_filter = []
            if tools:
                tools_filter = [tool.strip() for tool in tools.split(',') if tool.strip()]
            
            for agent in agents_data:
                # Check MCP tools filter
                if has_mcp_tools is not None:
                    has_mcp = bool(agent.get('configured_mcps') and len(agent.get('configured_mcps', [])) > 0)
                    if has_mcp_tools != has_mcp:
                        continue
                
                # Check AgentPress tools filter
                if has_agentpress_tools is not None:
                    agentpress_tools = agent.get('agentpress_tools', {})
                    has_enabled_tools = any(
                        tool_data and isinstance(tool_data, dict) and tool_data.get('enabled', False)
                        for tool_data in agentpress_tools.values()
                    )
                    if has_agentpress_tools != has_enabled_tools:
                        continue
                
                # Check specific tools filter
                if tools_filter:
                    agent_tools = set()
                    # Add MCP tools
                    for mcp in agent.get('configured_mcps', []):
                        if isinstance(mcp, dict) and 'name' in mcp:
                            agent_tools.add(f"mcp:{mcp['name']}")
                    
                    # Add enabled AgentPress tools
                    for tool_name, tool_data in agent.get('agentpress_tools', {}).items():
                        if tool_data and isinstance(tool_data, dict) and tool_data.get('enabled', False):
                            agent_tools.add(f"agentpress:{tool_name}")
                    
                    # Check if any of the requested tools are present
                    if not any(tool in agent_tools for tool in tools_filter):
                        continue
                
                filtered_agents.append(agent)
            
            agents_data = filtered_agents
        
        # Handle tools_count sorting (post-processing required)
        if sort_by == "tools_count":
            def get_tools_count(agent):
                mcp_count = len(agent.get('configured_mcps', []))
                agentpress_count = sum(
                    1 for tool_data in agent.get('agentpress_tools', {}).values()
                    if tool_data and isinstance(tool_data, dict) and tool_data.get('enabled', False)
                )
                return mcp_count + agentpress_count
            
            agents_data.sort(key=get_tools_count, reverse=(sort_order == "desc"))
        
        # Apply pagination to filtered results if we did post-processing or used marketplace data
        if has_mcp_tools is not None or has_agentpress_tools is not None or tools or sort_by == "tools_count" or use_marketplace_data:
            total_count = len(agents_data)
            agents_data = agents_data[offset:offset + limit]
        
        # Format the response
        agent_list = []
        for agent in agents_data:
                            agent_list.append(AgentResponse(
                agent_id=agent['agent_id'],
                account_id=agent['account_id'],
                name=agent['name'],
                description=agent.get('description'),
                system_prompt=agent['system_prompt'],
                configured_mcps=agent.get('configured_mcps', []),
                custom_mcps=agent.get('custom_mcps', []),
                agentpress_tools=agent.get('agentpress_tools', {}),
                is_default=agent.get('is_default', False),
                is_public=agent.get('is_public', False),
                visibility=agent.get('visibility', 'private'),
                knowledge_bases=agent.get('knowledge_bases', []),
                marketplace_published_at=agent.get('marketplace_published_at'),
                download_count=agent.get('download_count', 0),
                tags=agent.get('tags', []),
                sharing_preferences=agent.get('sharing_preferences', {}),
                avatar=agent.get('avatar'),
                avatar_color=agent.get('avatar_color'),
                created_at=agent['created_at'],
                updated_at=agent['updated_at'],
                is_managed=agent.get('_is_managed', False),
                is_owned=agent.get('_is_owned', True)
            ))
        
        total_pages = (total_count + limit - 1) // limit
        
        logger.info(f"Found {len(agent_list)} agents for user: {user_id} (page {page}/{total_pages})")
        return {
            "agents": agent_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": total_pages
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching agents for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch agents: {str(e)}")

@router.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, user_id: str = Depends(get_current_user_id_from_jwt)):
    """Get a specific agent by ID. Only the owner can access non-public agents."""
    if not await is_enabled("custom_agents"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agents currently disabled. This feature is not available at the moment."
        )
    
    logger.info(f"Fetching agent {agent_id} for user: {user_id}")
    client = await db.client
    
    try:
        # Get agent with access check - only owner, public agents, or managed agents in user's library
        agent = await client.table('agents').select('*').eq("agent_id", agent_id).execute()
        
        if not agent.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent_data = agent.data[0]
        is_managed_by_user = False
        
        # Check access: owner, public agent, or managed agent in user's library
        if agent_data['account_id'] == user_id:
            # User owns the agent
            pass
        elif agent_data.get('is_public', False):
            # Public agent
            pass
        else:
            # Check if user has this agent in their library (either managed or copied)
            library_check = await client.table('user_agent_library').select('*').eq(
                'user_account_id', user_id
            ).eq('agent_id', agent_id).execute()
            
            if library_check.data:
                # Check if it's a managed agent (agent_id == original_agent_id)
                library_entry = library_check.data[0]
                is_managed_by_user = (library_entry['agent_id'] == library_entry['original_agent_id'])
            else:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Apply sharing preferences filtering for managed agents
        if is_managed_by_user:
            sharing_prefs = agent_data.get('sharing_preferences', {})
            if not sharing_prefs.get('include_knowledge_bases', True):
                agent_data['knowledge_bases'] = []
            if not sharing_prefs.get('include_custom_mcp_tools', True):
                agent_data['configured_mcps'] = []
                agent_data['custom_mcps'] = []
        
        return AgentResponse(
            agent_id=agent_data['agent_id'],
            account_id=agent_data['account_id'],
            name=agent_data['name'],
            description=agent_data.get('description'),
            system_prompt=agent_data['system_prompt'],
            configured_mcps=agent_data.get('configured_mcps', []),
            custom_mcps=agent_data.get('custom_mcps', []),
            agentpress_tools=agent_data.get('agentpress_tools', {}),
            is_default=agent_data.get('is_default', False),
            is_public=agent_data.get('is_public', False),
            visibility=agent_data.get('visibility', 'private'),
            knowledge_bases=agent_data.get('knowledge_bases', []),
            marketplace_published_at=agent_data.get('marketplace_published_at'),
            download_count=agent_data.get('download_count', 0),
            tags=agent_data.get('tags', []),
            sharing_preferences=agent_data.get('sharing_preferences', {}),
            avatar=agent_data.get('avatar'),
            avatar_color=agent_data.get('avatar_color'),
            created_at=agent_data['created_at'],
            updated_at=agent_data['updated_at'],
            is_managed=is_managed_by_user,
            is_owned=agent_data['account_id'] == user_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching agent {agent_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch agent: {str(e)}")

@router.post("/agents", response_model=AgentResponse)
async def create_agent(
    agent_data: AgentCreateRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Create a new agent."""
    logger.info(f"Creating new agent for user: {user_id}")
    if not await is_enabled("custom_agents"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agents currently disabled. This feature is not available at the moment."
        )
    client = await db.client
    
    try:
        # If this is set as default, we need to unset other defaults first
        if agent_data.is_default:
            await client.table('agents').update({"is_default": False}).eq("account_id", user_id).eq("is_default", True).execute()
        
        # enhanced_system_prompt = await enhance_system_prompt(
        #     agent_name=agent_data.name,
        #     description=agent_data.description or "",
        #     user_system_prompt=agent_data.system_prompt
        # )
        
        insert_data = {
            "account_id": user_id,
            "name": agent_data.name,
            "description": agent_data.description,
            "system_prompt": agent_data.system_prompt, 
            "configured_mcps": agent_data.configured_mcps or [],
            "custom_mcps": agent_data.custom_mcps or [],
            "agentpress_tools": agent_data.agentpress_tools or {},
            "is_default": agent_data.is_default or False,
            "knowledge_bases": agent_data.knowledge_bases or [],
            "avatar": agent_data.avatar,
            "avatar_color": agent_data.avatar_color
        }
        
        new_agent = await client.table('agents').insert(insert_data).execute()
        
        if not new_agent.data:
            raise HTTPException(status_code=500, detail="Failed to create agent")
        
        agent = new_agent.data[0]
        logger.info(f"Created agent {agent['agent_id']} for user: {user_id}")
        
        return AgentResponse(
            agent_id=agent['agent_id'],
            account_id=agent['account_id'],
            name=agent['name'],
            description=agent.get('description'),
            system_prompt=agent['system_prompt'],
            configured_mcps=agent.get('configured_mcps', []),
            custom_mcps=agent.get('custom_mcps', []),
            agentpress_tools=agent.get('agentpress_tools', {}),
            is_default=agent.get('is_default', False),
            is_public=agent.get('is_public', False),
            visibility=agent.get('visibility', 'private'),
            knowledge_bases=agent.get('knowledge_bases', []),
            marketplace_published_at=agent.get('marketplace_published_at'),
            download_count=agent.get('download_count', 0),
            tags=agent.get('tags', []),
            sharing_preferences=agent.get('sharing_preferences', {}),
            avatar=agent.get('avatar'),
            avatar_color=agent.get('avatar_color'),
            created_at=agent['created_at'],
            updated_at=agent['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating agent for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")

@router.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    agent_data: AgentUpdateRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Update an existing agent."""
    if not await is_enabled("custom_agents"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agent currently disabled. This feature is not available at the moment."
        )
    logger.info(f"Updating agent {agent_id} for user: {user_id}")
    client = await db.client
    
    try:
        # First verify the agent exists and belongs to the user
        existing_agent = await client.table('agents').select('*').eq("agent_id", agent_id).eq("account_id", user_id).maybe_single().execute()
        
        if not existing_agent.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        existing_data = existing_agent.data
        
        # Prepare update data (only include fields that are not None)
        update_data = {}
        if agent_data.name is not None:
            update_data["name"] = agent_data.name
        if agent_data.description is not None:
            update_data["description"] = agent_data.description
        if agent_data.system_prompt is not None:
            # Enhance the system prompt using GPT-4o if it's being updated
            # enhanced_system_prompt = await enhance_system_prompt(
            #     agent_name=agent_data.name or existing_data['name'],
            #     description=agent_data.description or existing_data.get('description', ''),
            #     user_system_prompt=agent_data.system_prompt
            # )
            update_data["system_prompt"] = agent_data.system_prompt
        if agent_data.configured_mcps is not None:
            update_data["configured_mcps"] = agent_data.configured_mcps
        if agent_data.custom_mcps is not None:
            update_data["custom_mcps"] = agent_data.custom_mcps
        if agent_data.agentpress_tools is not None:
            update_data["agentpress_tools"] = agent_data.agentpress_tools
        if agent_data.is_default is not None:
            update_data["is_default"] = agent_data.is_default
            # If setting as default, unset other defaults first
            if agent_data.is_default:
                await client.table('agents').update({"is_default": False}).eq("account_id", user_id).eq("is_default", True).neq("agent_id", agent_id).execute()
        if agent_data.knowledge_bases is not None:
            update_data["knowledge_bases"] = agent_data.knowledge_bases
        if agent_data.avatar is not None:
            update_data["avatar"] = agent_data.avatar
        if agent_data.avatar_color is not None:
            update_data["avatar_color"] = agent_data.avatar_color
        
        if not update_data:
            # No fields to update, return existing agent
            agent = existing_agent.data
        else:
            # Update the agent
            update_result = await client.table('agents').update(update_data).eq("agent_id", agent_id).eq("account_id", user_id).execute()
            
            if not update_result.data:
                raise HTTPException(status_code=500, detail="Failed to update agent")
            
            # Fetch the updated agent data
            updated_agent = await client.table('agents').select('*').eq("agent_id", agent_id).eq("account_id", user_id).maybe_single().execute()
            
            if not updated_agent.data:
                raise HTTPException(status_code=500, detail="Failed to fetch updated agent")
            
            agent = updated_agent.data
        
        logger.info(f"Updated agent {agent_id} for user: {user_id}")
        
        return AgentResponse(
            agent_id=agent['agent_id'],
            account_id=agent['account_id'],
            name=agent['name'],
            description=agent.get('description'),
            system_prompt=agent['system_prompt'],
            configured_mcps=agent.get('configured_mcps', []),
            custom_mcps=agent.get('custom_mcps', []),
            agentpress_tools=agent.get('agentpress_tools', {}),
            is_default=agent.get('is_default', False),
            is_public=agent.get('is_public', False),
            visibility=agent.get('visibility', 'private'),
            knowledge_bases=agent.get('knowledge_bases', []),
            marketplace_published_at=agent.get('marketplace_published_at'),
            download_count=agent.get('download_count', 0),
            tags=agent.get('tags', []),
            sharing_preferences=agent.get('sharing_preferences', {}),
            avatar=agent.get('avatar'),
            avatar_color=agent.get('avatar_color'),
            created_at=agent['created_at'],
            updated_at=agent['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agent {agent_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update agent: {str(e)}")

@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, user_id: str = Depends(get_current_user_id_from_jwt)):
    """Delete an agent."""
    if not await is_enabled("custom_agents"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agent currently disabled. This feature is not available at the moment."
        )
    logger.info(f"Deleting agent: {agent_id}")
    client = await db.client
    
    try:
        # Verify agent ownership
        agent_result = await client.table('agents').select('*').eq('agent_id', agent_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = agent_result.data[0]
        if agent['account_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if agent is default
        if agent['is_default']:
            raise HTTPException(status_code=400, detail="Cannot delete default agent")
        
        # Delete the agent
        await client.table('agents').delete().eq('agent_id', agent_id).execute()
        
        logger.info(f"Successfully deleted agent: {agent_id}")
        return {"message": "Agent deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Marketplace Models
class MarketplaceAgent(BaseModel):
    agent_id: str
    name: str
    description: Optional[str]
    system_prompt: str
    configured_mcps: List[Dict[str, Any]]
    custom_mcps: Optional[List[Dict[str, Any]]] = []
    agentpress_tools: Dict[str, Any]
    knowledge_bases: Optional[List[Dict[str, Any]]] = []
    sharing_preferences: Optional[Dict[str, Any]] = {}
    tags: Optional[List[str]]
    download_count: int
    marketplace_published_at: str
    created_at: str
    creator_name: str
    avatar: Optional[str]
    avatar_color: Optional[str]

class MarketplaceAgentsResponse(BaseModel):
    agents: List[MarketplaceAgent]
    pagination: PaginationInfo

class PublishAgentRequest(BaseModel):
    tags: Optional[List[str]] = []
    visibility: Optional[str] = "public"  # "public", "teams", or "private"
    team_ids: Optional[List[str]] = []  # Team account IDs to share with
    include_knowledge_bases: Optional[bool] = True  # Whether to include knowledge bases when sharing
    include_custom_mcp_tools: Optional[bool] = True  # Whether to include custom MCP tools when sharing
    managed_agent: Optional[bool] = False  # Whether this is a managed agent (users get live reference instead of copy)

@router.get("/marketplace/agents", response_model=MarketplaceAgentsResponse)
async def get_marketplace_agents(
    page: Optional[int] = Query(1, ge=1, description="Page number (1-based)"),
    limit: Optional[int] = Query(20, ge=1, le=100, description="Number of items per page"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    tags: Optional[str] = Query(None, description="Comma-separated string of tags"),
    sort_by: Optional[str] = Query("newest", description="Sort by: newest, popular, most_downloaded, name"),
    creator: Optional[str] = Query(None, description="Filter by creator name"),
    account_id: Optional[str] = Query(None, description="Filter by specific account ID for team-specific marketplace")
):
    """Get public agents from the marketplace with pagination, search, sort, and filter support."""
    if not await is_enabled("agent_marketplace"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agent currently disabled. This feature is not available at the moment."
        )
    
    logger.info(f"Fetching marketplace agents with page={page}, limit={limit}, search='{search}', tags='{tags}', sort_by={sort_by}")
    client = await db.client
    
    try:
        offset = (page - 1) * limit
        tags_array = None
        if tags:
            tags_array = [tag.strip() for tag in tags.split(',') if tag.strip()]
        
        result = await client.rpc('get_marketplace_agents', {
            'p_search': search,
            'p_tags': tags_array,
            'p_limit': limit + 1,
            'p_offset': offset,
            'p_account_id': account_id  # Pass account_id for team-specific filtering
        }).execute()
        
        if result.data is None:
            result.data = []
        
        has_more = len(result.data) > limit
        agents_data = result.data[:limit] 
        if creator:
            agents_data = [
                agent for agent in agents_data 
                if creator.lower() in agent.get('creator_name', '').lower()
            ]

        if sort_by == "most_downloaded":
            agents_data = sorted(agents_data, key=lambda x: x.get('download_count', 0), reverse=True)
        elif sort_by == "popular":
            agents_data = sorted(agents_data, key=lambda x: x.get('download_count', 0), reverse=True)
        elif sort_by == "name":
            agents_data = sorted(agents_data, key=lambda x: x.get('name', '').lower())
        else:
            agents_data = sorted(agents_data, key=lambda x: x.get('marketplace_published_at', ''), reverse=True)
        
        # NOTE: Sharing preferences are applied during import in add_agent_to_library function
        # The marketplace should show what WOULD be imported, not filter it out here
        # This allows users to see what MCPs/knowledge bases are available before importing
        
        estimated_total = (page - 1) * limit + len(agents_data)
        if has_more:
            estimated_total += 1
        
        total_pages = max(page, (estimated_total + limit - 1) // limit)
        if has_more:
            total_pages = page + 1
        
        logger.info(f"Found {len(agents_data)} marketplace agents (page {page}, estimated {total_pages} pages)")
        return {
            "agents": agents_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": estimated_total,
                "pages": total_pages
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching marketplace agents: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/agents/{agent_id}/publish")
async def publish_agent_to_marketplace(
    agent_id: str,
    publish_data: PublishAgentRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Publish an agent to the marketplace or share with specific teams."""
    if not await is_enabled("agent_marketplace"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agent currently disabled. This feature is not available at the moment."
        )
    
    logger.info(f"Publishing agent {agent_id} with visibility: {publish_data.visibility}")
    client = await db.client
    
    try:
        # Verify agent ownership
        agent_result = await client.table('agents').select('*').eq('agent_id', agent_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = agent_result.data[0]
        if agent['account_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Validate visibility
        if publish_data.visibility not in ["public", "teams", "private"]:
            raise HTTPException(status_code=400, detail="Invalid visibility. Must be 'public', 'teams', or 'private'")
        
        # Note: Team permission validation is handled by the database function
        # publish_agent_with_visibility_by_user() which validates:
        # 1. User owns the agent
        # 2. User is owner of their account  
        # 3. User is owner of all target teams (if sharing with teams)
        
        # Store sharing preferences for later use when serving marketplace agents
        sharing_preferences = {
            'include_knowledge_bases': publish_data.include_knowledge_bases,
            'include_custom_mcp_tools': publish_data.include_custom_mcp_tools,
            'managed_agent': publish_data.managed_agent
        }
        
        # Update agent with sharing preferences
        await client.table('agents').update({
            'sharing_preferences': sharing_preferences
        }).eq('agent_id', agent_id).execute()
        
        # Use the new database function that accepts user_id explicitly
        await client.rpc('publish_agent_with_visibility_by_user', {
            'p_agent_id': agent_id,
            'p_visibility': publish_data.visibility,
            'p_user_id': user_id,
            'p_team_ids': publish_data.team_ids if publish_data.visibility == "teams" else None
        }).execute()
        
        # Update tags if provided
        if publish_data.tags:
            await client.table('agents').update({'tags': publish_data.tags}).eq('agent_id', agent_id).execute()
        
        message = {
            "public": "Agent published to marketplace successfully",
            "teams": f"Agent shared with {len(publish_data.team_ids or [])} team(s)",
            "private": "Agent set to private"
        }.get(publish_data.visibility, "Agent visibility updated")
        
        logger.info(f"Successfully updated agent {agent_id} visibility to {publish_data.visibility}")
        return {"message": message}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/agents/{agent_id}/unpublish")
async def unpublish_agent_from_marketplace(
    agent_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Unpublish an agent from the marketplace."""
    if not await is_enabled("agent_marketplace"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agent currently disabled. This feature is not available at the moment."
        )
    
    logger.info(f"Unpublishing agent {agent_id} from marketplace")
    client = await db.client
    
    try:
        # Verify agent ownership
        agent_result = await client.table('agents').select('*').eq('agent_id', agent_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = agent_result.data[0]
        if agent['account_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if this is a managed agent before unpublishing
        agent_sharing_prefs = agent.get('sharing_preferences', {})
        is_managed_agent = agent_sharing_prefs.get('managed_agent', False)
        
        # Update agent to remove from marketplace using the new visibility function
        await client.rpc('publish_agent_with_visibility_by_user', {
            'p_agent_id': agent_id,
            'p_visibility': 'private',
            'p_user_id': user_id,
            'p_team_ids': None
        }).execute()
        
        # If this was a managed agent, remove it from all users' libraries
        if is_managed_agent:
            # Remove all managed references (where agent_id = original_agent_id)
            await client.table('user_agent_library').delete().eq(
                'agent_id', agent_id
            ).eq('original_agent_id', agent_id).neq('user_account_id', user_id).execute()
            
            logger.info(f"Removed managed agent {agent_id} from all users' libraries")
        
        logger.info(f"Successfully unpublished agent {agent_id} from marketplace")
        return {"message": "Agent removed from marketplace successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unpublishing agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/agents/{agent_id}/remove-from-library")
async def remove_agent_from_library(
    agent_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Remove a managed agent from user's library."""
    if not await is_enabled("agent_marketplace"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agent currently disabled. This feature is not available at the moment."
        )

    logger.info(f"Removing agent {agent_id} from user {user_id} library")
    client = await db.client
    
    try:
        # Check if this is a managed agent in user's library
        library_entry = await client.table('user_agent_library').select('*').eq(
            'user_account_id', user_id
        ).eq('agent_id', agent_id).eq('original_agent_id', agent_id).execute()
        
        if not library_entry.data:
            raise HTTPException(status_code=404, detail="Managed agent not found in your library")
        
        # Remove from library
        await client.table('user_agent_library').delete().eq(
            'user_account_id', user_id
        ).eq('agent_id', agent_id).eq('original_agent_id', agent_id).execute()
        
        logger.info(f"Successfully removed managed agent {agent_id} from user {user_id} library")
        return {"message": "Agent removed from library successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing agent {agent_id} from library: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/marketplace/agents/{agent_id}/add-to-library")
async def add_agent_to_library(
    agent_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Add an agent from the marketplace to user's library."""
    if not await is_enabled("agent_marketplace"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agent currently disabled. This feature is not available at the moment."
        )

    logger.info(f"Adding marketplace agent {agent_id} to user {user_id} library")
    client = await db.client
    
    try:
        # Call the database function with user_id
        result = await client.rpc('add_agent_to_library', {
            'p_original_agent_id': agent_id,
            'p_user_account_id': user_id
        }).execute()
        
        if result.data:
            new_agent_id = result.data
            logger.info(f"Successfully added agent {agent_id} to library as {new_agent_id}")
            return {"message": "Agent added to library successfully", "new_agent_id": new_agent_id}
        else:
            raise HTTPException(status_code=400, detail="Failed to add agent to library")
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error adding agent {agent_id} to library: {error_msg}")
        
        if "Agent not found or not public" in error_msg:
            raise HTTPException(status_code=404, detail="Agent not found or not public")
        elif "Agent already in your library" in error_msg:
            raise HTTPException(status_code=409, detail="Agent already in your library")
        else:
            raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/user/agent-library")
async def get_user_agent_library(user_id: str = Depends(get_current_user_id_from_jwt)):
    """Get user's agent library (agents added from marketplace)."""
    if not await is_enabled("agent_marketplace"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agent currently disabled. This feature is not available at the moment."
        )

    logger.info(f"Fetching agent library for user {user_id}")
    client = await db.client
    
    try:
        result = await client.table('user_agent_library').select("""
            *,
            original_agent:agents!user_agent_library_original_agent_id_fkey(
                agent_id,
                name,
                description,
                download_count
            ),
            agent:agents!user_agent_library_agent_id_fkey(
                agent_id,
                name,
                description,
                system_prompt
            )
        """).eq('user_account_id', user_id).order('added_at', desc=True).execute()
        
        logger.info(f"Found {len(result.data or [])} agents in user library")
        return {"library": result.data or []}
        
    except Exception as e:
        logger.error(f"Error fetching user agent library: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/agents/{agent_id}/builder-chat-history")
async def get_agent_builder_chat_history(
    agent_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Get chat history for agent builder sessions for a specific agent."""
    if not await is_enabled("custom_agents"):
        raise HTTPException(
            status_code=403, 
            detail="Custom agents currently disabled. This feature is not available at the moment."
        )
    
    logger.info(f"Fetching agent builder chat history for agent: {agent_id}")
    client = await db.client
    
    try:
        # First verify the agent exists and belongs to the user
        agent_result = await client.table('agents').select('*').eq('agent_id', agent_id).eq('account_id', user_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found or access denied")
        
        # Get all threads for this user with metadata field included
        threads_result = await client.table('threads').select('thread_id, created_at, metadata').eq('account_id', user_id).order('created_at', desc=True).execute()
        
        agent_builder_threads = []
        for thread in threads_result.data:
            metadata = thread.get('metadata', {})
            # Check if this is an agent builder thread for the specific agent
            if (metadata.get('is_agent_builder') and 
                metadata.get('target_agent_id') == agent_id):
                agent_builder_threads.append({
                    'thread_id': thread['thread_id'],
                    'created_at': thread['created_at']
                })
        
        if not agent_builder_threads:
            logger.info(f"No agent builder threads found for agent {agent_id}")
            return {"messages": [], "thread_id": None}
        
        # Get the most recent thread (already ordered by created_at desc)
        latest_thread_id = agent_builder_threads[0]['thread_id']
        logger.info(f"Found {len(agent_builder_threads)} agent builder threads, using latest: {latest_thread_id}")
        
        # Get messages from the latest thread, excluding status and summary messages
        messages_result = await client.table('messages').select('*').eq('thread_id', latest_thread_id).neq('type', 'status').neq('type', 'summary').order('created_at', desc=False).execute()
        
        logger.info(f"Found {len(messages_result.data)} messages for agent builder chat history")
        return {
            "messages": messages_result.data,
            "thread_id": latest_thread_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching agent builder chat history for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat history: {str(e)}")
