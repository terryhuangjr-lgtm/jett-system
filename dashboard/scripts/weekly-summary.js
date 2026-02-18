#!/usr/bin/env node
/**
 * Weekly Summary Generator
 * Creates and sends a weekly usage report to Slack
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { getSecret } = require('../../lib/secrets-manager');

const dataPath = path.join(__dirname, '../data/token-usage.json');
const SLACK_BOT_TOKEN = getSecret('SLACK_BOT_TOKEN');
const TERRY_DM_CHANNEL = 'D0ABJUX8KFZ';

// Load data
function loadData() {
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

// Get date range for summary
function getWeekRange() {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 7);

    const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
        start,
        end,
        label: `${formatDate(start)} - ${formatDate(end)}`
    };
}

// Send Slack message
async function sendSlackMessage(message) {
    return new Promise((resolve, reject) => {
        const postData = `channel=${encodeURIComponent(TERRY_DM_CHANNEL)}&text=${encodeURIComponent(message)}`;

        const options = {
            hostname: 'slack.com',
            path: '/api/chat.postMessage',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const result = JSON.parse(body);
                if (result.ok) {
                    resolve(result);
                } else {
                    reject(new Error(result.error));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Generate weekly summary
async function generateSummary() {
    const data = loadData();
    const { start, end, label } = getWeekRange();

    // Filter to this week
    const thisWeek = data.entries.filter(e =>
        new Date(e.timestamp) >= start && new Date(e.timestamp) <= end
    );

    // Filter to last week
    const lastWeekStart = new Date(start);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeek = data.entries.filter(e =>
        new Date(e.timestamp) >= lastWeekStart && new Date(e.timestamp) < start
    );

    // Calculate totals
    const thisWeekCost = thisWeek.reduce((sum, e) => sum + e.cost.total, 0);
    const lastWeekCost = lastWeek.reduce((sum, e) => sum + e.cost.total, 0);
    const change = lastWeekCost > 0 ? ((thisWeekCost - lastWeekCost) / lastWeekCost) * 100 : 0;

    // Project breakdown
    const projectCosts = {};
    thisWeek.forEach(e => {
        const project = e.project || 'unknown';
        projectCosts[project] = (projectCosts[project] || 0) + e.cost.total;
    });
    const topProjects = Object.entries(projectCosts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Agent breakdown
    const agentCosts = {};
    thisWeek.forEach(e => {
        const agent = e.agent;
        agentCosts[agent] = (agentCosts[agent] || 0) + e.cost.total;
    });

    // Daily breakdown
    const dailyCosts = {};
    thisWeek.forEach(e => {
        const date = new Date(e.timestamp).toDateString();
        dailyCosts[date] = (dailyCosts[date] || 0) + e.cost.total;
    });
    const busiestDay = Object.entries(dailyCosts)
        .sort((a, b) => b[1] - a[1])[0];

    // Model breakdown
    const modelCosts = {};
    thisWeek.forEach(e => {
        modelCosts[e.model] = (modelCosts[e.model] || 0) + e.cost.total;
    });

    // Token breakdown
    const tokenTypes = {
        input: thisWeek.reduce((sum, e) => sum + e.tokens.input, 0),
        output: thisWeek.reduce((sum, e) => sum + e.tokens.output, 0),
        cacheRead: thisWeek.reduce((sum, e) => sum + e.tokens.cacheRead, 0),
        cacheWrite: thisWeek.reduce((sum, e) => sum + e.tokens.cacheWrite, 0)
    };

    // Generate insights
    const insights = [];
    if (tokenTypes.cacheWrite > tokenTypes.cacheRead) {
        insights.push('Cache writes > reads - consider optimization');
    }
    if (agentCosts['subagent-grok'] && agentCosts['subagent-grok'] > thisWeekCost * 0.2) {
        insights.push('Grok usage high - review if necessary');
    }
    if (change > 20) {
        insights.push(`Usage increased ${change.toFixed(0)}% - review project activity`);
    }

    // Format message
    const changeEmoji = change > 0 ? '📈' : '📉';
    const changeSign = change > 0 ? '+' : '';

    const message = `📊 *WEEKLY API USAGE SUMMARY* (${label})

💰 *Total Spend:* $${thisWeekCost.toFixed(2)}
${changeEmoji} *Change:* ${changeSign}${change.toFixed(0)}% vs last week

🏆 *Top Projects:*
${topProjects.map(([ project, cost], idx) => {
    const pct = (cost / thisWeekCost * 100).toFixed(0);
    return `${idx + 1}. ${project.replace('-', ' ').toUpperCase()}: $${cost.toFixed(2)} (${pct}%)`;
}).join('\n')}

🤖 *Agent Breakdown:*
${Object.entries(agentCosts).map(([agent, cost]) => {
    const pct = (cost / thisWeekCost * 100).toFixed(0);
    return `• ${agent.toUpperCase()}: $${cost.toFixed(2)} (${pct}%)`;
}).join('\n')}

📱 *Model Usage:*
${Object.entries(modelCosts).map(([model, cost]) => {
    const pct = (cost / thisWeekCost * 100).toFixed(0);
    return `• ${model}: $${cost.toFixed(2)} (${pct}%)`;
}).join('\n')}

🔥 *Busiest Day:* ${new Date(busiestDay[0]).toLocaleDateString('en-US', { weekday: 'long' })} ($${busiestDay[1].toFixed(2)})

🔢 *Token Usage:*
• Input: ${(tokenTypes.input / 1000000).toFixed(2)}M
• Output: ${(tokenTypes.output / 1000000).toFixed(2)}M
• Cache Read: ${(tokenTypes.cacheRead / 1000000).toFixed(2)}M
• Cache Write: ${(tokenTypes.cacheWrite / 1000000).toFixed(2)}M

${insights.length > 0 ? `💡 *Insights:*\n${insights.map(i => `• ${i}`).join('\n')}` : ''}

📊 View full dashboard: file:///home/clawd/clawd/dashboard/public/index.html`;

    try {
        await sendSlackMessage(message);
        console.log('✅ Weekly summary sent to Slack');
    } catch (error) {
        console.error('❌ Failed to send summary:', error.message);
        process.exit(1);
    }
}

// Run
generateSummary().catch(error => {
    console.error('Error generating summary:', error);
    process.exit(1);
});
