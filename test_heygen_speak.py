#!/usr/bin/env python3
"""
Test the HeyGen speak functionality with the correct API call
"""
import asyncio
import aiohttp
import json

# Your HeyGen API key
HEYGEN_API_KEY = "ZGVhN2JkOGZiMTMxNDIzYWJjMzg4NmIyNjlhMTc0ZDUtMTc1Mzk4MDU3Mg=="
HEYGEN_API_BASE = "https://api.heygen.com"

async def test_complete_flow():
    """Test the complete flow: token -> session -> speak"""
    print("🚀 Testing complete HeyGen avatar speak flow")
    print("=" * 50)
    
    # Step 1: Create session token
    print("🎫 Step 1: Creating session token...")
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{HEYGEN_API_BASE}/v1/streaming.create_token",
            headers={"x-api-key": HEYGEN_API_KEY}
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                print(f"❌ Token creation failed: {response.status} - {error_text}")
                return
            
            token_data = await response.json()
            session_token = token_data.get('data', {}).get('token')
            print(f"✅ Session token created: {session_token[:20]}...")
    
    # Step 2: Create avatar session
    print("\n🎭 Step 2: Creating avatar session...")
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
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{HEYGEN_API_BASE}/v1/streaming.new",
            headers={
                "Authorization": f"Bearer {session_token}",
                "Content-Type": "application/json"
            },
            json=session_config
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                print(f"❌ Session creation failed: {response.status} - {error_text}")
                return
            
            session_data = await response.json()
            session_id = session_data.get('data', {}).get('session_id')
            print(f"✅ Avatar session created: {session_id}")
    
    # Step 3: Test speak command
    print("\n🗣️ Step 3: Testing speak command...")
    speak_payload = {
        "session_id": session_id,
        "text": "Hello World! This is a test of the HeyGen avatar speak functionality.",
        "task_type": "REPEAT",
        "task_mode": "SYNC"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{HEYGEN_API_BASE}/v1/streaming.task",
            headers={
                "x-api-key": HEYGEN_API_KEY,  # Use original API key
                "Content-Type": "application/json"
            },
            json=speak_payload
        ) as response:
            print(f"Speak response status: {response.status}")
            
            if response.status == 200:
                result = await response.json()
                print(f"✅ Speak command successful!")
                print(f"Response: {json.dumps(result, indent=2)}")
            else:
                error_text = await response.text()
                print(f"❌ Speak command failed: {response.status} - {error_text}")
                
                # Try alternative payload format
                print("\n🔄 Trying alternative payload format...")
                alt_payload = {
                    "session_id": session_id,
                    "type": "repeat",
                    "text": "Hello World!"
                }
                
                async with session.post(
                    f"{HEYGEN_API_BASE}/v1/streaming.task",
                    headers={
                        "x-api-key": HEYGEN_API_KEY,
                        "Content-Type": "application/json"
                    },
                    json=alt_payload
                ) as alt_response:
                    print(f"Alternative speak response status: {alt_response.status}")
                    if alt_response.status == 200:
                        alt_result = await alt_response.json()
                        print(f"✅ Alternative speak format worked!")
                        print(f"Response: {json.dumps(alt_result, indent=2)}")
                    else:
                        alt_error = await alt_response.text()
                        print(f"❌ Alternative format also failed: {alt_response.status} - {alt_error}")

if __name__ == "__main__":
    asyncio.run(test_complete_flow())