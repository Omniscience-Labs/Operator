#!/usr/bin/env python3
"""
Backfill script for agent run durations and credit calculations.

This script finds agent runs that have completed but were never properly finalized
(total_time_minutes = 0) and calculates their duration and credits retroactively.
"""

import asyncio
import sys
import os
from datetime import datetime, timezone
from typing import List, Dict, Any

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import db
from utils.logger import logger
from services.agent_run_finalizer import AgentRunFinalizer

class AgentRunBackfiller:
    """Handles backfilling agent run durations and credits."""
    
    def __init__(self):
        self.finalizer = AgentRunFinalizer()
    
    async def find_unfinalized_agent_runs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Find agent runs that need to be backfilled.
        
        Args:
            limit: Maximum number of runs to process at once
            
        Returns:
            List of agent run records that need backfilling
        """
        try:
            client = await db.client
            
            # Find completed agent runs with zero duration
            result = await client.table('agent_runs')\
                .select('id, started_at, completed_at, status, reasoning_mode, responses')\
                .in_('status', ['completed', 'failed', 'stopped'])\
                .eq('total_time_minutes', 0)\
                .not_.is_('completed_at', 'null')\
                .limit(limit)\
                .execute()
            
            logger.info(f"Found {len(result.data)} agent runs that need backfilling")
            return result.data
            
        except Exception as e:
            logger.error(f"Error finding unfinalized agent runs: {str(e)}", exc_info=True)
            return []
    
    async def backfill_agent_run(self, agent_run: Dict[str, Any]) -> bool:
        """
        Backfill a single agent run with duration and credit calculations.
        
        Args:
            agent_run: Agent run record from database
            
        Returns:
            True if successful, False otherwise
        """
        agent_run_id = agent_run['id']
        
        try:
            # Parse timestamps
            started_at_str = agent_run['started_at']
            completed_at_str = agent_run['completed_at']
            
            if not started_at_str or not completed_at_str:
                logger.warning(f"Agent run {agent_run_id} missing timestamps, skipping")
                return False
            
            # Convert to datetime objects
            start_time = datetime.fromisoformat(started_at_str.replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(completed_at_str.replace('Z', '+00:00'))
            
            # Parse the responses to determine reasoning mode
            responses = agent_run.get('responses', [])
            
            # Determine reasoning mode based on responses
            reasoning_mode = self._determine_reasoning_mode(responses)
            
            logger.info(f"Backfilling agent run {agent_run_id}: {start_time} -> {end_time} ({reasoning_mode})")
            
            # Finalize the agent run with credit tracking
            await self.finalizer.finalize_agent_run(
                agent_run_id=agent_run_id,
                start_time=start_time,
                end_time=end_time,
                tool_results=None,  # Let finalizer handle tool results internally
                reasoning_mode=reasoning_mode
            )
            
            logger.info(f"Successfully backfilled agent run {agent_run_id}")
            return True
                
        except Exception as e:
            logger.error(f"Error backfilling agent run {agent_run_id}: {str(e)}", exc_info=True)
            return False
    
    async def backfill_all(self, batch_size: int = 50, max_batches: int = None) -> Dict[str, int]:
        """
        Backfill all unfinalized agent runs in batches.
        
        Args:
            batch_size: Number of runs to process per batch
            max_batches: Maximum number of batches to process (None = unlimited)
            
        Returns:
            Dictionary with processing statistics
        """
        stats = {
            'total_found': 0,
            'successful': 0,
            'failed': 0,
            'batches_processed': 0
        }
        
        batch_count = 0
        
        while True:
            # Check batch limit
            if max_batches and batch_count >= max_batches:
                logger.info(f"Reached maximum batch limit ({max_batches})")
                break
                
            # Find next batch
            agent_runs = await self.find_unfinalized_agent_runs(limit=batch_size)
            
            if not agent_runs:
                logger.info("No more agent runs to backfill")
                break
            
            stats['total_found'] += len(agent_runs)
            batch_count += 1
            stats['batches_processed'] = batch_count
            
            logger.info(f"Processing batch {batch_count}: {len(agent_runs)} agent runs")
            
            # Process each run in the batch
            for agent_run in agent_runs:
                success = await self.backfill_agent_run(agent_run)
                if success:
                    stats['successful'] += 1
                else:
                    stats['failed'] += 1
                
                # Small delay between runs to avoid overwhelming the database
                await asyncio.sleep(0.1)
            
            logger.info(f"Batch {batch_count} complete: {stats['successful']} successful, {stats['failed']} failed")
            
            # Delay between batches
            await asyncio.sleep(1)
        
        return stats
    
    def _determine_reasoning_mode(self, responses: List[Dict[str, Any]]) -> str:
        """
        Determine the reasoning mode based on responses.
        
        Args:
            responses: List of response messages
            
        Returns:
            Reasoning mode ('none', 'medium', 'high')
        """
        try:
            # Look for thinking/reasoning indicators in responses
            for response in responses:
                if isinstance(response, dict):
                    # Check for reasoning content or thinking tags
                    content = response.get('content', '')
                    if isinstance(content, str):
                        # Simple heuristics for reasoning mode detection
                        if 'thinking' in content.lower() or 'reasoning' in content.lower():
                            # More sophisticated logic could be added here
                            if len(content) > 2000:  # Long reasoning = high
                                return 'high'
                            elif len(content) > 500:  # Medium reasoning
                                return 'medium'
                            else:
                                return 'medium'  # Default for any reasoning
                    
                    # Check response type for reasoning indicators
                    response_type = response.get('type', '')
                    if 'thinking' in response_type or 'reasoning' in response_type:
                        return 'medium'  # Default for reasoning responses
            
            # Default to 'none' if no reasoning indicators found
            return 'none'
            
        except Exception as e:
            logger.warning(f"Error determining reasoning mode: {str(e)}")
            return 'none'  # Safe default

async def main():
    """Main function to run the backfill process."""
    logger.info("Starting agent run duration backfill process")
    
    try:
        # Initialize database connection
        await db.initialize()
        
        # Create backfiller instance
        backfiller = AgentRunBackfiller()
        
        # Check how many runs need backfilling
        sample_runs = await backfiller.find_unfinalized_agent_runs(limit=10)
        total_sample = len(sample_runs)
        
        if total_sample == 0:
            logger.info("No agent runs need backfilling. All runs are already finalized.")
            return
        
        logger.info(f"Found at least {total_sample} agent runs that need backfilling")
        
        # Ask for confirmation in interactive mode
        if sys.stdin.isatty():
            response = input(f"Do you want to proceed with backfilling? (y/N): ")
            if response.lower() != 'y':
                logger.info("Backfill cancelled by user")
                return
        
        # Run the backfill process
        # Process in smaller batches to be safe
        stats = await backfiller.backfill_all(batch_size=20, max_batches=50)
        
        # Report final statistics
        logger.info("Backfill process completed", extra=stats)
        print(f"""
Backfill Results:
================
Total runs found: {stats['total_found']}
Successfully processed: {stats['successful']}
Failed: {stats['failed']}
Batches processed: {stats['batches_processed']}
Success rate: {(stats['successful'] / stats['total_found'] * 100):.1f}%
""")
        
    except KeyboardInterrupt:
        logger.info("Backfill process interrupted by user")
    except Exception as e:
        logger.error(f"Error in backfill process: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 