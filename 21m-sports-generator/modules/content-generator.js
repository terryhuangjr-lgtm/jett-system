import BTCConverter from './btc-converter.js';
import SportsData from './sports-data.js';
import UsedContentTracker from './used-content-tracker.js';
import { contractComparisonTemplates } from '../templates/contract-comparison.js';
import { quickHitTemplates } from '../templates/quick-hits.js';
import { athleteStoryTemplates } from '../templates/athlete-stories.js';
import { educationalTemplates } from '../templates/educational.js';

/**
 * Main Content Generator
 * Combines data with templates to create ready-to-post content
 */

class ContentGenerator {
  constructor() {
    this.btc = new BTCConverter();
    this.sports = new SportsData();
    this.tracker = new UsedContentTracker();
    this.characterLimit = 280; // X/Twitter character limit
  }

  /**
   * Generate contract comparison content
   * @param {Object} options - {sport, era, template}
   */
  async generateContractComparison(options = {}) {
    try {
      const { sport, template } = options;

      // Get a pair of contracts to compare (avoiding recently used)
      const { vintage, modern } = this.getContractPairWithFilter(sport);
      
      // Mark as used
      this.tracker.markUsed('contracts', vintage.player);
      this.tracker.markUsed('contracts', modern.player);

      // Convert both to BTC
      const vintageData = await this.btc.convertToBTC(vintage.amount, vintage.date);
      const modernData = await this.btc.convertToBTC(modern.amount, modern.date);

      const data = {
        vintage,
        modern,
        vintageData,
        modernData
      };

      // Generate content from templates
      let posts = [];

      if (template) {
        const selectedTemplate = contractComparisonTemplates.find(t => t.id === template);
        if (selectedTemplate) {
          posts = selectedTemplate.generate(data);
        }
      } else {
        // Generate from all templates
        for (const tmpl of contractComparisonTemplates) {
          posts.push(...tmpl.generate(data));
        }
      }

      // Format and return
      return this.formatPosts(posts, {
        type: 'Contract Comparison',
        vintage: vintage.player,
        modern: modern.player,
        sources: [
          `Historical BTC price data: CoinGecko`,
          `Contract data: Sports reference databases`
        ],
        data: {
          vintageContract: `${vintage.player}: ${vintageData.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} (${vintage.date}) = ${vintageData.formatted}`,
          modernContract: `${modern.player}: ${modernData.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} (${modern.date}) = ${modernData.formatted}`,
          ratio: `${(vintageData.btc / modernData.btc).toFixed(2)}x difference in real terms`
        }
      });
    } catch (error) {
      console.error('Error generating contract comparison:', error);
      throw error;
    }
  }

  /**
   * Get contract pair avoiding recently used players
   */
  getContractPairWithFilter(sport = null) {
    const contracts = this.sports.contractDatabase.filter(c => {
      return !this.tracker.wasRecentlyUsed('contracts', c.player, 14);
    });
    
    // Fallback if all contracts used
    const pool = contracts.length >= 2 ? contracts : this.sports.contractDatabase;
    
    // Get random pair from filtered pool
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const vintage = shuffled.find(c => {
      const year = new Date(c.date).getFullYear();
      return year >= 2010 && year < 2020;
    }) || pool[0];
    
    const modern = shuffled.find(c => {
      const year = new Date(c.date).getFullYear();
      return year >= 2020;
    }) || pool[1] || pool[0];
    
    return { vintage, modern };
  }

  /**
   * Generate athlete wealth story content
   * @param {Object} options - {type: 'bankruptcy' | 'success', sport}
   */
  async generateAthleteStory(options = {}) {
    const { type = 'bankruptcy' } = options;

    // Athlete story database
    const stories = {
      bankruptcy: [
        {
          player: 'Vince Young',
          sport: 'NFL',
          earned: '$26M',
          lost: 'Everything',
          years: 2,
          cause: 'Private jets, entourage, $5K/week at Cheesecake Factory'
        },
        {
          player: 'Allen Iverson',
          sport: 'NBA',
          earned: '$200M+',
          lost: 'Nearly all',
          years: 5,
          cause: 'Entourage of 50+ people, jewelry, cars'
        },
        {
          player: 'Antoine Walker',
          sport: 'NBA',
          earned: '$110M',
          lost: '$12.7M',
          years: 2,
          cause: 'Real estate, jewelry, gambling, supporting 70+ people'
        },
        {
          player: 'Terrell Owens',
          sport: 'NFL',
          earned: '$80M',
          lost: 'Everything',
          years: 4,
          cause: 'Child support, bad investments, lifestyle'
        }
      ],
      success: [
        {
          player: 'Junior Bridgeman',
          sport: 'NBA',
          earned: '$350K career',
          netWorth: '$600M',
          strategy: 'Bought Wendy\'s franchises, built restaurant empire',
          years: 40
        },
        {
          player: 'David Robinson',
          sport: 'NBA',
          earned: '$110M career',
          netWorth: '$200M+',
          strategy: 'Private equity, real estate, venture capital',
          years: 20
        },
        {
          player: 'Roger Staubach',
          sport: 'NFL',
          earned: '$4M career',
          netWorth: '$600M',
          strategy: 'Real estate development, sold company for $613M',
          years: 30
        },
        {
          player: 'Magic Johnson',
          sport: 'NBA',
          earned: '$40M career',
          netWorth: '$620M',
          strategy: 'Starbucks franchises, theaters, investments',
          years: 30
        }
      ]
    };

    // Select story with filter to avoid recently used
    const story = this.tracker.getRandomWithFilter(stories[type], 'athletes', 14);
    
    // Mark as used
    this.tracker.markUsed('athletes', story.player);
    const template = athleteStoryTemplates.find(t =>
      type === 'bankruptcy' ? t.id === 'bankruptcy-story' : t.id === 'success-story'
    );

    const posts = template.generate(story);

    return this.formatPosts(posts, {
      type: `Athlete ${type === 'bankruptcy' ? 'Bankruptcy' : 'Success'} Story`,
      subject: story.player,
      sources: [
        `Sports business reporting`,
        `Public bankruptcy filings`,
        `Financial news archives`
      ],
      data: story
    });
  }

  /**
   * Generate quick hit content
   * @param {Object} options - {template}
   */
  async generateQuickHit(options = {}) {
    // Expand templates with more variety and use tracker
    const templateData = [
      {
        id: 'inflation-reality',
        data: {
          player: 'Michael Jordan',
          amount: '$33M',
          year: '1997',
          btcValue: '~47,000 BTC',
          currentValue: '$87M'
        }
      },
      {
        id: 'inflation-reality',
        data: {
          player: 'Alex Rodriguez',
          amount: '$252M',
          year: '2000',
          btcValue: 'Infinite (BTC was $0)',
          currentValue: '$620M+'
        }
      },
      {
        id: 'rookie-contract',
        data: {
          vintagePlayer: 'LeBron James (2003)',
          modernPlayer: 'Victor Wembanyama (2023)',
          vintageAmount: '$18.8M (4 years)',
          modernAmount: '$55M (4 years)',
          vintageBTC: '~3,000 BTC',
          modernBTC: '~2.1 BTC'
        }
      }
    ];

    // Filter out recently used
    const available = templateData.filter(t => {
      const player = t.data.player || t.data.vintagePlayer;
      return !this.tracker.wasRecentlyUsed('athletes', player, 14);
    });
    
    const pool = available.length > 0 ? available : templateData;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    
    // Mark as used
    const playerName = selected.data.player || selected.data.vintagePlayer;
    this.tracker.markUsed('athletes', playerName);
    const template = quickHitTemplates.find(t => t.id === selected.id);
    const posts = template.generate(selected.data);

    return this.formatPosts(posts, {
      type: 'Quick Hit',
      sources: [
        `Contract data: Spotrac, Basketball Reference`,
        `BTC prices: CoinGecko historical data`
      ],
      data: selected.data
    });
  }

  /**
   * Generate educational content
   * @param {Object} options - {topic}
   */
  async generateEducational(options = {}) {
    const topics = [
      {
        template: 'time-preference',
        data: {
          example: 'Antoine Walker earned $110M and went broke',
          highTP: 'Spend on cars, jewelry, entourage NOW',
          lowTP: 'Invest, save, build for the future'
        }
      },
      {
        template: 'fiat-debasement',
        data: {
          example: 'Average NFL salary',
          year1: '2000',
          amount1: '$1.1M',
          year2: '2024',
          amount2: '$3.5M',
          lesson: 'The salary tripled. But so did everything else.'
        }
      },
      {
        template: 'sound-money',
        data: {
          principle: 'Scarce money holds value',
          sportsExample: 'Why do vintage rookie cards appreciate? Limited supply.',
          outcome: 'Same reason Bitcoin works. You can\'t print more.'
        }
      },
      {
        template: 'macro-sports',
        data: {
          macroEvent: 'Fed cuts interest rates',
          sportsImpact: 'Team valuations soar, salary caps rise',
          connection: 'Cheap money inflates asset prices. Teams are assets.'
        }
      }
    ];

    const selected = topics[Math.floor(Math.random() * topics.length)];
    const template = educationalTemplates.find(t => t.id === selected.template);
    const posts = template.generate(selected.data);

    return this.formatPosts(posts, {
      type: 'Educational Content',
      topic: selected.template,
      sources: [
        `Economic theory: Austrian economics`,
        `Sports business data`
      ],
      data: selected.data
    });
  }

  /**
   * Generate content by weekly theme
   * @param {string} theme - '21m-monday', 'timechain-thursday', 'fiat-friday', etc.
   */
  async generateByTheme(theme) {
    const themeMap = {
      '21m-monday': () => this.generateContractComparison(),
      'timechain-thursday': () => this.generateContractComparison({ era: 'vintage' }),
      'fiat-friday': () => this.generateContractComparison(),
      'sat-stacking-saturday': () => this.generateEducational(),
      'sound-money-sunday': () => this.generateAthleteStory({ type: 'bankruptcy' })
    };

    const generator = themeMap[theme.toLowerCase()];
    if (!generator) {
      throw new Error(`Unknown theme: ${theme}`);
    }

    return await generator();
  }

  /**
   * Format posts for output
   */
  formatPosts(posts, metadata) {
    return posts.map((post, index) => {
      const charCount = post.length;
      const withinLimit = charCount <= this.characterLimit;

      return {
        id: index + 1,
        content: post,
        charCount,
        withinLimit,
        warning: !withinLimit ? `⚠️  ${charCount - this.characterLimit} characters over limit` : null,
        metadata
      };
    }).filter(post => post.withinLimit); // Only return posts within character limit
  }

  /**
   * Generate multiple content options at once
   */
  async generateMultipleOptions() {
    const options = await Promise.all([
      this.generateContractComparison(),
      this.generateAthleteStory({ type: 'bankruptcy' }),
      this.generateQuickHit(),
      this.generateEducational()
    ]);

    return {
      contractComparisons: options[0],
      athleteStories: options[1],
      quickHits: options[2],
      educational: options[3]
    };
  }
}

export default ContentGenerator;
