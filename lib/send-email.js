#!/usr/bin/env node
/**
 * Jett Email Sender via GWS (Gmail)
 * Usage: node lib/send-email.js --to "recipient@email.com" --subject "Subject" --body "Message"
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
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

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const to = getArg('--to');
const subject = getArg('--subject') || 'No Subject';
const body = getArg('--body') || getArg('--message') || '';
const isHtml = args.includes('--html');

if (!to) {
  console.error('Usage: node lib/send-email.js --to "email@domain.com" --subject "Subject" --body "Message" [--html]');
  process.exit(1);
}

const contentType = isHtml ? 'text/html; charset=UTF-8' : 'text/plain; charset=UTF-8';
const rawEmail = isHtml 
  ? `To: ${to}\nSubject: ${subject}\nContent-Type: ${contentType}\n\n${body}`
  : `To: ${to}\nSubject: ${subject}\n\n${body}`;
const base64Email = Buffer.from(rawEmail).toString('base64');

const payload = JSON.stringify({ raw: base64Email });
const params = JSON.stringify({ userId: 'me' });

try {
  execFileSync('gws', ['gmail', 'users', 'messages', 'send', '--params', params, '--json', payload], {
    timeout: 30000,
    stdio: 'pipe'
  });
  console.log('✅ Email sent successfully to', to);
} catch (err) {
  console.error('Failed to send email:', err.message);
  if (err.stdout) console.error('stdout:', err.stdout.toString());
  if (err.stderr) console.error('stderr:', err.stderr.toString());
  process.exit(1);
}
