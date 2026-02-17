#!/usr/bin/env node
/**
 * Secrets Manager - Centralized secret management for Jett
 * Reads from environment variables, with development fallbacks
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env');
const DEFAULT_SECRETS = {
  SLACK_BOT_TOKEN: 'REDACTED_SLACK_BOT_TOKEN',
  SLACK_TEAM_ID: 'T0ABY3NMR2A',
  CLAWDBOT_TOKEN: '5a5132b80dedcc723bec68c13679992b6eaadc7fa848b7af',
  BRAVE_API_KEY: 'BSA42Y7KAuT2JbIsWjI1CUkm57PTxfi'
};

class SecretsManager {
  constructor() {
    this.secrets = this.load();
  }

  load() {
    const secrets = { ...DEFAULT_SECRETS };

    if (fs.existsSync(ENV_FILE)) {
      const content = fs.readFileSync(ENV_FILE, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').trim();
          if (key && value) {
            secrets[key.trim()] = value;
          }
        }
      });
    }

    Object.keys(secrets).forEach(key => {
      const envValue = process.env[key];
      if (envValue) {
        secrets[key] = envValue;
      }
    });

    return secrets;
  }

  get(key) {
    return this.secrets[key] || null;
  }

  getAll() {
    return { ...this.secrets };
  }

  validate() {
    const issues = [];
    const required = ['SLACK_BOT_TOKEN', 'CLAWDBOT_TOKEN'];

    required.forEach(key => {
      if (!this.secrets[key] || this.secrets[key].includes('your-')) {
        issues.push(`Missing or placeholder value for ${key}`);
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

const secrets = new SecretsManager();

module.exports = {
  secrets,
  getSecret: (key) => secrets.get(key),
  getAllSecrets: () => secrets.getAll(),
  validateSecrets: () => secrets.validate()
};

if (require.main === module) {
  const result = secrets.validate();
  if (result.valid) {
    console.log('✅ All secrets configured properly');
  } else {
    console.log('⚠️  Secret issues found:');
    result.issues.forEach(issue => console.log(`  - ${issue}`));
    console.log('\nCopy .env.example to .env and fill in values');
  }
}
