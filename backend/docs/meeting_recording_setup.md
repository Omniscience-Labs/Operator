# Meeting Recording Setup & Usage

The meeting recorder in Operator captures up to 2 hours of audio using a unified screen/window sharing approach, just like video calling apps (Zoom, Teams, Google Meet).

## How It Works

### Unified Recording Flow
The meeting recorder uses a **familiar screen sharing experience**:

1. **Click Record** → Two permission prompts appear
2. **Screen Share Picker** → Choose what to share (screen, window, or browser tab)
3. **Microphone Access** → Always captures your microphone
4. **Smart Audio Mix** → Combines audio from shared source + microphone

### What Gets Recorded
- ✅ **Your microphone** (always included)
- ✅ **Audio from shared source** (screen/window/tab you choose)
- ❌ **Video** (discarded immediately - audio only)

### Visual Indicators
- **TAB+MIC**, **WINDOW+MIC**, **SCREEN+MIC**: Green indicator = shared source + microphone
- **MIC**: Blue indicator = microphone only (if sharing was declined)
- **Pulse animation**: Red pulsing = actively recording
- **Orange color**: Paused state

## User Experience

### Recording Process
1. **Click record button** (⭕)
2. **Screen sharing dialog** → Select what to share:
   - **Browser Tab** → Captures audio from specific tab (meetings, videos)
   - **Application Window** → Captures audio from specific app
   - **Entire Screen** → Captures all system audio
3. **Microphone permission** → Grant access (required)
4. **Recording starts** → Visual indicator shows what's being captured

### User Controls
- **Record/Pause**: Click main button to record or pause
- **Resume**: Click play button when paused  
- **Stop**: Click square button to stop recording
- **Accept**: Green checkmark to save recording
- **Delete**: Red X to discard recording

## Screen Sharing Options

### Browser Tab (Recommended for Meetings)
- **Best for**: Video calls, online meetings, specific websites
- **Captures**: Audio from just that browser tab
- **Privacy**: Most secure - only shares specific tab audio
- **Example**: Zoom meeting tab, YouTube video

### Application Window
- **Best for**: Recording specific desktop applications
- **Captures**: Audio from the selected application
- **Privacy**: Moderate - shares one app's audio
- **Example**: Spotify, Teams desktop app, presentation software

### Entire Screen 
- **Best for**: System-wide recording, multiple apps
- **Captures**: All computer audio (all apps, notifications)
- **Privacy**: Least secure - shares everything
- **Example**: Recording multiple applications, system sounds

## Browser Compatibility

### Full Support (Unified Experience)
- ✅ **Chrome/Edge**: Complete screen sharing + audio capture
- ✅ **Firefox**: Screen sharing (limited audio on some platforms)

### Graceful Fallback
- ⚠️ **Safari**: Microphone-only (screen audio not supported)
- ⚠️ **Mobile**: Microphone-only (no screen sharing on mobile)

## Permission Flow

### First Time Setup
1. **Screen sharing prompt**: Choose what to share
   - Select source (tab/window/screen)
   - Audio checkbox must be checked
2. **Microphone prompt**: Grant microphone access

### Permission Tips
- **Check "Share audio"**: Ensure audio checkbox is selected in screen sharing dialog
- **macOS Users**: Grant "Screen Recording" permission in System Preferences
- **Corporate Networks**: Some policies may block screen capture
- **Privacy**: Only shares audio from sources you explicitly select

## Technical Specifications

### Audio Quality
- **Format**: WebM with Opus codec (fallback to MP4 when needed)
- **Bitrate**: 64kbps (optimized for speech/meetings)
- **Mixing**: Microphone (80%) + Shared Source (60%) balanced mix
- **Processing**: Minimal latency for real-time recording

### Recording Limits
- **Duration**: 2 hours maximum (auto-stops)
- **File Size**: Approximately 55MB for 2-hour recording
- **Chunks**: 5-second segments for better file structure

### Dependencies for Transcription
If using the audio transcription tool, ensure FFmpeg is available:

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

## Troubleshooting

### Common Issues

**"No audio in recording"**
- Ensure "Share audio" is checked in screen sharing dialog
- Some websites/apps may not have audio
- Try selecting a different source (tab/window/screen)

**"Screen sharing declined"**
- Recording continues with microphone only
- Visual indicator shows "MIC" (blue)
- Can restart to try screen sharing again

**"Permission denied"**
- Check browser permissions in address bar
- Reload page and try again
- Verify microphone isn't used by other applications

**"macOS permission issues"**
- Go to System Preferences > Security & Privacy > Privacy
- Enable "Screen Recording" for your browser
- Restart browser after enabling

**"No audio from shared tab/window"**
- Some apps don't provide audio to screen sharing
- Try selecting "Entire Screen" instead
- Ensure the source app is actually playing audio

### Quality Issues
- **Low shared audio**: Increase volume in source app before recording
- **Echo/feedback**: Use headphones during recording
- **Background noise**: Close unnecessary applications
- **Imbalanced mix**: Recording will automatically balance levels

## Best Practices

### For Best Results
1. **Use headphones** to prevent feedback loops
2. **Test first** with a short 10-second recording
3. **Check audio sources** before starting long recordings
4. **Close unnecessary apps** that might interfere
5. **Ensure stable internet** for file upload

### Screen Sharing Strategy
1. **For video meetings**: Share the specific browser tab
2. **For desktop apps**: Share the application window
3. **For multiple sources**: Share entire screen
4. **For privacy**: Choose the most specific source possible

### File Management
- Recordings auto-upload after acceptance
- Files include timestamp and source info
- Transcription happens automatically when tool is enabled
- Large files may take time to process and upload

## Privacy & Security

### Data Protection
- **Local processing**: Audio mixing happens entirely in browser
- **User control**: You choose exactly what gets shared
- **Clear consent**: Explicit permission for each recording session
- **Visual feedback**: Always shows when recording is active

### Best Practices
- **Minimize scope**: Share only what you need to record
- **Use headphones**: Prevents audio feedback and echo
- **Check sources**: Verify what audio will be captured
- **Secure upload**: Files transmitted over HTTPS only

## Comparison to Video Calls

This recording experience works **exactly like screen sharing** in video calling apps:

| Video Call Screen Share | Meeting Recorder |
|------------------------|------------------|
| Choose what to share   | ✅ Same dialog   |
| Audio from shared source | ✅ Captured |
| Your microphone | ✅ Captured |
| Video stream | ❌ Discarded (audio only) |
| Real-time mixing | ✅ Local processing |

The familiar interface means users already know how to use it! 