"""
Agent run finalizer service for processing credit usage when agent runs complete.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from utils.logger import logger
from services.credit_calculator import CreditCalculator
from services.credit_tracker import CreditTracker
from services.supabase import DBConnection

class AgentRunFinalizer:
    """Handles finalizing agent runs and calculating total credit usage."""
    
    def __init__(self):
        self.credit_calculator = CreditCalculator()
        self.credit_tracker = CreditTracker()
        self.db = DBConnection()
    
    async def finalize_agent_run(
        self,
        agent_run_id: str,
        start_time: datetime,
        end_time: datetime,
        tool_results: List[Dict[str, Any]] = None,
        reasoning_mode: str = 'none'
    ) -> Dict[str, Any]:
        """
        Finalize an agent run by calculating and saving all credit usage.
        
        Args:
            agent_run_id: ID of the agent run to finalize
            start_time: When the agent run started
            end_time: When the agent run ended
            tool_results: List of tool execution results with credit info
            reasoning_mode: The reasoning mode used
            
        Returns:
            Dictionary with finalization summary
        """
        try:
            logger.info(f"Finalizing agent run {agent_run_id}")
            
            # Calculate total time
            total_time_minutes = (end_time - start_time).total_seconds() / 60.0
            logger.info(f"Agent run duration: {total_time_minutes:.2f} minutes")
            
            # Calculate conversation credits
            conversation_credits, conversation_details = self.credit_calculator.calculate_conversation_credits(
                total_time_minutes, reasoning_mode
            )
            
            # Save conversation credit usage
            await self.credit_tracker.save_conversation_credit_usage(
                agent_run_id, float(conversation_credits), conversation_details
            )
            
                         # Process tool credit usage
            tool_credits_saved = 0
            data_provider_calls = 0
            
            if tool_results:
                for tool_result in tool_results:
                    credit_info = tool_result.get('_credit_info')
                    if credit_info:
                        await self.credit_tracker.save_tool_credit_usage(
                            agent_run_id=agent_run_id,
                            tool_name=credit_info['tool_name'],
                            credits=credit_info['credits'],
                            calculation_details=credit_info['calculation_details'],
                            data_provider_name=credit_info.get('data_provider_name')
                        )
                        tool_credits_saved += 1
                        
                        # Count data provider calls (those with data_provider_name)
                        if credit_info.get('data_provider_name'):
                            data_provider_calls += 1
            
            # Update agent run totals
            await self.credit_tracker.update_agent_run_totals(
                agent_run_id, total_time_minutes, reasoning_mode
            )
            
            # Get final summary
            usage_summary = await self.credit_tracker.get_credit_usage_summary(agent_run_id)
            provider_stats = await self.credit_tracker.get_data_provider_usage_stats(agent_run_id=agent_run_id)
            
            finalization_summary = {
                'agent_run_id': agent_run_id,
                'total_time_minutes': total_time_minutes,
                'reasoning_mode': reasoning_mode,
                'conversation_credits': float(conversation_credits),
                'tool_credits_saved': tool_credits_saved,
                'data_provider_calls': data_provider_calls,
                'total_credits': usage_summary.get('total_credits', 0),
                'usage_breakdown': usage_summary.get('breakdown', []),
                'data_provider_stats': provider_stats,
                'finalized_at': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Agent run {agent_run_id} finalized successfully", extra=finalization_summary)
            return finalization_summary
            
        except Exception as e:
            logger.error(f"Error finalizing agent run {agent_run_id}: {str(e)}", exc_info=True)
            return {
                'agent_run_id': agent_run_id,
                'error': str(e),
                'finalized_at': datetime.utcnow().isoformat()
            }
    
    async def get_agent_run_cost_preview(
        self,
        estimated_time_minutes: float,
        reasoning_mode: str = 'none',
        planned_tools: List[str] = None,
        planned_data_providers: List[str] = None
    ) -> Dict[str, Any]:
        """
        Get a cost preview for an agent run before execution.
        
        Args:
            estimated_time_minutes: Estimated conversation time
            reasoning_mode: Reasoning mode to be used
            planned_tools: List of tools that might be used
            planned_data_providers: List of data providers that might be called
            
        Returns:
            Dictionary with cost estimates
        """
        try:
            # Calculate conversation cost estimate
            conversation_credits, _ = self.credit_calculator.calculate_conversation_credits(
                estimated_time_minutes, reasoning_mode
            )
            
            # Calculate tool costs
            tool_costs = {}
            total_tool_credits = 0
            
            if planned_tools:
                for tool_name in planned_tools:
                    tool_credits, _ = self.credit_calculator.calculate_tool_credits(tool_name)
                    tool_costs[tool_name] = float(tool_credits)
                    total_tool_credits += float(tool_credits)
            
                         # Calculate data provider costs (these show up as individual tools)
            provider_costs = {}
            total_provider_credits = 0
            
            if planned_data_providers:
                for provider_name in planned_data_providers:
                    provider_credits, _, tool_name = self.credit_calculator.calculate_data_provider_credits(provider_name)
                    provider_costs[tool_name] = float(provider_credits)  # Use tool name for consistency
                    total_provider_credits += float(provider_credits)
            
            total_estimated_credits = float(conversation_credits) + total_tool_credits + total_provider_credits
            
            return {
                'estimated_time_minutes': estimated_time_minutes,
                'reasoning_mode': reasoning_mode,
                'conversation_credits': float(conversation_credits),
                'tool_credits': total_tool_credits,
                'data_provider_credits': total_provider_credits,
                'total_estimated_credits': total_estimated_credits,
                'breakdown': {
                    'conversation': float(conversation_credits),
                    'tools': tool_costs,
                    'data_providers': provider_costs
                },
                'cost_tiers': {
                    'conversation': 'low' if conversation_credits < 2 else 'medium' if conversation_credits < 5 else 'high',
                    'tools': 'low' if total_tool_credits < 3 else 'medium' if total_tool_credits < 10 else 'high',
                    'data_providers': 'low' if total_provider_credits < 5 else 'medium' if total_provider_credits < 15 else 'high'
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating cost preview: {str(e)}", exc_info=True)
            return {
                'error': str(e),
                'total_estimated_credits': 0
            }
    
    async def get_account_credit_usage_stats(
        self,
        account_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get credit usage statistics for an account.
        
        Args:
            account_id: Account ID to get stats for
            start_date: Optional start date for filtering
            end_date: Optional end date for filtering
            
        Returns:
            Dictionary with account credit usage statistics
        """
        try:
            client = await self.db.client
            
            # Build query for agent runs
            query = client.table('agent_runs')\
                .select('id, total_credits, conversation_credits, tool_credits, reasoning_mode, created_at')\
                .join('threads', 'agent_runs.thread_id', 'threads.thread_id')\
                .eq('threads.account_id', account_id)
            
            if start_date:
                query = query.gte('created_at', start_date.isoformat())
            if end_date:
                query = query.lte('created_at', end_date.isoformat())
            
            agent_runs_result = await query.execute()
            
            # Calculate aggregated stats
            total_credits = 0
            total_conversation_credits = 0
            total_tool_credits = 0
            reasoning_usage = {'none': 0, 'medium': 0, 'high': 0}
            
            for run in agent_runs_result.data:
                total_credits += float(run.get('total_credits', 0))
                total_conversation_credits += float(run.get('conversation_credits', 0))
                total_tool_credits += float(run.get('tool_credits', 0))
                
                reasoning_mode = run.get('reasoning_mode', 'none')
                if reasoning_mode in reasoning_usage:
                    reasoning_usage[reasoning_mode] += 1
            
            # Get data provider specific stats
            provider_stats = await self.credit_tracker.get_data_provider_usage_stats(account_id=account_id)
            
            return {
                'account_id': account_id,
                'period': {
                    'start_date': start_date.isoformat() if start_date else None,
                    'end_date': end_date.isoformat() if end_date else None
                },
                'totals': {
                    'total_credits': total_credits,
                    'conversation_credits': total_conversation_credits,
                    'tool_credits': total_tool_credits,
                    'agent_runs': len(agent_runs_result.data)
                },
                'reasoning_usage': reasoning_usage,
                'data_provider_stats': provider_stats
            }
            
        except Exception as e:
            logger.error(f"Error getting account credit stats: {str(e)}", exc_info=True)
            return {
                'account_id': account_id,
                'error': str(e),
                'totals': {
                    'total_credits': 0,
                    'conversation_credits': 0,
                    'tool_credits': 0,
                    'agent_runs': 0
                }
            } 