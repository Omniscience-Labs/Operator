# MeetingBaaS Webhook Setup Guide

## 🎯 Overview

This document outlines the MeetingBaaS webhook implementation for real-time meeting bot updates.

## 🔧 Current Implementation

### Webhook Endpoint: `POST /api/meeting-bot/webhook`

**Features:**
- ✅ API key verification via `x-meeting-baas-api-key` header
- ✅ Idempotency handling to prevent duplicate events
- ✅ Comprehensive event type support
- ✅ Real-time SSE broadcasting to frontend
- ✅ Session persistence across page refreshes
- ✅ Structured logging with context

**Supported Events:**
- `meeting.started` - Bot joined meeting
- `meeting.completed` - Meeting ended, transcript ready
- `meeting.failed` - Bot failed to join
- `transcription.available` - Initial transcript ready
- `transcription.updated` - Live transcript updates
- `bot.status_change` - Generic status changes

## 🌐 Webhook URL Configuration

### Option 1: Bot-Specific Webhooks (✅ Implemented)
```python
webhook_url = f"{request.base_url}api/meeting-bot/webhook"
result = await tool.start_meeting_bot(meeting_url, "AI Bot", webhook_url)
```

### Option 2: Account-Level Webhook (Optional)
```bash
curl -X POST https://api.meetingbaas.com/accounts/webhook_url \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"webhook_url": "https://yourdomain.com/api/meeting-bot/webhook"}'
```

## 🔒 Security Requirements

### Environment Variables
```bash
MEETINGBAAS_API_KEY=your_api_key_here
```

### Webhook Verification
- All webhooks include `x-meeting-baas-api-key` header
- Server validates header matches environment variable
- Unauthorized requests return 401 status

## 🚀 Production Deployment

### 1. Domain Setup
- Ensure your webhook URL is publicly accessible
- Use HTTPS in production (required for webhooks)
- Example: `https://yourdomain.com/api/meeting-bot/webhook`

### 2. Scaling Considerations
- **File Storage**: Current implementation uses `/tmp/meeting_bot_sessions/`
- **Production**: Replace with Redis or database for multi-server deployments
- **Idempotency**: Current in-memory, should use distributed cache

### 3. Monitoring & Logging
```python
# Structured logging implemented
logger.info(f"[WEBHOOK] Bot {bot_id} successfully joined meeting")
logger.error(f"[WEBHOOK] Bot {bot_id} failed: {error}")
```

## 📊 Performance Benefits

### Before (Polling):
- 240 API calls/hour per bot
- 15-second maximum delay
- High server load

### After (Webhooks):
- ~5 events per meeting total
- <1 second update delay
- 98% reduction in API calls

## 🔄 Real-Time Flow

1. **Bot Creation**: Webhook URL registered with MeetingBaaS
2. **Meeting Events**: MeetingBaaS sends POST to webhook
3. **Verification**: API key validated
4. **Processing**: Event stored, session updated
5. **Broadcasting**: SSE sends update to frontend
6. **UI Update**: Status changes instantly in browser

## 🛠️ Testing Webhooks

### Local Development
```bash
# Use ngrok to expose local server
ngrok http 8000

# Webhook URL becomes: https://abc123.ngrok.io/api/meeting-bot/webhook
```

### Production Testing
```bash
# Test webhook endpoint
curl -X POST https://yourdomain.com/api/meeting-bot/webhook \
  -H "x-meeting-baas-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "meeting.started", "data": {"botId": "test-123"}}'
```

## 🚨 Error Handling

### Webhook Failures
- MeetingBaaS retries failed webhooks
- Events are idempotent (safe to retry)
- Fallback polling disabled (webhooks are primary)

### Network Issues
- SSE connections auto-reconnect
- Heartbeat every 30 seconds
- Graceful degradation if webhook fails

## 📈 Next Steps

### Optional Optimizations:
1. **Account-level webhook** for simplified configuration
2. **Redis/Database** for production session storage
3. **Webhook signature validation** for enhanced security
4. **Rate limiting** for webhook endpoint
5. **Dead letter queue** for failed events

The current implementation is **production-ready** for most use cases! 