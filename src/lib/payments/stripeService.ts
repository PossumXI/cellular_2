import { loadStripe, Stripe } from '@stripe/stripe-js';
import { config } from '../config';
import { supabase } from '../supabase';

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(config.stripe.publishableKey);
  }
  return stripePromise;
};

export class PaymentService {
  async createCheckoutSession(userId: string, priceId: string): Promise<{ url: string | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          userId,
          priceId,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/pricing`
        }
      });

      if (error) {
        return { url: null, error: error.message };
      }

      return { url: data.url, error: null };
    } catch (error) {
      return { url: null, error: 'Failed to create checkout session' };
    }
  }

  async createPortalSession(customerId: string): Promise<{ url: string | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          customerId,
          returnUrl: window.location.origin
        }
      });

      if (error) {
        return { url: null, error: error.message };
      }

      return { url: data.url, error: null };
    } catch (error) {
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
      return { error: 'Failed to redirect to checkout' };
    }
  }

  async upgradeToPremium(userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { url, error } = await this.createCheckoutSession(userId, config.stripe.priceId);
      
      if (error || !url) {
        return { success: false, error: error || 'Failed to create checkout session' };
      }

      window.location.href = url;
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: 'Failed to upgrade to premium' };
    }
  }

  async cancelSubscription(userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { userId }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: 'Failed to cancel subscription' };
    }
  }
}

export const paymentService = new PaymentService();