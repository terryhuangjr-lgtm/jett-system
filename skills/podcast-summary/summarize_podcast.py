#!/usr/bin/env python3
"""
Podcast Summarization System
Downloads, transcribes, and summarizes podcasts from YouTube URLs
"""

import os
import sys
import subprocess
from datetime import datetime
import whisper
import ollama

SLACK_POSTER = "/home/clawd/clawd/automation/deploy-podcast-summary.js"

from config import (
    AUDIO_DIR,
    TRANSCRIPT_DIR,
    SUMMARY_DIR,
    WHISPER_MODEL,
    WHISPER_FP16,
    OLLAMA_MODEL
)

# Import database functions if available
try:
    from database import add_podcast, update_podcast_status, DB_PATH
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False

def download_audio(youtube_url):
    """Download audio from YouTube URL. Returns path to downloaded file."""
    print(f"📥 Downloading audio from: {youtube_url}")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(AUDIO_DIR, f"podcast_{timestamp}.mp3")
    
    # Get video title first
    title_cmd = [
        "/home/clawd/.local/bin/yt-dlp",
        "--cookies", "/home/clawd/clawd/youtube-cookies.txt",
        "--get-title",
        "-o", "%(title)s",
        youtube_url
    ]
    try:
        video_title = subprocess.run(title_cmd, capture_output=True, text=True).stdout.strip()
        print(f"📺 Video title: {video_title}")
    except:
        video_title = "Unknown Podcast"
    
    cmd = [
        "/home/clawd/.local/bin/yt-dlp",
        "--cookies", "/home/clawd/clawd/youtube-cookies.txt",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "-o", output_path,
        youtube_url
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"✅ Downloaded to: {output_path}")
        return output_path, video_title
    except subprocess.CalledProcessError as e:
        print(f"❌ Download failed: {e}")
        return None, None

def transcribe_audio(audio_path):
    """Transcribe audio file using Whisper. Returns path to transcript files."""
    print(f"🎤 Transcribing audio (this may take a few minutes)...")
    
    model = whisper.load_model(WHISPER_MODEL)
    
    result = model.transcribe(
        audio_path,
        fp16=WHISPER_FP16,
        verbose=False
    )
    
    base_name = os.path.basename(audio_path).replace('.mp3', '')
    transcript_path = os.path.join(TRANSCRIPT_DIR, f"{base_name}_transcript.txt")
    
    with open(transcript_path, 'w') as f:
        f.write(result["text"])
    
    transcript_detailed_path = transcript_path.replace('.txt', '_detailed.txt')
    with open(transcript_detailed_path, 'w') as f:
        for segment in result["segments"]:
            timestamp = f"[{int(segment['start']//60):02d}:{int(segment['start']%60):02d}]"
            f.write(f"{timestamp} {segment['text']}\n")
    
    print(f"✅ Transcribed to: {transcript_path}")
    print(f"✅ Detailed transcript: {transcript_detailed_path}")
    
    return transcript_path, transcript_detailed_path

def summarize_with_ollama(transcript_path, detailed_transcript_path, video_title="Unknown Podcast"):
    """Use Ollama to summarize transcript. Returns summary text."""
    print(f"🤖 Generating summary with Ollama...")
    
    with open(transcript_path, 'r') as f:
        transcript = f.read()
    
    with open(detailed_transcript_path, 'r') as f:
        detailed_transcript = f.read()
    
    # Prompt for Ollama
    prompt = f"""You are creating a comprehensive, in-depth summary of a podcast episode. The goal is to extract maximum learning and value from this long-form content for someone who didn't listen to the full episode.

TRANSCRIPT:
{transcript}

DETAILED TRANSCRIPT WITH TIMESTAMPS:
{detailed_transcript[:10000]}
(Timestamps continue throughout full episode)

The podcast title is: "{video_title}"

Please provide a thorough, detailed summary with the following sections:

1. EPISODE INFORMATION:
   - Podcast name (if identifiable)
   - Episode title (if available)
   - Guest name(s) and their background/credentials
   - Host name (if identifiable)
   - Episode length/duration

2. EXECUTIVE SUMMARY (3-5 sentences):
   Concise overview of what this episode covers and why it matters.

3. KEY TOPICS & INSIGHTS (10-15 detailed points):
   Break down the main topics discussed with substantial detail for each.
   Don't just list topics - explain the key insights, arguments, and takeaways.
   Include specific examples, data points, or stories mentioned.
   Use sub-bullets for complex topics.

4. BEST QUOTES & MOMENTS (5-8 with timestamps):
   Powerful, insightful, or memorable quotes that capture key ideas.
   Format: [MM:SS] "Quote here" - Brief context of why this matters

5. DEEP DIVES (3-5 sections):
   For the most important topics, provide deeper explanation:
   - What was the main argument or insight?
   - What evidence or examples were provided?
   - What are the implications or applications?
   - Any counterpoints or nuances mentioned?

6. ACTIONABLE TAKEAWAYS (5-7 items):
   Specific things the listener can learn, do, or think about differently.
   Focus on practical applications and mental models.

7. NOTABLE MENTIONS:
   - Books, articles, or resources referenced
   - People or companies mentioned
   - Frameworks or concepts discussed

8. DISCUSSION HIGHLIGHTS:
   Any particularly interesting debates, disagreements, or surprising moments.

IMPORTANT GUIDELINES:
- Be comprehensive and detailed - err on the side of too much information rather than too little
- Explain concepts clearly as if teaching someone who's unfamiliar with the topic
- Include specific examples, numbers, and details when mentioned
- Maintain the narrative flow and connections between ideas
- Use clear section headers and formatting
- Always identify the guest(s) and their credentials/background
- Always identify the podcast name if possible from context

This summary should allow someone to gain 80% of the value from the podcast without listening to it.
"""

    response = ollama.chat(
        model=OLLAMA_MODEL,
        messages=[{
            'role': 'user',
            'content': prompt
        }]
    )
    
    summary = response['message']['content']
    
    base_name = os.path.basename(transcript_path).replace('_transcript.txt', '')
    summary_path = os.path.join(SUMMARY_DIR, f"{base_name}_summary.txt")
    
    with open(summary_path, 'w') as f:
        f.write(f"PODCAST SUMMARY\n")
        f.write(f"Title: {video_title}\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"="*60 + "\n\n")
        f.write(summary)
    
    print(f"✅ Summary saved to: {summary_path}")
    
    return summary_path, summary

def post_to_slack(summary_text, youtube_url, summary_path):
    """Post summary to Slack #podcastsummary channel with formatted sections."""
    
    lines = summary_text.split('\n')
    
    # Extract new sections
    episode_info = ""
    overview = ""
    key_topics = []
    best_quotes = []
    takeaways = []
    
    current_section = None
    
    for line in lines:
        line = line.strip()
        
        # Detect sections
        if 'EPISODE INFORMATION' in line.upper():
            current_section = 'episode'
        elif 'EXECUTIVE SUMMARY' in line.upper():
            current_section = 'overview'
        elif 'KEY TOPICS' in line.upper() or 'INSIGHTS' in line.upper():
            current_section = 'key_topics'
        elif 'BEST QUOTES' in line.upper() or 'MOMENTS' in line.upper():
            current_section = 'quotes'
        elif 'ACTIONABLE' in line.upper() or 'TAKEAWAYS' in line.upper():
            current_section = 'takeaways'
        elif 'NOTABLE MENTIONS' in line.upper():
            current_section = 'mentions'
        elif 'DEEP DIVES' in line.upper():
            current_section = 'dives'
        elif 'DISCUSSION HIGHLIGHTS' in line.upper():
            current_section = 'highlights'
        elif line.startswith('**') and ':' in line:
            # Skip section headers that are bold
            continue
        elif line.startswith('-') or line.startswith('•') or line.startswith('*'):
            if current_section == 'key_topics':
                key_topics.append(line)
            elif current_section == 'quotes':
                best_quotes.append(line)
            elif current_section == 'takeaways':
                takeaways.append(line)
        elif current_section == 'overview' and line:
            overview += line + " "
        elif current_section == 'episode' and line:
            episode_info += line + " "
    
    overview = overview.strip()
    episode_info = episode_info.strip()
    
    # Build Slack message
    slack_message = f"""🎧 *Podcast Summary Complete*

🔗 *Source:* {youtube_url}

📋 *Episode Info:*
{episode_info[:300] if episode_info else 'See full summary for details'}

📝 *Executive Summary:*
{overview[:500] if overview else 'See full summary for details'}

💡 *Key Topics:*
{chr(10).join(key_topics[:8]) if key_topics else 'See full summary'}

💬 *Best Quotes:*
{chr(10).join(best_quotes[:4]) if best_quotes else 'See full summary'}

✅ *Actionable Takeaways:*
{chr(10).join(takeaways[:4]) if takeaways else 'See full summary'}

📄 *Full summary:* `{summary_path}`
"""
    
    # Save formatted message to temp file for Slack poster
    temp_msg = "/tmp/podcast_summary_slack.txt"
    with open(temp_msg, 'w') as f:
        f.write(slack_message)
    
    # Post to Slack
    try:
        subprocess.run(["node", SLACK_POSTER], check=True, capture_output=True)
        print("✅ Posted to #podcastsummary")
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Slack post failed: {e.stderr.decode() if e.stderr else e}")
    
    return slack_message

def send_to_slack(summary, summary_path, youtube_url=""):
    """Legacy wrapper - now uses post_to_slack with YouTube URL."""
    return post_to_slack(summary, youtube_url, summary_path)

def process_podcast(youtube_url):
    """Complete workflow: download → transcribe → summarize"""
    print(f"\n{'='*60}")
    print(f"PODCAST SUMMARIZATION STARTING")
    print(f"{'='*60}\n")
    
    start_time = datetime.now()
    podcast_id = None
    
    if DB_AVAILABLE:
        podcast_id = add_podcast(youtube_url, status='processing')
        if podcast_id:
            update_podcast_status(podcast_id, 'processing', processing_started=start_time)
    
    try:
        audio_path, video_title = download_audio(youtube_url)
        if not audio_path:
            if podcast_id:
                update_podcast_status(podcast_id, 'failed', error_message='Download failed')
            return False
        
        transcript_path, detailed_path = transcribe_audio(audio_path)
        if not transcript_path:
            if podcast_id:
                update_podcast_status(podcast_id, 'failed', error_message='Transcription failed')
            return False
        
        summary_path, summary = summarize_with_ollama(transcript_path, detailed_path, video_title)
        if not summary_path:
            if podcast_id:
                update_podcast_status(podcast_id, 'failed', error_message='Summarization failed')
            return False
        
        # Note: Slack posting handled by separate deploy script
        # post_to_slack(summary, youtube_url, summary_path)
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        if podcast_id:
            update_podcast_status(
                podcast_id,
                'completed',
                processing_completed=end_time,
                processing_time_seconds=int(processing_time),
                audio_path=audio_path,
                transcript_path=transcript_path,
                summary_path=summary_path,
                model_used=WHISPER_MODEL
            )
        
        print(f"\n{'='*60}")
        print(f"✅ COMPLETE!")
        print(f"Summary: {summary_path}")
        print(f"{'='*60}\n")
        
        # Cleanup audio file after successful processing
        try:
            if os.path.exists(audio_path):
                os.remove(audio_path)
                print(f"✅ Cleaned up audio: {audio_path}")
        except Exception as e:
            print(f"⚠️ Cleanup warning: {e}")
        
        return True
    
    except Exception as e:
        if podcast_id:
            update_podcast_status(podcast_id, 'failed', error_message=str(e))
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 summarize_podcast.py [YOUTUBE_URL]")
        print("Example: python3 summarize_podcast.py https://www.youtube.com/watch?v=...")
        sys.exit(1)
    
    youtube_url = sys.argv[1]
    process_podcast(youtube_url)
