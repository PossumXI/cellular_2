import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Cpu, Database, Zap } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps = [
    { icon: Globe, label: 'Initializing ItsEarth Application', duration: 800 },
    { icon: Database, label: 'Connecting to Cellular Network', duration: 1000 },
    { icon: Cpu, label: 'Loading AI Consciousness Models', duration: 800 },
    { icon: Zap, label: 'Establishing Real-time Data Streams', duration: 600 }
  ];

  useEffect(() => {
    // Start preloading critical resources
    const preloadResources = () => {
      // Preload Earth textures
      const texturePaths = [
        '/textures/earth_clouds.png',
        '/textures/earth_normal.jpg',
        '/textures/earth_satellite.jpg',
        '/textures/earth_specular.jpg',
        '/textures/earth_terrain.jpg'
      ];
      
      texturePaths.forEach(path => {
        const img = new Image();
        img.src = path;
      });
    };
    
    preloadResources();
    
    let totalDuration = 0;
    let currentProgress = 0;

    const runStep = (stepIndex: number) => {
      if (stepIndex >= steps.length) {
        setProgress(100);
        setTimeout(() => {
          setIsVisible(false);
          setTimeout(onComplete, 300); // Allow time for fade-out animation
        }, 300);
        return;
      }

      setCurrentStep(stepIndex);
      const step = steps[stepIndex];
      const stepProgress = 100 / steps.length;

      const interval = setInterval(() => {
        currentProgress += (stepProgress / step.duration) * 50;
        setProgress(Math.min(currentProgress, (stepIndex + 1) * stepProgress));
      }, 50);

      setTimeout(() => {
        clearInterval(interval);
        setProgress((stepIndex + 1) * stepProgress);
        setTimeout(() => runStep(stepIndex + 1), 100);
      }, step.duration);
    };

    runStep(0);
  }, [onComplete, steps]);

  if (!isVisible) return null;

  return (
    <motion.div 
      className="fixed inset-0 bg-gradient-to-br from-surface-deep via-surface-mid to-surface-light flex items-center justify-center z-50"
      initial={{ opacity: 1 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center max-w-md">
        {/* Animated Logo */}
        <motion.div
          className="w-24 h-24 mx-auto mb-8 relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <div className="neural-indicator w-full h-full" style={{ width: '96px', height: '96px' }} />
          <motion.div
            className="absolute inset-0 border-2 border-accent-neural rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        {/* Title */}
        <motion.h1 
          className="text-4xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          ItsEarth
        </motion.h1>
        
        <motion.p 
          className="text-gray-400 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Powered by Cellular Neural Network
        </motion.p>

        {/* Progress Bar */}
        <div className="w-full bg-surface-deep rounded-full h-2 mb-6 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-primary-emerald to-accent-neural h-2 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Current Step */}
        <motion.div
          key={currentStep}
          className="flex items-center justify-center gap-3 text-accent-neural"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {React.createElement(steps[currentStep]?.icon || Globe, { size: 20 })}
          <span className="text-sm">
            {steps[currentStep]?.label || 'Initializing...'}
          </span>
        </motion.div>

        {/* Progress Percentage */}
        <motion.div 
          className="text-xs text-gray-500 mt-4"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {Math.round(progress)}%
        </motion.div>
      </div>
    </motion.div>
  );
}