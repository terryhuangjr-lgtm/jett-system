import requests
import json
from datetime import datetime

class SlackNotifier:
    """
    Sends formatted betting reports to Slack
    """

    def __init__(self, webhook_url):
        self.webhook_url = webhook_url

    def send_daily_report(self, daily_pick, other_bets, stats):
        """
        Send complete daily betting report

        Args:
            daily_pick: Featured recommendation (or None)
            other_bets: List of alternative recommendations
            stats: Dict with season_record, recent_form
        """
        if not daily_pick:
            self._send_no_picks_message()
            return

        message = self._build_daily_message(daily_pick, other_bets, stats)
        self._send_to_slack(message)

    def _build_daily_message(self, pick, others, stats):
        """Create beautifully formatted Slack message"""

        blocks = []

        # Header
        blocks.append({
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "🏀 Daily Betting Analysis",
                "emoji": True
            }
        })

        # Date and season stats
        date_str = datetime.now().strftime('%A, %B %d, %Y')
        blocks.append({
            "type": "context",
            "elements": [{
                "type": "mrkdwn",
                "text": f"📅 {date_str} | Season: {stats.get('season_record', 'N/A')} | Recent: {stats.get('recent_form', 'N/A')}"
            }]
        })

        blocks.append({"type": "divider"})

        # Daily pick header
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*🌟 DAILY PICK*"
            }
        })

        # Game info
        game_text = f"*{pick['away_team']} @ {pick['home_team']}*\n⏰ {pick['game_time']}"
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": game_text
            }
        })

        # Bet details
        # Get book line from analysis if available
        book_line = ""
        if 'analysis' in pick and pick['analysis']:
            comp = pick['analysis'].get('composite', {})
            book_spread = comp.get('book_spread', 0)
            if book_spread:
                home_team = pick['home_team']
                if book_spread < 0:
                    book_line = f"\n📊 Book: {home_team} {book_spread:+.1f}"
                elif book_spread > 0:
                    book_line = f"\n📊 Book: {home_team} +{book_spread:.1f}"
                else:
                    book_line = f"\n📊 Book: Pick'em"

        conf_emoji = self._confidence_emoji(pick['confidence'])
        bet_details = (
            f"🎯 *BET: {pick['bet_selection']}*{book_line}\n\n"
            f"{conf_emoji} Confidence: *{pick['confidence']:.1f}/10*\n"
            f"💰 Expected Value: *+{pick['expected_value']:.1f}%*\n"
            f"⚠️ Risk: *{pick['risk_level'].title()}*\n"
            f"💵 Suggested Bet: *${pick['recommended_bet']:.2f}*"
        )
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": bet_details
            }
        })

        # Reasoning
        reasoning_text = "*Why This Bet:*\n"
        for reason in pick['reasoning'][:3]:
            reasoning_text += f"✅ {reason}\n"

        if pick['concerns'] and pick['concerns'][0] != "No major concerns":
            reasoning_text += "\n*Watch Out:*\n"
            for concern in pick['concerns'][:2]:
                reasoning_text += f"⚠️ {concern}\n"

        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": reasoning_text
            }
        })

        # Other bets section
        if others:
            blocks.append({"type": "divider"})
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*📋 Other Good Bets*"
                }
            })

            for i, bet in enumerate(others[:3], 2):
                # Get book line for this bet
                book_line = ""
                if 'analysis' in bet and bet['analysis']:
                    comp = bet['analysis'].get('composite', {})
                    book_spread = comp.get('book_spread', 0)
                    if book_spread:
                        home = bet['home_team']
                        if book_spread < 0:
                            book_line = f" ({home} {book_spread:+.1f})"
                        elif book_spread > 0:
                            book_line = f" ({home} +{book_spread:.1f})"
                        else:
                            book_line = " (Pick'em)"

                other_text = (
                    f"*{i}. {bet['away_team']} @ {bet['home_team']}*\n"
                    f"   🎯 {bet['bet_selection']}{book_line}\n"
                    f"   {self._confidence_emoji(bet['confidence'])} Confidence: {bet['confidence']:.1f}/10"
                )
                blocks.append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": other_text
                    }
                })

        # Footer
        blocks.append({"type": "divider"})
        blocks.append({
            "type": "context",
            "elements": [{
                "type": "mrkdwn",
                "text": "💡 Paper trading mode: Track without real money | Review before placing any bets"
            }]
        })

        return {
            "text": "🏀 Daily Betting Analysis",
            "blocks": blocks
        }

    def _send_no_picks_message(self):
        """Send message when no qualifying bets"""
        message = {
            "text": "🏀 Daily Betting Analysis - No Picks",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🏀 Daily Betting Analysis"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*No Strong Bets Today*\n\nAnalyzed all games but none met our criteria.\n\n✅ Better to pass than force a bet!"
                    }
                }
            ]
        }
        self._send_to_slack(message)

    def _confidence_emoji(self, confidence):
        """Get emoji based on confidence level"""
        if confidence >= 9:
            return "🔥🔥🔥"
        elif confidence >= 8:
            return "🔥🔥"
        elif confidence >= 7:
            return "🔥"
        else:
            return "✨"

    def _send_to_slack(self, message):
        """POST message to Slack webhook"""
        try:
            response = requests.post(
                self.webhook_url,
                data=json.dumps(message),
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code != 200:
                print(f"❌ Slack error: {response.status_code} - {response.text}")
                return False
            else:
                print("✅ Sent to Slack successfully")
                return True

        except Exception as e:
            print(f"❌ Failed to send to Slack: {e}")
            return False

    def send_test_message(self):
        """Send simple test message"""
        message = {
            "text": "🏀 Test Message",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "✅ *Slack integration working!*\n\nYour betting analysis system is connected."
                    }
                }
            ]
        }
        return self._send_to_slack(message)

    def send_error_alert(self, error_message):
        """Send error notification"""
        message = {
            "text": "⚠️ Betting System Error",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "⚠️ System Error"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"```{error_message[:500]}```"
                    }
                }
            ]
        }
        self._send_to_slack(message)
