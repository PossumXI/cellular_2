import { DeepMindTrainer, TrainingConfig } from './deepMindTraining';
import { supabase } from '../supabase';

export class DeepMindService {
  private static instance: DeepMindService;
  private trainers: Map<string, DeepMindTrainer> = new Map();
  private trainingStatus: Map<string, 'idle' | 'training' | 'completed' | 'failed'> = new Map();
  private trainingProgress: Map<string, number> = new Map();

  static getInstance(): DeepMindService {
    if (!DeepMindService.instance) {
      DeepMindService.instance = new DeepMindService();
    }
    return DeepMindService.instance;
  }

  /**
   * Create a new training configuration for a specific use case
   */
  createTrainingConfig(
    datasetName: string,
    modelType: 'classification' | 'regression' | 'nlp',
    targetColumn: string,
    featureColumns: string[]
  ): TrainingConfig {
    return {
      datasetName,
      modelType,
      targetColumn,
      featureColumns,
      testSplit: 0.2,
      epochs: 50,
      batchSize: 32,
      learningRate: 0.001
    };
  }

  /**
   * Get predefined training configurations for common use cases
   */
  getPredefinedConfigs(): { [key: string]: TrainingConfig } {
    return {
      // Social engagement prediction
      socialEngagementSentiment: {
        datasetName: 'social_engagement',
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
        learningRate: 0.001
      },
      
      // Network performance prediction
      networkPerformance: {
        datasetName: 'network_performance',
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
        learningRate: 0.001
      },
      
      // AI interaction classification
      aiInteractionType: {
        datasetName: 'ai_interactions',
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
        learningRate: 0.001
      },
      
      // Location popularity prediction
      locationPopularity: {
        datasetName: 'location_activity',
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
        learningRate: 0.001
      }
    };
  }

  /**
   * Start training a model with the given configuration
   */
  async startTraining(config: TrainingConfig): Promise<string> {
    const trainerId = `${config.datasetName}_${config.targetColumn}_${Date.now()}`;
    
    try {
      console.log(`🚀 Starting DeepMind training for ${config.datasetName}`);
      
      // Create a new trainer
      const trainer = new DeepMindTrainer(config);
      this.trainers.set(trainerId, trainer);
      this.trainingStatus.set(trainerId, 'training');
      this.trainingProgress.set(trainerId, 0);
      
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
  private async logTrainingJob(trainerId: string, config: TrainingConfig): Promise<void> {
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
            testSplit: config.testSplit,
            epochs: config.epochs,
            batchSize: config.batchSize,
            learningRate: config.learningRate
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
  private async trainInBackground(trainerId: string, trainer: DeepMindTrainer): Promise<void> {
    try {
      // Prepare data
      this.trainingProgress.set(trainerId, 10);
      await this.updateTrainingJobStatus(trainerId, 'training', 10);
      
      const { features, labels } = await trainer.prepareData();
      
      // Build model
      this.trainingProgress.set(trainerId, 20);
      await this.updateTrainingJobStatus(trainerId, 'training', 20);
      
      trainer.buildModel();
      
      // Train model
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
          dataset_name: trainer['config'].datasetName,
          config: {
            modelType: trainer['config'].modelType,
            targetColumn: trainer['config'].targetColumn,
            featureColumns: trainer['config'].featureColumns,
            exportedAt: new Date().toISOString()
          },
          record_count: trainer['datasetStats']?.recordCount || 0,
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
}

export type { TrainingConfig } from './deepMindTraining';
export const deepMindService = DeepMindService.getInstance();