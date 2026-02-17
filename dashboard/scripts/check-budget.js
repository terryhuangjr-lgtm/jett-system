#!/usr/bin/env node
/**
 * Budget Alert System
 * Checks current spend against budgets and sends Slack alerts
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { getSecret } = require('../../lib/secrets-manager');

const dataPath = path.join(__dirname, '../data/token-usage.json');
const configPath = path.join(__dirname, '../config.json');
const SLACK_BOT_TOKEN = getSecret('SLACK_BOT_TOKEN');
const TERRY_DM_CHANNEL = 'D0ABJUX8KFZ';

// Load data
function loadData() {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { data, config };
}

// Calculate spend for time period
function calculateSpend(entries, daysAgo) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysAgo);

    return entries
        .filter(e => new Date(e.timestamp) >= cutoff)
        .reduce((sum, e) => sum + e.cost.total, 0);
}

// Send Slack message
async function sendSlackAlert(message) {
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

// Check budgets
async function checkBudgets() {
    const { data, config } = loadData();

    if (!config.alerts.enabled) {
        console.log('Alerts disabled in config');
        return;
    }

    const entries = data.entries;

    // Calculate spend
    const dailySpend = calculateSpend(entries, 1);
    const weeklySpend = calculateSpend(entries, 7);
    const monthlySpend = calculateSpend(entries, 30);

    // Check thresholds
    const alerts = [];

    // Daily
    const dailyPct = dailySpend / config.budgets.daily;
    if (dailyPct >= config.alerts.thresholds[2]) {
        alerts.push({
            period: 'daily',
            spend: dailySpend,
            budget: config.budgets.daily,
            pct: dailyPct,
            severity: 'critical'
        });
    } else if (dailyPct >= config.alerts.thresholds[1]) {
        alerts.push({
            period: 'daily',
            spend: dailySpend,
            budget: config.budgets.daily,
            pct: dailyPct,
            severity: 'warning'
        });
    } else if (dailyPct >= config.alerts.thresholds[0]) {
        alerts.push({
            period: 'daily',
            spend: dailySpend,
            budget: config.budgets.daily,
            pct: dailyPct,
            severity: 'info'
        });
    }

    // Weekly
    const weeklyPct = weeklySpend / config.budgets.weekly;
    if (weeklyPct >= config.alerts.thresholds[2]) {
        alerts.push({
            period: 'weekly',
            spend: weeklySpend,
            budget: config.budgets.weekly,
            pct: weeklyPct,
            severity: 'critical'
        });
    } else if (weeklyPct >= config.alerts.thresholds[1]) {
        alerts.push({
            period: 'weekly',
            spend: weeklySpend,
            budget: config.budgets.weekly,
            pct: weeklyPct,
            severity: 'warning'
        });
    }

    // Monthly
    const monthlyPct = monthlySpend / config.budgets.monthly;
    if (monthlyPct >= config.alerts.thresholds[2]) {
        alerts.push({
            period: 'monthly',
            spend: monthlySpend,
            budget: config.budgets.monthly,
            pct: monthlyPct,
            severity: 'critical'
        });
    } else if (monthlyPct >= config.alerts.thresholds[1]) {
        alerts.push({
            period: 'monthly',
            spend: monthlySpend,
            budget: config.budgets.monthly,
            pct: monthlyPct,
            severity: 'warning'
        });
    }

    // Send alerts
    for (const alert of alerts) {
        const emoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
        const message = `${emoji} *BUDGET ALERT*

${alert.period.toUpperCase()} spend: $${alert.spend.toFixed(2)} / $${alert.budget.toFixed(2)} (${(alert.pct * 100).toFixed(0)}%)

Current pace:
• Daily avg: $${(dailySpend).toFixed(2)}
• Weekly pace: $${(weeklySpend).toFixed(2)}
• Monthly pace: $${(monthlySpend).toFixed(2)}

Action: ${alert.severity === 'critical' ? 'Review high-cost projects immediately' : 'Monitor usage closely'}`;

        try {
            await sendSlackAlert(message);
            console.log(`✅ Alert sent: ${alert.period} ${(alert.pct * 100).toFixed(0)}%`);
        } catch (error) {
            console.error(`❌ Failed to send alert:`, error.message);
        }
    }

    if (alerts.length === 0) {
        console.log('✅ All budgets OK');
        console.log(`Daily: $${dailySpend.toFixed(2)} / $${config.budgets.daily} (${(dailyPct * 100).toFixed(0)}%)`);
        console.log(`Weekly: $${weeklySpend.toFixed(2)} / $${config.budgets.weekly} (${(weeklyPct * 100).toFixed(0)}%)`);
        console.log(`Monthly: $${monthlySpend.toFixed(2)} / $${config.budgets.monthly} (${(monthlyPct * 100).toFixed(0)}%)`);
    }
}

// Run
checkBudgets().catch(error => {
    console.error('Error checking budgets:', error);
    process.exit(1);
});
