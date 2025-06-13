import { loadStripe, Stripe } from '@stripe/stripe-js';
import { config } from '../config';
import { supabase } from '../supabase';

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    const key = config.stripe.publishableKey;
    if (!key) {
      console.warn('⚠️ Stripe publishable key is missing. Payment features will not work.');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export class PaymentService {
  async createCheckoutSession(userId: string, priceId: string): Promise<{ url: string | null; error: string | null }> {
    try {
      // Validate inputs
      if (!userId) {
        return { url: null, error: 'User ID is required' };
      }
      
      if (!priceId) {
        return { url: null, error: 'Price ID is required' };
      }
      
      // Check if Supabase functions are available
      if (!supabase.functions) {
        return { url: null, error: 'Supabase functions not available' };
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          userId,
          priceId,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/pricing`
        }
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        return { url: null, error: error.message };
      }

      return { url: data.url, error: null };
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      return { url: null, error: 'Failed to create checkout session' };
    }
  }

  async createPortalSession(customerId: string): Promise<{ url: string | null; error: string | null }> {
    try {
      // Validate input
      if (!customerId) {
        return { url: null, error: 'Customer ID is required' };
      }
      
      // Check if Supabase functions are available
      if (!supabase.functions) {
        return { url: null, error: 'Supabase functions not available' };
      }

      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          customerId,
          returnUrl: window.location.origin
        }
      });

      if (error) {
        console.error('Error creating portal session:', error);
        return { url: null, error: error.message };
      }

      return { url: data.url, error: null };
    } catch (error) {
      console.error('Failed to create portal session:', error);
      return { url: null, error: 'Failed to create portal session' };
    }
  }

  async redirectToCheckout(sessionId: string): Promise<{ error: string | null }> {
    try {
      const stripe = await getStripe();
      
      if (!stripe) {
        return { error: 'Stripe failed to load' };
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      return { error: error?.message || null };
    } catch (error) {
      console.error('Failed to redirect to checkout:', error);
      return { error: 'Failed to redirect to checkout' };
    }
  }

  async upgradeToPremium(userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Validate input
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }
      
      // Check if price ID is configured
      if (!config.stripe.priceId) {
        return { success: false, error: 'Stripe price ID is not configured' };
      }

      const { url, error } = await this.createCheckoutSession(userId, config.stripe.priceId);
      
      if (error || !url) {
        return { success: false, error: error || 'Failed to create checkout session' };
      }

      window.location.href = url;
      return { success: true, error: null };
    } catch (error) {
      console.error('Failed to upgrade to premium:', error);
      return { success: false, error: 'Failed to upgrade to premium' };
    }
  }

  async cancelSubscription(userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Validate input
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }
      
      // Check if Supabase functions are available
      if (!supabase.functions) {
        return { success: false, error: 'Supabase functions not available' };
      }

      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { userId }
      });

      if (error) {
        console.error('Error canceling subscription:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return { success: false, error: 'Failed to cancel subscription' };
    }
  }
}

export const paymentService = new PaymentService();