#!/usr/bin/env python3
"""Test script to debug Composio integration connection issues"""

import os
import asyncio
import requests
import json
from datetime import datetime, timezone
from composio import Composio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

COMPOSIO_API_KEY = os.environ.get("COMPOSIO_API_KEY")
composio = Composio(api_key=COMPOSIO_API_KEY)

async def test_composio_connection():
    """Test the Composio connection verification flow"""
    
    # Test parameters - you need to replace these with actual values
    test_entity_id = "test_user_123"  # Replace with actual entity ID
    test_integration_type = "dropbox"  # Replace with actual integration
    
    print(f"\n=== Testing Composio Connection Verification ===")
    print(f"Entity ID: {test_entity_id}")
    print(f"Integration Type: {test_integration_type}")
    print(f"API Key: {COMPOSIO_API_KEY[:10] if COMPOSIO_API_KEY else 'NOT SET'}...")
    
    # Test 1: Direct API call
    print("\n--- Test 1: Direct API Call ---")
    headers = {
        "X-API-Key": COMPOSIO_API_KEY,
        "Content-Type": "application/json"
    }
    
    api_url = "https://backend.composio.dev/api/v3/connected_accounts"
    params = {
        "user_ids": test_entity_id,
        "statuses": "ACTIVE",
        "limit": 100
    }
    
    try:
        response = requests.get(api_url, headers=headers, params=params)
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            items = data.get('items', [])
            print(f"\nFound {len(items)} connected accounts")
            
            for i, account in enumerate(items):
                toolkit = account.get('toolkit', {})
                print(f"\nAccount {i+1}:")
                print(f"  - ID: {account.get('id')}")
                print(f"  - Status: {account.get('status')}")
                print(f"  - Toolkit Slug: {toolkit.get('slug')}")
                print(f"  - Created: {account.get('created_at')}")
        else:
            print(f"Error Response: {response.text}")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_composio_connection())
