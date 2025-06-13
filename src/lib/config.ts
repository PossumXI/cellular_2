export const config = {
  algorand: {
    apiToken: import.meta.env.VITE_ALGORAND_API_TOKEN || '',
    mainnetApi: 'https://mainnet-api.4160.nodely.io',
    mainnetIndexer: 'https://mainnet-idx.4160.nodely.io',
    network: 'mainnet' as 'mainnet' | 'testnet',
    appId: parseInt(import.meta.env.VITE_ALGORAND_APP_ID || '0', 10)
  },
  google: {
    mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    geminiApiKey: import.meta.env.VITE_GOOGLE_GEMINI_API_KEY || '',
    geminiApiFallback: import.meta.env.VITE_GOOGLE_GEMINI_FALLBACK_KEY || ''
  },
  elevenlabs: {
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || ''
  },
  telefonica: {
    clientId: import.meta.env.VITE_TELEFONICA_CLIENT_ID || '0c1d5575-331f-4f52-9a97-f68e8f766478',
    clientSecret: import.meta.env.VITE_TELEFONICA_CLIENT_SECRET || '1cad99bd-cc0c-4b85-a169-03cf61dde70b',
    redirectUrl: import.meta.env.VITE_TELEFONICA_REDIRECT_URL || 'https://sprightly-longma-1e7a4a.netlify.app/',
    baseUrl: 'https://sandbox.opengateway.telefonica.com'
  },
  speedtest: {
    apiKey: import.meta.env.VITE_SPEEDTEST_API_KEY || '',
    domainName: import.meta.env.VITE_SPEEDTEST_DOMAIN || 'sprightly-longma-1e7a4a.netlify.app'
  },
  openweather: {
    apiKey: import.meta.env.VITE_OPENWEATHER_API_KEY || ''
  },
  newsdata: {
    apiKey: import.meta.env.VITE_NEWSDATA_API_KEY || ''
  },
  newsapi: {
    apiKey: import.meta.env.VITE_NEWS_API_KEY || ''
  },
  twitter: {
    apiKey: import.meta.env.VITE_TWITTER_API_KEY || '',
    apiSecret: import.meta.env.VITE_TWITTER_API_SECRET || '',
    bearerToken: import.meta.env.VITE_TWITTER_BEARER_TOKEN || ''
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    serviceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
  },
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID || ''
  },
  app: {
    freeDailyLimit: 10,
    premiumDailyLimit: 1000,
    premiumPrice: 3.00
  }
};