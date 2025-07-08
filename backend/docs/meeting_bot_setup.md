# Meeting Bot Transcription Setup

This guide explains how to set up the Meeting Bot feature using MeetingBaaS API for transcribing online meetings.

## Overview

The Meeting Bot feature allows users to:
- Enter a meeting URL (Zoom, Teams, Google Meet, Webex)
- Send an AI bot to join the meeting automatically
- Get real-time transcription and speaker identification
- Receive meeting summaries and action items

## Service Comparison

| Service | Price/Hour | Platforms | Free Trial | Setup |
|---------|------------|-----------|------------|-------|
| **MeetingBaaS** ⭐ | $0.69 | Zoom, Teams, Meet | ✅ Yes | Immediate |
| Recall.ai | $0.80-1.00 | All platforms | ❌ No | Enterprise sales |
| Transkriptor | Higher | Limited | ✅ 7 days | API only |

**Recommendation**: MeetingBaaS for best value and developer experience.

## Setup Instructions

### 1. Get MeetingBaaS API Key

1. Visit [MeetingBaaS.com](https://meetingbaas.com)
2. Sign up for free trial account
3. Get your API key from dashboard
4. Set environment variable:

```bash
export MEETINGBAAS_API_KEY="your_api_key_here"
```

### 2. Install Dependencies

```bash
pip install aiohttp
```

### 3. Configure Environment

Add to your `.env` file:

```env
MEETINGBAAS_API_KEY=your_api_key_here
```

### 4. Enable the Tool

The tool is automatically registered when imported. Make sure it's included in your agent's tool configuration.

## How It Works

### Frontend Flow
1. User clicks "Online" button in meeting recorder
2. Input field appears for meeting URL
3. User enters URL (e.g., `https://zoom.us/j/123456789`)
4. Bot is sent to join the meeting

### Backend Flow
1. `MeetingBotTool.join_meeting_and_transcribe()` is called
2. API request sent to MeetingBaaS to start bot
3. Bot joins meeting and begins recording
4. Real-time transcription begins
5. When meeting ends, final transcript is retrieved

## API Usage Examples

### Start a Meeting Bot

```python
from backend.agent.tools.meeting_bot_tool import MeetingBotTool

tool = MeetingBotTool()

# Join a Zoom meeting
result = await tool.join_meeting_and_transcribe(
    meeting_url="https://zoom.us/j/123456789",
    bot_name="AI Assistant"
)
print(result)  # "✅ Meeting bot successfully joined! Bot ID: abc123"
```

### Get Live Transcript

```python
# Get current transcript during meeting
transcript = await tool.get_meeting_transcript("abc123")
print(transcript)
```

### Stop Recording

```python
# Stop bot and get final transcript
final_result = await tool.stop_meeting_recording("abc123")
print(final_result)  # Includes summary, action items, etc.
```

## Supported Platforms

- **Zoom**: `zoom.us/j/...` or `zoom.us/my/...`
- **Microsoft Teams**: `teams.microsoft.com/...`
- **Google Meet**: `meet.google.com/...`
- **Cisco Webex**: `webex.com/...`

## Features

### Real-time Transcription
- Live transcription as meeting progresses
- Speaker identification and labeling
- Timestamps for all spoken content

### Post-Meeting Analysis
- Automatic meeting summary
- Action items extraction
- Participant list and duration
- Downloadable audio/video files

### Security & Privacy
- SOC2 compliant infrastructure
- EU data storage options available
- Automatic data deletion after 30 days
- Bot clearly identified in meeting

## Pricing

MeetingBaaS charges $0.69 per hour of meeting time:

- **Free Trial**: 2 hours free to test
- **Pay-as-you-go**: $0.69/hour, billed per minute
- **Volume Discounts**: Available for >100 hours/month

**Example costs**:
- 1-hour meeting: $0.69
- 30-minute meeting: $0.35
- 2-hour meeting: $1.38

## Troubleshooting

### Common Issues

**Bot fails to join meeting:**
- Verify meeting URL is correct and accessible
- Check if meeting has waiting room enabled
- Ensure meeting has started

**No transcript generated:**
- Check if meeting had audio content
- Verify bot successfully joined (check status)
- Some meetings may have restricted bot access

**API key errors:**
- Verify `MEETINGBAAS_API_KEY` is set correctly
- Check if API key has sufficient credits
- Ensure key is not expired

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Meeting URL should be from supported platforms" | Invalid URL format | Use full URL from supported platform |
| "MEETINGBAAS_API_KEY environment variable not set" | Missing API key | Set environment variable |
| "Bot failed to join meeting" | Meeting restrictions | Check waiting room, permissions |

## Development Testing

For testing without real meetings, you can use the test environment:

```python
tool = MeetingBotTool()
tool.base_url = 'https://api-test.meetingbaas.com/v1'  # Test environment
```

## Support

- **MeetingBaaS Docs**: [docs.meetingbaas.com](https://docs.meetingbaas.com)
- **Discord Community**: [discord.gg/meetingbaas](https://discord.gg/meetingbaas)
- **GitHub Examples**: [github.com/meetingbaas/examples](https://github.com/meetingbaas/examples)

## Alternative Services

If MeetingBaaS doesn't meet your needs:

### Recall.ai
- Higher cost ($0.80-1.00/hour)
- More platforms (Slack, Webex)
- Enterprise sales process
- Better for large organizations

### Transkriptor  
- Simple transcription focus
- Just URL + language needed
- Limited platform support
- Good for basic use cases

## Next Steps

1. Sign up for MeetingBaaS free trial
2. Test with a sample meeting
3. Integrate into your workflow
4. Monitor usage and costs
5. Scale up as needed

The Meeting Bot feature provides a seamless way to capture and transcribe online meetings without manual recording or complex setup. 