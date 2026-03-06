#!/usr/bin/env node
/**
 * Jett Email Sender via AgentMail
 * Usage: node lib/send-email.js --to "recipient@email.com" --subject "Subject" --body "Message"
 */

// Load .env if exists
const fs = require('fs');
const envPath = require('path').join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && !process.env[key]) {
        process.env[key] = valueParts.join('=').trim();
      }
    }
  });
}

const API_KEY = process.env.AGENTMAIL_API_KEY;
const INBOX_ID = process.env.AGENTMAIL_INBOX || 'jett@agentmail.to';

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const to = getArg('--to');
const subject = getArg('--subject') || 'No Subject';
const body = getArg('--body') || getArg('--message') || '';

if (!to) {
  console.error('Usage: node lib/send-email.js --to "email@domain.com" --subject "Subject" --body "Message"');
  process.exit(1);
}

// Create raw email (base64 encoded)
const rawEmail = `To: ${to}
Subject: ${subject}

${body}`;

const base64Email = Buffer.from(rawEmail).toString('base64url');

fetch(`https://api.agentmail.to/v0/inboxes/${INBOX_ID}/messages/send`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: [to],
    subject: subject,
    text: body
  })
})
.then(res => res.json())
.then(data => {
  if (data.error) {
    console.error('Error:', data.error);
    process.exit(1);
  }
  console.log('✅ Email sent successfully!');
  console.log('Message ID:', data.message_id || data.id);
})
.catch(err => {
  console.error('Failed to send:', err.message);
  process.exit(1);
});
