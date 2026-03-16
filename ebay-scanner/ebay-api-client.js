/**
 * eBay API Client - Handles all eBay API interactions
 * Uses eBay Finding API for search and Shopping API for details
 */

const Ebay = require('ebay-node-api');
const fs = require('fs');
const path = require('path');

class EbayAPIClient {
  constructor() {
    // Load credentials
    const credentials = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8')
    );

    // Initialize eBay API
    this.ebay = new Ebay({
      clientID: credentials.appId,
      clientSecret: credentials.certId,
      body: {
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope'
      }
    });

    this.appId = credentials.appId;
  }

  /**
   * Search for items using Finding API with native eBay filters
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} - Array of items
   */
  async findItems(searchParams) {
    try {
      const {
        keywords,
        categoryId,
        minPrice,
        maxPrice,
        sortOrder = 'EndTimeSoonest',
        excludeKeywords = [],
        listingType = ['Auction', 'FixedPrice'],
        condition = null,              // FIXED: null = all conditions (no longer hardcoded to "New")
        topRatedOnly = false,
        returnsOnly = false,
        freeShippingOnly = false,
        locatedIn = null,
        hideDuplicates = true,
        excludeSellers = [],
        maxResults = 100
      } = searchParams;

      // Build search query
      const params = {
        keywords: keywords,
        categoryId: categoryId || '261328', // Sports Trading Cards
        sortOrder: sortOrder,
        paginationInput: {
          entriesPerPage: maxResults
        },
        itemFilter: []
      };

      // Add price filters
      if (minPrice) {
        params.itemFilter.push({
          name: 'MinPrice',
          value: minPrice
        });
      }
      if (maxPrice) {
        params.itemFilter.push({
          name: 'MaxPrice',
          value: maxPrice
        });
      }

      // Add condition filter (FIXED: now optional)
      if (condition) {
        params.itemFilter.push({
          name: 'Condition',
          value: condition
        });
      }

      // Add listing type filter
      if (listingType.length > 0) {
        params.itemFilter.push({
          name: 'ListingType',
          value: listingType
        });
      }

      // Add quality filters (native eBay filters)
      if (topRatedOnly) {
        params.itemFilter.push({
          name: 'TopRatedSellerOnly',
          value: true
        });
      }

      if (returnsOnly) {
        params.itemFilter.push({
          name: 'ReturnsAcceptedOnly',
          value: true
        });
      }

      if (freeShippingOnly) {
        params.itemFilter.push({
          name: 'FreeShippingOnly',
          value: true
        });
      }

      if (locatedIn) {
        params.itemFilter.push({
          name: 'LocatedIn',
          value: locatedIn
        });
      }

      if (hideDuplicates) {
        params.itemFilter.push({
          name: 'HideDuplicateItems',
          value: true
        });
      }

      if (excludeSellers.length > 0) {
        excludeSellers.forEach(seller => {
          params.itemFilter.push({
            name: 'ExcludeSeller',
            value: seller
          });
        });
      }

      // Make API call
      const response = await this.ebay.findItemsAdvanced(params);

      if (!response || !response[0] || !response[0].searchResult || !response[0].searchResult[0].item) {
        return [];
      }

      let items = response[0].searchResult[0].item || [];

      // Filter out items with excluded keywords
      if (excludeKeywords.length > 0) {
        items = items.filter(item => {
          const title = (item.title?.[0] || '').toLowerCase();
          return !excludeKeywords.some(keyword =>
            title.includes(keyword.toLowerCase())
          );
        });
      }

      // Transform items to consistent format
      return items.map(item => this.transformItem(item));

    } catch (error) {
      console.error('Error searching eBay:', error.message);
      throw error;
    }
  }

  /**
   * Get sold/completed listings for comp analysis
   * @param {String} keywords - Search keywords
   * @returns {Promise<Array>} - Array of sold items
   */
  async getSoldComps(keywords) {
    try {
      const params = {
        keywords: keywords,
        sortOrder: 'EndTimeSoonest',
        itemFilter: [
          {
            name: 'SoldItemsOnly',
            value: true
          }
        ],
        paginationInput: {
          entriesPerPage: 50
        }
      };

      const response = await this.ebay.findCompletedItems(params);

      if (!response || !response[0] || !response[0].searchResult || !response[0].searchResult[0].item) {
        return [];
      }

      const items = response[0].searchResult[0].item || [];
      return items.map(item => this.transformItem(item));

    } catch (error) {
      console.error('Error getting sold comps:', error.message);
      return [];
    }
  }

  /**
   * Transform raw eBay API item to clean format
   * @param {Object} item - Raw eBay item
   * @returns {Object} - Transformed item
   */
  transformItem(item) {
    const currentPrice = parseFloat(
      item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0
    );

    const shippingCost = parseFloat(
      item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || 0
    );

    // Extract time left
    const timeLeft = item.sellingStatus?.[0]?.timeLeft?.[0] || '';
    const endTime = this.parseTimeLeft(timeLeft);

    // Extract image URLs
    const imageUrl = item.galleryURL?.[0] || item.pictureURLLarge?.[0] || '';

    return {
      itemId: item.itemId?.[0] || '',
      title: item.title?.[0] || '',
      currentPrice: currentPrice,
      shippingCost: shippingCost,
      totalPrice: currentPrice + shippingCost,
      timeLeft: timeLeft,
      endTime: endTime,
      listingType: item.listingInfo?.[0]?.listingType?.[0] || '',
      condition: item.condition?.[0]?.conditionDisplayName?.[0] || '',
      imageUrl: imageUrl,
      viewItemURL: item.viewItemURL?.[0] || '',
      location: item.location?.[0] || '',
      country: item.country?.[0] || '',
      sellerUsername: item.sellerInfo?.[0]?.sellerUserName?.[0] || '',
      sellerFeedbackScore: parseInt(item.sellerInfo?.[0]?.feedbackScore?.[0] || 0),
      sellerPositivePercent: parseFloat(item.sellerInfo?.[0]?.positiveFeedbackPercent?.[0] || 0),
      bidCount: parseInt(item.sellingStatus?.[0]?.bidCount?.[0] || 0)
    };
  }

  /**
   * Parse eBay timeLeft format (e.g. "P0DT2H15M30S") to human readable
   * @param {String} timeLeft - eBay time left format
   * @returns {String} - Human readable time
   */
  parseTimeLeft(timeLeft) {
    if (!timeLeft) return 'Unknown';

    const match = timeLeft.match(/P(\d+)DT(\d+)H(\d+)M(\d+)S/);
    if (!match) return timeLeft;

    const [, days, hours, minutes] = match;

    if (parseInt(days) > 0) {
      return `${days}d ${hours}h`;
    } else if (parseInt(hours) > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

module.exports = EbayAPIClient;
