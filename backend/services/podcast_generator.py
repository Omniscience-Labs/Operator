import dramatiq
import asyncio
import os
import requests
import json
import uuid
from typing import Dict, Any, Optional, List
from utils.logger import logger
from utils.config import config


@dramatiq.actor
async def generate_podcast_background(
    job_id: str,
    thread_id: str,
    project_id: str,
    payload: Dict[str, Any]
):
    """Background actor to generate podcasts by calling external podcastfy service"""
    try:
        logger.info(f"🎙️ Starting podcast generation for job {job_id}")
        
        # Get the external podcastfy API URL
        api_base_url = os.getenv('PODCASTFY_API_URL', 'https://podcastfy-8x6a.onrender.com')
        
        # Store initial status in Redis
        from utils.redis import get_redis_connection
        redis = await get_redis_connection()
        
        await redis.hset(
            f"podcast_job:{job_id}",
            mapping={
                "status": "processing",
                "project_id": project_id,
                "thread_id": thread_id,
                "started_at": str(asyncio.get_event_loop().time())
            }
        )
        
        # Call the external podcastfy service
        logger.info(f"Calling external podcastfy service: {api_base_url}/generate")
        
        # Make synchronous request to external service (this runs in background worker)
        response = requests.post(
            f"{api_base_url}/generate",
            json=payload,
            timeout=600  # 10 minutes timeout for podcast generation
        )
        response.raise_for_status()
        result = response.json()
        
        if not result or not result.get("audioUrl"):
            raise Exception("Podcast generation failed: No audio URL returned from external service")
        
        audio_url = result["audioUrl"]
        logger.info(f"✅ Podcast generated successfully: {audio_url}")
        
        # Store successful result in Redis
        await redis.hset(
            f"podcast_job:{job_id}",
            mapping={
                "status": "completed",
                "audio_url": audio_url,
                "project_id": project_id,
                "thread_id": thread_id,
                "transcript_url": result.get("transcriptUrl", ""),
                "completed_at": str(asyncio.get_event_loop().time())
            }
        )
        
        # Set expiration (24 hours)
        await redis.expire(f"podcast_job:{job_id}", 86400)
        
        logger.info(f"✅ Job {job_id} completed and stored in Redis")
        
    except Exception as e:
        logger.error(f"❌ Podcast generation failed for job {job_id}: {str(e)}")
        
        # Store error in Redis
        try:
            from utils.redis import get_redis_connection
            redis = await get_redis_connection()
            
            await redis.hset(
                f"podcast_job:{job_id}",
                mapping={
                    "status": "failed",
                    "error": str(e),
                    "project_id": project_id,
                    "thread_id": thread_id,
                    "failed_at": str(asyncio.get_event_loop().time())
                }
            )
            
            await redis.expire(f"podcast_job:{job_id}", 86400)
            
        except Exception as redis_error:
            logger.error(f"Failed to store error in Redis: {redis_error}")
        
        raise e 