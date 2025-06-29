#!/usr/bin/env python3
"""
Example script demonstrating Mem0 memory integration in Operator.

This script shows how to:
1. Configure memory service
2. Add memories from conversations
3. Search for relevant memories
4. Use memories in agent context

Requirements:
- Set MEM0_API_KEY environment variable
- Install mem0ai package
"""

import os
import asyncio
import json
from services.memory import memory_service

async def main():
    """Demonstrate memory service functionality."""
    
    print("🧠 Mem0 Memory Integration Example")
    print("=" * 50)
    
    # Check if memory service is enabled
    if not memory_service.enabled:
        print("❌ Memory service is not enabled.")
        print("Please set MEM0_API_KEY environment variable and install mem0ai package.")
        return
    
    print("✅ Memory service is enabled and ready!")
    print()
    
    # Example user and agent IDs
    user_id = "example_user_123"
    agent_id = "coding_assistant"
    
    # Example 1: Add memories from a conversation
    print("📝 Adding memories from a conversation...")
    
    conversation_messages = [
        {"role": "user", "content": "I'm building a web application using React and Node.js"},
        {"role": "assistant", "content": "That's a great tech stack! React for the frontend and Node.js for the backend work well together."},
        {"role": "user", "content": "I prefer using TypeScript for better type safety"},
        {"role": "assistant", "content": "Excellent choice! TypeScript will help catch errors early and improve code maintainability."}
    ]
    
    # Add memories for default operator (user_id only)
    result1 = await memory_service.add_memory(
        messages=conversation_messages[:2],  # First exchange
        user_id=user_id,
        metadata={"conversation_topic": "web_development"}
    )
    
    # Add memories for custom agent (user_id + agent_id)
    result2 = await memory_service.add_memory(
        messages=conversation_messages[2:],  # Second exchange  
        user_id=user_id,
        agent_id=agent_id,
        metadata={"conversation_topic": "typescript_preferences"}
    )
    
    if result1:
        print(f"✅ Added memories for default operator: {len(conversation_messages[:2])} messages")
    if result2:
        print(f"✅ Added memories for custom agent '{agent_id}': {len(conversation_messages[2:])} messages")
    
    print()
    
    # Example 2: Search for relevant memories
    print("🔍 Searching for relevant memories...")
    
    # Search memories for default operator
    query1 = "What technologies do I use for web development?"
    memories1 = await memory_service.search_memory(
        query=query1,
        user_id=user_id,
        limit=3
    )
    
    print(f"\nQuery: '{query1}'")
    print(f"Found {len(memories1)} memories for default operator:")
    for i, memory in enumerate(memories1, 1):
        memory_text = memory.get("memory", memory.get("text", str(memory)))
        print(f"  {i}. {memory_text}")
    
    # Search memories for custom agent
    query2 = "What are my programming language preferences?"
    memories2 = await memory_service.search_memory(
        query=query2,
        user_id=user_id,
        agent_id=agent_id,
        limit=3
    )
    
    print(f"\nQuery: '{query2}'")
    print(f"Found {len(memories2)} memories for agent '{agent_id}':")
    for i, memory in enumerate(memories2, 1):
        memory_text = memory.get("memory", memory.get("text", str(memory)))
        print(f"  {i}. {memory_text}")
    
    print()
    
    # Example 3: Format memories for LLM context
    print("🤖 Formatting memories for LLM context...")
    
    all_memories = memories1 + memories2
    formatted_context = memory_service.format_memories_for_context(all_memories)
    
    if formatted_context:
        print("Formatted context that would be added to system prompt:")
        print("-" * 50)
        print(formatted_context)
        print("-" * 50)
    else:
        print("No memories to format for context.")
    
    print()
    
    # Example 4: Demonstrate error handling
    print("🔧 Testing error handling...")
    
    # Test with invalid user_id format
    try:
        result = await memory_service.search_memory(
            query="test query",
            user_id="",  # Invalid empty user_id
            limit=1
        )
        print(f"✅ Graceful handling: Returned {len(result)} memories for invalid user_id")
    except Exception as e:
        print(f"❌ Error not handled gracefully: {e}")
    
    print()
    print("🎉 Memory integration example completed!")
    print("\nKey takeaways:")
    print("- Memories are automatically stored when messages are added")
    print("- Search queries find semantically similar memories")
    print("- Custom agents maintain separate memory contexts")
    print("- System gracefully handles errors and missing configurations")

if __name__ == "__main__":
    asyncio.run(main())