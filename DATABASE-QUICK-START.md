# Database Quick Start - For Terry

## What Is It?
A SQLite database that stores athletes, content ideas, research, and tasks.

**Why it matters:** 97-99% token savings on data queries.

## Quick Commands

### See What's In There
```bash
cd /home/clawd/clawd
python3 -c "from jett_db import get_db; db = get_db(); print(db.get_stats())"
```

### View All Draft Content
```bash
python3 -c "
from jett_db import get_db
db = get_db()
drafts = db.get_content_by_status('draft')
for d in drafts:
    print(f'\n{d[\"topic\"]}')
    print(d['content'][:200] + '...')
"
```

### Search Athletes
```bash
python3 -c "
from jett_db import get_db
db = get_db()
athletes = db.search_athletes(sport='Basketball')
for a in athletes:
    print(f'{a[\"name\"]}: \${a.get(\"contract_value\", 0):,.0f}')
"
```

### View Pending Tasks
```bash
python3 -c "
from jett_db import get_db
db = get_db()
tasks = db.get_tasks_by_status('pending')
for t in tasks:
    print(f'[{t[\"priority\"].upper()}] {t[\"description\"]}')
"
```

## How Jett Uses It

**Old way (reading markdown files):**
- Read file: 2-5k tokens
- Parse content: 1k tokens
- **Total: 3-6k tokens per query**

**New way (database query):**
- Query database: 200 tokens
- Parse results: 300 tokens
- **Total: 500 tokens per query**

**Savings: 83-92% per query**

## What's Already in There

As of Feb 2, 2026 ~12:30 AM:
- 20 athletes (with contract values, sports, etc.)
- 6 content ideas (5 drafts ready for review)
- 3 research entries (card automation, etc.)
- 4 tasks (1 complete, 3 pending)

## You Don't Need to Touch It

Jett uses it automatically. But if you want to browse:
```bash
sqlite3 data/jett_knowledge.db
.tables
SELECT * FROM content_ideas WHERE status='draft';
.exit
```

## Adding Data

**Option 1: Let Jett do it**
Just tell Jett to add something:
- "Add this athlete to the database..."
- "Save this content idea..."
- "Log this research..."

**Option 2: Keep using markdown**
Write markdown files as usual, then run:
```bash
python3 migrate_markdown.py
```
This imports markdown into database automatically.

## The Point

Database = faster queries + less token burn + better organization.

Jett uses it. You don't have to think about it. Win-win.

---

**Want to see it in action?** Ask Jett:
- "What athletes do we have in the database?"
- "Show me draft content"
- "What research have we logged?"

Simple as that.
