/**
 * eBay API Client
 * Fast, reliable access to eBay data using official API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class eBayClient {
  constructor(config = {}) {
    this.config = this.loadConfig(config);

    if (!this.config.appId && !this.config.clientId) {
      throw new Error('eBay API credentials required. Run: node setup.js');
    }

    // Use Finding API (simpler) or Browse API (more advanced)
    this.useFindingAPI = !!this.config.appId;
    this.useBrowseAPI = !!this.config.clientId;
  }

  loadConfig(overrides) {
    const configPath = path.join(__dirname, 'config.json');
    let fileConfig = {};

    try {
      if (fs.existsSync(configPath)) {
        fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch (error) {
      // Config file doesn't exist yet
    }

    // Merge: overrides > file > env > defaults
    return {
      appId: overrides.appId || fileConfig.appId || process.env.EBAY_APP_ID || null,
      clientId: overrides.clientId || fileConfig.clientId || process.env.EBAY_CLIENT_ID || null,
      clientSecret: overrides.clientSecret || fileConfig.clientSecret || process.env.EBAY_CLIENT_SECRET || null,
      sandbox: overrides.sandbox || fileConfig.sandbox || false,
      globalId: overrides.globalId || fileConfig.globalId || 'EBAY-US',
      ...overrides
    };
  }

  // Search for items using Finding API
  async search(query, options = {}) {
    if (!this.config.appId) {
      throw new Error('Finding API requires appId. Run: node setup.js');
    }

    const params = {
      'OPERATION-NAME': 'findItemsByKeywords',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': this.config.appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': query,
      'paginationInput.entriesPerPage': options.limit || 100,
      'paginationInput.pageNumber': options.page || 1,
      'sortOrder': options.sortOrder || 'BestMatch'
    };

    // Add filters
    if (options.minPrice) {
      params['itemFilter(0).name'] = 'MinPrice';
      params['itemFilter(0).value'] = options.minPrice;
    }
    if (options.maxPrice) {
      params['itemFilter(1).name'] = 'MaxPrice';
      params['itemFilter(1).value'] = options.maxPrice;
    }
    if (options.condition) {
      const filterIndex = options.minPrice || options.maxPrice ? 2 : 0;
      params[`itemFilter(${filterIndex}).name`] = 'Condition';
      params[`itemFilter(${filterIndex}).value`] = options.condition;
    }

    const url = this.buildFindingAPIUrl(params);
    const response = await this.makeRequest(url);

    return this.parseFindingResponse(response);
  }

  // Get specific item details
  async getItem(itemId) {
    if (!this.config.appId) {
      throw new Error('Finding API requires appId. Run: node setup.js');
    }

    const params = {
      'OPERATION-NAME': 'findItemsAdvanced',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': this.config.appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'itemFilter(0).name': 'ListingType',
      'itemFilter(0).value': 'All',
      'productId.@type': 'ReferenceID',
      'productId': itemId
    };

    const url = this.buildFindingAPIUrl(params);
    const response = await this.makeRequest(url);

    return this.parseFindingResponse(response);
  }

  // Find items by category
  async findByCategory(categoryId, options = {}) {
    if (!this.config.appId) {
      throw new Error('Finding API requires appId. Run: node setup.js');
    }

    const params = {
      'OPERATION-NAME': 'findItemsByCategory',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': this.config.appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'categoryId': categoryId,
      'paginationInput.entriesPerPage': options.limit || 100,
      'paginationInput.pageNumber': options.page || 1
    };

    const url = this.buildFindingAPIUrl(params);
    const response = await this.makeRequest(url);

    return this.parseFindingResponse(response);
  }

  buildFindingAPIUrl(params) {
    const baseUrl = this.config.sandbox
      ? 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
      : 'https://svcs.ebay.com/services/search/FindingService/v1';

    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return `${baseUrl}?${queryString}`;
  }

  makeRequest(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(new Error('Failed to parse eBay API response'));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  parseFindingResponse(response) {
    try {
      const result = response.findItemsByKeywordsResponse
        || response.findItemsAdvancedResponse
        || response.findItemsByCategoryResponse;

      if (!result || !result[0]) {
        throw new Error('Invalid API response');
      }

      const searchResult = result[0].searchResult;
      if (!searchResult || !searchResult[0]) {
        return {
          success: false,
          error: 'No results found',
          items: [],
          count: 0
        };
      }

      const items = searchResult[0].item || [];
      const count = parseInt(searchResult[0]['@count']) || 0;

      return {
        success: true,
        count: count,
        items: items.map(item => this.formatItem(item))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        items: [],
        count: 0
      };
    }
  }

  formatItem(item) {
    const sellingStatus = item.sellingStatus?.[0] || {};
    const shippingInfo = item.shippingInfo?.[0] || {};
    const listingInfo = item.listingInfo?.[0] || {};

    return {
      itemId: item.itemId?.[0],
      title: item.title?.[0],
      url: item.viewItemURL?.[0],
      image: item.galleryURL?.[0] || item.pictureURLLarge?.[0],
      price: {
        value: parseFloat(sellingStatus.currentPrice?.[0].__value__) || 0,
        currency: sellingStatus.currentPrice?.[0]['@currencyId'] || 'USD'
      },
      condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
      location: item.location?.[0] || 'Unknown',
      shipping: {
        cost: parseFloat(shippingInfo.shippingServiceCost?.[0].__value__) || 0,
        type: shippingInfo.shippingType?.[0] || 'Unknown'
      },
      listingType: listingInfo.listingType?.[0] || 'Unknown',
      startTime: listingInfo.startTime?.[0],
      endTime: listingInfo.endTime?.[0],
      watchCount: parseInt(listingInfo.watchCount?.[0]) || 0,
      seller: {
        username: item.sellerInfo?.[0]?.sellerUserName?.[0],
        feedbackScore: parseInt(item.sellerInfo?.[0]?.feedbackScore?.[0]) || 0,
        positiveFeedbackPercent: parseFloat(item.sellerInfo?.[0]?.positiveFeedbackPercent?.[0]) || 0
      }
    };
  }

  // Get price statistics for a search query
  async getPriceStats(query, options = {}) {
    const results = await this.search(query, { limit: 100, ...options });

    if (!results.success || results.items.length === 0) {
      return {
        success: false,
        error: 'No items found'
      };
    }

    const prices = results.items.map(item => item.price.value).sort((a, b) => a - b);

    return {
      success: true,
      query: query,
      count: prices.length,
      min: prices[0],
      max: prices[prices.length - 1],
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      median: prices[Math.floor(prices.length / 2)],
      items: results.items
    };
  }
}

module.exports = eBayClient;
