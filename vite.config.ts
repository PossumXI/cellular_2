import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Enable minification and tree-shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true
      }
    },
    // Split chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          three: ['three'],
          fiber: ['@react-three/fiber', '@react-three/drei'],
          ui: ['framer-motion', 'react-hot-toast'],
          utils: ['date-fns', 'uuid', 'zod', 'zustand']
        }
      }
    },
    // Generate source maps for production
    sourcemap: true,
    // Optimize CSS
    cssCodeSplit: true
  },
  server: {
    // Optimize dev server
    hmr: {
      overlay: true
    }
  }
});