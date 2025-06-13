# DeepMind Earth Enhancer

This directory contains scripts for enhancing ItsEarth's location services and data quality using DeepMind models and Kaggle datasets.

## Overview

The DeepMind Earth Enhancer system improves location data and services by:

1. Importing high-quality datasets from Kaggle
2. Training specialized machine learning models
3. Enhancing location data with intelligent predictions
4. Improving the accuracy of network, social, and environmental data
5. Providing real-time location intelligence

## Scripts

- `deepmind_earth_enhancer.py` - Main script for training models and making predictions
- `location_service_enhancer.py` - Enhances location services with trained models
- `run_deepmind_enhancer.sh` - Shell script to run the full enhancement pipeline
- `requirements.txt` - Required Python packages

## Usage

### Setup

1. Install required packages:
   ```
   pip install -r scripts/requirements.txt
   ```

2. Set up environment variables (optional):
   ```
   export KAGGLE_USERNAME=your_kaggle_username
   export KAGGLE_KEY=your_kaggle_api_key
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_KEY=your_supabase_key
   ```

### Running the Pipeline

Run the full enhancement pipeline:
```
bash scripts/run_deepmind_enhancer.sh
```

### Individual Components

Train models on specific datasets:
```
python scripts/deepmind_earth_enhancer.py --mode train --dataset network
```

Make predictions:
```
python scripts/deepmind_earth_enhancer.py --mode predict --dataset network --input input.json --output predictions.json
```

Import datasets:
```
python scripts/deepmind_earth_enhancer.py --mode import --dataset all
```

Enhance location services:
```
python scripts/location_service_enhancer.py --output enhanced_locations.json
```

## Data Types

The system works with the following data types:

- **Network** - Network performance data (signal strength, download/upload speeds, latency)
- **Social** - Social media engagement and sentiment data
- **Location** - Location activity and popularity data
- **Environmental** - Environmental sensor data (air quality, noise levels, etc.)

## Integration with ItsEarth

The enhanced data is automatically integrated with the ItsEarth platform through:

1. Supabase database updates
2. Real-time API for frontend access
3. Enhanced location intelligence in the UI

## Output

The scripts generate the following outputs:

- Trained models saved in the `models/` directory
- Enhanced location data in JSON format
- Logs of the enhancement process
- Updated database records

## Example

Example prediction input:
```json
{
  "network_type": "5G",
  "signal_strength": 85,
  "download_speed": 120,
  "latency": 15
}
```

Example prediction output:
```json
{
  "prediction": 0.92,
  "confidence": 0.87
}
```