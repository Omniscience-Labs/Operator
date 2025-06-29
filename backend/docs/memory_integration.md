# Memory Integration with Mem0

This document explains how to set up and use the memory integration feature that provides conversational context and memory across agent interactions.

## Overview

The memory integration uses [Mem0](https://mem0.ai) to provide:
- **Conversational Memory**: Automatic storage of user-assistant interactions
- **Context Retrieval**: Relevant memories are searched and included in prompts
- **User-Specific Memory**: Separate memory spaces for different users
- **Agent-Specific Memory**: Custom agents maintain their own memory context

## Setup

### 1. Install Dependencies

The `mem0ai` package is included in the requirements.txt. Install it with:

```bash
pip install -r requirements.txt
```

### 2. Configure Mem0 API Key

Set your Mem0 API key as an environment variable:

```bash
export MEM0_API_KEY="your-mem0-api-key-here"
```

Or add it to your `.env` file:

```env
MEM0_API_KEY=your-mem0-api-key-here
```

### 3. Get Your Mem0 API Key

1. Sign up at [Mem0](https://mem0.ai)
2. Navigate to your dashboard
3. Create an API key
4. Copy the key and set it as the environment variable

## How It Works

### For Default Operator

When users interact with the default operator:
- Uses `user_id` only for memory operations
- Stores conversations: `client.add(messages=messages, user_id="user123")`
- Searches memories: `client.search(query="query", user_id="user123")`

### For Custom Agents

When users interact with custom agents:
- Uses both `user_id` and `agent_id` for memory operations
- Stores conversations: `client.add(messages=messages, user_id="user123", agent_id="agent456")`
- Searches memories: `client.search(query="query", user_id="user123", agent_id="agent456")`

### Memory Flow

1. **User sends message** → Automatic memory search using the message content
2. **Relevant memories found** → Added to system prompt as context
3. **Agent responds** → Conversation (user message + assistant response) stored in memory

## Features

### Automatic Memory Search

When a user sends a message, the system:
1. Extracts the text content from the user's message
2. Searches for relevant memories using that content as the query
3. Adds found memories to the system prompt as contextual information

### Memory Storage

After the assistant responds, the system:
1. Collects the user message and assistant response
2. Stores them in Mem0 with appropriate user_id and agent_id
3. Handles failures gracefully without affecting the conversation

### Memory Context Format

Relevant memories are added to the system prompt in this format:

```
## Relevant Context from Previous Conversations:
1. [Memory content 1]
2. [Memory content 2]
3. [Memory content 3]
...
```

## Configuration

### Memory Service Initialization

The memory service initializes automatically and handles:
- API key validation
- Graceful degradation if Mem0 is unavailable
- Error logging without disrupting conversations

### Memory Limits

- **Search limit**: 5 most relevant memories per query (configurable)
- **Content filtering**: Only user and assistant messages are stored
- **Text extraction**: Automatically handles structured message content

## Error Handling

The memory integration is designed to be robust:
- **Missing API key**: Service disabled, conversations continue normally
- **Mem0 unavailable**: Memory operations skip silently
- **Network errors**: Logged but don't affect user experience
- **Invalid responses**: Handled gracefully with fallbacks

## Monitoring

Memory operations are logged at appropriate levels:
- **Info**: Successful memory searches with result counts
- **Debug**: Memory storage operations and detailed flow
- **Warning**: Service initialization issues
- **Error**: Failed operations with full context

## Example Usage

```python
# This happens automatically in the ThreadManager
import os
from mem0 import AsyncMemoryClient

os.environ["MEM0_API_KEY"] = "your-api-key"
client = AsyncMemoryClient()

# For default operator
messages = [
    {"role": "user", "content": "I'm traveling to San Francisco"},
    {"role": "assistant", "content": "That's great! I'm going to Dubai next month."},
]
await client.add(messages=messages, user_id="user1")

# Search memories
memories = await client.search("travel plans", user_id="user1")

# For custom agents
await client.add(messages=messages, user_id="user1", agent_id="agent1")
memories = await client.search("travel plans", user_id="user1", agent_id="agent1")
```

## Troubleshooting

### Memory Not Working

1. Check if `MEM0_API_KEY` is set correctly
2. Verify the API key is valid and has proper permissions
3. Check logs for initialization errors
4. Ensure network connectivity to Mem0 services

### Performance Issues

1. Memory searches are limited to 5 results by default
2. Only essential content is stored (user/assistant messages only)
3. Failed memory operations don't block conversations

### Privacy Considerations

- Memories are isolated by user_id and agent_id
- No cross-user memory leakage
- Content is stored on Mem0's infrastructure
- Follow Mem0's privacy and security guidelines

## Integration Points

The memory functionality integrates at these points in the codebase:

1. **ThreadManager**: Main integration point for memory search and storage
2. **Memory Service**: Handles Mem0 client operations and error handling
3. **Requirements**: Includes `mem0ai` dependency
4. **Environment**: Requires `MEM0_API_KEY` configuration