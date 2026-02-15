import { getSupabaseClient } from '@/lib/supabase'

export type AdminSessionEventType = 'login' | 'logout' | 'soft_logout' | 'unlock'

export async function logAdminSessionEvent(userId: string | null | undefined, eventType: AdminSessionEventType, reason?: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    // Use secure RPCs that rely on auth.uid() and bypass client-side user_id mistakes
    if (eventType === 'soft_logout') {
      await supabase.rpc('log_soft_signout', { p_reason: reason ?? null })
      return
    }
    if (eventType === 'logout') {
      await supabase.rpc('log_signout', { p_reason: reason ?? null })
      return
    }
    // Fallback to generic RPC for other events
    await supabase.rpc('log_admin_session_event', { p_event_type: eventType, p_reason: reason ?? null })
  } catch (_e) {
    // Best-effort logging; ignore if table/policy not present
  }
}


