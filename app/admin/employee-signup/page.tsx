"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

function computeNextEmployeeNumber(latest: string | null): string {
  const match = latest?.match(/^SNW(\d{4})$/);
  if (!match) return "SNW0001";
  const next = String(parseInt(match[1], 10) + 1).padStart(4, "0");
  return `SNW${next}`;
}

export default function EmployeeSignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        setError("Sign up succeeded but no user ID returned.");
        setIsLoading(false);
        return;
      }

      // Find latest SNW number (format SNW0001)
      const { data: existing, error: listError } = await supabase
        .from('users')
        .select('employee_number')
        .ilike('employee_number', 'SNW%')
        .order('employee_number', { ascending: false })
        .limit(100);

      if (listError) {
        setError(`Failed to fetch latest employee number: ${listError.message}`);
        setIsLoading(false);
        return;
      }

      const latestValid = (existing || [])
        .map(r => r.employee_number as string | null)
        .find(v => v !== null && /^SNW\d{4}$/.test(v));

      const nextEmp = computeNextEmployeeNumber(latestValid || null);

      // Upsert into unified users table for approval workflow
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email,
          full_name: fullName,
          phone,
          employee_number: nextEmp,
          status: 'pending_approval',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (upsertError) {
        setError(`Failed to save employee record: ${upsertError.message}`);
        setIsLoading(false);
        return;
      }

      setSuccess(`Account created. Your Employee Number is ${nextEmp}. Awaiting approval.`);
      // Redirect to login after short delay
      setTimeout(() => router.push('/admin-login'), 1800);
    } catch (err: any) {
      setError(err?.message || 'Unexpected error during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img src="/w yellow.png" alt="Woza Mali Logo" className="w-16 h-16" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Employee Sign Up</CardTitle>
            <p className="text-gray-600">Create your account for approval by an administrator</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-gray-700 font-medium">Full Name</Label>
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Work Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 font-medium">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 082 123 4567" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" required />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5" disabled={isLoading}>
                {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</>) : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


