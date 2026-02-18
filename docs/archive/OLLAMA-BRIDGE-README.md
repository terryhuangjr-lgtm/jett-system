# LLM Bridge - Quick Reference

## What Just Happened

✅ **Ollama is now integrated with Jett!**

Smart routing system connects Ollama (local) with Claude API, with automatic fallback.

---

## How It Works

Every message Jett receives now goes through the LLM Bridge:

```
Message → Analyze → Route → Response

Simple tasks (70%):
├─ Try Ollama (free, fast)
└─ Fallback to Claude if needed

Complex tasks (30%):
└─ Claude API (best quality)
```

---

## Current Status

**✅ Integration:** Complete and active
**⚠️  Ollama:** Not enough RAM (need 1.3GB, have 933MB)
**✅ Fallback:** Working - all messages go to Claude for now
**💰 Savings:** Will activate when RAM available

---

## Commands

### Test Bridge:
```bash
cd ~/clawd
node llm-bridge.js "What is 2+2?" test
```

### Check Ollama Status:
```bash
systemctl status ollama
free -h
```

### View Usage Logs:
```bash
cat /tmp/llm-usage.jsonl | tail -10
```

### Restart Slack Bridge:
```bash
cd ~/clawd
./stop-slack-bridge.sh && ./start-slack-bridge.sh
```

### Monitor Logs:
```bash
tail -f ~/clawd/slack-bridge.log
```

Look for:
- `🔍 Analyzing message complexity...`
- `🟢 Routing to Ollama...` (when RAM available)
- `🔵 Routing to Claude API...` (current default)

---

## When Ollama Will Work

**Need:** 1.5GB+ free RAM

**Check:**
```bash
free -h
```

**Free up memory:**
```bash
# Stop heavy services
# Close applications
# Restart system
```

**Test Ollama:**
```bash
curl -X POST http://localhost:11434/api/generate -d '{
  "model":"llama3.2:1b",
  "prompt":"Test",
  "stream":false
}'
```

When this works, bridge will automatically use Ollama!

---

## Expected Benefits (When Ollama Active)

**Speed:**
- Simple tasks: 3-5x faster (200-500ms vs 1-2s)

**Cost:**
- 70% reduction ($13.50/mo → $4.05/mo)
- ~$113/year savings

**Quality:**
- Simple tasks: Same quality (summaries, queries)
- Complex tasks: Best quality (still uses Claude)

---

## Files

```
llm-bridge.js              - Smart routing system
slack-bridge.js            - Updated to use bridge
/tmp/llm-usage.jsonl       - Usage logs
OLLAMA-INTEGRATION-COMPLETE.md - Full docs
```

---

## Troubleshooting

**Bridge not working?**
```bash
tail -50 ~/clawd/slack-bridge.log
```

**Ollama failing?**
```bash
free -h  # Check RAM
systemctl status ollama
```

**Want old behavior?**
Edit slack-bridge.js and revert changes to line 184-241.

---

## Summary

✅ Integration complete
✅ Automatic routing active
✅ Fallback working
⚠️  Waiting for more RAM to activate Ollama
💰 70% savings ready when Ollama active

---

Built: 2026-02-02
Status: Integrated and monitoring
