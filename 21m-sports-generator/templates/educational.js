/**
 * Educational Content Templates
 * Teaching Bitcoin/sound money through sports
 */

export const educationalTemplates = [
  {
    id: 'time-preference',
    name: 'Time Preference Lesson',
    generate: (data) => {
      const { example, highTP, lowTP } = data;

      return [
        `Time preference in sports:

HIGH: ${highTP}
LOW: ${lowTP}

Example: ${example}

Low time preference builds generational wealth.`,

        `What is time preference?

It's choosing future value over instant gratification.

In sports: ${example}

High time preference: ${highTP}
Low time preference: ${lowTP}

Which athlete are you?`,

        `The most important concept in wealth:

TIME PREFERENCE

${example}

${highTP} vs ${lowTP}

One builds wealth. One destroys it.`
      ];
    }
  },

  {
    id: 'fiat-debasement',
    name: 'Fiat Debasement Explained',
    generate: (data) => {
      const { example, year1, amount1, year2, amount2, lesson } = data;

      return [
        `What is fiat debasement?

${year1}: ${example} costs ${amount1}
${year2}: ${example} costs ${amount2}

Same thing. Different price.

Your dollars bought less.
${lesson}`,

        `Fiat debasement through sports:

${example}
${year1}: ${amount1}
${year2}: ${amount2}

The thing didn't change.
The money did.

${lesson}`,

        `Why your dollars buy less:

Example: ${example}

${year1} → ${amount1}
${year2} → ${amount2}

The government printed money.
Your purchasing power decreased.

${lesson}`
      ];
    }
  },

  {
    id: 'sound-money',
    name: 'Sound Money Principles',
    generate: (data) => {
      const { principle, sportsExample, outcome } = data;

      return [
        `Sound Money Principle: ${principle}

In sports: ${sportsExample}

Result: ${outcome}

This is why Bitcoin matters.`,

        `${principle}

Sports example: ${sportsExample}

Outcome: ${outcome}

Apply this to your life.`,

        `Learn from sports economics:

${principle}

${sportsExample}

${outcome}

Sound money wins long-term.`
      ];
    }
  },

  {
    id: 'macro-sports',
    name: 'Macro Economics + Sports',
    generate: (data) => {
      const { macroEvent, sportsImpact, connection } = data;

      return [
        `Macro → Sports connection:

${macroEvent}
↓
${sportsImpact}

${connection}

It's all connected.`,

        `When ${macroEvent}...

Sports impact: ${sportsImpact}

Why: ${connection}

Follow the incentives.`,

        `${macroEvent}

Sports world: ${sportsImpact}

The connection: ${connection}

Money policy affects everything.`
      ];
    }
  },

  {
    id: 'bitcoin-standard',
    name: 'Bitcoin Standard in Sports',
    generate: (data) => {
      const { scenario, fiatOutcome, btcOutcome } = data;

      return [
        `Scenario: ${scenario}

On fiat standard: ${fiatOutcome}
On Bitcoin standard: ${btcOutcome}

Which world sounds better?`,

        `${scenario}

Fiat: ${fiatOutcome}
Bitcoin: ${btcOutcome}

Fix the money, fix the game.`,

        `What if sports ran on Bitcoin?

${scenario}

Current (fiat): ${fiatOutcome}
Bitcoin standard: ${btcOutcome}

Different incentives, different outcomes.`
      ];
    }
  },

  {
    id: 'inflation-impact',
    name: 'Inflation Impact Breakdown',
    generate: (data) => {
      const { item, timeline } = data;

      return [
        `${item} costs over time:

${timeline.map(t => `${t.year}: ${t.cost}`).join('\n')}

Same item. Rising price.
That's inflation.

Bitcoin fixes this.`,

        `Track inflation through sports:

${item}
${timeline.map(t => `${t.year} → ${t.cost}`).join('\n')}

Your dollars lost ${((timeline[timeline.length-1].value / timeline[0].value - 1) * 100).toFixed(0)}% purchasing power.

This is theft.`,

        `Real inflation: ${item} edition

${timeline.map(t => `${t.year}: ${t.cost}`).join('\n')}

The price went up.
The value stayed the same.
Your money got weaker.`
      ];
    }
  }
];

export default educationalTemplates;
