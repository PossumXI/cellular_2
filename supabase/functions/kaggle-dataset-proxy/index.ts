import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Environment variables for Kaggle API credentials
const KAGGLE_USERNAME = Deno.env.get("KAGGLE_USERNAME") || "";
const KAGGLE_KEY = Deno.env.get("KAGGLE_KEY") || "";

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
    const { action, datasetId, category, query } = body;
    
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if Kaggle credentials are configured
    if (!KAGGLE_USERNAME || !KAGGLE_KEY) {
      return new Response(JSON.stringify({ 
        error: "Kaggle API credentials not configured",
        mockMode: true,
        message: "Running in mock mode. Add KAGGLE_USERNAME and KAGGLE_KEY to your environment variables for real API access."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route to appropriate action
    switch (action) {
      case "search":
        return await searchDatasets(query, category);
      case "download":
        return await downloadDataset(datasetId);
      case "metadata":
        return await getDatasetMetadata(datasetId);
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error in Kaggle dataset proxy:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Search for datasets on Kaggle
 */
async function searchDatasets(query: string, category?: string) {
  try {
    const url = `https://www.kaggle.com/api/v1/datasets/list?search=${encodeURIComponent(query)}${category ? `&group=${encodeURIComponent(category)}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${btoa(`${KAGGLE_USERNAME}:${KAGGLE_KEY}`)}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Kaggle API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error searching Kaggle datasets:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      mockMode: true,
      message: "Using mock data due to API error"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

/**
 * Download a dataset from Kaggle
 */
async function downloadDataset(datasetId: string) {
  try {
    const url = `https://www.kaggle.com/api/v1/datasets/download/${datasetId}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${btoa(`${KAGGLE_USERNAME}:${KAGGLE_KEY}`)}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Kaggle API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.arrayBuffer();
    
    return new Response(data, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${datasetId}.zip"`,
      },
    });
  } catch (error) {
    console.error("Error downloading Kaggle dataset:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      mockMode: true,
      message: "Using mock data due to API error"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

/**
 * Get metadata for a Kaggle dataset
 */
async function getDatasetMetadata(datasetId: string) {
  try {
    const url = `https://www.kaggle.com/api/v1/datasets/view/${datasetId}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${btoa(`${KAGGLE_USERNAME}:${KAGGLE_KEY}`)}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Kaggle API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting Kaggle dataset metadata:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      mockMode: true,
      message: "Using mock data due to API error"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}