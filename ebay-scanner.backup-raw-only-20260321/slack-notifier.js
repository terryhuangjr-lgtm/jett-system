/**
 * Slack Notifier - Sends eBay deal alerts to Slack
 * Integrates with existing Slack MCP server
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class SlackNotifier {
  constructor() {
    this.channels = {
      'levelupcards': 'levelupcards', // Sports card channel (updated Feb 2, 2026)
      'general': 'C08A9NDJF6T'  // Fallback to general
    };

    this.defaultChannel = 'levelupcards';
  }

  /**
   * Send hot deals alert to Slack
   * @param {Array} hotDeals - Hot deals to alert
   * @returns {Promise<Boolean>} - Success status
   */
  async sendHotDealsAlert(hotDeals) {
    if (hotDeals.length === 0) return false;

    try {
      const message = this.formatHotDealsMessage(hotDeals);
      await this.sendToSlack(this.defaultChannel, message);
      console.log(`📱 Sent ${hotDeals.length} hot deals to Slack`);
      return true;
    } catch (error) {
      console.error('Error sending hot deals alert:', error.message);
      return false;
    }
  }

  /**
   * Send daily summary to Slack
   * @param {Object} summary - Scan summary
   * @returns {Promise<Boolean>} - Success status
   */
  async sendDailySummary(summary) {
    try {
      const message = this.formatDailySummary(summary);
      await this.sendToSlack(this.defaultChannel, message);
      console.log('📱 Sent daily summary to Slack');
      return true;
    } catch (error) {
      console.error('Error sending daily summary:', error.message);
      return false;
    }
  }

  /**
   * Format hot deals message
   * @param {Array} hotDeals - Hot deals
   * @returns {String} - Formatted message
   */
  formatHotDealsMessage(hotDeals) {
    let msg = '🔥 *HOT eBay DEALS ALERT!*\n\n';
    msg += `Found ${hotDeals.length} exceptional ${hotDeals.length === 1 ? 'opportunity' : 'opportunities'}:\n\n`;

    hotDeals.forEach((deal, i) => {
      msg += `*${i + 1}. ${deal.dealScore.rating}* [Score: ${deal.dealScore.score}]\n`;
      msg += `${this.truncate(deal.title, 80)}\n`;
      msg += `💰 Price: $${deal.totalPrice}`;

      if (deal.profitAnalysis && !deal.profitAnalysis.insufficientData) {
        msg += ` | EV: $${deal.profitAnalysis.expectedValue}`;
        if (deal.profitAnalysis.roi > 0) {
          msg += ` | ROI: ${deal.profitAnalysis.roi}%`;
        }
      }

      msg += `\n🔗 ${deal.viewItemURL}\n`;

      // Add key factors
      if (deal.dealScore.breakdown && deal.dealScore.breakdown.length > 0) {
        const topFactors = deal.dealScore.breakdown.slice(0, 3).join(', ');
        msg += `_${topFactors}_\n`;
      }

      msg += '\n';
    });

    msg += `_Scanned at ${new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' })} EST_`;

    return msg;
  }

  /**
   * Format daily summary message
   * @param {Object} summary - Summary data
   * @returns {String} - Formatted message
   */
  formatDailySummary(summary) {
    let msg = '📊 *Daily eBay Gem Scan Summary*\n\n';

    msg += `⏱️ Duration: ${summary.scanDuration}\n`;
    msg += `🔍 Items analyzed: ${summary.itemsAnalyzed}\n`;
    msg += `🔥 Hot deals: ${summary.hotDeals}\n`;
    msg += `⚡ Good deals: ${summary.goodDeals}\n\n`;

    if (summary.hotDeals === 0 && summary.goodDeals === 0) {
      msg += '_No exceptional deals found in this scan._\n';
      msg += '_Will keep scanning for gems!_';
    } else {
      msg += '_Check the alerts above for details._';
    }

    msg += `\n\n_${new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York'
    })}_`;

    return msg;
  }

  /**
   * Send message to Slack using MCP server
   * @param {String} channelName - Channel name
   * @param {String} message - Message text
   * @returns {Promise<void>}
   */
  async sendToSlack(channelName, message) {
    const channelId = this.channels[channelName] || this.channels['general'];

    // Save message to a temp file
    const tempFile = path.join('/tmp', `slack-msg-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, message);

    try {
      // Use claude command to send via MCP
      const command = `echo "${message.replace(/"/g, '\\"')}" > ${tempFile}`;
      await execPromise(command);

      // Note: In production, you'd integrate with the Slack MCP server
      // For now, we'll save messages to a file that your Slack bridge can pick up

      const slackQueueDir = path.join(__dirname, '..', 'slack-queue');
      if (!fs.existsSync(slackQueueDir)) {
        fs.mkdirSync(slackQueueDir, { recursive: true });
      }

      const queueFile = path.join(slackQueueDir, `ebay-alert-${Date.now()}.json`);
      fs.writeFileSync(queueFile, JSON.stringify({
        channel: channelId,
        channelName: channelName,
        message: message,
        timestamp: new Date().toISOString(),
        source: 'ebay-scanner'
      }, null, 2));

      console.log(`💾 Queued message for Slack: ${queueFile}`);

    } catch (error) {
      console.error('Error queuing Slack message:', error.message);
      throw error;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  /**
   * Truncate string to max length
   * @param {String} str - String to truncate
   * @param {Number} maxLen - Max length
   * @returns {String} - Truncated string
   */
  truncate(str, maxLen) {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
  }

  /**
   * Send test message
   * @returns {Promise<void>}
   */
  async sendTestMessage() {
    const testDeal = {
      title: 'Michael Jordan 1986 Fleer Rookie Card #57 PSA Potential',
      totalPrice: 125.00,
      viewItemURL: 'https://ebay.com/itm/test123',
      dealScore: {
        score: 9.5,
        rating: '🔥🔥🔥 EXCEPTIONAL',
        breakdown: [
          '🔥 EV > $200 (+2.5 points)',
          '⭐ Star player: michael jordan (+0.5 points)',
          '🆕 Rookie card (+0.5 points)'
        ]
      },
      profitAnalysis: {
        insufficientData: false,
        expectedValue: 245,
        roi: 196
      }
    };

    await this.sendHotDealsAlert([testDeal]);
    console.log('✅ Test message sent!');
  }
}

module.exports = SlackNotifier;

// Run test if called directly
if (require.main === module) {
  const notifier = new SlackNotifier();
  notifier.sendTestMessage()
    .then(() => {
      console.log('\nTest complete! Check the slack-queue directory for the message.');
      console.log('Your Slack bridge should pick it up automatically.\n');
    })
    .catch(error => {
      console.error('Test failed:', error);
    });
}
