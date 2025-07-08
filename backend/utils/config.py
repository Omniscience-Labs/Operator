"""
Configuration management.

This module provides a centralized way to access configuration settings and
environment variables across the application. It supports different environment
modes (development, staging, production) and provides validation for required
values.

Usage:
    from utils.config import config
    
    # Access configuration values
    api_key = config.OPENAI_API_KEY
    env_mode = config.ENV_MODE
"""

import os
from enum import Enum
from typing import Dict, Any, Optional, get_type_hints, Union
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

class EnvMode(Enum):
    """Environment mode enumeration."""
    LOCAL = "local"
    STAGING = "staging"
    PRODUCTION = "production"

class Configuration:
    """
    Centralized configuration for AgentPress backend.
    
    This class loads environment variables and provides type checking and validation.
    Default values can be specified for optional configuration items.
    """
    
    # Environment mode
    ENV_MODE: EnvMode = EnvMode.LOCAL
    
    # Subscription tier IDs - Production
    STRIPE_FREE_TIER_ID_PROD: str = 'price_1RegArRGnNhiCsluGAhYK7dx'
    STRIPE_TIER_2_40_ID_PROD: str = 'price_1RegOhRGnNhiCslubFHARKST'
    STRIPE_TIER_6_100_ID_PROD: str = 'price_1RegOzRGnNhiCsluQOiybjzk'
    STRIPE_TIER_12_200_ID_PROD: str = 'price_1RILb4G6l1KZGqIr5Y20ZLHm'
    STRIPE_TIER_25_400_ID_PROD: str = 'price_1RegPLRGnNhiCsluDOrzGyto'
    STRIPE_TIER_50_800_ID_PROD: str = 'price_1RegPaRGnNhiCsluLNbiTfuH'
    STRIPE_TIER_125_1600_ID_PROD: str = 'price_1RegPtRGnNhiCsluGHQEnQ6l'
    STRIPE_TIER_200_2000_ID_PROD: str = 'price_1RegQDRGnNhiCsluNOytv8Aj'
    
    # Subscription tier IDs - Staging
    STRIPE_FREE_TIER_ID_STAGING: str = 'price_1RegYKRGnNhiCsluWeXW1YVr'
    STRIPE_TIER_2_40_ID_STAGING: str = 'price_1RegYKRGnNhiCslum8Rq2tb3'
    STRIPE_TIER_6_100_ID_STAGING: str = 'price_1RegYKRGnNhiCslurElDw2Sk'
    STRIPE_TIER_12_200_ID_STAGING: str = 'price_1RegYKRGnNhiCslut8FSYWI8'
    STRIPE_TIER_25_400_ID_STAGING: str = 'price_1RegYKRGnNhiCsluG0cHtAGA'
    STRIPE_TIER_50_800_ID_STAGING: str = 'price_1RegYKRGnNhiCslu7ZDEFcMd'
    STRIPE_TIER_125_1600_ID_STAGING: str = 'price_1RegYKRGnNhiCsluyYL6yg2H'
    STRIPE_TIER_200_2000_ID_STAGING: str = 'price_1RegYKRGnNhiCslu4peMXqGv'
    
    # Computed subscription tier IDs based on environment
    @property
    def STRIPE_FREE_TIER_ID(self) -> str:
        if self.ENV_MODE == EnvMode.STAGING:
            return self.STRIPE_FREE_TIER_ID_STAGING
        return self.STRIPE_FREE_TIER_ID_PROD
    
    @property
    def STRIPE_TIER_2_40_ID(self) -> str:
        if self.ENV_MODE == EnvMode.STAGING:
            return self.STRIPE_TIER_2_40_ID_STAGING
        return self.STRIPE_TIER_2_40_ID_PROD
    
    @property
    def STRIPE_TIER_6_100_ID(self) -> str:
        if self.ENV_MODE == EnvMode.STAGING:
            return self.STRIPE_TIER_6_100_ID_STAGING
        return self.STRIPE_TIER_6_100_ID_PROD
    
    @property
    def STRIPE_TIER_12_200_ID(self) -> str:
        if self.ENV_MODE == EnvMode.STAGING:
            return self.STRIPE_TIER_12_200_ID_STAGING
        return self.STRIPE_TIER_12_200_ID_PROD
    
    @property
    def STRIPE_TIER_25_400_ID(self) -> str:
        if self.ENV_MODE == EnvMode.STAGING:
            return self.STRIPE_TIER_25_400_ID_STAGING
        return self.STRIPE_TIER_25_400_ID_PROD
    
    @property
    def STRIPE_TIER_50_800_ID(self) -> str:
        if self.ENV_MODE == EnvMode.STAGING:
            return self.STRIPE_TIER_50_800_ID_STAGING
        return self.STRIPE_TIER_50_800_ID_PROD
    
    @property
    def STRIPE_TIER_125_1600_ID(self) -> str:
        if self.ENV_MODE == EnvMode.STAGING:
            return self.STRIPE_TIER_125_1600_ID_STAGING
        return self.STRIPE_TIER_125_1600_ID_PROD
    
    @property
    def STRIPE_TIER_200_2000_ID(self) -> str:
        if self.ENV_MODE == EnvMode.STAGING:
            return self.STRIPE_TIER_200_2000_ID_STAGING
        return self.STRIPE_TIER_200_2000_ID_PROD
    
    # LLM API keys
    ANTHROPIC_API_KEY: str = None
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_API_BASE: Optional[str] = "https://openrouter.ai/api/v1"
    OR_SITE_URL: Optional[str] = "https://becomeomni.ai"
    OR_APP_NAME: Optional[str] = "Omni"    
    
    # AWS Bedrock credentials
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION_NAME: Optional[str] = None
    
    # Model configuration
    MODEL_TO_USE: Optional[str] = "anthropic/claude-sonnet-4-20250514"
    
    # Supabase configuration
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    
    # Redis configuration
    REDIS_HOST: str
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str
    REDIS_SSL: bool = True
    
    # Daytona sandbox configuration
    DAYTONA_API_KEY: str
    DAYTONA_SERVER_URL: str
    DAYTONA_TARGET: str
    
    # Search and other API keys
    TAVILY_API_KEY: str
    RAPID_API_KEY: str
    APOLLO_API_KEY: Optional[str] = None
    CLOUDFLARE_API_TOKEN: Optional[str] = None
    FIRECRAWL_API_KEY: str
    FIRECRAWL_URL: Optional[str] = "https://api.firecrawl.dev"
    
    # Stripe configuration
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_DEFAULT_PLAN_ID: Optional[str] = None
    STRIPE_DEFAULT_TRIAL_DAYS: int = 14
    
    # Frontend configuration
    NEXT_PUBLIC_URL: Optional[str] = None
    
    # Stripe Product IDs
    STRIPE_PRODUCT_ID_PROD: str = 'prod_SZpq4RDADzr1vs'
    STRIPE_PRODUCT_ID_STAGING: str = 'prod_SZqErtOBuura60'
    
    # Sandbox configuration
    SANDBOX_IMAGE_NAME = "omnisciencelabs/operator:0.1.3-form-tools"
    SANDBOX_ENTRYPOINT = "/usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf"

    # LangFuse configuration
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    # Credit System Configuration
    CREDIT_RATES = {
        # Base rates per minute
        "base_rate": 1.0,  # 1 credit per minute for normal conversations
        "reasoning_rate_medium": 2.5,  # 2.5x for medium reasoning  
        "reasoning_rate_high": 4.0,    # 4x for high reasoning
        
        # Tool-specific credit costs (executed per tool call)
        # Using native function names for 100% scalability
        "tool_costs": {
            # High-cost tools (resource intensive)
            
            # Browser automation (sb_browser_tool)
            "browser_navigate_to": 0.2,
            "browser_go_back": 0.2,
            "browser_wait": 0.2,
            "browser_click_element": 0.2,
            "browser_input_text": 0.2,
            "browser_send_keys": 0.2,
            "browser_switch_tab": 0.2,
            "browser_close_tab": 0.2,
            "browser_scroll_down": 0.2,
            "browser_scroll_up": 0.2,
            "browser_scroll_to_text": 0.2,
            "browser_get_dropdown_options": 0.2,
            "browser_select_dropdown_option": 0.2,
            "browser_drag_drop": 0.2,
            "browser_click_coordinates": 0.2,
            
            # Computer use tool
            "move_to": 0.2,
            "click": 0.2,
            "scroll": 0.2,
            "typing": 0.2,
            "press": 0.2,
            "wait": 0.2,
            "mouse_down": 0.2,
            "mouse_up": 0.2,
            "drag_to": 0.2,
            "hotkey": 0.2,
            
            # Deployment (sb_deploy_tool)
            "deploy": 5.0,
            
            # Web search (web_search_tool)
            "web_search": 2.0,
            "scrape_webpage": 2.5,
            
            # Excel operations (sb_excel_tool)
            "create_workbook": 2.0,
            "write_data": 1.5,
            "read_data": 1.5,
            "list_sheets": 1.0,
            
            # Vision (sb_vision_tool)
            "see_image": 2.0,
            
            # PDF form operations (sb_pdf_form_tool)
            "read_form_fields": 1.5,
            "fill_form": 2.0,
            "get_form_field_value": 1.0,
            "flatten_form": 1.5,
            "fill_form_coordinates": 2.0,
            "analyze_form_layout": 1.5,
            "create_coordinate_template": 1.0,
            "generate_coordinate_grid": 1.0,
            
            # Data provider tools
            "get_data_provider_endpoints": 0.5,
            "execute_data_provider_call": 2.0,
            
            # Medium-cost tools
            
            # Shell operations (sb_shell_tool)
            "execute_command": 1.5,
            "check_command_output": 1.0,
            "terminate_command": 0.5,
            "list_commands": 0.5,
            
            # Audio transcription (sb_audio_transcription_tool)
            "transcribe_audio": 1.0,
            
            # Podcast generation (sb_podcast_tool)
            "generate_podcast": 4,
            "list_podcasts": 0.5,
            
            # Memory and knowledge
            "search_memory": 1.0,
            "list_available_knowledge_bases": 0.5,
            
            # Agent management
            "update_agent": 2.0,
            "get_current_agent_config": 0.5,
            "search_mcp_servers": 1.0,
            "get_mcp_server_tools": 1.0,
            "configure_mcp_server": 1.5,
            "get_popular_mcp_servers": 0.5,
            "test_mcp_server_connection": 1.0,
            
            # Low-cost tools (basic operations)
            
            # File operations (sb_files_tool)
            "create_file": 0.5,
            "str_replace": 0.5,
            "full_file_rewrite": 1.0,
            "delete_file": 0.3,
            "read_file": 0.3,
            
            # Expose operations (sb_expose_tool)
            "expose_port": 0.3,
            
            # Message operations
            "ask": 0.5,
            "web_browser_takeover": 1.0,
            "complete": 0.3,
            
            # DateTime operations
            "get_current_datetime": 0.2,
            "list_timezones": 0.2,
            
            # Utility operations
            "expand_message": 0.3,
            
            # MCP tools (variable cost)
            "call_mcp_tool": 1.0,  # Base cost, can be overridden per server
            
            # Default cost for unspecified tools
            "default": 0.5
        },
        
        # Individual data provider costs
        "data_provider_costs": {
            "linkedin": 3.0,       # LinkedIn API calls are expensive
            "apollo": 2.5,         # Apollo lead generation costs
            "twitter": 1.5,        # Twitter API moderate cost
            "yahoo_finance": 1.0,  # Financial data moderate cost
            "amazon": 2.0,         # Amazon product data
            "zillow": 1.5,         # Real estate data
            "activejobs": 1.0,     # Job search data
            
            # Default for unknown data providers
            "default": 2.0
        }
    }

    @property
    def STRIPE_PRODUCT_ID(self) -> str:
        if self.ENV_MODE == EnvMode.STAGING:
            return self.STRIPE_PRODUCT_ID_STAGING
        return self.STRIPE_PRODUCT_ID_PROD
    
    def __init__(self):
        """Initialize configuration by loading from environment variables."""
        # Load environment variables from .env file if it exists
        load_dotenv()
        
        # Set environment mode first
        env_mode_str = os.getenv("ENV_MODE", EnvMode.LOCAL.value)
        try:
            self.ENV_MODE = EnvMode(env_mode_str.lower())
        except ValueError:
            logger.warning(f"Invalid ENV_MODE: {env_mode_str}, defaulting to LOCAL")
            self.ENV_MODE = EnvMode.LOCAL
            
        logger.info(f"Environment mode: {self.ENV_MODE.value}")
        
        # Load configuration from environment variables
        self._load_from_env()
        
        # Perform validation
        self._validate()
        
    def _load_from_env(self):
        """Load configuration values from environment variables."""
        for key, expected_type in get_type_hints(self.__class__).items():
            env_val = os.getenv(key)
            
            if env_val is not None:
                # Convert environment variable to the expected type
                if expected_type == bool:
                    # Handle boolean conversion
                    setattr(self, key, env_val.lower() in ('true', 't', 'yes', 'y', '1'))
                elif expected_type == int:
                    # Handle integer conversion
                    try:
                        setattr(self, key, int(env_val))
                    except ValueError:
                        logger.warning(f"Invalid value for {key}: {env_val}, using default")
                elif expected_type == EnvMode:
                    # Already handled for ENV_MODE
                    pass
                else:
                    # String or other type
                    setattr(self, key, env_val)
    
    def _validate(self):
        """Validate configuration based on type hints."""
        # Get all configuration fields and their type hints
        type_hints = get_type_hints(self.__class__)
        
        # Find missing required fields
        missing_fields = []
        for field, field_type in type_hints.items():
            # Check if the field is Optional
            is_optional = hasattr(field_type, "__origin__") and field_type.__origin__ is Union and type(None) in field_type.__args__
            
            # If not optional and value is None, add to missing fields
            if not is_optional and getattr(self, field) is None:
                missing_fields.append(field)
        
        if missing_fields:
            error_msg = f"Missing required configuration fields: {', '.join(missing_fields)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a configuration value with an optional default."""
        return getattr(self, key, default)
    
    def as_dict(self) -> Dict[str, Any]:
        """Return configuration as a dictionary."""
        return {
            key: getattr(self, key) 
            for key in get_type_hints(self.__class__).keys()
            if not key.startswith('_')
        }

# Create a singleton instance
config = Configuration() 