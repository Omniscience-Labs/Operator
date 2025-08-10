#!/usr/bin/env python3
"""
Startup script to ensure critical feature flags are enabled on deployment.
This runs automatically when the backend starts up to configure production flags.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from flags.flags import FeatureFlagManager
from utils.logger import logger

async def ensure_production_flags():
    """Ensure critical feature flags are enabled for production."""
    try:
        fm = FeatureFlagManager()
        
        # Critical flags that should always be enabled in production
        critical_flags = [
            {
                'name': 'custom_agents',
                'description': 'Enable custom agent creation and management functionality'
            },
            {
                'name': 'agent_marketplace', 
                'description': 'Enable agent marketplace for sharing and discovering agents'
            }
        ]
        
        logger.info("🔧 Checking production feature flags...")
        
        # Check current flags
        current_flags = await fm.list_flags()
        
        for flag in critical_flags:
            flag_name = flag['name']
            is_enabled = current_flags.get(flag_name, False)
            
            if not is_enabled:
                logger.info(f"🚀 Enabling {flag_name}...")
                success = await fm.set_flag(flag_name, True, flag['description'])
                if success:
                    logger.info(f"✅ {flag_name}: ENABLED")
                else:
                    logger.error(f"❌ {flag_name}: FAILED TO ENABLE")
            else:
                logger.info(f"✅ {flag_name}: Already enabled")
        
        logger.info("🎉 Production flags check complete!")
        return True
        
    except Exception as e:
        logger.error(f"💥 Error checking production flags: {str(e)}")
        # Don't fail startup if flags can't be set
        return True

if __name__ == "__main__":
    asyncio.run(ensure_production_flags())