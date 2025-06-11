import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { dataCollector } from './lib/analytics/dataCollector';
import { analyticsService } from './lib/analytics/analyticsService';

// Initialize analytics service
analyticsService.initialize().then(() => {
  console.log('📊 Analytics service initialized');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);