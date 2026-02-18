/**
 * Contract Comparison Templates
 * Comparing contracts across eras in BTC terms
 */

export const contractComparisonTemplates = [
  {
    id: 'basic-comparison',
    name: 'Basic Era Comparison',
    generate: (data) => {
      const { vintage, modern, vintageData, modernData } = data;

      return [
        // Variation 1: Direct comparison
        `${vintage.player} signed for ${vintageData.formatted} in ${vintage.date.split('-')[0]}.

${modern.player} just signed for ${modernData.formatted}.

The "historic" deal is actually ${(modernData.btc / vintageData.btc).toFixed(1)}x smaller in real terms.

This is fiat debasement.`,

        // Variation 2: Question format
        `Which contract was bigger?

A) ${vintage.player}: ${vintageData.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} (${vintage.date.split('-')[0]})
B) ${modern.player}: ${modernData.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} (${modern.date.split('-')[0]})

In Bitcoin terms:
A) ${vintageData.formatted}
B) ${modernData.formatted}

The old deal was ${(vintageData.btc / modernData.btc).toFixed(1)}x bigger. Money printer goes brrr.`,

        // Variation 3: Brutal honesty
        `${modern.player}'s ${modernData.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} contract sounds massive.

${vintage.player} made ${vintageData.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} in ${vintage.date.split('-')[0]}.

In Bitcoin terms:
${vintage.player}: ${vintageData.formatted}
${modern.player}: ${modernData.formatted}

The "smaller" contract was actually worth ${(vintageData.btc / modernData.btc).toFixed(1)}x more.`,

        // Variation 4: Timeline format
        `📊 FIAT DEBASEMENT FRIDAY

${vintage.date.split('-')[0]}: ${vintage.player} → ${vintageData.formatted}
${modern.date.split('-')[0]}: ${modern.player} → ${modernData.formatted}

Same dollars. Different value.
This is why we Bitcoin.`,

        // Variation 5: Storytelling
        `Let's talk about ${vintage.player}'s ${vintage.date.split('-')[0]} contract.

Fiat bros: "Only ${vintageData.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}? That's nothing!"

Bitcoin standard: ${vintageData.formatted}

${modern.player}'s "huge" ${modernData.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} deal today?
${modernData.formatted}

Inflation is theft.`
      ];
    }
  },

  {
    id: 'purchasing-power',
    name: 'Purchasing Power Focus',
    generate: (data) => {
      const { vintage, modern, vintageData, modernData } = data;
      const ratio = vintageData.btc / modernData.btc;

      return [
        // Variation 1: Houses comparison
        `${vintage.player} could've bought ${Math.floor(ratio * 10)} houses with that contract.

${modern.player} can buy 10 houses with his.

Same "purchasing power"? Not even close.

This is what fiat does to wealth.`,

        // Variation 2: What you could buy
        `What ${vintageData.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} could buy in ${vintage.date.split('-')[0]}:
→ ${vintageData.formatted}

What ${modernData.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} can buy today:
→ ${modernData.formatted}

The numbers went up. The value went down.`,

        // Variation 3: Time preference lesson
        `If ${vintage.player} saved in BTC instead of dollars...

${vintage.date.split('-')[0]} contract: ${vintageData.formatted}
Worth today: ~${(vintageData.btc * modernData.btcPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}

If ${modern.player} saves in BTC...
He understands sound money.

Low time preference wins.`
      ];
    }
  },

  {
    id: 'position-specific',
    name: 'Position/Role Focused',
    generate: (data) => {
      const { vintage, modern, vintageData, modernData } = data;

      return [
        `${vintage.player} (${vintage.team}): ${vintageData.formatted}
${modern.player} (${modern.team}): ${modernData.formatted}

One is a legend. One is... playing today.

In real terms, the legend made ${(vintageData.btc / modernData.btc).toFixed(1)}x more.

Fiat made the difference.`,

        `The ${vintage.team} paid ${vintage.player} ${vintageData.formatted} in ${vintage.date.split('-')[0]}.

The ${modern.team} is paying ${modern.player} ${modernData.formatted} today.

Which team got better value?

Fix the money, fix the world.`
      ];
    }
  }
];

export default contractComparisonTemplates;
