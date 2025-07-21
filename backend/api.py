from fastapi import FastAPI, Request, HTTPException, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import sentry # Keep this import here, right after fastapi imports
from contextlib import asynccontextmanager
from agentpress.thread_manager import ThreadManager
from services.supabase import DBConnection
from datetime import datetime, timezone
from dotenv import load_dotenv
from utils.config import config, EnvMode
import asyncio
from utils.logger import logger, structlog
import time
import os
from collections import OrderedDict
from typing import Dict, Any, Optional

from pydantic import BaseModel
import uuid
# Import the agent API module
from agent import api as agent_api
from sandbox import api as sandbox_api
from services import billing as billing_api
from flags import api as feature_flags_api
from services import transcription as transcription_api
from services.mcp_custom import discover_custom_tools
import sys
from services import email_api
from integrations import composio_api


load_dotenv()

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Initialize managers
db = DBConnection()
instance_id = "single"

# Rate limiter state
ip_tracker = OrderedDict()
MAX_CONCURRENT_IPS = 25

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting up FastAPI application with instance ID: {instance_id} in {config.ENV_MODE.value} mode")
    try:
        await db.initialize()
        
        agent_api.initialize(
            db,
            instance_id
        )
        
        sandbox_api.initialize(db)
        
        # Initialize Redis connection
        from services import redis
        try:
            await redis.initialize_async()
            logger.info("Redis connection initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            # Continue without Redis - the application will handle Redis failures gracefully
        
        # Start background tasks
        # asyncio.create_task(agent_api.restore_running_agent_runs())
        
        # Startup
        cleanup_session_files_task = asyncio.create_task(periodic_session_cleanup())
        
        from mcp_local.client import cleanup_connections
        
        yield
        
        # Shutdown
        cleanup_session_files_task.cancel()
        
        try:
            await cleanup_session_files_task
        except asyncio.CancelledError:
            pass
        
        await cleanup_connections()
        
        # Clean up agent resources
        logger.info("Cleaning up agent resources")
        await agent_api.cleanup()
        
        # Clean up Redis connection
        try:
            logger.info("Closing Redis connection")
            await redis.close()
            logger.info("Redis connection closed successfully")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")
        
        # Clean up database connection
        logger.info("Disconnecting from database")
        await db.disconnect()
        
        print("Server shutdown complete")
    except Exception as e:
        logger.error(f"Error during application startup: {e}")
        raise

app = FastAPI(lifespan=lifespan)

@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    structlog.contextvars.clear_contextvars()

    request_id = str(uuid.uuid4())
    start_time = time.time()
    client_ip = request.client.host
    method = request.method
    path = request.url.path
    query_params = str(request.query_params)

    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        client_ip=client_ip,
        method=method,
        path=path,
        query_params=query_params
    )

    # Log the incoming request
    logger.info(f"Request started: {method} {path} from {client_ip} | Query: {query_params}")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.debug(f"Request completed: {method} {path} | Status: {response.status_code} | Time: {process_time:.2f}s")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Request failed: {method} {path} | Error: {str(e)} | Time: {process_time:.2f}s")
        raise

# Define allowed origins based on environment
allowed_origins = [ "http://localhost:3000", "https://operator.becomeomni.com", "https://dev1.operator.becomeomni.com", "https://huston.becomeomni.net", "https://mssc.becomeomni.net","https://coldchain.becomeomni.net","https://kellybox.becomeomni.net"]
allow_origin_regex = None

# Add staging-specific origins
if config.ENV_MODE == EnvMode.STAGING:
    allowed_origins.append("https://operator.staging.becomeomni.com")
    allow_origin_regex = r"https://suna-.*-prjcts\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(agent_api.router, prefix="/api")

app.include_router(sandbox_api.router, prefix="/api")

app.include_router(billing_api.router, prefix="/api")

app.include_router(feature_flags_api.router, prefix="/api")

from mcp_local import api as mcp_api

app.include_router(mcp_api.router, prefix="/api")


app.include_router(transcription_api.router, prefix="/api")

app.include_router(email_api.router, prefix="/api")

# Include integrations API router
app.include_router(composio_api.router, prefix="/api")

# Add meetings API endpoints
from fastapi import WebSocket, WebSocketDisconnect
from services.meetings import meetings_service
from utils.auth_utils import get_current_user_id_from_jwt
from pydantic import BaseModel

class CreateMeetingRequest(BaseModel):
    title: str = "Untitled Meeting"
    folder_id: Optional[str] = None
    recording_mode: str = "local"

class CreateFolderRequest(BaseModel):
    name: str
    parent_folder_id: Optional[str] = None

class ShareMeetingRequest(BaseModel):
    shared_with_account_id: str
    permission_level: str = "view"

@app.post("/api/meetings")
async def create_meeting(
    request: CreateMeetingRequest, 
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Create a new meeting."""
    meeting = await meetings_service.create_meeting(
        account_id=user_id,
        title=request.title,
        folder_id=request.folder_id,
        recording_mode=request.recording_mode
    )
    return meeting

@app.get("/api/meetings")
async def get_meetings(
    folder_id: Optional[str] = None,
    include_all: bool = False,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Get meetings for the current user. If include_all=true, gets all meetings across folders."""
    if include_all:
        meetings = await meetings_service.get_all_meetings(user_id)
    else:
        meetings = await meetings_service.get_meetings(user_id, folder_id)
    return {"meetings": meetings}

# Search endpoint - MUST come before {meeting_id} routes
@app.get("/api/meetings/search")
async def search_meetings(
    q: str, 
    limit: int = 50,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Search meetings."""
    results = await meetings_service.search_meetings(user_id, q, limit)
    return {"results": results}

# Sharing endpoints - MUST come before {meeting_id} routes  
@app.get("/api/meetings/shared")
async def get_shared_meetings(user_id: str = Depends(get_current_user_id_from_jwt)):
    """Get all meetings shared with the current user."""
    meetings = await meetings_service.get_shared_meetings(user_id)
    return {"meetings": meetings}

@app.get("/api/meetings/{meeting_id}")
async def get_meeting(
    meeting_id: str, 
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Get a specific meeting."""
    meeting = await meetings_service.get_meeting(meeting_id)
    return meeting

@app.put("/api/meetings/{meeting_id}")
async def update_meeting(
    meeting_id: str, 
    updates: dict,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Update a meeting."""
    meeting = await meetings_service.update_meeting(meeting_id, updates)
    return meeting

@app.delete("/api/meetings/{meeting_id}")
async def delete_meeting(
    meeting_id: str, 
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Delete a meeting."""
    await meetings_service.delete_meeting(meeting_id)
    return {"success": True}

# Folder endpoints
@app.post("/api/meeting-folders")
async def create_folder(
    request: CreateFolderRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Create a new meeting folder."""
    folder = await meetings_service.create_folder(
        account_id=user_id,
        name=request.name,
        parent_folder_id=request.parent_folder_id
    )
    return folder

@app.get("/api/meeting-folders")
async def get_folders(
    parent_folder_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Get all folders for the current user."""
    folders = await meetings_service.get_folders(user_id, parent_folder_id)
    return {"folders": folders}

@app.put("/api/meeting-folders/{folder_id}")
async def update_folder(
    folder_id: str, 
    updates: dict,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Update a folder."""
    folder = await meetings_service.update_folder(folder_id, updates)
    return folder

@app.delete("/api/meeting-folders/{folder_id}")
async def delete_folder(
    folder_id: str, 
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Delete a folder."""
    await meetings_service.delete_folder(folder_id)
    return {"success": True}

# Sharing endpoints
@app.post("/api/meetings/{meeting_id}/share")
async def share_meeting(
    meeting_id: str, 
    request: ShareMeetingRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Share a meeting with another user."""
    share = await meetings_service.share_meeting(
        meeting_id=meeting_id,
        shared_with_account_id=request.shared_with_account_id,
        permission_level=request.permission_level
    )
    return share

@app.delete("/api/meetings/{meeting_id}/share/{shared_with_account_id}")
async def unshare_meeting(
    meeting_id: str, 
    shared_with_account_id: str, 
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Remove meeting share."""
    await meetings_service.unshare_meeting(meeting_id, shared_with_account_id)
    return {"success": True}

# WebSocket endpoint for real-time transcription
@app.websocket("/api/meetings/{meeting_id}/transcribe")
async def transcribe_meeting(websocket: WebSocket, meeting_id: str):
    """WebSocket endpoint for real-time transcription."""
    await meetings_service.handle_transcription_websocket(websocket, meeting_id)

@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify API is working."""
    logger.info("Health check endpoint called")
    return {
        "status": "ok", 
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "instance_id": instance_id
    }

class CustomMCPDiscoverRequest(BaseModel):
    type: str
    config: Dict[str, Any]


@app.post("/api/mcp/discover-custom-tools")
async def discover_custom_mcp_tools(request: CustomMCPDiscoverRequest):
    try:
        return await discover_custom_tools(request.type, request.config)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error discovering custom MCP tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# SSE connections storage for real-time updates
active_sse_connections = {}

async def broadcast_bot_update(bot_id: str, session_data: dict):
    """
    Broadcast real-time bot status updates to connected SSE clients.
    
    Args:
        bot_id: The bot ID to broadcast for
        session_data: The current session data including status and transcript
    """
    global active_sse_connections
    import json
    
    # Prepare the update message
    update_data = {
        'type': 'status_update',
        'status': session_data.get('status', 'unknown'),
        'bot_id': bot_id,
        'timestamp': time.time()
    }
    
    # Include transcript if status is completed
    if session_data.get('status') == 'completed' and session_data.get('transcript_text'):
        update_data['transcript'] = session_data.get('transcript_text')
        logger.info(f"[BROADCAST] Including transcript in update for bot {bot_id}")
    
    logger.info(f"[BROADCAST] Sending update for bot {bot_id}, status: {update_data['status']}")
    
    # Format as SSE message
    message = f"data: {json.dumps(update_data)}\n\n"
    
    # Get connections for this bot
    bot_connections = active_sse_connections.get(bot_id, [])
    if not bot_connections:
        logger.warning(f"[BROADCAST] No active SSE connections for bot {bot_id}")
        return
    
    logger.info(f"[BROADCAST] Broadcasting to {len(bot_connections)} clients for bot {bot_id}")
    
    # Send to all connected clients
    successful = 0
    for queue in bot_connections[:]:  # Create a copy to safely modify during iteration
        try:
            # Put the formatted message in queue
            await queue.put(message)
            successful += 1
        except Exception as e:
            logger.error(f"[BROADCAST] Error sending to queue: {str(e)}")
            bot_connections.remove(queue)
    
    logger.info(f"[BROADCAST] Successfully sent to {successful}/{len(bot_connections)} clients for bot {bot_id}")
    
    # Clean up if no connections remain
    if not bot_connections:
        del active_sse_connections[bot_id]

@app.get("/api/meeting-bot/{bot_id}/events")
async def bot_status_events(bot_id: str):
    """Server-Sent Events stream for real-time bot status updates"""
    import asyncio
    from fastapi.responses import StreamingResponse
    
    logger.info(f"[SSE] New connection for bot {bot_id}")
    
    async def event_publisher():
        """Event publisher coroutine that handles the SSE stream"""
        queue = asyncio.Queue()
        
        try:
            # Add this client to active connections
            if bot_id not in active_sse_connections:
                active_sse_connections[bot_id] = []
            active_sse_connections[bot_id].append(queue)
            logger.info(f"[SSE] Added client for bot {bot_id}, total clients: {len(active_sse_connections[bot_id])}")
            
            # Send initial connection confirmation
            yield "data: {\"type\": \"connected\", \"bot_id\": \"" + bot_id + "\"}\n\n"
            
            # Send current status if available
            import json
            import os
            sessions_dir = '/tmp/meeting_bot_sessions'
            session_file = f'{sessions_dir}/{bot_id}.json'
            
            if os.path.exists(session_file):
                try:
                    with open(session_file, 'r') as f:
                        session = json.load(f)
                    
                    status_update = json.dumps({
                        "type": "status_update",
                        "bot_id": bot_id,
                        "status": session.get('status', 'unknown'),
                        "last_updated": session.get('last_updated', 0)
                    })
                    yield f"data: {status_update}\n\n"
                    logger.info(f"[SSE] Sent initial status for bot {bot_id}: {session.get('status')}")
                except Exception as file_error:
                    logger.error(f"[SSE] Error reading session for {bot_id}: {file_error}")
            
            # Stream real-time updates with improved heartbeat
            last_heartbeat = time.time()
            while True:
                try:
                    # Wait for message or timeout for heartbeat
                    message = await asyncio.wait_for(queue.get(), timeout=5.0)
                    yield message
                    last_heartbeat = time.time()
                    logger.debug(f"[SSE] Sent message to bot {bot_id} client")
                    
                except asyncio.TimeoutError:
                    # Send heartbeat every 5 seconds to keep connection alive
                    current_time = time.time()
                    if current_time - last_heartbeat >= 5:
                        heartbeat = json.dumps({
                            "type": "heartbeat", 
                            "timestamp": current_time,
                            "bot_id": bot_id
                        })
                        yield f"data: {heartbeat}\n\n"
                        last_heartbeat = current_time
                        logger.debug(f"[SSE] Sent heartbeat for bot {bot_id}")
                        
                except Exception as e:
                    logger.warning(f"[SSE] Connection error for bot {bot_id}: {str(e)}")
                    break
                    
        except Exception as e:
            logger.error(f"[SSE] Publisher error for bot {bot_id}: {str(e)}")
        finally:
            # Clean up connection
            try:
                if bot_id in active_sse_connections:
                    if queue in active_sse_connections[bot_id]:
                        active_sse_connections[bot_id].remove(queue)
                    if not active_sse_connections[bot_id]:
                        del active_sse_connections[bot_id]
                logger.info(f"[SSE] Cleaned up connection for bot {bot_id}")
            except Exception as cleanup_error:
                logger.error(f"[SSE] Error cleaning up for bot {bot_id}: {cleanup_error}")

    return StreamingResponse(
        event_publisher(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )

# Meeting Bot Management Endpoints
@app.post("/api/meeting-bot/start")
async def start_meeting_bot(request: Request, user_id: str = Depends(get_current_user_id_from_jwt)):
    """Start a meeting bot for online recording"""
    try:
        logger.info("[MEETING BOT] Starting meeting bot request")
        
        data = await request.json()
        meeting_url = data.get('meeting_url')
        sandbox_id = data.get('sandbox_id')
        provided_user_id = data.get('user_id')  # From request body
        
        # Use authenticated user_id from JWT over provided one for security
        actual_user_id = user_id if user_id else provided_user_id
        
        logger.info(f"[MEETING BOT] Request data: meeting_url={meeting_url}, sandbox_id={sandbox_id}, user_id={actual_user_id}")
        
        if not meeting_url:
            logger.error("[MEETING BOT] Missing meeting_url in request")
            return JSONResponse({"error": "meeting_url is required"}, status_code=400)
        
        # Check API key exists
        api_key = os.getenv('MEETINGBAAS_API_KEY')
        if not api_key:
            logger.error("[MEETING BOT] MEETINGBAAS_API_KEY environment variable not set")
            return JSONResponse({"error": "MeetingBaaS API key not configured"}, status_code=500)
        
        logger.info(f"[MEETING BOT] API key configured (first 10 chars): {api_key[:10]}...")
            
        # Import the service
        try:
            from services.meeting_baas import meeting_baas_service
            logger.info("[MEETING BOT] Successfully imported MeetingBaaS service")
        except Exception as import_error:
            logger.error(f"[MEETING BOT] Failed to import MeetingBaaS service: {str(import_error)}")
            return JSONResponse({"error": f"Failed to import service: {str(import_error)}"}, status_code=500)
        
        # Start the bot with webhook URL for real-time updates
        webhook_url = f"{request.base_url}api/meeting-bot/webhook"
        logger.info(f"[MEETING BOT] Using webhook URL: {webhook_url}")
        
        try:
            result = await meeting_baas_service.start_meeting_bot(meeting_url, "Omni", webhook_url)
            logger.info(f"[MEETING BOT] Service result: {result}")
        except Exception as service_error:
            logger.error(f"[MEETING BOT] Service execution failed: {str(service_error)}")
            return JSONResponse({"error": f"Failed to start bot: {str(service_error)}"}, status_code=500)
        
        if result.get('success'):
            bot_id = result['bot_id']
            
            # Store bot session for webhook tracking
            bot_session = {
                'bot_id': bot_id,
                'meeting_url': meeting_url,
                'sandbox_id': sandbox_id,
                'user_id': actual_user_id,  # Store user ID for webhook auth
                'status': 'starting',
                'started_at': time.time(),
                'last_updated': time.time()
            }
            
            # Get user's auth token for webhook operations
            # Store encrypted token that webhook can use to update as this user
            from utils.auth_utils import get_current_user_token
            try:
                user_token = get_current_user_token(request)
                if user_token:
                    bot_session['user_auth_token'] = user_token
                    logger.info(f"[START] Stored user auth for bot {bot_id}")
                else:
                    logger.warning(f"[START] No user token available for bot {bot_id}")
            except Exception as token_error:
                logger.warning(f"[START] Failed to get user token for bot {bot_id}: {str(token_error)}")
            
            # Store in simple file-based persistence (production would use Redis/DB)
            import json
            
            sessions_dir = '/tmp/meeting_bot_sessions'
            
            # Create sessions directory with restricted permissions
            if not os.path.exists(sessions_dir):
                os.makedirs(sessions_dir, mode=0o700)  # Only owner can read/write/execute
            
            session_file = f'{sessions_dir}/{bot_id}.json'
            
            with open(session_file, 'w') as f:
                json.dump(bot_session, f)
            
            # Ensure secure file permissions are maintained
            os.chmod(session_file, 0o600)
            
            logger.info(f"[START] Created meeting bot {bot_id} - joining {meeting_url}")
            
            return JSONResponse({
                "success": True,
                "bot_id": bot_id,
                "status": "starting",
                "message": "Bot is starting..."
            })
        else:
            return JSONResponse({"error": result.get('error')}, status_code=400)
            
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/meeting-bot/{bot_id}/status")
async def get_meeting_bot_status(bot_id: str):
    """Get current status of a meeting bot"""
    try:
        # First check local session for up-to-date status from webhooks
        import json
        sessions_dir = '/tmp/meeting_bot_sessions'
        session_file = f'{sessions_dir}/{bot_id}.json'
        
        if os.path.exists(session_file):
            with open(session_file, 'r') as f:
                session = json.load(f)
            
            status = session.get('status', 'unknown')
            
            # If meeting is completed, return session data
            if status in ['completed', 'ended', 'failed']:
                logger.info(f"[STATUS] Using session status for {bot_id}: {status}")
                
                # Convert transcript list to text if needed
                transcript_content = ""
                if session.get('transcript'):
                    transcript_list = session.get('transcript', [])
                    if isinstance(transcript_list, list):
                        transcript_content = '\n'.join([
                            f"{item.get('speaker', 'Unknown')}: {item.get('text', '')}"
                            for item in transcript_list
                            if isinstance(item, dict) and item.get('text')
                        ])
                    elif isinstance(transcript_list, str):
                        transcript_content = transcript_list
                
                # Safe duration calculation with type conversion
                completed_at = session.get('completed_at', 0)
                started_at = session.get('started_at', 0)
                duration = 0
                
                try:
                    completed_at = float(completed_at) if completed_at else 0
                    started_at = float(started_at) if started_at else 0
                    if completed_at > 0 and started_at > 0:
                        duration = int(completed_at - started_at)
                except (ValueError, TypeError):
                    duration = 0
                
                return JSONResponse({
                    "success": True,
                    "status": status,
                    "transcript": transcript_content,
                    "participants": session.get('speakers', []),
                    "duration": duration
                })
        
        # Return session data if available, webhooks provide real-time updates
        if os.path.exists(session_file):
            with open(session_file, 'r') as f:
                session = json.load(f)
            
            final_status = session.get('status', 'unknown')
            
            # Safe duration calculation with type conversion
            completed_at = session.get('completed_at', 0)
            started_at = session.get('started_at', 0)
            duration = 0
            
            try:
                completed_at = float(completed_at) if completed_at else 0
                started_at = float(started_at) if started_at else 0
                if completed_at > 0 and started_at > 0:
                    duration = int(completed_at - started_at)
            except (ValueError, TypeError):
                duration = 0
            
            return JSONResponse({
                "success": True,
                "status": final_status,
                "transcript": session.get('transcript_text', ''),
                "participants": session.get('speakers', []),
                "duration": duration
            })
        else:
            # No session file found
            return JSONResponse({
                "success": True,
                "status": 'unknown',
                "transcript": '',
                "participants": [],
                "duration": 0
            })
            
    except Exception as e:
        logger.error(f"[STATUS] Error getting status for {bot_id}: {str(e)}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/meeting-bot/{bot_id}/stop")
async def stop_meeting_bot(bot_id: str, request: Request):
    """Stop meeting bot and get final transcript"""
    try:
        # Handle both JSON and empty request bodies
        try:
            data = await request.json()
            sandbox_id = data.get('sandbox_id')
        except:
            # No JSON body provided - this is fine
            data = {}
            sandbox_id = None
        
        # First check if we already have the transcript from webhook
        import json
        sessions_dir = '/tmp/meeting_bot_sessions'
        session_file = f'{sessions_dir}/{bot_id}.json'
        
        transcript_content = None
        session_data = {}
        
        if os.path.exists(session_file):
            with open(session_file, 'r') as f:
                session_data = json.load(f)
            
            # If meeting completed via webhook, use that data
            if session_data.get('status') == 'completed' and (session_data.get('transcript_text') or session_data.get('transcript')):
                # Use pre-processed transcript text if available
                transcript_content = session_data.get('transcript_text')
                
                # Fallback to processing raw transcript if needed
                if not transcript_content:
                    transcript_list = session_data.get('transcript', [])
                    
                    # Convert transcript list to text
                    if isinstance(transcript_list, list):
                        transcript_content = '\n'.join([
                            f"{item.get('speaker', 'Unknown')}: {item.get('text', '')}"
                            for item in transcript_list
                            if isinstance(item, dict) and item.get('text')
                        ])
                    elif isinstance(transcript_list, str):
                        transcript_content = transcript_list
                
                # Ensure we have some content
                if not transcript_content or not transcript_content.strip():
                    transcript_content = "[No speech detected during meeting]"
                
                logger.info(f"[STOP] Using webhook transcript for {bot_id}, length: {len(transcript_content) if transcript_content else 0}")
        
        # If already completed via webhook, return the transcript
        if transcript_content:
            # Create transcript file
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"meeting_transcript_{timestamp}.txt"
            
            # Format the transcript nicely
            content = f"Meeting Transcript\n"
            content += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            content += f"Bot ID: {bot_id}\n"
            
            # Add session info if available
            if session_data:
                content += f"Meeting URL: {session_data.get('meeting_url', 'Unknown')}\n"
                if session_data.get('started_at'):
                    started = datetime.fromtimestamp(session_data['started_at'])
                    content += f"Started: {started.strftime('%Y-%m-%d %H:%M:%S')}\n"
                if session_data.get('completed_at'):
                    completed = datetime.fromtimestamp(session_data['completed_at'])
                    content += f"Completed: {completed.strftime('%Y-%m-%d %H:%M:%S')}\n"
                    duration = session_data['completed_at'] - session_data.get('started_at', session_data['completed_at'])
                    content += f"Duration: {int(duration // 60)}m {int(duration % 60)}s\n"
            
            speakers = session_data.get('speakers', [])
            if not speakers:
                speakers = ['No speakers detected']
            content += f"Participants: {', '.join(speakers)}\n\n"
            content += f"Full Transcript:\n{transcript_content}"
            
            # Only clean up session if we have the final transcript or it's been a while
            # Don't clean up if we're still awaiting transcript from a webhook
            should_clean_session = True
            if session_data.get('awaiting_transcript') and session_data.get('status') == 'ended':
                # Recently ended but awaiting transcript - don't clean up yet
                ended_time = session_data.get('ended_at', 0)
                try:
                    ended_time = float(ended_time) if ended_time else 0
                except (ValueError, TypeError):
                    ended_time = 0
                    
                if ended_time > 0 and time.time() - ended_time < 600:  # Less than 10 minutes
                    should_clean_session = False
                    logger.info(f"[STOP] Preserving session for {bot_id} - still awaiting transcript")
            
            if should_clean_session and os.path.exists(session_file):
                os.remove(session_file)
                logger.info(f"[STOP] Cleaned up session file for {bot_id}")
            
            # Safe duration calculation
            completed_at = session_data.get('completed_at', 0)
            started_at = session_data.get('started_at', 0)
            duration = 0
            
            try:
                completed_at = float(completed_at) if completed_at else 0
                started_at = float(started_at) if started_at else 0
                if completed_at > 0 and started_at > 0:
                    duration = int(completed_at - started_at)
            except (ValueError, TypeError):
                duration = 0
            
            return JSONResponse({
                "success": True,
                "transcript": transcript_content,
                "summary": "",  # MeetingBaaS doesn't provide summary in webhook
                "action_items": [],  # MeetingBaaS doesn't provide action items in webhook
                "participants": speakers,
                "duration": duration,
                "filename": filename,
                "content": content
            })
        
        # If not completed via webhook, stop the bot and mark as stopping
        # Don't clean up session yet - wait for the final "complete" webhook
        try:
            from services.meeting_baas import meeting_baas_service
            result = await meeting_baas_service.stop_meeting_bot(bot_id)
            
            if result.get('success'):
                logger.info(f"[STOP] Successfully requested bot stop for {bot_id}")
                
                # Mark session as stopping - don't clean up yet
                if session_data:
                    session_data['status'] = 'stopping'
                    session_data['stop_requested_at'] = time.time()
                    session_data['last_updated'] = time.time()
                    
                    with open(session_file, 'w') as f:
                        json.dump(session_data, f)
                
                return JSONResponse({
                    "success": True,
                    "message": "Bot stop requested. Final transcript will be available shortly.",
                    "status": "stopping",
                    "transcript": "",
                    "participants": session_data.get('speakers', []) if session_data else [],
                    "duration": 0
                })
            else:
                logger.warning(f"[STOP] API stop unsuccessful for {bot_id}: {result.get('error', 'Unknown error')}")
                # Fall through to manual completion handling below
                
        except Exception as api_error:
            logger.warning(f"[STOP] API call failed for {bot_id}: {str(api_error)}")
            # Fall through to manual completion handling below
        
        # If API stop failed, treat as manually completed (fallback)
        # Only do this if we have recent session activity indicating the meeting actually happened
        if session_data and (
            session_data.get('status') in ['ended', 'failed'] or
            (session_data.get('last_updated', 0) > 0 and 
             time.time() - session_data.get('last_updated', 0) < 300)  # Activity within 5 minutes
        ):
            # Create transcript file with placeholder
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"meeting_transcript_{timestamp}.txt"
            transcript_content = "[No speech detected during meeting]"
            
            # Format the transcript nicely
            content = f"Meeting Transcript\n"
            content += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            content += f"Bot ID: {bot_id}\n"
            content += f"Meeting URL: {session_data.get('meeting_url', 'Unknown')}\n"
            
            if session_data.get('started_at'):
                started = datetime.fromtimestamp(session_data['started_at'])
                content += f"Started: {started.strftime('%Y-%m-%d %H:%M:%S')}\n"
            
            speakers = session_data.get('speakers', ['No speakers detected'])
            content += f"Participants: {', '.join(speakers)}\n\n"
            content += f"Full Transcript:\n{transcript_content}"
            
            # Only clean up session if not awaiting transcript
            should_clean_session = True
            if session_data.get('awaiting_transcript') and session_data.get('status') == 'ended':
                # Recently ended but awaiting transcript - don't clean up yet
                ended_time = session_data.get('ended_at', 0)
                try:
                    ended_time = float(ended_time) if ended_time else 0
                except (ValueError, TypeError):
                    ended_time = 0
                    
                if ended_time > 0 and time.time() - ended_time < 600:  # Less than 10 minutes
                    should_clean_session = False
                    logger.info(f"[STOP] Preserving session for {bot_id} - still awaiting transcript (fallback case)")
            
            if should_clean_session and os.path.exists(session_file):
                os.remove(session_file)
                logger.info(f"[STOP] Cleaned up session file for {bot_id}")
            
            # Safe current duration calculation
            current_duration = 0
            if session_data and session_data.get('started_at'):
                started_at = session_data.get('started_at', 0)
                try:
                    started_at = float(started_at) if started_at else 0
                    if started_at > 0:
                        current_duration = int(time.time() - started_at)
                except (ValueError, TypeError):
                    current_duration = 0
            
            return JSONResponse({
                "success": True,
                "transcript": transcript_content,
                "summary": "",
                "action_items": [],
                "participants": speakers,
                "duration": current_duration,
                "filename": filename,
                "content": content
            })
        else:
            # Meeting hasn't completed properly - provide helpful information
            status = session_data.get('status', 'unknown')
            last_updated = session_data.get('last_updated', 0)
            
            logger.warning(f"[STOP] Meeting not ready for {bot_id}, status: {status}")
            
            # Return partial information if available
            message = f"Meeting status: {status}. "
            if status == 'unknown':
                message += "The bot may have disconnected unexpectedly. Try waiting a moment and refreshing."
            elif status in ['starting', 'joining', 'waiting']:
                message += "The bot is still trying to join the meeting."
            elif status in ['in_call', 'recording']:
                message += "The meeting is still in progress. Please end the meeting first."
            else:
                message += "The meeting may have ended without generating a transcript."
            
            # If we have some session data, return it anyway
            if session_data:
                return JSONResponse({
                    "success": False,
                    "error": message,
                    "status": status,
                    "transcript": session_data.get('partial_transcript', ''),
                    "last_updated": last_updated
                })
            else:
                return JSONResponse({"error": message}, status_code=400)
            
    except Exception as e:
        logger.error(f"[STOP] Error stopping bot {bot_id}: {str(e)}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/meeting-bot/webhook")
async def meeting_bot_webhook(request: Request):
    """
    Handle MeetingBaaS webhook events for real-time bot status updates.
    
    MeetingBaaS sends webhooks with:
    - x-meeting-baas-api-key header for verification
    - JSON payload with event data
    
    Webhook Events:
    - meeting.started: Bot joined meeting
    - meeting.completed: Meeting ended, transcript ready
    - meeting.failed: Bot failed to join
    - transcription.available: Transcript ready
    """
    try:
        # Verify webhook authenticity using API key header
        api_key_header = request.headers.get('x-meeting-baas-api-key')
        expected_api_key = os.getenv('MEETINGBAAS_API_KEY')
        
        if not api_key_header:
            logger.warning(f"[WEBHOOK] No API key header provided in webhook request")
            return JSONResponse({"error": "Missing API key"}, status_code=401)
        
        if not expected_api_key:
            logger.error(f"[WEBHOOK] MEETINGBAAS_API_KEY environment variable not set")
            return JSONResponse({"error": "Server configuration error"}, status_code=500)
        
        if api_key_header != expected_api_key:
            provided_preview = f"{api_key_header[:10]}..." if api_key_header else "None"
            expected_preview = f"{expected_api_key[:10]}..." if expected_api_key else "None"
            logger.warning(f"[WEBHOOK] API key mismatch. Provided: {provided_preview}, Expected: {expected_preview}")
            return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
        logger.debug(f"[WEBHOOK] API key validated successfully")
        
        data = await request.json()
        event_type = data.get('event')  # MeetingBaaS uses 'event', not 'type'
        event_data = data.get('data', {})
        bot_id = event_data.get('bot_id')  # MeetingBaaS uses 'bot_id', not 'botId'
        
        if not bot_id:
            return JSONResponse({"error": "Missing bot_id in webhook"}, status_code=400)
        
        # Simple rate limiting - max 100 requests per minute per bot
        if not hasattr(meeting_bot_webhook, '_rate_limits'):
            meeting_bot_webhook._rate_limits = {}
        
        current_time = time.time()
        rate_key = f"bot_{bot_id}"
        
        # Clean up old entries (older than 1 minute)
        meeting_bot_webhook._rate_limits = {
            k: v for k, v in meeting_bot_webhook._rate_limits.items()
            if current_time - v['first_request'] < 60
        }
        
        # Check rate limit
        if rate_key in meeting_bot_webhook._rate_limits:
            rate_info = meeting_bot_webhook._rate_limits[rate_key]
            if rate_info['count'] >= 100:  # Max 100 requests per minute
                logger.warning(f"[WEBHOOK] Rate limit exceeded for bot {bot_id}")
                return JSONResponse({"error": "Rate limit exceeded"}, status_code=429)
            rate_info['count'] += 1
        else:
            meeting_bot_webhook._rate_limits[rate_key] = {
                'first_request': current_time,
                'count': 1
            }
        
        # Handle idempotency to prevent duplicate processing
        event_id = data.get('event_id') or f"{bot_id}_{event_type}_{int(time.time())}"
        processed_events_key = f"webhook_processed_{event_id}"
        
        # Check if we've already processed this event (simple in-memory check)
        # In production, use Redis or database for distributed systems
        if hasattr(meeting_bot_webhook, '_processed_events'):
            if event_id in meeting_bot_webhook._processed_events:
                print(f"[WEBHOOK] Duplicate event {event_id}, skipping")
                return JSONResponse({"success": True, "message": "Already processed"})
        else:
            meeting_bot_webhook._processed_events = set()
        
        # Mark as processed
        meeting_bot_webhook._processed_events.add(event_id)
        
        # Update stored session
        import json
        sessions_dir = '/tmp/meeting_bot_sessions'
        
        # Create sessions directory with restricted permissions
        if not os.path.exists(sessions_dir):
            os.makedirs(sessions_dir, mode=0o700)  # Only owner can read/write/execute
        
        session_file = f'{sessions_dir}/{bot_id}.json'
        
        if os.path.exists(session_file):
            with open(session_file, 'r') as f:
                session = json.load(f)
            
            # Update session based on MeetingBaaS event type
            if event_type == 'bot.status_change':
                # Handle live status changes during meeting
                status_info = event_data.get('status', {})
                status_code = status_info.get('code')
                created_at = status_info.get('created_at')
                
                # Map MeetingBaaS status codes to our internal statuses
                if status_code == 'joining_call':
                    session['status'] = 'joining'
                elif status_code == 'in_waiting_room':
                    session['status'] = 'waiting'
                elif status_code == 'in_call_not_recording':
                    session['status'] = 'in_call'
                elif status_code == 'in_call_recording':
                    session['status'] = 'recording'
                    session['recording_started_at'] = created_at or time.time()
                elif status_code == 'call_ended':
                    session['status'] = 'ended'
                    session['ended_at'] = created_at or time.time()
                    
                    # FALLBACK: Try to get transcript when call ends without 'complete' event
                    # This handles cases where MeetingBaaS doesn't send a proper complete webhook
                    logger.info(f"[WEBHOOK] Call ended for {bot_id}, checking for transcript")
                    
                    # Don't wait here - the complete event will arrive later
                    # Keep session alive to receive the transcript
                    logger.info(f"[WEBHOOK] Call ended for {bot_id} - session preserved for incoming transcript")
                    session['transcript_text'] = "[Meeting ended - waiting for transcript]"
                    session['awaiting_transcript'] = True  # Flag to indicate we're waiting
                elif status_code in ['bot_rejected', 'bot_removed', 'waiting_room_timeout']:
                    session['status'] = 'failed'
                    session['error'] = status_code
                    session['failed_at'] = created_at or time.time()
                else:
                    session['status'] = status_code  # Use raw status as fallback
                
                session['last_status_code'] = status_code
                logger.info(f"[WEBHOOK] Bot {bot_id} status: {status_code} -> {session['status']}")
                
            elif event_type == 'complete':
                # Handle meeting completion with final data
                session['status'] = 'completed'
                session['transcript_ready'] = True
                session['completed_at'] = time.time()
                session['awaiting_transcript'] = False  # Clear the waiting flag
                
                # Store meeting data using MeetingBaaS format
                session['recording_url'] = event_data.get('mp4')  # Note: 'mp4', not 'mp4Url'
                session['speakers'] = event_data.get('speakers', [])
                session['transcript'] = event_data.get('transcript', [])
                
                # Convert transcript format for easier processing
                if session['transcript']:
                    transcript_text_parts = []
                    for item in session['transcript']:
                        if isinstance(item, dict):
                            speaker = item.get('speaker', 'Unknown')
                            words = item.get('words', [])
                            if words:
                                # Combine all words from this speaker's segment
                                text = ' '.join([word.get('word', '') for word in words if isinstance(word, dict)])
                                if text.strip():
                                    transcript_text_parts.append(f"{speaker}: {text}")
                    
                    if transcript_text_parts:
                        # Add session timestamp header to transcript
                        from datetime import datetime
                        started_at = session.get('started_at', time.time())
                        try:
                            started_at = float(started_at) if started_at else time.time()
                        except (ValueError, TypeError):
                            started_at = time.time()
                        
                        start_time = datetime.fromtimestamp(started_at)
                        timestamp_header = f"=== Recording Session Started: {start_time.strftime('%B %d, %Y at %I:%M %p')} ==="
                        
                        transcript_content = '\n'.join(transcript_text_parts)
                        session['transcript_text'] = f"{timestamp_header}\n\n{transcript_content}"
                        logger.info(f"[WEBHOOK] Meeting {bot_id} completed - transcript ready ({len(transcript_text_parts)} segments)")
                    else:
                        from datetime import datetime
                        started_at = session.get('started_at', time.time())
                        try:
                            started_at = float(started_at) if started_at else time.time()
                        except (ValueError, TypeError):
                            started_at = time.time()
                        
                        start_time = datetime.fromtimestamp(started_at)
                        timestamp_header = f"=== Recording Session Started: {start_time.strftime('%B %d, %Y at %I:%M %p')} ==="
                        
                        session['transcript_text'] = f"{timestamp_header}\n\n[No speech detected during meeting]"
                        logger.info(f"[WEBHOOK] Meeting {bot_id} completed - no speech detected")
                else:
                    from datetime import datetime
                    started_at = session.get('started_at', time.time())
                    try:
                        started_at = float(started_at) if started_at else time.time()
                    except (ValueError, TypeError):
                        started_at = time.time()
                    
                    start_time = datetime.fromtimestamp(started_at)
                    timestamp_header = f"=== Recording Session Started: {start_time.strftime('%B %d, %Y at %I:%M %p')} ==="
                    
                    session['transcript_text'] = f"{timestamp_header}\n\n[No speech detected during meeting]"
                    logger.info(f"[WEBHOOK] Meeting {bot_id} completed - empty transcript")
                
                logger.info(f"[WEBHOOK] Speakers: {session['speakers']}")
                
                # IMPORTANT: Persist transcript to database immediately
                # This ensures transcript is saved even if user doesn't click stop
                if sandbox_id := session.get('sandbox_id'):
                    try:
                        # Validate that the meeting exists and get owner info
                        from datetime import datetime
                        from supabase import create_client as create_supabase_client, Client
                        
                        supabase_url = os.getenv("SUPABASE_URL")
                        
                        # Use service role key for webhook operations (always available and doesn't expire)
                        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
                        if not supabase_key:
                            raise Exception("No service role key available for database update")
                        supabase: Client = create_supabase_client(supabase_url, supabase_key)
                        logger.info(f"[WEBHOOK] Using service role key for meeting {sandbox_id}")
                        
                        if supabase_url:
                            # First verify the meeting exists and belongs to this bot
                            meeting_check = supabase.table('meetings').select('meeting_id, account_id, transcript, metadata').eq('meeting_id', sandbox_id).single().execute()
                            
                            if meeting_check.data:
                                # Additional security: verify this bot was actually assigned to this meeting
                                meeting_metadata = meeting_check.data.get('metadata', {})
                                expected_bot_id = meeting_metadata.get('bot_id')
                                
                                if expected_bot_id and expected_bot_id != bot_id:
                                    logger.warning(f"[WEBHOOK] Security check failed: bot {bot_id} trying to update meeting {sandbox_id} assigned to bot {expected_bot_id}")
                                    raise Exception(f"Bot {bot_id} not authorized to update meeting {sandbox_id}")
                                
                                logger.info(f"[WEBHOOK] Security check passed: bot {bot_id} is authorized for meeting {sandbox_id}")
                                
                                # Prepare transcript append without exposing session IDs
                                existing_transcript = meeting_check.data.get('transcript', '') or ''
                                new_transcript_content = session['transcript_text']
                                session_id = f"bot_{bot_id}_{session.get('started_at', 0)}"

                                # Fetch processed sessions list from metadata
                                processed_sessions = meeting_metadata.get('processed_sessions', []) or []

                                if session_id in processed_sessions:
                                    logger.info(f"[WEBHOOK] Session {session_id} already processed for meeting {sandbox_id}")
                                    combined_transcript = existing_transcript
                                else:
                                    # Append the new transcript with a simple separator
                                    combined_transcript = (existing_transcript + "\n\n" + new_transcript_content).strip() if existing_transcript.strip() else new_transcript_content.strip()
                                    processed_sessions.append(session_id)
                                    meeting_metadata['processed_sessions'] = processed_sessions
                                    logger.info(f"[WEBHOOK] Appended transcript from session {session_id}: existing={len(existing_transcript)} new={len(new_transcript_content)} total={len(combined_transcript)}")
                                
                                # Meeting exists, update it with APPENDED transcript
                                update_result = supabase.table('meetings').update({
                                    'transcript': combined_transcript,
                                    'status': 'completed',
                                    'metadata': {
                                        **meeting_metadata,
                                        'bot_id': None,  # Clear bot_id
                                        'completed_at': datetime.now().isoformat(),
                                        'speakers': session.get('speakers', []),
                                        'webhook_processed': True,  # Mark as processed by webhook
                                        'auth_method': 'service_role'  # Always use service role for webhooks
                                    },
                                    'updated_at': datetime.now().isoformat()
                                }).eq('meeting_id', sandbox_id).execute()
                                
                                logger.info(f"[WEBHOOK] Updated meeting {sandbox_id} with transcript using service_role (owner: {meeting_check.data.get('account_id')})")
                                
                                # Clean up session file now that transcript is safely stored in database
                                if os.path.exists(session_file):
                                    os.remove(session_file)
                                    logger.info(f"[WEBHOOK] Cleaned up session file for {bot_id} - transcript saved to database")
                            else:
                                logger.error(f"[WEBHOOK] Meeting {sandbox_id} not found in database - skipping update")
                                logger.error(f"[WEBHOOK] Transcript saved in session file: {session_file}")
                        else:
                            logger.warning(f"[WEBHOOK] Supabase URL not configured, transcript only in session")
                            logger.warning(f"[WEBHOOK] Transcript saved in session file: {session_file}")
                            logger.warning(f"[WEBHOOK] To manually recover, read file and update meeting {sandbox_id}")
                            
                    except Exception as db_error:
                        logger.error(f"[WEBHOOK] Failed to persist transcript to database: {str(db_error)}")
                        # Log session file path for manual recovery
                        logger.error(f"[WEBHOOK] Transcript saved in session file: {session_file}")
                        logger.error(f"[WEBHOOK] To manually recover, read file and update meeting {sandbox_id}")
                        # Continue anyway - transcript is still in session file
                
            elif event_type == 'failed':
                # Handle bot failure
                session['status'] = 'failed'
                session['error'] = event_data.get('error', 'Unknown error')
                session['failed_at'] = time.time()
                logger.error(f"[WEBHOOK] Bot {bot_id} failed: {session['error']}")
                
            else:
                logger.warning(f"[WEBHOOK] Unknown event type '{event_type}' for bot {bot_id}")
            
            session['last_updated'] = time.time()
            session['last_event'] = event_type
            
            with open(session_file, 'w') as f:
                json.dump(session, f)
            
            # Ensure secure file permissions are maintained
            os.chmod(session_file, 0o600)
            
            # Send real-time update to frontend via SSE
            await broadcast_bot_update(bot_id, session)
            
            logger.info(f"[WEBHOOK] Successfully processed {event_type} for bot {bot_id}")
            
        else:
            logger.warning(f"[WEBHOOK] No session file found for bot {bot_id}, event: {event_type}")
            
        # Clean up old sessions that may be stuck in "stopping" state
        # This prevents orphaned sessions if webhooks are missed
        try:
            sessions_dir = '/tmp/meeting_bot_sessions'
            if os.path.exists(sessions_dir):
                current_time = time.time()
                for filename in os.listdir(sessions_dir):
                    if filename.endswith('.json'):
                        filepath = os.path.join(sessions_dir, filename)
                        try:
                            with open(filepath, 'r') as f:
                                session = json.load(f)
                            
                            # Clean up sessions stuck in "stopping" state for > 5 minutes
                            # BUT preserve sessions awaiting transcript for up to 10 minutes
                            should_cleanup = False
                            
                            # Ensure timestamp values are numeric for comparison
                            stop_requested_at = session.get('stop_requested_at', 0)
                            ended_at = session.get('ended_at', 0)
                            
                            # Convert string timestamps to float
                            try:
                                stop_requested_at = float(stop_requested_at) if stop_requested_at else 0
                            except (ValueError, TypeError):
                                stop_requested_at = 0
                                
                            try:
                                ended_at = float(ended_at) if ended_at else 0
                            except (ValueError, TypeError):
                                ended_at = 0
                            
                            if (session.get('status') == 'stopping' and 
                                stop_requested_at > 0 and
                                current_time - stop_requested_at > 300):
                                should_cleanup = True
                            
                            # Also clean up old "ended" sessions ONLY if they're not awaiting transcript
                            # or if they've been waiting for transcript for more than 10 minutes
                            elif (session.get('status') == 'ended' and 
                                  ended_at > 0 and
                                  current_time - ended_at > 600):  # 10 minutes
                                if not session.get('awaiting_transcript'):
                                    should_cleanup = True
                                else:
                                    logger.info(f"[WEBHOOK] Preserving session {filename} - still awaiting transcript after {(current_time - ended_at)/60:.1f} minutes")
                            
                            if should_cleanup:
                                
                                os.remove(filepath)
                                logger.info(f"[WEBHOOK] Cleaned up orphaned stopping session: {filename}")
                                
                        except json.JSONDecodeError:
                            # Remove truly corrupted session files (malformed JSON)
                            try:
                                os.remove(filepath)
                                logger.info(f"[WEBHOOK] Removed corrupted session file (invalid JSON): {filename}")
                            except Exception:
                                pass
                        except Exception as e:
                            # Log other errors but don't delete session files
                            logger.warning(f"[WEBHOOK] Error reading session file {filename}: {str(e)}")
                            # Don't delete - could be temporarily locked or in use
        except Exception as cleanup_error:
            logger.warning(f"[WEBHOOK] Session cleanup failed: {str(cleanup_error)}")
            
        return JSONResponse({"success": True, "message": "Webhook processed"})
        
    except Exception as e:
        logger.error(f"[WEBHOOK] Error processing webhook: {str(e)}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/meeting-bot/configure-webhook")
async def configure_account_webhook(request: Request):
    """
    Configure account-level webhook URL with MeetingBaaS.
    This sets a default webhook for all bots in your account.
    
    Optional optimization - individual bot webhooks work fine too.
    """
    try:
        data = await request.json()
        webhook_url = data.get('webhook_url')
        
        if not webhook_url:
            webhook_url = f"{request.base_url}api/meeting-bot/webhook"
        
        # Set account-level webhook URL
        import aiohttp
        
        api_key = os.getenv('MEETINGBAAS_API_KEY')
        if not api_key:
            return JSONResponse({"error": "MEETINGBAAS_API_KEY not configured"}, status_code=500)
        
        headers = {
            'x-meeting-baas-api-key': api_key,  # Correct header format
            'Content-Type': 'application/json'
        }
        
        payload = {
            'webhook_url': webhook_url
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                'https://api.meetingbaas.com/accounts/webhook_url',
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"[WEBHOOK CONFIG] Account webhook set to: {webhook_url}")
                    return JSONResponse({
                        "success": True,
                        "webhook_url": webhook_url,
                        "message": "Account-level webhook configured successfully"
                    })
                else:
                    error_text = await response.text()
                    logger.error(f"[WEBHOOK CONFIG] Failed to set account webhook: {error_text}")
                    return JSONResponse({"error": f"Failed to configure webhook: {error_text}"}, status_code=400)
                    
    except Exception as e:
        logger.error(f"[WEBHOOK CONFIG] Error configuring account webhook: {str(e)}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/meeting-bot/test")
async def test_meeting_bot_setup():
    """Test MeetingBaaS API setup and connectivity"""
    try:
        # Check API key
        api_key = os.getenv('MEETINGBAAS_API_KEY')
        if not api_key:
            return JSONResponse({
                "success": False,
                "error": "MEETINGBAAS_API_KEY environment variable not set"
            }, status_code=500)
        
        # Test import
        try:
            from services.meeting_baas import meeting_baas_service
        except Exception as import_error:
            return JSONResponse({
                "success": False,
                "error": f"Failed to import MeetingBaaS service: {str(import_error)}"
            }, status_code=500)
        
        # Test aiohttp import
        try:
            import aiohttp
        except Exception as aiohttp_error:
            return JSONResponse({
                "success": False,
                "error": f"aiohttp not available: {str(aiohttp_error)}"
            }, status_code=500)
        
        return JSONResponse({
            "success": True,
            "message": "MeetingBaaS setup is working",
            "api_key_configured": True,
            "api_key_preview": f"{api_key[:10]}..." if api_key else None,
            "service_imported": True,
            "aiohttp_available": True
        })
        
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": f"Test failed: {str(e)}"
        }, status_code=500)

@app.get("/api/meeting-bot/sessions")
async def get_active_sessions(sandbox_id: str = None):
    """Get all active meeting bot sessions for persistence"""
    try:
        import json
        import os
        
        sessions_dir = '/tmp/meeting_bot_sessions'
        if not os.path.exists(sessions_dir):
            return JSONResponse({"sessions": []})
        
        active_sessions = []
        current_time = time.time()
        
        for filename in os.listdir(sessions_dir):
            if filename.endswith('.json'):
                try:
                    with open(f'{sessions_dir}/{filename}', 'r') as f:
                        session = json.load(f)
                    
                    # Only return sessions from last 24 hours
                    started_at = session.get('started_at', 0)
                    try:
                        started_at = float(started_at) if started_at else 0
                    except (ValueError, TypeError):
                        started_at = 0
                    
                    if current_time - started_at < 86400:
                        if not sandbox_id or session.get('sandbox_id') == sandbox_id:
                            active_sessions.append(session)
                except:
                    continue
        
        return JSONResponse({"sessions": active_sessions})
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def periodic_session_cleanup():
    """Clean up old meeting bot session files periodically"""
    while True:
        try:
            sessions_dir = '/tmp/meeting_bot_sessions'
            if os.path.exists(sessions_dir):
                current_time = time.time()
                cleaned_count = 0
                
                for filename in os.listdir(sessions_dir):
                    if filename.endswith('.json'):
                        filepath = os.path.join(sessions_dir, filename)
                        try:
                            # Get file modification time
                            file_age = current_time - os.path.getmtime(filepath)
                            
                            # Remove files older than 24 hours
                            if file_age > 86400:  # 24 hours in seconds
                                os.remove(filepath)
                                cleaned_count += 1
                                logger.info(f"[SESSION CLEANUP] Removed old session file: {filename} (age: {file_age/3600:.1f} hours)")
                        except Exception as e:
                            logger.error(f"[SESSION CLEANUP] Error cleaning {filename}: {str(e)}")
                
                if cleaned_count > 0:
                    logger.info(f"[SESSION CLEANUP] Cleaned {cleaned_count} old session files")
                    
        except Exception as e:
            logger.error(f"[SESSION CLEANUP] Error during cleanup: {str(e)}")
        
        # Run cleanup every hour
        await asyncio.sleep(3600)

async def _persist_transcript_to_database(session, session_file, bot_id):
    """
    Persist the transcript to the database.
    
    Args:
        session: The session data
        session_file: The path to the session file
        bot_id: The ID of the bot
    """
    try:
        # Validate that the meeting exists and get owner info
        from datetime import datetime
        from supabase import create_client as create_supabase_client, Client
        
        sandbox_id = session.get('sandbox_id')
        if not sandbox_id:
            logger.error(f"[WEBHOOK] No sandbox_id in session for bot {bot_id}")
            return
        
        supabase_url = os.getenv("SUPABASE_URL")
        
        # Use service role key for webhook operations (always available and doesn't expire)
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_key:
            raise Exception("No service role key available for database update")
        supabase: Client = create_supabase_client(supabase_url, supabase_key)
        logger.info(f"[WEBHOOK] Using service role key for meeting {sandbox_id}")
        
        if supabase_url:
            # First verify the meeting exists and belongs to this bot
            meeting_check = supabase.table('meetings').select('meeting_id, account_id, transcript, metadata').eq('meeting_id', sandbox_id).single().execute()
            
            if meeting_check.data:
                # Additional security: verify this bot was actually assigned to this meeting
                meeting_metadata = meeting_check.data.get('metadata', {})
                expected_bot_id = meeting_metadata.get('bot_id')
                
                if expected_bot_id and expected_bot_id != bot_id:
                    logger.warning(f"[WEBHOOK] Security check failed: bot {bot_id} trying to update meeting {sandbox_id} assigned to bot {expected_bot_id}")
                    raise Exception(f"Bot {bot_id} not authorized to update meeting {sandbox_id}")
                
                logger.info(f"[WEBHOOK] Security check passed: bot {bot_id} is authorized for meeting {sandbox_id}")
                
                # Prepare transcript append without exposing session IDs
                existing_transcript = meeting_check.data.get('transcript', '') or ''
                new_transcript_content = session['transcript_text']
                session_id = f"bot_{bot_id}_{session.get('started_at', 0)}"

                # Fetch processed sessions list from metadata
                processed_sessions = meeting_metadata.get('processed_sessions', []) or []

                if session_id in processed_sessions:
                    logger.info(f"[WEBHOOK] Session {session_id} already processed for meeting {sandbox_id}")
                    combined_transcript = existing_transcript
                else:
                    # Append the new transcript with a simple separator
                    combined_transcript = (existing_transcript + "\n\n" + new_transcript_content).strip() if existing_transcript.strip() else new_transcript_content.strip()
                    processed_sessions.append(session_id)
                    meeting_metadata['processed_sessions'] = processed_sessions
                    logger.info(f"[WEBHOOK] Appended transcript from session {session_id}: existing={len(existing_transcript)} new={len(new_transcript_content)} total={len(combined_transcript)}")
                
                # Meeting exists, update it with APPENDED transcript
                update_result = supabase.table('meetings').update({
                    'transcript': combined_transcript,
                    'status': 'completed',
                    'metadata': {
                        **meeting_metadata,
                        'bot_id': None,  # Clear bot_id
                        'completed_at': datetime.now().isoformat(),
                        'speakers': session.get('speakers', []),
                        'webhook_processed': True,  # Mark as processed by webhook
                        'auth_method': 'service_role'  # Always use service role for webhooks
                    },
                    'updated_at': datetime.now().isoformat()
                }).eq('meeting_id', sandbox_id).execute()
                
                logger.info(f"[WEBHOOK] Updated meeting {sandbox_id} with transcript using service_role (owner: {meeting_check.data.get('account_id')})")
            else:
                logger.error(f"[WEBHOOK] Meeting {sandbox_id} not found in database - skipping update")
                logger.error(f"[WEBHOOK] Transcript saved in session file: {session_file}")
        else:
            logger.warning(f"[WEBHOOK] Supabase URL not configured, transcript only in session")
            logger.warning(f"[WEBHOOK] Transcript saved in session file: {session_file}")
            logger.warning(f"[WEBHOOK] To manually recover, read file and update meeting {sandbox_id}")
            
    except Exception as db_error:
        logger.error(f"[WEBHOOK] Failed to persist transcript to database: {str(db_error)}")
        # Log session file path for manual recovery
        logger.error(f"[WEBHOOK] Transcript saved in session file: {session_file}")
        logger.error(f"[WEBHOOK] To manually recover, read file and update meeting {sandbox_id}")
        # Continue anyway - transcript is still in session file

if __name__ == "__main__":
    import uvicorn
    
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    workers = 1
    
    logger.info(f"Starting server on 0.0.0.0:8000 with {workers} workers")
    uvicorn.run(
        "api:app", 
        host="0.0.0.0", 
        port=8000,
        workers=workers,
        loop="asyncio"
    )
