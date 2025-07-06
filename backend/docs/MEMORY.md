# Memory Functionality with mem0

This document explains how mem0 memory functionality is integrated into the agent platform for persistent conversation memory.

## Overview

The platform automatically manages conversation memory using [mem0](https://mem0.dev/), providing agents with the ability to remember previous conversations, user preferences, and context across sessions.

## Key Features

- **Automatic Memory Storage**: User and assistant messages are automatically stored in memory
- **Contextual Memory Retrieval**: Relevant memories are automatically added to conversation context
- **Memory Search Tool**: Agents can explicitly search for specific information from past conversations
- **Scoped Memory**: Different memory scopes for default operators vs custom agents

## Architecture

### Memory Service (`services/memory.py`)

The `MemoryService` class provides:
- Async and sync client management for mem0
- Message formatting for mem0 consumption
- Memory addition and search functionality
- Production-ready error handling

### Thread Manager Integration (`agentpress/thread_manager.py`)

The `ThreadManager` automatically:
- Adds messages to memory when they're saved to the database
- Retrieves relevant memories based on conversation context
- Includes memory context in LLM calls

### Memory Search Tool (`agent/tools/memory_search_tool.py`)

Provides agents with explicit memory search capabilities:
- Search for specific information from past conversations
- Find user preferences and context
- Retrieve relevant memories with confidence scores

## Memory Scopes

### Default Operators
- **Scope**: `user_id` only
- **Usage**: Memories are shared across all conversations for the user
- **Example**: All conversations with the default operator share the same memory pool

### Custom Agents (Including Managed Agents)
- **Scope**: `user_id:agent_id` (combined identifier)
- **Usage**: Memories are completely isolated per user + agent combination
- **Managed Agents**: Each user has their own separate memory for the same managed agent
- **Example**: User A and User B using the same managed agent will have completely separate memories
- **Example**: Travel agent memories are separate from coding assistant memories

## Setup

### 1. Install Dependencies

Add to `requirements.txt`:
```
mem0>=0.1.0
```

### 2. Environment Configuration

Set your mem0 API key:
```bash
export MEM0_API_KEY="your-api-key"
```

### 3. Automatic Integration

Memory functionality is automatically integrated when:
- Messages are added via `ThreadManager.add_message()`
- Conversations are processed via `ThreadManager.run_thread()`
- Agents use the memory search tool

## Usage Examples

### Automatic Memory Storage

```python
# This happens automatically when messages are added
await thread_manager.add_message(
    thread_id="thread_123",
    type="user", 
    content="I'm planning a trip to Tokyo next month"
)

await thread_manager.add_message(
    thread_id="thread_123",
    type="assistant",
    content="That sounds exciting! What are you most excited about?"
)

# Both messages are automatically stored in mem0 memory
```

### Automatic Memory Retrieval

```python
# This happens automatically in run_thread()
# Relevant memories are searched and added to context before LLM calls

response = await thread_manager.run_thread(
    thread_id="thread_123",
    system_prompt=system_prompt,
    # ... other parameters
)

# Relevant memories from past conversations are automatically included
```

### Manual Memory Search

Agents can use the memory search tool:

```xml
<function_calls>
<invoke name="search_memory">
<parameter name="query">user travel preferences</parameter>
<parameter name="limit">5</parameter>
</invoke>
</function_calls>
```

### Direct Memory Operations

```python
from services.memory import memory_service

# Add memory manually
await memory_service.add_memory_async(
    messages=[
        {"role": "user", "content": "I love Italian food"},
        {"role": "assistant", "content": "Great! I'll remember your preference for Italian cuisine."}
    ],
    user_id="user123",
    agent_id="agent456",  # Optional for custom agents
    metadata={"context": "food_preferences"}
)

# Search memory manually  
results = await memory_service.search_memory_async(
    query="food preferences",
    user_id="user123",
    agent_id="agent456",  # Optional for custom agents
    limit=10
)
```

## Memory Context Integration

When conversations are processed, the system:

1. **Extracts Context**: Recent messages are analyzed to create search queries
2. **Searches Memory**: Relevant memories are retrieved based on conversation context  
3. **Formats Context**: Memories are formatted into a context block
4. **Includes in LLM Call**: Memory context is added before recent messages

### Example Memory Context

```
--- Relevant Memories ---
Based on our previous conversations, here are some relevant memories:

1. User is planning a trip to Tokyo next month
2. User loves Japanese cuisine, especially ramen and sushi  
3. User is vegetarian
4. User has a budget of $2000 including flights

--- End of Memories ---
```

## Configuration

### Memory Thresholds

- **Confidence Threshold**: 0.3 (only memories with >0.3 confidence are included)
- **Context Limit**: 5 memories maximum per conversation
- **Search Context**: Last 3 messages used to generate search queries

### Error Handling

- Memory failures don't block conversation flow
- Graceful degradation when mem0 service is unavailable
- Comprehensive logging for debugging

## Testing

Run the memory demonstration:

```bash
cd backend
python examples/memory_demo.py
```

This will demonstrate:
- Memory storage for default operators
- Memory storage for custom agents
- Memory search functionality
- Automatic context integration

## Production Considerations

- **API Key Security**: Store `MEM0_API_KEY` securely in environment variables
- **Rate Limiting**: mem0 API has rate limits; the service handles retries gracefully
- **Data Privacy**: Memories contain conversation data; ensure compliance with privacy requirements
- **Cost Management**: Monitor mem0 usage as it's a paid service

## Troubleshooting

### Memory Not Working

1. Check `MEM0_API_KEY` is set correctly
2. Verify mem0 service is available: `memory_service.is_available`
3. Check logs for memory-related errors

### No Memories in Context

1. Ensure sufficient conversation history exists
2. Check memory confidence scores (must be >0.3)
3. Verify search queries are generating relevant results

### Memory Search Tool Not Available

1. Ensure `MemorySearchTool` is registered in `agent/run.py`
2. Check tool is included in agent configuration
3. Verify ThreadManager is passed to the tool correctly

## API Reference

### MemoryService Methods

- `add_memory_async()`: Add messages to memory
- `search_memory_async()`: Search memory for relevant information
- `add_memory_sync()`: Synchronous memory addition
- `search_memory_sync()`: Synchronous memory search

### ThreadManager Methods

- `search_memory()`: Search memory for a thread
- `_get_relevant_memories()`: Get contextual memories for conversation
- `_add_message_to_memory()`: Add message to memory automatically

### MemorySearchTool Methods

- `search_memory()`: Agent tool for explicit memory searches