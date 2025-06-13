import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Crown, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentService } from '../../lib/payments/stripeService';
import { useAuthStore } from '../../store/authStore';
import { config } from '../../lib/config';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleUpgrade = async () => {
    if (!user) {
      toast.error('Please sign in to upgrade');
      return;
    }

    setLoading(true);
    try {
      const { success, error } = await paymentService.upgradeToPremium(user.id);
      
      if (!success) {
        toast.error(error || 'Failed to start upgrade process');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for exploring Earth\'s consciousness',
      features: [
        '10 location interactions daily',
        'AI-powered location voices',
        'Basic personality generation',
        'Blockchain memory storage',
        'Real-time weather data',
        'Community support'
      ],
      buttonText: 'Current Plan',
      buttonDisabled: true,
      icon: Zap,
      popular: false
    },
    {
      name: 'Premium',
      price: '$3',
      period: 'month',
      description: 'Unlimited access to Earth\'s neural network',
      features: [
        'Unlimited location interactions',
        'Advanced AI personalities',
        'Premium voice synthesis',
        'Priority blockchain storage',
        'Real-time data streams',
        'Advanced analytics dashboard',
        'Custom location memories',
        'API access',
        'Priority support'
      ],
      buttonText: 'Upgrade Now',
      buttonDisabled: false,
      icon: Crown,
      popular: true
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-surface-deep border border-accent-neural/20 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Choose Your Plan
                </h2>
                <p className="text-gray-400">
                  Unlock the full potential of ItsEarth
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative bg-surface-mid rounded-2xl p-6 border-2 transition-all ${
                    plan.popular
                      ? 'border-accent-neural shadow-lg shadow-accent-neural/20'
                      : 'border-surface-light hover:border-accent-neural/50'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-accent-neural text-surface-deep px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <plan.icon 
                      size={48} 
                      className={`mx-auto mb-4 ${plan.popular ? 'text-accent-neural' : 'text-gray-400'}`} 
                    />
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-gray-400">/{plan.period}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check size={16} className="text-accent-neural flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={plan.name === 'Premium' ? handleUpgrade : undefined}
                    disabled={plan.buttonDisabled || loading}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                      plan.popular
                        ? 'bg-accent-neural text-surface-deep hover:bg-accent-pulse'
                        : 'bg-surface-light text-gray-400 cursor-not-allowed'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading && plan.name === 'Premium' ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader size={18} className="animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      plan.buttonText
                    )}
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Features Comparison */}
            <div className="mt-8 p-6 bg-surface-mid rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-4">
                Why Upgrade to Premium?
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-accent-neural mb-2">Unlimited Access</h4>
                  <p className="text-gray-400">
                    No daily limits. Explore every location on Earth without restrictions.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-accent-neural mb-2">Advanced AI</h4>
                  <p className="text-gray-400">
                    Enhanced personality generation and more sophisticated location consciousness.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-accent-neural mb-2">Premium Features</h4>
                  <p className="text-gray-400">
                    Analytics dashboard, API access, and priority support.
                  </p>
                </div>
              </div>
            </div>

            {/* Money Back Guarantee */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                💰 30-day money-back guarantee • 🔒 Secure payment with Stripe • 🚀 Cancel anytime
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}