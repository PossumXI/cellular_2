import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Loader, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authService } from '../../lib/auth/authService';
import { useAuthStore } from '../../store/authStore';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters')
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuthStore();

  const signUpForm = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', fullName: '' }
  });

  const signInForm = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' }
  });

  // Clear error when switching modes or typing
  const clearError = () => {
    if (authError) setAuthError(null);
  };

  const handleSignUp = async (data: z.infer<typeof signUpSchema>) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      const { user, error } = await authService.signUp(data.email, data.password, data.fullName);
      
      if (error) {
        setAuthError(error);
        return;
      }

      if (user) {
        setUser(user);
        toast.success('Account created successfully! Welcome to ItsEarth!');
        onClose();
      }
    } catch (error) {
      setAuthError('An unexpected error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (data: z.infer<typeof signInSchema>) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      const { user, error } = await authService.signIn(data.email, data.password);
      
      if (error) {
        setAuthError(error);
        return;
      }

      if (user) {
        setUser(user);
        toast.success('Welcome back to ItsEarth!');
        onClose();
      }
    } catch (error) {
      setAuthError('An unexpected error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setAuthError(null);
    setShowPassword(false);
    signUpForm.reset();
    signInForm.reset();
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    
    // Try to sign in with demo credentials
    const demoEmail = 'demo@itsearth.com';
    const demoPassword = 'demo123456';
    
    try {
      const { user, error } = await authService.signIn(demoEmail, demoPassword);
      
      if (error) {
        // If demo account doesn't exist, create it
        if (error.includes('Invalid email or password')) {
          const { user: newUser, error: signUpError } = await authService.signUp(demoEmail, demoPassword, 'Demo User');
          
          if (signUpError) {
            setAuthError('Failed to create demo account. Please try manual sign up.');
            return;
          }
          
          if (newUser) {
            setUser(newUser);
            toast.success('Demo account created! Welcome to ItsEarth!');
            onClose();
          }
        } else {
          setAuthError(error);
        }
        return;
      }

      if (user) {
        setUser(user);
        toast.success('Signed in with demo account!');
        onClose();
      }
    } catch (error) {
      setAuthError('Failed to access demo account');
    } finally {
      setLoading(false);
    }
  };

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
            className="bg-surface-deep border border-accent-neural/20 rounded-2xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {mode === 'signin' ? 'Welcome Back' : 'Join ItsEarth'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Demo Account Button */}
            <button
              onClick={handleDemoSignIn}
              disabled={loading}
              className="w-full mb-4 p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Setting up demo...
                </>
              ) : (
                '🚀 Try Demo Account'
              )}
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface-deep text-gray-400">or continue with email</span>
              </div>
            </div>

            {/* Error Display */}
            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3"
              >
                <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-300">
                  {authError}
                  {authError.includes('Invalid email or password') && (
                    <div className="mt-2 text-xs text-red-400">
                      Don't have an account?{' '}
                      <button
                        onClick={() => handleModeSwitch('signup')}
                        className="underline hover:text-red-300 transition-colors"
                      >
                        Sign up here
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Mode Toggle */}
            <div className="flex bg-surface-mid rounded-lg p-1 mb-6">
              <button
                onClick={() => handleModeSwitch('signin')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'signin'
                    ? 'bg-accent-neural text-surface-deep'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => handleModeSwitch('signup')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-accent-neural text-surface-deep'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Sign Up Form */}
            {mode === 'signup' && (
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="signup-fullname">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      {...signUpForm.register('fullName')}
                      id="signup-fullname"
                      name="fullName"
                      type="text"
                      className="bio-input w-full pl-10"
                      placeholder="Enter your full name"
                      onChange={clearError}
                    />
                  </div>
                  {signUpForm.formState.errors.fullName && (
                    <p className="text-red-400 text-sm mt-1">
                      {signUpForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="signup-email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      {...signUpForm.register('email')}
                      id="signup-email"
                      name="email"
                      type="email"
                      className="bio-input w-full pl-10"
                      placeholder="Enter your email"
                      onChange={clearError}
                    />
                  </div>
                  {signUpForm.formState.errors.email && (
                    <p className="text-red-400 text-sm mt-1">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="signup-password">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      {...signUpForm.register('password')}
                      id="signup-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className="bio-input w-full pl-10 pr-10"
                      placeholder="Create a password (min 6 characters)"
                      onChange={clearError}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {signUpForm.formState.errors.password && (
                    <p className="text-red-400 text-sm mt-1">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="neural-button w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            )}

            {/* Sign In Form */}
            {mode === 'signin' && (
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="signin-email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      {...signInForm.register('email')}
                      id="signin-email"
                      name="email"
                      type="email"
                      className="bio-input w-full pl-10"
                      placeholder="Enter your email"
                      onChange={clearError}
                    />
                  </div>
                  {signInForm.formState.errors.email && (
                    <p className="text-red-400 text-sm mt-1">
                      {signInForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="signin-password">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      {...signInForm.register('password')}
                      id="signin-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className="bio-input w-full pl-10 pr-10"
                      placeholder="Enter your password"
                      onChange={clearError}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {signInForm.formState.errors.password && (
                    <p className="text-red-400 text-sm mt-1">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="neural-button w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            )}

            {/* Free Tier Info */}
            <div className="mt-6 p-4 bg-surface-mid rounded-lg">
              <h3 className="text-sm font-semibold text-accent-neural mb-2">
                🎉 Start Free Today
              </h3>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• 10 free location interactions daily</li>
                <li>• Access to AI location voices</li>
                <li>• Blockchain memory storage</li>
                <li>• Upgrade to Premium for unlimited access</li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}