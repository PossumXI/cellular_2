import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, CreditCard, BarChart3, LogOut, Crown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../lib/auth/authService';
import EnhancedAnalyticsDashboard from '../Analytics/EnhancedAnalyticsDashboard';
import toast from 'react-hot-toast';

interface UserMenuProps {
  onOpenPricing: () => void;
}

export default function UserMenu({ onOpenPricing }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      const { error } = await authService.signOut();
      if (error) {
        toast.error(error);
      } else {
        logout();
        toast.success('Signed out successfully');
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out. Please try again.');
    }
  };

  const openAnalytics = () => {
    setAnalyticsOpen(true);
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 p-3 rounded-full bg-surface-mid hover:bg-surface-light transition-colors"
        >
          <div className="w-8 h-8 bg-accent-neural rounded-full flex items-center justify-center">
            <User size={16} className="text-surface-deep" />
          </div>
          <div className="text-left hidden md:block">
            <div className="text-sm font-medium text-white">
              {user.full_name || user.email}
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              {user.subscription_tier === 'premium' ? (
                <>
                  <Crown size={12} className="text-yellow-400" />
                  Premium
                </>
              ) : (
                `${user.daily_limit - (user.daily_interactions_used || 0)} interactions left`
              )}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full right-0 mt-2 w-64 bg-surface-deep border border-accent-neural/20 rounded-xl shadow-xl z-50"
            >
              <div className="p-4 border-b border-surface-light">
                <div className="text-sm font-medium text-white">
                  {user.full_name || user.email}
                </div>
                <div className="text-xs text-gray-400">{user.email}</div>
                <div className="mt-2 flex items-center gap-2">
                  {user.subscription_tier === 'premium' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-400/20 text-yellow-400 rounded-full text-xs">
                      <Crown size={12} />
                      Premium
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-surface-mid text-gray-400 rounded-full text-xs">
                      Free Tier
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={openAnalytics}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-mid rounded-lg transition-colors"
                >
                  <BarChart3 size={16} className="text-accent-neural" />
                  <span className="text-sm text-gray-300">Enhanced Analytics</span>
                </button>

                {user.subscription_tier === 'free' && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onOpenPricing();
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-mid rounded-lg transition-colors"
                  >
                    <Crown size={16} className="text-yellow-400" />
                    <span className="text-sm text-yellow-400">Upgrade to Premium</span>
                  </button>
                )}

                {user.subscription_tier === 'premium' && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      // Open billing portal
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-mid rounded-lg transition-colors"
                  >
                    <CreditCard size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-300">Billing</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Open settings modal
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-mid rounded-lg transition-colors"
                >
                  <Settings size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-300">Settings</span>
                </button>

                <hr className="my-2 border-surface-light" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
                >
                  <LogOut size={16} />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Enhanced Analytics Dashboard Modal */}
      <EnhancedAnalyticsDashboard
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
      />
    </>
  );
}