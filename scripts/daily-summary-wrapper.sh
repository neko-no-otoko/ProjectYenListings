#!/bin/bash
# Daily Summary Wrapper - Runs daily-summary.py and sends output to Telegram
# This wrapper is called by cron at 8am CDT

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin"
export HOME="/Users/openclaw"
export BRAVE_API_KEY="BSArWZ7JE-dYgr_b_eKCo2ZwPG-CmoB"

# Change to workspace
cd "$HOME/.openclaw/workspace" || exit 1

# Generate summary and save to temp file
TEMP_FILE=$(mktemp /tmp/daily-summary.XXXXXX)
python3 "$HOME/.openclaw/scripts/daily-summary.py" > "$TEMP_FILE" 2>&1

# Check if output is valid (not empty, not just whitespace)
if [ ! -s "$TEMP_FILE" ] || [ "$(wc -l < "$TEMP_FILE")" -lt 3 ]; then
    echo "📅 Daily Summary - $(date '+%A, %B %d, %Y')

------------------------------

⚠️ Error generating summary

Please check the logs." > "$TEMP_FILE"
fi

# Read the file and send via openclaw
MSG=$(cat "$TEMP_FILE")
openclaw message send --channel telegram --target telegram:774395313 -m "$MSG"

# Cleanup
rm -f "$TEMP_FILE"

exit 0