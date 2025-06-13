import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Pause,
  FileDown,
  Upload,
  Settings,
  Cpu,
  MessageCircle,
  Wifi,
  MapPin,
  Globe,
  Search
} from 'lucide-react';
import { enhancedDeepMindService } from '../../lib/ai/enhancedDeepMindService';
import EnhancedDeepMindDashboard from './EnhancedDeepMindDashboard';

interface DeepMindTrainingDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeepMindTrainingDashboard({ isOpen, onClose }: DeepMindTrainingDashboardProps) {
  const [showEnhancedDashboard, setShowEnhancedDashboard] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Initialize the enhanced DeepMind service
      enhancedDeepMindService.initialize();
      
      // Automatically show the enhanced dashboard
      setShowEnhancedDashboard(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // If enhanced dashboard is enabled, show it
  if (showEnhancedDashboard) {
    return <EnhancedDeepMindDashboard isOpen={isOpen} onClose={onClose} />;
  }

  // Otherwise show a transition screen (this should rarely be seen)
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
        className="bg-surface-deep border border-accent-neural/20 rounded-2xl w-full max-w-md p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Brain size={48} className="mx-auto text-purple-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Loading DeepMind Training</h2>
        <p className="text-gray-400 mb-6">Preparing enhanced training capabilities with Kaggle integration...</p>
        
        <div className="w-full bg-surface-mid rounded-full h-2 mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5 }}
          />
        </div>
        
        <button
          onClick={() => setShowEnhancedDashboard(true)}
          className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Continue to Enhanced Dashboard
        </button>
      </motion.div>
    </motion.div>
  );
}