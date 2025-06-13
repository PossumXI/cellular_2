# 🌍 ItsEarth - Powered by Cellular Neural Network

Discover our planet like never before with ItsEarth - a revolutionary platform that transforms geographic locations into intelligent entities with AI-powered voices, blockchain memory, and real-time data consciousness.

## 🔒 Security Features

- **API Key Security**: All API keys are securely stored in backend environment variables
- **Supabase Edge Functions**: Secure proxy endpoints for all third-party API calls
- **No Exposed Credentials**: Frontend code contains no sensitive information
- **Authentication**: JWT-based secure authentication flow
- **Row-Level Security**: Database-level security for all user data

## 🚀 **Production-Ready Features**

### **🔐 Complete Authentication System**
- **Supabase Auth Integration**: Secure user registration and login
- **Free Tier**: 10 daily location interactions
- **Premium Tier**: Unlimited access for $3/month
- **User Analytics**: Track interactions and usage patterns

### **💳 Stripe Payment Integration**
- **Secure Checkout**: Stripe-powered subscription management
- **Automatic Billing**: Recurring payments and subscription handling
- **Customer Portal**: Self-service billing management
- **Webhook Integration**: Real-time subscription status updates

### **🔗 Algorand Smart Contracts**
- **Mainnet Ready**: Production smart contracts on Algorand
- **Immutable Memory**: All location interactions stored on blockchain
- **Decentralized**: No single point of failure
- **Transparent**: Public verification of all interactions

### **🗄️ Supabase Database**
- **User Management**: Complete user profiles and preferences
- **Analytics Tracking**: Detailed interaction analytics
- **Location Memories**: Persistent location data and personalities
- **Real-time Updates**: Live data synchronization

### **🤖 AI-Powered Features**
- **Google Gemini**: Dynamic personality generation with secure API access
- **ElevenLabs**: Real voice synthesis for locations
- **Real-time Data**: Weather, news, traffic, environmental data
- **Cultural Adaptation**: Location-specific personalities and accents

### **🧠 DeepMind Training**
- **Custom AI Models**: Train models on your analytics data
- **Kaggle Integration**: Export datasets for Kaggle competitions
- **TensorFlow.js**: Client-side model training and inference
- **Multiple Model Types**: Classification, regression, and NLP

## 🌐 **Live Deployment**

**Production URL**: https://sprightly-longma-1e7a4a.netlify.app

The application is fully deployed and production-ready with:
- ✅ Netlify hosting with global CDN
- ✅ Custom domain support available
- ✅ Automatic deployments from main branch
- ✅ Environment variables configured
- ✅ SSL/HTTPS enabled

## 📋 **Quick Setup**

### **1. Environment Variables**
```bash
cp .env.example .env.local
# Fill in your API keys in Supabase Edge Functions, not in frontend code
```

### **2. Database Setup**
```bash
# Run Supabase migrations
npm run migrate:db
```

### **3. Smart Contract Deployment**
```bash
# Deploy to Algorand mainnet
npm run deploy:contracts
```

### **4. Start Development**
```bash
npm install
npm run dev
```

## 🔑 **API Keys Required**

### **Setup Required**
- 🔧 **Supabase**: Database and authentication
- 🔧 **Stripe**: Payment processing
- 🔧 **OpenWeather**: Real-time weather data (optional)

## 🏗️ **Architecture**

### **Frontend**
- **React 18** with TypeScript
- **Three.js** for 3D Earth visualization
- **Framer Motion** for animations
- **Tailwind CSS** for styling
- **Google Earth-style** controls and navigation

### **Backend Services**
- **Supabase** for database and auth
- **Supabase Edge Functions** for secure API proxying
- **Algorand** for blockchain storage
- **Stripe** for payments
- **Google APIs** for maps and AI
- **ElevenLabs** for voice synthesis
- **Telefonica Open Gateway** for connectivity data
- **SpeedOf.Me** for network testing
- **Newsdata.io** for news feeds
- **Twitter/X API** for social data

## 🔒 **Security Best Practices**

### **API Key Management**
- All API keys stored in Supabase Edge Functions environment variables
- No sensitive credentials in frontend code
- Secure proxy endpoints for all third-party API calls

### **Authentication**
- JWT-based authentication
- Row-level security (RLS)
- API key protection
- Rate limiting

### **Payments**
- PCI-compliant payment processing
- Secure webhook verification
- Subscription management
- Fraud protection

### **Blockchain**
- Immutable data storage
- Cryptographic verification
- Decentralized architecture
- Smart contract security

## 🌟 **Key Features**

### **🌍 Interactive 3D Earth**
- Real Google Earth satellite imagery
- Multiple map modes (satellite, terrain, hybrid, streets)
- Click any location to activate consciousness
- Real-time weather and environmental data
- Neural network visualizations
- Zoom from space to street level

### **🗣️ AI Location Voices**
- Unique personality for every location
- Cultural and geographic adaptation
- Real-time mood based on conditions
- ElevenLabs voice synthesis
- Multiple voice profiles and accents

### **🧠 DeepMind Training**
- Train custom AI models on your data
- Export to Kaggle for competitions
- Multiple model types (classification, regression, NLP)
- Real-time training monitoring
- Model export and sharing

---

**Ready for production deployment and user acquisition! 🚀**

Built with ❤️ for Earth's digital consciousness

*Last updated: January 2025*