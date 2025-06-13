import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  BarChart3, 
  Database, 
  Download, 
  RefreshCw, 
  X, 
  Check, 
  AlertCircle,
  Loader,
  Play,
  FileDown,
  Settings,
  Cpu,
  MessageCircle,
  Wifi,
  MapPin,
  Search,
  Globe,
  ArrowRight,
  ChevronRight,
  Filter,
  Zap,
  BookOpen
} from 'lucide-react';
import { enhancedDeepMindService } from '../../lib/ai/enhancedDeepMindService';
import { kaggleDatasetService, KaggleDataset } from '../../lib/ai/kaggleDatasets';
import { EnhancedTrainingConfig } from '../../lib/ai/deepMindTrainingEnhanced';

interface EnhancedDeepMindDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnhancedDeepMindDashboard({ isOpen, onClose }: EnhancedDeepMindDashboardProps) {
  const [activeTab, setActiveTab] = useState('datasets');
  const [selectedDataset, setSelectedDataset] = useState<KaggleDataset | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<EnhancedTrainingConfig | null>(null);
  const [customConfig, setCustomConfig] = useState<Partial<EnhancedTrainingConfig>>({});
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [trainingId, setTrainingId] = useState<string | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<{ status: string; progress: number } | null>(null);
  const [kaggleDatasets, setKaggleDatasets] = useState<KaggleDataset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const categories = [
    { id: 'social_media', name: 'Social Media', icon: MessageCircle, color: 'text-pink-400' },
    { id: 'network', name: 'Network Performance', icon: Wifi, color: 'text-blue-400' },
    { id: 'ai', name: 'AI Interactions', icon: Cpu, color: 'text-purple-400' },
    { id: 'location', name: 'Location Activity', icon: MapPin, color: 'text-green-400' },
    { id: 'environmental', name: 'Environmental', icon: Globe, color: 'text-teal-400' },
    { id: 'weather', name: 'Weather', icon: Cloud, color: 'text-cyan-400' }
  ];

  useEffect(() => {
    if (isOpen) {
      refreshTrainers();
      fetchKaggleDatasets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCategory) {
      fetchKaggleDatasets(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (trainingId) {
      const interval = setInterval(() => {
        const status = enhancedDeepMindService.getTrainingStatus(trainingId);
        setTrainingStatus(status);
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          refreshTrainers();
          
          if (status.status === 'completed') {
            setSuccess('Training completed successfully!');
          } else {
            setError('Training failed. Please check the console for details.');
          }
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [trainingId]);

  const refreshTrainers = async () => {
    try {
      const availableTrainers = enhancedDeepMindService.getAvailableTrainers();
      setTrainers(availableTrainers);
      
      // Also load any saved models
      await enhancedDeepMindService.loadSavedModels();
    } catch (error) {
      console.error('Failed to get trainers:', error);
    }
  };

  const fetchKaggleDatasets = async (category?: string) => {
    setLoading(true);
    try {
      const datasets = await kaggleDatasetService.getAvailableDatasets(category);
      setKaggleDatasets(datasets);
    } catch (error) {
      console.error('Failed to fetch Kaggle datasets:', error);
      setError('Failed to fetch Kaggle datasets. Using cached data if available.');
    } finally {
      setLoading(false);
    }
  };

  const handleDatasetSelect = (dataset: KaggleDataset) => {
    setSelectedDataset(dataset);
    setActiveTab('configs');
    
    // Find matching predefined configs for this dataset
    const predefinedConfigs = enhancedDeepMindService.getPredefinedConfigs();
    const matchingConfigKey = Object.keys(predefinedConfigs).find(key => 
      predefinedConfigs[key].kaggleDatasetId === dataset.id
    );
    
    if (matchingConfigKey) {
      setSelectedConfig(predefinedConfigs[matchingConfigKey]);
    } else {
      // Create a default config for this dataset
      const defaultConfig = enhancedDeepMindService.createTrainingConfig(
        dataset.category,
        'kaggle',
        dataset.id,
        'regression',
        dataset.columns?.[0] || 'target',
        dataset.columns?.slice(1, 6) || []
      );
      setSelectedConfig(defaultConfig);
    }
    
    setCustomConfig({});
  };

  const handleConfigSelect = (config: EnhancedTrainingConfig) => {
    setSelectedConfig(config);
    setCustomConfig({});
  };

  const handleCustomConfigChange = (field: keyof EnhancedTrainingConfig, value: any) => {
    setCustomConfig({
      ...customConfig,
      [field]: value
    });
  };

  const handleStartTraining = async () => {
    if (!selectedConfig) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // If the dataset is from Kaggle and hasn't been imported yet, import it first
      if (selectedConfig.datasetSource === 'kaggle' && selectedConfig.kaggleDatasetId) {
        setIsImporting(true);
        setImportProgress(0);
        
        // Simulate import progress
        const progressInterval = setInterval(() => {
          setImportProgress(prev => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + Math.random() * 10;
          });
        }, 500);
        
        // Import the dataset
        const importSuccess = await kaggleDatasetService.importDatasetToSupabase(
          selectedConfig.kaggleDatasetId,
          selectedConfig.datasetName
        );
        
        clearInterval(progressInterval);
        setImportProgress(100);
        
        if (!importSuccess) {
          setError('Failed to import dataset from Kaggle');
          setLoading(false);
          setIsImporting(false);
          return;
        }
        
        setImportSuccess(`Successfully imported dataset from Kaggle`);
        setTimeout(() => setImportSuccess(null), 3000);
        setIsImporting(false);
      }
      
      // Merge selected config with custom overrides
      const finalConfig = {
        ...selectedConfig,
        ...customConfig
      };
      
      const trainerId = await enhancedDeepMindService.startTraining(finalConfig);
      setTrainingId(trainerId);
      setSuccess('Training started successfully!');
      setActiveTab('monitoring');
    } catch (err: any) {
      setError(err.message || 'Failed to start training');
    } finally {
      setLoading(false);
    }
  };

  const handleExportForKaggle = async (trainerId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await enhancedDeepMindService.exportModelForKaggle(trainerId);
      setSuccess('Model exported successfully for Kaggle!');
    } catch (err: any) {
      setError(err.message || 'Failed to export model');
    } finally {
      setLoading(false);
    }
  };

  const filteredDatasets = searchQuery
    ? kaggleDatasets.filter(dataset => 
        dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dataset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dataset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : kaggleDatasets;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-surface-deep border border-accent-neural/20 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-light">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Brain className="text-purple-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">DeepMind Training with Kaggle</h2>
              <p className="text-gray-400">Import datasets from Kaggle and train custom AI models</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => refreshTrainers()}
              className="p-2 text-gray-400 hover:text-accent-neural transition-colors"
              title="Refresh Trainers"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-surface-light">
          <button
            onClick={() => setActiveTab('datasets')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'datasets'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5'
                : 'text-gray-400 hover:text-white hover:bg-surface-mid'
            }`}
          >
            <Database size={16} />
            Kaggle Datasets
          </button>
          
          <button
            onClick={() => setActiveTab('configs')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'configs'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5'
                : 'text-gray-400 hover:text-white hover:bg-surface-mid'
            }`}
          >
            <Settings size={16} />
            Training Configs
          </button>
          
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'monitoring'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5'
                : 'text-gray-400 hover:text-white hover:bg-surface-mid'
            }`}
          >
            <BarChart3 size={16} />
            Monitoring
          </button>
          
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'export'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5'
                : 'text-gray-400 hover:text-white hover:bg-surface-mid'
            }`}
          >
            <FileDown size={16} />
            Export for Kaggle
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {/* Datasets Tab */}
          {activeTab === 'datasets' && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Kaggle Datasets</h3>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search datasets..."
                      className="bg-surface-mid border border-surface-light rounded-lg pl-10 pr-4 py-2 text-white text-sm w-64"
                    />
                  </div>
                  
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <select
                      value={selectedCategory || ''}
                      onChange={(e) => setSelectedCategory(e.target.value || null)}
                      className="bg-surface-mid border border-surface-light rounded-lg pl-10 pr-4 py-2 text-white text-sm appearance-none"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Categories */}
              <div className="flex flex-wrap gap-3 mb-6">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === category.id
                        ? `bg-surface-light ${category.color} border border-${category.color.replace('text-', '')}/30`
                        : 'bg-surface-mid text-gray-400 hover:bg-surface-light hover:text-white'
                    }`}
                  >
                    <category.icon size={16} />
                    {category.name}
                  </button>
                ))}
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center">
                    <Loader size={32} className="text-purple-400 animate-spin mb-4" />
                    <p className="text-gray-400">Loading Kaggle datasets...</p>
                  </div>
                </div>
              ) : filteredDatasets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Database size={48} className="text-gray-500 mb-4" />
                  <p className="text-gray-400 mb-2">No datasets found</p>
                  <p className="text-gray-500 text-sm max-w-md">
                    {searchQuery 
                      ? `No results for "${searchQuery}". Try a different search term.` 
                      : 'Try selecting a different category or search for specific datasets.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredDatasets.map((dataset) => (
                    <motion.div
                      key={dataset.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-surface-mid rounded-lg overflow-hidden border border-surface-light hover:border-purple-400/30 transition-all cursor-pointer"
                      onClick={() => handleDatasetSelect(dataset)}
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-purple-500/20 rounded-lg">
                            <Database className="text-purple-400" size={24} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-white mb-2">{dataset.name}</h4>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{dataset.description}</p>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                              {dataset.tags.slice(0, 4).map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-surface-deep rounded-full text-xs text-gray-300">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <div>Size: {dataset.size}</div>
                              <div>Updated: {dataset.lastUpdated}</div>
                              <div>{dataset.rowCount?.toLocaleString() || 'Unknown'} rows</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="px-6 py-3 bg-surface-deep border-t border-surface-light flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${getCategoryColor(dataset.category)}`}></span>
                          <span className="text-sm text-gray-400 capitalize">{dataset.category.replace('_', ' ')}</span>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDatasetSelect(dataset);
                          }}
                          className="text-purple-400 text-sm hover:text-purple-300 transition-colors flex items-center gap-1"
                        >
                          Select <ChevronRight size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Configs Tab */}
          {activeTab === 'configs' && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Training Configuration</h3>
                
                {selectedDataset && (
                  <div className="flex items-center gap-2 text-sm bg-purple-500/10 px-3 py-1 rounded-full">
                    <Database size={14} className="text-purple-400" />
                    <span className="text-purple-400">{selectedDataset.name}</span>
                  </div>
                )}
              </div>
              
              {!selectedDataset ? (
                <div className="bg-surface-mid rounded-lg p-6 text-center">
                  <Database size={48} className="mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400 mb-2">No dataset selected</p>
                  <button
                    onClick={() => setActiveTab('datasets')}
                    className="mt-4 text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Select a Kaggle Dataset
                  </button>
                </div>
              ) : (
                <>
                  {/* Dataset Info */}
                  <div className="bg-surface-mid rounded-lg p-6 mb-6">
                    <h4 className="text-md font-medium text-white mb-4 flex items-center gap-2">
                      <Database size={16} className="text-purple-400" />
                      Dataset Information
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-gray-400 text-sm mb-4">{selectedDataset.description}</p>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Size:</span>
                            <span className="text-white">{selectedDataset.size}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Last Updated:</span>
                            <span className="text-white">{selectedDataset.lastUpdated}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Row Count:</span>
                            <span className="text-white">{selectedDataset.rowCount?.toLocaleString() || 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Category:</span>
                            <span className="text-white capitalize">{selectedDataset.category.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium text-white mb-2">Available Columns</h5>
                        <div className="bg-surface-deep rounded-lg p-3 max-h-40 overflow-y-auto">
                          <ul className="space-y-1 text-sm">
                            {selectedDataset.columns?.map((column, index) => (
                              <li key={index} className="text-gray-300 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                                {column}
                              </li>
                            )) || (
                              <li className="text-gray-400">Column information not available</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Model Configuration */}
                  {selectedConfig && (
                    <div className="bg-surface-mid rounded-lg p-6 mb-6">
                      <h4 className="text-md font-medium text-white mb-4 flex items-center gap-2">
                        <Settings size={16} className="text-purple-400" />
                        Model Configuration
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Model Type
                          </label>
                          <select
                            value={customConfig.modelType || selectedConfig.modelType}
                            onChange={(e) => handleCustomConfigChange('modelType', e.target.value)}
                            className="w-full bg-surface-deep border border-surface-light rounded-lg px-3 py-2 text-white"
                          >
                            <option value="classification">Classification</option>
                            <option value="regression">Regression</option>
                            <option value="nlp">NLP</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Target Column
                          </label>
                          <select
                            value={customConfig.targetColumn || selectedConfig.targetColumn}
                            onChange={(e) => handleCustomConfigChange('targetColumn', e.target.value)}
                            className="w-full bg-surface-deep border border-surface-light rounded-lg px-3 py-2 text-white"
                          >
                            {selectedDataset.columns?.map((column, index) => (
                              <option key={index} value={column}>{column}</option>
                            )) || (
                              <option value={selectedConfig.targetColumn}>{selectedConfig.targetColumn}</option>
                            )}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Optimizer
                          </label>
                          <select
                            value={customConfig.optimizer || selectedConfig.optimizer || 'adam'}
                            onChange={(e) => handleCustomConfigChange('optimizer', e.target.value)}
                            className="w-full bg-surface-deep border border-surface-light rounded-lg px-3 py-2 text-white"
                          >
                            <option value="adam">Adam</option>
                            <option value="sgd">SGD</option>
                            <option value="rmsprop">RMSprop</option>
                            <option value="adagrad">Adagrad</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Epochs
                          </label>
                          <input
                            type="number"
                            value={customConfig.epochs || selectedConfig.epochs}
                            onChange={(e) => handleCustomConfigChange('epochs', parseInt(e.target.value))}
                            min="1"
                            max="1000"
                            className="w-full bg-surface-deep border border-surface-light rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Batch Size
                          </label>
                          <input
                            type="number"
                            value={customConfig.batchSize || selectedConfig.batchSize}
                            onChange={(e) => handleCustomConfigChange('batchSize', parseInt(e.target.value))}
                            min="1"
                            max="512"
                            className="w-full bg-surface-deep border border-surface-light rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Learning Rate
                          </label>
                          <input
                            type="number"
                            value={customConfig.learningRate || selectedConfig.learningRate}
                            onChange={(e) => handleCustomConfigChange('learningRate', parseFloat(e.target.value))}
                            min="0.0001"
                            max="0.1"
                            step="0.0001"
                            className="w-full bg-surface-deep border border-surface-light rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Test Split
                          </label>
                          <input
                            type="number"
                            value={customConfig.testSplit || selectedConfig.testSplit}
                            onChange={(e) => handleCustomConfigChange('testSplit', parseFloat(e.target.value))}
                            min="0.1"
                            max="0.5"
                            step="0.05"
                            className="w-full bg-surface-deep border border-surface-light rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Early Stopping Patience
                          </label>
                          <input
                            type="number"
                            value={customConfig.earlyStoppingPatience || selectedConfig.earlyStoppingPatience || 5}
                            onChange={(e) => handleCustomConfigChange('earlyStoppingPatience', parseInt(e.target.value))}
                            min="0"
                            max="50"
                            className="w-full bg-surface-deep border border-surface-light rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Activation Function
                          </label>
                          <select
                            value={customConfig.activationFunction || selectedConfig.activationFunction || 'relu'}
                            onChange={(e) => handleCustomConfigChange('activationFunction', e.target.value)}
                            className="w-full bg-surface-deep border border-surface-light rounded-lg px-3 py-2 text-white"
                          >
                            <option value="relu">ReLU</option>
                            <option value="sigmoid">Sigmoid</option>
                            <option value="tanh">Tanh</option>
                            <option value="elu">ELU</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Feature Columns
                        </label>
                        <div className="bg-surface-deep border border-surface-light rounded-lg p-3 max-h-40 overflow-y-auto">
                          {selectedDataset.columns ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {selectedDataset.columns.map((column, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`column-${index}`}
                                    checked={(customConfig.featureColumns || selectedConfig.featureColumns).includes(column)}
                                    onChange={(e) => {
                                      const currentFeatures = customConfig.featureColumns || selectedConfig.featureColumns;
                                      if (e.target.checked) {
                                        handleCustomConfigChange('featureColumns', [...currentFeatures, column]);
                                      } else {
                                        handleCustomConfigChange('featureColumns', 
                                          currentFeatures.filter(col => col !== column)
                                        );
                                      }
                                    }}
                                    className="accent-purple-400"
                                  />
                                  <label htmlFor={`column-${index}`} className="text-sm text-gray-300">
                                    {column}
                                  </label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm">
                              Feature columns: {(customConfig.featureColumns || selectedConfig.featureColumns).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Import & Training Status */}
                  {isImporting && (
                    <div className="bg-surface-mid rounded-lg p-6 mb-6">
                      <h4 className="text-md font-medium text-white mb-4 flex items-center gap-2">
                        <Database size={16} className="text-blue-400" />
                        Importing Dataset from Kaggle
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Import Progress</span>
                          <span className="text-white">{Math.round(importProgress)}%</span>
                        </div>
                        <div className="w-full bg-surface-deep rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${importProgress}%` }}
                          />
                        </div>
                        
                        <p className="text-sm text-gray-400">
                          Importing dataset from Kaggle. This may take a few minutes depending on the size of the dataset.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {importSuccess && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
                      <div className="flex items-center gap-2 text-green-400">
                        <Check size={16} />
                        <span>{importSuccess}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Start Training Button */}
                  {selectedConfig && !isImporting && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleStartTraining}
                        disabled={loading}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <Loader size={18} className="animate-spin" />
                            Initializing Training...
                          </>
                        ) : (
                          <>
                            <Play size={18} />
                            Start Training with Kaggle Data
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
              
              {/* Status Messages */}
              {error && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300">
                  <div className="flex items-center gap-2">
                    <Check size={16} />
                    <span>{success}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="p-6 h-full overflow-y-auto">
              <h3 className="text-lg font-semibold text-white mb-6">Training Monitoring</h3>
              
              {trainers.length === 0 && !trainingId ? (
                <div className="bg-surface-mid rounded-lg p-6 text-center">
                  <BarChart3 size={48} className="mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400 mb-2">No active or completed training sessions</p>
                  <button
                    onClick={() => setActiveTab('datasets')}
                    className="mt-4 text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Start New Training with Kaggle Data
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Active Training */}
                  {trainingId && trainingStatus && (
                    <div className="bg-surface-mid rounded-lg p-6 border border-purple-500/30">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-white flex items-center gap-2">
                          <Cpu size={18} className="text-purple-400" />
                          Active Training Session
                        </h4>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">Status:</span>
                          <span className={`text-sm font-medium ${
                            trainingStatus.status === 'loading' ? 'text-blue-400' :
                            trainingStatus.status === 'training' ? 'text-yellow-400' :
                            trainingStatus.status === 'completed' ? 'text-green-400' :
                            trainingStatus.status === 'failed' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {trainingStatus.status.charAt(0).toUpperCase() + trainingStatus.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white">{trainingStatus.progress}%</span>
                        </div>
                        <div className="w-full bg-surface-deep rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${trainingStatus.progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        {trainingStatus.status === 'training' || trainingStatus.status === 'loading' ? (
                          <button
                            className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                            disabled
                          >
                            <Loader size={14} className="animate-spin" />
                            Training in Progress
                          </button>
                        ) : trainingStatus.status === 'completed' ? (
                          <button
                            onClick={() => handleExportForKaggle(trainingId)}
                            className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-green-500/30 transition-colors"
                          >
                            <FileDown size={14} />
                            Export for Kaggle
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveTab('configs')}
                            className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-red-500/30 transition-colors"
                          >
                            <RefreshCw size={14} />
                            Retry Training
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Training History */}
                  <div>
                    <h4 className="text-md font-medium text-white mb-3">Training History</h4>
                    
                    <div className="space-y-3">
                      {trainers.map((trainer) => (
                        <div
                          key={trainer.id}
                          className="bg-surface-mid rounded-lg p-4 border border-surface-light"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Brain size={16} className="text-purple-400" />
                              <span className="text-white font-medium">{trainer.id}</span>
                            </div>
                            
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              trainer.status === 'loading' ? 'bg-blue-500/20 text-blue-400' :
                              trainer.status === 'training' ? 'bg-yellow-500/20 text-yellow-400' :
                              trainer.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              trainer.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {trainer.status.charAt(0).toUpperCase() + trainer.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="w-full bg-surface-deep rounded-full h-1 mb-3">
                            <div
                              className={`h-1 rounded-full transition-all duration-500 ${
                                trainer.status === 'completed' ? 'bg-green-500' :
                                trainer.status === 'failed' ? 'bg-red-500' :
                                'bg-purple-500'
                              }`}
                              style={{ width: `${trainer.progress}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-end">
                            {trainer.status === 'completed' && (
                              <button
                                onClick={() => handleExportForKaggle(trainer.id)}
                                className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                              >
                                <FileDown size={12} />
                                Export for Kaggle
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="p-6 h-full overflow-y-auto">
              <h3 className="text-lg font-semibold text-white mb-6">Export for Kaggle</h3>
              
              <div className="bg-surface-mid rounded-lg p-6 mb-6">
                <h4 className="text-md font-medium text-white mb-4 flex items-center gap-2">
                  <FileDown size={18} className="text-blue-400" />
                  Kaggle Export Options
                </h4>
                
                <p className="text-gray-400 mb-6">
                  Export your trained DeepMind models and datasets for use in Kaggle competitions or for further analysis.
                  This allows you to share your work with the data science community and collaborate on improving models.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface-deep rounded-lg p-4 border border-surface-light">
                    <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                      <Brain size={16} className="text-purple-400" />
                      Model + Weights
                    </h5>
                    <p className="text-sm text-gray-400 mb-4">
                      Export the trained model architecture and weights for use in other applications or for further training.
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">TensorFlow.js format</span>
                      <input type="checkbox" checked className="accent-purple-400" />
                    </div>
                  </div>
                  
                  <div className="bg-surface-deep rounded-lg p-4 border border-surface-light">
                    <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                      <Database size={16} className="text-blue-400" />
                      Dataset
                    </h5>
                    <p className="text-sm text-gray-400 mb-4">
                      Export the training dataset in CSV format for use in other tools or for sharing with collaborators.
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">CSV format</span>
                      <input type="checkbox" checked className="accent-purple-400" />
                    </div>
                  </div>
                  
                  <div className="bg-surface-deep rounded-lg p-4 border border-surface-light">
                    <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                      <BarChart3 size={16} className="text-green-400" />
                      Training Metrics
                    </h5>
                    <p className="text-sm text-gray-400 mb-4">
                      Export training history and performance metrics to analyze model performance and identify areas for improvement.
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">JSON format</span>
                      <input type="checkbox" checked className="accent-purple-400" />
                    </div>
                  </div>
                  
                  <div className="bg-surface-deep rounded-lg p-4 border border-surface-light">
                    <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                      <BookOpen size={16} className="text-yellow-400" />
                      Documentation
                    </h5>
                    <p className="text-sm text-gray-400 mb-4">
                      Export comprehensive documentation including model architecture, training parameters, and usage instructions.
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Markdown format</span>
                      <input type="checkbox" checked className="accent-purple-400" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-surface-mid rounded-lg p-6">
                <h4 className="text-md font-medium text-white mb-4">Available Models for Export</h4>
                
                {trainers.filter(t => t.status === 'completed').length === 0 ? (
                  <div className="text-center py-8">
                    <FileDown size={48} className="mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-400 mb-2">No completed models available for export</p>
                    <button
                      onClick={() => setActiveTab('datasets')}
                      className="mt-4 text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Train a model with Kaggle data first
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trainers
                      .filter(t => t.status === 'completed')
                      .map((trainer) => (
                        <div
                          key={trainer.id}
                          className="bg-surface-deep rounded-lg p-4 border border-surface-light"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Brain size={16} className="text-purple-400" />
                              <span className="text-white font-medium">{trainer.id}</span>
                            </div>
                            
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                              Ready for Export
                            </span>
                          </div>
                          
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleExportForKaggle(trainer.id)}
                              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                            >
                              <FileDown size={14} />
                              Export for Kaggle
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper function to get category color
function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    'social_media': 'bg-pink-400',
    'network': 'bg-blue-400',
    'ai': 'bg-purple-400',
    'location': 'bg-green-400',
    'environmental': 'bg-teal-400',
    'weather': 'bg-cyan-400'
  };
  
  return colorMap[category] || 'bg-gray-400';
}

// Cloud icon component
function Cloud(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}