/**
 * eBay Browse API Client - Modern RESTful API
 * Better than Finding API: faster, more features, better filters
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class EbayBrowseAPI {
  constructor() {
    // Load credentials
    const credentials = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8')
    );

    this.appId = credentials.appId;
    this.certId = credentials.certId;
    this.baseUrl = 'api.ebay.com';
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth access token (cached)
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.appId}:${this.certId}`).toString('base64');
      const postData = 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope';

      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: '/identity/v1/oauth2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
          'Content-Length': postData.length
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            this.token = result.access_token;
            this.tokenExpiry = Date.now() + (result.expires_in * 1000) - 60000; // Refresh 1min early
            resolve(this.token);
          } else {
            reject(new Error(`OAuth failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * Search for items using Browse API
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} - Array of items
   */
  async search(params) {
    try {
      const token = await this.getAccessToken();

      const {
        keywords,
        categoryId,
        minPrice,
        maxPrice,
        condition,
        limit = 200
      } = params;

      // Build query
      let query = keywords;

      // Add filters
      const filters = [];

      if (categoryId) {
        filters.push(`categoryIds:${categoryId}`);
      }

      if (minPrice !== undefined && minPrice !== null || maxPrice !== undefined && maxPrice !== null) {
        let priceFilter;
        if ((minPrice !== undefined && minPrice !== null) && (maxPrice !== undefined && maxPrice !== null)) {
          priceFilter = `[${minPrice}..${maxPrice}]`;
        } else if (minPrice !== undefined && minPrice !== null) {
          priceFilter = `[${minPrice}..]`;  // No upper limit
        } else {
          priceFilter = `[..${maxPrice}]`;  // No lower limit
        }
        filters.push(`price:${priceFilter}`);
      }

      if (condition) {
        // Browse API conditions: NEW, USED_EXCELLENT, USED_VERY_GOOD, etc.
        filters.push(`conditions:{NEW|UNSPECIFIED}`);
      }

      // Add filters to query
      if (filters.length > 0) {
        query += '&filter=' + filters.join(',');
      }

      // Build search path
      const searchPath = `/buy/browse/v1/item_summary/search?q=${encodeURIComponent(keywords)}&limit=${limit}`;
      const filterParam = filters.length > 0 ? `&filter=${encodeURIComponent(filters.join(','))}` : '';

      return new Promise((resolve, reject) => {
        const options = {
          hostname: this.baseUrl,
          port: 443,
          path: searchPath + filterParam,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              const items = result.itemSummaries || [];
              resolve(items.map(item => this.transformItem(item)));
            } else {
              console.error(`Search failed: ${res.statusCode}`);
              console.error(data);
              resolve([]);
            }
          });
        });

        req.on('error', (error) => {
          console.error('Request error:', error.message);
          resolve([]);
        });

        req.end();
      });

    } catch (error) {
      console.error('Search error:', error.message);
      return [];
    }
  }

  /**
   * Transform Browse API item to consistent format
   * @param {Object} item - Browse API item
   * @returns {Object} - Transformed item
   */
  transformItem(item) {
    const price = parseFloat(item.price?.value || 0);
    const shippingCost = parseFloat(item.shippingOptions?.[0]?.shippingCost?.value || 0);

    return {
      itemId: item.itemId || '',
      title: item.title || '',
      currentPrice: price,
      shippingCost: shippingCost,
      totalPrice: parseFloat((price + shippingCost).toFixed(2)),
      condition: item.condition || 'Unknown',
      imageUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '',
      viewItemURL: item.itemWebUrl || item.itemAffiliateWebUrl || '',
      location: item.itemLocation?.city || '',
      country: item.itemLocation?.country || '',
      sellerUsername: item.seller?.username || '',
      sellerFeedbackScore: item.seller?.feedbackScore || 0,
      sellerPositivePercent: item.seller?.feedbackPercentage || 0,
      bidCount: item.bidCount || 0,
      listingType: item.buyingOptions?.[0] || 'UNKNOWN',

      // Additional Browse API features
      categoryPath: item.categories?.[0]?.categoryName || '',
      itemEndDate: item.itemEndDate || null,
      availableQuantity: item.estimatedAvailabilities?.[0]?.estimatedAvailableQuantity || 0
    };
  }
}

module.exports = EbayBrowseAPI;
