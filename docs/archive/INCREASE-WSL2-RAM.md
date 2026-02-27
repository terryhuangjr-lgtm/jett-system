# How to Give WSL2 More RAM (No New Computer Needed!)

## Current Situation

**WSL2 has:** 3.7GB allocated (only 933MB free)
**Ollama needs:** 1.3GB
**Windows likely has:** 8GB+ total RAM

## Solution: Allocate More RAM to WSL2

### Step 1: Create/Edit .wslconfig (in Windows)

Open PowerShell or Command Prompt **in Windows** (not WSL) and run:

```powershell
notepad %UserProfile%\.wslconfig
```

### Step 2: Add Memory Configuration

Add this content:

```ini
[wsl2]
memory=6GB     # Allocate 6GB to WSL2 (adjust based on your total RAM)
swap=2GB       # 2GB swap file
```

**Guidelines:**
- If you have 8GB total: Use `memory=4GB`
- If you have 16GB total: Use `memory=8GB`
- If you have 32GB total: Use `memory=12GB`

### Step 3: Restart WSL2

In PowerShell (Windows):

```powershell
wsl --shutdown
```

Then reopen your WSL terminal. WSL will restart with new settings.

### Step 4: Verify

In WSL, check new allocation:

```bash
free -h
```

You should see the new memory amount!

### Step 5: Test Ollama

```bash
curl -X POST http://localhost:11434/api/generate -d '{
  "model":"llama3.2:1b",
  "prompt":"Test",
  "stream":false
}'
```

Should work now! ✅

---

## Alternative: Use Smaller Model

If you can't allocate more RAM, try an even smaller model:

```bash
ollama pull qwen2:0.5b    # Only 500MB
```

Then update llm-bridge.js line 11:
```javascript
this.DEFAULT_MODEL = 'qwen2:0.5b';
```

Restart slack-bridge:
```bash
cd ~/clawd
./stop-slack-bridge.sh && ./start-slack-bridge.sh
```

---

## Summary

**You DON'T need a new computer!**

You just need to:
1. Allocate more RAM to WSL2 (free in Windows)
2. Or use a smaller Ollama model (500MB)

Current setup has plenty of resources, just not allocated to WSL2.
