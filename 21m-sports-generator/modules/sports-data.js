import axios from 'axios';

/**
 * Sports Data Module
 * Fetches real-time sports contracts, signings, and player data
 */

class SportsData {
  constructor() {
    // ESPN API endpoints (unofficial but functional)
    this.espnBaseURL = 'https://site.api.espn.com/apis/site/v2/sports';

    // Manual data for common contracts (fallback)
    this.contractDatabase = this.initializeContractDatabase();
  }

  /**
   * Get recent NBA news and transactions
   */
  async getNBANews() {
    try {
      const response = await axios.get(
        `${this.espnBaseURL}/basketball/nba/news`
      );
      return response.data.articles || [];
    } catch (error) {
      console.error('Error fetching NBA news:', error.message);
      return [];
    }
  }

  /**
   * Get recent NFL news and transactions
   */
  async getNFLNews() {
    try {
      const response = await axios.get(
        `${this.espnBaseURL}/football/nfl/news`
      );
      return response.data.articles || [];
    } catch (error) {
      console.error('Error fetching NFL news:', error.message);
      return [];
    }
  }

  /**
   * Get recent MLB news and transactions
   */
  async getMLBNews() {
    try {
      const response = await axios.get(
        `${this.espnBaseURL}/baseball/mlb/news`
      );
      return response.data.articles || [];
    } catch (error) {
      console.error('Error fetching MLB news:', error.message);
      return [];
    }
  }

  /**
   * Search for contract-related news across all sports
   */
  async getRecentContracts() {
    try {
      const [nbaNews, nflNews, mlbNews] = await Promise.all([
        this.getNBANews(),
        this.getNFLNews(),
        this.getMLBNews()
      ]);

      const allNews = [...nbaNews, ...nflNews, ...mlbNews];

      // Filter for contract-related news
      const contractNews = allNews.filter(article => {
        const text = (article.headline + ' ' + (article.description || '')).toLowerCase();
        return text.includes('contract') ||
               text.includes('signs') ||
               text.includes('deal') ||
               text.includes('extension') ||
               text.includes('trade');
      });

      return contractNews.slice(0, 10);
    } catch (error) {
      console.error('Error fetching recent contracts:', error.message);
      return [];
    }
  }

  /**
   * Get a random historical contract for comparison
   * @param {string} sport - 'NBA', 'NFL', or 'MLB'
   * @param {string} era - 'modern' (2020+), 'recent' (2010-2019), 'classic' (2000-2009), 'vintage' (pre-2000)
   */
  getHistoricalContract(sport = null, era = null) {
    let contracts = this.contractDatabase;

    if (sport) {
      contracts = contracts.filter(c => c.sport.toLowerCase() === sport.toLowerCase());
    }

    if (era) {
      const year = new Date().getFullYear();
      contracts = contracts.filter(c => {
        const contractYear = new Date(c.date).getFullYear();
        switch (era) {
          case 'modern': return contractYear >= 2020;
          case 'recent': return contractYear >= 2010 && contractYear < 2020;
          case 'classic': return contractYear >= 2000 && contractYear < 2010;
          case 'vintage': return contractYear < 2000;
          default: return true;
        }
      });
    }

    return contracts[Math.floor(Math.random() * contracts.length)];
  }

  /**
   * Get contracts for comparison (one old, one new)
   * Only uses contracts from Bitcoin era (2010+) for better comparisons
   */
  getContractPair(sport = null) {
    const vintage = this.getHistoricalContract(sport, 'recent'); // 2010-2019
    const modern = this.getHistoricalContract(sport, 'modern'); // 2020+

    return { vintage, modern };
  }

  /**
   * Initialize contract database with notable deals
   */
  initializeContractDatabase() {
    return [
      // NBA - Vintage
      {
        player: 'Michael Jordan',
        team: 'Chicago Bulls',
        amount: 33000000,
        date: '1997-07-01',
        sport: 'NBA',
        type: 'Salary',
        notable: 'Highest NBA salary at the time'
      },
      {
        player: 'Shaquille O\'Neal',
        team: 'Los Angeles Lakers',
        amount: 121000000,
        date: '1996-07-18',
        sport: 'NBA',
        type: '7-year contract',
        notable: 'Huge free agent signing'
      },
      {
        player: 'Kevin Garnett',
        team: 'Minnesota Timberwolves',
        amount: 126000000,
        date: '1997-10-01',
        sport: 'NBA',
        type: '6-year extension',
        notable: 'First $100M+ NBA contract'
      },

      // NBA - Classic (2000s)
      {
        player: 'Kobe Bryant',
        team: 'Los Angeles Lakers',
        amount: 136400000,
        date: '2004-07-15',
        sport: 'NBA',
        type: '7-year extension',
        notable: 'Post-Shaq extension'
      },
      {
        player: 'LeBron James',
        team: 'Cleveland Cavaliers',
        amount: 60000000,
        date: '2007-07-12',
        sport: 'NBA',
        type: '3-year extension',
        notable: 'First LeBron extension'
      },
      {
        player: 'Allen Iverson',
        team: 'Philadelphia 76ers',
        amount: 76000000,
        date: '2003-08-04',
        sport: 'NBA',
        type: '4-year extension',
        notable: 'Post-MVP deal'
      },

      // NBA - Recent (2010s)
      {
        player: 'Stephen Curry',
        team: 'Golden State Warriors',
        amount: 201000000,
        date: '2017-07-01',
        sport: 'NBA',
        type: '5-year extension',
        notable: 'First $200M+ contract'
      },
      {
        player: 'Russell Westbrook',
        team: 'Oklahoma City Thunder',
        amount: 206000000,
        date: '2017-09-29',
        sport: 'NBA',
        type: '5-year extension',
        notable: 'Post-MVP supermax'
      },
      {
        player: 'James Harden',
        team: 'Houston Rockets',
        amount: 228000000,
        date: '2017-07-08',
        sport: 'NBA',
        type: '6-year extension',
        notable: 'Massive extension'
      },

      // NBA - Modern (2020s)
      {
        player: 'Jaylen Brown',
        team: 'Boston Celtics',
        amount: 304000000,
        date: '2023-07-25',
        sport: 'NBA',
        type: '5-year extension',
        notable: 'Richest contract in NBA history'
      },
      {
        player: 'Nikola Jokic',
        team: 'Denver Nuggets',
        amount: 276000000,
        date: '2022-07-01',
        sport: 'NBA',
        type: '5-year extension',
        notable: 'Supermax for MVP'
      },
      {
        player: 'Anthony Davis',
        team: 'Los Angeles Lakers',
        amount: 190000000,
        date: '2020-12-03',
        sport: 'NBA',
        type: '5-year extension',
        notable: 'Post-championship deal'
      },

      // NFL - Vintage
      {
        player: 'Brett Favre',
        team: 'Green Bay Packers',
        amount: 47250000,
        date: '1997-03-01',
        sport: 'NFL',
        type: '7-year extension',
        notable: 'Highest paid player'
      },
      {
        player: 'Drew Bledsoe',
        team: 'New England Patriots',
        amount: 103000000,
        date: '2001-03-08',
        sport: 'NFL',
        type: '10-year extension',
        notable: 'First $100M NFL contract'
      },

      // NFL - Classic (2000s)
      {
        player: 'Peyton Manning',
        team: 'Indianapolis Colts',
        amount: 98000000,
        date: '2004-03-05',
        sport: 'NFL',
        type: '7-year extension',
        notable: 'Record QB contract'
      },
      {
        player: 'Michael Vick',
        team: 'Atlanta Falcons',
        amount: 130000000,
        date: '2004-12-23',
        sport: 'NFL',
        type: '10-year extension',
        notable: 'Massive QB deal'
      },

      // NFL - Recent (2010s)
      {
        player: 'Aaron Rodgers',
        team: 'Green Bay Packers',
        amount: 134000000,
        date: '2018-08-29',
        sport: 'NFL',
        type: '4-year extension',
        notable: 'Highest paid player at signing'
      },
      {
        player: 'Russell Wilson',
        team: 'Seattle Seahawks',
        amount: 140000000,
        date: '2019-04-16',
        sport: 'NFL',
        type: '4-year extension',
        notable: 'Record QB deal'
      },

      // NFL - Modern (2020s)
      {
        player: 'Patrick Mahomes',
        team: 'Kansas City Chiefs',
        amount: 450000000,
        date: '2020-07-06',
        sport: 'NFL',
        type: '10-year extension',
        notable: 'Largest contract in sports history'
      },
      {
        player: 'Joe Burrow',
        team: 'Cincinnati Bengals',
        amount: 275000000,
        date: '2023-09-07',
        sport: 'NFL',
        type: '5-year extension',
        notable: 'Huge QB extension'
      },
      {
        player: 'Lamar Jackson',
        team: 'Baltimore Ravens',
        amount: 260000000,
        date: '2023-04-27',
        sport: 'NFL',
        type: '5-year extension',
        notable: 'Self-negotiated deal'
      },

      // MLB - Vintage
      {
        player: 'Alex Rodriguez',
        team: 'Texas Rangers',
        amount: 252000000,
        date: '2000-12-11',
        sport: 'MLB',
        type: '10-year contract',
        notable: 'First $250M+ contract'
      },
      {
        player: 'Derek Jeter',
        team: 'New York Yankees',
        amount: 189000000,
        date: '2000-02-08',
        sport: 'MLB',
        type: '10-year extension',
        notable: 'Yankees legend deal'
      },

      // MLB - Classic (2000s)
      {
        player: 'Albert Pujols',
        team: 'Los Angeles Angels',
        amount: 240000000,
        date: '2011-12-08',
        sport: 'MLB',
        type: '10-year contract',
        notable: 'Massive free agent deal'
      },
      {
        player: 'Robinson Cano',
        team: 'Seattle Mariners',
        amount: 240000000,
        date: '2013-12-06',
        sport: 'MLB',
        type: '10-year contract',
        notable: 'Record 2B contract'
      },

      // MLB - Recent (2010s)
      {
        player: 'Bryce Harper',
        team: 'Philadelphia Phillies',
        amount: 330000000,
        date: '2019-02-28',
        sport: 'MLB',
        type: '13-year contract',
        notable: 'Record free agent deal'
      },
      {
        player: 'Manny Machado',
        team: 'San Diego Padres',
        amount: 300000000,
        date: '2019-02-21',
        sport: 'MLB',
        type: '10-year contract',
        notable: 'Huge free agent deal'
      },

      // MLB - Modern (2020s)
      {
        player: 'Shohei Ohtani',
        team: 'Los Angeles Dodgers',
        amount: 700000000,
        date: '2023-12-09',
        sport: 'MLB',
        type: '10-year contract',
        notable: 'Largest contract in sports history'
      },
      {
        player: 'Aaron Judge',
        team: 'New York Yankees',
        amount: 360000000,
        date: '2022-12-21',
        sport: 'MLB',
        type: '9-year contract',
        notable: 'Yankees record deal'
      },
      {
        player: 'Juan Soto',
        team: 'New York Mets',
        amount: 765000000,
        date: '2024-12-08',
        sport: 'MLB',
        type: '15-year contract',
        notable: 'Surpassed Ohtani\'s deal'
      }
    ];
  }
}

export default SportsData;
