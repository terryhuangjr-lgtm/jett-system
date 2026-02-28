#!/usr/bin/env python3
"""
Manage podcast queue
Commands: add, remove, view, reorder, clear
"""

import os
import sys
import subprocess
import json

QUEUE_FILE = "/home/clawd/data/podcasts/queue.txt"
QUEUE_META_FILE = "/home/clawd/data/podcasts/queue_meta.json"
MAX_QUEUE_SIZE = 5

def load_queue():
    if not os.path.exists(QUEUE_FILE):
        return []
    with open(QUEUE_FILE, 'r') as f:
        urls = []
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                urls.append(line)
        return urls

def load_metadata():
    if not os.path.exists(QUEUE_META_FILE):
        return {}
    with open(QUEUE_META_FILE, 'r') as f:
        return json.load(f)

def save_metadata(meta):
    with open(QUEUE_META_FILE, 'w') as f:
        json.dump(meta, f, indent=2)

def get_video_title(url):
    for attempt in range(3):
        try:
            result = subprocess.run(
                ["yt-dlp", "--cookies", "/home/clawd/clawd/youtube-cookies.txt", "--get-title", url],
                capture_output=True,
                text=True,
                timeout=15
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except Exception as e:
            if attempt == 2:
                print(f"Warning: Failed to get title: {e}")
    return None

def save_queue(urls):
    os.makedirs(os.path.dirname(QUEUE_FILE), exist_ok=True)
    with open(QUEUE_FILE, 'w') as f:
        for url in urls:
            f.write(url + '\n')

def add_url(url, title=None):
    urls = load_queue()
    
    if len(urls) >= MAX_QUEUE_SIZE:
        print(f"Queue is full ({MAX_QUEUE_SIZE} podcasts max)")
        return False
    
    if url in urls:
        print("URL already in queue")
        return False
    
    if not title:
        print("Fetching video title...")
        title = get_video_title(url)
        if title:
            print(f"Title: {title}")
    else:
        print(f"Title: {title} (manual)")
    
    urls.append(url)
    save_queue(urls)
    
    meta = load_metadata()
    meta[url] = {'title': title}
    save_metadata(meta)
    
    print(f"Added to queue (position {len(urls)})")
    return True

def remove_url(position=None, url=None):
    urls = load_queue()
    meta = load_metadata()
    
    if not urls:
        print("Queue is empty")
        return False
    
    if position is not None:
        if position < 1 or position > len(urls):
            print(f"Invalid position. Queue has {len(urls)} items")
            return False
        removed = urls.pop(position - 1)
        meta.pop(removed, None)
        save_queue(urls)
        save_metadata(meta)
        print(f"Removed position {position}")
        return True
    
    if url is not None:
        if url in urls:
            urls.remove(url)
            meta.pop(url, None)
            save_queue(urls)
            save_metadata(meta)
            print(f"Removed: {url}")
            return True
        else:
            print("URL not found in queue")
            return False
    
    return False

def reorder_queue(from_pos, to_pos):
    urls = load_queue()
    meta = load_metadata()
    
    if from_pos < 1 or from_pos > len(urls):
        print(f"Invalid from position. Queue has {len(urls)} items")
        return False
    
    if to_pos < 1 or to_pos > len(urls):
        print(f"Invalid to position. Queue has {len(urls)} items")
        return False
    
    from_idx = from_pos - 1
    to_idx = to_pos - 1
    
    item = urls.pop(from_idx)
    urls.insert(to_idx, item)
    
    save_queue(urls)
    print(f"Moved position {from_pos} to position {to_pos}")
    return True

def view_queue():
    urls = load_queue()
    meta = load_metadata()
    
    if not urls:
        print(f"Queue is empty ({MAX_QUEUE_SIZE} max)")
        return
    
    print(f"Podcast Queue ({len(urls)}/{MAX_QUEUE_SIZE}):")
    print()
    for i, url in enumerate(urls, 1):
        status = "NEXT" if i == 1 else f"#{i}"
        title = meta.get(url, {}).get('title')
        if title:
            print(f"{status}: {title}")
            print(f"     {url}")
        else:
            print(f"{status}: {url}")
    print()
    print("Next processing: 3:00 AM daily")

def clear_queue():
    save_queue([])
    save_metadata({})
    print("Queue cleared")

def pop_next():
    urls = load_queue()
    if not urls:
        return None
    next_url = urls.pop(0)
    save_queue(urls)
    return next_url

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  view                    - Show queue")
        print('  add "title" [url]     - Add with title (or just url)')
        print("  remove [position]      - Remove by position")
        print("  reorder [from] [to]    - Move item (e.g., reorder 3 1)")
        print("  clear                  - Clear queue")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "view":
        view_queue()
    elif command == "add":
        if len(sys.argv) < 3:
            print("Please provide URL")
            sys.exit(1)
        if len(sys.argv) >= 4:
            title = sys.argv[2]
            url = sys.argv[3]
            add_url(url, title)
        else:
            add_url(sys.argv[2])
    elif command == "remove":
        if len(sys.argv) < 3:
            print("Please provide position number")
            sys.exit(1)
        try:
            position = int(sys.argv[2])
            remove_url(position=position)
        except ValueError:
            print("Position must be a number")
            sys.exit(1)
    elif command == "reorder":
        if len(sys.argv) < 4:
            print("Usage: reorder [from] [to]")
            print("Example: reorder 3 1 (moves item 3 to top)")
            sys.exit(1)
        try:
            from_pos = int(sys.argv[2])
            to_pos = int(sys.argv[3])
            reorder_queue(from_pos, to_pos)
        except ValueError:
            print("Positions must be numbers")
            sys.exit(1)
    elif command == "clear":
        clear_queue()
    elif command == "pop":
        url = pop_next()
        if url:
            print(url)
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
