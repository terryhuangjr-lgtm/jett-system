/**
 * eBay Finding API Client - Direct REST API calls
 * Uses eBay Finding API via direct HTTP requests
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class EbayFindingAPI {
  constructor() {
    // Load credentials
    const credentials = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8')
    );

    this.appId = credentials.appId;
    this.baseUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';
  }

  /**
   * Search for items using Finding API with native eBay filters
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} - Array of items
   */
  async findItems(params) {
    const {
      keywords,
      categoryId,
      minPrice,
      maxPrice,
      condition = null,              // null = all conditions, or: 'New', 'Used', 'Unspecified'
      listingType = ['Auction', 'FixedPrice'],
      topRatedOnly = false,
      returnsOnly = false,
      freeShippingOnly = false,
      locatedIn = null,              // null = all countries, or country code (e.g., 'US')
      hideDuplicates = true,
      excludeSellers = [],
      sortOrder = 'EndTimeSoonest',
      excludeKeywords = [],
      maxResults = 100
    } = params;

    try {
      // Build Finding API request
      const requestParams = {
        'OPERATION-NAME': 'findItemsAdvanced',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'REST-PAYLOAD': true,
        'keywords': keywords,
        'paginationInput.entriesPerPage': maxResults,
        'sortOrder': sortOrder
      };

      // Add category filter
      if (categoryId) {
        requestParams['categoryId'] = categoryId;
      }

      // Add item filters (using eBay's native filters)
      let filterIndex = 0;

      // Price filters
      if (minPrice) {
        requestParams[`itemFilter(${filterIndex}).name`] = 'MinPrice';
        requestParams[`itemFilter(${filterIndex}).value`] = minPrice;
        filterIndex++;
      }

      if (maxPrice) {
        requestParams[`itemFilter(${filterIndex}).name`] = 'MaxPrice';
        requestParams[`itemFilter(${filterIndex}).value`] = maxPrice;
        filterIndex++;
      }

      // Condition filter (FIXED: now configurable, not hardcoded)
      if (condition) {
        requestParams[`itemFilter(${filterIndex}).name`] = 'Condition';
        if (Array.isArray(condition)) {
          condition.forEach((cond, i) => {
            requestParams[`itemFilter(${filterIndex}).value(${i})`] = cond;
          });
        } else {
          requestParams[`itemFilter(${filterIndex}).value`] = condition;
        }
        filterIndex++;
      }

      // Listing type
      requestParams[`itemFilter(${filterIndex}).name`] = 'ListingType';
      if (Array.isArray(listingType)) {
        listingType.forEach((type, i) => {
          requestParams[`itemFilter(${filterIndex}).value(${i})`] = type;
        });
      } else {
        requestParams[`itemFilter(${filterIndex}).value`] = listingType;
      }
      filterIndex++;

      // Top-rated sellers only
      if (topRatedOnly) {
        requestParams[`itemFilter(${filterIndex}).name`] = 'TopRatedSellerOnly';
        requestParams[`itemFilter(${filterIndex}).value`] = 'true';
        filterIndex++;
      }

      // Returns accepted only
      if (returnsOnly) {
        requestParams[`itemFilter(${filterIndex}).name`] = 'ReturnsAcceptedOnly';
        requestParams[`itemFilter(${filterIndex}).value`] = 'true';
        filterIndex++;
      }

      // Free shipping only
      if (freeShippingOnly) {
        requestParams[`itemFilter(${filterIndex}).name`] = 'FreeShippingOnly';
        requestParams[`itemFilter(${filterIndex}).value`] = 'true';
        filterIndex++;
      }

      // Located in (country filter)
      if (locatedIn) {
        requestParams[`itemFilter(${filterIndex}).name`] = 'LocatedIn';
        requestParams[`itemFilter(${filterIndex}).value`] = locatedIn;
        filterIndex++;
      }

      // Hide duplicate items
      if (hideDuplicates) {
        requestParams[`itemFilter(${filterIndex}).name`] = 'HideDuplicateItems';
        requestParams[`itemFilter(${filterIndex}).value`] = 'true';
        filterIndex++;
      }

      // Exclude specific sellers
      if (excludeSellers.length > 0) {
        excludeSellers.forEach((seller, i) => {
          requestParams[`itemFilter(${filterIndex}).name`] = 'ExcludeSeller';
          requestParams[`itemFilter(${filterIndex}).value(${i})`] = seller;
        });
        filterIndex++;
      }

      // Make API request
      const response = await axios.get(this.baseUrl, {
        params: requestParams,
        timeout: 15000
      });

      // Parse response
      const data = response.data;

      // Check for errors
      if (data.errorMessage) {
        console.error('API Error:', JSON.stringify(data.errorMessage, null, 2));
        console.error('Full response:', JSON.stringify(data, null, 2));
        return [];
      }

      // Extract items
      const searchResult = data.findItemsAdvancedResponse?.[0]?.searchResult?.[0];

      if (!searchResult || searchResult['@count'] === '0') {
        return [];
      }

      let items = searchResult.item || [];

      // Filter out excluded keywords
      if (excludeKeywords.length > 0) {
        items = items.filter(item => {
          const title = (item.title?.[0] || '').toLowerCase();
          return !excludeKeywords.some(keyword =>
            title.includes(keyword.toLowerCase())
          );
        });
      }

      // Transform items
      return items.map(item => this.transformItem(item));

    } catch (error) {
      console.error('Error calling Finding API:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
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
      const requestParams = {
        'OPERATION-NAME': 'findCompletedItems',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'REST-PAYLOAD': true,
        'keywords': keywords,
        'paginationInput.entriesPerPage': 50,
        'sortOrder': 'EndTimeSoonest',
        'itemFilter(0).name': 'SoldItemsOnly',
        'itemFilter(0).value': 'true'
      };

      const response = await axios.get(this.baseUrl, {
        params: requestParams,
        timeout: 15000
      });

      const data = response.data;

      if (data.errorMessage) {
        console.error('API Error:', JSON.stringify(data.errorMessage, null, 2));
        return [];
      }

      const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];

      if (!searchResult || searchResult['@count'] === '0') {
        return [];
      }

      const items = searchResult.item || [];
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

    // Parse time left
    const timeLeft = item.sellingStatus?.[0]?.timeLeft?.[0] || '';
    const endTime = this.parseTimeLeft(timeLeft);

    return {
      itemId: item.itemId?.[0] || '',
      title: item.title?.[0] || '',
      currentPrice: currentPrice,
      shippingCost: shippingCost,
      totalPrice: parseFloat((currentPrice + shippingCost).toFixed(2)),
      timeLeft: timeLeft,
      endTime: endTime,
      listingType: item.listingInfo?.[0]?.listingType?.[0] || '',
      condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
      imageUrl: item.galleryURL?.[0] || item.pictureURLLarge?.[0] || '',
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

    const match = timeLeft.match(/P(\d+)DT(\d+)H(\d+)M/);
    if (!match) return timeLeft;

    const [, days, hours, minutes] = match;
    const d = parseInt(days);
    const h = parseInt(hours);
    const m = parseInt(minutes);

    if (d > 0) {
      return `${d}d ${h}h`;
    } else if (h > 0) {
      return `${h}h ${m}m`;
    } else {
      return `${m}m`;
    }
  }
}

module.exports = EbayFindingAPI;
