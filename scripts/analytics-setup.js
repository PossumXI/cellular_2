#!/usr/bin/env node

/**
 * Analytics Setup Script
 * Sets up the analytics dashboard with sample data and optimizations
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Cellular Analytics Dashboard...');

// Create analytics configuration
const analyticsConfig = {
  name: 'Cellular Analytics Dashboard',
  version: '1.0.0',
  features: {
    realTimeData: true,
    userEngagement: true,
    locationTrends: true,
    networkPerformance: true,
    socialSentiment: true,
    exportCapabilities: true
  },
  dataSources: [
    'location_interactions',
    'network_analytics', 
    'twitter_analytics',
    'users'
  ],
  refreshIntervals: {
    overview: 30000,      // 30 seconds
    locations: 60000,     // 1 minute
    network: 120000,      // 2 minutes
    social: 180000,       // 3 minutes
    users: 300000         // 5 minutes
  },
  performance: {
    enableCaching: true,
    batchSize: 100,
    maxRetries: 3,
    timeout: 10000
  }
};

// Write analytics config
const configPath = path.join(__dirname, '..', 'src', 'config', 'analytics.json');
const configDir = path.dirname(configPath);

if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

fs.writeFileSync(configPath, JSON.stringify(analyticsConfig, null, 2));

console.log('✅ Analytics configuration created');

// Create sample data generators for development
const sampleDataGenerator = `
/**
 * Sample Data Generator for Analytics Dashboard
 * Use this for development and testing
 */

export const generateSampleLocationData = (count = 50) => {
  const locations = [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX',
    'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA',
    'Dallas, TX', 'San Jose, CA', 'Austin, TX', 'Jacksonville, FL',
    'London, UK', 'Paris, France', 'Tokyo, Japan', 'Sydney, Australia',
    'Berlin, Germany', 'Toronto, Canada', 'Mumbai, India', 'São Paulo, Brazil'
  ];

  return Array.from({ length: count }, (_, i) => ({
    location_name: locations[i % locations.length],
    location_id: \`loc_\${i}\`,
    coordinates: [
      -180 + Math.random() * 360, // longitude
      -90 + Math.random() * 180   // latitude
    ],
    interaction_count: Math.floor(Math.random() * 1000) + 10,
    unique_users: Math.floor(Math.random() * 100) + 5,
    avg_session_duration: Math.random() * 300 + 30,
    growth_rate: (Math.random() - 0.5) * 100,
    last_interaction: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
  }));
};

export const generateSampleNetworkData = (count = 100) => {
  const locations = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
    'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: \`net_\${i}\`,
    location_name: locations[i % locations.length],
    coordinates: [
      -180 + Math.random() * 360,
      -90 + Math.random() * 180
    ],
    download_speed: Math.random() * 200 + 10,
    upload_speed: Math.random() * 100 + 5,
    latency: Math.random() * 100 + 10,
    jitter: Math.random() * 20 + 1,
    server_location: 'Test Server',
    test_timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  }));
};

export const generateSampleSentimentData = (count = 200) => {
  const locations = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'
  ];
  
  const hashtags = [
    'local', 'community', 'weather', 'traffic', 'events',
    'food', 'culture', 'technology', 'business', 'sports'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: \`tweet_\${i}\`,
    location_name: locations[i % locations.length],
    coordinates: [
      -180 + Math.random() * 360,
      -90 + Math.random() * 180
    ],
    tweet_text: \`Sample tweet about \${locations[i % locations.length]} #\${hashtags[i % hashtags.length]}\`,
    sentiment_score: Math.random(),
    engagement_metrics: {
      like_count: Math.floor(Math.random() * 100),
      retweet_count: Math.floor(Math.random() * 50),
      reply_count: Math.floor(Math.random() * 25)
    },
    hashtags: [hashtags[i % hashtags.length]],
    tweet_timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
  }));
};

export const generateSampleUserData = (count = 1000) => {
  return Array.from({ length: count }, (_, i) => ({
    id: \`user_\${i}\`,
    email: \`user\${i}@example.com\`,
    subscription_tier: Math.random() > 0.8 ? 'premium' : 'free',
    daily_interactions_used: Math.floor(Math.random() * 20),
    daily_limit: Math.random() > 0.8 ? 1000 : 10,
    created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
  }));
};
`;

const sampleDataPath = path.join(__dirname, '..', 'src', 'lib', 'analytics', 'sampleData.ts');
const sampleDataDir = path.dirname(sampleDataPath);

if (!fs.existsSync(sampleDataDir)) {
  fs.mkdirSync(sampleDataDir, { recursive: true });
}

fs.writeFileSync(sampleDataPath, sampleDataGenerator);

console.log('✅ Sample data generators created');

// Create analytics utilities
const analyticsUtils = `
/**
 * Analytics Utilities
 * Helper functions for data processing and visualization
 */

export const formatNumber = (num: number): string => {
  if (num >= 1000000) return \`\${(num / 1000000).toFixed(1)}M\`;
  if (num >= 1000) return \`\${(num / 1000).toFixed(1)}K\`;
  return num.toString();
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return \`\${Math.round(seconds)}s\`;
  if (seconds < 3600) return \`\${Math.round(seconds / 60)}m\`;
  return \`\${Math.round(seconds / 3600)}h\`;
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return \`\${((value / total) * 100).toFixed(1)}%\`;
};

export const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const getTimeRangeFilter = (range: string): string => {
  const now = new Date();
  switch (range) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
};

export const aggregateDataByDate = (data: any[], dateField: string = 'created_at') => {
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item[dateField]).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return Object.entries(grouped).map(([date, items]) => ({
    date,
    count: (items as any[]).length,
    items
  })).sort((a, b) => a.date.localeCompare(b.date));
};

export const calculateMovingAverage = (data: number[], window: number = 7): number[] => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const subset = data.slice(start, i + 1);
    const average = subset.reduce((sum, val) => sum + val, 0) / subset.length;
    result.push(average);
  }
  return result;
};

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? \`"\${value}"\` 
          : value;
      }).join(',')
    )
  ].join('\\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = \`\${filename}_\${new Date().toISOString().split('T')[0]}.csv\`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToJSON = (data: any, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = \`\${filename}_\${new Date().toISOString().split('T')[0]}.json\`;
  a.click();
  URL.revokeObjectURL(url);
};
`;

const utilsPath = path.join(__dirname, '..', 'src', 'lib', 'analytics', 'utils.ts');
fs.writeFileSync(utilsPath, analyticsUtils);

console.log('✅ Analytics utilities created');

// Create performance optimization guide
const performanceGuide = `
# Analytics Dashboard Performance Optimization Guide

## Database Optimization

### Indexes
- Ensure proper indexes on frequently queried columns
- Use composite indexes for complex queries
- Monitor query performance with EXPLAIN ANALYZE

### Query Optimization
- Use pagination for large datasets
- Implement data aggregation at the database level
- Cache frequently accessed data

## Frontend Optimization

### Component Performance
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Debounce user inputs and API calls

### Data Loading
- Implement progressive loading
- Use skeleton screens during loading
- Cache API responses when appropriate

### Memory Management
- Clean up event listeners and timers
- Avoid memory leaks in useEffect hooks
- Use proper dependency arrays

## Real-time Updates

### WebSocket Optimization
- Batch updates to reduce re-renders
- Use throttling for high-frequency updates
- Implement reconnection logic

### State Management
- Use local state for component-specific data
- Implement proper state normalization
- Avoid unnecessary global state updates

## Monitoring

### Performance Metrics
- Track component render times
- Monitor API response times
- Measure user interaction latency

### Error Handling
- Implement comprehensive error boundaries
- Log errors for debugging
- Provide fallback UI states
`;

const guideDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(guideDir)) {
  fs.mkdirSync(guideDir, { recursive: true });
}

fs.writeFileSync(path.join(guideDir, 'analytics-performance.md'), performanceGuide);

console.log('✅ Performance guide created');
console.log('🎉 Analytics Dashboard setup complete!');
console.log('');
console.log('📊 Features enabled:');
console.log('  • Real-time data visualization');
console.log('  • User engagement metrics');
console.log('  • Location trend analysis');
console.log('  • Network performance tracking');
console.log('  • Social sentiment analysis');
console.log('  • Data export capabilities');
console.log('');
console.log('🚀 Ready to analyze Earth\'s neural network data!');