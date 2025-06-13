import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { analyticsService } from './lib/analytics/analyticsService';

// Initialize analytics service with lazy loading
const initAnalytics = () => {
  // Delay analytics initialization to prioritize UI rendering
  setTimeout(() => {
    analyticsService.initialize().then(() => {
      console.log('📊 Analytics service initialized');
    });
  }, 3000); // 3 second delay
};

// Create root and render app
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Initialize analytics after page load
if (document.readyState === 'complete') {
  initAnalytics();
} else {
  window.addEventListener('load', initAnalytics);
}