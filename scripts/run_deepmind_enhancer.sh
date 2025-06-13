#!/bin/bash

# Run DeepMind Earth Enhancer and Location Service Enhancer
# This script automates the process of enhancing Earth data and location services

# Set up environment
echo "🌍 Setting up environment for DeepMind Earth Enhancer..."
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Create directories
mkdir -p data
mkdir -p models
mkdir -p logs

# Log file
LOG_FILE="logs/deepmind_enhancer_$(date +%Y%m%d_%H%M%S).log"
echo "📝 Logging to $LOG_FILE"

# Install required packages if not already installed
echo "📦 Checking required packages..."
pip install -q pandas numpy scikit-learn requests joblib

# Run DeepMind Earth Enhancer for all dataset types
echo "🧠 Running DeepMind Earth Enhancer for all datasets..."
python scripts/deepmind_earth_enhancer.py --mode train --dataset all --output data/training_results.json 2>&1 | tee -a $LOG_FILE

# Check if training was successful
if [ $? -eq 0 ]; then
    echo "✅ DeepMind models trained successfully"
    
    # Run Location Service Enhancer to apply the models
    echo "🌐 Enhancing location services with trained models..."
    python scripts/location_service_enhancer.py --output data/enhanced_locations.json 2>&1 | tee -a $LOG_FILE
    
    if [ $? -eq 0 ]; then
        echo "✅ Location services enhanced successfully"
        echo "📊 Results saved to data/enhanced_locations.json"
    else
        echo "❌ Error enhancing location services"
    fi
else
    echo "❌ Error training DeepMind models"
fi

# Run prediction example
echo "🔮 Running prediction example..."
echo '{
  "network_type": "5G",
  "signal_strength": 85,
  "download_speed": 120,
  "latency": 15
}' > data/prediction_input.json

python scripts/deepmind_earth_enhancer.py --mode predict --dataset network --input data/prediction_input.json --output data/prediction_results.json 2>&1 | tee -a $LOG_FILE

if [ $? -eq 0 ]; then
    echo "✅ Prediction example completed successfully"
    echo "📊 Results saved to data/prediction_results.json"
else
    echo "❌ Error running prediction example"
fi

echo "🎉 DeepMind Earth Enhancer process completed"
echo "📝 Full logs available in $LOG_FILE"