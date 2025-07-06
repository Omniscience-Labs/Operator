#!/usr/bin/env python3
"""
Memory functionality demonstration for the agent platform.

This script demonstrates how mem0 memory is automatically integrated into conversations:
1. Memories are automatically added when messages are saved
2. Relevant memories are automatically included in conversation context
3. Memory search tool is available for specific queries
4. Works with both default operators (user_id) and custom agents (user_id + agent_id)
"""

import asyncio
import os
import json
from typing import Dict, Any, List

async def demo_memory_integration():
    """Demonstrate memory integration with the conversation system."""
    
    print("🧠 MEMORY INTEGRATION DEMO")
    print("=" * 60)
    print()
    
    # Check if mem0 API key is set
    api_key = os.environ.get("MEM0_API_KEY")
    if not api_key:
        print("⚠️  Warning: MEM0_API_KEY not set")
        print("   Memory functionality will be disabled")
        print("   Set your API key: export MEM0_API_KEY='your-api-key'")
        print()
        return
    
    print("✅ MEM0_API_KEY is configured")
    print()
    
    # Import services after environment check
    try:
        from services.memory import memory_service
        from agentpress.thread_manager import ThreadManager
        
        print("✅ Memory service imported successfully")
        print(f"   Memory service available: {memory_service.is_available}")
        print()
        
    except ImportError as e:
        print(f"❌ Failed to import memory services: {e}")
        return
    
    # Demo scenarios
    print("📋 DEMO SCENARIOS")
    print("-" * 40)
    print()
    
    # Scenario 1: Default operator conversation
    print("🎯 Scenario 1: Default Operator Conversation")
    print("   - User ID only (no agent ID)")
    print("   - Memories shared across all conversations")
    print()
    
    user_id = "demo_user_123"
    
    # Simulate conversation messages
    conversation_messages = [
        {
            "role": "user",
            "content": "I'm planning a trip to Tokyo next month and I love Japanese cuisine"
        },
        {
            "role": "assistant", 
            "content": "That's wonderful! Tokyo has incredible food. What type of Japanese cuisine interests you most?"
        },
        {
            "role": "user",
            "content": "I'm particularly interested in authentic ramen and sushi. I'm also vegetarian."
        },
        {
            "role": "assistant",
            "content": "Perfect! I'll help you find the best vegetarian-friendly ramen shops and sushi places in Tokyo."
        }
    ]
    
    # Add memories (this normally happens automatically)
    print("📝 Adding conversation to memory...")
    for i in range(0, len(conversation_messages), 2):
        batch = conversation_messages[i:i+2]
        result = await memory_service.add_memory_async(
            messages=batch,
            user_id=user_id,
            metadata={"demo": "tokyo_trip", "conversation_id": "conv_1"}
        )
        if result:
            print(f"   ✅ Added memory batch {i//2 + 1}")
    
    print()
    
    # Search memories
    print("🔍 Searching memories...")
    search_queries = [
        "travel plans",
        "food preferences", 
        "dietary restrictions"
    ]
    
    for query in search_queries:
        results = await memory_service.search_memory_async(
            query=query,
            user_id=user_id,
            limit=3
        )
        
        if results:
            print(f"   📋 '{query}' found {len(results)} memories:")
            for result in results:
                memory = result.get('memory', '')
                score = result.get('score', 0.0)
                print(f"      • {memory} (confidence: {score:.2f})")
        else:
            print(f"   ❌ No memories found for '{query}'")
    
    print()
    
    # Scenario 2: Custom agent conversation
    print("🎯 Scenario 2: Custom Agent Conversation")
    print("   - Combined User ID:Agent ID identifier")
    print("   - Agent-specific memories isolated per user")
    print()
    
    agent_id = "travel_agent_456"
    
    # Simulate agent-specific conversation
    agent_messages = [
        {
            "role": "user",
            "content": "I need help with budget planning for my Tokyo trip"
        },
        {
            "role": "assistant",
            "content": "I'll help you create a detailed budget for your Tokyo trip. What's your total budget range?"
        },
        {
            "role": "user", 
            "content": "I have about $2000 for the entire trip including flights"
        },
        {
            "role": "assistant",
            "content": "With $2000 including flights, I'll help you optimize your Tokyo trip budget."
        }
    ]
    
    # Add agent-specific memories
    print("📝 Adding agent-specific conversation to memory...")
    for i in range(0, len(agent_messages), 2):
        batch = agent_messages[i:i+2]
        result = await memory_service.add_memory_async(
            messages=batch,
            user_id=user_id,
            agent_id=agent_id,
            metadata={"demo": "budget_planning", "conversation_id": "conv_2"}
        )
        if result:
            print(f"   ✅ Added agent memory batch {i//2 + 1}")
    
    print()
    
    # Search agent-specific memories
    print("🔍 Searching agent-specific memories...")
    agent_results = await memory_service.search_memory_async(
        query="budget planning",
        user_id=user_id,
        agent_id=agent_id,
        limit=3
    )
    
    if agent_results:
        print(f"   📋 Agent-specific memories found:")
        for result in agent_results:
            memory = result.get('memory', '')
            score = result.get('score', 0.0)
            print(f"      • {memory} (confidence: {score:.2f})")
    else:
        print(f"   ❌ No agent-specific memories found")
    
    print()
    
    # Scenario 3: Memory context integration
    print("🎯 Scenario 3: Memory Context Integration")
    print("   - How memories are automatically added to conversation context")
    print()
    
    # Simulate thread manager memory integration
    print("📋 Simulating automatic memory context integration...")
    
    # This would normally happen automatically in ThreadManager
    recent_messages = [
        {"role": "user", "content": "What restaurants should I visit in Tokyo?"},
        {"role": "assistant", "content": "Let me help you find great restaurants in Tokyo."}
    ]
    
    # Create search context from recent messages
    search_context = []
    for msg in recent_messages:
        content = msg.get('content', '')
        if content.strip():
            search_context.append(content.strip())
    
    search_query = ' '.join(search_context)
    print(f"   🔍 Generated search query: '{search_query}'")
    
    # Search for relevant memories
    context_results = await memory_service.search_memory_async(
        query=search_query,
        user_id=user_id,
        limit=3
    )
    
    if context_results:
        print("   📋 Relevant memories that would be added to context:")
        memory_context = "--- Relevant Memories ---\n"
        memory_context += "Based on our previous conversations:\n\n"
        
        for i, result in enumerate(context_results, 1):
            memory_content = result.get('memory', '').strip()
            confidence = result.get('score', 0.0)
            
            if memory_content and confidence > 0.3:
                memory_context += f"{i}. {memory_content}\n"
                print(f"      {i}. {memory_content} (confidence: {confidence:.2f})")
        
        memory_context += "\n--- End of Memories ---\n"
        print(f"\n   📄 Formatted memory context would be:")
        print(f"   {repr(memory_context[:100])}...")
    else:
        print("   ❌ No relevant memories found for context")
    
    print()
    
    # Summary
    print("📊 INTEGRATION SUMMARY")
    print("-" * 40)
    print("✅ Memory Storage:")
    print("   • User messages → automatically stored in mem0")
    print("   • Assistant responses → automatically stored in mem0")
    print("   • Default operators use user_id only")
    print("   • Custom agents use user_id + agent_id")
    print()
    print("✅ Memory Retrieval:")
    print("   • Relevant memories → automatically added to context")
    print("   • Context search based on recent messages")
    print("   • Confidence threshold filtering (>0.3)")
    print()
    print("✅ Memory Search Tool:")
    print("   • Available for specific memory queries")
    print("   • Agents can explicitly search for information")
    print("   • Supports both default and custom agent scopes")
    print()
    print("🎉 Memory integration demonstration completed!")

if __name__ == "__main__":
    asyncio.run(demo_memory_integration())