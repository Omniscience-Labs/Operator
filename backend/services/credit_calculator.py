"""
Credit calculation service for tracking conversation time, tool usage, and data provider costs.
"""

from typing import Dict, Any, Optional, Tuple
from decimal import Decimal
from datetime import datetime
from utils.config import config
from utils.logger import logger
import json

class CreditCalculator:
    """Handles credit calculations for conversations, tools, and data providers."""
    
    def __init__(self):
        self.credit_rates = config.CREDIT_RATES
        logger.debug("CreditCalculator initialized with rates", extra={"rates": self.credit_rates})
    
    def calculate_conversation_credits(
        self, 
        time_minutes: float, 
        reasoning_mode: str = 'none'
    ) -> Tuple[Decimal, Dict[str, Any]]:
        """
        Calculate credits for conversation time based on reasoning mode.
        
        Returns:
            Tuple of (credit_amount, calculation_details)
        """
        base_rate = self.credit_rates['base_rate']
        
        if reasoning_mode == 'medium':
            rate = self.credit_rates['reasoning_rate_medium']
            multiplier = rate
        elif reasoning_mode == 'high':
            rate = self.credit_rates['reasoning_rate_high']
            multiplier = rate
        else:
            rate = base_rate
            multiplier = 1.0
            
        credits = Decimal(str(time_minutes)) * Decimal(str(rate))
        credits = credits.quantize(Decimal('0.01'))
        
        calculation_details = {
            'time_minutes': time_minutes,
            'base_rate': base_rate,
            'reasoning_mode': reasoning_mode,
            'multiplier': multiplier,
            'final_rate': rate,
            'calculation': f"{time_minutes} minutes × {rate} rate = {credits} credits"
        }
        
        logger.debug(f"Conversation credits calculated: {credits}", extra=calculation_details)
        return credits, calculation_details
    
    def calculate_tool_credits(self, tool_name: str) -> Tuple[Decimal, Dict[str, Any]]:
        """
        Calculate credits for a specific tool call.
        
        Returns:
            Tuple of (credit_amount, calculation_details)
        """
        tool_costs = self.credit_rates['tool_costs']
        
        # Handle MCP tools
        if tool_name.startswith('mcp_') or tool_name.startswith('custom_'):
            cost = tool_costs.get('mcp_tool', tool_costs['default'])
        else:
            # Get specific tool cost or default
            cost = tool_costs.get(tool_name, tool_costs['default'])
        
        credits = Decimal(str(cost))
        
        calculation_details = {
            'tool_name': tool_name,
            'cost_rate': cost,
            'cost_tier': self._get_cost_tier(credits),
            'calculation': f"Tool '{tool_name}' = {credits} credits"
        }
        
        logger.debug(f"Tool credits calculated: {credits}", extra=calculation_details)
        return credits, calculation_details
    
    def calculate_data_provider_credits(
        self, 
        provider_name: str, 
        route: str = None, 
        payload: Dict[str, Any] = None
    ) -> Tuple[Decimal, Dict[str, Any], str]:
        """
        Calculate credits for a specific data provider call.
        
        Args:
            provider_name: Name of the data provider (linkedin, twitter, etc.)
            route: The specific endpoint route called
            payload: The payload sent to the provider
            
        Returns:
            Tuple of (credit_amount, calculation_details, tool_name_for_analytics)
        """
        # Create tool name for analytics - treat each provider as a separate tool
        tool_name_for_analytics = f"{provider_name}_data_provider"
        
        # Check tool_costs first (for consistency), then fall back to data_provider_costs
        tool_costs = self.credit_rates['tool_costs']
        provider_costs = self.credit_rates['data_provider_costs']
        
        # Get cost from tool_costs if available, otherwise use data_provider_costs
        if tool_name_for_analytics in tool_costs:
            cost = tool_costs[tool_name_for_analytics]
        else:
            cost = provider_costs.get(provider_name, provider_costs['default'])
        credits = Decimal(str(cost))
        
        calculation_details = {
            'provider_name': provider_name,
            'route': route,
            'cost_rate': cost,
            'cost_tier': self._get_cost_tier(credits),
            'tool_name': tool_name_for_analytics,
            'calculation': f"{provider_name.title()} Data Provider = {credits} credits"
        }
        
        # Add payload info if provided (without sensitive data)
        if payload:
            # Only include non-sensitive metadata about the payload
            payload_info = {
                'payload_size': len(str(payload)),
                'param_count': len(payload) if isinstance(payload, dict) else 0,
                'has_search_params': any(
                    key for key in (payload.keys() if isinstance(payload, dict) else [])
                    if 'search' in key.lower() or 'query' in key.lower()
                )
            }
            calculation_details['payload_info'] = payload_info
        
        logger.info(f"Data provider credits calculated: {provider_name} = {credits} credits (tool: {tool_name_for_analytics})")
        return credits, calculation_details, tool_name_for_analytics
    
    def get_tool_cost_info(self, tool_name: str) -> Dict[str, Any]:
        """Get detailed cost information for a tool."""
        credits, details = self.calculate_tool_credits(tool_name)
        return {
            'tool_name': tool_name,
            'credit_cost': float(credits),
            'cost_tier': details['cost_tier'],
            'details': details
        }
    
    def get_data_provider_cost_info(self, provider_name: str) -> Dict[str, Any]:
        """Get detailed cost information for a data provider."""
        credits, details, tool_name = self.calculate_data_provider_credits(provider_name)
        return {
            'provider_name': provider_name,
            'tool_name': tool_name,
            'credit_cost': float(credits),
            'cost_tier': details['cost_tier'],
            'details': details
        }
    
    def get_all_data_provider_costs(self) -> Dict[str, float]:
        """Get all configured data provider costs."""
        return {
            provider: float(cost) 
            for provider, cost in self.credit_rates['data_provider_costs'].items()
        }
    
    def get_all_tool_costs(self) -> Dict[str, float]:
        """Get all configured tool costs."""
        return {
            tool: float(cost) 
            for tool, cost in self.credit_rates['tool_costs'].items()
        }
    
    def _get_cost_tier(self, credits: Decimal) -> str:
        """Categorize tool/provider costs into tiers."""
        if credits >= 3.0:
            return 'high'
        elif credits >= 1.5:
            return 'medium'
        else:
            return 'low'
    
    def estimate_data_provider_call_cost(
        self, 
        provider_name: str, 
        route: str = None
    ) -> Dict[str, Any]:
        """
        Estimate the cost of a data provider call before execution.
        
        Useful for showing users estimated costs in the UI.
        """
        credits, details, tool_name = self.calculate_data_provider_credits(provider_name, route)
        
        return {
            'provider_name': provider_name,
            'tool_name': tool_name,
            'route': route,
            'estimated_credits': float(credits),
            'cost_tier': details['cost_tier'],
            'explanation': f"Calling {provider_name.title()} Data Provider" + (f" ({route})" if route else "") + f" will cost approximately {credits} credits"
        } 