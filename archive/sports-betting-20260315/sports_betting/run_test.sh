#!/bin/bash
# Quick test runner

echo "======================================"
echo "Testing Complete Betting System"
echo "======================================"
echo ""

cd ~/clawd/sports_betting

echo "Running orchestrator..."
python3 orchestrator.py

echo ""
echo "======================================"
echo "Checking database..."
echo "======================================"
echo ""

sqlite3 ~/clawd/data/sports_betting.db << EOF
.mode column
.headers on
SELECT
    bet_selection,
    confidence_score,
    expected_value,
    is_daily_pick
FROM bet_recommendations
ORDER BY recommended_at DESC
LIMIT 5;
EOF

echo ""
echo "✅ Test complete!"
