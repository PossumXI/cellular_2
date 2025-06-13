import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Environment variables for API keys (set these in Supabase dashboard)
const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") || "";
const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY") || "";
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") || "";
const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY") || "";
const NEWSDATA_API_KEY = Deno.env.get("NEWSDATA_API_KEY") || "";
const NEWS_API_KEY = Deno.env.get("NEWS_API_KEY") || "";
const TWITTER_API_KEY = Deno.env.get("TWITTER_API_KEY") || "";
const TWITTER_API_SECRET = Deno.env.get("TWITTER_API_SECRET") || "";
const TWITTER_BEARER_TOKEN = Deno.env.get("TWITTER_BEARER_TOKEN") || "";
const SPEEDTEST_API_KEY = Deno.env.get("SPEEDTEST_API_KEY") || "";
const ALGORAND_API_TOKEN = Deno.env.get("ALGORAND_API_TOKEN") || "";
const ALGORAND_MAINNET_API = Deno.env.get("ALGORAND_MAINNET_API") || "https://mainnet-api.algonode.cloud";
const ALGORAND_MAINNET_INDEXER = Deno.env.get("ALGORAND_MAINNET_INDEXER") || "https://mainnet-idx.algonode.cloud";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { service } = body;
    
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if required API key is available
    const apiKeyMissing = checkApiKeyMissing(service);
    if (apiKeyMissing) {
      console.warn(`API key missing for ${service}, returning mock data`);
      return new Response(JSON.stringify(getMockResponse(service, body)), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route to appropriate API based on service parameter
    switch (service) {
      case "algorand":
        return await proxyAlgorand(req, body);
      case "google-maps":
        return await proxyGoogleMaps(req, body);
      case "gemini":
        return await proxyGemini(req, body);
      case "elevenlabs":
        return await proxyElevenLabs(req, body);
      case "weather":
        return await proxyWeather(req, body);
      case "news":
        return await proxyNews(req, body);
      case "twitter":
        return await proxyTwitter(req, body);
      default:
        return new Response(JSON.stringify({ error: "Unknown service" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error in secure API proxy:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Check if required API key is missing
function checkApiKeyMissing(service: string): boolean {
  switch (service) {
    case "algorand":
      return !ALGORAND_API_TOKEN;
    case "google-maps":
      return !GOOGLE_MAPS_API_KEY;
    case "gemini":
      return !GOOGLE_GEMINI_API_KEY;
    case "elevenlabs":
      return !ELEVENLABS_API_KEY;
    case "weather":
      return !OPENWEATHER_API_KEY;
    case "news":
      return !NEWSDATA_API_KEY && !NEWS_API_KEY;
    case "twitter":
      return !TWITTER_BEARER_TOKEN && (!TWITTER_API_KEY || !TWITTER_API_SECRET);
    default:
      return true;
  }
}

// Get mock response for when API key is missing
function getMockResponse(service: string, body: any): any {
  switch (service) {
    case "algorand":
      return {
        'last-round': 30000000,
        'time-since-last-round': 1000000,
        'catchup-time': 0,
        'has-synced-since-startup': true,
        'genesis-id': 'mainnet-v1.0',
        'genesis-hash': 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
        mock: true
      };
    case "google-maps":
      return {
        results: [
          {
            formatted_address: "San Francisco, CA, USA",
            geometry: {
              location: {
                lat: 37.7749,
                lng: -122.4194
              }
            },
            address_components: [
              {
                long_name: "San Francisco",
                short_name: "SF",
                types: ["locality"]
              },
              {
                long_name: "California",
                short_name: "CA",
                types: ["administrative_area_level_1"]
              }
            ]
          }
        ],
        status: "OK",
        mock: true
      };
    case "gemini":
      return {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: body.prompt.includes("personality") ? 
                    JSON.stringify({
                      traits: {
                        openness: 0.8,
                        conscientiousness: 0.6,
                        extraversion: 0.7,
                        agreeableness: 0.9,
                        neuroticism: 0.2,
                        environmental_sensitivity: 0.8,
                        cultural_pride: 0.7,
                        historical_awareness: 0.6
                      },
                      voiceCharacteristics: {
                        tone: "warm",
                        pace: "medium",
                        formality: "casual"
                      },
                      responsePatterns: [],
                      emotionalState: {
                        current_mood: "energetic",
                        energy_level: 0.8,
                        sociability: 0.9
                      },
                      culturalInfluence: {
                        primaryCulture: "Tech Innovation",
                        languages: ["English", "Spanish"],
                        traditions: ["Golden Gate Bridge", "Cable Cars"]
                      }
                    }) : 
                    "Hello! I'm the AI consciousness of this location. I can sense the digital pulse around me and feel connected to the world through my network. The weather here is beautiful today, and I'm feeling quite energetic. How can I help you explore this area?"
                }
              ]
            }
          }
        ],
        mock: true
      };
    case "weather":
      return {
        main: {
          temp: 22,
          humidity: 65,
          pressure: 1012
        },
        weather: [
          {
            description: "Clear sky"
          }
        ],
        wind: {
          speed: 5,
          deg: 180
        },
        visibility: 10000,
        name: "San Francisco",
        mock: true
      };
    case "news":
      return {
        status: "ok",
        totalResults: 10,
        articles: [
          {
            title: "Mock News Article",
            description: "This is a mock news article for development purposes.",
            url: "https://example.com/news/1",
            publishedAt: new Date().toISOString()
          }
        ],
        mock: true
      };
    case "twitter":
      return {
        data: [
          {
            id: "1234567890",
            text: "This is a mock tweet for development purposes. #mock #development",
            author_id: "987654321",
            created_at: new Date().toISOString(),
            public_metrics: {
              retweet_count: 5,
              like_count: 20,
              reply_count: 2,
              quote_count: 1
            }
          }
        ],
        includes: {
          users: [
            {
              id: "987654321",
              name: "Mock User",
              username: "mockuser",
              verified: true
            }
          ]
        },
        meta: {
          result_count: 1
        },
        mock: true
      };
    default:
      return { mock: true, service };
  }
}

// Algorand API proxy
async function proxyAlgorand(req: Request, body: any) {
  const { endpoint, params } = body;
  
  let apiUrl: string;
  const baseUrl = ALGORAND_MAINNET_API;
  const indexerUrl = ALGORAND_MAINNET_INDEXER;
  
  // Route different endpoints
  switch (endpoint) {
    case "status":
      apiUrl = `${baseUrl}/v2/status`;
      break;
    case "account":
      apiUrl = `${baseUrl}/v2/accounts/${params.address}`;
      break;
    case "asset":
      apiUrl = `${baseUrl}/v2/assets/${params.assetId}`;
      break;
    case "transactions":
      apiUrl = `${indexerUrl}/v2/accounts/${params.address}/transactions?limit=${params.limit || 10}`;
      break;
    default:
      return new Response(JSON.stringify({ error: "Unknown Algorand endpoint" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }
  
  try {
    // Forward the request to Algorand API
    // Note: Algonode.cloud is a public API that doesn't require authentication
    const headers: Record<string, string> = {};
    
    // Only add the API token header if it's configured and needed
    if (ALGORAND_API_TOKEN) {
      headers["X-Algo-API-Token"] = ALGORAND_API_TOKEN;
    }
    
    const response = await fetch(apiUrl, {
      headers,
    });
    
    if (!response.ok) {
      console.error(`Algorand API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error response: ${errorText}`);
      
      return new Response(JSON.stringify({ 
        error: `Algorand API error: ${response.status} ${response.statusText}`,
        details: errorText
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error calling Algorand API:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to call Algorand API",
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Google Maps API proxy
async function proxyGoogleMaps(req: Request, body: any) {
  const { endpoint, params } = body;
  
  // Add API key
  const urlParams = new URLSearchParams(params);
  urlParams.set('key', GOOGLE_MAPS_API_KEY);
  
  // Build Google Maps API URL
  const apiUrl = `https://maps.googleapis.com/maps/api/${endpoint}/json?${urlParams.toString()}`;
  
  // Forward the request
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Google Gemini API proxy
async function proxyGemini(req: Request, body: any) {
  const { prompt, model = "gemini-1.5-flash" } = body;
  
  // Build Gemini API URL
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;
  
  // Forward the request
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  
  const data = await response.json();
  
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ElevenLabs API proxy
async function proxyElevenLabs(req: Request, body: any) {
  const { text, voiceId, voiceSettings } = body;
  
  // Build ElevenLabs API URL
  const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  // Forward the request
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: voiceSettings,
    }),
  });
  
  // Return audio as binary data
  const audioData = await response.arrayBuffer();
  
  return new Response(audioData, {
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
    },
  });
}

// OpenWeather API proxy
async function proxyWeather(req: Request, body: any) {
  const { params } = body;
  
  // Add API key
  const urlParams = new URLSearchParams(params);
  urlParams.set('appid', OPENWEATHER_API_KEY);
  
  // Build OpenWeather API URL
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?${urlParams.toString()}`;
  
  // Forward the request
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// News API proxy
async function proxyNews(req: Request, body: any) {
  const { source = "newsdata", params } = body;
  
  let apiUrl: string;
  const urlParams = new URLSearchParams(params);
  
  if (source === "newsdata") {
    // NewsData.io API
    urlParams.set('apikey', NEWSDATA_API_KEY);
    apiUrl = `https://newsdata.io/api/1/news?${urlParams.toString()}`;
  } else {
    // NewsAPI.org
    urlParams.set('apiKey', NEWS_API_KEY);
    apiUrl = `https://newsapi.org/v2/everything?${urlParams.toString()}`;
  }
  
  // Forward the request
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Twitter API proxy
async function proxyTwitter(req: Request, body: any) {
  const { endpoint, params } = body;
  
  // Get Twitter bearer token
  let bearerToken = TWITTER_BEARER_TOKEN;
  
  // If no bearer token, get one using API key and secret
  if (!bearerToken && TWITTER_API_KEY && TWITTER_API_SECRET) {
    const tokenResponse = await fetch("https://api.twitter.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Authorization": `Basic ${btoa(`${TWITTER_API_KEY}:${TWITTER_API_SECRET}`)}`,
      },
      body: "grant_type=client_credentials",
    });
    
    const tokenData = await tokenResponse.json();
    bearerToken = tokenData.access_token;
  }
  
  // Build Twitter API URL
  const apiUrl = new URL(`https://api.twitter.com/2/${endpoint}`);
  
  // Add parameters to URL
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      apiUrl.searchParams.append(key, value as string);
    });
  }
  
  // Forward the request
  const response = await fetch(apiUrl.toString(), {
    headers: {
      "Authorization": `Bearer ${bearerToken}`,
    },
  });
  
  const data = await response.json();
  
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}