# Meeting Recording Feature Test Guide

## Testing the Meeting Recording Feature

### 1. Frontend Testing

1. **Start the application** and navigate to any chat thread
2. **Look for the new recording button** - it should appear as a circle icon next to the voice recorder button
3. **Click the circle icon** to start recording
   - **Browser will prompt for microphone access** - click "Allow"
   - **Browser will prompt for screen sharing** - select "Share tab audio" or "Share system audio" and click "Share"
   - The icon should turn red and pulse
   - A timer should appear showing the recording duration
   
   **Note**: The feature captures both microphone and system audio. If you deny system audio access, it will fallback to microphone-only recording.
4. **Click the pause icon** to pause the recording
   - The icon should change to orange
   - Timer should stop
5. **Click play** to resume recording
6. **Click the square stop button** to stop recording
7. **You'll see two options**:
   - Green checkmark ✓ to accept the recording
   - Red X to delete it
8. **Click the checkmark** to accept
   - The audio file will be attached to your message
   - You'll see a message like: "Please transcribe the following meeting recording (duration: X:XX)"

### 2. Backend Testing

Once you send the message with the recording:
1. The AI will automatically use the `transcribe_audio` tool
2. For files under 25MB, it will transcribe directly
3. For larger files, it will chunk them into 10-minute segments
4. The transcript will be saved as a text file alongside the audio

### 3. Expected Output

The AI should respond with something like:
```
I've successfully transcribed your meeting recording. Here's what was discussed:

[Transcribed content here]

The full transcript has been saved to: meeting-recording-TIMESTAMP_transcript.txt
```

## Quick Test Script

You can test the audio transcription tool directly by:
1. Uploading any audio file to the workspace
2. Asking: "Please transcribe the audio file at /workspace/test-audio.webm"

The AI will use the transcribe_audio tool to process it.
