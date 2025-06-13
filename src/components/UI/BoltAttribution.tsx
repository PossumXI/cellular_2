import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function BoltAttribution() {
  return (
    <>
      {/* Custom Bolt.new Badge Configuration */}
      <style>
        {`
          .bolt-badge {
            transition: all 0.3s ease;
          }
          @keyframes badgeIntro {
            0% { transform: rotateY(-90deg); opacity: 0; }
            100% { transform: rotateY(0deg); opacity: 1; }
          }
          .bolt-badge-intro {
            animation: badgeIntro 0.8s ease-out 1s both;
          }
          .bolt-badge-intro.animated {
            animation: none;
          }
          @keyframes badgePulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }
          .bolt-badge {
            animation: badgePulse 2s ease-in-out infinite;
          }
        `}
      </style>
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <a href="https://bolt.new/" target="_blank" rel="noopener noreferrer" 
           className="block transition-all duration-300 hover:shadow-2xl">
          <img src="https://storage.bolt.army/logotext_poweredby_360w.png" 
               alt="Powered by Bolt.new badge" 
               className="h-8 md:h-10 w-auto shadow-lg opacity-90 hover:opacity-100 bolt-badge bolt-badge-intro"
               onAnimationEnd={() => {
                 const element = document.querySelector('.bolt-badge-intro');
                 if (element) element.classList.add('animated');
               }} />
        </a>
      </div>

      {/* Original attribution */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <a
          href="https://bolt.new"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-black/20 backdrop-blur-sm border border-white/10 rounded-full px-3 py-2 text-xs text-white/70 hover:text-white/90 hover:bg-black/30 transition-all duration-300 group"
        >
          <Zap size={12} className="text-yellow-400 group-hover:text-yellow-300" />
          <span>Powered by Bolt.new</span>
        </a>
      </motion.div>
    </>
  );
}