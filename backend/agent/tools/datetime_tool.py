import datetime
import pytz
from typing import Optional
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema


class DateTimeTool(Tool):
    """Tool for getting current date and time information in various timezones."""

    def __init__(self):
        super().__init__()

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "get_current_datetime",
            "description": "Get the current date and time in a specified timezone. Useful for time-sensitive operations, scheduling, and providing current temporal context to users.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Timezone identifier (e.g., 'UTC', 'US/Eastern', 'Europe/London', 'Asia/Tokyo', 'US/Pacific'). Defaults to UTC if not specified.",
                        "default": "UTC"
                    },
                    "format": {
                        "type": "string",
                        "description": "Output format for the datetime. Options: 'iso' (ISO 8601), 'readable' (human-readable), 'timestamp' (Unix timestamp). Defaults to 'readable'.",
                        "enum": ["iso", "readable", "timestamp"],
                        "default": "readable"
                    },
                    "include_weekday": {
                        "type": "boolean",
                        "description": "Whether to include the day of the week in readable format. Defaults to true.",
                        "default": True
                    }
                },
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="get-current-datetime",
        mappings=[
            {"param_name": "timezone", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "format", "node_type": "attribute", "path": ".", "required": False},
            {"param_name": "include_weekday", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="get_current_datetime">
        <parameter name="timezone">US/Eastern</parameter>
        <parameter name="format">readable</parameter>
        <parameter name="include_weekday">true</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def get_current_datetime(
        self, 
        timezone: str = "UTC", 
        format: str = "readable",
        include_weekday: bool = True
    ) -> ToolResult:
        """Get current date and time in specified timezone.
        
        Args:
            timezone: Timezone identifier (e.g., 'UTC', 'US/Eastern', 'Europe/London')
            format: Output format ('iso', 'readable', 'timestamp')
            include_weekday: Whether to include weekday name in readable format
            
        Returns:
            ToolResult with current datetime information
        """
        try:
            # Validate and get timezone
            try:
                tz = pytz.timezone(timezone)
            except pytz.exceptions.UnknownTimeZoneError:
                # Fallback to UTC for invalid timezones
                tz = pytz.UTC
                timezone = "UTC"
            
            # Get current time in specified timezone
            now = datetime.datetime.now(tz)
            
            # Format based on requested format
            if format == "iso":
                formatted_time = now.isoformat()
            elif format == "timestamp":
                formatted_time = str(int(now.timestamp()))
            else:  # readable format
                if include_weekday:
                    formatted_time = now.strftime("%A, %B %d, %Y at %I:%M:%S %p %Z")
                else:
                    formatted_time = now.strftime("%B %d, %Y at %I:%M:%S %p %Z")
            
            # Additional useful information
            time_info = {
                "datetime": formatted_time,
                "timezone": timezone,
                "utc_offset": now.strftime("%z"),
                "is_dst": bool(now.dst()),
                "weekday": now.strftime("%A"),
                "year": now.year,
                "month": now.month,
                "day": now.day,
                "hour": now.hour,
                "minute": now.minute,
                "second": now.second
            }
            
            return self.success_response(time_info)
            
        except Exception as e:
            return self.fail_response(f"Error getting datetime: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "list_timezones",
            "description": "Get a list of available timezone identifiers, optionally filtered by region.",
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {
                        "type": "string",
                        "description": "Filter timezones by region (e.g., 'US', 'Europe', 'Asia', 'America'). If not specified, returns common timezones.",
                        "default": None
                    }
                },
                "required": []
            }
        }
    })
    @xml_schema(
        tag_name="list-timezones",
        mappings=[
            {"param_name": "region", "node_type": "attribute", "path": ".", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="list_timezones">
        <parameter name="region">US</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def list_timezones(self, region: Optional[str] = None) -> ToolResult:
        """List available timezone identifiers.
        
        Args:
            region: Optional region filter (e.g., 'US', 'Europe', 'Asia')
            
        Returns:
            ToolResult with list of timezone identifiers
        """
        try:
            if region:
                # Filter timezones by region
                all_timezones = pytz.all_timezones
                filtered_timezones = [tz for tz in all_timezones if tz.startswith(region)]
                
                if not filtered_timezones:
                    # Try alternative region names
                    region_alternatives = {
                        'US': ['America/'],
                        'Europe': ['Europe/'],
                        'Asia': ['Asia/'],
                        'America': ['America/'],
                        'Africa': ['Africa/'],
                        'Australia': ['Australia/'],
                        'Pacific': ['Pacific/'],
                        'Atlantic': ['Atlantic/'],
                        'Indian': ['Indian/']
                    }
                    
                    for alt_region in region_alternatives.get(region, [region]):
                        filtered_timezones.extend([tz for tz in all_timezones if tz.startswith(alt_region)])
                
                timezones = sorted(list(set(filtered_timezones)))[:50]  # Limit to 50 results
            else:
                # Return common timezones
                timezones = [
                    'UTC',
                    'US/Eastern',
                    'US/Central', 
                    'US/Mountain',
                    'US/Pacific',
                    'Europe/London',
                    'Europe/Paris',
                    'Europe/Berlin',
                    'Asia/Tokyo',
                    'Asia/Shanghai',
                    'Asia/Mumbai',
                    'Australia/Sydney',
                    'America/New_York',
                    'America/Chicago',
                    'America/Denver',
                    'America/Los_Angeles'
                ]
            
            return self.success_response({
                "timezones": timezones,
                "region": region,
                "count": len(timezones)
            })
            
        except Exception as e:
            return self.fail_response(f"Error listing timezones: {str(e)}") 