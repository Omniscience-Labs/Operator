"""
Credit tracking service for saving credit usage to the database.
"""

from typing import Dict, Any, Optional
from datetime import datetime
from decimal import Decimal
from utils.logger import logger
from services.supabase import DBConnection
import json

class CreditTracker:
    """Handles saving credit usage data to the database."""
    
    def __init__(self):
        self.db = DBConnection()
    
    async def save_tool_credit_usage(
        self,
        agent_run_id: str,
        tool_name: str,
        credits: float,
        calculation_details: Dict[str, Any],
        data_provider_name: Optional[str] = None
    ) -> bool:
        """
        Save tool credit usage to the database.
        
        Args:
            agent_run_id: ID of the agent run
            tool_name: Name of the tool that was executed (e.g., 'linkedin_data_provider')
            credits: Number of credits charged
            calculation_details: Details about how credits were calculated
            data_provider_name: Specific data provider if this was a data provider call (for reference)
            
        Returns:
            True if saved successfully, False otherwise
        """
        try:
            client = await self.db.client
            
            # Always use 'tool' as usage_type for consistent analytics
            usage_type = 'tool'
            
            credit_data = {
                'agent_run_id': agent_run_id,
                'usage_type': usage_type,
                'tool_name': tool_name,
                'data_provider_name': data_provider_name,  # Keep for reference/filtering
                'credit_amount': credits,
                'calculation_details': calculation_details,
                'created_at': datetime.utcnow().isoformat()
            }
            
            result = await client.table('credit_usage').insert(credit_data).execute()
            
            if result.data:
                provider_info = f" ({data_provider_name})" if data_provider_name else ""
                logger.info(f"Saved credit usage: {tool_name}{provider_info} = {credits} credits", 
                           extra={
                               'agent_run_id': agent_run_id,
                               'usage_type': usage_type,
                               'data_provider': data_provider_name
                           })
                return True
            else:
                logger.error(f"Failed to save credit usage for {tool_name}")
                return False
                
        except Exception as e:
            logger.error(f"Error saving tool credit usage: {str(e)}", exc_info=True)
            return False
    
    async def save_conversation_credit_usage(
        self,
        agent_run_id: str,
        credits: float,
        calculation_details: Dict[str, Any]
    ) -> bool:
        """
        Save conversation credit usage to the database.
        
        Args:
            agent_run_id: ID of the agent run
            credits: Number of credits charged for conversation time
            calculation_details: Details about how credits were calculated
            
        Returns:
            True if saved successfully, False otherwise
        """
        try:
            client = await self.db.client
            
            credit_data = {
                'agent_run_id': agent_run_id,
                'usage_type': 'conversation',
                'tool_name': None,
                'data_provider_name': None,
                'credit_amount': credits,
                'calculation_details': calculation_details,
                'created_at': datetime.utcnow().isoformat()
            }
            
            result = await client.table('credit_usage').insert(credit_data).execute()
            
            if result.data:
                logger.info(f"Saved conversation credit usage: {credits} credits", 
                           extra={'agent_run_id': agent_run_id})
                return True
            else:
                logger.error(f"Failed to save conversation credit usage")
                return False
                
        except Exception as e:
            logger.error(f"Error saving conversation credit usage: {str(e)}", exc_info=True)
            return False
    
    async def update_agent_run_totals(
        self,
        agent_run_id: str,
        total_time_minutes: float,
        reasoning_mode: str = 'none'
    ) -> bool:
        """
        Update agent run with total credits and timing information.
        
        Args:
            agent_run_id: ID of the agent run
            total_time_minutes: Total time the agent run took
            reasoning_mode: The reasoning mode used ('none', 'medium', 'high')
            
        Returns:
            True if updated successfully, False otherwise
        """
        try:
            client = await self.db.client
            
            # Get all credit usage for this agent run
            credit_usage_result = await client.table('credit_usage')\
                .select('usage_type, credit_amount')\
                .eq('agent_run_id', agent_run_id)\
                .execute()
            
            conversation_credits = 0
            tool_credits = 0
            
            for usage in credit_usage_result.data:
                if usage['usage_type'] == 'conversation':
                    conversation_credits += float(usage['credit_amount'])
                else:
                    tool_credits += float(usage['credit_amount'])
            
            total_credits = conversation_credits + tool_credits
            
            # Update the agent_runs table
            update_data = {
                'reasoning_mode': reasoning_mode,
                'total_time_minutes': total_time_minutes,
                'conversation_credits': conversation_credits,
                'tool_credits': tool_credits,
                'total_credits': total_credits
            }
            
            result = await client.table('agent_runs')\
                .update(update_data)\
                .eq('id', agent_run_id)\
                .execute()
            
            if result.data:
                logger.info(f"Updated agent run totals: {total_credits} credits total", 
                           extra={
                               'agent_run_id': agent_run_id,
                               'conversation_credits': conversation_credits,
                               'tool_credits': tool_credits,
                               'reasoning_mode': reasoning_mode
                           })
                return True
            else:
                logger.error(f"Failed to update agent run totals")
                return False
                
        except Exception as e:
            logger.error(f"Error updating agent run totals: {str(e)}", exc_info=True)
            return False
    
    async def get_credit_usage_summary(self, agent_run_id: str) -> Dict[str, Any]:
        """
        Get a summary of credit usage for an agent run.
        
        Args:
            agent_run_id: ID of the agent run
            
        Returns:
            Dictionary with credit usage summary
        """
        try:
            client = await self.db.client
            
            # Get detailed breakdown
            result = await client.rpc('get_credit_usage_summary', {'p_agent_run_id': agent_run_id}).execute()
            
            summary = {
                'agent_run_id': agent_run_id,
                'breakdown': result.data if result.data else [],
                'total_credits': sum(float(item['total_credits']) for item in result.data) if result.data else 0
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting credit usage summary: {str(e)}", exc_info=True)
            return {
                'agent_run_id': agent_run_id,
                'breakdown': [],
                'total_credits': 0,
                'error': str(e)
            }
    
    async def get_data_provider_usage_stats(
        self, 
        agent_run_id: Optional[str] = None,
        account_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get statistics about data provider usage.
        
        Args:
            agent_run_id: Optional specific agent run ID
            account_id: Optional account ID for account-wide stats
            
        Returns:
            Dictionary with data provider usage statistics
        """
        try:
            client = await self.db.client
            
            query = client.table('credit_usage')\
                .select('data_provider_name, credit_amount, created_at, calculation_details')\
                .eq('usage_type', 'data_provider')
            
            if agent_run_id:
                query = query.eq('agent_run_id', agent_run_id)
            
            result = await query.execute()
            
            # Aggregate by provider
            provider_stats = {}
            for usage in result.data:
                provider = usage['data_provider_name']
                if provider not in provider_stats:
                    provider_stats[provider] = {
                        'total_credits': 0,
                        'call_count': 0,
                        'average_cost': 0
                    }
                
                provider_stats[provider]['total_credits'] += float(usage['credit_amount'])
                provider_stats[provider]['call_count'] += 1
            
            # Calculate averages
            for provider, stats in provider_stats.items():
                if stats['call_count'] > 0:
                    stats['average_cost'] = stats['total_credits'] / stats['call_count']
            
            return {
                'total_provider_calls': len(result.data),
                'total_provider_credits': sum(float(usage['credit_amount']) for usage in result.data),
                'provider_breakdown': provider_stats,
                'agent_run_id': agent_run_id
            }
            
        except Exception as e:
            logger.error(f"Error getting data provider usage stats: {str(e)}", exc_info=True)
            return {
                'total_provider_calls': 0,
                'total_provider_credits': 0,
                'provider_breakdown': {},
                'error': str(e)
            } 