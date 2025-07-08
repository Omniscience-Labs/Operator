# Podcast Tool FastAPI Setup

The podcast tool has been updated to use your custom Podcastfy FastAPI instead of the Gradio-based API. This provides a much cleaner and more direct integration.

## Required Environment Variables

Add these environment variables to your `.env` file:

```bash
# Podcastfy FastAPI Configuration
PODCASTFY_API_URL=https://podcastfy-8x6a.onrender.com  # Your deployed FastAPI instance
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# LLM API Keys (at least one is required)
OPENAI_API_KEY=your_openai_api_key_here  # Usually already configured
GEMINI_API_KEY=your_gemini_api_key_here   # Alternative to OpenAI
```

## API Key Setup

### 1. ElevenLabs API Key (Required)
1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up for an account
3. Go to your profile settings
4. Copy your API key
5. Add it to your `.env` file as `ELEVENLABS_API_KEY`

### 2. OpenAI API Key (Required if not using Gemini)
1. Go to [OpenAI API](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env` file as `OPENAI_API_KEY`

### 3. Gemini API Key (Alternative to OpenAI)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file as `GEMINI_API_KEY`

**Note**: If both OpenAI and Gemini keys are provided, your FastAPI will decide which one to use based on its internal logic.

## FastAPI Deployment

Your FastAPI implementation is much simpler than the Gradio approach. Here's how to deploy it:

### Option 1: Local Development
```bash
# Run your FastAPI locally
python your_fastapi_file.py

# Or with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8080
```

### Option 2: Docker Deployment
```bash
# Create a Dockerfile for your FastAPI
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV HOST=0.0.0.0
ENV PORT=8080

CMD ["python", "main.py"]
```

### Option 3: Deploy on Cloud Platforms

Your FastAPI can be deployed on:
- **Render**: Connect your repo, set environment variables
- **Railway**: Simple git-based deployment
- **Google Cloud Run**: Containerized deployment
- **AWS ECS/Fargate**: Container service
- **Azure Container Instances**: Quick container deployment
- **Fly.io**: Global deployment

## API Endpoints

Your FastAPI provides these endpoints:

### `POST /generate`
Generates a podcast and returns an audio URL.

**Request Format:**
```json
{
  "urls": ["https://example.com/article"],
  "openai_key": "your_openai_key",
  "google_key": "your_gemini_key", 
  "elevenlabs_key": "your_elevenlabs_key",
  "tts_model": "elevenlabs",
  "creativity": 0.7,
  "conversation_style": ["engaging", "educational"],
  "roles_person1": "main summarizer",
  "roles_person2": "questioner",
  "dialogue_structure": ["Introduction", "Content", "Conclusion"],
  "name": "My Podcast",
  "tagline": "Great conversations",
  "output_language": "English",
  "user_instructions": "Focus on practical insights",
  "engagement_techniques": ["rhetorical questions"],
  "is_long_form": false,
  "voices": {}
}
```

**Response Format:**
```json
{
  "audioUrl": "/audio/podcast_abc123.mp3"
}
```

### `GET /audio/{filename}`
Serves the generated audio files.

### `GET /health`
Health check endpoint.

## Usage

Once configured, the podcast tool will automatically use your FastAPI. The integration is seamless:

```python
# The tool now makes direct HTTP requests to your FastAPI
result = await podcast_tool.generate_podcast(
    urls=["https://example.com/article"],
    podcast_name="My Podcast",
    conversation_style=["engaging", "educational"],
    tts_model="elevenlabs"
)
```

## Key Improvements Over Gradio API

1. **Direct Response**: No polling required - immediate response with audio URL
2. **Clean Interface**: Simple JSON request/response instead of complex arrays
3. **Better Error Handling**: FastAPI provides clear error messages
4. **Simpler Deployment**: Standard web service deployment
5. **More Control**: You control the API implementation and can customize it

## Troubleshooting

### Common Issues

1. **Connection refused**: Make sure your FastAPI is running on the correct port
   ```bash
   curl http://localhost:8080/health
   ```

2. **Invalid API keys**: Verify all required API keys are set correctly

3. **File not found**: Check that the `/audio/{filename}` endpoint is serving files correctly

4. **Timeout**: The tool has a 120-second timeout for podcast generation

5. **Missing configuration**: Ensure your FastAPI has access to all required environment variables

### Testing Your FastAPI

You can test your FastAPI directly:

```bash
# Health check
curl http://localhost:8080/health

# Generate podcast
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com"],
    "openai_key": "your_key",
    "elevenlabs_key": "your_key",
    "name": "Test Podcast"
  }'
```

## File Content Processing

The tool now reads local files from the sandbox and sends their content as text to your FastAPI via the `text` parameter. This works for:

- Text files (.txt, .md, .csv)
- Any UTF-8 encoded files
- Multiple files are combined into a single text payload

Files are processed by reading their content and combining them before sending to the `/generate` endpoint.

## Benefits of Your FastAPI Approach

1. **Simplicity**: Clean, straightforward API design
2. **Performance**: Direct responses without polling
3. **Flexibility**: Easy to customize and extend
4. **Reliability**: Standard HTTP responses and error handling
5. **Scalability**: Can be deployed anywhere that supports containers
6. **Debugging**: Easy to test and debug locally

## Security Notes

- API keys are passed in request bodies (consider headers for production)
- Implement rate limiting for production use
- Add authentication if needed
- Monitor resource usage and costs
- Consider using environment variables on the server side instead of passing keys in requests 