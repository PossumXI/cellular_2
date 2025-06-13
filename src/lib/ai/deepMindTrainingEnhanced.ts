import * as tf from '@tensorflow/tfjs';
import { supabase } from '../supabase';
import { kaggleDatasetService } from './kaggleDatasets';
import { saveAs } from 'file-saver';

export interface EnhancedTrainingConfig {
  datasetName: string;
  datasetSource: 'supabase' | 'kaggle';
  kaggleDatasetId?: string;
  modelType: 'classification' | 'regression' | 'nlp';
  targetColumn: string;
  featureColumns: string[];
  testSplit: number;
  epochs: number;
  batchSize: number;
  learningRate: number;
  earlyStoppingPatience?: number;
  regularization?: {
    type: 'l1' | 'l2';
    value: number;
  };
  hiddenLayers?: number[];
  activationFunction?: string;
  optimizer?: string;
}

export class EnhancedDeepMindTrainer {
  private model: tf.Sequential | null = null;
  private normalizedFeatures: { min: tf.Tensor, max: tf.Tensor } | null = null;
  private featureMeans: number[] = [];
  private featureStds: number[] = [];
  private labelEncoder: Map<string, number> = new Map();
  private reverseEncoder: Map<number, string> = new Map();
  private trainingHistory: any = null;
  private datasetStats: any = null;
  private trainingStatus: 'idle' | 'loading' | 'training' | 'completed' | 'failed' = 'idle';
  private progressCallback?: (progress: number) => void;

  constructor(private config: EnhancedTrainingConfig) {
    console.log(`🧠 Initializing Enhanced DeepMind trainer for ${config.datasetName}`);
  }

  /**
   * Set a callback function to receive training progress updates
   */
  setProgressCallback(callback: (progress: number) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Extract and prepare data from the specified source
   */
  async prepareData(): Promise<{ features: tf.Tensor2D; labels: tf.Tensor2D; }> {
    console.log(`📊 Preparing data from ${this.config.datasetName}...`);
    this.trainingStatus = 'loading';
    
    try {
      let data: any[] = [];
      
      // Fetch data from the appropriate source
      if (this.config.datasetSource === 'kaggle' && this.config.kaggleDatasetId) {
        data = await this.fetchDataFromKaggle(this.config.kaggleDatasetId);
      } else {
        data = await this.fetchDataFromSupabase();
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
    } catch (error) {
      this.trainingStatus = 'failed';
      console.error('Error preparing data:', error);
      throw error;
    }
  }

  /**
   * Fetch data from Kaggle dataset
   */
  private async fetchDataFromKaggle(datasetId: string): Promise<any[]> {
    try {
      console.log(`🔍 Fetching data from Kaggle dataset: ${datasetId}`);
      
      // First, check if we've already imported this dataset to Supabase
      const { data: existingData, error: checkError } = await supabase
        .from('kaggle_exports')
        .select('*')
        .eq('dataset_name', datasetId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (checkError) {
        console.warn('Error checking for existing Kaggle data:', checkError);
      }
      
      if (existingData && existingData.length > 0) {
        console.log(`✅ Found existing imported Kaggle dataset: ${datasetId}`);
        
        // Use the dataset that's already been imported
        const targetTable = this.getTargetTableForDataset(this.config.datasetName);
        const { data, error } = await supabase
          .from(targetTable)
          .select('*')
          .limit(10000);
        
        if (error) throw error;
        return data || [];
      }
      
      // If not already imported, download and import the dataset
      console.log(`🔄 Importing Kaggle dataset: ${datasetId}`);
      
      // This would call a Supabase Edge Function to securely download and import the dataset
      const success = await kaggleDatasetService.importDatasetToSupabase(
        datasetId, 
        this.getTargetTableForDataset(this.config.datasetName)
      );
      
      if (!success) {
        throw new Error(`Failed to import Kaggle dataset: ${datasetId}`);
      }
      
      // Now fetch the imported data
      const targetTable = this.getTargetTableForDataset(this.config.datasetName);
      const { data, error } = await supabase
        .from(targetTable)
        .select('*')
        .limit(10000);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching Kaggle dataset ${datasetId}:`, error);
      throw error;
    }
  }

  /**
   * Map dataset name to target table
   */
  private getTargetTableForDataset(datasetName: string): string {
    const tableMap: Record<string, string> = {
      'social_engagement': 'social_engagement_analytics',
      'network_performance': 'network_performance_analytics',
      'ai_interactions': 'ai_interaction_analytics',
      'location_activity': 'location_activity_heatmap'
    };
    
    return tableMap[datasetName] || datasetName;
  }

  /**
   * Fetch data from Supabase
   */
  private async fetchDataFromSupabase(): Promise<any[]> {
    try {
      const targetTable = this.getTargetTableForDataset(this.config.datasetName);
      
      console.log(`📊 Fetching data from Supabase table: ${targetTable}`);
      
      const { data, error } = await supabase
        .from(targetTable)
        .select('*')
        .limit(10000);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error(`No data found in table: ${targetTable}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      throw error;
    }
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
    
    // Calculate correlations between features and target for numeric columns
    if (this.config.modelType === 'regression') {
      const targetNums = targetValues.map(v => Number(v));
      
      this.config.featureColumns.forEach(column => {
        const columnStats = stats.columns[column];
        if (columnStats && columnStats.type === 'numeric') {
          const featureValues = data.map(row => row[column]).filter(val => val !== null && val !== undefined);
          const featureNums = featureValues.map(v => Number(v));
          
          stats.correlations[column] = this.calculateCorrelation(featureNums, targetNums);
        }
      });
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
      // Skip rows with missing target values
      if (row[this.config.targetColumn] === null || row[this.config.targetColumn] === undefined) {
        return;
      }
      
      const featureRow: number[] = [];
      
      // Process each feature column
      this.config.featureColumns.forEach(column => {
        let value = row[column];
        
        // Handle missing feature values with mean imputation
        if (value === null || value === undefined) {
          const columnStats = this.datasetStats.columns[column];
          if (columnStats && columnStats.type === 'numeric') {
            value = columnStats.mean;
          } else if (columnStats) {
            value = columnStats.mostCommon;
          } else {
            value = 0; // Fallback
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
   * Build and compile the model with enhanced architecture
   */
  buildModel(): tf.Sequential {
    console.log('🏗️ Building Enhanced DeepMind model...');
    
    const model = tf.sequential();
    
    // Get input shape from feature columns
    const inputShape = [this.config.featureColumns.length];
    
    // Use custom hidden layers if provided, otherwise use defaults
    const hiddenLayers = this.config.hiddenLayers || 
      (this.config.modelType === 'classification' ? [64, 32] : [64, 32, 16]);
    
    // Use custom activation function if provided, otherwise use defaults
    const activation = this.config.activationFunction || 'relu';
    
    // Add input layer
    model.add(tf.layers.dense({
      units: hiddenLayers[0],
      activation,
      inputShape,
      kernelRegularizer: this.getRegularizer()
    }));
    
    // Add dropout for regularization
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Add hidden layers
    for (let i = 1; i < hiddenLayers.length; i++) {
      model.add(tf.layers.dense({
        units: hiddenLayers[i],
        activation,
        kernelRegularizer: this.getRegularizer()
      }));
      
      // Add dropout with decreasing rate for deeper layers
      const dropoutRate = Math.max(0.1, 0.2 - (i * 0.05));
      model.add(tf.layers.dropout({ rate: dropoutRate }));
    }
    
    // Add output layer based on model type
    if (this.config.modelType === 'classification') {
      // Classification output layer
      const numClasses = this.labelEncoder.size || 2;
      model.add(tf.layers.dense({
        units: numClasses,
        activation: 'softmax'
      }));
      
      // Compile with categorical crossentropy
      model.compile({
        optimizer: this.getOptimizer(),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
    } else if (this.config.modelType === 'regression') {
      // Regression output layer
      model.add(tf.layers.dense({
        units: 1
      }));
      
      // Compile with mean squared error
      model.compile({
        optimizer: this.getOptimizer(),
        loss: 'meanSquaredError',
        metrics: ['mse', 'mae']
      });
    } else if (this.config.modelType === 'nlp') {
      // Simple NLP classification output layer
      const numClasses = this.labelEncoder.size || 2;
      model.add(tf.layers.dense({
        units: numClasses,
        activation: 'softmax'
      }));
      
      // Compile with categorical crossentropy
      model.compile({
        optimizer: this.getOptimizer(),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
    }
    
    this.model = model;
    console.log('✅ Enhanced model built and compiled');
    
    return model;
  }

  /**
   * Get regularizer based on configuration
   */
  private getRegularizer(): tf.Regularizer | undefined {
    if (!this.config.regularization) return undefined;
    
    const { type, value } = this.config.regularization;
    
    if (type === 'l1') {
      return tf.regularizers.l1({ l1: value });
    } else if (type === 'l2') {
      return tf.regularizers.l2({ l2: value });
    }
    
    return undefined;
  }

  /**
   * Get optimizer based on configuration
   */
  private getOptimizer(): tf.Optimizer {
    const lr = this.config.learningRate;
    
    switch (this.config.optimizer) {
      case 'adam':
        return tf.train.adam(lr);
      case 'sgd':
        return tf.train.sgd(lr);
      case 'rmsprop':
        return tf.train.rmsprop(lr);
      case 'adagrad':
        return tf.train.adagrad(lr);
      default:
        return tf.train.adam(lr);
    }
  }

  /**
   * Train the model with the prepared data and enhanced options
   */
  async trainModel(features: tf.Tensor2D, labels: tf.Tensor2D): Promise<tf.History> {
    if (!this.model) {
      throw new Error('Model not built. Call buildModel() first.');
    }
    
    console.log('🏋️ Training Enhanced DeepMind model...');
    this.trainingStatus = 'training';
    
    // Split data into training and testing sets
    const numExamples = features.shape[0];
    const numTestExamples = Math.round(numExamples * this.config.testSplit);
    const numTrainExamples = numExamples - numTestExamples;
    
    const trainFeatures = features.slice([0, 0], [numTrainExamples, features.shape[1]]);
    const testFeatures = features.slice([numTrainExamples, 0], [numTestExamples, features.shape[1]]);
    
    const trainLabels = labels.slice([0, 0], [numTrainExamples, labels.shape[1]]);
    const testLabels = labels.slice([numTrainExamples, 0], [numTestExamples, labels.shape[1]]);
    
    // Configure early stopping if enabled
    const callbacks = [];
    
    if (this.config.earlyStoppingPatience) {
      callbacks.push(tf.callbacks.earlyStopping({
        monitor: 'val_loss',
        patience: this.config.earlyStoppingPatience
      }));
    }
    
    // Add progress callback
    if (this.progressCallback) {
      callbacks.push({
        onEpochEnd: (epoch: number, logs: any) => {
          const progress = Math.round(((epoch + 1) / this.config.epochs) * 100);
          this.progressCallback?.(progress);
          console.log(`Epoch ${epoch + 1}/${this.config.epochs} - loss: ${logs?.loss.toFixed(4)} - val_loss: ${logs?.val_loss.toFixed(4)}`);
        }
      });
    }
    
    // Train the model
    const history = await this.model.fit(trainFeatures, trainLabels, {
      epochs: this.config.epochs,
      batchSize: this.config.batchSize,
      validationData: [testFeatures, testLabels],
      callbacks
    });
    
    this.trainingHistory = history;
    this.trainingStatus = 'completed';
    console.log('✅ Enhanced model training complete');
    
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
          value = this.datasetStats.columns[column]?.mean || 0;
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
    
    console.log('📦 Exporting enhanced model for Kaggle...');
    
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
    
    console.log('✅ Enhanced model exported successfully for Kaggle');
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
   * Calculate correlation between two arrays
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }
    
    const n = x.length;
    
    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate covariance and variances
    let covariance = 0;
    let varX = 0;
    let varY = 0;
    
    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      covariance += diffX * diffY;
      varX += diffX * diffX;
      varY += diffY * diffY;
    }
    
    // Avoid division by zero
    if (varX === 0 || varY === 0) {
      return 0;
    }
    
    return covariance / Math.sqrt(varX * varY);
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

  /**
   * Get the current training status
   */
  getStatus(): 'idle' | 'loading' | 'training' | 'completed' | 'failed' {
    return this.trainingStatus;
  }

  /**
   * Get the dataset statistics
   */
  getDatasetStats(): any {
    return this.datasetStats;
  }

  /**
   * Get the training history
   */
  getTrainingHistory(): any {
    return this.trainingHistory;
  }

  /**
   * Save the trained model to IndexedDB for later use
   */
  async saveModel(modelName: string): Promise<string> {
    if (!this.model) {
      throw new Error('No trained model to save');
    }
    
    console.log(`💾 Saving model: ${modelName}`);
    
    try {
      const saveResult = await this.model.save(`indexeddb://${modelName}`);
      console.log('✅ Model saved successfully:', saveResult);
      return modelName;
    } catch (error) {
      console.error('Error saving model:', error);
      throw error;
    }
  }

  /**
   * Load a previously trained model from IndexedDB
   */
  async loadModel(modelName: string): Promise<boolean> {
    try {
      console.log(`📂 Loading model: ${modelName}`);
      this.model = await tf.loadLayersModel(`indexeddb://${modelName}`) as tf.Sequential;
      console.log('✅ Model loaded successfully');
      this.trainingStatus = 'completed';
      return true;
    } catch (error) {
      console.error('Error loading model:', error);
      return false;
    }
  }
}