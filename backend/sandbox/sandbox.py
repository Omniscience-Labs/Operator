import asyncio
import aiohttp
from typing import Optional
from daytona_sdk import Daytona, DaytonaConfig, CreateSandboxFromImageParams, Sandbox, SessionExecuteRequest, Resources, SandboxState
from dotenv import load_dotenv
from utils.logger import logger
from utils.config import config
from utils.config import Configuration

load_dotenv()

logger.debug("Initializing Daytona sandbox configuration")
daytona_config = DaytonaConfig(
    api_key=config.DAYTONA_API_KEY,
    server_url=config.DAYTONA_SERVER_URL,
    target=config.DAYTONA_TARGET
)

if daytona_config.api_key:
    logger.debug("Daytona API key configured successfully")
else:
    logger.warning("No Daytona API key found in environment variables")

if daytona_config.server_url:
    logger.debug(f"Daytona server URL set to: {daytona_config.server_url}")
else:
    logger.warning("No Daytona server URL found in environment variables")

if daytona_config.target:
    logger.debug(f"Daytona target set to: {daytona_config.target}")
else:
    logger.warning("No Daytona target found in environment variables")

daytona = Daytona(daytona_config)
logger.debug("Daytona client initialized")

async def get_or_start_sandbox(sandbox_id: str):
    """Retrieve a sandbox by ID, check its state, and start it if needed."""
    
    logger.info(f"Getting or starting sandbox with ID: {sandbox_id}")
    
    try:
        sandbox = daytona.get(sandbox_id)
        
        # Check if sandbox needs to be started
        if sandbox.state == SandboxState.ARCHIVED or sandbox.state == SandboxState.STOPPED:
            logger.info(f"Sandbox is in {sandbox.state} state. Starting...")
            try:
                daytona.start(sandbox)
                # Wait a moment for the sandbox to initialize
                # sleep(5)
                # Refresh sandbox state after starting
                sandbox = daytona.get(sandbox_id)
                
                # Start supervisord in a session when restarting
                await start_supervisord_session_with_wait(sandbox)
            except Exception as e:
                logger.error(f"Error starting sandbox: {e}")
                raise e
        
        logger.info(f"Sandbox {sandbox_id} is ready")
        return sandbox
        
    except Exception as e:
        logger.error(f"Error retrieving or starting sandbox: {str(e)}")
        raise e

async def start_supervisord_session_with_wait(sandbox: Sandbox):
    """Start supervisord in a session and wait for HTTP server to be ready."""
    session_id = "supervisord-session"
    try:
        logger.info(f"Creating session {session_id} for supervisord")
        sandbox.process.create_session(session_id)
        
        # Execute supervisord command
        sandbox.process.execute_session_command(session_id, SessionExecuteRequest(
            command="exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf",
            var_async=True
        ))
        logger.info(f"Supervisord started in session {session_id}")
        
        # Wait for HTTP server to be ready
        await wait_for_http_server(sandbox)
        
    except Exception as e:
        logger.error(f"Error starting supervisord session: {str(e)}")
        raise e

async def wait_for_http_server(sandbox: Sandbox, max_wait_time: int = 60):
    """Wait for the HTTP server on port 8080 to be ready."""
    logger.info("Waiting for HTTP server to be ready...")
    
    # Get the sandbox URL and construct health check URL
    sandbox_url = sandbox.sandbox_url
    if not sandbox_url:
        logger.warning("No sandbox URL available, skipping health check")
        return
    
    # Remove port if present and add 8080
    base_url = sandbox_url.replace(':8080', '')
    health_url = f"{base_url}:8080/health"
    
    start_time = asyncio.get_event_loop().time()
    
    async with aiohttp.ClientSession() as session:
        while (asyncio.get_event_loop().time() - start_time) < max_wait_time:
            try:
                async with session.get(health_url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        logger.info("HTTP server is ready!")
                        return
            except Exception as e:
                logger.debug(f"Health check failed: {e}")
            
            # Wait 2 seconds before next attempt
            await asyncio.sleep(2)
    
    logger.warning(f"HTTP server did not become ready within {max_wait_time} seconds")

def start_supervisord_session(sandbox: Sandbox):
    """Start supervisord in a session (legacy sync version)."""
    session_id = "supervisord-session"
    try:
        logger.info(f"Creating session {session_id} for supervisord")
        sandbox.process.create_session(session_id)
        
        # Execute supervisord command
        sandbox.process.execute_session_command(session_id, SessionExecuteRequest(
            command="exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf",
            var_async=True
        ))
        logger.info(f"Supervisord started in session {session_id}")
    except Exception as e:
        logger.error(f"Error starting supervisord session: {str(e)}")
        raise e

def create_sandbox(password: str, project_id: str = None):
    """Create a new sandbox with all required services configured and running."""
    
    logger.debug("Creating new Daytona sandbox environment")
    logger.debug("Configuring sandbox with browser-use image and environment variables")
    
    labels = None
    if project_id:
        logger.debug(f"Using sandbox_id as label: {project_id}")
        labels = {'id': project_id}
        
    params = CreateSandboxFromImageParams(
        image=Configuration.SANDBOX_IMAGE_NAME,
        public=True,
        labels=labels,
        env_vars={
            "CHROME_PERSISTENT_SESSION": "true",
            "RESOLUTION": "1024x768x24",
            "RESOLUTION_WIDTH": "1024",
            "RESOLUTION_HEIGHT": "768",
            "VNC_PASSWORD": password,
            "ANONYMIZED_TELEMETRY": "false",
            "CHROME_PATH": "",
            "CHROME_USER_DATA": "",
            "CHROME_DEBUGGING_PORT": "9222",
            "CHROME_DEBUGGING_HOST": "localhost",
            "CHROME_CDP": ""
        },
        resources=Resources(
            cpu=2,
            memory=4,
            disk=5,
        ),
        auto_stop_interval=15,
        auto_archive_interval=24 * 60,
    )
    
    # Create the sandbox
    sandbox = daytona.create(params)
    logger.debug(f"Sandbox created with ID: {sandbox.id}")
    
    # Start supervisord in a session for new sandbox
    start_supervisord_session(sandbox)
    
    logger.debug(f"Sandbox environment successfully initialized")
    return sandbox

async def delete_sandbox(sandbox_id: str):
    """Delete a sandbox by its ID."""
    logger.info(f"Deleting sandbox with ID: {sandbox_id}")
    
    try:
        # Get the sandbox
        sandbox = daytona.get(sandbox_id)
        
        # Delete the sandbox
        daytona.remove(sandbox)
        
        logger.info(f"Successfully deleted sandbox {sandbox_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting sandbox {sandbox_id}: {str(e)}")
        raise e

