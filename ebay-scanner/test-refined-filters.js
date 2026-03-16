/**
 * Test Refined Filters
 * Verify that loosened filters now allow legitimate cards through
 */

const AdvancedFilter = require('./advanced-filter');
const TitleAnalyzer = require('./title-analyzer');

function testRefinedFilters() {
  const filter = new AdvancedFilter();
  const analyzer = new TitleAnalyzer();

  console.log('═══════════════════════════════════════════════════════');
  console.log('Testing Refined Filters - Should PASS Now');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test cases that should NOW pass (but were previously blocked)
  const testCases = [
    {
      title: '2023 Topps Chrome Box Topper Aaron Judge Refractor',
      shouldPass: true,
      reason: 'Box topper is legitimate insert'
    },
    {
      title: 'Juan Soto Rookie Pack Fresh PSA Ready',
      shouldPass: true,
      reason: 'Pack fresh is good signal'
    },
    {
      title: 'Mike Trout Photo Variation SP #/99',
      shouldPass: true,
      reason: 'Photo variation is legitimate parallel'
    },
    {
      title: 'Derek Jeter Commemorative Patch Auto #/25',
      shouldPass: true,
      reason: 'Commemorative is official card type'
    },
    {
      title: 'Factory Sealed Single Card - Luka Doncic Prizm',
      shouldPass: true,
      reason: 'Factory sealed single is legitimate'
    },
    {
      title: 'Raw Gem - Patrick Mahomes Rookie BGS Ready',
      shouldPass: true,
      reason: 'Raw/ungraded can be deals'
    },
    {
      title: 'Shohei Ohtani Auto - Make Offer!',
      shouldPass: true,
      reason: 'OBO is negotiable, not necessarily bad'
    },
    {
      title: 'Tom Brady Memorabilia Card Game Used Jersey',
      shouldPass: true,
      reason: 'Memorabilia card is legitimate'
    },

    // These should still FAIL (blocked correctly)
    {
      title: 'Hobby Box 2023 Topps Chrome - 24 Packs',
      shouldPass: false,
      reason: 'Hobby box should still be blocked'
    },
    {
      title: 'Card Lot - 10 Random Rookies',
      shouldPass: false,
      reason: 'Lots should still be blocked'
    },
    {
      title: 'Custom Fan Made Jordan Card - One of a Kind',
      shouldPass: false,
      reason: 'Custom cards should still be blocked'
    },
    {
      title: 'Reprint 1952 Topps Mickey Mantle',
      shouldPass: false,
      reason: 'Reprints should still be blocked'
    }
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach((test, index) => {
    const result = filter.filter({ title: test.title });
    const analysis = analyzer.analyze(test.title);

    const actualPass = result.passed;
    const expected = test.shouldPass;
    const correct = actualPass === expected;

    const icon = correct ? '✅' : '❌';
    const status = actualPass ? 'PASSED' : 'BLOCKED';

    console.log(`${icon} Test ${index + 1}: ${status}`);
    console.log(`   Title: "${test.title}"`);
    console.log(`   Expected: ${expected ? 'PASS' : 'BLOCK'}`);
    console.log(`   Actual: ${actualPass ? 'PASS' : 'BLOCK'}`);

    if (!actualPass) {
      console.log(`   Reason: ${result.reason}`);
    }

    if (analysis.signals.length > 0) {
      console.log(`   Good signals: ${analysis.signals.map(s => s.keyword).join(', ')}`);
    }

    if (analysis.flags.length > 0) {
      console.log(`   Red flags: ${analysis.flags.map(f => f.keyword).join(', ')}`);
    }

    console.log(`   Why: ${test.reason}`);
    console.log('');

    if (correct) {
      passed++;
    } else {
      failed++;
    }
  });

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / testCases.length) * 100)}%`);

  if (failed === 0) {
    console.log('\n✅ All tests passed! Filters refined successfully.');
  } else {
    console.log('\n⚠️  Some tests failed. Review filter logic.');
  }

  // Test title analyzer weights
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Title Analyzer Weight Changes');
  console.log('═══════════════════════════════════════════════════════\n');

  const oboTest = analyzer.analyze('Aaron Judge Auto - Make Offer OBO');
  console.log('Test: "Aaron Judge Auto - Make Offer OBO"');
  console.log(`  Score: ${oboTest.verdict.score} (should be mild penalty, not harsh)`);
  console.log(`  Verdict: ${oboTest.verdict.summary}`);
  console.log(`  Passed: ${oboTest.passed ? '✅' : '❌'}`);

  const rawTest = analyzer.analyze('Raw Gem Mint Patrick Mahomes Rookie');
  console.log('\nTest: "Raw Gem Mint Patrick Mahomes Rookie"');
  console.log(`  Score: ${rawTest.verdict.score} (should be POSITIVE - "gem mint")`);
  console.log(`  Verdict: ${rawTest.verdict.summary}`);
  console.log(`  Passed: ${rawTest.passed ? '✅' : '❌'}`);

  const packFreshTest = analyzer.analyze('Pack Fresh Juan Soto Rookie');
  console.log('\nTest: "Pack Fresh Juan Soto Rookie"');
  console.log(`  Score: ${packFreshTest.verdict.score} (should be POSITIVE - "pack fresh")`);
  console.log(`  Verdict: ${packFreshTest.verdict.summary}`);
  console.log(`  Passed: ${packFreshTest.passed ? '✅' : '❌'}`);
}

// Run tests
testRefinedFilters();
