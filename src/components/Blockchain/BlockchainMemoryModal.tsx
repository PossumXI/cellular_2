import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  X, 
  Clock, 
  MessageCircle, 
  Brain, 
  Zap, 
  Shield, 
  Link, 
  ExternalLink,
  Loader,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { LocationCell } from '../../types';
import { algorandService } from '../../lib/apis/algorand';

interface BlockchainMemoryModalProps {
  location: LocationCell;
  isVisible: boolean;
  onClose: () => void;
}

export default function BlockchainMemoryModal({ 
  location, 
  isVisible, 
  onClose 
}: BlockchainMemoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memoryData, setMemoryData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'interactions' | 'personality' | 'relationships'>('interactions');

  useEffect(() => {
    if (isVisible) {
      fetchBlockchainMemory();
    }
  }, [isVisible, location]);

  const fetchBlockchainMemory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const locationId = `${location.coordinates[1]}_${location.coordinates[0]}`;
      const memory = await algorandService.getLocationMemory(locationId);
      
      if (memory) {
        setMemoryData(memory);
      } else {
        setError('Failed to retrieve blockchain memory');
      }
    } catch (error) {
      console.error('Error fetching blockchain memory:', error);
      setError('Error connecting to blockchain network');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isVisible) return null;

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
        className="bg-surface-deep border border-accent-neural/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-light">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-neural/20 rounded-lg">
              <Database className="text-accent-neural" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Blockchain Memory</h2>
              <p className="text-gray-400">Immutable history for {location.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-light">
          <button
            onClick={() => setActiveTab('interactions')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'interactions'
                ? 'text-accent-neural border-b-2 border-accent-neural bg-accent-neural/5'
                : 'text-gray-400 hover:text-white hover:bg-surface-mid'
            }`}
          >
            <MessageCircle size={16} />
            Interactions
          </button>
          <button
            onClick={() => setActiveTab('personality')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'personality'
                ? 'text-accent-neural border-b-2 border-accent-neural bg-accent-neural/5'
                : 'text-gray-400 hover:text-white hover:bg-surface-mid'
            }`}
          >
            <Brain size={16} />
            Personality Evolution
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'relationships'
                ? 'text-accent-neural border-b-2 border-accent-neural bg-accent-neural/5'
                : 'text-gray-400 hover:text-white hover:bg-surface-mid'
            }`}
          >
            <Link size={16} />
            Relationships
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader size={32} className="text-accent-neural animate-spin mb-4" />
              <p className="text-gray-400">Retrieving blockchain memory...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle size={32} className="text-red-400 mb-4" />
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={fetchBlockchainMemory}
                className="flex items-center gap-2 px-4 py-2 bg-surface-mid hover:bg-surface-light rounded-lg text-sm transition-colors"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Blockchain Network Info */}
              <div className="bg-surface-mid rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-accent-neural" />
                    <span className="text-sm font-medium">Blockchain Network</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle size={10} />
                      {memoryData.network.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Location ID: {memoryData.locationId}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Last Updated: {formatDate(memoryData.lastUpdated)}
                </div>
              </div>

              {activeTab === 'interactions' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Interaction History</h3>
                  
                  {memoryData.interactions && memoryData.interactions.length > 0 ? (
                    <div className="space-y-4">
                      {memoryData.interactions.map((interaction: any, index: number) => (
                        <div key={index} className="bg-surface-mid rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {interaction.type === 'voice' ? (
                                <MessageCircle size={16} className="text-accent-neural" />
                              ) : interaction.type === 'text' ? (
                                <MessageCircle size={16} className="text-blue-400" />
                              ) : (
                                <Zap size={16} className="text-yellow-400" />
                              )}
                              <span className="text-sm font-medium capitalize">{interaction.type} Interaction</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock size={12} />
                              <span>{formatDate(new Date(interaction.timestamp))}</span>
                            </div>
                          </div>
                          
                          {interaction.content && (
                            <div className="mb-2">
                              <div className="text-xs text-gray-400 mb-1">User Query:</div>
                              <div className="text-sm text-white bg-surface-deep p-2 rounded">
                                {interaction.content}
                              </div>
                            </div>
                          )}
                          
                          {interaction.response && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">Location Response:</div>
                              <div className="text-sm text-white bg-surface-deep p-2 rounded">
                                {interaction.response}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-surface-mid rounded-lg p-6 text-center">
                      <Database size={32} className="text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">No interactions recorded on the blockchain yet</p>
                      <p className="text-xs text-gray-500">Interact with this location to create blockchain memories</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'personality' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Personality Evolution</h3>
                  
                  {memoryData.personalityEvolution && memoryData.personalityEvolution.length > 0 ? (
                    <div className="space-y-4">
                      {memoryData.personalityEvolution.map((snapshot: any, index: number) => (
                        <div key={index} className="bg-surface-mid rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Brain size={16} className="text-purple-400" />
                              <span className="text-sm font-medium">Personality Snapshot</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock size={12} />
                              <span>{formatDate(new Date(snapshot.timestamp))}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            {snapshot.traits && Object.entries(snapshot.traits).map(([trait, value]: [string, any]) => (
                              <div key={trait} className="bg-surface-deep rounded p-2">
                                <div className="text-xs text-gray-400 mb-1 capitalize">
                                  {trait.replace('_', ' ')}
                                </div>
                                <div className="w-full bg-surface-light rounded-full h-1">
                                  <div
                                    className="bg-accent-neural h-1 rounded-full"
                                    style={{ width: `${value * 100}%` }}
                                  />
                                </div>
                                <div className="text-xs text-right mt-1">{Math.round(value * 100)}%</div>
                              </div>
                            ))}
                          </div>
                          
                          {snapshot.trigger && (
                            <div className="text-xs text-gray-400">
                              Trigger: {snapshot.trigger}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-surface-mid rounded-lg p-6 text-center">
                      <Brain size={32} className="text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">No personality evolution recorded yet</p>
                      <p className="text-xs text-gray-500">Personality evolves through continued interactions</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'relationships' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Location Relationships</h3>
                  
                  {memoryData.relationships && memoryData.relationships.length > 0 ? (
                    <div className="space-y-4">
                      {memoryData.relationships.map((relationship: any, index: number) => (
                        <div key={index} className="bg-surface-mid rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Link size={16} className="text-blue-400" />
                              <span className="text-sm font-medium">{relationship.targetLocationId}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock size={12} />
                              <span>Formed: {formatDate(new Date(relationship.formed))}</span>
                            </div>
                          </div>
                          
                          {relationship.events && relationship.events.length > 0 ? (
                            <div className="space-y-2">
                              {relationship.events.map((event: any, eventIndex: number) => (
                                <div key={eventIndex} className="bg-surface-deep rounded p-2 text-sm">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-white">{event.type}</span>
                                    <span className="text-xs text-gray-400">{formatDate(new Date(event.timestamp))}</span>
                                  </div>
                                  <p className="text-gray-300 text-xs">{event.description}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No relationship events recorded</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-surface-mid rounded-lg p-6 text-center">
                      <Link size={32} className="text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">No relationships established yet</p>
                      <p className="text-xs text-gray-500">Relationships form as locations interact with each other</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-light p-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Secured by Algorand Blockchain
            </div>
            <a
              href="https://algoexplorer.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent-neural hover:text-accent-pulse transition-colors"
            >
              View on Explorer
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}