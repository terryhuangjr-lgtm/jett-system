import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BTC Price Converter Module
 * Converts USD amounts to BTC terms using historical and current prices
 */

class BTCConverter {
  constructor() {
    this.priceCache = new Map();
    this.coinGeckoBaseURL = 'https://api.coingecko.com/api/v3';

    // Load historical price data
    const dataPath = path.join(__dirname, '../data/btc-historical-prices.json');
    this.historicalData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }

  /**
   * Get current BTC price in USD
   */
  async getCurrentPrice() {
    try {
      const response = await axios.get(
        `${this.coinGeckoBaseURL}/simple/price?ids=bitcoin&vs_currencies=usd`
      );
      return response.data.bitcoin.usd;
    } catch (error) {
      // Fallback to most recent year in historical data
      const currentYear = new Date().getFullYear().toString();
      if (this.historicalData.prices[currentYear]) {
        console.log('Using fallback BTC price from historical data');
        return this.historicalData.prices[currentYear];
      }
      console.error('Error fetching current BTC price:', error.message);
      throw new Error('Failed to fetch current BTC price');
    }
  }

  /**
   * Get historical BTC price for a specific date
   * @param {string} date - Date in format 'DD-MM-YYYY' or Date object
   */
  async getHistoricalPrice(date) {
    const dateStr = this.formatDate(date);

    // Check cache first
    if (this.priceCache.has(dateStr)) {
      return this.priceCache.get(dateStr);
    }

    // Try API first
    try {
      const response = await axios.get(
        `${this.coinGeckoBaseURL}/coins/bitcoin/history?date=${dateStr}`
      );
      const price = response.data.market_data.current_price.usd;

      // Cache the result
      this.priceCache.set(dateStr, price);
      return price;
    } catch (error) {
      // Fallback to local historical data
      const year = new Date(date).getFullYear().toString();

      if (this.historicalData.prices[year] !== undefined) {
        const price = this.historicalData.prices[year];

        if (price === 0) {
          // Bitcoin didn't exist or had no meaningful price
          return null;
        }

        this.priceCache.set(dateStr, price);
        return price;
      }

      console.error(`No historical price data available for ${year}`);
      throw new Error(`Failed to fetch BTC price for ${dateStr}`);
    }
  }

  /**
   * Convert USD amount to BTC using historical price
   * @param {number} usdAmount - Amount in USD
   * @param {string|Date} date - Date for conversion
   */
  async convertToBTC(usdAmount, date = null) {
    try {
      const btcPrice = date
        ? await this.getHistoricalPrice(date)
        : await this.getCurrentPrice();

      // Handle pre-Bitcoin era
      if (btcPrice === null || btcPrice === 0) {
        return {
          usd: usdAmount,
          btc: null,
          btcPrice: null,
          date: date || new Date().toISOString().split('T')[0],
          formatted: 'Bitcoin didn\'t exist yet'
        };
      }

      const btcAmount = usdAmount / btcPrice;

      return {
        usd: usdAmount,
        btc: btcAmount,
        btcPrice: btcPrice,
        date: date || new Date().toISOString().split('T')[0],
        formatted: this.formatBTC(btcAmount)
      };
    } catch (error) {
      console.error('Conversion error:', error.message);
      throw error;
    }
  }

  /**
   * Compare contract values across different dates in BTC terms
   * @param {Object} contract1 - {amount, date, player}
   * @param {Object} contract2 - {amount, date, player}
   */
  async compareContracts(contract1, contract2) {
    try {
      const btc1 = await this.convertToBTC(contract1.amount, contract1.date);
      const btc2 = await this.convertToBTC(contract2.amount, contract2.date);

      return {
        contract1: {
          ...contract1,
          ...btc1
        },
        contract2: {
          ...contract2,
          ...btc2
        },
        comparison: {
          btcDifference: btc1.btc - btc2.btc,
          btcRatio: btc1.btc / btc2.btc,
          usdDifference: contract1.amount - contract2.amount,
          usdRatio: contract1.amount / contract2.amount
        }
      };
    } catch (error) {
      console.error('Contract comparison error:', error.message);
      throw error;
    }
  }

  /**
   * Calculate what a historical contract would be worth in today's BTC
   * @param {number} usdAmount - Original USD amount
   * @param {string|Date} originalDate - When contract was signed
   */
  async valueInTodaysBTC(usdAmount, originalDate) {
    try {
      const historical = await this.convertToBTC(usdAmount, originalDate);
      const current = await this.convertToBTC(usdAmount);

      return {
        original: historical,
        today: current,
        appreciation: {
          btcChange: current.btc - historical.btc,
          btcPercentChange: ((current.btc - historical.btc) / historical.btc) * 100,
          priceChange: current.btcPrice - historical.btcPrice,
          pricePercentChange: ((current.btcPrice - historical.btcPrice) / historical.btcPrice) * 100
        }
      };
    } catch (error) {
      console.error('Value comparison error:', error.message);
      throw error;
    }
  }

  /**
   * Format date to DD-MM-YYYY for CoinGecko API
   */
  formatDate(date) {
    if (!date) return null;

    const d = date instanceof Date ? date : new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }

  /**
   * Format BTC amount for display
   */
  formatBTC(btcAmount) {
    if (btcAmount >= 1) {
      return `${btcAmount.toFixed(2)} BTC`;
    } else if (btcAmount >= 0.01) {
      return `${btcAmount.toFixed(4)} BTC`;
    } else {
      // Show in sats for very small amounts
      const sats = btcAmount * 100000000;
      return `${sats.toFixed(0)} sats`;
    }
  }

  /**
   * Format USD amount for display
   */
  formatUSD(usdAmount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(usdAmount);
  }
}

export default BTCConverter;
