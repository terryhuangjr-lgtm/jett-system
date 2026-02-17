"""
System configuration
"""

# Database
DB_PATH = '/home/clawd/clawd/data/sports_betting.db'

# Slack webhook URL for #sportsbetting channel
# Get this from: https://api.slack.com/messaging/webhooks
# Create webhook, choose #sportsbetting channel, paste URL here
SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

# Betting limits (SAFETY!)
MAX_BET_AMOUNT = 10.0
DAILY_BET_LIMIT = 1
MONTHLY_BUDGET = 200.0

# Model settings
MIN_CONFIDENCE = 7.0
MIN_EXPECTED_VALUE = 3.0

# Enabled sports
ENABLED_SPORTS = 'nba'

# Paper trading mode (no real money)
PAPER_TRADING = True
