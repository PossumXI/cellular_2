import { supabase, User } from '../supabase';
import { config } from '../config';

export class AuthService {
  async signUp(email: string, password: string, fullName?: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('User already registered')) {
          return { user: null, error: 'An account with this email already exists. Please sign in instead.' };
        }
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Wait longer for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch the created profile with error handling
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle(); // Use maybeSingle to handle no results gracefully

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          return { user: null, error: 'Account created but profile setup failed. Please try signing in.' };
        }

        return { user: profile as User, error: null };
      }

      return { user: null, error: 'User creation failed' };
    } catch (error) {
      console.error('SignUp error:', error);
      return { user: null, error: 'An unexpected error occurred during registration' };
    }
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { user: null, error: 'Invalid email or password. Please check your credentials and try again.' };
        }
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Fetch user profile with better error handling
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle(); // Use maybeSingle to handle no results gracefully

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          return { user: null, error: 'Sign in successful but profile loading failed. Please try again.' };
        }

        if (!profile) {
          // Profile doesn't exist, create it
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              full_name: data.user.user_metadata?.full_name || '',
              subscription_tier: 'free',
              daily_interactions_used: 0,
              daily_limit: 10
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating user profile:', createError);
            return { user: null, error: 'Profile creation failed. Please contact support.' };
          }

          return { user: newProfile as User, error: null };
        }

        return { user: profile as User, error: null };
      }

      return { user: null, error: 'Sign in failed' };
    } catch (error) {
      console.error('SignIn error:', error);
      return { user: null, error: 'An unexpected error occurred during sign in' };
    }
  }

  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error?.message || null };
    } catch (error) {
      console.error('SignOut error:', error);
      return { error: 'An unexpected error occurred during sign out' };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to handle no results gracefully

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      // If no profile exists, create one
      if (!profile) {
        console.log('No profile found, creating one...');
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            subscription_tier: 'free',
            daily_interactions_used: 0,
            daily_limit: 10
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating user profile:', createError);
          return null;
        }

        return newProfile as User;
      }

      return profile as User;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: 'No authenticated user' };
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      return { error: error?.message || null };
    } catch (error) {
      console.error('UpdateProfile error:', error);
      return { error: 'An unexpected error occurred while updating profile' };
    }
  }

  async checkDailyLimit(userId: string): Promise<{ canInteract: boolean; remaining: number }> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('daily_interactions_used, daily_limit, subscription_tier')
        .eq('id', userId)
        .maybeSingle();

      if (error || !user) {
        console.error('Error checking daily limit:', error);
        return { canInteract: false, remaining: 0 };
      }

      // Premium users have unlimited interactions
      if (user.subscription_tier === 'premium') {
        return { canInteract: true, remaining: 999 };
      }

      const remaining = user.daily_limit - user.daily_interactions_used;
      return {
        canInteract: remaining > 0,
        remaining: Math.max(0, remaining)
      };
    } catch (error) {
      console.error('Error checking daily limit:', error);
      return { canInteract: false, remaining: 0 };
    }
  }

  async incrementDailyUsage(userId: string): Promise<void> {
    try {
      // Check if user is premium first
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      // Don't increment for premium users
      if (user?.subscription_tier === 'premium') {
        return;
      }

      await supabase.rpc('increment_daily_usage', { user_id: userId });
    } catch (error) {
      console.error('Error incrementing daily usage:', error);
    }
  }

  async resetDailyUsage(): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ daily_interactions_used: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all users
    } catch (error) {
      console.error('Error resetting daily usage:', error);
    }
  }
}

export const authService = new AuthService();