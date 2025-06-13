import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  BarChart3, 
  TrendingUp, 
  Package, 
  Users, 
  Globe, 
  Calendar,
  RefreshCw,
  X,
  Download,
  Filter,
  PieChart,
  ArrowUpRight,
  Briefcase
} from 'lucide-react';
import { monetizationService } from '../../lib/analytics/monetizationService';
import { analyticsService } from '../../lib/analytics/analyticsService';

interface MonetizationDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MonetizationDashboard({ isOpen, onClose }: MonetizationDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>({
    insights: [],
    revenueReport: {},
    dataPackages: [],
    totalPackages: 0,
    totalRevenue: 0
  });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'packages', label: 'Data Packages', icon: Package },
    { id: 'clients', label: 'Potential Clients', icon: Briefcase },
    { id: 'revenue', label: 'Revenue', icon: DollarSign }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchDashboardData();
    }
  }, [isOpen]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const monetizationData = await analyticsService.getMonetizationData();
      setDashboardData(monetizationData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching monetization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getDataCategoryColor = (category: string): string => {
    switch (category) {
      case 'telecom': return 'text-blue-400';
      case 'ai_companies': return 'text-purple-400';
      case 'social_media': return 'text-pink-400';
      case 'real_estate': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getDataCategoryBg = (category: string): string => {
    switch (category) {
      case 'telecom': return 'bg-blue-400/20';
      case 'ai_companies': return 'bg-purple-400/20';
      case 'social_media': return 'bg-pink-400/20';
      case 'real_estate': return 'bg-green-400/20';
      default: return 'bg-gray-400/20';
    }
  };

  if (!isOpen) return null;

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
        className="bg-surface-deep border border-accent-neural/20 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-light">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-400/20 rounded-lg">
              <DollarSign className="text-yellow-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Monetization Dashboard</h2>
              <p className="text-gray-400">Analytics data packages for enterprise clients</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchDashboardData();
              }}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-accent-neural transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-surface-light">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/5'
                  : 'text-gray-400 hover:text-white hover:bg-surface-mid'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-6 h-full overflow-y-auto">
              {/* Overview Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-surface-mid rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign size={20} className="text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white">Total Revenue</h3>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {formatCurrency(dashboardData.totalRevenue || 0)}
                  </div>
                  <div className="text-sm flex items-center gap-1 text-green-400">
                    <TrendingUp size={14} />
                    +{dashboardData.revenueReport?.monthlyGrowth?.toFixed(1) || 0}% growth
                  </div>
                </div>

                <div className="bg-surface-mid rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Package size={20} className="text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Data Packages</h3>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {dashboardData.totalPackages || 0}
                  </div>
                  <div className="text-sm text-gray-400">
                    Available for sale
                  </div>
                </div>

                <div className="bg-surface-mid rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Users size={20} className="text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Potential Clients</h3>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {Math.floor(Math.random() * 50) + 20}
                  </div>
                  <div className="text-sm text-gray-400">
                    Enterprise leads
                  </div>
                </div>

                <div className="bg-surface-mid rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Globe size={20} className="text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Data Coverage</h3>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {dashboardData.insights?.length || 0} regions
                  </div>
                  <div className="text-sm text-gray-400">
                    Global analytics
                  </div>
                </div>
              </div>

              {/* Top Selling Packages */}
              <div className="bg-surface-mid rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Top Selling Data Packages</h3>
                <div className="space-y-4">
                  {(dashboardData.dataPackages || []).slice(0, 5).map((pkg, index) => (
                    <div key={pkg.id || index} className="bg-surface-deep rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${getDataCategoryBg(pkg.targetCustomers[0]?.toLowerCase())} rounded-lg flex items-center justify-center`}>
                          <Package size={20} className={getDataCategoryColor(pkg.targetCustomers[0]?.toLowerCase())} />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{pkg.name}</h4>
                          <div className="text-sm text-gray-400">{pkg.geographicScope} • {pkg.timeRange}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{formatCurrency(pkg.priceUsd)}</div>
                        <div className="text-xs text-gray-400">{pkg.dataTypes.join(', ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue by Category */}
              <div className="bg-surface-mid rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Revenue by Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {dashboardData.revenueReport?.revenueByCategory && Object.entries(dashboardData.revenueReport.revenueByCategory).map(([category, revenue]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getDataCategoryBg(category)}`}></div>
                          <span className="text-gray-300 capitalize">{category.replace('_', ' ')}</span>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(revenue as number)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full border-8 border-surface-deep relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PieChart size={48} className="text-yellow-400 opacity-50" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Available Data Packages</h3>
                <button className="flex items-center gap-2 px-3 py-2 bg-surface-deep rounded-lg text-sm text-gray-300 hover:bg-surface-light transition-colors">
                  <Filter size={16} />
                  Filter
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(dashboardData.dataPackages || []).map((pkg, index) => (
                  <motion.div
                    key={pkg.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-surface-mid rounded-lg overflow-hidden border border-surface-light hover:border-yellow-400/30 transition-colors"
                  >
                    <div className={`p-4 ${getDataCategoryBg(pkg.targetCustomers[0]?.toLowerCase())}`}>
                      <h4 className={`font-semibold ${getDataCategoryColor(pkg.targetCustomers[0]?.toLowerCase())}`}>{pkg.name}</h4>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-300 mb-4">{pkg.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Geographic Scope:</span>
                          <span className="text-white">{pkg.geographicScope}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Time Range:</span>
                          <span className="text-white">{pkg.timeRange}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Data Types:</span>
                          <span className="text-white">{pkg.dataTypes.join(', ')}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-4 border-t border-surface-light">
                        <div className="text-xl font-bold text-yellow-400">{formatCurrency(pkg.priceUsd)}</div>
                        <button className="flex items-center gap-1 px-3 py-2 bg-yellow-400/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-400/30 transition-colors">
                          <Download size={16} />
                          Sample
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-surface-mid rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Create Custom Package</h3>
                <p className="text-gray-300 mb-4">
                  Need specialized analytics data? We can create custom data packages tailored to your specific requirements.
                </p>
                <button className="flex items-center gap-2 px-4 py-3 bg-yellow-400 text-surface-deep rounded-lg font-medium hover:bg-yellow-300 transition-colors">
                  <Package size={18} />
                  Request Custom Package
                </button>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Potential Enterprise Clients</h3>
                <button className="flex items-center gap-2 px-3 py-2 bg-surface-deep rounded-lg text-sm text-gray-300 hover:bg-surface-light transition-colors">
                  <Filter size={16} />
                  Filter by Industry
                </button>
              </div>

              {/* Telecom Companies */}
              <div className="mb-8">
                <h4 className="text-md font-semibold text-blue-400 mb-4">Telecom Companies</h4>
                <div className="space-y-4">
                  {[
                    { name: 'Verizon Communications', industry: 'Telecom', interest: 'Network Performance', budget: '$10,000-$50,000' },
                    { name: 'AT&T Inc.', industry: 'Telecom', interest: 'Coverage Analysis', budget: '$25,000-$100,000' },
                    { name: 'T-Mobile US', industry: 'Telecom', interest: 'User Experience', budget: '$5,000-$25,000' },
                    { name: 'Telefonica', industry: 'Telecom', interest: 'Network Optimization', budget: '$10,000-$50,000' }
                  ].map((client, index) => (
                    <div key={index} className="bg-surface-deep rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-white">{client.name}</h5>
                        <div className="text-sm text-gray-400">{client.industry} • {client.interest}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-300">{client.budget}</div>
                        <button className="p-2 bg-blue-400/20 text-blue-400 rounded-lg hover:bg-blue-400/30 transition-colors">
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Companies */}
              <div className="mb-8">
                <h4 className="text-md font-semibold text-purple-400 mb-4">AI Companies</h4>
                <div className="space-y-4">
                  {[
                    { name: 'OpenAI', industry: 'AI Research', interest: 'Usage Patterns', budget: '$50,000-$100,000' },
                    { name: 'Anthropic', industry: 'AI Research', interest: 'Interaction Quality', budget: '$25,000-$75,000' },
                    { name: 'Google DeepMind', industry: 'AI Research', interest: 'Model Performance', budget: '$100,000+' }
                  ].map((client, index) => (
                    <div key={index} className="bg-surface-deep rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-white">{client.name}</h5>
                        <div className="text-sm text-gray-400">{client.industry} • {client.interest}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-300">{client.budget}</div>
                        <button className="p-2 bg-purple-400/20 text-purple-400 rounded-lg hover:bg-purple-400/30 transition-colors">
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Media Companies */}
              <div className="mb-8">
                <h4 className="text-md font-semibold text-pink-400 mb-4">Social Media Companies</h4>
                <div className="space-y-4">
                  {[
                    { name: 'Meta Platforms', industry: 'Social Media', interest: 'Engagement Trends', budget: '$50,000-$150,000' },
                    { name: 'X Corp (Twitter)', industry: 'Social Media', interest: 'Location Sentiment', budget: '$25,000-$75,000' },
                    { name: 'TikTok', industry: 'Social Media', interest: 'Viral Content', budget: '$50,000-$100,000' }
                  ].map((client, index) => (
                    <div key={index} className="bg-surface-deep rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-white">{client.name}</h5>
                        <div className="text-sm text-gray-400">{client.industry} • {client.interest}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-300">{client.budget}</div>
                        <button className="p-2 bg-pink-400/20 text-pink-400 rounded-lg hover:bg-pink-400/30 transition-colors">
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="p-6 h-full overflow-y-auto">
              {/* Revenue Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-surface-mid rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign size={20} className="text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white">Total Revenue</h3>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {formatCurrency(dashboardData.totalRevenue || 0)}
                  </div>
                  <div className="text-sm flex items-center gap-1 text-green-400">
                    <TrendingUp size={14} />
                    +{dashboardData.revenueReport?.monthlyGrowth?.toFixed(1) || 0}% growth
                  </div>
                </div>

                <div className="bg-surface-mid rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Package size={20} className="text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Avg Package Value</h3>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {formatCurrency(dashboardData.revenueReport?.averagePackageValue || 0)}
                  </div>
                  <div className="text-sm text-gray-400">
                    Per data package
                  </div>
                </div>

                <div className="bg-surface-mid rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar size={20} className="text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Monthly Projection</h3>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {formatCurrency((dashboardData.totalRevenue || 0) * 4)}
                  </div>
                  <div className="text-sm text-gray-400">
                    Based on current trends
                  </div>
                </div>
              </div>

              {/* Revenue by Category */}
              <div className="bg-surface-mid rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Revenue by Category</h3>
                <div className="space-y-4">
                  {dashboardData.revenueReport?.revenueByCategory && Object.entries(dashboardData.revenueReport.revenueByCategory).map(([category, revenue]) => (
                    <div key={category}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getDataCategoryBg(category)}`}></div>
                          <span className="text-gray-300 capitalize">{category.replace('_', ' ')}</span>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(revenue as number)}</span>
                      </div>
                      <div className="w-full bg-surface-deep rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${category === 'telecom' ? 'bg-blue-400' : 
                                                        category === 'ai_companies' ? 'bg-purple-400' : 
                                                        category === 'social_media' ? 'bg-pink-400' : 
                                                        'bg-green-400'}`}
                          style={{ width: `${((revenue as number) / (dashboardData.totalRevenue || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Projections */}
              <div className="bg-surface-mid rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Monthly Revenue Projections</h3>
                <div className="space-y-4">
                  {['January', 'February', 'March', 'April', 'May', 'June'].map((month, index) => {
                    const baseRevenue = dashboardData.totalRevenue || 5000;
                    const projectedRevenue = baseRevenue * (1 + (index * 0.15));
                    
                    return (
                      <div key={month}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-300">{month} 2025</span>
                          <span className="text-white font-medium">{formatCurrency(projectedRevenue)}</span>
                        </div>
                        <div className="w-full bg-surface-deep rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600"
                            style={{ width: `${Math.min(100, (projectedRevenue / (baseRevenue * 2)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with last update time */}
        {lastUpdate && (
          <div className="p-4 border-t border-surface-light text-xs text-gray-500 text-center">
            Last updated: {lastUpdate.toLocaleTimeString()} • Data packages ready for enterprise sales
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}