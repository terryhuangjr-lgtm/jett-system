# TOOLS.md - How Jett Gets Things Done

## Communication Tools

### Slack (Primary)
```
clawdbot message send --channel slack --target "#channel" --message "text"
clawdbot message send --channel slack --target "U0ABTP704QK" --message "text"
```
- Terry's user ID: U0ABTP704QK
- Key channels: #21msports, #huangfamily, #levelupcards
- Always quote channel targets to prevent # being parsed as a flag
- Use temp file for messages with apostrophes: `clawdbot message send ... --message "$(cat /tmp/msg.txt)"`

### Telegram (Backup/Secondary)
- Enabled and working: @JettAssistant_bot
- Use as backup if Slack has issues
- Allowed users: 5867308866 (Terry)

## APIs and Data Sources

### Anthropic API (OpenClaw managed)
- Config: `/home/clawd/.openclaw/openclaw.json`
- Key location: `/home/clawd/clawd/.env` (ANTHROPIC_API_KEY)
- Also: `~/.claude.json`

**Models:**
- `claude-haiku-4-5` - Default for all operations (fast, low cost)
- `claude-sonnet-4-5` - ONLY for 21M Sports content generation (manually called)
- `anthropic/claude-haiku-4-5` - Full reference in config
- `anthropic/claude-sonnet-4-5` - Full reference in config

**Usage:**
- Haiku: health checks, simple formatting, routing, daily ops
- Sonnet: tweet generation, research synthesis (21M only)

### Ollama (Local Models)
- Endpoint: http://localhost:11434
- Models available:
  - `llama3.1:8b` - Research tasks only (subagent fallback)
  - `nomic-embed-text` - Memory search embeddings
  - `minimax-m2.5:cloud` - Cloud-hosted MiniMax

### CoinGecko API (Free, no key)
- BTC price: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`
- Use for: tweet generation BTC price, content bank calculations

### eBay Scanner
- Config: `/home/clawd/clawd/ebay-scanner/`
- Run: `node run-from-config.js [day]`
- Results post to #levelupcards

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
2. Report back via Slack DM when done
3. No destructive operations
4. Read CLAUDE.md first
5. Set timeout - don't run indefinitely

**Default model:** `anthropic/claude-haiku-4-5`
**Fallback:** `ollama/llama3.1:8b`

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
