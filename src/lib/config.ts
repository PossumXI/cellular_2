export const config = {
  algorand: {
    apiToken: import.meta.env.VITE_ALGORAND_API_TOKEN || '98D9CE80660AD243893D56D9F125CD2D',
    mainnetApi: import.meta.env.VITE_ALGORAND_MAINNET_API || 'https://mainnet-api.4160.nodely.io',
    mainnetIndexer: import.meta.env.VITE_ALGORAND_MAINNET_INDEXER || 'https://mainnet-idx.4160.nodely.io',
    testnetApi: import.meta.env.VITE_ALGORAND_TESTNET_API || 'https://testnet-api.4160.nodely.io',
    testnetIndexer: import.meta.env.VITE_ALGORAND_TESTNET_INDEXER || 'https://testnet-idx.4160.nodely.io',
    network: 'mainnet' as 'mainnet' | 'testnet',
    appId: import.meta.env.VITE_ALGORAND_APP_ID ? parseInt(import.meta.env.VITE_ALGORAND_APP_ID) : 0
  },
  google: {
    mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCQ5R9HMgAIgi-KjX-DgdPgd1_XzNXz5C8',
    geminiApiKey: import.meta.env.VITE_GOOGLE_GEMINI_API_KEY || 'AIzaSyBBoNEG0ZnTCpQQJe7sfVefWcUJ8WEeZ1E',
    geminiApiFallback: import.meta.env.VITE_GOOGLE_GEMINI_FALLBACK_KEY || 'AIzaSyAqp9jeobEqq5UFx4yh2n80ZJSHNWB4ZDw'
  },
  elevenlabs: {
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || 'sk_c707406e1ff8193a118e555a453e1ca2ad0a5d56354a7bfa'
  },
  telefonica: {
    clientId: '0c1d5575-331f-4f52-9a97-f68e8f766478',
    clientSecret: '1cad99bd-cc0c-4b85-a169-03cf61dde70b',
    redirectUrl: 'https://sprightly-longma-1e7a4a.netlify.app/',
    baseUrl: 'https://sandbox.opengateway.telefonica.com'
  },
  speedtest: {
    apiKey: import.meta.env.VITE_SPEEDTEST_API_KEY || 'SOM68489f50d2195',
    domainName: import.meta.env.VITE_SPEEDTEST_DOMAIN || 'sprightly-longma-1e7a4a.netlify.app'
  },
  openweather: {
    apiKey: import.meta.env.VITE_OPENWEATHER_API_KEY || 'dc199c11deb0066da5fb66100aa5fff6'
  },
  newsdata: {
    apiKey: import.meta.env.VITE_NEWSDATA_API_KEY || 'pub_47ffacec0aae4a43a3094b00b6c70241'
  },
  newsapi: {
    apiKey: import.meta.env.VITE_NEWS_API_KEY || 'e0f2818f93424d2d96d0ac8525f0ecb1'
  },
  twitter: {
    apiKey: import.meta.env.VITE_TWITTER_API_KEY || 'pyLpyl2c026zTXxL28o8OIk6V',
    apiSecret: import.meta.env.VITE_TWITTER_API_SECRET || 'U8ReBo0EXPx3qk1sNd98JOfmKjLEKMwnsWxTgkcYJdxTDkrRm',
    bearerToken: import.meta.env.VITE_TWITTER_BEARER_TOKEN || ''
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://dsajyauvyrnqmjujnokd.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzYWp5YXV2eXJucW1qdWpub2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NzIwOTMsImV4cCI6MjA2NTE0ODA5M30._5P1CqP_rUV0-gtrtY9B5bRrXG6T8dyVT-wESImyIss'
  },
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51RYVzy04KGO2Foq1xNYanKX0FcEIGGTJSuRjzz1F9c0d6BBsDIpbnnTK1wsl0D5Fqz12HeyhpS1ZU1NMv8AFMxxy00IjmXBpmc',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID || 'price_premium_monthly'
  },
  app: {
    freeDailyLimit: 10,
    premiumDailyLimit: 1000,
    premiumPrice: 3.00
  }
};