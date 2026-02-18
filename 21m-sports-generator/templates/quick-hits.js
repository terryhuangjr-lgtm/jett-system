/**
 * Quick Hit Templates
 * Fast, punchy content for engagement
 */

export const quickHitTemplates = [
  {
    id: 'team-payroll',
    name: 'Team Payroll in BTC',
    generate: (data) => {
      const { team, totalPayroll, btcValue, season } = data;

      return [
        `The ${team}'s entire ${season} payroll in Bitcoin:

${btcValue}

Would you take that deal? I would.`,

        `${team} payroll: ${totalPayroll}

In real terms: ${btcValue}

Now ask yourself: is that worth it?`,

        `Fun fact: The ${team} roster is worth ${btcValue} in sound money.

In fiat: ${totalPayroll}

Which number matters?`
      ];
    }
  },

  {
    id: 'fed-connection',
    name: 'Fed Decision Impact',
    generate: (data) => {
      const { decision, impact, sport } = data;

      return [
        `The Fed just ${decision}.

Your favorite ${sport} team's cap will ${impact}.

This is how macro affects your timeline.

Sound money fixes this.`,

        `Jerome Powell ${decision}.

${sport} salary cap ${impact}.

Players think they're getting paid more. They're not.

Bitcoin fixes this.`,

        `${decision} = ${sport} salary cap ${impact}

Connect the dots.
This is all the same system.`
      ];
    }
  },

  {
    id: 'inflation-reality',
    name: 'Inflation Reality Check',
    generate: (data) => {
      const { player, amount, year, btcValue, currentValue } = data;

      return [
        `${player} made ${amount} in ${year}.

That was ${btcValue}.

In today's dollars: ${currentValue}

Inflation is silent theft.`,

        `${year}: ${player} signs for ${amount}
Worth in BTC: ${btcValue}

Today: That same contract would be ${currentValue}

Money printer goes brrr.`,

        `Real talk: ${player}'s ${amount} contract from ${year} would need to be ${currentValue} today just to match the same purchasing power.

And we haven't even mentioned Bitcoin yet.`
      ];
    }
  },

  {
    id: 'championship-cost',
    name: 'Championship Team Cost',
    generate: (data) => {
      const { team, year, cost, btcValue, championship } = data;

      return [
        `The ${year} ${team} ${championship ? 'won the championship' : 'made the finals'}.

Total roster cost: ${cost}
In Bitcoin: ${btcValue}

${championship ? 'Worth every sat.' : 'Close, but no cigar.'}`,

        `Championship-caliber roster for ${btcValue}?

That's what the ${year} ${team} cost in real terms.

Today you can't even get a bench player for that.`
      ];
    }
  },

  {
    id: 'trade-value',
    name: 'Trade Value Comparison',
    generate: (data) => {
      const { player1, player2, year, valueDiff } = data;

      return [
        `${year}: ${player1} traded for ${player2}

Value difference: ${valueDiff}

One team understood value. The other... didn't.`,

        `Remember when ${player1} got traded for ${player2}?

In Bitcoin terms, that was a ${valueDiff} swing.

GMs: study Austrian economics.`
      ];
    }
  },

  {
    id: 'rookie-contract',
    name: 'Rookie Contract Era Comparison',
    generate: (data) => {
      const { vintagePlayer, modernPlayer, vintageAmount, modernAmount, vintageBTC, modernBTC } = data;

      return [
        `Rookie deals then vs now:

${vintagePlayer}: ${vintageAmount} → ${vintageBTC}
${modernPlayer}: ${modernAmount} → ${modernBTC}

The old rookie made ${(parseFloat(vintageBTC) / parseFloat(modernBTC)).toFixed(1)}x more in real terms.

Fiat debasement in action.`,

        `${vintagePlayer}'s rookie contract: ${vintageBTC}
${modernPlayer}'s rookie contract: ${modernBTC}

Which rookie got the better deal?

Hint: It's not the new guy.`,

        `Modern NBA rookies think they're rich.

${modernPlayer}: ${modernAmount} (${modernBTC})
${vintagePlayer}: ${vintageAmount} (${vintageBTC})

Not even close in real terms.`
      ];
    }
  }
];

export default quickHitTemplates;
