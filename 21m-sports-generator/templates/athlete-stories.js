/**
 * Athlete Wealth Story Templates
 * Time preference lessons from sports
 */

export const athleteStoryTemplates = [
  {
    id: 'bankruptcy-story',
    name: 'Athlete Bankruptcy Story',
    generate: (data) => {
      const { player, sport, earned, lost, years, cause } = data;

      return [
        // Variation 1: Timeline
        `${player} earned ${earned} during his ${sport} career.

${years} years later: Bankrupt.

Why? ${cause}

High time preference destroys wealth.
Low time preference builds it.

Choose wisely.`,

        // Variation 2: Stat focus
        `${player}: ${earned} career earnings
Time to broke: ${years} years
Cause: ${cause}

This is what happens when you don't understand money.

Sound money fixes this.`,

        // Variation 3: Lesson format
        `Let's talk about ${player}.

Earned: ${earned}
Lost: Everything
Timeline: ${years} years
How: ${cause}

The lesson: High time preference is expensive.

Bitcoin teaches you to think long-term.`,

        // Variation 4: Brutal reality
        `${player} made ${earned} in the ${sport}.

Then lost it all in ${years} years.

${cause}

78% of NFL players. 60% of NBA players.
Same story, different names.

Fix the money, fix the incentives.`
      ];
    }
  },

  {
    id: 'success-story',
    name: 'Athlete Wealth Success',
    generate: (data) => {
      const { player, sport, earned, netWorth, strategy, years } = data;

      return [
        `${player} did it right.

${sport} earnings: ${earned}
Current net worth: ${netWorth}

Strategy: ${strategy}

Low time preference wins.`,

        `While most athletes go broke, ${player} built an empire.

Earned in ${sport}: ${earned}
Worth today: ${netWorth}
How: ${strategy}

This is what sound money thinking looks like.`,

        `${player}'s wealth playbook:

1. Earn ${earned} in the ${sport}
2. ${strategy}
3. Grow to ${netWorth}
4. Retire rich

It's not complicated. It's discipline.`,

        `${years} years after retirement, ${player} is worth ${netWorth}.

Started with ${earned} from ${sport}.
Built it through ${strategy}.

Time preference matters.`
      ];
    }
  },

  {
    id: 'comparison-story',
    name: 'Two Athletes, Two Outcomes',
    generate: (data) => {
      const { player1, player2, earned1, earned2, outcome1, outcome2, lesson } = data;

      return [
        `Same era. Same sport. Different outcomes.

${player1}: Earned ${earned1} → ${outcome1}
${player2}: Earned ${earned2} → ${outcome2}

The difference? ${lesson}`,

        `Tale of two athletes:

${player1} made ${earned1}. ${outcome1}
${player2} made ${earned2}. ${outcome2}

Money doesn't care about your jersey number.
${lesson}`,

        `${player1} vs ${player2}

Career earnings: ${earned1} vs ${earned2}
Today: ${outcome1} vs ${outcome2}

${lesson}

Choose your path.`
      ];
    }
  },

  {
    id: 'bad-investment',
    name: 'Athlete Bad Investment',
    generate: (data) => {
      const { player, investment, amountLost, year } = data;

      return [
        `${player} lost ${amountLost} on ${investment} in ${year}.

Classic high time preference move.

Don't be ${player}.`,

        `${year}: ${player} invests ${amountLost} in ${investment}.

Result: Total loss.

If only there was a way to save in something scarce, portable, and censorship-resistant...

Oh wait.`,

        `Bad investment hall of fame:

${player} → ${investment} → ${amountLost} lost

Sound money doesn't have these problems.`
      ];
    }
  },

  {
    id: 'advisor-scam',
    name: 'Athlete Advisor Scam',
    generate: (data) => {
      const { player, advisor, amountStolen, outcome } = data;

      return [
        `${player} trusted ${advisor} with his money.

Amount stolen: ${amountStolen}
Outcome: ${outcome}

Your keys, your coins.
Not your keys, not your coins.

This applies to more than just Bitcoin.`,

        `${player}: "${advisor} will handle my money"

${advisor}: *steals ${amountStolen}*

${player}: ${outcome}

Self-custody isn't just for Bitcoin.
It's for everything you value.`,

        `Financial advisor scam:

Victim: ${player}
Thief: ${advisor}
Amount: ${amountStolen}
Result: ${outcome}

Trust the protocol, not the person.`
      ];
    }
  },

  {
    id: 'lifestyle-inflation',
    name: 'Lifestyle Inflation Trap',
    generate: (data) => {
      const { player, salary, spending, items } = data;

      return [
        `${player}'s salary: ${salary}/year

Spending:
${items.map(item => `→ ${item}`).join('\n')}

Total: ${spending}

This is how you go from rich to broke.
High time preference in action.`,

        `${player} made ${salary} a year.

Bought: ${items.join(', ')}
Cost: ${spending}

Revenue: ${salary}
Expenses: ${spending}

Math doesn't lie.`,

        `Lifestyle inflation kills wealth.

${player}:
Makes: ${salary}
Spends: ${spending}

On: ${items.join(', ')}

The opposite of low time preference.`
      ];
    }
  }
];

export default athleteStoryTemplates;
