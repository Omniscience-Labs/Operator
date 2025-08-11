#!/usr/bin/env python3
"""
Test HeyGen speak with correct task types and session management
"""
import asyncio
import aiohttp
import json

HEYGEN_API_KEY = "ZGVhN2JkOGZiMTMxNDIzYWJjMzg4NmIyNjlhMTc0ZDUtMTc1Mzk4MDU3Mg=="
HEYGEN_API_BASE = "https://api.heygen.com"

async def test_task_types():
    """Test different task types to find the correct one"""
    print("🚀 Testing HeyGen task types and session states")
    print("=" * 50)
    
    # Step 1: Create session token
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{HEYGEN_API_BASE}/v1/streaming.create_token",
            headers={"x-api-key": HEYGEN_API_KEY}
        ) as response:
            token_data = await response.json()
            session_token = token_data.get('data', {}).get('token')
            print(f"✅ Session token: {session_token[:20]}...")
    
    # Step 2: Create avatar session
    session_config = {
        "avatarName": "default",
        "quality": "medium",
        "voice": {
            "voiceId": "default",
            "rate": 1.0,
            "emotion": "FRIENDLY"
        },
        "language": "en"
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
            session_data = await response.json()
            session_id = session_data.get('data', {}).get('session_id')
            print(f"✅ Session created: {session_id}")
    
    # Step 3: Try different task formats
    test_payloads = [
        {
            "name": "speak",
            "payload": {
                "session_id": session_id,
                "type": "speak",
                "text": "Hello World!"
            }
        },
        {
            "name": "task_speak", 
            "payload": {
                "session_id": session_id,
                "task_type": "speak",
                "text": "Hello World!"
            }
        },
        {
            "name": "repeat_lowercase",
            "payload": {
                "session_id": session_id,
                "type": "repeat",
                "text": "Hello World!"
            }
        },
        {
            "name": "talk",
            "payload": {
                "session_id": session_id,
                "type": "talk",
                "text": "Hello World!"
            }
        },
        {
            "name": "chat",
            "payload": {
                "session_id": session_id,
                "type": "chat", 
                "text": "Hello World!"
            }
        }
    ]
    
    for test in test_payloads:
        print(f"\n🧪 Testing {test['name']} format...")
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{HEYGEN_API_BASE}/v1/streaming.task",
                headers={
                    "x-api-key": HEYGEN_API_KEY,
                    "Content-Type": "application/json"
                },
                json=test['payload']
            ) as response:
                print(f"Status: {response.status}")
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ SUCCESS with {test['name']}!")
                    print(f"Response: {json.dumps(result, indent=2)}")
                    break
                else:
                    error_text = await response.text()
                    print(f"❌ Failed: {error_text}")
    
    # Step 4: Check if we need to start the session first
    print(f"\n🔧 Trying to start/initialize the session...")
    start_payload = {
        "session_id": session_id,
        "type": "start"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{HEYGEN_API_BASE}/v1/streaming.start",
            headers={
                "x-api-key": HEYGEN_API_KEY,
                "Content-Type": "application/json"
            },
            json=start_payload
        ) as response:
            print(f"Start session status: {response.status}")
            if response.status == 200:
                result = await response.json()
                print(f"✅ Session started successfully!")
                print(f"Response: {json.dumps(result, indent=2)}")
                
                # Now try speak again
                print(f"\n🗣️ Trying speak after starting session...")
                speak_payload = {
                    "session_id": session_id,
                    "type": "speak",
                    "text": "Hello World!"
                }
                
                async with session.post(
                    f"{HEYGEN_API_BASE}/v1/streaming.task",
                    headers={
                        "x-api-key": HEYGEN_API_KEY,
                        "Content-Type": "application/json"
                    },
                    json=speak_payload
                ) as speak_response:
                    print(f"Speak after start status: {speak_response.status}")
                    if speak_response.status == 200:
                        speak_result = await speak_response.json()
                        print(f"✅ SPEAK SUCCESS!")
                        print(f"Response: {json.dumps(speak_result, indent=2)}")
                    else:
                        speak_error = await speak_response.text()
                        print(f"❌ Speak still failed: {speak_error}")
            else:
                error_text = await response.text()
                print(f"❌ Start session failed: {error_text}")

if __name__ == "__main__":
    asyncio.run(test_task_types())