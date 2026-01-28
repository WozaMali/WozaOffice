/**
 * Rewards Service (Office App)
 * Handles CRUD operations for rewards system
 * Uses the unified rewards service from Main App
 */

import { supabase } from './supabase';

export interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  category: 'cash' | 'service' | 'product' | 'voucher';
  is_active: boolean;
  logo_url?: string;
  redeem_url?: string;
  order_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRewardData {
  name: string;
  description: string;
  points_required: number;
  category: 'cash' | 'service' | 'product' | 'voucher';
  is_active?: boolean;
  logo_url?: string;
  redeem_url?: string;
  order_url?: string;
}

export interface UpdateRewardData {
  name?: string;
  description?: string;
  points_required?: number;
  category?: 'cash' | 'service' | 'product' | 'voucher';
  is_active?: boolean;
  logo_url?: string;
  redeem_url?: string;
  order_url?: string;
}

/**
 * Upload a reward logo to Supabase Storage (bucket: reward-logos)
 * Returns a public URL string on success
 */
export async function uploadRewardLogo(file: File, rewardName: string): Promise<{ url?: string; error?: any }> {
  try {
    const bucket = 'reward-logos';
    const timestamp = Date.now();
    const safeName = rewardName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const ext = file.name.split('.').pop() || 'png';
    const path = `${safeName}/${safeName}-${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (uploadError) return { error: uploadError };

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (error) {
    return { error };
  }
}

/**
 * Get all rewards
 */
export async function getAllRewards(): Promise<{ data: Reward[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rewards:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Exception in getAllRewards:', error);
    return { data: null, error };
  }
}

/**
 * Get active rewards only
 */
export async function getActiveRewards(): Promise<{ data: Reward[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_required', { ascending: true });

    if (error) {
      console.error('Error fetching active rewards:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Exception in getActiveRewards:', error);
    return { data: null, error };
  }
}

/**
 * Get rewards by category
 */
export async function getRewardsByCategory(category: string): Promise<{ data: Reward[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('category', category)
      .order('points_required', { ascending: true });

    if (error) {
      console.error('Error fetching rewards by category:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Exception in getRewardsByCategory:', error);
    return { data: null, error };
  }
}

/**
 * Create a new reward
 */
export async function createReward(rewardData: CreateRewardData): Promise<{ data: Reward | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .insert([{
        ...rewardData,
        is_active: rewardData.is_active ?? true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating reward:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception in createReward:', error);
    return { data: null, error };
  }
}

/**
 * Update a reward
 */
export async function updateReward(rewardId: string, rewardData: UpdateRewardData): Promise<{ data: Reward | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .update({
        ...rewardData,
        updated_at: new Date().toISOString()
      })
      .eq('id', rewardId)
      .select()
      .single();

    if (error) {
      console.error('Error updating reward:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception in updateReward:', error);
    return { data: null, error };
  }
}

/**
 * Delete a reward
 */
export async function deleteReward(rewardId: string): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', rewardId);

    if (error) {
      console.error('Error deleting reward:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception in deleteReward:', error);
    return { success: false, error };
  }
}

/**
 * Toggle reward active status
 */
export async function toggleRewardStatus(rewardId: string, isActive: boolean): Promise<{ data: Reward | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', rewardId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling reward status:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception in toggleRewardStatus:', error);
    return { data: null, error };
  }
}
