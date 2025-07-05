"""
Example script demonstrating memory functionality integration.

This script shows how the mem0 memory functionality is integrated into the application
and how it automatically works with conversations.
"""

import asyncio
import os
from services.memory import memory_service
from utils.logger import logger

async def main():
    """Example of how memory functionality works in the application."""
    
    # Set up environment (in production, this would be set via environment variables)
    if not os.environ.get("MEM0_API_KEY"):
        print("⚠️  MEM0_API_KEY not set - memory functionality will be disabled")
        print("   Set your API key: export MEM0_API_KEY='your-api-key'")
        return
    
    print("🧠 Memory Service Example")
    print("=" * 50)
    
    # Check if memory service is available
    if not memory_service.is_available:
        print("❌ Memory service is not available")
        return
    
    print("✅ Memory service is available")
    
    # Example user and agent IDs
    user_id = "user123"
    agent_id = "agent456"  # Optional - for custom agents
    
    # Example 1: Adding memories (this happens automatically when messages are added)
    print("\n📝 Example 1: Adding memories")
    print("-" * 30)
    
    # Messages that would typically be added automatically
    messages = [
        {"role": "user", "content": "I'm travelling to San Francisco next month"},
        {"role": "assistant", "content": "That's exciting! I'd love to help you plan your trip to San Francisco."},
        {"role": "user", "content": "I love trying local food, especially seafood"},
        {"role": "assistant", "content": "Perfect! San Francisco has amazing seafood. You should definitely try the clam chowder at Fisherman's Wharf."}
    ]
    
    # Add memories for default operator (user_id only)
    print("Adding memories for default operator...")
    for i in range(0, len(messages), 2):
        memory_batch = messages[i:i+2]
        result = await memory_service.add_memory_async(
            messages=memory_batch,
            user_id=user_id,
            metadata={"example": "travel_planning"}
        )
        if result:
            print(f"✅ Added memory batch {i//2 + 1}")
    
    # Add memories for custom agent (user_id + agent_id)
    print("\nAdding memories for custom agent...")
    custom_messages = [
        {"role": "user", "content": "I prefer budget-friendly options"},
        {"role": "assistant", "content": "I'll focus on affordable recommendations for your San Francisco trip."}
    ]
    
    result = await memory_service.add_memory_async(
        messages=custom_messages,
        user_id=user_id,
        agent_id=agent_id,
        metadata={"example": "budget_preferences"}
    )
    if result:
        print("✅ Added custom agent memory")
    
    # Example 2: Searching memories
    print("\n🔍 Example 2: Searching memories")
    print("-" * 30)
    
    # Search for default operator memories
    print("Searching memories for default operator...")
    search_queries = [
        "travel plans",
        "food preferences",
        "San Francisco recommendations"
    ]
    
    for query in search_queries:
        results = await memory_service.search_memory_async(
            query=query,
            user_id=user_id,
            limit=3
        )
        
        if results:
            print(f"\n📋 Results for '{query}':")
            for i, result in enumerate(results, 1):
                memory_content = result.get('memory', 'No content')
                score = result.get('score', 0.0)
                print(f"  {i}. {memory_content} (confidence: {score:.2f})")
        else:
            print(f"❌ No results found for '{query}'")
    
    # Search for custom agent memories
    print(f"\n🔍 Searching memories for custom agent...")
    custom_results = await memory_service.search_memory_async(
        query="budget preferences",
        user_id=user_id,
        agent_id=agent_id,
        limit=3
    )
    
    if custom_results:
        print("📋 Custom agent results:")
        for i, result in enumerate(custom_results, 1):
            memory_content = result.get('memory', 'No content')
            score = result.get('score', 0.0)
            print(f"  {i}. {memory_content} (confidence: {score:.2f})")
    else:
        print("❌ No custom agent results found")
    
    print("\n" + "=" * 50)
    print("🎉 Memory functionality example completed!")
    print("\nIn the actual application:")
    print("- Memory is added automatically when messages are saved")
    print("- Agents can search memory using the search_memory tool")
    print("- Default operators use user_id only")
    print("- Custom agents use user_id + agent_id")

if __name__ == "__main__":
    asyncio.run(main())