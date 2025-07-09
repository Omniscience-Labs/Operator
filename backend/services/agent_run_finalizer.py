"""
Agent run finalizer service for processing credit usage when agent runs complete.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import logging
import json
from services.credit_calculator import CreditCalculator
from services.credit_tracker import CreditTracker
from services.supabase import DBConnection
from agentpress.utils.json_helpers import safe_json_parse

logger = logging.getLogger(__name__)

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
            agent_run_id: The agent run ID to finalize
            start_time: When the agent run started
            end_time: When the agent run ended
            tool_results: Optional list of tool results (will query database if not provided)
            reasoning_mode: The reasoning mode used ('none', 'medium', 'high')
            
        Returns:
            Dictionary with finalization summary
        """
        try:
            # Calculate conversation credits
            total_time_minutes = (end_time - start_time).total_seconds() / 60
            conversation_credits, conversation_details = self.credit_calculator.calculate_conversation_credits(
                total_time_minutes, reasoning_mode
            )
            
            # Save conversation credit usage
            await self.credit_tracker.save_conversation_credit_usage(
                agent_run_id, float(conversation_credits), conversation_details
            )
            
            # Get tool results from database if not provided
            if tool_results is None:
                tool_results = await self._get_tool_results_from_database(agent_run_id)
            
            # Process tool credit usage
            tool_credits_saved = 0
            data_provider_calls = 0
            
            if tool_results:
                logger.info(f"Processing {len(tool_results)} tool results for credit tracking")
                for i, tool_result in enumerate(tool_results):
                    logger.info(f"DEBUG: Processing tool result {i+1}/{len(tool_results)} with structure: {json.dumps(tool_result, indent=2)[:500]}...")
                    
                    # Extract credit info from tool result
                    credit_info = self._extract_credit_info_from_tool_result(tool_result)
                    
                    if credit_info:
                        logger.info(f"DEBUG: Found credit info for tool: {credit_info.get('tool_name', 'unknown')} - {credit_info.get('credits', 0)} credits - data_provider_name: {credit_info.get('data_provider_name')}")
                        try:
                            await self.credit_tracker.save_tool_credit_usage(
                                agent_run_id=agent_run_id,
                                tool_name=credit_info['tool_name'],
                                credits=credit_info['credits'],
                                calculation_details=credit_info['calculation_details'],
                                data_provider_name=credit_info.get('data_provider_name')
                            )
                            tool_credits_saved += 1
                            logger.info(f"DEBUG: Successfully saved credit usage for {credit_info['tool_name']} with data_provider_name: {credit_info.get('data_provider_name')}")
                            
                            # Count data provider calls (those with data_provider_name)
                            if credit_info.get('data_provider_name'):
                                data_provider_calls += 1
                                logger.info(f"DEBUG: Counted data provider call: {credit_info['data_provider_name']}")
                        except Exception as save_error:
                            logger.error(f"Failed to save credit usage for {credit_info.get('tool_name', 'unknown')}: {save_error}")
                    else:
                        logger.warning(f"DEBUG: No credit info found for tool result {i+1}")
            else:
                logger.info("No tool results to process for credit tracking")
            
            logger.info(f"Credit tracking summary: {tool_credits_saved} tool credits saved, {data_provider_calls} data provider calls")
            
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
    
    async def _get_tool_results_from_database(self, agent_run_id: str) -> List[Dict[str, Any]]:
        """
        Get tool results from the database for an agent run.
        
        Args:
            agent_run_id: The agent run ID
            
        Returns:
            List of tool results with credit info
        """
        try:
            client = await self.db.client
            
            # Get agent run with responses
            result = await client.table('agent_runs')\
                .select('responses')\
                .eq('id', agent_run_id)\
                .execute()
            
            if not result.data:
                logger.warning(f"No agent run found for ID {agent_run_id}")
                return []
            
            responses = result.data[0].get('responses', [])
            if not responses:
                logger.info(f"No responses found for agent run {agent_run_id}")
                return []
            
            # Extract tool results
            tool_results = []
            for response in responses:
                if isinstance(response, dict) and response.get('type') == 'tool':
                    tool_results.append(response)
            
            logger.info(f"Found {len(tool_results)} tool results in database for agent run {agent_run_id}")
            return tool_results
            
        except Exception as e:
            logger.error(f"Error getting tool results from database: {str(e)}", exc_info=True)
            return []
    
    def _extract_credit_info_from_tool_result(self, tool_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract credit info from a tool result.
        
        Args:
            tool_result: Tool result dictionary
            
        Returns:
            Credit info dictionary or None if not found
        """
        try:
            logger.info(f"DEBUG: Extracting credit info from tool result with keys: {list(tool_result.keys())}")
            
            # Check direct credit info first
            if '_credit_info' in tool_result:
                logger.info("DEBUG: Found _credit_info directly in tool_result")
                return tool_result['_credit_info']
            
            # Check metadata (which may be a JSON string)
            if 'metadata' in tool_result:
                metadata = tool_result['metadata']
                logger.info(f"DEBUG: Found metadata in tool_result, type: {type(metadata)}, value: {metadata}")
                
                # If metadata is a string, parse it
                if isinstance(metadata, str):
                    try:
                        metadata = safe_json_parse(metadata, {})
                        logger.info(f"DEBUG: Parsed metadata from string: {metadata}")
                    except:
                        metadata = {}
                        logger.info("DEBUG: Failed to parse metadata string")
                
                # Extract credit info from metadata
                if isinstance(metadata, dict) and '_credit_info' in metadata:
                    logger.info("DEBUG: Found _credit_info in metadata")
                    return metadata['_credit_info']
                elif isinstance(metadata, dict):
                    logger.info(f"DEBUG: Metadata is dict but no _credit_info. Keys: {list(metadata.keys())}")
            
            # Fallback: Check if this is a data provider call and calculate credits
            if 'content' in tool_result:
                content = tool_result.get('content', {})
                if isinstance(content, str):
                    try:
                        content = safe_json_parse(content, {})
                    except:
                        pass
                
                if isinstance(content, dict) and content.get('role') in ['user', 'assistant']:
                    message_content = content.get('content', '')
                    if isinstance(message_content, str):
                        try:
                            parsed_content = safe_json_parse(message_content, {})
                            if isinstance(parsed_content, dict) and 'tool_execution' in parsed_content:
                                tool_execution = parsed_content['tool_execution']
                                function_name = tool_execution.get('function_name')
                                arguments = tool_execution.get('arguments', {})
                                
                                if function_name == 'execute_data_provider_call':
                                    service_name = arguments.get('service_name')
                                    route = arguments.get('route')
                                    
                                    if service_name:
                                        logger.info(f"DEBUG: Detected data provider call without credit info: {service_name} - {route}")
                                        # Calculate credits for this data provider
                                        from services.credit_calculator import CreditCalculator
                                        credit_calc = CreditCalculator()
                                        credits, details, tool_name = credit_calc.calculate_data_provider_credits(service_name, route)
                                        
                                        logger.info(f"DEBUG: Calculated credits for fallback: tool_name={tool_name}, credits={credits}, data_provider_name={service_name}")
                                        
                                        return {
                                            'tool_name': tool_name,
                                            'credits': float(credits),
                                            'calculation_details': details,
                                            'data_provider_name': service_name,
                                            'usage_type': 'tool'
                                        }
                        except Exception as parse_error:
                            logger.debug(f"Failed to parse message content: {parse_error}")
            
            logger.debug("No credit info found in tool result")
            return None
            
        except Exception as e:
            logger.error(f"Error extracting credit info from tool result: {str(e)}")
            return None 