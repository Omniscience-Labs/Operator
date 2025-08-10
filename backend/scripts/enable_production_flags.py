#!/usr/bin/env python3
"""
Script to enable production feature flags for dev2 deployment.
This ensures that feature flags are properly set in the production Redis instance.
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

async def enable_production_flags():
    """Enable required feature flags for production deployment."""
    try:
        fm = FeatureFlagManager()
        
        # Define flags to enable
        flags_to_enable = [
            {
                'name': 'custom_agents',
                'description': 'Enable custom agent creation and management functionality'
            },
            {
                'name': 'agent_marketplace', 
                'description': 'Enable agent marketplace for sharing and discovering agents'
            }
        ]
        
        logger.info("🚀 Enabling production feature flags...")
        
        for flag in flags_to_enable:
            logger.info(f"Enabling {flag['name']}...")
            success = await fm.set_flag(flag['name'], True, flag['description'])
            if success:
                logger.info(f"✅ {flag['name']}: ENABLED")
            else:
                logger.error(f"❌ {flag['name']}: FAILED")
        
        # Verify flags are set
        logger.info("\n📋 Verifying flags...")
        flags = await fm.list_flags()
        
        if not flags:
            logger.warning("⚠️  No flags found - Redis might not be accessible")
            return False
            
        for flag_name, enabled in flags.items():
            status = "✅ ENABLED" if enabled else "❌ DISABLED"
            logger.info(f"  {flag_name}: {status}")
        
        # Check if required flags are enabled
        required_flags = ['custom_agents', 'agent_marketplace']
        all_enabled = all(flags.get(flag, False) for flag in required_flags)
        
        if all_enabled:
            logger.info("\n🎉 All required feature flags are enabled!")
            return True
        else:
            missing = [flag for flag in required_flags if not flags.get(flag, False)]
            logger.error(f"\n❌ Missing flags: {missing}")
            return False
            
    except Exception as e:
        logger.error(f"💥 Error enabling production flags: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(enable_production_flags())
    sys.exit(0 if success else 1)