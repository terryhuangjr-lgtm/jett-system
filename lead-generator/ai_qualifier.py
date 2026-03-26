#!/usr/bin/env python3
"""
AI Lead Qualification Module using MiniMax (ollama/minimax-m2.5:cloud)

Usage:
    from ai_qualifier import qualify_lead, generate_outreach_message
    
    score = qualify_lead(business_data)
    message = generate_outreach_message(business_data, score)
"""

import requests
import json
import os
import re

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = os.environ.get("QUALIFY_MODEL", "kimi-k2.5:cloud")

def qualify_lead(business_data):
    """
    Use MiniMax M2.5 to score lead quality 0-100.
    
    Args:
        business_data: dict with keys:
            - name: business name
            - industry: industry type
            - rating: Google rating (1-5)
            - review_count: number of reviews
            - has_website: bool
            - website_status: str (HAS_WEBSITE, OUTDATED, BROKEN, NO_WEBSITE, etc)
            - town: town name
    
    Returns:
        dict with: score, reasoning, recommended_contact_method, lead_type, personalized_message
        Returns None if AI call fails
    """
    
    prompt = f"""Score this business as an AI automation agency lead (0-100).

Business: {business_data.get('name', 'Unknown')}
Industry: {business_data.get('industry', 'Unknown')}
Location: {business_data.get('town', 'Unknown')}
Rating: {business_data.get('rating', 'N/A')}/5 ({business_data.get('review_count', 0)} reviews)
Website Status: {business_data.get('website_status', 'Unknown')}

SCORING CRITERIA (score 0-100):
- 90-100: Hot lead. Established business, needs AI, likely to buy.
- 70-89: Warm lead. Good potential, decent online presence.
- 50-69: Maybe. Some potential but clear obstacles.
- 0-49: Cold. Not worth pursuing right now.

What makes a HOT lead for AI automation:
1. B2B service businesses (trades, contractors, real estate) = HIGH value
2. Outdated/broken/no website = needs modernization (URGENT need)
3. 50-500 reviews = established but not too big (sweet spot)
4. Rating 4.0+ = cares about reputation (values quality)
5. Local business in Nassau/Queens = geographic fit

Respond ONLY in JSON format:
{{
  "score": 0-100,
  "reasoning": "1-2 sentence explanation of score",
  "recommended_contact_method": "email|dm|phone|visit",
  "lead_type": "hot|warm|cold",
  "personalized_message": "2-3 sentence outreach message specific to this business",
  "priority_actions": ["action1", "action2"]
}}

Output:"""

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_tokens": 500
                }
            },
            timeout=15
        )
        response.raise_for_status()
        
        result = response.json()
        response_text = result.get('response', '{}')
        
        # Extract JSON from response (handles markdown codeblocks)
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        
        # Fallback - extract key fields manually
        score_match = re.search(r'"score"[:\s]+(\d+)', response_text)
        score = int(score_match.group(1)) if score_match else 50
        
        reasoning_match = re.search(r'"reasoning"[:\s]+"([^"]+)"', response_text)
        reasoning = reasoning_match.group(1) if reasoning_match else "AI parse error"
        
        return {
            "score": score,
            "reasoning": reasoning,
            "recommended_contact_method": "email",
            "lead_type": "warm",
            "personalized_message": f"Hi! I noticed {business_data.get('name')} and wanted to reach out about AI automation.",
            "priority_actions": ["Send outreach email"]
        }
        
    except Exception as e:
        print(f"    ⚠️ AI qualification failed: {e}")
        return None


def generate_outreach_message(business_data, ai_score=None):
    """
    Generate a personalized outreach message for a specific business.
    
    Args:
        business_data: dict with business info
        ai_score: optional score from qualify_lead
    
    Returns:
        str: Personalized outreach message
    """
    
    prompt = f"""Write a personalized outreach message for this business.

Business: {business_data.get('name')}
Industry: {business_data.get('industry')}
Location: {business_data.get('town')}
Google Rating: {business_data.get('rating')}/5
Website Status: {business_data.get('website_status')}

Write a 3-sentence message that:
1. Opens with a genuine compliment or observation
2. Briefly explains how AI automation helps {business_data.get('industry')} businesses
3. Has a soft call-to-action (not aggressive)

Keep it conversational, not sales-y. No emojis. Professional but warm.

Output only the message, nothing else:"""

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_tokens": 300
                }
            },
            timeout=10
        )
        response.raise_for_status()
        
        result = response.json()
        message = result.get('response', '').strip()
        
        # Clean up markdown
        message = re.sub(r'^["\']|["\']$', '', message)
        
        return message
        
    except Exception as e:
        return None


def batch_qualify(leads_list, max_workers=3):
    """
    Qualify multiple leads in parallel.
    
    Args:
        leads_list: list of business_data dicts
        max_workers: number of parallel AI calls
    
    Returns:
        list of (business_data, qualification_result) tuples
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    results = []
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_lead = {
            executor.submit(qualify_lead, lead): lead 
            for lead in leads_list
        }
        
        for future in as_completed(future_to_lead):
            lead = future_to_lead[future]
            try:
                qualification = future.result()
                results.append((lead, qualification))
            except Exception as e:
                results.append((lead, None))
    
    return results


def calculate_close_probability(business_data, ai_score):
    """
    Calculate rough close probability based on historical factors.
    
    Args:
        business_data: dict with business info
        ai_score: AI qualification score
    
    Returns:
        float: Probability 0-1
    """
    prob = 0.5  # baseline
    
    # Rating factor
    rating = business_data.get('rating', 0)
    if rating >= 4.5:
        prob += 0.15
    elif rating >= 4.0:
        prob += 0.05
    
    # Review count factor (established businesses)
    reviews = business_data.get('review_count', 0)
    if 50 <= reviews <= 500:
        prob += 0.1
    
    # Website status factor
    web_status = business_data.get('website_status', '')
    if 'OUTDATED' in web_status:
        prob += 0.15  # Clear pain point
    elif 'BROKEN' in web_status:
        prob += 0.2  # Urgent pain point
    elif web_status == 'NO WEBSITE':
        prob += 0.1
    
    # AI score factor
    if ai_score >= 80:
        prob += 0.15
    elif ai_score >= 60:
        prob += 0.05
    
    return min(prob, 0.95)  # Cap at 95%


if __name__ == "__main__":
    # Test
    test_businesses = [
        {
            "name": "Elite Landscaping LLC",
            "industry": "landscaper",
            "rating": 4.6,
            "review_count": 234,
            "has_website": True,
            "website_status": "OUTDATED (2019)",
            "town": "Garden City"
        },
        {
            "name": "Quick Fix Handyman",
            "industry": "handyman",
            "rating": 3.9,
            "review_count": 12,
            "has_website": False,
            "website_status": "NO WEBSITE",
            "town": "Mineola"
        }
    ]
    
    print("Testing AI Qualification Module...\n")
    for biz in test_businesses:
        print(f"Business: {biz['name']}")
        result = qualify_lead(biz)
        if result:
            print(f"  Score: {result.get('score')}/100")
            print(f"  Lead Type: {result.get('lead_type')}")
            print(f"  Reasoning: {result.get('reasoning')}")
            print(f"  Contact via: {result.get('recommended_contact_method')}")
            print(f"  Message preview: {result.get('personalized_message', 'N/A')[:60]}...")
        print()
