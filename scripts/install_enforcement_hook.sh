#!/bin/bash
#
# Install Research Protocol Enforcement Hook
#
# This script integrates the enforcement system into Clawdbot
# to automatically validate 21M Sports content before sending.
#

set -e

echo "🔧 Installing Research Protocol Enforcement System"
echo "=================================================="
echo ""

# Check if clawdbot config exists
CLAWDBOT_CONFIG="$HOME/.clawdbot/clawdbot.json"

if [ ! -f "$CLAWDBOT_CONFIG" ]; then
  echo "❌ Clawdbot config not found: $CLAWDBOT_CONFIG"
  exit 1
fi

echo "✓ Found clawdbot config"

# Backup config
BACKUP="$CLAWDBOT_CONFIG.backup.$(date +%Y%m%d-%H%M%S)"
cp "$CLAWDBOT_CONFIG" "$BACKUP"
echo "✓ Backed up config to: $BACKUP"

# Check if hook directory exists
HOOK_DIR="$HOME/.clawdbot/hooks"
if [ ! -d "$HOOK_DIR" ]; then
  mkdir -p "$HOOK_DIR"
  echo "✓ Created hooks directory: $HOOK_DIR"
fi

# Copy hook file
HOOK_FILE="$HOOK_DIR/research-protocol-enforcement.js"
if [ -f "$HOOK_FILE" ]; then
  echo "✓ Hook file already exists: $HOOK_FILE"
else
  echo "❌ Hook file not found: $HOOK_FILE"
  echo "   Make sure you created it first"
  exit 1
fi

# Update clawdbot config to enable the hook
echo ""
echo "📝 Updating clawdbot config..."

# Use Node.js to safely modify the JSON config
node << 'EOF'
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.HOME, '.clawdbot', 'clawdbot.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Ensure hooks section exists
if (!config.hooks) {
  config.hooks = {};
}

// Ensure custom hooks array exists
if (!config.hooks.custom) {
  config.hooks.custom = [];
}

// Check if hook is already registered
const hookExists = config.hooks.custom.some(
  hook => hook.name === 'research-protocol-enforcement' ||
          hook.module === './hooks/research-protocol-enforcement.js'
);

if (!hookExists) {
  // Add the enforcement hook
  config.hooks.custom.push({
    enabled: true,
    name: 'research-protocol-enforcement',
    module: './hooks/research-protocol-enforcement.js',
    description: 'Enforces research protocol for 21M Sports content',
    events: ['assistant_message', 'message', 'before_send']
  });

  // Write updated config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✓ Added enforcement hook to config');
} else {
  console.log('✓ Hook already registered in config');
}
EOF

echo ""
echo "✅ Installation complete!"
echo ""
echo "The research protocol enforcement system is now active."
echo ""
echo "📊 System Status:"
echo "  - Enforcement script: ~/clawd/scripts/enforce_research_protocol.js"
echo "  - Clawdbot hook: ~/.clawdbot/hooks/research-protocol-enforcement.js"
echo "  - Hook log: ~/.clawdbot/logs/research-protocol-hook.log"
echo "  - Enforcement log: ~/clawd/memory/protocol-enforcement.jsonl"
echo ""
echo "🔍 Testing:"
echo "  Test enforcement: node ~/clawd/scripts/enforce_research_protocol.js --message '21m sports' --check-only"
echo "  View hook log: tail -f ~/.clawdbot/logs/research-protocol-hook.log"
echo ""
echo "🚨 IMPORTANT:"
echo "  Restart Clawdbot for the hook to take effect:"
echo "  clawdbot restart"
echo ""
