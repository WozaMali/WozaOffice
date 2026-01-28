import { supabase } from './supabase'

export type LoginPopupAd = {
  id?: string
  name?: string
  enabled: boolean
  title?: string
  description?: string
  imageUrl: string
  ctaUrl?: string
  startAt?: string
  endAt?: string
  updatedAt?: string
  priority?: number
  width?: number | null
  height?: number | null
}

export type LoginPopupAdRow = {
  id: string
  name: string
  title: string | null
  description: string | null
  image_url: string
  cta_url: string | null
  enabled: boolean
  priority: number
  start_at: string | null
  end_at: string | null
  width: number | null
  height: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export async function getAppSettingJson<T = any>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value, setting_type')
    .eq('setting_key', key)
    .maybeSingle()
  if (error || !data) return null
  try {
    if (data.setting_type === 'json') {
      return JSON.parse(data.setting_value) as T
    }
    return null
  } catch {
    return null
  }
}

export async function setAppSettingJson(key: string, value: any, options?: { description?: string; isPublic?: boolean }) {
  const payload = {
    setting_key: key,
    setting_value: JSON.stringify(value),
    setting_type: 'json',
    description: options?.description ?? null,
    is_public: options?.isPublic ?? true,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('app_settings')
    .upsert(payload, { onConflict: 'setting_key' })
  return { error }
}

export async function uploadAdMedia(file: File): Promise<{ url?: string; error?: any }> {
  try {
    // Use API route for uploads to handle bucket creation with service role
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/admin/ads/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
      return { error: errorData.error || 'Upload failed' }
    }

    const data = await response.json()
    return { url: data.url }
  } catch (error: any) {
    console.error('Ad media upload error:', error)
    return { error: error.message || 'Upload failed' }
  }
}

// ============================================================================
// UNIFIED LOGIN POPUP ADS TABLE FUNCTIONS
// ============================================================================

/**
 * Get the active login popup ad (highest priority, enabled, within date range)
 * This is used by the Main WozaMali App to display ads on login
 */
export async function getActiveLoginPopupAd(): Promise<LoginPopupAd | null> {
  try {
    // Fetch all enabled ads, then filter by date range in JavaScript
    // This is more reliable than complex Supabase OR queries
    const { data, error } = await supabase
      .from('login_popup_ads')
      .select('*')
      .eq('enabled', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) return null

    const now = Date.now()

    // Find the first ad that is within its date range (if dates are set)
    const activeAd = data.find(ad => {
      const startAt = ad.start_at ? new Date(ad.start_at).getTime() : null
      const endAt = ad.end_at ? new Date(ad.end_at).getTime() : null
      
      // If start_at is set, current time must be >= start_at
      if (startAt && now < startAt) return false
      // If end_at is set, current time must be <= end_at
      if (endAt && now > endAt) return false
      
      return true
    })

    if (!activeAd) return null

    return {
      id: activeAd.id,
      name: activeAd.name,
      enabled: activeAd.enabled,
      title: activeAd.title || undefined,
      description: activeAd.description || undefined,
      imageUrl: activeAd.image_url,
      ctaUrl: activeAd.cta_url || undefined,
      startAt: activeAd.start_at || undefined,
      endAt: activeAd.end_at || undefined,
      updatedAt: activeAd.updated_at,
      priority: activeAd.priority,
      width: activeAd.width || undefined,
      height: activeAd.height || undefined
    }
  } catch (error) {
    console.error('Error fetching active login popup ad:', error)
    return null
  }
}

/**
 * Get all login popup ads (for admin management)
 */
export async function getAllLoginPopupAds(): Promise<LoginPopupAdRow[]> {
  try {
    const { data, error } = await supabase
      .from('login_popup_ads')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching login popup ads:', error)
    return []
  }
}

/**
 * Create a new login popup ad
 */
export async function createLoginPopupAd(ad: {
  name?: string
  title?: string
  description?: string
  imageUrl: string
  ctaUrl?: string
  enabled?: boolean
  priority?: number
  startAt?: string
  endAt?: string
  width?: number | null
  height?: number | null
}): Promise<{ data?: LoginPopupAdRow; error?: any }> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const payload = {
      name: ad.name || 'Login Popup Ad',
      title: ad.title || null,
      description: ad.description || null,
      image_url: ad.imageUrl,
      cta_url: ad.ctaUrl || null,
      enabled: ad.enabled ?? true,
      priority: ad.priority ?? 0,
      start_at: ad.startAt || null,
      end_at: ad.endAt || null,
      width: ad.width ?? null,
      height: ad.height ?? null,
      created_by: userData?.user?.id || null
    }

    const { data, error } = await supabase
      .from('login_popup_ads')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return { data }
  } catch (error) {
    console.error('Error creating login popup ad:', error)
    return { error }
  }
}

/**
 * Update an existing login popup ad
 */
export async function updateLoginPopupAd(
  id: string,
  updates: {
    name?: string
    title?: string
    description?: string
    imageUrl?: string
    ctaUrl?: string
    enabled?: boolean
    priority?: number
    startAt?: string
    endAt?: string
    width?: number | null
    height?: number | null
  }
): Promise<{ data?: LoginPopupAdRow; error?: any }> {
  try {
    const payload: any = {}
    if (updates.name !== undefined) payload.name = updates.name
    if (updates.title !== undefined) payload.title = updates.title || null
    if (updates.description !== undefined) payload.description = updates.description || null
    if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl
    if (updates.ctaUrl !== undefined) payload.cta_url = updates.ctaUrl || null
    if (updates.enabled !== undefined) payload.enabled = updates.enabled
    if (updates.priority !== undefined) payload.priority = updates.priority
    if (updates.startAt !== undefined) payload.start_at = updates.startAt || null
    if (updates.endAt !== undefined) payload.end_at = updates.endAt || null
    if (updates.width !== undefined) payload.width = updates.width ?? null
    if (updates.height !== undefined) payload.height = updates.height ?? null

    const { data, error } = await supabase
      .from('login_popup_ads')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data }
  } catch (error) {
    console.error('Error updating login popup ad:', error)
    return { error }
  }
}

/**
 * Delete a login popup ad
 */
export async function deleteLoginPopupAd(id: string): Promise<{ data?: any; error?: any }> {
  try {
    if (!id) {
      const err = new Error('Ad ID is required')
      return { error: err }
    }
    
    console.log('Attempting to delete login popup ad:', id)
    
    // First verify the ad exists
    const { data: existingAd, error: checkError } = await supabase
      .from('login_popup_ads')
      .select('id')
      .eq('id', id)
      .maybeSingle()
    
    if (checkError) {
      console.error('Error checking ad existence:', checkError)
      return { error: checkError }
    }
    
    if (!existingAd) {
      const err = new Error('Ad not found')
      return { error: err }
    }
    
    // Delete the ad
    const { data, error } = await supabase
      .from('login_popup_ads')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('Supabase delete error:', error)
      return { error }
    }
    
    console.log('Delete successful, deleted ad:', data?.[0]?.id || 'unknown')
    return { data: data?.[0] || null }
  } catch (error: any) {
    console.error('Error deleting login popup ad:', error)
    return { error: error?.message || error || 'Unknown error occurred' }
  }
}

