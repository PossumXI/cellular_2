import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function BoltAttribution() {
  return (
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
  );
}