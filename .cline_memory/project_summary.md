# Project Summary: ItsEarth.org & DeepWiki (as of 2025-06-13)

## I. Core Vision
ItsEarth.org aims to be a platform for visualizing and analyzing global data, featuring:
- Advanced 3D Earth (multiple map modes, data layers like EPIC, population, connectivity, war zones).
- Real-time data integration (social media, network performance, geopolitical events).
- Simulation capabilities (movement, outcomes).
- DeepWiki AI: For Q&A, prediction, control, insights, data analytics/organization, using a "Tree of Knowledge" (Supabase data, Kaggle datasets, external APIs).

## II. Key Recent Updates
1.  **Python Data Pipeline (`scripts/deepmind_earth_enhancer.py`)**:
    *   Loads dataset configs from `scripts/dataset_configs.json`.
    *   Skips problematic Kaggle datasets (no mock data fallback).
    *   Fetches from Supabase tables (e.g., `location_memories`).
    *   Processes `location_memories` into text chunks.
    *   Integrated Google Gemini API for embedding generation (requires `GOOGLE_GEMINI_API_KEY` env var).
    *   Added logic to store embeddings in Supabase (`knowledge_vectors` table).
    *   `scripts/requirements.txt` updated with `google-generativeai`.
2.  **3D Earth Visualization (`src/components/Earth3D/`)**:
    *   `EnhancedEarth.tsx` & `EarthTextureLoader.tsx` updated for `mapMode`-specific base textures.
    *   `nasaService.ts` created (APOD, Mars Rover, EPIC Earth imagery).
    *   `EpicImageLayer.tsx` created and integrated into `EnhancedEarth.tsx` & `GoogleEarthControls.tsx`.
    *   `WarZones.tsx` updated to fetch data from a new `conflict_zones` Supabase table.
3.  **Application Core (`App.tsx`)**:
    *   Landing page text and action buttons updated (now includes "Ask DeepWiki", "Simulation Center").
    *   State management for new features added.
    *   Type error for `LocationCell.lastInteraction` (Date vs. string) resolved.
4.  **TypeScript Environment**: Believed to be stable after dependency refresh.

## III. Key Database Tables
1.  **`public.location_memories`**: Stores core location data, personality, voice profiles (via JSONB).
2.  **`public.knowledge_vectors`** (New for RAG): Stores text chunks and their vector embeddings. Requires `pgvector`. Schema: `id (uuid), created_at, source_table, source_record_id, text_chunk, embedding (vector(768)), model_used, metadata (jsonb)`.
3.  **`public.conflict_zones`** (New for War Mapping): Stores conflict zone details. Schema includes `name, description, coordinates (point), geometry (jsonb), status, casualties_estimated, start_date`, etc.
4.  **Analytics Tables**: `location_interactions`, `network_analytics`, `twitter_analytics`, etc.

## IV. Immediate Next Steps

1.  **Finalize & Test Python Data Pipeline for RAG**:
    *   **User Action**:
        *   Set `GOOGLE_GEMINI_API_KEY` environment variable for the Python script.
        *   Run `pip install -r scripts/requirements.txt` (from `e:/project/scripts` or `e:/project` if path is relative).
        *   Create the `knowledge_vectors` table in Supabase (SQL provided previously) and enable `pgvector`.
        *   Create and populate the `conflict_zones` table in Supabase (SQL provided previously).
    *   **Cline/User Joint Action**:
        *   Test `python scripts/deepmind_earth_enhancer.py --mode populate_kb_locations`. Verify data fetching, chunking, Gemini embedding calls, and storage in `knowledge_vectors`.
        *   Refine `process_location_memory_to_chunks` based on actual `location_memories` data structure and test results.

2.  **Develop Q&A Agent - Retrieval & Generation Service**:
    *   Design and implement the service (e.g., Supabase Edge Function or `src/lib/ai/deepWikiQAService.ts`).
    *   This service will:
        *   Take a user question.
        *   Generate question embedding (Gemini).
        *   Query `knowledge_vectors` for similar chunks (vector search).
        *   Construct prompt for LLM (Gemini) with question + context.
        *   Call LLM API for answer.
        *   Return answer.

3.  **Build DeepWiki UI**:
    *   Implement the UI for the "Ask DeepWiki" modal in `App.tsx`.

4.  **Test War Zone Feature**:
    *   After populating `conflict_zones` table, test the display of war zones in `WarZones.tsx`.

## V. Broader Future Enhancements (Post-Immediate Steps)
-   Develop Predictive Modeling Agents.
-   Build Data Analytics & Insight Generation Agent.
-   Design Orchestration & Task Delegation Layer for DeepWiki.
-   Enhance data collection (`dataCollector.ts`).
-   Refine global textures in `EarthTextureLoader.tsx`.
-   Implement other visualizations (movement simulation, social media mapping, connectivity mapping).
-   Add more content sections to the landing page.
-   Clean up any remaining TypeScript warnings (unused imports in `App.tsx`).
