#!/usr/bin/env python3
"""
Daily Summary Script - Runs at 8am CDT
Sends daily brief to Telegram with:
- Overnight task completions
- Weather for White Bear Lake, MN
- News summaries (content creators, video games, Microsoft Intune)
- Today's planned tasks
"""

import os
import sys
import subprocess
import json
import re
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path

# Add script path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import get_db

# Configuration
LOCATION = "White Bear Lake, MN"
TIMEZONE = "America/Chicago"
BRAVE_API_KEY = "BSArWZ7JE-dYgr_b_eKCo2ZwPG-CmoB"

NEWS_TOPICS = [
    ("content creators streamers", "🎥 Content Creators/Streamers"),
    ("video games gaming news", "🎮 Video Games"),
    ("Microsoft Intune", "💻 Microsoft Intune")
]

def run_shell(cmd, timeout=15):
    """Run shell command and return output."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return result.stdout.strip() if result.returncode == 0 else f"Error: {result.stderr}"
    except subprocess.TimeoutExpired:
        return "Error: Request timed out"
    except Exception as e:
        return f"Error: {e}"

def get_weather():
    """Get weather forecast for White Bear Lake, MN."""
    # Current conditions
    current = run_shell('curl -s --max-time 10 "wttr.in/White+Bear+Lake,+MN?format=%l:+%c+%t+(feels+like+%f),+%w+wind,+%h+humidity"')
    
    # 3-day forecast (condensed)
    forecast = run_shell('curl -s --max-time 10 "wttr.in/White+Bear+Lake,+MN?format=4"')
    
    return {
        "current": current,
        "forecast": forecast
    }

import time

def brave_search_news(query, count=3):
    """Search for news using Brave Search API."""
    try:
        # Small delay to avoid rate limits (Brave API: 1 req/sec for free tier)
        time.sleep(1.2)
        
        # Build URL
        encoded_query = urllib.parse.quote(query)
        url = f"https://api.search.brave.com/res/v1/news/search?q={encoded_query}&count={count}&search_lang=en"
        
        # Make request
        req = urllib.request.Request(url)
        req.add_header("Accept", "application/json")
        req.add_header("X-Subscription-Token", BRAVE_API_KEY)
        
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        results = []
        for item in data.get('results', [])[:count]:
            results.append({
                'title': item.get('title', 'No title'),
                'url': item.get('url', ''),
                'description': item.get('description', '')[:120] + '...' if len(item.get('description', '')) > 120 else item.get('description', ''),
                'date': item.get('age', '')
            })
        
        return results
        
    except urllib.error.HTTPError as e:
        if e.code == 429:
            return [{"title": "Rate limit hit — try again later", "url": "", "description": "", "date": ""}]
        return [{"title": f"HTTP Error {e.code}", "url": "", "description": "", "date": ""}]
    except Exception as e:
        return [{"title": f"Error: {str(e)[:50]}", "url": "", "description": "", "date": ""}]

def get_news_brief():
    """Get news brief for all configured topics."""
    brief = []
    
    for topic_query, display_name in NEWS_TOPICS:
        brief.append(f"*{display_name}*")
        
        # Get news for this topic (1 article to save API calls)
        articles = brave_search_news(topic_query, count=1)
        
        if articles:
            for article in articles:
                title = article.get('title', 'No title')
                url = article.get('url', '')
                desc = article.get('description', '')
                date = article.get('date', '')
                
                # Format: Title — Date
                # Description (if available)
                line = f"• {title}"
                if date:
                    line += f" — _{date}_"
                brief.append(line)
                
                if desc:
                    brief.append(f"  _{desc[:100]}..._")
        else:
            brief.append("• No recent news found")
        
        brief.append("")  # Empty line between topics
    
    return '\n'.join(brief)

def get_overnight_completions():
    """Get tasks completed during overnight/quiet hours (yesterday 6pm to today 8am)."""
    db = get_db()
    
    # Calculate time windows
    now = datetime.now()
    yesterday_6pm = now.replace(hour=18, minute=0, second=0, microsecond=0) - timedelta(days=1)
    today_8am = now.replace(hour=8, minute=0, second=0, microsecond=0)
    
    # If it's not yet 8am, adjust today_8am to be yesterday
    if now.hour < 8:
        yesterday_6pm = (now - timedelta(days=2)).replace(hour=18, minute=0, second=0, microsecond=0)
        today_8am = (now - timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
    
    # Query for tasks completed in the overnight window
    query = """
        SELECT * FROM tasks 
        WHERE status = 'done' 
        AND completed_at >= ?
        AND completed_at <= ?
        ORDER BY completed_at DESC
    """
    
    results = db._run_query(query, (yesterday_6pm.isoformat(), today_8am.isoformat()), fetch=True)
    return results or []

def get_todays_tasks():
    """Get tasks planned for today."""
    db = get_db()
    
    # Get tasks in 'today' section
    query = """
        SELECT * FROM tasks 
        WHERE status IN ('pending', 'in_progress')
        AND section = 'today'
        ORDER BY priority ASC, created_at DESC
    """
    
    results = db._run_query(query, fetch=True)
    return results or []

def get_recent_completions(days=1):
    """Get tasks completed in the last N days as fallback."""
    db = get_db()
    
    query = """
        SELECT * FROM tasks 
        WHERE status = 'done' 
        AND completed_at > CURRENT_TIMESTAMP - INTERVAL '? days'
        ORDER BY completed_at DESC
        LIMIT 10
    """
    
    results = db._run_query(query, (days,), fetch=True)
    return results or []

def format_task(task):
    """Format a single task for display."""
    title = task.get('title', 'Untitled')
    priority = task.get('priority', 3)
    task_id = str(task.get('id', ''))[:8]
    
    priority_emoji = {1: '🔴', 2: '🟠', 3: '🟡', 4: '🟢', 5: '⚪'}.get(priority, '🟡')
    
    return f"{priority_emoji} {title}"

def format_completed_task(task):
    """Format a completed task for display."""
    title = task.get('title', 'Untitled')
    completed_at = task.get('completed_at', '')
    if completed_at:
        # Format time nicely
        try:
            dt = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
            time_str = dt.strftime("%I:%M %p")
        except:
            time_str = completed_at[:16]
    else:
        time_str = "unknown time"
    
    return f"✅ {title} - {time_str}"

def generate_summary():
    """Generate the full daily summary."""
    lines = []
    
    # Header
    now = datetime.now()
    date_str = now.strftime("%A, %B %d, %Y")
    lines.append(f"📅 *Daily Summary - {date_str}*")
    lines.append("")
    lines.append("-" * 30)
    lines.append("")
    
    # Overnight completions
    lines.append("🌙 *Overnight Completions*")
    overnight = get_overnight_completions()
    
    if not overnight:
        # Fallback to recent completions
        recent = get_recent_completions(days=1)
        if recent:
            lines.append("Tasks completed recently:")
            for task in recent[:5]:
                lines.append(format_completed_task(task))
        else:
            lines.append("No tasks completed overnight.")
    else:
        for task in overnight:
            lines.append(format_completed_task(task))
    
    lines.append("")
    lines.append("-" * 30)
    lines.append("")
    
    # Weather
    lines.append("☔ *Weather - White Bear Lake, MN*")
    weather = get_weather()
    lines.append(f"Current: {weather['current']}")
    lines.append("")
    
    # Add forecast (cleaned up)
    forecast_lines = weather['forecast'].split('\n')
    for line in forecast_lines[:10]:  # First 10 lines
        if line.strip() and 'Weather' not in line:
            lines.append(line)
    
    lines.append("")
    lines.append("-" * 30)
    lines.append("")
    
    # News summaries
    lines.append("📰 *News Brief*")
    lines.append("")
    lines.append(get_news_brief())
    
    lines.append("")
    lines.append("-" * 30)
    lines.append("")
    
    # Today's tasks
    lines.append("📋 *Today's Tasks*")
    todays = get_todays_tasks()
    
    if not todays:
        lines.append("No tasks scheduled for today.")
    else:
        for task in todays:
            lines.append(format_task(task))
    
    # Pending count
    db = get_db()
    pending = db._run_query(
        "SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'in_progress')",
        fetch=True
    )
    if pending:
        lines.append("")
        lines.append(f"📊 *Total pending: {pending[0]['count']}*")
    
    return '\n'.join(lines)

def main():
    """Main entry point."""
    summary = generate_summary()
    
    # Output the summary (will be captured by wrapper script)
    print(summary)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())