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
        excludeKeywords = [],
        condition,
        limit = 200
      } = params;

      // Build query
      let query = keywords;

      // Build negative keywords for eBay native filtering
      // eBay Browse API supports -(keyword) syntax in the q parameter
      // NOTE: Multi-word exclusions like "fan made" don't work - they act as OR
      const defaultExcludes = [
        'psa', 'bgs', 'cgc', 'sgc', 'graded', 'slab'
      ];
      
      // Handle both string and array for excludeKeywords
      let excludeArr = excludeKeywords;
      if (typeof excludeKeywords === 'string') {
        excludeArr = excludeKeywords ? excludeKeywords.split(',').map(k => k.trim()).filter(Boolean) : [];
      }
      
      // Only send core exclusions to eBay API (URL length limit)
      // Custom exclusions from config are handled by raw-card-filter.js post-processing
      const apiExcludes = defaultExcludes.slice(0, 8); // Limit to 8 for URL safety
      const negativeStr = apiExcludes.map(k => `-${k}`).join(' ');
      query = `${keywords} ${negativeStr}`;

      console.log('Search query sent to eBay:', query);

      // Add filters
      const filters = [];

      if (categoryId) {
        filters.push(`categoryIds:${categoryId}`);
      }

      if (minPrice !== undefined && minPrice !== null || 
          maxPrice !== undefined && maxPrice !== null) {
        let priceFilter;
        if ((minPrice !== undefined && minPrice !== null) && 
            (maxPrice !== undefined && maxPrice !== null)) {
          priceFilter = `price:[${minPrice}..${maxPrice}],priceCurrency:USD`;
        } else if (minPrice !== undefined && minPrice !== null) {
          priceFilter = `price:[${minPrice}..],priceCurrency:USD`;
        } else {
          priceFilter = `price:[..${maxPrice}],priceCurrency:USD`;
        }
        filters.push(priceFilter);
      }

      // Always filter to Buy It Now only - no auctions
      filters.push('buyingOptions:{FIXED_PRICE}');

      if (condition) {
        // Browse API conditions: NEW, USED_EXCELLENT, USED_VERY_GOOD, etc.
        filters.push(`conditions:{NEW|UNSPECIFIED}`);
      }

      // Build search path
      const searchPath = `/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=${limit}`;
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
            console.log('Response status:', res.statusCode);
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log('Total items in response:', result.itemSummaries?.length || 0);
              const items = result.itemSummaries || [];
              resolve(items.map(item => this.transformItem(item)));
            } else {
              console.error(`Search failed: ${res.statusCode}`);
              console.error('Response:', data.substring(0, 500));
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
