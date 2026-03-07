# TOOLS.md - How Jett Gets Things Done

## Communication Tools

### Telegram (Primary)
```
clawdbot message send --channel telegram --target "5867308866" --message "text"
```
- Terry's chat ID: 5867308866
- Used for: system alerts, failures, morning brief, direct messages

### Slack (DEPRECATED - Being Removed)
- All Slack posting disabled as of 2026-03-06
- See: `docs/MIGRATION-ROADMAP.md`

## APIs and Data Sources

### Anthropic API (OpenClaw managed)
- Config: `/home/clawd/.openclaw/openclaw.json`
- Key location: `/home/clawd/clawd/.env` (ANTHROPIC_API_KEY)
- Also: `~/.claude.json`

### Anthropic API (Legacy - Sonnet only)
- Config: `/home/clawd/.openclaw/openclaw.json`

**Models:**
- `claude-sonnet-4-5` - ONLY for 21M Sports content generation (manually called)
- `anthropic/claude-sonnet-4-5` - Full reference in config

**Usage:**
- Sonnet: tweet generation, research synthesis (21M only)

### xAI API (Primary - Cheapest)
- Config: `/home/clawd/.openclaw/openclaw.json`
- API Key: Already configured in openclaw.json

**Models:**
- `grok-4-1-fast` - DEFAULT for everything (Slack/Telegram, automation, research, subagents)
- `claude-haiku-4-5` - BACKUP if Grok down
- `claude-sonnet-4-5` - 21M sports content generation only

### Ollama (Memory Search Only)
- Endpoint: http://localhost:11434
- Models available:
  - `nomic-embed-text` - Memory search embeddings
  - `minimax-m2.5:cloud` - Cloud-hosted MiniMax (for embeddings)

**Note:** llama3.1:8b removed. Ollama no longer used for research.

### CoinGecko API (Free, no key)
- BTC price: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`
- Use for: tweet generation BTC price, content bank calculations

### eBay Scanner
- Config: `/home/clawd/clawd/ebay-scanner/`
- Run: `node run-from-config.js [day]`
- Results: Email to terryhuangjr@gmail.com

### Google Workspace (GWS)
- Account: jett.theassistant@gmail.com
- CLI: `gws` (npm package)
- Credentials: `~/.config/gws/credentials.enc`

**Commands:**
```bash
gws auth status                              # Check authentication
gws gmail users messages list                # List emails
gws gmail users messages send --json '...'  # Send email
gws calendar events list --params '...'     # List calendar events
gws drive files list                        # List Drive files
```

**Email Script:**
```bash
node lib/send-email.js --to "email" --subject "Subject" --body "Message"
```

### ESPN
- Sports data via orchestrator.py
- Known issue: occasional timeouts - retry built in

## Subagents

**When to spawn:**
- Multi-step research tasks
- Parallel execution tasks
- Long-running background jobs

**When NOT to:**
- Simple single-step tasks
- Needs Terry confirmation first
- Destructive operations

**How to spawn:**
```
spawn a subagent to [describe task]
```

**Rules:**
1. Give bounded task with clear success criteria
2. Report back via Telegram DM when done
3. No destructive operations
4. Read CLAUDE.md first
5. Set timeout - don't run indefinitely

**Default model:** `xai/grok-4-1-fast`
**Fallback:** `anthropic/claude-haiku-4-5` (if Grok unavailable)

## System Tools

### PM2 (Dashboard Only)
```bash
pm2 list                          # Check status
pm2 restart task-manager-server   # Restart dashboard
pm2 logs task-manager-server --lines 20
```

### Clawdbot Cron (Task Scheduling)
```bash
clawdbot cron list               # See all scheduled tasks
clawdbot cron add --name "Name" --schedule "0 7 * * *" --command "command"
clawdbot cron delete [ID]       # Remove task
```

### Gateway
```bash
# Check status
pgrep -f 'openclaw-gateway'

# Restart
clawdbot gateway --force

# Health
curl -s localhost:18789/health
```

### Health Dashboard
- URL: http://localhost:3000
- API: http://localhost:3000/api/health

### System Cron (Watchdog Only)
```bash
crontab -l  # Should only have gateway watchdog + Ollama startup
```

### Config Protection
```bash
# Before running openclaw commands that modify config:
config-protector protect openclaw doctor --fix

# Or manually backup:
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak
```

### Git
- Remote: https://github.com/terryhuangjr-lgtm/jett-system.git
- Pull before changes: `git pull origin master`
- Commit format: `type: description` (fix/feat/docs/chore)

## Network

- **MTU fix:** WSL2 restart requires `sudo ip link set dev eth0 mtu 1350`
- **Check:** `ip link show eth0 | grep mtu` (should be 1350)
- Auto-fix via /etc/wsl.conf on boot

## Memory Search

Enabled March 2026 - semantic search across memory and sessions:
- Provider: Ollama
- Model: nomic-embed-text
- Query: "what did we discuss about [topic]?"

```bash
openclaw memory status  # Check indexing
```

---

*Update this file as new tools are added or configurations change.*
