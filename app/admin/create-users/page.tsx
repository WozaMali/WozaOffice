'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { bulkCreateUsersFromNames } from '@/lib/admin-services';

export default function CreateUsersPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [namesText, setNamesText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; created: number; errors: Array<{ name: string; error: string }> } | null>(null);

  // Check if user is admin
  const isAdmin = profile?.role && ['admin', 'super_admin', 'superadmin'].includes(profile.role.toLowerCase());

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need administrator privileges to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/admin')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!namesText.trim()) {
      setResult({ success: false, created: 0, errors: [{ name: 'System', error: 'Please enter at least one name' }] });
      return;
    }

    // Parse names from textarea
    // Format: "FirstName Surname" or "FirstName\tSurname" or "FirstName,Surname"
    const lines = namesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const names: Array<{ firstName: string; surname: string }> = [];
    const parseErrors: string[] = [];

    for (const line of lines) {
      // Try different separators: space, tab, comma
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(',')) {
        parts = line.split(',').map(p => p.trim());
      } else {
        // Split by space, take first as first name, rest as surname
        const spaceParts = line.split(/\s+/);
        if (spaceParts.length >= 2) {
          parts = [spaceParts[0], spaceParts.slice(1).join(' ')];
        } else {
          parseErrors.push(`Invalid format: "${line}" (need first name and surname)`);
          continue;
        }
      }

      if (parts.length >= 2) {
        names.push({
          firstName: parts[0].trim(),
          surname: parts.slice(1).join(' ').trim()
        });
      } else {
        parseErrors.push(`Invalid format: "${line}" (need first name and surname)`);
      }
    }

    if (names.length === 0) {
      setResult({ 
        success: false, 
        created: 0, 
        errors: parseErrors.length > 0 
          ? parseErrors.map(e => ({ name: 'Parse Error', error: e }))
          : [{ name: 'System', error: 'No valid names found. Format: "FirstName Surname" (one per line)' }]
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const createResult = await bulkCreateUsersFromNames(names, {
        role: 'resident'
      });
      setResult(createResult);
    } catch (error: any) {
      setResult({ 
        success: false, 
        created: 0, 
        errors: [{ name: 'System', error: error.message || 'An unexpected error occurred' }] 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => router.push('/admin')} variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Create Users from Names</h1>
          <p className="text-gray-600 mt-2">
            Enter names and surnames. The system will automatically generate email addresses, 
            phone numbers, and Dobsonville addresses (old, Ext 1, Ext 2).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Enter Names
            </CardTitle>
            <CardDescription>
              Enter names in format: "FirstName Surname" (one per line). 
              The system will generate:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Email: Various formats @gmail.com (firstname.surname, firstnamesurname, with numbers, initials, etc.)</li>
                <li>Phone: South African format (+27...)</li>
                <li>Address: Dobsonville (old, Ext 1, or Ext 2) with real street addresses</li>
              </ul>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="names">Names (FirstName Surname, one per line)</Label>
              <Textarea
                id="names"
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
                placeholder="John Smith&#10;Jane Doe&#10;Michael Johnson&#10;Sarah Williams&#10;..."
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-sm text-gray-500">
                {namesText.split('\n').filter(line => line.trim().length > 0).length} line(s) entered
              </p>
            </div>

            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {result.success ? (
                    <div>
                      <p className="font-semibold">Success!</p>
                      <p>{result.created} user(s) created successfully.</p>
                      {result.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold">Errors ({result.errors.length}):</p>
                          <ul className="text-sm list-disc list-inside mt-1">
                            {result.errors.slice(0, 10).map((err, idx) => (
                              <li key={idx}>{err.name}: {err.error}</li>
                            ))}
                            {result.errors.length > 10 && (
                              <li>... and {result.errors.length - 10} more errors</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">Error</p>
                      <ul className="list-disc list-inside mt-1">
                        {result.errors.map((err, idx) => (
                          <li key={idx}>{err.name}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleCreate}
              disabled={isLoading || !namesText.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Users...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Users
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

