"""
Content Idea Scorer - "AI High IQ Thing"
Automatically scores content ideas as high/medium/low priority
"""

import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# High-profile athletes (updates based on engagement patterns)
HIGH_PROFILE_ATHLETES = {
    'juan soto', 'shohei ohtani', 'patrick mahomes', 'lebron james',
    'tom brady', 'aaron judge', 'mike trout', 'steph curry',
    'giannis antetokounmpo', 'nikola jokic', 'kevin durant'
}

# Time-sensitive keywords
URGENT_KEYWORDS = {
    'breaking', 'just signed', 'announced', 'today', 'this week',
    'controversy', 'scandal', 'bankruptcy', 'lawsuit', 'fired'
}

# Evergreen/educational keywords
EVERGREEN_KEYWORDS = {
    'history', 'lesson', 'principle', 'fundamental', 'guide',
    'explained', 'analysis', 'comparison', 'timeline'
}

# Controversial/viral keywords
VIRAL_KEYWORDS = {
    'bankrupt', 'broke', 'lost everything', 'bad advisor', 'scam',
    'fraud', 'mismanaged', 'failed', 'warning', 'shocking'
}


def score_content_idea(
    content: str,
    topic: str,
    category: str,
    metadata: Optional[Dict] = None
) -> Dict:
    """
    Score a content idea from 0-100 and assign priority

    Args:
        content: The content idea text
        topic: Topic/title
        category: Category (sports, bitcoin, etc.)
        metadata: Optional metadata (athlete name, contract value, etc.)

    Returns:
        Dict with score, priority, and reasoning
    """
    score = 50  # Base score
    reasons = []

    content_lower = content.lower()
    topic_lower = topic.lower()
    combined = f"{content_lower} {topic_lower}"

    # Factor 1: High-profile athlete (+20 points)
    for athlete in HIGH_PROFILE_ATHLETES:
        if athlete in combined:
            score += 20
            reasons.append(f"High-profile athlete: {athlete.title()}")
            break

    # Factor 2: Time sensitivity (+25 points)
    for keyword in URGENT_KEYWORDS:
        if keyword in combined:
            score += 25
            reasons.append(f"Time-sensitive: '{keyword}'")
            break

    # Factor 3: Viral potential (+15 points)
    viral_count = sum(1 for kw in VIRAL_KEYWORDS if kw in combined)
    if viral_count > 0:
        viral_score = min(viral_count * 15, 30)
        score += viral_score
        reasons.append(f"Viral potential: {viral_count} controversial keywords")

    # Factor 4: Contract size (if sports content)
    if metadata and 'contract_value' in metadata:
        value = metadata['contract_value']
        if value >= 500_000_000:  # $500M+
            score += 15
            reasons.append(f"Mega contract: ${value/1e6:.0f}M")
        elif value >= 100_000_000:  # $100M+
            score += 10
            reasons.append(f"Large contract: ${value/1e6:.0f}M")

    # Factor 5: BTC relevance (+10 points)
    btc_keywords = ['bitcoin', 'btc', '21m', 'satoshi', 'cryptocurrency']
    if any(kw in combined for kw in btc_keywords):
        score += 10
        reasons.append("Strong BTC connection")

    # Factor 6: Evergreen content (-10 points, can wait)
    for keyword in EVERGREEN_KEYWORDS:
        if keyword in combined:
            score -= 10
            reasons.append(f"Evergreen: '{keyword}' (can schedule later)")
            break

    # Factor 7: Data-driven content (+5 points)
    if any(word in combined for word in ['data', 'analysis', 'calculation', 'vs', 'comparison']):
        score += 5
        reasons.append("Data-driven content")

    # Normalize score to 0-100
    score = max(0, min(100, score))

    # Assign priority
    if score >= 75:
        priority = "high"
        schedule_window = "within 24 hours"
    elif score >= 55:
        priority = "medium"
        schedule_window = "within 3 days"
    else:
        priority = "low"
        schedule_window = "anytime (evergreen)"

    return {
        'score': score,
        'priority': priority,
        'schedule_window': schedule_window,
        'reasons': reasons,
        'scored_at': datetime.now().isoformat()
    }


def batch_score_content_ideas(ideas: List[Dict]) -> List[Dict]:
    """
    Score multiple content ideas and sort by priority

    Args:
        ideas: List of content idea dicts with 'content', 'topic', 'category'

    Returns:
        List of ideas with added 'scoring' field, sorted by score
    """
    for idea in ideas:
        scoring = score_content_idea(
            content=idea.get('content', ''),
            topic=idea.get('topic', ''),
            category=idea.get('category', ''),
            metadata=idea.get('metadata', {})
        )
        idea['scoring'] = scoring

    # Sort by score descending
    ideas.sort(key=lambda x: x['scoring']['score'], reverse=True)

    return ideas


def update_high_profile_athletes(new_athletes: List[str]):
    """
    Update the list of high-profile athletes based on engagement patterns

    In production, this would be called periodically based on which
    athletes get the most engagement.
    """
    # This would update a persistent config file
    # For now, just returns the updated list
    return list(set(HIGH_PROFILE_ATHLETES) | set(a.lower() for a in new_athletes))


# Example usage
if __name__ == "__main__":
    # Test scoring
    test_ideas = [
        {
            'topic': 'Juan Soto Contract Analysis',
            'content': 'Juan Soto just signed $765M deal - compare to BTC purchasing power',
            'category': 'sports',
            'metadata': {'contract_value': 765_000_000}
        },
        {
            'topic': 'Bitcoin History Lesson',
            'content': 'Explaining Bitcoin fundamentals - why 21M matters',
            'category': 'bitcoin',
            'metadata': {}
        },
        {
            'topic': 'Athlete Bankruptcy Story',
            'content': 'NBA player went bankrupt despite $200M career earnings - bad advisor warning',
            'category': 'sports',
            'metadata': {'contract_value': 200_000_000}
        }
    ]

    scored = batch_score_content_ideas(test_ideas)

    print("\n=== Content Scoring Results ===\n")
    for idea in scored:
        print(f"Topic: {idea['topic']}")
        print(f"Score: {idea['scoring']['score']}/100")
        print(f"Priority: {idea['scoring']['priority'].upper()}")
        print(f"Schedule: {idea['scoring']['schedule_window']}")
        print(f"Reasons:")
        for reason in idea['scoring']['reasons']:
            print(f"  - {reason}")
        print()
