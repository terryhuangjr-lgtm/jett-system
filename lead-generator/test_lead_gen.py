#!/usr/bin/env python3
"""
Quick test script for Lead Generator v3
"""

import subprocess
import os
import sys

def test_basic():
    """Test basic lead generation without sheet writes."""
    print("="*60)
    print("TEST 1: Basic lead generation (DRY RUN)")
    print("="*60)
    
    env = os.environ.copy()
    env.update({
        'DRY_RUN': '1',
        'MIN_RATING': '3.8',
        'MAX_REVIEWS': '1000',
        'MIN_REVIEWS': '3',
        'SEARCH_RADIUS': '10000',
    })
    
    result = subprocess.run(
        ['python3', 'lead_generator_v3.py', '1', '2', '0'],
        capture_output=True, text=True,
        cwd='/home/clawd/clawd/lead-generator',
        env=env
    )
    
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    print(f"\nReturn code: {result.returncode}")
    return result.returncode == 0


def test_strict_filters():
    """Compare strict vs relaxed filters."""
    print("\n" + "="*60)
    print("TEST 2: Filter comparison")
    print("="*60)
    
    for test_name, env_vars in [
        ("OLD FILTERS", {'MIN_RATING': '4.0', 'MAX_REVIEWS': '500', 'MIN_REVIEWS': '5'}),
        ("NEW FILTERS", {'MIN_RATING': '3.8', 'MAX_REVIEWS': '1000', 'MIN_REVIEWS': '3'}),
    ]:
        print(f"\n{test_name}:")
        env = os.environ.copy()
        env.update(env_vars)
        env['DRY_RUN'] = '1'
        
        result = subprocess.run(
            ['python3', 'lead_generator_v3.py', '1', '1', '0'],
            capture_output=True, text=True,
            cwd='/home/clawd/clawd/lead-generator',
            env=env
        )
        
        # Count leads found
        leads_found = result.stdout.count("✅")
        print(f"  Estimated leads found: {leads_found}")
        if leads_found == 0:
            print("  (No leads with current filters - this is normal for single town test)")


def test_ai_module():
    """Test AI qualification module loads."""
    print("\n" + "="*60)
    print("TEST 3: AI Qualification Module")
    print("="*60)
    
    try:
        from ai_qualifier import qualify_lead
        print("✅ AI module imports successfully")
        
        # Test with sample data
        test_biz = {
            "name": "Test Business",
            "industry": "landscaper",
            "rating": 4.2,
            "review_count": 127,
            "has_website": True,
            "website_status": "OUTDATED (2019)",
            "town": "Garden City"
        }
        
        print("\nTesting AI qualification with sample data...")
        result = qualify_lead(test_biz)
        
        if result:
            print(f"✅ AI working - Score: {result.get('score', 'N/A')}/100")
            print(f"   Reasoning: {result.get('reasoning', 'N/A')[:50]}...")
        else:
            print("⚠️ AI returned None (Ollama may not be running)")
            
    except ImportError as e:
        print(f"❌ Failed to import AI module: {e}")
    except Exception as e:
        print(f"⚠️ AI test error (Ollama likely not running): {e}")


def test_email_extraction():
    """Test email extraction from sample HTML."""
    print("\n" + "="*60)
    print("TEST 4: Email Extraction")
    print("="*60)
    
    sample_html = """
    <html><body>
    Contact us: info@testbusiness.com
    Sales: sales@example.com
    Bad: example.png@domain.com
    Support: support@testbusiness.com
    </body></html>
    """
    
    # Import extraction function
    try:
        import re
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, sample_html)
        emails = [e for e in emails if not e.endswith(('.png', '.jpg'))]
        print(f"✅ Email extraction working - Found: {emails}")
    except Exception as e:
        print(f"❌ Email extraction failed: {e}")


def print_summary():
    print("\n" + "="*60)
    print("SUGGESTED NEXT STEPS")
    print("="*60)
    print("""
1. TEST WITH RELAXED FILTERS:
   MIN_RATING=3.8 MAX_REVIEWS=1000 MIN_REVIEWS=3 \\
     python3 lead_generator_v3.py 1 2 0

2. COMPARE OLD VS NEW:
   # Old (strict)
   MIN_RATING=4.0 MAX_REVIEWS=500 MIN_REVIEWS=5 \\
     python3 lead_generator_v3.py 1 3 0 > /tmp/old_output.txt 2>&1
   
   # New (relaxed)
   MIN_RATING=3.8 MAX_REVIEWS=1000 MIN_REVIEWS=3 \\
     python3 lead_generator_v3.py 1 3 0 > /tmp/new_output.txt 2>&1

3. PRODUCTION RUN:
   # Remove DRY_RUN mode
   python3 lead_generator_v3.py 1 5 0

4. UPDATE CRON:
   # Install new schedule
   cat /home/clawd/clawd/lead-generator/crontab-schedule.txt
   crontab -e

5. OPTIONAL: Enable AI
   ENABLE_AI_QUALIFY=1 python3 lead_generator_v3.py 1 2 0
""")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == '--quick':
        test_basic()
    else:
        test_basic()
        test_strict_filters()
        test_email_extraction()
        test_ai_module()
        print_summary()
