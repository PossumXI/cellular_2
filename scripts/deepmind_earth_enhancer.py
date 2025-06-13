#!/usr/bin/env python3
"""
DeepMind Earth Data Enhancer

This script enhances ItsEarth's location services and data quality by:
1. Connecting to Kaggle to import relevant geospatial and network datasets
2. Processing and cleaning the data for use with DeepMind models
3. Training specialized models to improve location predictions and data quality
4. Integrating the trained models with the ItsEarth database
5. Providing an API for the frontend to access enhanced predictions

Usage:
    python deepmind_earth_enhancer.py [--mode=train|predict|import|populate_kb_locations] [--dataset=DATASET_ID]
"""

import os
import sys
import json
import argparse
import logging
import requests
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union

import google.generativeai as genai

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("deepmind_earth_enhancer.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("DeepMindEarthEnhancer")

# Environment variables (would be set in production)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dsajyauvyrnqmjujnokd.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
KAGGLE_USERNAME = os.environ.get("KAGGLE_USERNAME", "")
KAGGLE_KEY = os.environ.get("KAGGLE_KEY", "")
GOOGLE_GEMINI_API_KEY = os.environ.get("GOOGLE_GEMINI_API_KEY")

class DeepMindEarthEnhancer:
    """Main class for enhancing Earth data using DeepMind models"""
    
    def __init__(self):
        self.datasets = self._load_dataset_configs()
        self.models = {}
        if not self.datasets:
            logger.error("Failed to load dataset configurations. Enhancer may not function correctly.")
        else:
            logger.info(f"DeepMind Earth Enhancer initialized with {len(self.datasets)} dataset configurations.")

    def _load_dataset_configs(self) -> Dict:
        """Loads dataset configurations from an external JSON file."""
        config_path = os.path.join(os.path.dirname(__file__), "dataset_configs.json")
        try:
            with open(config_path, 'r') as f:
                configs = json.load(f)
            logger.info(f"Successfully loaded dataset configurations from {config_path}")
            return configs
        except FileNotFoundError:
            logger.error(f"Dataset configuration file not found at {config_path}. No datasets will be processed.")
            return {}
        except json.JSONDecodeError:
            logger.error(f"Error decoding JSON from {config_path}. Please check its format. No datasets will be processed.")
            return {}
        except Exception as e:
            logger.error(f"An unexpected error occurred while loading dataset configurations: {e}")
            return {}

    def fetch_supabase_table_data(self, table_name: str, columns: List[str] = ["*"], limit: Optional[int] = None) -> Optional[List[Dict]]:
        """Fetches data from a specified Supabase table."""
        if not self.connect_to_supabase():
            logger.error(f"Cannot fetch data from Supabase table '{table_name}' due to connection issues.")
            return None

        select_columns = ",".join(columns)
        url = f"{SUPABASE_URL}/rest/v1/{table_name}?select={select_columns}"
        if limit is not None:
            url += f"&limit={limit}"

        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        }
        
        logger.info(f"Fetching data from Supabase table: {table_name} with columns: {select_columns} and limit: {limit}")
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            logger.info(f"Successfully fetched {len(data)} records from {table_name}.")
            return data
        except requests.exceptions.HTTPError as http_err:
            logger.error(f"HTTP error occurred while fetching from {table_name}: {http_err} - Response: {response.text}")
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Request exception occurred while fetching from {table_name}: {req_err}")
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to decode JSON response from {table_name}: {json_err}")
        except Exception as e:
            logger.error(f"An unexpected error occurred while fetching from {table_name}: {e}")
        return None

    def process_location_memory_to_chunks(self, record: Dict) -> List[str]:
        """Converts a location_memories record into descriptive text chunks based on SQL schema."""
        chunks = []
        location_name = record.get("location_name", "Unknown Location")
        location_id_text = record.get("location_id", "N/A") 
        db_id = record.get("id", "N/A")
        
        coords_raw = record.get("coordinates")
        longitude = "N/A"
        latitude = "N/A"
        if isinstance(coords_raw, dict):
            longitude = coords_raw.get("x", "N/A")
            latitude = coords_raw.get("y", "N/A")
        elif isinstance(coords_raw, str):
            try:
                lon_str, lat_str = coords_raw.strip("()").split(',')
                longitude = float(lon_str)
                latitude = float(lat_str)
            except ValueError:
                logger.warning(f"Could not parse coordinates string: {coords_raw} for {location_name}")

        last_interaction_str = record.get("last_interaction", "N/A")
        total_interactions = record.get("total_interactions", 0)
        blockchain_address = record.get("blockchain_address", "N/A")

        chunks.append(
            f"Location: {location_name} (Business ID: {location_id_text}, DB ID: {db_id}). "
            f"Coordinates: ({longitude}, {latitude}). "
            f"Last interaction: {last_interaction_str}. Total interactions: {total_interactions}. "
            f"Blockchain address: {blockchain_address}."
        )

        personality_data = record.get("personality_data")
        if personality_data and isinstance(personality_data, dict):
            traits = personality_data.get("traits", {})
            if traits:
                traits_str = ", ".join([f"{k.replace('_', ' ')}: {v*100:.0f}%" for k, v in traits.items()])
                chunks.append(f"The AI personality for {location_name} exhibits traits such as {traits_str}.")
            
            voice_char = personality_data.get("voiceCharacteristics", {})
            if voice_char:
                chunks.append(f"Its voice is typically {voice_char.get('tone', 'N/A')} and {voice_char.get('pace', 'N/A')}.")

            cultural = personality_data.get("culturalInfluence", {})
            if cultural:
                lang_str = ", ".join(cultural.get("languages", []))
                chunks.append(f"Cultural influences for {location_name} include primary culture: {cultural.get('primaryCulture', 'N/A')}, languages: {lang_str if lang_str else 'N/A'}.")
        
        voice_profile = record.get("voice_profile")
        if voice_profile and isinstance(voice_profile, dict):
            chunks.append(
                f"Voice profile for {location_name}: ElevenLabs Voice ID is {voice_profile.get('voiceId', 'N/A')}, "
                f"stability {voice_profile.get('stability', 0)*100:.0f}%, "
                f"similarity boost {voice_profile.get('similarityBoost', 0)*100:.0f}%."
            )
        return chunks

    def generate_embeddings_for_chunks(self, text_chunks: List[str], source_table: str, record_id: str) -> List[Dict]:
        """Generates embeddings for text chunks using Google Gemini API."""
        if not GOOGLE_GEMINI_API_KEY:
            logger.error("GOOGLE_GEMINI_API_KEY not found in environment variables. Cannot generate embeddings.")
            return [{"text_chunk": chunk, "embedding": None, "source_table": source_table, "source_record_id": record_id, "model_used": "N/A"} for chunk in text_chunks]

        try:
            genai.configure(api_key=GOOGLE_GEMINI_API_KEY)
            embedding_model = "models/embedding-001"
        except Exception as e:
            logger.error(f"Failed to configure Google Gemini AI SDK: {e}")
            return [{"text_chunk": chunk, "embedding": None, "source_table": source_table, "source_record_id": record_id, "model_used": "N/A"} for chunk in text_chunks]
        
        results = []
        batch_size = 100 
        logger.info(f"Generating embeddings for {len(text_chunks)} chunks from {source_table} (ID: {record_id}) using {embedding_model}...")

        for i in range(0, len(text_chunks), batch_size):
            batch = text_chunks[i:i + batch_size]
            try:
                response = genai.embed_content(
                    model=embedding_model,
                    content=batch,
                    task_type="RETRIEVAL_DOCUMENT"
                )
                
                batch_embeddings = response.get('embedding', [])
                
                if len(batch_embeddings) == len(batch):
                    for original_chunk, embedding_vector in zip(batch, batch_embeddings):
                        results.append({
                            "text_chunk": original_chunk,
                            "embedding": embedding_vector,
                            "source_table": source_table,
                            "source_record_id": record_id,
                            "model_used": embedding_model
                        })
                    logger.info(f"Successfully generated embeddings for batch {i//batch_size + 1} ({len(batch_embeddings)} embeddings).")
                else:
                    logger.error(f"Mismatch in number of embeddings for batch {i//batch_size + 1}. Expected {len(batch)}, got {len(batch_embeddings)}.")
                    for original_chunk in batch:
                         results.append({"text_chunk": original_chunk, "embedding": None, "source_table": source_table, "source_record_id": record_id, "model_used": embedding_model})
            except Exception as e:
                logger.error(f"Error generating embeddings for batch {i//batch_size + 1}: {e}")
                for original_chunk in batch:
                    results.append({"text_chunk": original_chunk, "embedding": None, "source_table": source_table, "source_record_id": record_id, "model_used": embedding_model})
        return results

    def store_embeddings_in_supabase(self, embeddings_data: List[Dict]) -> bool:
        """Stores generated embeddings and their text chunks into Supabase."""
        if not self.connect_to_supabase():
            logger.error("Cannot store embeddings in Supabase due to connection issues.")
            return False

        if not embeddings_data:
            logger.info("No embedding data provided to store.")
            return True # Technically not a failure if there's nothing to store

        # Filter out entries where embedding generation might have failed
        valid_embeddings_data = [data for data in embeddings_data if data.get("embedding") is not None]

        if not valid_embeddings_data:
            logger.warning("No valid embeddings to store after filtering.")
            return True

        table_name = "knowledge_vectors"
        url = f"{SUPABASE_URL}/rest/v1/{table_name}"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation" # To get the inserted rows back if needed, or "minimal"
        }

        # Prepare data for batch insert. Supabase typically accepts a list of objects.
        # Ensure the 'embedding' field is a string representation of a list, e.g., "[0.1, 0.2, ...]"
        # as pgvector expects this format for direct JSON inserts if not using a client library that handles it.
        data_to_insert = [
            {
                "source_table": item["source_table"],
                "source_record_id": item["source_record_id"],
                "text_chunk": item["text_chunk"],
                "embedding": str(item["embedding"]), # Convert list of floats to string format for pgvector via PostgREST
                "model_used": item["model_used"],
                # "metadata": {} # Add any other metadata if needed
            }
            for item in valid_embeddings_data
        ]
        
        logger.info(f"Attempting to store {len(data_to_insert)} embedding records into {table_name}...")
        try:
            # Supabase REST API supports batch inserts by sending an array of objects
            response = requests.post(url, headers=headers, json=data_to_insert)
            response.raise_for_status()
            
            inserted_count = len(response.json()) if response.status_code == 201 else 0 # PostgREST returns 201 for created
            if inserted_count == len(data_to_insert):
                logger.info(f"Successfully stored {inserted_count} embedding records in {table_name}.")
                return True
            else:
                logger.warning(f"Stored {inserted_count}/{len(data_to_insert)} records. Response: {response.text}")
                return False # Partial success might be considered a failure depending on requirements
                
        except requests.exceptions.HTTPError as http_err:
            logger.error(f"HTTP error occurred while storing embeddings in {table_name}: {http_err} - Response: {response.text}")
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Request exception occurred while storing embeddings in {table_name}: {req_err}")
        except Exception as e:
            logger.error(f"An unexpected error occurred while storing embeddings in {table_name}: {e}")
        return False

    def connect_to_kaggle(self) -> bool:
        """Set up Kaggle API connection"""
        if not KAGGLE_USERNAME or not KAGGLE_KEY:
            logger.warning("Kaggle credentials not found. Skipping Kaggle dataset imports.")
            return False
        
        os.environ["KAGGLE_USERNAME"] = KAGGLE_USERNAME
        os.environ["KAGGLE_KEY"] = KAGGLE_KEY
        
        try:
            import kaggle
            kaggle.api.authenticate()
            logger.info("Successfully connected to Kaggle API")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Kaggle API: {e}")
            return False
    
    def connect_to_supabase(self) -> bool:
        """Set up Supabase connection"""
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase credentials not found. Skipping Supabase operations.")
            return False
        
        try:
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
            response = requests.get(f"{SUPABASE_URL}/rest/v1/users?select=id&limit=1", headers=headers)
            response.raise_for_status()
            logger.info("Successfully connected to Supabase")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")
            return False
    
    def import_dataset(self, dataset_type: str) -> Optional[pd.DataFrame]:
        """Import dataset from Kaggle. Returns DataFrame on success, None on failure."""
        dataset_info = self.datasets.get(dataset_type)
        if not dataset_info:
            logger.error(f"Unknown dataset type: {dataset_type}")
            return None
        
        dataset_id = dataset_info["id"]
        logger.info(f"Attempting to import {dataset_type} dataset (ID: {dataset_id}) from Kaggle")
        
        if not self.connect_to_kaggle():
            logger.warning(f"Cannot import {dataset_id} from Kaggle due to connection/credential issues. Skipping.")
            return None
            
        try:
            import kaggle
            os.makedirs("./data", exist_ok=True)
            kaggle.api.dataset_download_files(dataset_id, path="./data", unzip=True, quiet=False)
            
            import glob
            dataset_specific_path = os.path.join("./data", dataset_id, "*.csv") 
            csv_files = glob.glob(dataset_specific_path)
            if not csv_files: 
                 csv_files = glob.glob(os.path.join("./data", "*.csv"))

            if not csv_files: 
                downloaded_items = os.listdir("./data")
                logger.warning(f"No CSV files found for dataset {dataset_id} in expected paths. Downloaded items in ./data: {downloaded_items}")
                all_csv_in_data = glob.glob(os.path.join("./data", "*.csv"))
                if all_csv_in_data:
                    logger.info(f"Found fallback CSVs in ./data: {all_csv_in_data}. Attempting to use the first one.")
                    csv_files = all_csv_in_data
                else: 
                    raise FileNotFoundError(f"No CSV files found for dataset {dataset_id}. Searched in ./data and ./data/{dataset_id}. Downloaded items: {downloaded_items}")
            
            df = pd.read_csv(csv_files[0])
            logger.info(f"Successfully imported {len(df)} records for {dataset_type} from Kaggle ({csv_files[0]})")
            return df
        except FileNotFoundError as e:
            logger.error(f"FileNotFoundError while importing {dataset_id} for {dataset_type}: {e}. Skipping this dataset.")
            return None
        except pd.errors.EmptyDataError as e:
            csv_file_path = csv_files[0] if 'csv_files' in locals() and csv_files else 'unknown CSV'
            logger.error(f"EmptyDataError: No data in CSV file for {dataset_id} ({csv_file_path}). Skipping this dataset. Error: {e}")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred while importing {dataset_id} for {dataset_type}: {e}. Skipping this dataset.")
            return None
    
    def _generate_mock_data(self, dataset_type: str) -> pd.DataFrame:
        """Generate mock data for development and testing"""
        dataset_info = self.datasets[dataset_type]
        features = dataset_info["features"]
        target = dataset_info["target"]
        
        num_records = 1000
        data = {}
        data["location_name"] = np.random.choice(["New York", "London", "Tokyo", "Paris", "Sydney", "Berlin", "San Francisco", "Singapore", "Dubai", "Toronto"], num_records)
        data["latitude"] = np.random.uniform(-90, 90, num_records)
        data["longitude"] = np.random.uniform(-180, 180, num_records)
        
        for feature in features:
            if feature in ["hour", "day_of_week", "month"]:
                data[feature] = np.random.randint(0, 24 if feature == "hour" else 7 if feature == "day_of_week" else 12, num_records)
            elif feature == "network_type":
                data[feature] = np.random.choice(["5G", "4G", "3G", "WiFi"], num_records)
            elif "count" in feature or "interactions" in feature or "users" in feature or "queries" in feature:
                data[feature] = np.random.randint(0, 1000, num_records)
            elif feature in ["signal_strength", "reliability_score"]:
                data[feature] = np.random.uniform(0, 100, num_records)
            elif feature in ["download_speed", "upload_speed"]:
                data[feature] = np.random.uniform(1, 200, num_records)
            elif feature in ["latency", "jitter"]:
                data[feature] = np.random.uniform(5, 100, num_records)
            else:
                data[feature] = np.random.uniform(0, 1, num_records)
        
        if target in ["avg_sentiment", "reliability_score"]:
            data[target] = np.random.uniform(0, 1, num_records)
        elif target in ["total_interactions", "unique_users"]:
            data[target] = np.random.randint(0, 1000, num_records)
        else:
            data[target] = np.random.uniform(0, 100, num_records)
        
        data["timestamp"] = [(datetime.now() - pd.Timedelta(days=np.random.randint(0, 30))).isoformat() for _ in range(num_records)]
        
        df = pd.DataFrame(data)
        logger.info(f"Generated {len(df)} mock records for {dataset_type}")
        return df
    
    def preprocess_data(self, df: pd.DataFrame, dataset_type: str) -> Tuple[pd.DataFrame, List[str]]:
        """Clean and preprocess the data for model training"""
        dataset_info = self.datasets[dataset_type]
        features = dataset_info["features"]
        target = dataset_info["target"]
        
        logger.info(f"Preprocessing {dataset_type} data with {len(df)} records")
        
        for col in features + [target]:
            if col in df.columns:
                if pd.api.types.is_numeric_dtype(df[col]):
                    df[col] = df[col].fillna(df[col].mean())
                else:
                    df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else "unknown")
        
        categorical_features = []
        for col in features:
            if col in df.columns and df[col].dtype == 'object':
                categorical_features.append(col)
                df = pd.get_dummies(df, columns=[col], prefix=[col], dummy_na=False)
        
        new_features = []
        for feature in features:
            if feature in categorical_features:
                new_features.extend([col for col in df.columns if col.startswith(f"{feature}_")])
            elif feature in df.columns: 
                new_features.append(feature)
        
        logger.info(f"Preprocessing complete. Features: {new_features}")
        return df, new_features
    
    def train_model(self, df: pd.DataFrame, dataset_type: str, new_features: List[str]) -> Dict:
        """Train a DeepMind model on the dataset"""
        dataset_info = self.datasets[dataset_type]
        target = dataset_info["target"]
        
        logger.info(f"Training model for {dataset_type} with target: {target}")
        
        if not new_features:
            logger.error(f"No features available for training model {dataset_type}. Skipping.")
            return {"error": "No features available for training."}
        if target not in df.columns:
            logger.error(f"Target column '{target}' not found in DataFrame for {dataset_type}. Skipping.")
            return {"error": f"Target column '{target}' not found."}

        X = df[new_features].values
        y = df[target].values
        
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        model_info = {}
        model = None

        if target in ["avg_sentiment", "reliability_score"]: 
            from sklearn.ensemble import GradientBoostingRegressor
            from sklearn.metrics import mean_squared_error, r2_score
            model = GradientBoostingRegressor(n_estimators=100, random_state=42)
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            logger.info(f"Regression model trained. MSE: {mse:.4f}, R²: {r2:.4f}")
            model_info = {"type": "regression", "metrics": {"mse": float(mse), "r2": float(r2)}}
        else: 
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.metrics import accuracy_score, f1_score
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
            accuracy = accuracy_score(y_test, y_pred)
            f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
            logger.info(f"Classification model trained. Accuracy: {accuracy:.4f}, F1: {f1:.4f}")
            model_info = {"type": "classification", "metrics": {"accuracy": float(accuracy), "f1": float(f1)}}
        
        if hasattr(model, 'feature_importances_'):
            feature_importance = dict(zip(new_features, model.feature_importances_))
            top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]
            logger.info(f"Top features: {top_features}")
            model_info["feature_importance"] = feature_importance
        
        model_info["scaler"] = scaler # Storing the scaler
        
        self.models[dataset_type] = {"model": model, "features": new_features, "info": model_info}
        return model_info
    
    def save_model(self, dataset_type: str) -> bool:
        """Save the trained model to disk"""
        if dataset_type not in self.models:
            logger.error(f"No trained model found for {dataset_type}")
            return False
        
        try:
            import joblib
            os.makedirs("./models", exist_ok=True)
            model_data = self.models[dataset_type]
            joblib.dump(model_data["model"], f"./models/{dataset_type}_model.joblib")
            joblib.dump(model_data["info"]["scaler"], f"./models/{dataset_type}_scaler.joblib")
            
            serializable_info = {k: v for k, v in model_data["info"].items() if k != "scaler"}
            # Convert numpy arrays in feature_importance to lists for JSON serialization
            if "feature_importance" in serializable_info and isinstance(serializable_info["feature_importance"], dict):
                serializable_info["feature_importance"] = {
                    k: (v.tolist() if isinstance(v, np.ndarray) else v)
                    for k, v in serializable_info["feature_importance"].items()
                }

            with open(f"./models/{dataset_type}_metadata.json", "w") as f:
                json.dump({"features": model_data["features"], "info": serializable_info}, f, default=str)

            logger.info(f"Model for {dataset_type} saved successfully")
            return True
        except Exception as e:
            logger.error(f"Error saving model for {dataset_type}: {e}")
            return False
    
    def load_model(self, dataset_type: str) -> bool:
        """Load a previously trained model from disk"""
        try:
            import joblib
            model_path = f"./models/{dataset_type}_model.joblib"
            scaler_path = f"./models/{dataset_type}_scaler.joblib"
            metadata_path = f"./models/{dataset_type}_metadata.json"
            
            if not all(os.path.exists(path) for path in [model_path, scaler_path, metadata_path]):
                logger.warning(f"Model files for {dataset_type} not found at expected paths.")
                return False
            
            model = joblib.load(model_path)
            scaler = joblib.load(scaler_path)
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
            
            self.models[dataset_type] = {"model": model, "features": metadata["features"], "info": {**metadata["info"], "scaler": scaler}}
            logger.info(f"Model for {dataset_type} loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Error loading model for {dataset_type}: {e}")
            return False
    
    def predict(self, dataset_type: str, input_data: Dict) -> Dict:
        """Make predictions using the trained model"""
        if dataset_type not in self.models:
            if not self.load_model(dataset_type):
                logger.error(f"No model available or could be loaded for {dataset_type}")
                return {"error": f"No model available for {dataset_type}"}
        
        try:
            model_data = self.models[dataset_type]
            model = model_data["model"]
            features = model_data["features"]
            scaler = model_data["info"]["scaler"]
            
            input_df_data = {}
            for feature in features:
                base_feature_name = feature.split("_")[0] if "_" in feature else None
                if base_feature_name and base_feature_name in input_data:
                    input_df_data[feature] = [1 if input_data[base_feature_name] == feature.replace(f"{base_feature_name}_", "") else 0]
                elif feature in input_data:
                    input_df_data[feature] = [input_data[feature]]
                else: 
                    input_df_data[feature] = [0] 
            
            input_df = pd.DataFrame(input_df_data)
            # Ensure columns are in the same order as during training
            input_df = input_df[features] 
            input_scaled = scaler.transform(input_df)
            
            prediction = model.predict(input_scaled)[0]
            
            confidence = None
            if hasattr(model, "predict_proba"):
                proba = model.predict_proba(input_scaled)[0]
                confidence = float(proba.max())
            
            result = {"prediction": float(prediction) if isinstance(prediction, (np.float32, np.float64, np.int64)) else prediction, "confidence": confidence}
            logger.info(f"Prediction for {dataset_type}: {result}")
            return result
        except Exception as e:
            logger.error(f"Error making prediction for {dataset_type}: {e}", exc_info=True)
            return {"error": str(e)}
    
    def enhance_location_data(self, location_data: Dict) -> Dict:
        """Enhance location data with model predictions"""
        enhanced_data = location_data.copy()
        
        if "connectivity" in location_data and self.datasets.get("network"):
            network_input = {
                "network_type": location_data["connectivity"].get("networkType"),
                "signal_strength": location_data["connectivity"].get("signalStrength"),
                "download_speed": location_data["connectivity"].get("bandwidth"),
                "latency": location_data["connectivity"].get("latency")
            }
            network_input_filtered = {k: v for k, v in network_input.items() if v is not None}
            
            # Check if all required features for 'network' model are present
            network_model_features = self.datasets.get("network", {}).get("features", [])
            if all(feat in network_input_filtered for feat in network_model_features):
                network_prediction = self.predict("network", network_input_filtered)
                if "error" not in network_prediction:
                    if "connectivity" not in enhanced_data: enhanced_data["connectivity"] = {}
                    enhanced_data["connectivity"]["reliability_score"] = network_prediction["prediction"]
                    enhanced_data["connectivity"]["prediction_confidence"] = network_prediction["confidence"]
            else:
                logger.warning(f"Skipping network enhancement for location {location_data.get('name', 'Unknown')} due to missing features. Required: {network_model_features}, Got: {list(network_input_filtered.keys())}")

        if "social" in location_data and self.datasets.get("social"):
            social_input = {
                "total_posts": location_data["social"].get("volume"),
                "total_likes": location_data["social"].get("volume", 0) * 5,
                "total_retweets": location_data["social"].get("volume", 0) * 0.3,
                "unique_users": location_data["social"].get("volume", 0) * 0.7
            }
            social_input_filtered = {k:v for k,v in social_input.items() if v is not None}
            social_model_features = self.datasets.get("social", {}).get("features", [])
            if all(feat in social_input_filtered for feat in social_model_features):
                social_prediction = self.predict("social", social_input_filtered)
                if "error" not in social_prediction:
                    if "social" not in enhanced_data: enhanced_data["social"] = {}
                    enhanced_data["social"]["enhanced_sentiment"] = social_prediction["prediction"]
                    enhanced_data["social"]["prediction_confidence"] = social_prediction["confidence"]
            else:
                logger.warning(f"Skipping social enhancement for location {location_data.get('name', 'Unknown')} due to missing features. Required: {social_model_features}, Got: {list(social_input_filtered.keys())}")
                
        enhanced_data["enhanced_by_deepmind"] = True
        enhanced_data["enhancement_timestamp"] = datetime.now().isoformat()
        return enhanced_data
    
    def update_supabase_data(self, dataset_type: str, df: pd.DataFrame) -> bool:
        """Update Supabase database with enhanced data"""
        if not self.connect_to_supabase():
            logger.warning("Supabase connection not available. Skipping database update.")
            return False
        
        dataset_info = self.datasets.get(dataset_type, {})
        table_name = dataset_info.get("table")
        if not table_name:
            logger.error(f"No table name configured for dataset type {dataset_type}. Skipping Supabase update.")
            return False
            
        logger.info(f"Updating Supabase table {table_name} with {len(df)} records")
        try:
            logger.info(f"Would update {len(df)} records in {table_name} (simulation only).")
            return True
        except Exception as e:
            logger.error(f"Error updating Supabase for {dataset_type}: {e}")
            return False
    
    def run_pipeline(self, dataset_type: str) -> Dict:
        """Run the full data enhancement pipeline"""
        logger.info(f"Running pipeline for {dataset_type}")
        
        try:
            df = self.import_dataset(dataset_type)
            if df is None or df.empty:
                logger.warning(f"Skipping pipeline for {dataset_type} as dataset import failed or returned no data.")
                return {"success": False, "dataset_type": dataset_type, "error": "Dataset import failed or resulted in empty data."}
            
            df_processed, new_features = self.preprocess_data(df.copy(), dataset_type) # Use df.copy() to avoid modifying original
            if df_processed.empty or not new_features:
                 logger.warning(f"Preprocessing resulted in empty data or no features for {dataset_type}. Skipping training.")
                 return {"success": False, "dataset_type": dataset_type, "error": "Preprocessing failed or no features."}

            model_info = self.train_model(df_processed, dataset_type, new_features)
            if "error" in model_info:
                logger.error(f"Model training failed for {dataset_type}: {model_info['error']}")
                return {"success": False, "dataset_type": dataset_type, "error": f"Model training failed: {model_info['error']}"}

            self.save_model(dataset_type)
            self.update_supabase_data(dataset_type, df_processed) 
            
            return {"success": True, "dataset_type": dataset_type, "records_processed": len(df_processed), "model_info": model_info}
        except Exception as e:
            logger.error(f"Pipeline error for {dataset_type}: {e}", exc_info=True)
            return {"success": False, "dataset_type": dataset_type, "error": str(e)}
    
    def run_all_pipelines(self) -> Dict:
        """Run pipelines for all dataset types"""
        results = {}
        if not self.datasets:
            logger.warning("No datasets configured. Skipping all pipelines.")
            return results
        for dataset_type in self.datasets:
            results[dataset_type] = self.run_pipeline(dataset_type)
        return results

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="DeepMind Earth Data Enhancer")
    parser.add_argument("--mode", choices=["train", "predict", "import", "populate_kb_locations"], default="train",
                        help="Operation mode: train models, make predictions, import data, or populate knowledge base for locations")
    
    temp_enhancer_for_choices = DeepMindEarthEnhancer()
    dataset_choices = list(temp_enhancer_for_choices.datasets.keys()) if temp_enhancer_for_choices.datasets else ["network", "social", "location_activity", "environmental"]
    dataset_choices.append("all")

    parser.add_argument("--dataset", choices=dataset_choices,
                        default="all", help="Dataset type to process (must match a key in dataset_configs.json or 'all')")
    parser.add_argument("--input", help="JSON input file for prediction mode")
    parser.add_argument("--output", help="Output file for results")
    
    args = parser.parse_args()
    
    enhancer = DeepMindEarthEnhancer() 
    if not enhancer.datasets and args.mode not in ['populate_kb_locations']: 
        logger.error("Dataset configurations could not be loaded or are empty. Exiting, unless mode is populate_kb_locations.")
        if args.mode != 'populate_kb_locations': # Double check to prevent exit if only populating KB
             sys.exit(1)

    if args.mode == "train":
        if args.dataset == "all":
            results = enhancer.run_all_pipelines()
        elif args.dataset in enhancer.datasets:
            results = enhancer.run_pipeline(args.dataset)
        else:
            logger.error(f"Invalid dataset type '{args.dataset}' for training. Available: {list(enhancer.datasets.keys())}")
            sys.exit(1)
        
        logger.info(f"Training results: {json.dumps(results, indent=2, default=str)}")
        if args.output:
            with open(args.output, "w") as f:
                json.dump(results, f, indent=2, default=str)
    
    elif args.mode == "predict":
        if not args.input:
            logger.error("Input file required for predict mode")
            sys.exit(1)
        
        with open(args.input, "r") as f:
            input_data = json.load(f)
        
        if args.dataset == "all":
            results = {}
            for dataset_type in enhancer.datasets: # Ensure enhancer.datasets is populated
                if not enhancer.datasets: # Should not happen if check above is effective
                    logger.error("No datasets loaded for prediction.")
                    break 
                results[dataset_type] = enhancer.predict(dataset_type, input_data)
        elif args.dataset in enhancer.datasets:
            results = enhancer.predict(args.dataset, input_data)
        else:
            logger.error(f"Invalid dataset type '{args.dataset}' for prediction. Available: {list(enhancer.datasets.keys())}")
            sys.exit(1)
            
        logger.info(f"Prediction results: {json.dumps(results, indent=2, default=str)}")
        if args.output:
            with open(args.output, "w") as f:
                json.dump(results, f, indent=2, default=str)
    
    elif args.mode == "import":
        if args.dataset == "all":
            for dataset_type in enhancer.datasets:
                df = enhancer.import_dataset(dataset_type)
                if df is not None and not df.empty:
                    logger.info(f"Import process for {dataset_type} completed. Records: {len(df)}")
                else:
                    logger.warning(f"Import process for {dataset_type} failed or returned no data.")
        elif args.dataset in enhancer.datasets:
            df = enhancer.import_dataset(args.dataset)
            if df is not None and not df.empty:
                logger.info(f"Import process for {args.dataset} completed. Records: {len(df)}")
            else:
                logger.warning(f"Import process for {args.dataset} failed or returned no data.")
        else:
            logger.error(f"Invalid dataset type '{args.dataset}' for import. Available: {list(enhancer.datasets.keys())}")
            sys.exit(1)
            
    elif args.mode == "populate_kb_locations":
        logger.info("Starting Knowledge Base population for location_memories...")
        location_memories_data = enhancer.fetch_supabase_table_data(table_name="location_memories", limit=5) 
        if location_memories_data:
            logger.info(f"Fetched {len(location_memories_data)} records from location_memories.")
            all_embeddings_data = []
            for i, record in enumerate(location_memories_data):
                record_id = record.get('id', f"unknown_id_{i}")
                logger.info(f"Processing record {record_id} for text chunking and embedding.")
                record_chunks = enhancer.process_location_memory_to_chunks(record)
                if record_chunks:
                    embeddings_data = enhancer.generate_embeddings_for_chunks(
                        text_chunks=record_chunks,
                        source_table="location_memories",
                        record_id=record_id
                    )
                    
                    valid_embeddings_count = 0
                    for edata_item in embeddings_data: 
                        if edata_item and edata_item.get("embedding"):
                            embedding_preview = str(edata_item['embedding'][:3]) + "..." if isinstance(edata_item['embedding'], list) and len(edata_item['embedding']) > 3 else str(edata_item['embedding'])
                            logger.info(f"  Embedding for chunk '{edata_item['text_chunk'][:50]}...': {embedding_preview} (length: {len(edata_item['embedding']) if isinstance(edata_item['embedding'], list) else 'N/A'})")
                            valid_embeddings_count +=1
                        else:
                            chunk_preview = edata_item['text_chunk'][:50] if edata_item and 'text_chunk' in edata_item else 'N/A'
                            logger.warning(f"  Failed to generate embedding for chunk: {chunk_preview}")
                    all_embeddings_data.extend(embeddings_data)
                    logger.info(f"Generated {valid_embeddings_count}/{len(record_chunks)} embeddings for record {record_id}.")
            
            if all_embeddings_data:
                logger.info(f"Total embedding data objects created: {len(all_embeddings_data)}")
                # Store embeddings in Supabase
                logger.info("Storing generated embeddings in Supabase...")
                store_success = enhancer.store_embeddings_in_supabase(all_embeddings_data)
                if store_success:
                    logger.info("Successfully stored embeddings in Supabase.")
                else:
                    logger.error("Failed to store some or all embeddings in Supabase.")
            else:
                logger.info("No text chunks were generated from the fetched location_memories data.")
        else:
            logger.error("Failed to fetch data from location_memories for KB population.")


if __name__ == "__main__":
    main()
