# Memory Integration with Mem0

The Operator platform now includes intelligent memory capabilities powered by Mem0, allowing agents to remember context from previous conversations and provide more personalized responses.

## Features

- **Automatic Memory Storage**: User and assistant messages are automatically stored in memory
- **Contextual Memory Search**: Relevant memories are searched and included in LLM context
- **User-Specific Memories**: Memories are isolated per user for privacy
- **Agent-Specific Memories**: Custom agents can have their own memory contexts
- **Graceful Degradation**: System works normally if memory is disabled or unavailable

## Configuration

### Environment Variables

Set the following environment variable to enable memory features:

```bash
MEM0_API_KEY=your-mem0-api-key-here
```

### Alternative Configuration

You can also set the API key in your configuration file:

```python
# In utils/config.py or environment-specific config
MEM0_API_KEY = "your-mem0-api-key-here"
```

## How It Works

### Memory Storage

1. **Automatic Storage**: When users send messages or agents respond, the content is automatically processed and stored in Mem0
2. **User Isolation**: Each user's memories are stored separately using their `user_id`
3. **Agent Context**: Custom agents get additional context through `agent_id` parameter
4. **Structured Format**: Messages are stored in the format expected by Mem0:
   ```python
   [
       {"role": "user", "content": "I'm planning a trip to San Francisco"},
       {"role": "assistant", "content": "That sounds exciting! What are you most looking forward to?"}
   ]
   ```

### Memory Search

1. **Query Generation**: The system uses the current user message as a search query
2. **Contextual Search**: Searches for relevant memories based on semantic similarity
3. **Context Enhancement**: Found memories are formatted and prepended to the system prompt
4. **LLM Integration**: The enhanced context is used in the LLM call for more informed responses

### Memory Formatting

Relevant memories are formatted and added to the system prompt as:

```
## Relevant Memories

- I mentioned planning a trip to San Francisco last week
- I prefer cultural activities over nightlife when traveling
- I have dietary restrictions (vegetarian)

---

[Original system prompt continues...]
```

## Usage Examples

### For Default Operator Agent

```python
# Memory is automatically handled
# User messages and agent responses are stored with user_id only
await memory_service.add_memory(
    messages=[{"role": "user", "content": "I love hiking"}],
    user_id="user123"
)
```

### For Custom Agents

```python
# Custom agents get additional agent_id context
await memory_service.add_memory(
    messages=[{"role": "user", "content": "Help me code a web app"}],
    user_id="user123",
    agent_id="coding-assistant"
)
```

### Memory Search

```python
# Search for relevant memories
memories = await memory_service.search_memory(
    query="What technologies should I use for my web app?",
    user_id="user123",
    agent_id="coding-assistant",  # Optional for custom agents
    limit=5
)
```

## Error Handling

The memory system is designed to be resilient:

- **Missing API Key**: Memory features are disabled, system works normally
- **Mem0 Service Down**: Operations fail gracefully, no impact on core functionality
- **Invalid Responses**: Errors are logged, conversation continues without memory enhancement

## Privacy and Security

- **User Isolation**: Memories are strictly isolated per user using `user_id`
- **Agent Separation**: Custom agents maintain separate memory contexts
- **No Cross-Contamination**: Users cannot access each other's memories
- **Optional Feature**: Can be completely disabled by not setting the API key

## Monitoring

Memory operations are logged for debugging and monitoring:

```
INFO - Memory service initialized successfully with Mem0
DEBUG - Adding memory for user user123 with agent coding-assistant
DEBUG - Found 3 relevant memories for thread thread456
```

## Troubleshooting

### Memory Not Working

1. **Check API Key**: Ensure `MEM0_API_KEY` is set correctly
2. **Check Logs**: Look for memory-related error messages
3. **Verify Installation**: Ensure `mem0ai` package is installed
4. **Test Connection**: Check if Mem0 service is accessible

### Performance Considerations

1. **Memory Search Limit**: Default limit is 5 memories per search (configurable)
2. **Async Operations**: Memory operations are non-blocking
3. **Caching**: Thread metadata is cached to reduce database queries
4. **Error Isolation**: Memory errors don't affect core agent functionality

## Technical Implementation

### Key Components

1. **MemoryService** (`services/memory.py`): Main memory interface
2. **ThreadManager Integration**: Automatic memory storage and search
3. **Thread Metadata Caching**: Efficient user_id and agent_id retrieval
4. **Error Handling**: Graceful degradation on failures

### Integration Points

1. **Message Storage**: `ThreadManager.add_message()` triggers memory storage
2. **Context Enhancement**: `ThreadManager.run_thread()` searches memories before LLM calls
3. **User Context**: Thread metadata provides user_id and agent_id context

## Future Enhancements

- **Memory Management**: User-controlled memory deletion and management
- **Memory Analytics**: Insights into memory usage and effectiveness
- **Advanced Search**: More sophisticated memory retrieval algorithms
- **Memory Sharing**: Optional memory sharing between related agents (with user consent)