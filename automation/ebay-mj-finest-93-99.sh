#!/bin/bash
# eBay Scan - MJ Topps Finest 1993-1999
# Runs Monday mornings at 4 AM, posts results at 8:30 AM

cd /home/clawd/clawd/ebay-scanner

# Run search
node multi-search.js "Michael Jordan Topps Finest 1993-1999 refractor, base" > /tmp/mj-finest-results.txt 2>&1

# Extract results and post to Slack #levelupcards
# TODO: Format and post via Clawdbot message tool
echo "Results saved to /tmp/mj-finest-results.txt"
