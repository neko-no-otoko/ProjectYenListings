/**
 * Japanese Property Data Source Connectors
 * 
 * This module provides connectors for major Japanese property data sources:
 * 
 * - **REINFOLIB (MLIT)**: Government API - FREE, official transaction data
 * - **LIFULL HOMES**: Commercial portal - Most scraper-friendly
 * - **Yahoo!不動産**: Commercial portal - Good balance of data/access
 * - **SUUMO**: Commercial portal - Largest database but restrictive
 * 
 * @module connectors
 */

// REINFOLIB - Government API (Recommended primary source)
export { 
  ReinfolibClient,
  type ReinfolibConfig,
  type XIT001Params,
  type XIT002Response,
  type XPT002Params,
  type RealEstateTransaction,
  type LandPricePoint,
  PREFECTURE_CODES as REINFOLIB_PREFECTURE_CODES,
  REQUIRED_CREDIT_TEXT,
  REQUIRED_CREDIT_TEXT_EN,
  validateXIT001Params,
  exampleAkiyaResearch,
} from './reinfolib-connector';

// LIFULL HOMES - Commercial portal (Recommended for scraping)
export {
  LifullHomesConnector,
  type LifullHomesConfig,
  type LifullListing,
  type LifullDetail,
  PREFECTURE_SLUGS as LIFULL_PREFECTURE_SLUGS,
} from './lifull-connector';

// Yahoo! Real Estate - Commercial portal
export {
  YahooRealEstateConnector,
  type YahooRealEstateConfig,
  type YahooListing,
  type YahooDetail,
  PREFECTURE_CODES as YAHOO_PREFECTURE_CODES,
  REGION_CODES as YAHOO_REGION_CODES,
} from './yahoo-realestate-connector';

// SUUMO - Commercial portal (Use with caution)
export {
  SuumoConnector,
  type SuumoConfig,
  type SuumoListing,
} from './suumo-connector';

// Re-export existing connectors for convenience
export { AtHomeScraper } from './athome-scraper';

/**
 * Connector usage priority for production:
 * 
 * 1. REINFOLIB (API) - Always use first
 *    - Official government data
 *    - Free with registration
 *    - No scraping needed
 * 
 * 2. LIFULL HOMES (Scraping) - Secondary source
 *    - Most scraper-friendly
 *    - Good rural coverage
 *    - Conservative rate limits recommended
 * 
 * 3. Yahoo! Real Estate (Scraping) - Tertiary source
 *    - Moderate anti-bot measures
 *    - Good data quality
 * 
 * 4. SUUMO (Scraping) - Last resort
 *    - Aggressive anti-bot
 *    - Largest database
 *    - Consider partnership instead
 */

/**
 * Quick start example:
 * 
 * ```typescript
 * import { ReinfolibClient, LifullHomesConnector } from './connectors';
 * 
 * // 1. Use REINFOLIB API (primary source)
 * const reinfolib = new ReinfolibClient({ 
 *   apiKey: process.env.REINFOLIB_API_KEY 
 * });
 * const transactions = await reinfolib.getRealEstateTransactions({
 *   year: 2023,
 *   quarter: 1,
 *   area: '32', // Shimane
 * });
 * 
 * // 2. Use LIFULL HOMES scraping (secondary)
 * const lifull = new LifullHomesConnector();
 * const listings = await lifull.fetch({
 *   prefecture: 'shimane',
 *   propertyType: 'kodate',
 * });
 * ```
 */
