import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileDown, 
  X, 
  Database, 
  Check, 
  Loader, 
  AlertCircle,
  Tag,
  Users,
  FileText,
  Globe
} from 'lucide-react';
import { kaggleExportService, KaggleDatasetConfig } from '../../lib/ai/kaggleExport';

interface KaggleExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName?: string;
}

export default function KaggleExportModal({ isOpen, onClose, tableName = 'social_engagement_analytics' }: KaggleExportModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<KaggleDatasetConfig>({
    title: getDefaultTitle(tableName),
    subtitle: getDefaultSubtitle(tableName),
    description: getDefaultDescription(tableName),
    keywords: getDefaultKeywords(tableName),
    licenses: [
      {
        name: 'CC0-1.0',
        text: 'Creative Commons Zero v1.0 Universal'
      }
    ],
    resources: [
      {
        path: `${tableName}.csv`,
        description: `Main dataset file containing ${tableName} data`
      }
    ],
    contributors: [
      {
        name: 'ItsEarth',
        role: 'Owner'
      }
    ]
  });

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await kaggleExportService.exportDataset(tableName, config);
      setSuccess('Dataset exported successfully for Kaggle!');
      
      // Log the export to the database
      try {
        await kaggleExportService.logExport(tableName, config);
      } catch (logError) {
        console.warn('Failed to log export, but files were created successfully:', logError);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to export dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field: keyof KaggleDatasetConfig, value: any) => {
    setConfig({
      ...config,
      [field]: value
    });
  };

  const handleKeywordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      keywords: e.target.value.split(',').map(k => k.trim())
    });
  };

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
        className="bg-surface-deep border border-accent-neural/20 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-light">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileDown className="text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Export for Kaggle</h2>
              <p className="text-gray-400">Prepare your data for Kaggle competitions</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} className="text-blue-400" />
              <h3 className="text-lg font-medium text-white">Dataset Configuration</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Dataset Title
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => handleConfigChange('title', e.target.value)}
                  className="w-full bg-surface-mid border border-surface-light rounded-lg px-3 py-2 text-white"
                  placeholder="Enter dataset title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={config.subtitle}
                  onChange={(e) => handleConfigChange('subtitle', e.target.value)}
                  className="w-full bg-surface-mid border border-surface-light rounded-lg px-3 py-2 text-white"
                  placeholder="Enter dataset subtitle"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  value={config.description}
                  onChange={(e) => handleConfigChange('description', e.target.value)}
                  className="w-full bg-surface-mid border border-surface-light rounded-lg px-3 py-2 text-white h-32"
                  placeholder="Enter dataset description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Tag size={14} />
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={config.keywords.join(', ')}
                  onChange={handleKeywordsChange}
                  className="w-full bg-surface-mid border border-surface-light rounded-lg px-3 py-2 text-white"
                  placeholder="Enter keywords, separated by commas"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <FileText size={14} />
                  License
                </label>
                <select
                  value={config.licenses[0].name}
                  onChange={(e) => handleConfigChange('licenses', [{ name: e.target.value, text: getLicenseText(e.target.value) }])}
                  className="w-full bg-surface-mid border border-surface-light rounded-lg px-3 py-2 text-white"
                >
                  <option value="CC0-1.0">CC0 1.0 (Public Domain)</option>
                  <option value="CC-BY-4.0">CC BY 4.0</option>
                  <option value="CC-BY-SA-4.0">CC BY-SA 4.0</option>
                  <option value="MIT">MIT License</option>
                  <option value="GPL-3.0">GPL 3.0</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Users size={14} />
                  Contributors
                </label>
                <div className="flex items-center gap-2 p-3 bg-surface-mid border border-surface-light rounded-lg">
                  <span className="text-white">ItsEarth</span>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">Owner</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={18} className="text-green-400" />
              <h3 className="text-lg font-medium text-white">Kaggle Integration</h3>
            </div>
            
            <div className="p-4 bg-surface-mid rounded-lg">
              <p className="text-gray-400 text-sm mb-4">
                This will prepare your dataset for upload to Kaggle. The export will include:
              </p>
              
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-green-400" />
                  CSV file with your data
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-green-400" />
                  dataset-metadata.json for Kaggle configuration
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-green-400" />
                  README.md with dataset documentation
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-green-400" />
                  LICENSE file with terms of use
                </li>
              </ul>
            </div>
          </div>
          
          {/* Status Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300">
              <div className="flex items-center gap-2">
                <Check size={16} />
                <span>{success}</span>
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown size={18} />
                  Export for Kaggle
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper functions
function getDefaultTitle(tableName: string): string {
  const titles: Record<string, string> = {
    'social_engagement_analytics': 'Social Engagement Analytics Dataset',
    'network_performance_analytics': 'Network Performance Analytics Dataset',
    'ai_interaction_analytics': 'AI Interaction Analytics Dataset',
    'location_activity_heatmap': 'Location Activity Heatmap Dataset'
  };
  
  return titles[tableName] || `${tableName.replace(/_/g, ' ')} Dataset`;
}

function getDefaultSubtitle(tableName: string): string {
  const subtitles: Record<string, string> = {
    'social_engagement_analytics': 'Real-world social media engagement data with sentiment analysis',
    'network_performance_analytics': 'Comprehensive network performance metrics across global locations',
    'ai_interaction_analytics': 'User interactions with AI systems including processing times and costs',
    'location_activity_heatmap': 'Geospatial activity patterns with temporal dimensions'
  };
  
  return subtitles[tableName] || `Comprehensive data from ${tableName.replace(/_/g, ' ')}`;
}

function getDefaultDescription(tableName: string): string {
  const descriptions: Record<string, string> = {
    'social_engagement_analytics': 'This dataset contains real-world social media engagement metrics collected from various locations around the globe. It includes sentiment analysis, trending topics, engagement rates, and user activity patterns. The data is valuable for social media analytics, sentiment prediction, and trend forecasting.',
    
    'network_performance_analytics': 'A comprehensive dataset of network performance metrics including download/upload speeds, latency, jitter, and signal strength across different network types and geographic locations. This data is ideal for network quality prediction, coverage mapping, and performance optimization research.',
    
    'ai_interaction_analytics': 'This dataset captures user interactions with AI systems, including query types, processing times, API costs, and user satisfaction metrics. It provides valuable insights for AI performance optimization, cost analysis, and user experience research.',
    
    'location_activity_heatmap': 'A geospatial dataset showing activity patterns across different locations with temporal dimensions (hour of day, day of week). The data includes interaction counts, unique users, and session durations, making it ideal for footfall analysis, urban planning, and location-based service optimization.'
  };
  
  return descriptions[tableName] || `This dataset contains comprehensive data from ${tableName.replace(/_/g, ' ')} that can be used for various machine learning and data analysis tasks.`;
}

function getDefaultKeywords(tableName: string): string[] {
  const keywords: Record<string, string[]> = {
    'social_engagement_analytics': ['social media', 'sentiment analysis', 'engagement', 'trending topics', 'social analytics'],
    'network_performance_analytics': ['network performance', 'connectivity', '5G', 'latency', 'bandwidth', 'signal strength'],
    'ai_interaction_analytics': ['AI', 'machine learning', 'user interaction', 'processing time', 'API cost', 'user satisfaction'],
    'location_activity_heatmap': ['geospatial', 'location analytics', 'heatmap', 'temporal patterns', 'user activity']
  };
  
  return keywords[tableName] || ['data analytics', 'machine learning', 'dataset'];
}

function getLicenseText(licenseName: string): string {
  const licenseTexts: Record<string, string> = {
    'CC0-1.0': 'Creative Commons Zero v1.0 Universal',
    'CC-BY-4.0': 'Creative Commons Attribution 4.0 International',
    'CC-BY-SA-4.0': 'Creative Commons Attribution-ShareAlike 4.0 International',
    'MIT': 'MIT License',
    'GPL-3.0': 'GNU General Public License v3.0'
  };
  
  return licenseTexts[licenseName] || '';
}