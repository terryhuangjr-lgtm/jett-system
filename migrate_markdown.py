#!/usr/bin/env python3
"""
Markdown to Database Migration Tool
Scans markdown files and imports them into Jett's knowledge base
"""

import os
import re
from datetime import datetime
from typing import Dict, Optional
from jett_db import get_db


class MarkdownMigrator:
    """Migrate markdown files to database."""

    def __init__(self):
        self.db = get_db()
        self.imported_count = 0
        self.skipped_count = 0
        self.error_count = 0
        self.log = []

    def log_message(self, message: str, level: str = "INFO"):
        """Log a message."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}"
        self.log.append(log_entry)
        print(log_entry)

    def parse_athlete_markdown(self, file_path: str) -> Optional[Dict]:
        """
        Parse an athlete markdown file.

        Expected format:
        # Athlete Name
        **Sport:** Basketball
        **Team:** Team Name
        **Contract Value:** $1,000,000
        **Year:** 2024
        **Deal Type:** NIL

        ## Key Details
        Some details here...

        ## Analysis
        Analysis notes...
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Extract name from first heading
            name_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            if not name_match:
                return None
            name = name_match.group(1).strip()

            # Extract metadata
            sport_match = re.search(r'\*\*Sport:\*\*\s*(.+)$', content, re.MULTILINE)
            team_match = re.search(r'\*\*Team:\*\*\s*(.+)$', content, re.MULTILINE)
            value_match = re.search(r'\*\*Contract Value:\*\*\s*\$?([\d,]+)', content, re.MULTILINE)
            year_match = re.search(r'\*\*Year:\*\*\s*(\d{4})', content, re.MULTILINE)
            deal_type_match = re.search(r'\*\*Deal Type:\*\*\s*(.+)$', content, re.MULTILINE)

            # Extract sections
            key_details_match = re.search(r'##\s+Key Details\s*\n(.*?)(?=##|\Z)', content, re.DOTALL)
            analysis_match = re.search(r'##\s+Analysis\s*\n(.*?)(?=##|\Z)', content, re.DOTALL)

            athlete_data = {
                'name': name,
                'sport': sport_match.group(1).strip() if sport_match else None,
                'team': team_match.group(1).strip() if team_match else None,
                'contract_value': float(value_match.group(1).replace(',', '')) if value_match else None,
                'contract_year': int(year_match.group(1)) if year_match else None,
                'deal_type': deal_type_match.group(1).strip() if deal_type_match else None,
                'key_details': key_details_match.group(1).strip() if key_details_match else None,
                'analysis_notes': analysis_match.group(1).strip() if analysis_match else None,
                'source_file': file_path
            }

            return athlete_data

        except Exception as e:
            self.log_message(f"Error parsing {file_path}: {e}", "ERROR")
            return None

    def migrate_athletes(self, directory: str):
        """Migrate athlete markdown files from directory."""
        self.log_message(f"Scanning athlete directory: {directory}")

        if not os.path.exists(directory):
            self.log_message(f"Directory not found: {directory}", "WARNING")
            return

        # Find all markdown files
        md_files = []
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith('.md'):
                    md_files.append(os.path.join(root, file))

        self.log_message(f"Found {len(md_files)} markdown files")

        # Process each file
        for file_path in md_files:
            try:
                self.log_message(f"Processing: {os.path.basename(file_path)}")

                athlete_data = self.parse_athlete_markdown(file_path)

                if not athlete_data or not athlete_data['name']:
                    self.log_message(f"Skipped (invalid format): {file_path}", "WARNING")
                    self.skipped_count += 1
                    continue

                # Check if athlete already exists
                existing = self.db.get_athlete(athlete_data['name'])
                if existing:
                    self.log_message(f"Skipped (already exists): {athlete_data['name']}", "INFO")
                    self.skipped_count += 1
                    continue

                # Import athlete
                athlete_id = self.db.add_athlete(**athlete_data)
                self.log_message(f"✓ Imported: {athlete_data['name']} (ID: {athlete_id})", "SUCCESS")
                self.imported_count += 1

            except Exception as e:
                self.log_message(f"Error processing {file_path}: {e}", "ERROR")
                self.error_count += 1

    def migrate_content_ideas(self, directory: str):
        """Migrate content idea markdown files."""
        self.log_message(f"Scanning content directory: {directory}")

        if not os.path.exists(directory):
            self.log_message(f"Directory not found: {directory}", "WARNING")
            return

        md_files = []
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith('.md'):
                    md_files.append(os.path.join(root, file))

        self.log_message(f"Found {len(md_files)} markdown files")

        for file_path in md_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Extract topic from first heading
                topic_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
                if not topic_match:
                    self.skipped_count += 1
                    continue

                topic = topic_match.group(1).strip()

                # Determine category from path
                category = "general"
                if "21m-sports" in file_path.lower():
                    category = "21m-sports"
                elif "batting-cage" in file_path.lower():
                    category = "batting-cage"

                # Import content idea
                content_id = self.db.add_content_idea(
                    topic=topic,
                    category=category,
                    content=content,
                    status="draft"
                )

                self.log_message(f"✓ Imported content: {topic} (ID: {content_id})", "SUCCESS")
                self.imported_count += 1

            except Exception as e:
                self.log_message(f"Error processing {file_path}: {e}", "ERROR")
                self.error_count += 1

    def print_summary(self):
        """Print migration summary."""
        print(f"\n{'='*60}")
        print("MIGRATION SUMMARY")
        print(f"{'='*60}")
        print(f"✓ Imported: {self.imported_count}")
        print(f"⊘ Skipped:  {self.skipped_count}")
        print(f"✗ Errors:   {self.error_count}")
        print(f"{'='*60}")

        # Show database stats
        stats = self.db.get_stats()
        print(f"\nCurrent Database Stats:")
        print(f"  Athletes: {stats['total_athletes']}")
        print(f"  Content Ideas: {stats['total_content']}")
        print(f"  Research: {stats['total_research']}")
        print(f"  Tasks: {stats['pending_tasks']} pending, {stats['completed_tasks']} completed")


def main():
    """Main migration function."""
    print("="*60)
    print("JETT KNOWLEDGE BASE - MARKDOWN MIGRATION")
    print("="*60)
    print()

    migrator = MarkdownMigrator()

    # Define directories to scan
    base_dir = os.path.dirname(__file__)
    athlete_dirs = [
        os.path.join(base_dir, "21m-sports", "athletes"),
        os.path.join(base_dir, "21m-research", "athletes"),
    ]

    content_dirs = [
        os.path.join(base_dir, "21m-sports"),
        os.path.join(base_dir, "opportunities"),
    ]

    # Migrate athletes
    print("\n--- MIGRATING ATHLETES ---\n")
    for directory in athlete_dirs:
        if os.path.exists(directory):
            migrator.migrate_athletes(directory)

    # Migrate content ideas
    print("\n--- MIGRATING CONTENT IDEAS ---\n")
    for directory in content_dirs:
        if os.path.exists(directory):
            migrator.migrate_content_ideas(directory)

    # Print summary
    migrator.print_summary()

    # Optionally save log
    log_file = os.path.join(base_dir, "data", "migration.log")
    with open(log_file, 'w') as f:
        f.write('\n'.join(migrator.log))
    print(f"\nLog saved to: {log_file}")


if __name__ == "__main__":
    main()
