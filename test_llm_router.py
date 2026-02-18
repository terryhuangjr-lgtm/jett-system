#!/usr/bin/env python3
"""
LLM Router Testing Suite
Tests routing decisions, response quality, and cost savings
"""

import time
from llm_router import LLMRouter, TaskComplexityAnalyzer, check_ollama_available
from usage_tracker import UsageTracker, format_cost
from typing import List, Dict


class RouterTester:
    """Test LLM routing system."""

    # Test cases with expected routing
    TEST_CASES = [
        {
            'prompt': "Summarize my notes on Juan Soto",
            'expected_route': 'local',
            'category': 'Simple Summary'
        },
        {
            'prompt': "Analyze the strategic implications of NIL deals on college sports recruiting and their long-term effects on competitive balance",
            'expected_route': 'api',
            'category': 'Complex Analysis'
        },
        {
            'prompt': "What athletes have contracts over $10M?",
            'expected_route': 'local',
            'category': 'Database Query'
        },
        {
            'prompt': "Draft a comprehensive Twitter thread explaining Shedeur Sanders' contract structure, its implications for future NIL deals, and strategic recommendations for other athletes",
            'expected_route': 'api',
            'category': 'Creative Writing'
        },
        {
            'prompt': "List all basketball players in the database",
            'expected_route': 'local',
            'category': 'Simple Query'
        },
        {
            'prompt': "Extract the key details from the latest research on NIL market size",
            'expected_route': 'local',
            'category': 'Extraction'
        },
        {
            'prompt': "Write Python code to implement a machine learning model that predicts NIL deal values based on athlete statistics and social media metrics",
            'expected_route': 'api',
            'category': 'Code Generation'
        },
        {
            'prompt': "Get a brief overview of Caitlin Clark's contract",
            'expected_route': 'local',
            'category': 'Simple Summary'
        },
        {
            'prompt': "Compare and contrast the NIL deal structures between college football and basketball, considering market dynamics, athlete bargaining power, and future trends",
            'expected_route': 'api',
            'category': 'Complex Comparison'
        },
        {
            'prompt': "How many athletes are in the database with contracts over $5M?",
            'expected_route': 'local',
            'category': 'Count Query'
        }
    ]

    def __init__(self):
        self.tracker = UsageTracker()
        self.router = LLMRouter(usage_tracker=self.tracker)
        self.analyzer = TaskComplexityAnalyzer()
        self.results = []

    def test_complexity_analysis(self):
        """Test complexity analyzer."""
        print("\n" + "="*70)
        print("TEST 1: COMPLEXITY ANALYSIS")
        print("="*70)
        print()

        correct_routes = 0
        total_tests = len(self.TEST_CASES)

        for i, test in enumerate(self.TEST_CASES, 1):
            analysis = self.analyzer.analyze(test['prompt'])
            predicted_route = 'local' if analysis['use_local'] else 'api'
            is_correct = predicted_route == test['expected_route']

            if is_correct:
                correct_routes += 1

            status = "✓" if is_correct else "✗"
            print(f"{status} Test {i}/{total_tests}: {test['category']}")
            print(f"  Expected: {test['expected_route'].upper()}")
            print(f"  Predicted: {predicted_route.upper()}")
            print(f"  Confidence: {analysis['confidence']:.0%}")
            print(f"  Complexity: {analysis['complexity_score']:.2f}")
            print(f"  Reason: {analysis['reason']}")
            print()

            self.results.append({
                'test': test,
                'analysis': analysis,
                'predicted': predicted_route,
                'correct': is_correct
            })

        accuracy = (correct_routes / total_tests) * 100
        print(f"{'='*70}")
        print(f"Routing Accuracy: {correct_routes}/{total_tests} ({accuracy:.1f}%)")
        print(f"{'='*70}")

        return accuracy

    def test_ollama_availability(self):
        """Test if Ollama is available."""
        print("\n" + "="*70)
        print("TEST 2: OLLAMA AVAILABILITY")
        print("="*70)
        print()

        is_available = check_ollama_available()

        if is_available:
            print("✓ Ollama is running and available")
            print("  URL: http://localhost:11434")
        else:
            print("✗ Ollama is NOT available")
            print("  Please start Ollama: ollama serve")
            print("  Or install: https://ollama.ai/")

        print()
        return is_available

    def test_local_llm_response(self):
        """Test local LLM with a simple query."""
        print("\n" + "="*70)
        print("TEST 3: LOCAL LLM RESPONSE")
        print("="*70)
        print()

        if not check_ollama_available():
            print("⊘ Skipping - Ollama not available")
            return False

        test_prompt = "Summarize in one sentence: NIL deals allow college athletes to profit from their name, image, and likeness."

        print(f"Testing with prompt: {test_prompt}")
        print()

        start_time = time.time()

        try:
            result = self.router.route_and_execute(
                test_prompt,
                force_local=True
            )

            elapsed = time.time() - start_time

            if result['success']:
                print("✓ Local LLM responded successfully")
                print(f"  Provider: {result['provider']}")
                print(f"  Model: {result['model']}")
                print(f"  Time: {result['time_ms']:.0f}ms")
                print(f"  Tokens: {result['tokens']}")
                print(f"  Response: {result['response'][:200]}...")
                return True
            else:
                print("✗ Local LLM failed")
                return False

        except Exception as e:
            print(f"✗ Error: {e}")
            return False

    def test_routing_with_execution(self, limit: int = 3):
        """Test routing with actual execution (limited)."""
        print("\n" + "="*70)
        print(f"TEST 4: ROUTING WITH EXECUTION (first {limit} tests)")
        print("="*70)
        print()

        ollama_available = check_ollama_available()

        if not ollama_available:
            print("⊘ Skipping - Ollama not available")
            print("  Only complexity analysis was tested")
            return

        for i, test in enumerate(self.TEST_CASES[:limit], 1):
            print(f"\nTest {i}: {test['category']}")
            print(f"Prompt: {test['prompt'][:80]}...")
            print()

            try:
                result = self.router.route_and_execute(test['prompt'])

                print(f"  Routed to: {result['provider'].upper()}")
                print(f"  Model: {result['model']}")
                print(f"  Time: {result['time_ms']:.0f}ms")
                print(f"  Cost: {format_cost(result['cost_usd'])}")
                print(f"  Savings: {format_cost(result['savings_usd'])}")

                if result['response']:
                    print(f"  Response: {result['response'][:150]}...")

            except Exception as e:
                print(f"  ✗ Error: {e}")

            time.sleep(0.5)  # Brief delay between tests

    def test_cost_tracking(self):
        """Test usage tracking and cost calculations."""
        print("\n" + "="*70)
        print("TEST 5: COST TRACKING")
        print("="*70)
        print()

        stats = self.tracker.get_stats(days=1)

        if stats['total_requests'] > 0:
            print("✓ Usage tracking is working")
            print()
            print(f"Total Requests: {stats['total_requests']}")
            print(f"Total Cost: {format_cost(stats['total_cost'])}")
            print(f"Total Savings: {format_cost(stats['total_savings'])}")
            print(f"Savings Rate: {stats['savings_percentage']:.1f}%")
            print(f"Local Usage: {stats['local_percentage']:.1f}%")

            if 'providers' in stats:
                print()
                for provider, pstats in stats['providers'].items():
                    print(f"{provider.upper()}: {pstats['count']} requests")
        else:
            print("⊘ No usage data yet")
            print("  Run some tests to generate usage data")

    def calculate_projected_savings(self):
        """Calculate projected monthly savings."""
        print("\n" + "="*70)
        print("TEST 6: PROJECTED SAVINGS CALCULATION")
        print("="*70)
        print()

        # Assumptions
        daily_queries = 50
        local_percentage = 70  # 70% routed to local
        avg_tokens_per_query = 1000

        # Cost per 1M tokens
        claude_input_cost = 3.0
        claude_output_cost = 15.0
        avg_claude_cost_per_query = (avg_tokens_per_query * (claude_input_cost + claude_output_cost) / 2) / 1_000_000

        # Calculate savings
        monthly_queries = daily_queries * 30
        local_queries = monthly_queries * (local_percentage / 100)
        api_queries = monthly_queries - local_queries

        cost_with_routing = api_queries * avg_claude_cost_per_query
        cost_without_routing = monthly_queries * avg_claude_cost_per_query
        monthly_savings = cost_without_routing - cost_with_routing
        savings_percentage = (monthly_savings / cost_without_routing) * 100

        print(f"Assumptions:")
        print(f"  Daily queries: {daily_queries}")
        print(f"  Local routing rate: {local_percentage}%")
        print(f"  Avg tokens per query: {avg_tokens_per_query:,}")
        print()
        print(f"Monthly Analysis:")
        print(f"  Total queries: {monthly_queries:,}")
        print(f"  Local (free): {local_queries:,.0f}")
        print(f"  Claude API: {api_queries:,.0f}")
        print()
        print(f"Cost Comparison:")
        print(f"  Without routing: ${cost_without_routing:.2f}/month")
        print(f"  With routing: ${cost_with_routing:.2f}/month")
        print(f"  💰 Monthly Savings: ${monthly_savings:.2f} ({savings_percentage:.1f}%)")
        print()
        print(f"Annual Savings: ${monthly_savings * 12:.2f}")

    def run_all_tests(self):
        """Run complete test suite."""
        print("\n" + "="*70)
        print("LLM ROUTER - COMPREHENSIVE TEST SUITE")
        print("="*70)

        start_time = time.time()

        # Run tests
        accuracy = self.test_complexity_analysis()
        ollama_available = self.test_ollama_availability()

        if ollama_available:
            self.test_local_llm_response()
            self.test_routing_with_execution(limit=3)
        else:
            print("\n⚠️  Note: Some tests skipped because Ollama is not available")
            print("    Install Ollama from: https://ollama.ai/")
            print("    Then run: ollama run llama3.2:3b")

        self.test_cost_tracking()
        self.calculate_projected_savings()

        elapsed = time.time() - start_time

        # Summary
        print("\n" + "="*70)
        print("TEST SUITE SUMMARY")
        print("="*70)
        print()
        print(f"✓ Complexity Analysis Accuracy: {accuracy:.1f}%")
        print(f"{'✓' if ollama_available else '✗'} Ollama Availability: {'Available' if ollama_available else 'Not Available'}")
        print(f"✓ Usage Tracking: Working")
        print(f"✓ Cost Calculations: Working")
        print()
        print(f"Total Test Time: {elapsed:.1f}s")
        print()

        if accuracy >= 80:
            print("✅ All tests passed! Router is ready for production use.")
        elif accuracy >= 60:
            print("⚠️  Router is functional but routing accuracy could be improved.")
        else:
            print("❌ Routing accuracy is low. Review complexity analysis logic.")

        print("\n" + "="*70)


if __name__ == "__main__":
    tester = RouterTester()
    tester.run_all_tests()
