import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, Settings, Globe, Zap, Wind, Thermometer, Activity } from 'lucide-react';

interface SimulationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation?: { lat: number; lng: number; name?: string };
}

interface SimulationConfig {
  type: 'climate' | 'weather' | 'population' | 'economic' | 'environmental';
  duration: number; // in days
  intensity: 'low' | 'medium' | 'high';
  parameters: Record<string, number>;
}

interface SimulationResult {
  id: string;
  type: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  results?: any;
  startTime: Date;
  estimatedCompletion?: Date;
}

export default function SimulationCenterModal({ isOpen, onClose, selectedLocation }: SimulationCenterModalProps) {
  const [activeTab, setActiveTab] = useState<'climate' | 'weather' | 'population' | 'economic' | 'environmental'>('climate');
  const [simulations, setSimulations] = useState<SimulationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<SimulationConfig>({
    type: 'climate',
    duration: 30,
    intensity: 'medium',
    parameters: {
      temperature: 0,
      precipitation: 0,
      humidity: 0,
      windSpeed: 0
    }
  });

  const simulationTypes = {
    climate: {
      icon: Thermometer,
      title: 'Climate Simulation',
      description: 'Simulate long-term climate patterns and changes',
      parameters: ['temperature', 'precipitation', 'humidity', 'seasonality']
    },
    weather: {
      icon: Wind,
      title: 'Weather Simulation',
      description: 'Simulate short-term weather patterns and events',
      parameters: ['temperature', 'precipitation', 'windSpeed', 'pressure']
    },
    population: {
      icon: Activity,
      title: 'Population Dynamics',
      description: 'Simulate population growth and migration patterns',
      parameters: ['growthRate', 'migration', 'urbanization', 'density']
    },
    economic: {
      icon: Zap,
      title: 'Economic Impact',
      description: 'Simulate economic changes and market dynamics',
      parameters: ['gdpGrowth', 'inflation', 'employment', 'trade']
    },
    environmental: {
      icon: Globe,
      title: 'Environmental Impact',
      description: 'Simulate environmental changes and sustainability',
      parameters: ['carbonEmissions', 'deforestation', 'biodiversity', 'pollution']
    }
  };

  useEffect(() => {
    // Update config when tab changes
    setConfig(prev => ({
      ...prev,
      type: activeTab,
      parameters: simulationTypes[activeTab].parameters.reduce((acc, param) => {
        acc[param] = 0;
        return acc;
      }, {} as Record<string, number>)
    }));
  }, [activeTab]);

  useEffect(() => {
    // Simulate progress updates for running simulations
    const interval = setInterval(() => {
      setSimulations(prev => prev.map(sim => {
        if (sim.status === 'running' && sim.progress < 100) {
          const newProgress = Math.min(sim.progress + Math.random() * 10, 100);
          const newStatus = newProgress >= 100 ? 'completed' : 'running';
          return {
            ...sim,
            progress: newProgress,
            status: newStatus,
            estimatedCompletion: newStatus === 'completed' ? new Date() : sim.estimatedCompletion
          };
        }
        return sim;
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const startSimulation = async () => {
    if (isRunning) return;

    setIsRunning(true);
    
    const newSimulation: SimulationResult = {
      id: Date.now().toString(),
      type: config.type,
      status: 'running',
      progress: 0,
      startTime: new Date(),
      estimatedCompletion: new Date(Date.now() + config.duration * 24 * 60 * 60 * 1000)
    };

    setSimulations(prev => [newSimulation, ...prev]);

    try {
      // Use enhanced DeepMind service to generate simulation insights
      const simulationContext = {
        type: config.type,
        location: selectedLocation,
        duration: config.duration,
        intensity: config.intensity,
        parameters: config.parameters
      };

      // This would typically connect to a real simulation engine
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Simulation started:', simulationContext);
    } catch (error) {
      console.error('Error starting simulation:', error);
      setSimulations(prev => prev.map(sim => 
        sim.id === newSimulation.id 
          ? { ...sim, status: 'failed' }
          : sim
      ));
    } finally {
      setIsRunning(false);
    }
  };

  const stopSimulation = (id: string) => {
    setSimulations(prev => prev.map(sim => 
      sim.id === id 
        ? { ...sim, status: 'completed', progress: sim.progress }
        : sim
    ));
  };

  const resetSimulation = () => {
    setSimulations([]);
    setConfig(prev => ({
      ...prev,
      parameters: simulationTypes[activeTab].parameters.reduce((acc, param) => {
        acc[param] = 0;
        return acc;
      }, {} as Record<string, number>)
    }));
  };

  const updateParameter = (param: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [param]: value
      }
    }));
  };

  if (!isOpen) return null;

  const currentType = simulationTypes[activeTab];
  const IconComponent = currentType.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-surface-deep rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-surface-light">
            <div className="flex items-center gap-3">
              <Settings className="text-accent-pulse" size={24} />
              <h2 className="text-2xl font-bold text-white">Simulation Center</h2>
              {selectedLocation && (
                <span className="text-sm text-gray-400 ml-4">
                  Location: {selectedLocation.name || `${selectedLocation.lat.toFixed(2)}, ${selectedLocation.lng.toFixed(2)}`}
                </span>
              )}
            </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-surface-light"
                aria-label="Close Simulation Center"
              >
                <X size={20} />
              </button>
          </div>

          <div className="flex h-[calc(90vh-120px)]">
            {/* Sidebar - Simulation Types */}
            <div className="w-64 bg-surface-light p-4 border-r border-surface-deep">
              <h3 className="text-lg font-semibold text-white mb-4">Simulation Types</h3>
              <div className="space-y-2">
                {Object.entries(simulationTypes).map(([key, type]) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                        activeTab === key
                          ? 'bg-accent-neural text-white'
                          : 'text-gray-300 hover:bg-surface-deep hover:text-white'
                      }`}
                    >
                      <Icon size={18} />
                      <div>
                        <div className="font-medium">{type.title}</div>
                        <div className="text-xs opacity-70">{type.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {/* Configuration Panel */}
              <div className="p-6 border-b border-surface-light">
                <div className="flex items-center gap-3 mb-4">
                  <IconComponent className="text-accent-pulse" size={24} />
                  <h3 className="text-xl font-semibold text-white">{currentType.title}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Duration (days)</label>
                    <input
                      type="number"
                      value={config.duration}
                      onChange={(e) => setConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                      className="w-full bg-surface-deep text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-neural"
                      min="1"
                      max="365"
                      aria-label="Simulation Duration in Days"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Intensity</label>
                    <select
                      value={config.intensity}
                      onChange={(e) => setConfig(prev => ({ ...prev, intensity: e.target.value as any }))}
                      className="w-full bg-surface-deep text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-neural"
                      aria-label="Simulation Intensity"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div className="flex items-end gap-2">
                    <button
                      onClick={startSimulation}
                      disabled={isRunning}
                      className="neural-button px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      aria-label={isRunning ? "Simulation is starting" : "Start Simulation"}
                    >
                      <Play size={16} />
                      {isRunning ? 'Starting...' : 'Start Simulation'}
                    </button>
                    <button
                      onClick={resetSimulation}
                      className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-surface-light"
                      aria-label="Reset Simulation Parameters"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>

                {/* Parameters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {currentType.parameters.map(param => (
                    <div key={param}>
                      <label className="block text-sm font-medium text-gray-300 mb-2 capitalize">
                        {param.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={config.parameters[param] || 0}
                        onChange={(e) => updateParameter(param, parseInt(e.target.value))}
                        className="w-full accent-accent-neural"
                        aria-label={`${param.replace(/([A-Z])/g, ' $1').trim()} adjustment`}
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        {config.parameters[param] || 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Running Simulations */}
              <div className="flex-1 p-6 overflow-y-auto">
                <h3 className="text-lg font-semibold text-white mb-4">Active Simulations</h3>
                
                {simulations.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <Settings className="mx-auto mb-4 text-accent-pulse" size={48} />
                    <p className="text-lg mb-2">No simulations running</p>
                    <p className="text-sm">Configure parameters above and start a simulation</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {simulations.map(simulation => {
                      const SimIcon = simulationTypes[simulation.type as keyof typeof simulationTypes].icon;
                      return (
                        <div key={simulation.id} className="bg-surface-light rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <SimIcon className="text-accent-pulse" size={20} />
                              <div>
                                <h4 className="font-medium text-white">
                                  {simulationTypes[simulation.type as keyof typeof simulationTypes].title}
                                </h4>
                                <p className="text-sm text-gray-400">
                                  Started: {simulation.startTime.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                simulation.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                                simulation.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {simulation.status}
                              </span>
                              
                              {simulation.status === 'running' && (
                                <button
                                  onClick={() => stopSimulation(simulation.id)}
                                  className="p-1 text-gray-400 hover:text-white transition-colors"
                                  aria-label="Pause Simulation"
                                >
                                  <Pause size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="w-full bg-surface-deep rounded-full h-2 mb-2">
                            <div
                              className="bg-accent-neural h-2 rounded-full transition-all duration-500"
                              style={{ width: `${simulation.progress}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between text-sm text-gray-400">
                            <span>Progress: {Math.round(simulation.progress)}%</span>
                            {simulation.estimatedCompletion && (
                              <span>
                                {simulation.status === 'completed' ? 'Completed' : 'ETA'}: {simulation.estimatedCompletion.toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
