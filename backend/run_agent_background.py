import sentry
import asyncio
import json
import traceback
from datetime import datetime, timezone
from typing import Optional
from services import redis
from agent.run import run_agent
from utils.logger import logger, structlog
import dramatiq
import uuid
from agentpress.thread_manager import ThreadManager
from services.supabase import DBConnection
from services import redis
from dramatiq.brokers.rabbitmq import RabbitmqBroker
import os
from services.langfuse import langfuse
from utils.retry import retry

# RabbitMQ connection configuration
rabbitmq_host = os.getenv('RABBITMQ_HOST', 'localhost')
rabbitmq_port = int(os.getenv('RABBITMQ_PORT', 5672))
rabbitmq_user = os.getenv('RABBITMQ_USER', 'guest')
rabbitmq_password = os.getenv('RABBITMQ_PASSWORD', 'guest')
rabbitmq_vhost = os.getenv('RABBITMQ_VHOST', '/')

# Create connection URL
rabbitmq_url = f"amqp://{rabbitmq_user}:{rabbitmq_password}@{rabbitmq_host}:{rabbitmq_port}/{rabbitmq_vhost}"

# Initialize broker with connection URL
rabbitmq_broker = RabbitmqBroker(url=rabbitmq_url, middleware=[dramatiq.middleware.AsyncIO()])
dramatiq.set_broker(rabbitmq_broker)

_initialized = False
db = DBConnection()
instance_id = "single"

async def initialize():
    """Initialize the agent API with resources from the main API."""
    global db, instance_id, _initialized

    # Use provided instance_id or generate a new one
    if not instance_id:
        # Generate instance ID
        instance_id = str(uuid.uuid4())[:8]
    await retry(lambda: redis.initialize_async())
    await db.initialize()

    _initialized = True
    logger.info(f"Initialized agent API with instance ID: {instance_id}")


@dramatiq.actor
async def run_agent_background(
    agent_run_id: str,
    thread_id: str,
    instance_id: str, # Use the global instance ID passed during initialization
    project_id: str,
    model_name: str,
    enable_thinking: Optional[bool],
    reasoning_effort: Optional[str],
    stream: bool,
    enable_context_manager: bool,
    agent_config: Optional[dict] = None,
    is_agent_builder: Optional[bool] = False,
    target_agent_id: Optional[str] = None,
    request_id: Optional[str] = None,
    user_name: Optional[str] = None,
):
    """Run the agent in the background using Redis for state."""
    structlog.contextvars.clear_contextvars()

    structlog.contextvars.bind_contextvars(
        agent_run_id=agent_run_id,
        thread_id=thread_id,
        request_id=request_id,
    )

    try:
        await initialize()
    except Exception as e:
        logger.critical(f"Failed to initialize Redis connection: {e}")
        raise e

    # Idempotency check: prevent duplicate runs
    run_lock_key = f"agent_run_lock:{agent_run_id}"
    
    # Try to acquire a lock for this agent run
    lock_acquired = await redis.set(run_lock_key, instance_id, nx=True, ex=redis.REDIS_KEY_TTL)
    
    if not lock_acquired:
        # Check if the run is already being handled by another instance
        existing_instance = await redis.get(run_lock_key)
        if existing_instance:
            logger.info(f"Agent run {agent_run_id} is already being processed by instance {existing_instance.decode() if isinstance(existing_instance, bytes) else existing_instance}. Skipping duplicate execution.")
            return
        else:
            # Lock exists but no value, try to acquire again
            lock_acquired = await redis.set(run_lock_key, instance_id, nx=True, ex=redis.REDIS_KEY_TTL)
            if not lock_acquired:
                logger.info(f"Agent run {agent_run_id} is already being processed by another instance. Skipping duplicate execution.")
                return

    sentry.sentry.set_tag("thread_id", thread_id)

    logger.info(f"Starting background agent run: {agent_run_id} for thread: {thread_id} (Instance: {instance_id})")
    logger.info({
        "model_name": model_name,
        "enable_thinking": enable_thinking,
        "reasoning_effort": reasoning_effort,
        "stream": stream,
        "enable_context_manager": enable_context_manager,
        "agent_config": agent_config,
        "is_agent_builder": is_agent_builder,
        "target_agent_id": target_agent_id,
    })
    logger.info(f"🚀 Using model: {model_name} (thinking: {enable_thinking}, reasoning_effort: {reasoning_effort})")
    if agent_config:
        logger.info(f"Using custom agent: {agent_config.get('name', 'Unknown')}")

    client = await db.client
    start_time = datetime.now(timezone.utc)
    total_responses = 0
    pubsub = None
    stop_checker = None
    stop_signal_received = False

    # Define Redis keys and channels
    response_list_key = f"agent_run:{agent_run_id}:responses"
    response_channel = f"agent_run:{agent_run_id}:new_response"
    instance_control_channel = f"agent_run:{agent_run_id}:control:{instance_id}"
    global_control_channel = f"agent_run:{agent_run_id}:control"
    instance_active_key = f"active_run:{instance_id}:{agent_run_id}"

    async def check_for_stop_signal():
        nonlocal stop_signal_received
        if not pubsub: return
        try:
            while not stop_signal_received:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.5)
                if message and message.get("type") == "message":
                    data = message.get("data")
                    if isinstance(data, bytes): data = data.decode('utf-8')
                    if data == "STOP":
                        logger.info(f"Received STOP signal for agent run {agent_run_id} (Instance: {instance_id})")
                        stop_signal_received = True
                        break
                # Periodically refresh the active run key TTL
                if total_responses % 50 == 0: # Refresh every 50 responses or so
                    try: await redis.expire(instance_active_key, redis.REDIS_KEY_TTL)
                    except Exception as ttl_err: logger.warning(f"Failed to refresh TTL for {instance_active_key}: {ttl_err}")
                await asyncio.sleep(0.1) # Short sleep to prevent tight loop
        except asyncio.CancelledError:
            logger.info(f"Stop signal checker cancelled for {agent_run_id} (Instance: {instance_id})")
        except Exception as e:
            logger.error(f"Error in stop signal checker for {agent_run_id}: {e}", exc_info=True)
            stop_signal_received = True # Stop the run if the checker fails

    # Create a v3-compatible trace using get_client
    try:
        from langfuse import get_client
        langfuse_client = get_client()
        
        # Create a mock trace object that's compatible with v3 API
        class MockTraceV3:
            def __init__(self, client, trace_id, name, session_id, metadata):
                self.client = client
                self.trace_id = trace_id
                self.name = name
                self.session_id = session_id
                self.metadata = metadata or {}
                
            def span(self, name, input=None):
                # Create a mock span that's compatible with the existing usage
                class MockSpan:
                    def __init__(self, client, name, input_data=None):
                        self.client = client
                        self.name = name
                        self.input_data = input_data
                        
                    def end(self, status_message=None, level=None, output=None, **kwargs):
                        # In v3, we can create a simple span for logging
                        try:
                            with self.client.start_as_current_span(name=self.name) as span:
                                if self.input_data:
                                    span.update(input=self.input_data)
                                if output:
                                    span.update(output=output)
                                if status_message:
                                    span.update(status_message=status_message)
                                if level:
                                    span.update(level=level)
                        except Exception:
                            # Silently fail if tracing fails
                            pass
                            
                    def update(self, **kwargs):
                        """Update span metadata"""
                        # No-op for mock spans
                        pass
                            
                return MockSpan(self.client, name, input)
                
            def update(self, **kwargs):
                """Update trace metadata - compatible with v3 API"""
                try:
                    self.client.update_current_trace(**kwargs)
                except Exception:
                    # Silently fail if tracing fails
                    pass
                    
            def generation(self, name):
                """Create a generation object - compatible with v3 API"""
                class MockGeneration:
                    def __init__(self, client, name):
                        self.client = client
                        self.name = name
                        
                    def update(self, **kwargs):
                        """Update generation metadata"""
                        # No-op for mock generations
                        pass

                    def end(self, output=None, status_message=None, level=None, **kwargs):
                        """End the generation with optional parameters"""
                        try:
                            with self.client.start_as_current_span(name=self.name) as span:
                                if output:
                                    span.update(output=output)
                                if status_message:
                                    span.update(status_message=status_message)
                                if level:
                                    span.update(level=level)
                        except Exception:
                            # Silently fail if tracing fails
                            pass
                            
                return MockGeneration(self.client, name)
                
            def event(self, name, level="DEFAULT", status_message="", metadata=None):
                """Create an event - compatible with v3 API"""
                try:
                    with self.client.start_as_current_span(name=name) as span:
                        span.update(
                            level=level,
                            status_message=status_message,
                            metadata=metadata or {}
                        )
                except Exception:
                    # Silently fail if tracing fails
                    pass
                
        trace = MockTraceV3(langfuse_client, agent_run_id, "agent_run", thread_id, {"project_id": project_id, "instance_id": instance_id})
    except Exception as e:
        # Fallback if langfuse fails - create a no-op trace
        logger.warning(f"Failed to initialize langfuse trace: {e}")
        class NoOpTrace:
            def span(self, name, input=None):
                class NoOpSpan:
                    def end(self, **kwargs): pass
                    def update(self, **kwargs): pass
                return NoOpSpan()
                
            def update(self, **kwargs):
                """No-op update method for compatibility"""
                pass
                
            def generation(self, name):
                """No-op generation method for compatibility"""
                class NoOpGeneration:
                    def update(self, **kwargs):
                        """No-op update method"""
                        pass
                    def end(self, **kwargs):
                        """No-op end method"""
                        pass
                return NoOpGeneration()
                
            def event(self, name, level="DEFAULT", status_message="", metadata=None):
                """No-op event method for compatibility"""
                pass
        trace = NoOpTrace()
    try:
        # Setup Pub/Sub listener for control signals
        pubsub = await redis.create_pubsub()
        try:
            await retry(lambda: pubsub.subscribe(instance_control_channel, global_control_channel))
        except Exception as e:
            logger.error(f"Redis failed to subscribe to control channels: {e}", exc_info=True)
            raise e

        logger.debug(f"Subscribed to control channels: {instance_control_channel}, {global_control_channel}")
        stop_checker = asyncio.create_task(check_for_stop_signal())

        # Ensure active run key exists and has TTL
        await redis.set(instance_active_key, "running", ex=redis.REDIS_KEY_TTL)


        # Initialize agent generator
        agent_gen = run_agent(
            thread_id=thread_id, project_id=project_id, stream=stream,
            model_name=model_name,
            enable_thinking=enable_thinking, reasoning_effort=reasoning_effort,
            enable_context_manager=enable_context_manager,
            agent_config=agent_config,
            trace=trace,
            is_agent_builder=is_agent_builder,
            target_agent_id=target_agent_id,
            user_name=user_name,
        )

        final_status = "running"
        error_message = None

        pending_redis_operations = []

        async for response in agent_gen:
            if stop_signal_received:
                logger.info(f"Agent run {agent_run_id} stopped by signal.")
                final_status = "stopped"
                trace.span(name="agent_run_stopped").end(status_message="agent_run_stopped", level="WARNING")
                break

            # Store response in Redis list and publish notification
            response_json = json.dumps(response)
            pending_redis_operations.append(asyncio.create_task(redis.rpush(response_list_key, response_json)))
            pending_redis_operations.append(asyncio.create_task(redis.publish(response_channel, "new")))
            total_responses += 1

            # Check for agent-signaled completion or error
            if response.get('type') == 'status':
                 status_val = response.get('status')
                 if status_val in ['completed', 'failed', 'stopped']:
                     logger.info(f"Agent run {agent_run_id} finished via status message: {status_val}")
                     final_status = status_val
                     if status_val == 'failed' or status_val == 'stopped':
                         error_message = response.get('message', f"Run ended with status: {status_val}")
                     break

        # If loop finished without explicit completion/error/stop signal, mark as completed
        if final_status == "running":
             final_status = "completed"
             duration = (datetime.now(timezone.utc) - start_time).total_seconds()
             logger.info(f"Agent run {agent_run_id} completed normally (duration: {duration:.2f}s, responses: {total_responses})")
             completion_message = {"type": "status", "status": "completed", "message": "Agent run completed successfully"}
             trace.span(name="agent_run_completed").end(status_message="agent_run_completed")
             await redis.rpush(response_list_key, json.dumps(completion_message))
             await redis.publish(response_channel, "new") # Notify about the completion message

        # Fetch final responses from Redis for DB update
        all_responses_json = await redis.lrange(response_list_key, 0, -1)
        all_responses = [json.loads(r) for r in all_responses_json]

        # Update DB status
        await update_agent_run_status(client, agent_run_id, final_status, error=error_message, responses=all_responses)

        # Finalize agent run with credit tracking and duration calculation
        end_time = datetime.now(timezone.utc)
        try:
            from services.agent_run_finalizer import AgentRunFinalizer
            finalizer = AgentRunFinalizer()
            
            # Extract tool results with credit info from responses
            tool_results = []
            for response in all_responses:
                if isinstance(response, dict) and response.get('type') == 'tool_result':
                    tool_results.append(response)
            
            reasoning_mode = 'none'  # Default
            if enable_thinking:
                if reasoning_effort == 'high':
                    reasoning_mode = 'high'
                elif reasoning_effort in ['medium', 'low']:
                    reasoning_mode = 'medium'
            
            finalization_result = await finalizer.finalize_agent_run(
                agent_run_id=agent_run_id,
                start_time=start_time,
                end_time=end_time,
                tool_results=tool_results,
                reasoning_mode=reasoning_mode
            )
            
            logger.info(f"Agent run finalization completed", extra=finalization_result)
            
        except Exception as finalization_error:
            logger.error(f"Error during agent run finalization for {agent_run_id}: {str(finalization_error)}", exc_info=True)
            # Don't fail the entire run if finalization fails

        # Publish final control signal (END_STREAM or ERROR)
        control_signal = "END_STREAM" if final_status == "completed" else "ERROR" if final_status == "failed" else "STOP"
        try:
            await redis.publish(global_control_channel, control_signal)
            # No need to publish to instance channel as the run is ending on this instance
            logger.debug(f"Published final control signal '{control_signal}' to {global_control_channel}")
        except Exception as e:
            logger.warning(f"Failed to publish final control signal {control_signal}: {str(e)}")

    except Exception as e:
        error_message = str(e)
        traceback_str = traceback.format_exc()
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.error(f"Error in agent run {agent_run_id} after {duration:.2f}s: {error_message}\n{traceback_str} (Instance: {instance_id})")
        final_status = "failed"
        trace.span(name="agent_run_failed").end(status_message=error_message, level="ERROR")

        # Push error message to Redis list
        error_response = {"type": "status", "status": "error", "message": error_message}
        try:
            await redis.rpush(response_list_key, json.dumps(error_response))
            await redis.publish(response_channel, "new")
        except Exception as redis_err:
             logger.error(f"Failed to push error response to Redis for {agent_run_id}: {redis_err}")

        # Fetch final responses (including the error)
        all_responses = []
        try:
             all_responses_json = await redis.lrange(response_list_key, 0, -1)
             all_responses = [json.loads(r) for r in all_responses_json]
        except Exception as fetch_err:
             logger.error(f"Failed to fetch responses from Redis after error for {agent_run_id}: {fetch_err}")
             all_responses = [error_response] # Use the error message we tried to push

        # Update DB status
        await update_agent_run_status(client, agent_run_id, "failed", error=f"{error_message}\n{traceback_str}", responses=all_responses)

        # Finalize failed agent run with credit tracking and duration calculation
        end_time = datetime.now(timezone.utc)
        try:
            from services.agent_run_finalizer import AgentRunFinalizer
            finalizer = AgentRunFinalizer()
            
            # Extract tool results with credit info from responses
            tool_results = []
            for response in all_responses:
                if isinstance(response, dict) and response.get('type') == 'tool_result':
                    tool_results.append(response)
            
            reasoning_mode = 'none'  # Default
            if enable_thinking:
                if reasoning_effort == 'high':
                    reasoning_mode = 'high'
                elif reasoning_effort in ['medium', 'low']:
                    reasoning_mode = 'medium'
            
            finalization_result = await finalizer.finalize_agent_run(
                agent_run_id=agent_run_id,
                start_time=start_time,
                end_time=end_time,
                tool_results=tool_results,
                reasoning_mode=reasoning_mode
            )
            
            logger.info(f"Failed agent run finalization completed", extra=finalization_result)
            
        except Exception as finalization_error:
            logger.error(f"Error during failed agent run finalization for {agent_run_id}: {str(finalization_error)}", exc_info=True)
            # Don't fail the entire run if finalization fails

        # Publish ERROR signal
        try:
            await redis.publish(global_control_channel, "ERROR")
            logger.debug(f"Published ERROR signal to {global_control_channel}")
        except Exception as e:
            logger.warning(f"Failed to publish ERROR signal: {str(e)}")

    finally:
        # Cleanup stop checker task
        if stop_checker and not stop_checker.done():
            stop_checker.cancel()
            try: await stop_checker
            except asyncio.CancelledError: pass
            except Exception as e: logger.warning(f"Error during stop_checker cancellation: {e}")

        # Close pubsub connection
        if pubsub:
            try:
                await pubsub.unsubscribe()
                await pubsub.close()
                logger.debug(f"Closed pubsub connection for {agent_run_id}")
            except Exception as e:
                logger.warning(f"Error closing pubsub for {agent_run_id}: {str(e)}")

        # Set TTL on the response list in Redis
        await _cleanup_redis_response_list(agent_run_id)

        # Remove the instance-specific active run key
        await _cleanup_redis_instance_key(agent_run_id)

        # Clean up the run lock
        await _cleanup_redis_run_lock(agent_run_id)

        # Wait for all pending redis operations to complete, with timeout
        try:
            await asyncio.wait_for(asyncio.gather(*pending_redis_operations), timeout=30.0)
        except asyncio.TimeoutError:
            logger.warning(f"Timeout waiting for pending Redis operations for {agent_run_id}")

        logger.info(f"Agent run background task fully completed for: {agent_run_id} (Instance: {instance_id}) with final status: {final_status}")

async def _cleanup_redis_instance_key(agent_run_id: str):
    """Clean up the instance-specific Redis key for an agent run."""
    if not instance_id:
        logger.warning("Instance ID not set, cannot clean up instance key.")
        return
    key = f"active_run:{instance_id}:{agent_run_id}"
    logger.debug(f"Cleaning up Redis instance key: {key}")
    try:
        await redis.delete(key)
        logger.debug(f"Successfully cleaned up Redis key: {key}")
    except Exception as e:
        logger.warning(f"Failed to clean up Redis key {key}: {str(e)}")

async def _cleanup_redis_run_lock(agent_run_id: str):
    """Clean up the run lock Redis key for an agent run."""
    run_lock_key = f"agent_run_lock:{agent_run_id}"
    logger.debug(f"Cleaning up Redis run lock key: {run_lock_key}")
    try:
        await redis.delete(run_lock_key)
        logger.debug(f"Successfully cleaned up Redis run lock key: {run_lock_key}")
    except Exception as e:
        logger.warning(f"Failed to clean up Redis run lock key {run_lock_key}: {str(e)}")

# TTL for Redis response lists (24 hours)
REDIS_RESPONSE_LIST_TTL = 3600 * 24

async def _cleanup_redis_response_list(agent_run_id: str):
    """Set TTL on the Redis response list."""
    response_list_key = f"agent_run:{agent_run_id}:responses"
    try:
        await redis.expire(response_list_key, REDIS_RESPONSE_LIST_TTL)
        logger.debug(f"Set TTL ({REDIS_RESPONSE_LIST_TTL}s) on response list: {response_list_key}")
    except Exception as e:
        logger.warning(f"Failed to set TTL on response list {response_list_key}: {str(e)}")

async def update_agent_run_status(
    client,
    agent_run_id: str,
    status: str,
    error: Optional[str] = None,
    responses: Optional[list[any]] = None # Expects parsed list of dicts
) -> bool:
    """
    Centralized function to update agent run status.
    Returns True if update was successful.
    """
    try:
        update_data = {
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }

        if error:
            update_data["error"] = error

        if responses:
            # Ensure responses are stored correctly as JSONB
            update_data["responses"] = responses

        # Retry up to 3 times
        for retry in range(3):
            try:
                update_result = await client.table('agent_runs').update(update_data).eq("id", agent_run_id).execute()

                if hasattr(update_result, 'data') and update_result.data:
                    logger.info(f"Successfully updated agent run {agent_run_id} status to '{status}' (retry {retry})")

                    # Verify the update
                    verify_result = await client.table('agent_runs').select('status', 'completed_at').eq("id", agent_run_id).execute()
                    if verify_result.data:
                        actual_status = verify_result.data[0].get('status')
                        completed_at = verify_result.data[0].get('completed_at')
                        logger.info(f"Verified agent run update: status={actual_status}, completed_at={completed_at}")
                    return True
                else:
                    logger.warning(f"Database update returned no data for agent run {agent_run_id} on retry {retry}: {update_result}")
                    if retry == 2:  # Last retry
                        logger.error(f"Failed to update agent run status after all retries: {agent_run_id}")
                        return False
            except Exception as db_error:
                logger.error(f"Database error on retry {retry} updating status for {agent_run_id}: {str(db_error)}")
                if retry < 2:  # Not the last retry yet
                    await asyncio.sleep(0.5 * (2 ** retry))  # Exponential backoff
                else:
                    logger.error(f"Failed to update agent run status after all retries: {agent_run_id}", exc_info=True)
                    return False
    except Exception as e:
        logger.error(f"Unexpected error updating agent run status for {agent_run_id}: {str(e)}", exc_info=True)
        return False

    return False
