import { supabase } from '../supabase';
import * as tf from '@tensorflow/tfjs';
import { saveAs } from 'file-saver';

export interface TrainingConfig {
  datasetName: string;
  modelType: 'classification' | 'regression' | 'nlp';
  targetColumn: string;
  featureColumns: string[];
  testSplit: number;
  epochs: number;
  batchSize: number;
  learningRate: number;
}

export class DeepMindTrainer {
  private model: tf.Sequential | null = null;
  private normalizedFeatures: { min: tf.Tensor, max: tf.Tensor } | null = null;
  private featureMeans: number[] = [];
  private featureStds: number[] = [];
  private labelEncoder: Map<string, number> = new Map();
  private reverseEncoder: Map<number, string> = new Map();
  private trainingHistory: any = null;
  private datasetStats: any = null;

  constructor(private config: TrainingConfig) {
    console.log(`🧠 Initializing DeepMind trainer for ${config.datasetName}`);
  }

  /**
   * Extract and prepare data from Supabase for training
   */
  async prepareData(): Promise<{ features: tf.Tensor2D; labels: tf.Tensor2D; }> {
    console.log(`📊 Preparing data from ${this.config.datasetName}...`);
    
    // Fetch data from the appropriate table based on dataset name
    let { data, error } = await this.fetchDataFromSupabase();
    
    if (error) {
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('No data available for training');
    }
    
    console.log(`✅ Fetched ${data.length} records for training`);
    
    // Calculate dataset statistics
    this.calculateDatasetStats(data);
    
    // Process features and labels
    const { features, labels } = this.processData(data);
    
    return { features, labels };
  }

  /**
   * Fetch data from the appropriate Supabase table
   */
  private async fetchDataFromSupabase(): Promise<{ data: any[] | null; error: any }> {
    let query;
    
    switch (this.config.datasetName) {
      case 'social_engagement':
        query = supabase
          .from('social_engagement_analytics')
          .select('*')
          .limit(10000);
        break;
      
      case 'network_performance':
        query = supabase
          .from('network_performance_analytics')
          .select('*')
          .limit(10000);
        break;
      
      case 'ai_interactions':
        query = supabase
          .from('ai_interaction_analytics')
          .select('*')
          .limit(10000);
        break;
      
      case 'location_activity':
        query = supabase
          .from('location_activity_heatmap')
          .select('*')
          .limit(10000);
        break;
      
      default:
        throw new Error(`Unknown dataset: ${this.config.datasetName}`);
    }
    
    return await query;
  }

  /**
   * Calculate and store dataset statistics
   */
  private calculateDatasetStats(data: any[]): void {
    const stats: any = {
      recordCount: data.length,
      columns: {},
      correlations: {},
      missingValues: {},
      uniqueValues: {}
    };
    
    // Calculate basic stats for each feature column
    this.config.featureColumns.forEach(column => {
      const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined);
      
      if (values.length === 0) {
        stats.columns[column] = { empty: true };
        return;
      }
      
      const numericValues = values.filter(val => !isNaN(Number(val)));
      
      if (numericValues.length > 0) {
        const nums = numericValues.map(v => Number(v));
        stats.columns[column] = {
          min: Math.min(...nums),
          max: Math.max(...nums),
          mean: nums.reduce((sum, val) => sum + val, 0) / nums.length,
          std: this.calculateStd(nums),
          type: 'numeric'
        };
      } else {
        // Categorical data
        const uniqueValues = [...new Set(values)];
        stats.columns[column] = {
          uniqueCount: uniqueValues.length,
          mostCommon: this.getMostCommonValue(values),
          type: 'categorical'
        };
      }
      
      // Calculate missing values
      stats.missingValues[column] = data.length - values.length;
      
      // Calculate unique values for categorical data
      if (stats.columns[column].type === 'categorical') {
        stats.uniqueValues[column] = [...new Set(values)];
      }
    });
    
    // Calculate target column stats
    const targetValues = data.map(row => row[this.config.targetColumn]).filter(val => val !== null && val !== undefined);
    
    if (this.config.modelType === 'classification') {
      const uniqueTargets = [...new Set(targetValues)];
      stats.targetDistribution = {};
      
      uniqueTargets.forEach(target => {
        stats.targetDistribution[target] = targetValues.filter(v => v === target).length;
      });
    } else {
      // Regression target stats
      const nums = targetValues.map(v => Number(v));
      stats.targetStats = {
        min: Math.min(...nums),
        max: Math.max(...nums),
        mean: nums.reduce((sum, val) => sum + val, 0) / nums.length,
        std: this.calculateStd(nums)
      };
    }
    
    this.datasetStats = stats;
    console.log('📊 Dataset statistics calculated');
  }

  /**
   * Process raw data into tensors for training
   */
  private processData(data: any[]): { features: tf.Tensor2D; labels: tf.Tensor2D; } {
    // Extract features and labels
    const featureData: number[][] = [];
    const labelData: number[][] = [];
    
    // Process each row
    data.forEach(row => {
      const featureRow: number[] = [];
      
      // Process each feature column
      this.config.featureColumns.forEach(column => {
        let value = row[column];
        
        // Skip rows with missing target values
        if (row[this.config.targetColumn] === null || row[this.config.targetColumn] === undefined) {
          return;
        }
        
        // Handle missing feature values with mean imputation
        if (value === null || value === undefined) {
          const columnStats = this.datasetStats.columns[column];
          if (columnStats.type === 'numeric') {
            value = columnStats.mean;
          } else {
            value = columnStats.mostCommon;
          }
        }
        
        // Convert to numeric value
        if (typeof value === 'string') {
          // For categorical features, use one-hot encoding or label encoding
          if (!this.labelEncoder.has(value)) {
            const index = this.labelEncoder.size;
            this.labelEncoder.set(value, index);
            this.reverseEncoder.set(index, value);
          }
          featureRow.push(this.labelEncoder.get(value)!);
        } else if (typeof value === 'boolean') {
          featureRow.push(value ? 1 : 0);
        } else if (Array.isArray(value)) {
          // For array values, use the length as a feature
          featureRow.push(value.length);
        } else {
          featureRow.push(Number(value));
        }
      });
      
      // Process target column
      let targetValue: number | number[] = 0;
      
      if (this.config.modelType === 'classification') {
        const target = row[this.config.targetColumn];
        
        // For classification, encode target as one-hot
        if (typeof target === 'string') {
          if (!this.labelEncoder.has(target)) {
            const index = this.labelEncoder.size;
            this.labelEncoder.set(target, index);
            this.reverseEncoder.set(index, target);
          }
          
          const encoded = this.labelEncoder.get(target)!;
          
          // One-hot encoding
          const oneHot = Array(this.labelEncoder.size).fill(0);
          oneHot[encoded] = 1;
          targetValue = oneHot;
        } else {
          targetValue = [Number(target)];
        }
      } else {
        // For regression, use the numeric value
        targetValue = [Number(row[this.config.targetColumn])];
      }
      
      featureData.push(featureRow);
      labelData.push(Array.isArray(targetValue) ? targetValue : [targetValue]);
    });
    
    // Convert to tensors
    const features = tf.tensor2d(featureData);
    const labels = tf.tensor2d(labelData);
    
    // Normalize features
    const normalizedFeatures = this.normalizeFeatures(features);
    
    return { features: normalizedFeatures, labels };
  }

  /**
   * Normalize features using min-max scaling
   */
  private normalizeFeatures(features: tf.Tensor2D): tf.Tensor2D {
    const min = features.min(0);
    const max = features.max(0);
    
    this.normalizedFeatures = { min, max };
    
    // Avoid division by zero
    const range = max.sub(min);
    const rangeWithEpsilon = range.add(tf.scalar(1e-8));
    
    return features.sub(min).div(rangeWithEpsilon);
  }

  /**
   * Build and compile the model
   */
  buildModel(): tf.Sequential {
    console.log('🏗️ Building DeepMind model...');
    
    const model = tf.sequential();
    
    // Get input shape from feature columns
    const inputShape = [this.config.featureColumns.length];
    
    // Add layers based on model type
    if (this.config.modelType === 'classification') {
      // Classification model
      model.add(tf.layers.dense({
        units: 64,
        activation: 'relu',
        inputShape
      }));
      
      model.add(tf.layers.dropout({ rate: 0.2 }));
      
      model.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
      }));
      
      model.add(tf.layers.dropout({ rate: 0.1 }));
      
      // Output layer - units based on number of classes
      const numClasses = this.labelEncoder.size || 2;
      model.add(tf.layers.dense({
        units: numClasses,
        activation: 'softmax'
      }));
      
      // Compile with categorical crossentropy
      model.compile({
        optimizer: tf.train.adam(this.config.learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
    } else {
      // Regression model
      model.add(tf.layers.dense({
        units: 64,
        activation: 'relu',
        inputShape
      }));
      
      model.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
      }));
      
      model.add(tf.layers.dense({
        units: 1
      }));
      
      // Compile with mean squared error
      model.compile({
        optimizer: tf.train.adam(this.config.learningRate),
        loss: 'meanSquaredError',
        metrics: ['mse']
      });
    }
    
    this.model = model;
    console.log('✅ Model built and compiled');
    
    return model;
  }

  /**
   * Train the model with the prepared data
   */
  async trainModel(features: tf.Tensor2D, labels: tf.Tensor2D): Promise<tf.History> {
    if (!this.model) {
      throw new Error('Model not built. Call buildModel() first.');
    }
    
    console.log('🏋️ Training DeepMind model...');
    
    // Split data into training and testing sets
    const numExamples = features.shape[0];
    const numTestExamples = Math.round(numExamples * this.config.testSplit);
    const numTrainExamples = numExamples - numTestExamples;
    
    const trainFeatures = features.slice([0, 0], [numTrainExamples, features.shape[1]]);
    const testFeatures = features.slice([numTrainExamples, 0], [numTestExamples, features.shape[1]]);
    
    const trainLabels = labels.slice([0, 0], [numTrainExamples, labels.shape[1]]);
    const testLabels = labels.slice([numTrainExamples, 0], [numTestExamples, labels.shape[1]]);
    
    // Train the model
    const history = await this.model.fit(trainFeatures, trainLabels, {
      epochs: this.config.epochs,
      batchSize: this.config.batchSize,
      validationData: [testFeatures, testLabels],
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}/${this.config.epochs} - loss: ${logs?.loss.toFixed(4)} - val_loss: ${logs?.val_loss.toFixed(4)}`);
        }
      }
    });
    
    this.trainingHistory = history;
    console.log('✅ Model training complete');
    
    // Evaluate the model
    const evalResult = this.model.evaluate(testFeatures, testLabels);
    
    const loss = Array.isArray(evalResult) ? evalResult[0].dataSync()[0] : evalResult.dataSync()[0];
    console.log(`📊 Final evaluation loss: ${loss.toFixed(4)}`);
    
    return history;
  }

  /**
   * Make predictions with the trained model
   */
  async predict(inputData: any[]): Promise<any[]> {
    if (!this.model || !this.normalizedFeatures) {
      throw new Error('Model not trained. Call trainModel() first.');
    }
    
    // Process input data
    const processedInputs: number[][] = inputData.map(input => {
      return this.config.featureColumns.map(column => {
        let value = input[column];
        
        // Handle missing values
        if (value === null || value === undefined) {
          value = this.datasetStats.columns[column].mean || 0;
        }
        
        // Convert to numeric
        if (typeof value === 'string') {
          return this.labelEncoder.get(value) || 0;
        } else if (typeof value === 'boolean') {
          return value ? 1 : 0;
        } else if (Array.isArray(value)) {
          return value.length;
        } else {
          return Number(value);
        }
      });
    });
    
    // Convert to tensor and normalize
    const inputTensor = tf.tensor2d(processedInputs);
    const normalizedInputs = inputTensor.sub(this.normalizedFeatures!.min).div(
      this.normalizedFeatures!.max.sub(this.normalizedFeatures!.min).add(tf.scalar(1e-8))
    );
    
    // Make predictions
    const predictions = this.model.predict(normalizedInputs) as tf.Tensor;
    const predictionValues = await predictions.array();
    
    // Process predictions based on model type
    if (this.config.modelType === 'classification') {
      return predictionValues.map((pred: number[]) => {
        const maxIndex = pred.indexOf(Math.max(...pred));
        return this.reverseEncoder.get(maxIndex) || maxIndex.toString();
      });
    } else {
      return predictionValues.map((pred: number[]) => pred[0]);
    }
  }

  /**
   * Export the trained model for Kaggle
   */
  async exportForKaggle(): Promise<void> {
    if (!this.model) {
      throw new Error('No trained model to export');
    }
    
    console.log('📦 Exporting model for Kaggle...');
    
    // Save model architecture as JSON
    const modelJSON = this.model.toJSON();
    const modelBlob = new Blob([JSON.stringify(modelJSON)], { type: 'application/json' });
    saveAs(modelBlob, `deepmind_${this.config.datasetName}_model.json`);
    
    // Save model weights
    await this.model.save('downloads://deepmind_model_weights');
    
    // Save dataset statistics and metadata
    const metadata = {
      config: this.config,
      datasetStats: this.datasetStats,
      labelEncoder: Array.from(this.labelEncoder.entries()),
      featureMeans: this.featureMeans,
      featureStds: this.featureStds,
      trainingDate: new Date().toISOString()
    };
    
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    saveAs(metadataBlob, `deepmind_${this.config.datasetName}_metadata.json`);
    
    // Create a Kaggle dataset description file
    const datasetDescription = this.generateKaggleDatasetDescription();
    const descriptionBlob = new Blob([datasetDescription], { type: 'text/markdown' });
    saveAs(descriptionBlob, 'dataset-metadata.md');
    
    console.log('✅ Model exported successfully for Kaggle');
  }

  /**
   * Generate a Kaggle dataset description
   */
  private generateKaggleDatasetDescription(): string {
    return `# DeepMind ${this.config.datasetName} Dataset

## Overview
This dataset contains ${this.datasetStats.recordCount} records of ${this.config.datasetName} data from the ItsEarth Cellular Neural Network platform. The data represents real-world interactions and analytics collected from various locations around the globe.

## Features
${this.config.featureColumns.map(col => `- **${col}**: ${this.getColumnDescription(col)}`).join('\n')}

## Target Variable
- **${this.config.targetColumn}**: ${this.getColumnDescription(this.config.targetColumn)}

## Model
This dataset includes a pre-trained TensorFlow.js model for ${this.config.modelType} of ${this.config.targetColumn} based on the features. The model architecture consists of multiple dense layers with dropout for regularization.

## Use Cases
- Predicting location-based engagement patterns
- Analyzing network performance across different regions
- Understanding AI interaction patterns
- Optimizing connectivity infrastructure

## License
This dataset is provided for research and educational purposes only.

## Citation
If you use this dataset in your research, please cite:
\`\`\`
@dataset{itsearth_deepmind_${this.config.datasetName},
  author = {ItsEarth Cellular Neural Network},
  title = {DeepMind ${this.config.datasetName} Dataset},
  year = {2025},
  publisher = {Kaggle},
  url = {https://www.kaggle.com/datasets/itsearth/deepmind-${this.config.datasetName.toLowerCase()}}
}
\`\`\`
`;
  }

  /**
   * Get a description for a column based on dataset stats
   */
  private getColumnDescription(column: string): string {
    const stats = this.datasetStats?.columns[column];
    
    if (!stats) return 'No description available';
    
    if (stats.type === 'numeric') {
      return `Numeric feature with range [${stats.min.toFixed(2)}, ${stats.max.toFixed(2)}] and mean ${stats.mean.toFixed(2)}`;
    } else {
      return `Categorical feature with ${stats.uniqueCount} unique values`;
    }
  }

  /**
   * Calculate standard deviation
   */
  private calculateStd(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Get the most common value in an array
   */
  private getMostCommonValue(values: any[]): any {
    const counts = new Map<any, number>();
    
    values.forEach(val => {
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    
    let maxCount = 0;
    let mostCommon = null;
    
    counts.forEach((count, val) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = val;
      }
    });
    
    return mostCommon;
  }
}