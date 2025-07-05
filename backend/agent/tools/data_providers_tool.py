import json
from typing import Union, Dict, Any

from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from agent.tools.data_providers.LinkedinProvider import LinkedinProvider
from agent.tools.data_providers.YahooFinanceProvider import YahooFinanceProvider
from agent.tools.data_providers.AmazonProvider import AmazonProvider
from agent.tools.data_providers.ZillowProvider import ZillowProvider
from agent.tools.data_providers.TwitterProvider import TwitterProvider
from agent.tools.data_providers.ApolloProvider import ApolloProvider
from services.credit_calculator import CreditCalculator
from utils.logger import logger

class DataProvidersTool(Tool):
    """Tool for making requests to various data providers with credit tracking."""

    def __init__(self):
        super().__init__()
        self.credit_calculator = CreditCalculator()

        self.register_data_providers = {
            "linkedin": LinkedinProvider(),
            "yahoo_finance": YahooFinanceProvider(),
            "amazon": AmazonProvider(),
            "zillow": ZillowProvider(),
            "twitter": TwitterProvider(),
            "apollo": ApolloProvider()
        }

    def get_provider_cost_estimate(self, service_name: str, route: str = None) -> Dict[str, Any]:
        """Get cost estimate for a data provider call."""
        return self.credit_calculator.estimate_data_provider_call_cost(service_name, route)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "get_data_provider_endpoints",
            "description": "Get available endpoints for a specific data provider",
            "parameters": {
                "type": "object",
                "properties": {
                    "service_name": {
                        "type": "string",
                        "description": "The name of the data provider (e.g., 'linkedin', 'twitter', 'zillow', 'amazon', 'yahoo_finance', 'apollo')"
                    }
                },
                "required": ["service_name"]
            }
        }
    })
    @xml_schema(
        tag_name="get-data-provider-endpoints",
        mappings=[
            {"param_name": "service_name", "node_type": "attribute", "path": "."}
        ],
        example='''
<!-- 
The get-data-provider-endpoints tool returns available endpoints for a specific data provider.
Use this tool when you need to discover what endpoints are available.
-->

<!-- Example to get LinkedIn API endpoints -->
<function_calls>
<invoke name="get_data_provider_endpoints">
<parameter name="service_name">linkedin</parameter>
</invoke>
</function_calls>

<!-- Example to get Apollo lead search endpoints -->
<function_calls>
<invoke name="get_data_provider_endpoints">
<parameter name="service_name">apollo</parameter>
</invoke>
</function_calls>
        '''
    )
    async def get_data_provider_endpoints(
        self,
        service_name: str
    ) -> ToolResult:
        """
        Get available endpoints for a specific data provider.
        
        Parameters:
        - service_name: The name of the data provider (e.g., 'linkedin')
        """
        try:
            if not service_name:
                return self.fail_response("Data provider name is required.")
                
            if service_name not in self.register_data_providers:
                return self.fail_response(f"Data provider '{service_name}' not found. Available data providers: {list(self.register_data_providers.keys())}")
                
            endpoints = self.register_data_providers[service_name].get_endpoints()
            return self.success_response(endpoints)
            
        except Exception as e:
            error_message = str(e)
            simplified_message = f"Error getting data provider endpoints: {error_message[:200]}"
            if len(error_message) > 200:
                simplified_message += "..."
            return self.fail_response(simplified_message)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "execute_data_provider_call",
            "description": "Execute a call to a specific data provider endpoint",
            "parameters": {
                "type": "object",
                "properties": {
                    "service_name": {
                        "type": "string",
                        "description": "The name of the API service (e.g., 'linkedin')"
                    },
                    "route": {
                        "type": "string",
                        "description": "The key of the endpoint to call"
                    },
                    "payload": {
                        "type": "object",
                        "description": "The payload to send with the API call"
                    }
                },
                "required": ["service_name", "route"]
            }
        }
    })
    @xml_schema(
        tag_name="execute-data-provider-call",
        mappings=[
            {"param_name": "service_name", "node_type": "attribute", "path": "service_name"},
            {"param_name": "route", "node_type": "attribute", "path": "route"},
            {"param_name": "payload", "node_type": "content", "path": "."}
        ],
        example='''
        <!-- 
        The execute-data-provider-call tool makes a request to a specific data provider endpoint.
        Use this tool when you need to call an data provider endpoint with specific parameters.
        The route must be a valid endpoint key obtained from get-data-provider-endpoints tool!!
        -->
        
        <!-- Example to call LinkedIn service with the specific route person -->
        <function_calls>
        <invoke name="execute_data_provider_call">
        <parameter name="service_name">linkedin</parameter>
        <parameter name="route">person</parameter>
        <parameter name="payload">{"link": "https://www.linkedin.com/in/johndoe/"}</parameter>
        </invoke>
        </function_calls>
        
        <!-- Example to search for people using Apollo -->
        <function_calls>
        <invoke name="execute_data_provider_call">
        <parameter name="service_name">apollo</parameter>
        <parameter name="route">people_search</parameter>
        <parameter name="payload">{"person_titles[]": ["software engineer", "developer"], "organization_locations[]": ["san francisco"], "per_page": 25}</parameter>
        </invoke>
        </function_calls>
        
        <!-- Example to search for organizations using Apollo -->
        <function_calls>
        <invoke name="execute_data_provider_call">
        <parameter name="service_name">apollo</parameter>
        <parameter name="route">organization_search</parameter>
        <parameter name="payload">{"organization_locations[]": ["new york"], "organization_num_employees_ranges[]": ["51,200", "201,500"], "per_page": 25}</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def execute_data_provider_call(
        self,
        service_name: str,
        route: str,
        payload: Union[Dict[str, Any], str, None] = None
    ) -> ToolResult:
        """
        Execute a call to a specific data provider endpoint with credit tracking.
        
        Parameters:
        - service_name: The name of the data provider (e.g., 'linkedin')
        - route: The key of the endpoint to call
        - payload: The payload to send with the data provider call (dict or JSON string)
        """
        try:
            # Handle payload - it can be either a dict or a JSON string
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except json.JSONDecodeError as e:
                    return self.fail_response(f"Invalid JSON in payload: {str(e)}")
            elif payload is None:
                payload = {}
            elif isinstance(payload, dict):
                # Payload is already a dict, use it as-is
                pass
            else:
                # Handle other types by converting to dict
                try:
                    payload = dict(payload)
                except (TypeError, ValueError):
                    return self.fail_response(f"Invalid payload type: {type(payload)}. Expected dict or JSON string.")

            if not service_name:
                return self.fail_response("service_name is required.")

            if not route:
                return self.fail_response("route is required.")
                
            if service_name not in self.register_data_providers:
                return self.fail_response(f"API '{service_name}' not found. Available APIs: {list(self.register_data_providers.keys())}")
            
            data_provider = self.register_data_providers[service_name]
            if route == service_name:
                return self.fail_response(f"route '{route}' is the same as service_name '{service_name}'. Please use a valid endpoint route.")
            
            if route not in data_provider.get_endpoints().keys():
                return self.fail_response(f"Endpoint '{route}' not found in {service_name} data provider.")
            
            # Calculate credit cost BEFORE execution
            credits, credit_details, tool_name_for_analytics = self.credit_calculator.calculate_data_provider_credits(
                service_name, route, payload
            )
            
            logger.info(f"Data provider call: {service_name}.{route} will cost {credits} credits (tracked as {tool_name_for_analytics})")
            
            # Execute the data provider call
            result = data_provider.call_endpoint(route, payload)
            
            # Create enhanced result with credit information
            enhanced_result = {
                "data": result,
                "credit_usage": {
                    "provider": service_name,
                    "route": route,
                    "credits_charged": float(credits),
                    "cost_tier": credit_details["cost_tier"],
                    "calculation_details": credit_details
                },
                "provider_metadata": {
                    "service_name": service_name,
                    "endpoint_route": route,
                    "request_timestamp": logger.info.__defaults__[0] if hasattr(logger.info, '__defaults__') else "N/A"
                }
            }
            
            # Store credit tracking metadata for response processor
            # This will be picked up by the response processor for database logging
            success_result = self.success_response(enhanced_result)
            
            # Add credit tracking metadata to the ToolResult
            if hasattr(success_result, '__dict__'):
                success_result.__dict__['_credit_tracking'] = {
                    'tool_name_for_analytics': tool_name_for_analytics,
                    'data_provider_name': service_name,
                    'route': route,
                    'credits': float(credits),
                    'calculation_details': credit_details,
                    'usage_type': 'tool'  # Treat as a tool, not separate category
                }
            
            return success_result
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"Data provider call failed: {service_name}.{route} - {error_message}")
            simplified_message = f"Error executing data provider call: {error_message[:200]}"
            if len(error_message) > 200:
                simplified_message += "..."
            return self.fail_response(simplified_message)
