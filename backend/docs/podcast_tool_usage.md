# Podcast Generation Tool

The Podcast Generation Tool integrates with the [Podcastfy REST API](https://github.com/souzatharsis/podcastfy) to create AI-powered podcasts from various content sources. This API-based approach eliminates dependency conflicts and provides reliable service.

## Features

- **Multi-source content support**: Generate podcasts from URLs, local files, and images
- **Flexible file format support**: PDFs, text files, markdown, images (JPG, PNG)
- **Customizable conversation styles**: Educational, casual, analytical, storytelling, etc.
- **Multiple podcast lengths**: Short (2-5 min), medium (10-15 min), long (20-30 min)
- **Multi-language support**: Generate podcasts in various languages
- **High-quality TTS**: Uses ElevenLabs for professional-grade voice synthesis
- **Transcript-only mode**: Review content before audio generation
- **Sandbox integration**: All files are processed and saved within the sandbox

## Usage Examples

### Basic URL Podcast
```python
# Generate a podcast from web articles
await generate_podcast(
    urls=["https://example.com/article1", "https://example.com/article2"],
    output_name="my_news_podcast",
    conversation_style=["engaging", "educational"]
)
```

### Local Files Podcast
```python
# Generate podcast from files in the sandbox
await generate_podcast(
    file_paths=["documents/research.pdf", "notes/summary.txt"],
    podcast_length="long",
    language="English"
)
```

### Image-based Podcast
```python
# Generate podcast from images (charts, infographics, etc.)
await generate_podcast(
    image_paths=["charts/sales_data.png", "images/diagram.jpg"],
    conversation_style=["analytical", "educational"]
)
```

### Mixed Content Podcast
```python
# Combine multiple content types with advanced configuration
await generate_podcast(
    urls=["https://research.example.com/paper"],
    file_paths=["local_analysis.pdf"],
    image_paths=["chart.png"],
    output_name="comprehensive_analysis",
    podcast_length="medium",
    conversation_style=["engaging", "fast-paced", "enthusiastic"],
    roles_person1="expert analyst",
    roles_person2="curious interviewer",
    dialogue_structure=["Introduction", "Key Findings", "Implications", "Conclusion"],
    podcast_name="Tech Deep Dive",
    podcast_tagline="Exploring cutting-edge research",
    engagement_techniques=["rhetorical questions", "analogies", "humor"],
    creativity=0.8,
    user_instructions="Focus on practical applications and real-world impact"
)
```

### Transcript Only
```python
# Generate only transcript for review
await generate_podcast(
    urls=["https://example.com/content"],
    transcript_only=True
)
```

## Parameters

### Content Sources (at least one required)
- `urls`: List of website URLs to include
- `file_paths`: List of local file paths in sandbox (relative to /workspace)
- `image_paths`: List of image file paths in sandbox

### Customization Options

#### Basic Options
- `output_name`: Custom name for generated files (default: timestamp-based)
- `conversation_style`: List of styles - "engaging", "educational", "casual", "formal", "analytical", "storytelling", "interview", "debate", "fast-paced", "enthusiastic"
- `podcast_length`: "short", "medium", or "long"
- `language`: Target language for the podcast (default: "English")
- `transcript_only`: Generate only transcript without audio (default: False)

#### Advanced Conversation Configuration
- `roles_person1`: Role of the first speaker (e.g., "main summarizer", "host", "expert")
- `roles_person2`: Role of the second speaker (e.g., "questioner/clarifier", "co-host", "interviewer")
- `dialogue_structure`: Structure of the podcast dialogue (e.g., ["Introduction", "Main Content", "Deep Dive", "Conclusion"])
- `podcast_name`: Custom name for the podcast series
- `podcast_tagline`: Tagline or subtitle for the podcast
- `engagement_techniques`: Techniques to make the podcast engaging (e.g., ["rhetorical questions", "anecdotes", "analogies", "humor"])
- `creativity`: Level of creativity/temperature (0.0-1.0, where 1.0 is most creative)
- `user_instructions`: Custom instructions to guide the conversation focus
- `max_num_chunks`: Maximum number of discussion rounds in longform podcasts (1-15)
- `min_chunk_size`: Minimum characters per discussion round (200-2000)

## Output

Generated podcasts are saved in the `/workspace/podcasts/` directory with:
- Audio file: `{output_name}.mp3`
- Transcript file: `{output_name}_transcript.txt`

Use the `list_podcasts` function to view all generated podcasts with their details.

## API Key Requirements

The tool requires API keys for the underlying services:

- **ElevenLabs**: Required for high-quality voice synthesis (ELEVENLABS_API_KEY)
- **OpenAI OR Gemini**: Required for transcript generation (OPENAI_API_KEY or GEMINI_API_KEY)

Configure these environment variables:
- `PODCASTFY_API_URL`: URL of the Podcastfy API service (default: https://thatupiso-podcastfy-ai-demo.hf.space)
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key
- `OPENAI_API_KEY`: Your OpenAI API key (if using OpenAI)
- `GEMINI_API_KEY`: Your Google Gemini API key (alternative to OpenAI)

See `docs/podcast_tool_api_setup.md` for detailed setup instructions.

## Supported File Formats

### Documents
- PDF files (.pdf)
- Text files (.txt)
- Markdown files (.md)
- Rich text format (.rtf)

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### URLs
- News articles
- Blog posts
- Research papers
- Documentation pages
- Any web content with readable text

## Error Handling

The tool includes comprehensive error handling for:
- Missing or invalid API keys
- Invalid file paths
- Network connectivity issues
- API rate limits
- File format incompatibilities
- API timeout (automatically retries with polling)

## Performance Notes

- Podcast generation time varies based on content length and TTS model
- ElevenLabs TTS provides higher quality but takes longer
- Large files may require chunking for processing
- Generated audio files are typically 1-10 MB depending on length

## Troubleshooting

### Common Issues

1. **"Either OPENAI_API_KEY or GEMINI_API_KEY must be set"**
   - Configure at least one LLM API key in your environment
   - Verify the API key is correctly formatted

2. **"ELEVENLABS_API_KEY must be set"**
   - Configure your ElevenLabs API key in the environment
   - Get your key from https://elevenlabs.io/

3. **"File not found"**
   - Verify file paths are relative to /workspace
   - Use the files tool to check file existence

4. **"No content sources provided"**
   - Provide at least one of: urls, file_paths, or image_paths

5. **"API request failed" or "Timeout"**
   - Check network connectivity to the Podcastfy API
   - Verify the PODCASTFY_API_URL is correct and accessible
   - The API can take 1-3 minutes to generate podcasts

6. **"No event_id returned from API"**
   - The API service may be temporarily unavailable
   - Try again in a few minutes
   - Consider setting up your own Podcastfy API instance 