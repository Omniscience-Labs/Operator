"""
Add this endpoint to your backend API to test HeyGen connectivity from Render
"""
from fastapi import APIRouter
import aiohttp
import json
from utils.config import config

router = APIRouter()

@router.get("/test-heygen-connectivity")
async def test_heygen_connectivity():
    """Test HeyGen API connectivity from Render servers"""
    
    results = {
        "api_key_configured": bool(config.HEYGEN_API_KEY),
        "api_base_configured": bool(config.HEYGEN_API_BASE),
        "connectivity_test": None,
        "token_creation_test": None,
        "dns_resolution": None
    }
    
    # Test 1: DNS Resolution
    try:
        import socket
        socket.gethostbyname("api.heygen.com")
        results["dns_resolution"] = "✅ Success"
    except Exception as e:
        results["dns_resolution"] = f"❌ Failed: {str(e)}"
    
    # Test 2: Basic connectivity
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
            async with session.get("https://api.heygen.com/v1/streaming.list") as response:
                results["connectivity_test"] = {
                    "status": "✅ Success" if response.status in [200, 401] else f"❌ Failed: {response.status}",
                    "status_code": response.status
                }
    except Exception as e:
        results["connectivity_test"] = {
            "status": f"❌ Failed: {str(e)}",
            "error": str(e)
        }
    
    # Test 3: Token creation (if API key available)
    if config.HEYGEN_API_KEY:
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.post(
                    f"{config.HEYGEN_API_BASE or 'https://api.heygen.com'}/v1/streaming.create_token",
                    headers={"x-api-key": config.HEYGEN_API_KEY}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        token = data.get('data', {}).get('token') or data.get('token')
                        results["token_creation_test"] = {
                            "status": "✅ Success",
                            "has_token": bool(token),
                            "token_preview": token[:20] + "..." if token else None
                        }
                    else:
                        error_text = await response.text()
                        results["token_creation_test"] = {
                            "status": f"❌ Failed: {response.status}",
                            "error": error_text
                        }
        except Exception as e:
            results["token_creation_test"] = {
                "status": f"❌ Failed: {str(e)}",
                "error": str(e)
            }
    else:
        results["token_creation_test"] = "⚠️ Skipped - No API key configured"
    
    return results