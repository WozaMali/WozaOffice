"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useTownships, useSubdivisions } from '@/lib/unified-admin-service';
import { useAuth } from '@/hooks/use-auth';

export default function AdminOnboardingPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    suburb: '',
    city: '',
    postalCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Address data
  const { townships, loading: townshipsLoading } = useTownships();
  const [selectedTownshipId, setSelectedTownshipId] = useState<string>('');
  const { subdivisions, loading: subdivisionsLoading } = useSubdivisions(selectedTownshipId || null);

  // Only show Soweto townships
  const sowetoTownships = useMemo(() => {
    return (townships || []).filter((t: any) => (t.city || '').toLowerCase() === 'soweto');
  }, [townships]);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('first_name,last_name,phone,street_addr,subdivision,city,postal_code,date_of_birth,status,role,township_id')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setForm(prev => ({
          ...prev,
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          dateOfBirth: data.date_of_birth ? String(data.date_of_birth).slice(0, 10) : '',
          phone: data.phone || '',
          addressLine1: data.street_addr || '',
          addressLine2: '',
          suburb: data.subdivision || '',
          city: data.city || '',
          postalCode: data.postal_code || ''
        }));
        setSelectedTownshipId(data.township_id || '');
      }
    };
    init();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Submit via server route (service role) to bypass RLS issues
      const resp = await fetch('/api/admin/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          firstName: form.firstName,
          lastName: form.lastName,
          dateOfBirth: form.dateOfBirth,
          phone: form.phone,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          townshipId: selectedTownshipId,
          suburb: form.suburb,
          city: form.city,
          postalCode: form.postalCode
        })
      });
      const json = await resp.json();
      if (!resp.ok || !json.success) throw new Error(json.error || 'Failed to submit onboarding');
      setSuccess('Submitted for approval. A super admin will review your request.');
      // Redirect to sign-in after submission so Super Admin can approve first
      setTimeout(async () => {
        try { await logout(); } catch {}
        router.push('/admin-login');
      }, 1200);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Administrator Onboarding</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
            {success && (
              <Alert><AlertDescription>{success}</AlertDescription></Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              {/* Address - uses township/subdivision like Main App */}
              <div className="space-y-3">
                <Label>Address</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Address line 1" value={form.addressLine1} onChange={e => setForm(f => ({ ...f, addressLine1: e.target.value }))} />
                  <Input placeholder="Address line 2 (optional)" value={form.addressLine2} onChange={e => setForm(f => ({ ...f, addressLine2: e.target.value }))} />
                  <select
                    value={selectedTownshipId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTownshipId(id);
                      const tw = (sowetoTownships || []).find((t: any) => t.id === id);
                      setForm(f => ({ ...f, city: tw?.city || f.city, postalCode: tw?.postal_code || f.postalCode }));
                    }}
                    className="h-10 border rounded px-3 bg-gray-800 text-white border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-700 disabled:text-gray-400"
                  >
                    <option value="">Select Township</option>
                    {sowetoTownships.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <select
                    value={form.suburb}
                    onChange={(e) => setForm(f => ({ ...f, suburb: e.target.value }))}
                    disabled={!selectedTownshipId || subdivisionsLoading}
                    className="h-10 border rounded px-3 bg-gray-800 text-white border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-700 disabled:text-gray-400"
                  >
                    <option value="">
                      {!selectedTownshipId ? 'Select Township first' : (subdivisionsLoading ? 'Loading...' : 'Select Subdivision')}
                    </option>
                    {subdivisions.map((s: any) => (
                      <option key={s.subdivision} value={s.subdivision}>{s.subdivision}</option>
                    ))}
                  </select>
                  <Input placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  <Input placeholder="Postal Code" value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Submitting...' : 'Submit for Approval'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


