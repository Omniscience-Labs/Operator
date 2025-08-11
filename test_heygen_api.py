#!/usr/bin/env python3
"""
Test script to validate HeyGen API key and connectivity
"""
import os
import asyncio
import aiohttp
import json
from base64 import b64decode

# Your HeyGen API key (replace with actual key)
HEYGEN_API_KEY = "ZGVhN2JkOGZiMTMxNDIzYWJjMzg4NmIyNjlhMTc0ZDUtMTc1Mzk4MDU3Mg=="
HEYGEN_API_BASE = "https://api.heygen.com"

async def test_heygen_connectivity():
    """Test basic connectivity to HeyGen API"""
    print("🔍 Testing HeyGen API connectivity...")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{HEYGEN_API_BASE}/v1/streaming.list") as response:
                print(f"✅ HeyGen API reachable - Status: {response.status}")
                return True
    except Exception as e:
        print(f"❌ Cannot reach HeyGen API: {str(e)}")
        return False

async def test_api_key_formats():
    """Test different API key formats"""
    print("\n🔑 Testing API key formats...")
    
    # Test raw key
    raw_key = HEYGEN_API_KEY
    print(f"Raw key (first 20 chars): {raw_key[:20]}...")
    
    # Test base64 decoded key
    try:
        decoded_key = b64decode(HEYGEN_API_KEY).decode('utf-8')
        print(f"Decoded key (first 20 chars): {decoded_key[:20]}...")
        
        # Test both formats
        for key_name, key_value in [("Raw", raw_key), ("Decoded", decoded_key)]:
            print(f"\n🧪 Testing {key_name} key format...")
            success = await test_create_token(key_value)
            if success:
                print(f"✅ {key_name} key format works!")
                return key_value
            else:
                print(f"❌ {key_name} key format failed")
                
    except Exception as e:
        print(f"❌ Error decoding base64: {e}")
        # Try raw key only
        print(f"\n🧪 Testing raw key format...")
        success = await test_create_token(raw_key)
        if success:
            print(f"✅ Raw key format works!")
            return raw_key
    
    return None

async def test_create_token(api_key):
    """Test creating a session token"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{HEYGEN_API_BASE}/v1/streaming.create_token",
                headers={"x-api-key": api_key}
            ) as response:
                print(f"Token creation status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"Token response: {json.dumps(data, indent=2)}")
                    
                    # Test different token extraction methods
                    token1 = data.get('token')
                    token2 = data.get('data', {}).get('token') if isinstance(data.get('data'), dict) else None
                    
                    print(f"Direct token: {token1}")
                    print(f"Nested token: {token2}")
                    
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Token creation failed: {response.status} - {error_text}")
                    return False
                    
    except Exception as e:
        print(f"❌ Token creation error: {str(e)}")
        return False

async def test_session_creation(api_key, session_token):
    """Test creating an avatar session"""
    print(f"\n🎭 Testing avatar session creation...")
    
    session_config = {
        "avatarName": "default",
        "quality": "medium",
        "voice": {
            "voiceId": "default",
            "rate": 1.0,
            "emotion": "FRIENDLY"
        },
        "language": "en",
        "activityIdleTimeout": 300
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{HEYGEN_API_BASE}/v1/streaming.new",
                headers={
                    "Authorization": f"Bearer {session_token}",
                    "Content-Type": "application/json"
                },
                json=session_config
            ) as response:
                print(f"Session creation status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"Session response: {json.dumps(data, indent=2)}")
                    return data
                else:
                    error_text = await response.text()
                    print(f"❌ Session creation failed: {response.status} - {error_text}")
                    return None
                    
    except Exception as e:
        print(f"❌ Session creation error: {str(e)}")
        return None

async def main():
    print("🚀 HeyGen API Test Suite")
    print("=" * 50)
    
    # Test 1: Basic connectivity
    connectivity_ok = await test_heygen_connectivity()
    if not connectivity_ok:
        print("\n❌ Cannot proceed - HeyGen API unreachable")
        return
    
    # Test 2: API key validation
    working_key = await test_api_key_formats()
    if not working_key:
        print("\n❌ No working API key format found")
        return
    
    print(f"\n✅ Working API key found: {working_key[:20]}...")
    
    # Test 3: Get session token
    print(f"\n🎫 Creating session token...")
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{HEYGEN_API_BASE}/v1/streaming.create_token",
            headers={"x-api-key": working_key}
        ) as response:
            if response.status == 200:
                token_data = await response.json()
                session_token = token_data.get('data', {}).get('token') or token_data.get('token')
                
                if session_token:
                    print(f"✅ Session token created: {session_token[:20]}...")
                    
                    # Test 4: Create avatar session
                    session_data = await test_session_creation(working_key, session_token)
                    
                    if session_data:
                        print(f"\n🎉 SUCCESS! HeyGen integration is working properly")
                        print(f"Working API key format: {working_key[:20]}...")
                        print(f"Use this in your Doppler HEYGEN_API_KEY")
                    else:
                        print(f"\n❌ Session creation failed")
                else:
                    print(f"❌ No session token in response")
            else:
                error_text = await response.text()
                print(f"❌ Token creation failed: {response.status} - {error_text}")

if __name__ == "__main__":
    asyncio.run(main())