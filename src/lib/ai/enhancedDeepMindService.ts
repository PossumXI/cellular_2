import { EnhancedDeepMindTrainer, EnhancedTrainingConfig } from './deepMindTrainingEnhanced';
import { kaggleDatasetService, KaggleDataset } from './kaggleDatasets';
import { supabase } from '../supabase';

export class EnhancedDeepMindService {
  private static instance: EnhancedDeepMindService;
  private trainers: Map<string, EnhancedDeepMindTrainer> = new Map();
  private trainingStatus: Map<string, 'idle' | 'loading' | 'training' | 'completed' | 'failed'> = new Map();
  private trainingProgress: Map<string, number> = new Map();
  private availableDatasets: KaggleDataset[] = [];
  private datasetsFetched: boolean = false;

  static getInstance(): EnhancedDeepMindService {
    if (!EnhancedDeepMindService.instance) {
      EnhancedDeepMindService.instance = new EnhancedDeepMindService();
    }
    return EnhancedDeepMindService.instance;
  }

  /**
   * Initialize the service and fetch available datasets
   */
  async initialize(): Promise<void> {
    if (this.datasetsFetched) return;
    
    try {
      console.log('🚀 Initializing Enhanced DeepMind service...');
      
      // Fetch available datasets from Kaggle
      this.availableDatasets = await kaggleDatasetService.getAvailableDatasets();
      this.datasetsFetched = true;
      
      console.log(`✅ Fetched ${this.availableDatasets.length} available datasets`);
    } catch (error) {
      console.error('Error initializing Enhanced DeepMind service:', error);
    }
  }

  /**
   * Get available datasets for training
   */
  async getAvailableDatasets(category?: string): Promise<KaggleDataset[]> {
    if (!this.datasetsFetched) {
      await this.initialize();
    }
    
    if (category) {
      return this.availableDatasets.filter(dataset => dataset.category === category);
    }
    
    return this.availableDatasets;
  }

  /**
   * Create a new training configuration for a specific use case
   */
  createTrainingConfig(
    datasetName: string,
    datasetSource: 'supabase' | 'kaggle',
    kaggleDatasetId: string | undefined,
    modelType: 'classification' | 'regression' | 'nlp',
    targetColumn: string,
    featureColumns: string[]
  ): EnhancedTrainingConfig {
    return {
      datasetName,
      datasetSource,
      kaggleDatasetId,
      modelType,
      targetColumn,
      featureColumns,
      testSplit: 0.2,
      epochs: 50,
      batchSize: 32,
      learningRate: 0.001,
      earlyStoppingPatience: 5,
      regularization: {
        type: 'l2',
        value: 0.01
      },
      hiddenLayers: [64, 32, 16],
      activationFunction: 'relu',
      optimizer: 'adam'
    };
  }

  /**
   * Get predefined training configurations for common use cases
   */
  getPredefinedConfigs(): { [key: string]: EnhancedTrainingConfig } {
    return {
      // Social engagement prediction with Kaggle data
      socialEngagementSentimentKaggle: {
        datasetName: 'social_engagement',
        datasetSource: 'kaggle',
        kaggleDatasetId: 'social-media-sentiment',
        modelType: 'regression',
        targetColumn: 'avg_sentiment',
        featureColumns: [
          'total_posts',
          'total_likes',
          'total_retweets',
          'total_replies',
          'unique_users',
          'hour_of_day',
          'day_of_week',
          'is_weekend'
        ],
        testSplit: 0.2,
        epochs: 50,
        batchSize: 32,
        learningRate: 0.001,
        earlyStoppingPatience: 5,
        regularization: {
          type: 'l2',
          value: 0.01
        },
        hiddenLayers: [64, 32, 16],
        activationFunction: 'relu',
        optimizer: 'adam'
      },
      
      // Network performance prediction with Kaggle data
      networkPerformanceKaggle: {
        datasetName: 'network_performance',
        datasetSource: 'kaggle',
        kaggleDatasetId: 'cellular-network-coverage',
        modelType: 'regression',
        targetColumn: 'download_speed',
        featureColumns: [
          'signal_strength',
          'network_type',
          'hour_of_day',
          'day_of_week',
          'is_peak_hour'
        ],
        testSplit: 0.2,
        epochs: 50,
        batchSize: 32,
        learningRate: 0.001,
        earlyStoppingPatience: 5,
        regularization: {
          type: 'l2',
          value: 0.01
        },
        hiddenLayers: [64, 32, 16],
        activationFunction: 'relu',
        optimizer: 'adam'
      },
      
      // AI interaction classification with Kaggle data
      aiInteractionTypeKaggle: {
        datasetName: 'ai_interactions',
        datasetSource: 'kaggle',
        kaggleDatasetId: 'ai-interaction-patterns',
        modelType: 'classification',
        targetColumn: 'interaction_type',
        featureColumns: [
          'query_length',
          'processing_time_ms',
          'hour_of_day',
          'day_of_week',
          'user_tier'
        ],
        testSplit: 0.2,
        epochs: 50,
        batchSize: 32,
        learningRate: 0.001,
        earlyStoppingPatience: 5,
        regularization: {
          type: 'l2',
          value: 0.01
        },
        hiddenLayers: [64, 32, 16],
        activationFunction: 'relu',
        optimizer: 'adam'
      },
      
      // Location popularity prediction with Kaggle data
      locationPopularityKaggle: {
        datasetName: 'location_activity',
        datasetSource: 'kaggle',
        kaggleDatasetId: 'location-activity-patterns',
        modelType: 'regression',
        targetColumn: 'total_interactions',
        featureColumns: [
          'hour',
          'unique_users',
          'ai_queries',
          'voice_interactions',
          'text_interactions'
        ],
        testSplit: 0.2,
        epochs: 50,
        batchSize: 32,
        learningRate: 0.001,
        earlyStoppingPatience: 5,
        regularization: {
          type: 'l2',
          value: 0.01
        },
        hiddenLayers: [64, 32, 16],
        activationFunction: 'relu',
        optimizer: 'adam'
      },
      
      // Standard configs with Supabase data
      socialEngagementSentiment: {
        datasetName: 'social_engagement',
        datasetSource: 'supabase',
        modelType: 'regression',
        targetColumn: 'avg_sentiment',
        featureColumns: [
          'total_posts',
          'total_likes',
          'total_retweets',
          'total_replies',
          'unique_users',
          'hour_of_day',
          'day_of_week',
          'is_weekend'
        ],
        testSplit: 0.2,
        epochs: 50,
        batchSize: 32,
        learningRate: 0.001,
        earlyStoppingPatience: 5,
        regularization: {
          type: 'l2',
          value: 0.01
        },
        hiddenLayers: [64, 32, 16],
        activationFunction: 'relu',
        optimizer: 'adam'
      },
      
      networkPerformance: {
        datasetName: 'network_performance',
        datasetSource: 'supabase',
        modelType: 'regression',
        targetColumn: 'download_speed',
        featureColumns: [
          'signal_strength',
          'network_type',
          'hour_of_day',
          'day_of_week',
          'is_peak_hour'
        ],
        testSplit: 0.2,
        epochs: 50,
        batchSize: 32,
        learningRate: 0.001,
        earlyStoppingPatience: 5,
        regularization: {
          type: 'l2',
          value: 0.01
        },
        hiddenLayers: [64, 32, 16],
        activationFunction: 'relu',
        optimizer: 'adam'
      }
    };
  }

  /**
   * Start training a model with the given configuration
   */
  async startTraining(config: EnhancedTrainingConfig): Promise<string> {
    const trainerId = `${config.datasetName}_${config.targetColumn}_${Date.now()}`;
    
    try {
      console.log(`🚀 Starting Enhanced DeepMind training for ${config.datasetName}`);
      
      // Create a new trainer
      const trainer = new EnhancedDeepMindTrainer(config);
      this.trainers.set(trainerId, trainer);
      this.trainingStatus.set(trainerId, 'loading');
      this.trainingProgress.set(trainerId, 0);
      
      // Set up progress callback
      trainer.setProgressCallback((progress) => {
        this.trainingProgress.set(trainerId, progress);
        this.updateTrainingJobStatus(trainerId, 'training', progress);
      });
      
      // Log training job to database
      await this.logTrainingJob(trainerId, config);
      
      // Start training in the background
      this.trainInBackground(trainerId, trainer);
      
      return trainerId;
    } catch (error) {
      console.error('Failed to start training:', error);
      this.trainingStatus.set(trainerId, 'failed');
      throw error;
    }
  }

  /**
   * Log training job to database
   */
  private async logTrainingJob(trainerId: string, config: EnhancedTrainingConfig): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      const { error } = await supabase
        .from('ai_training_jobs')
        .insert({
          name: trainerId,
          dataset_name: config.datasetName,
          model_type: config.modelType,
          target_column: config.targetColumn,
          feature_columns: config.featureColumns,
          config: {
            datasetSource: config.datasetSource,
            kaggleDatasetId: config.kaggleDatasetId,
            testSplit: config.testSplit,
            epochs: config.epochs,
            batchSize: config.batchSize,
            learningRate: config.learningRate,
            earlyStoppingPatience: config.earlyStoppingPatience,
            regularization: config.regularization,
            hiddenLayers: config.hiddenLayers,
            activationFunction: config.activationFunction,
            optimizer: config.optimizer
          },
          status: 'training',
          progress: 0,
          user_id: userId
        });
      
      if (error) {
        console.error('Failed to log training job:', error);
      }
    } catch (error) {
      console.error('Error logging training job:', error);
    }
  }

  /**
   * Update training job status in database
   */
  private async updateTrainingJobStatus(trainerId: string, status: string, progress: number, metrics?: any): Promise<void> {
    try {
      const updateData: any = {
        status,
        progress
      };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        if (metrics) {
          updateData.metrics = metrics;
        }
      }
      
      const { error } = await supabase
        .from('ai_training_jobs')
        .update(updateData)
        .eq('name', trainerId);
      
      if (error) {
        console.error('Failed to update training job status:', error);
      }
    } catch (error) {
      console.error('Error updating training job status:', error);
    }
  }

  /**
   * Train the model in the background
   */
  private async trainInBackground(trainerId: string, trainer: EnhancedDeepMindTrainer): Promise<void> {
    try {
      // Prepare data
      this.trainingProgress.set(trainerId, 10);
      await this.updateTrainingJobStatus(trainerId, 'loading', 10);
      
      const { features, labels } = await trainer.prepareData();
      
      // Build model
      this.trainingProgress.set(trainerId, 20);
      await this.updateTrainingJobStatus(trainerId, 'training', 20);
      
      trainer.buildModel();
      
      // Train model
      this.trainingStatus.set(trainerId, 'training');
      this.trainingProgress.set(trainerId, 30);
      await this.updateTrainingJobStatus(trainerId, 'training', 30);
      
      const history = await trainer.trainModel(features, labels);
      
      // Update status
      this.trainingStatus.set(trainerId, 'completed');
      this.trainingProgress.set(trainerId, 100);
      
      // Extract metrics from training history
      const metrics = {
        finalLoss: history.history.loss[history.history.loss.length - 1],
        finalValLoss: history.history.val_loss[history.history.val_loss.length - 1],
        epochs: history.epoch.length,
        trainingTime: Date.now() - parseInt(trainerId.split('_').pop() || '0')
      };
      
      // Save model to IndexedDB
      await trainer.saveModel(`itsearth_${trainerId}`);
      
      await this.updateTrainingJobStatus(trainerId, 'completed', 100, metrics);
      
      console.log(`✅ Training completed for ${trainerId}`);
    } catch (error) {
      console.error(`❌ Training failed for ${trainerId}:`, error);
      this.trainingStatus.set(trainerId, 'failed');
      await this.updateTrainingJobStatus(trainerId, 'failed', 0);
    }
  }

  /**
   * Get the status of a training job
   */
  getTrainingStatus(trainerId: string): { status: string; progress: number } {
    return {
      status: this.trainingStatus.get(trainerId) || 'not_found',
      progress: this.trainingProgress.get(trainerId) || 0
    };
  }

  /**
   * Export a trained model for Kaggle
   */
  async exportModelForKaggle(trainerId: string): Promise<boolean> {
    const trainer = this.trainers.get(trainerId);
    
    if (!trainer) {
      throw new Error(`Trainer with ID ${trainerId} not found`);
    }
    
    if (this.trainingStatus.get(trainerId) !== 'completed') {
      throw new Error(`Training for ${trainerId} is not completed`);
    }
    
    await trainer.exportForKaggle();
    
    // Log export to database
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      const { error } = await supabase
        .from('kaggle_exports')
        .insert({
          dataset_name: trainerId,
          config: {
            exportedAt: new Date().toISOString(),
            modelType: 'deepmind',
            format: 'tensorflow.js'
          },
          record_count: 1,
          user_id: userId
        });
      
      if (error) {
        console.error('Failed to log Kaggle export:', error);
      }
    } catch (error) {
      console.error('Error logging Kaggle export:', error);
    }
    
    return true;
  }

  /**
   * Make predictions with a trained model
   */
  async predict(trainerId: string, inputData: any[]): Promise<any[]> {
    const trainer = this.trainers.get(trainerId);
    
    if (!trainer) {
      throw new Error(`Trainer with ID ${trainerId} not found`);
    }
    
    if (this.trainingStatus.get(trainerId) !== 'completed') {
      throw new Error(`Training for ${trainerId} is not completed`);
    }
    
    return await trainer.predict(inputData);
  }

  /**
   * Get all available trainers
   */
  getAvailableTrainers(): { id: string; status: string; progress: number }[] {
    return Array.from(this.trainers.keys()).map(id => ({
      id,
      status: this.trainingStatus.get(id) || 'unknown',
      progress: this.trainingProgress.get(id) || 0
    }));
  }

  /**
   * Load previously trained models from database
   */
  async loadSavedModels(): Promise<string[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('ai_training_jobs')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed');
      
      if (error) {
        console.error('Error loading saved models:', error);
        return [];
      }
      
      const modelIds: string[] = [];
      
      // Try to load each model from IndexedDB
      for (const job of data || []) {
        const modelId = job.name;
        const modelName = `itsearth_${modelId}`;
        
        try {
          const trainer = new EnhancedDeepMindTrainer(job.config);
          const loaded = await trainer.loadModel(modelName);
          
          if (loaded) {
            this.trainers.set(modelId, trainer);
            this.trainingStatus.set(modelId, 'completed');
            this.trainingProgress.set(modelId, 100);
            modelIds.push(modelId);
          }
        } catch (error) {
          console.warn(`Could not load model ${modelName}:`, error);
        }
      }
      
      console.log(`✅ Loaded ${modelIds.length} saved models`);
      return modelIds;
    } catch (error) {
      console.error('Error loading saved models:', error);
      return [];
    }
  }
}

export const enhancedDeepMindService = EnhancedDeepMindService.getInstance();