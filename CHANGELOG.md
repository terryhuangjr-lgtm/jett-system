# Changelog

All notable changes to Jett will be documented here.

## [Unreleased]

### Fixed
- Rebuilt AGENTS.md - removed all clawd-slack references
- Converted ebay-scanner from broken submodule to regular directory
- Added binary files to .gitignore (jpg, png, pdf, ebay-raw.json)

### Changed
- Archived 98 historical docs to docs/archive/
- Moved test files to tests/ directory
- Moved scripts to lib/ and scripts/ directories

### In Progress
- Stabilizing system for 7 consecutive days
- Monitoring health checks and alerts
- Testing Haiku 4.5 cost savings vs Sonnet

---

## [2026-02-18] - GitHub Migration

### Added
- Migrated entire system to GitHub for version control
- Created comprehensive documentation (README, CHANGELOG, AGENTS.md)
- Set up .gitignore to protect secrets and credentials
- Established Git workflow for all AI agents

### Changed
- All code now tracked in central repository
- Single source of truth for system state

---

## [2026-02-17] - Health Monitoring

### Added
- Automated health check script (runs hourly via cron)
- Slack notifications for system failures
- Performance monitoring (CPU, memory, disk)
- Daily cost tracking reports

### Changed
- Switched default model from Sonnet 4.5 to Haiku 4.5
- Estimated cost reduction: $68/month → $4/month

---

## [2026-02-16] - System Simplification

### Added
- Cron jobs for all automation (replaced task workers)
- Systemd service for OpenClaw auto-restart
- Log rotation to prevent disk fill-up

### Changed
- Disabled all task workers (unstable, unnecessary)
- All automation moved to simple cron jobs
- Simplified routing (one default model, explicit overrides)

### Fixed
- Morning brief posting reliability (now cron-based)
- Notion API timeout issues (added rate limiting)
- Task worker crashes (removed entirely)

---

## [2026-02-15] - Notion Integration

### Added
- Notion API integration for family calendar
- Shopping list database (shared with wife)
- Family tasks tracker
- Morning brief pulls from all three databases

### Fixed
- Database ID configuration (was using page IDs)
- Calendar event date formatting (now ISO 8601)

---

## [2026-02-14] - Initial Jett Setup

### Added
- OpenClaw installation on H1 Mini
- Slack integration (#huangfamily channel)
- Ollama with Llama 3.3 70B for local processing
- Basic automation framework
- Telegram bot for simple queries

---

## Format
```
## [YYYY-MM-DD] - Title

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Removed
- Removed features
```
```

**Save and exit** (Ctrl+O, Enter, Ctrl+X)
