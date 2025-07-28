from daytona_sdk import Daytona, DaytonaConfig, CreateSandboxFromImageParams, Sandbox, SessionExecuteRequest, Resources, SandboxState
from dotenv import load_dotenv
from utils.logger import logger
from utils.config import config
from utils.config import Configuration
import time
import asyncio
import concurrent.futures
from functools import partial

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

# Thread pool executor for blocking Daytona SDK calls
# Increased max_workers to handle more concurrent sandbox operations
executor = concurrent.futures.ThreadPoolExecutor(max_workers=8, thread_name_prefix="daytona")

async def run_in_executor_with_timeout(func, *args, timeout=30):
    """Run a synchronous function in an executor with timeout."""
    loop = asyncio.get_event_loop()
    try:
        logger.debug(f"Executing {func.__name__} in thread pool with timeout {timeout}s")
        result = await asyncio.wait_for(
            loop.run_in_executor(executor, func, *args),
            timeout=timeout
        )
        logger.debug(f"Successfully completed {func.__name__}")
        return result
    except asyncio.TimeoutError:
        logger.error(f"Operation timed out after {timeout} seconds: {func.__name__}")
        raise Exception(f"Daytona operation timed out after {timeout} seconds")
    except Exception as e:
        logger.error(f"Error in executor operation {func.__name__}: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        raise e

async def get_or_start_sandbox(sandbox_id: str):
    """Retrieve a sandbox by ID, check its state, and start it if needed."""
    
    logger.info(f"Getting or starting sandbox with ID: {sandbox_id}")
    
    try:
        # Get sandbox info with timeout
        logger.debug("Fetching sandbox information...")
        sandbox = await run_in_executor_with_timeout(daytona.get, sandbox_id, timeout=15)
        logger.debug(f"Sandbox current state: {sandbox.state}")
        
        # Check if sandbox needs to be started
        if sandbox.state == SandboxState.ARCHIVED or sandbox.state == SandboxState.STOPPED:
            logger.info(f"Sandbox is in {sandbox.state} state. Starting...")
            try:
                # Start sandbox with timeout
                logger.debug("Starting sandbox...")
                await run_in_executor_with_timeout(daytona.start, sandbox, timeout=45)
                
                # Wait a moment for the sandbox to initialize
                logger.debug("Waiting for sandbox to initialize...")
                await asyncio.sleep(3)
                
                # Refresh sandbox state after starting
                logger.debug("Refreshing sandbox state...")
                sandbox = await run_in_executor_with_timeout(daytona.get, sandbox_id, timeout=15)
                logger.info(f"Sandbox state after start: {sandbox.state}")
                
                # Ensure services are running after restart
                await ensure_sandbox_services_running(sandbox)
            except Exception as e:
                logger.error(f"Error starting sandbox: {e}")
                raise e
        else:
            logger.info(f"Sandbox is already in {sandbox.state} state")
        
        logger.info(f"Sandbox {sandbox_id} is ready")
        return sandbox
        
    except Exception as e:
        logger.error(f"Error retrieving or starting sandbox: {str(e)}")
        raise e

async def ensure_sandbox_services_running(sandbox: Sandbox):
    """Ensure that all required services are running in the sandbox."""
    try:
        logger.info("Ensuring sandbox services are running")
        
        # Check if supervisord is running, if not start it
        try:
            logger.debug("Checking if supervisord is running...")
            result = await run_in_executor_with_timeout(
                sandbox.process.execute,
                SessionExecuteRequest(command="pgrep -f supervisord", var_async=False),
                timeout=10
            )
            
            if not result.exit_code == 0:
                # Supervisord not running, start it
                logger.info("Supervisord not running, starting it")
                await start_supervisord_session(sandbox)
            else:
                logger.info("Supervisord already running, restarting services")
                # Restart all services using supervisorctl
                await run_in_executor_with_timeout(
                    sandbox.process.execute,
                    SessionExecuteRequest(command="supervisorctl restart all", var_async=True),
                    timeout=20
                )
        except Exception as e:
            logger.warning(f"Could not check supervisord status, attempting to start: {e}")
            await start_supervisord_session(sandbox)
            
    except Exception as e:
        logger.error(f"Error ensuring sandbox services: {str(e)}")
        # Don't raise - let the sandbox start anyway
        pass

async def start_supervisord_session(sandbox: Sandbox):
    """Start supervisord in a session if not already running."""
    session_id = f"supervisord-session-{int(time.time())}"  # Use unique session ID
    try:
        logger.info(f"Creating session {session_id} for supervisord")
        await run_in_executor_with_timeout(
            sandbox.process.create_session,
            session_id,
            timeout=10
        )
        
        # Execute supervisord command
        await run_in_executor_with_timeout(
            sandbox.process.execute_session_command,
            session_id,
            SessionExecuteRequest(
                command="exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf",
                var_async=True
            ),
            timeout=15
        )
        logger.info(f"Supervisord started in session {session_id}")
    except Exception as e:
        logger.error(f"Error starting supervisord session: {str(e)}")
        # Don't raise - supervisord might already be running
        pass

async def create_sandbox(password: str, project_id: str = None):
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
    
    # Create the sandbox using the executor to prevent blocking
    logger.debug("Creating sandbox with Daytona API...")
    sandbox = await run_in_executor_with_timeout(daytona.create, params, timeout=60)
    logger.debug(f"Sandbox created with ID: {sandbox.id}")
    
    # Start supervisord in a session for new sandbox
    try:
        await start_supervisord_session(sandbox)
    except Exception as e:
        logger.warning(f"Failed to start supervisord for new sandbox: {e}")
    
    logger.debug(f"Sandbox environment successfully initialized")
    return sandbox



async def delete_sandbox(sandbox_id: str):
    """Delete a sandbox by its ID."""
    logger.info(f"Deleting sandbox with ID: {sandbox_id}")
    
    try:
        await run_in_executor_with_timeout(daytona.delete, sandbox_id, timeout=30)
        logger.info(f"Successfully deleted sandbox {sandbox_id}")
    except Exception as e:
        logger.error(f"Error deleting sandbox {sandbox_id}: {str(e)}")
        raise e

