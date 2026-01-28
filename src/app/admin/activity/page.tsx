"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

interface EventRow {
	id: string;
	user_id: string;
	event_type: 'login' | 'logout' | 'soft_logout' | 'unlock';
	reason: string | null;
	created_at: string;
	user_email?: string | null;
}

export default function AdminActivityPage() {
	const [events, setEvents] = useState<EventRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = async () => {
		setLoading(true);
		setError(null);
    try {
        // Use secure RPC that bypasses RLS for superadmins
        const { data, error } = await supabase.rpc('get_admin_session_events', { p_limit: 200 });
        if (error) throw error;
        const withEmails = await Promise.all((data || []).map(async (e: any) => {
            try {
                const { data: u } = await supabase.from('users').select('email').eq('id', e.user_id).maybeSingle();
                return { ...e, user_email: u?.email || null } as EventRow;
            } catch {
                return { ...e, user_email: null } as EventRow;
            }
        }))
        setEvents(withEmails);
    } catch (e: any) {
			setError(e?.message || 'Failed to load activity');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { load(); }, []);

  // Group by user
  const groups = events.reduce<Record<string, EventRow[]>>((acc, ev) => {
    const key = ev.user_email || ev.user_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  return (
		<AdminLayout currentPage={'/admin/activity'}>
			<Card className="shadow-card">
				<CardHeader>
					<CardTitle>Admin Activity</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex justify-between items-center mb-3">
						<div className="text-sm text-muted-foreground">Logins, soft sign-outs, unlocks</div>
						<Button size="sm" onClick={load} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</Button>
					</div>
					{error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(groups).map(([userKey, rows]) => (
              <AccordionItem key={userKey} value={userKey}>
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{userKey}</span>
                    <span className="text-xs text-muted-foreground">{rows.length} events</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th className="py-2 pr-4">Type</th>
                          <th className="py-2 pr-4">Reason</th>
                          <th className="py-2 pr-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(r => (
                          <tr key={r.id} className="border-t">
                            <td className="py-2 pr-4 capitalize">{r.event_type.replace('_',' ')}</td>
                            <td className="py-2 pr-4">{r.reason || '-'}</td>
                            <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {!loading && events.length === 0 && (
            <div className="text-sm text-muted-foreground">No activity yet.</div>
          )}
				</CardContent>
			</Card>
		</AdminLayout>
	);
}
