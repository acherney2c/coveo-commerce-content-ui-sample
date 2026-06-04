import { CurrencyCodeISO4217 } from '@coveo/relay-event-types';

/**
 * Sample environment targeting the public Coveo `searchuisamples` org.
 *
 * Content sources available:
 *  - "Coveo Samples - Youtube BBC News" (filetype: YouTubeVideo, YouTubePlaylist)
 *  - "Coveo Sample - ListCountries"     (objecttype: Country, etc.)
 *
 * To connect your own org: set useSampleConfig to false, configure tokenEndpoint,
 * and set up .env with your API key.
 */

const contentFields = {
  article: {
    description: 'ytdescription',
    featuredImage: 'ytthumbnailurl',
  },
  store: {
    address: 'province',
  },
} as const;

export const environment = {
  /**
   * true  → Uses Coveo's built-in sample org. No .env or token server needed.
   *         Just run: npm run dev
   * false → Uses your org via the token server. Requires tokenEndpoint, .env,
   *         and `npm start`.
   */
  useSampleConfig: true,
  debug: true,

  /**
   * Token server URL. Only required when useSampleConfig is false.
   */
  tokenEndpoint: 'http://localhost:3021/token',

  // Must match PLATFORM_URL in .env (server uses it for token generation,
  // frontend uses it for admin console links like Relevance Inspector).
  platformUrl: 'https://platform.cloud.coveo.com',
  organizationId: 'searchuisamples',
  imageBaseUrl: '',
  contentSearchHub: 'default',
  contentSearchTabField: 'source',
  contentFields,
  contentSearchTabs: [
    {
      key: 'articles',
      id: 'Articles',
      label: 'Videos',
      countField: 'filetype',
      countValue: 'YouTubeVideo',
      cqExpression: '@source=="Coveo Samples - Youtube BBC News" @filetype==YouTubeVideo',
    },
    {
      key: 'posts',
      id: 'Posts',
      label: 'Playlists',
      countField: 'filetype',
      countValue: 'YouTubePlaylist',
      cqExpression: '@source=="Coveo Samples - Youtube BBC News" @filetype==YouTubePlaylist',
    },
    {
      key: 'stores',
      id: 'Stores',
      label: 'Stores',
      countField: 'source',
      countValue: 'Coveo Sample - ListCountries',
      cqExpression: '@source=="Coveo Sample - ListCountries"',
    },
  ] as const,
  analytics: {
    trackingId: 'sports-ui-samples',
  },
  context: {
    language: 'en',
    country: 'US',
    currency: 'USD' as CurrencyCodeISO4217,
    view: {
      url: 'https://sports.barca.group',
    },
  },
  listing: {
    urls: [
      'https://sports.barca.group/browse/promotions/clothing/pants',
      'https://sports.barca.group/browse/promotions/surf-accessories',
      'https://sports.barca.group/browse/promotions/accessories/towels',
      'https://sports.barca.group/browse/promotions/paddleboards',
      'https://sports.barca.group/browse/promotions/toys'
    ],
  },
  // Uncomment and populate to enable multi-store pricing via dictionaryFieldContext:
  // storeOptions: [
  //   { id: 'store-a', code: 'store-a', label: 'Store A' },
  //   { id: 'store-b', code: 'store-b', label: 'Store B' },
  // ],
  storeOptions: [] as Array<{ id: string; code: string; label: string }>,
  // Optional: field name for stock availability display on product cards.
  // Set to your org's stock field (e.g. 'ec_stock_availability') or leave empty to disable.
  stockAvailabilityField: '',
  recommendations: {
    homeSlotId: 'd73afbd2-8521-4ee6-a9b8-31f064721e73',
    cartSlotId: 'd8118c04-ff59-4f03-baca-2fc5f3b81221',
    productListingSlotId: 'd73afbd2-8521-4ee6-a9b8-31f064721e73',
    productDetailSlotId: '70592e70-9e3e-4a53-87b9-3912404ae3e2',
  },
};
