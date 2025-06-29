# Quick Setup Guide for Mem0 Memory Integration

## 🚀 Quick Start

Follow these simple steps to enable intelligent memory capabilities in your Operator platform:

### 1. Install Dependencies

```bash
cd backend
pip install mem0ai>=1.0.0
```

### 2. Configure API Key

Set your Mem0 API key as an environment variable:

```bash
export MEM0_API_KEY="your-mem0-api-key-here"
```

Or add it to your `.env` file:

```env
MEM0_API_KEY=your-mem0-api-key-here
```

### 3. Restart Your Application

Restart your Operator backend to enable memory features:

```bash
# If using Docker
docker-compose restart

# If running directly
# Stop and restart your uvicorn/gunicorn process
```

### 4. Verify Setup

Check the logs for successful memory service initialization:

```
INFO - Memory service initialized successfully with Mem0
```

## 🧪 Test Memory Features

### Option 1: Use the Example Script

```bash
cd backend
python examples/memory_example.py
```

### Option 2: Start a Conversation

1. Start a new conversation in the UI
2. Send a message like: "I love hiking and outdoor activities"
3. In a new conversation, ask: "What do you know about my hobbies?"
4. The agent should remember your preferences!

## 🔧 Troubleshooting

### Memory Not Working?

1. **Check API Key**: Ensure `MEM0_API_KEY` is set correctly
2. **Check Logs**: Look for "Memory service initialized successfully"
3. **Check Installation**: Run `pip list | grep mem0`

### Still Need Help?

- Review the full documentation: `docs/memory_integration.md`
- Check the example script: `examples/memory_example.py`
- Run the tests: `python -m pytest tests/test_memory_integration.py`

## ⚡ How It Works

Once enabled, memory features work automatically:

- **For Default Agent**: Memories stored per user
- **For Custom Agents**: Memories stored per user + agent
- **Privacy**: Each user's memories are isolated
- **Performance**: Non-blocking async operations

## 🎯 What You Get

- **Personalized Responses**: Agents remember your preferences
- **Context Continuity**: References to previous conversations
- **Smart Recommendations**: Based on your history
- **Zero Configuration**: Works automatically once API key is set

That's it! Your Operator platform now has intelligent memory capabilities. 🧠✨