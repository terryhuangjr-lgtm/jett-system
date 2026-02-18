# AGENTS.md - Jett System Agent Guidelines

This folder is home. Treat it that way.

---

## BEFORE Making Any Changes

### 1. Pull Latest Code
```bash
cd ~/jett-system
git pull
```

Always start with the latest version to avoid conflicts.

### 2. Read Documentation
```bash
cat README.md        # System overview
cat CHANGELOG.md     # Recent changes
cat AGENTS.md        # This file
```

This gives you full context on:
- What the Jett system currently does
- Recent modifications
- Known issues
- Current architecture

---

## MAKING Changes

### Rules
1. **Test first** - Always test changes before committing
2. **One thing at a time** - Don't mix unrelated changes
3. **Explain why** - Commit messages should explain the reasoning
4. **Update docs** - If you change functionality, update relevant docs

### Example Workflow
```bash
# Make your changes
nano skills/notion-assistant/morning_brief.py

# Test it works
python3 skills/notion-assistant/morning_brief.py

# If it works, commit it
git add skills/notion-assistant/morning_brief.py
git commit -m "Fix: Morning brief now includes overdue tasks"
git push
```

---

## AFTER Making Changes

### 1. Commit to Git
```bash
cd ~/jett-system
git add [files you changed]
git commit -m "[Type]: [what you did]"
git push
```

### 2. Update CHANGELOG.md
Add entry under `[Unreleased]` section:
```markdown
### Fixed
- Morning brief now includes overdue tasks from Notion
```

Then commit the changelog:
```bash
git add CHANGELOG.md
git commit -m "Update: Changelog for morning brief fix"
git push
```

---

## Commit Message Format

Use this format for all commits:

**Format:** `[Type]: [Short description]`

### Types
- `Fix:` - Bug fixes
- `Add:` - New features
- `Update:` - Improvements to existing features
- `Remove:` - Deleted features
- `Refactor:` - Code cleanup (no functionality change)
- `Docs:` - Documentation only

### Examples

✅ **Good:**
- `Fix: Morning brief Slack formatting for long task names`
- `Add: Health check for Ollama service status`
- `Update: Notion API rate limiting to 3 requests/second`
- `Remove: Deprecated task worker code`

❌ **Bad:**
- `changes`
- `stuff`
- `test`
- `fixed it`

---

## When Something Breaks

### 1. Check Recent Changes
```bash
cd ~/jett-system
git log --oneline -10
```

This shows the last 10 commits - one probably broke it.

### 2. Revert If Needed
```bash
# Undo the last commit
git revert HEAD
git push

# Or undo a specific commit
git revert [commit-hash]
git push
```

### 3. Document The Issue
Update CHANGELOG.md:
```markdown
### Fixed
- Reverted morning brief changes that caused Slack API errors
```

---

## Protected Files

**NEVER commit these:**
- `config.yml` (real config with secrets)
- Any file with `_token` or `_secret` in the name
- `*.env` files
- Files in `logs/` directory
- Any file containing API keys or passwords

These are in `.gitignore` - Git should block them automatically.

**DO commit:**
- `config.example.yml` (template without secrets)
- All `.py` and `.sh` files
- All `.md` documentation
- SKILL.md files

---

## Emergency Procedures

### System Won't Start
```bash
cd ~/jett-system
git log --oneline -5
# Find the last working commit
git checkout [working-commit-hash]
# System should work again
```

### Lost Unsaved Changes
```bash
git status  # See what changed
git diff    # See exact changes
git checkout -- [file]  # Discard changes to specific file
```

### Merge Conflicts
Don't panic. Ask Terry or another agent to help resolve.

---

## Questions?

If you're unsure about:
- Whether to commit something
- How to phrase a commit message
- Whether a change is too risky

**Ask Terry first.** Better safe than sorry.

---

Last updated: February 18, 2026
