'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { bulkUpdateUserNames } from '@/lib/admin-services';

export default function UpdateNamesPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [namesText, setNamesText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; updated: number; error?: string } | null>(null);
  const [options, setOptions] = useState({
    randomize: false,
    skipAdmins: true,
    onlyResidents: false,
  });

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

  const handleUpdate = async () => {
    if (!namesText.trim()) {
      setResult({ success: false, updated: 0, error: 'Please enter at least one name' });
      return;
    }

    // Parse names from textarea (one per line)
    const names = namesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (names.length === 0) {
      setResult({ success: false, updated: 0, error: 'No valid names found. Please enter names, one per line.' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const updateResult = await bulkUpdateUserNames(names, options);
      setResult(updateResult);
    } catch (error: any) {
      setResult({ success: false, updated: 0, error: error.message || 'An unexpected error occurred' });
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
          <h1 className="text-3xl font-bold text-gray-900">Bulk Update User Names</h1>
          <p className="text-gray-600 mt-2">Update user names in bulk with a list of names</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Enter Names
            </CardTitle>
            <CardDescription>
              Enter names, one per line. Each name will be assigned to a user. Names can be repeated if you have fewer names than users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="names">Names (one per line)</Label>
              <Textarea
                id="names"
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
                placeholder="John Smith&#10;Jane Doe&#10;Michael Johnson&#10;Sarah Williams&#10;..."
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-sm text-gray-500">
                {namesText.split('\n').filter(line => line.trim().length > 0).length} name(s) entered
              </p>
            </div>

            <div className="space-y-4 border-t pt-4">
              <Label>Options</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="randomize"
                    checked={options.randomize}
                    onCheckedChange={(checked) => setOptions({ ...options, randomize: checked as boolean })}
                  />
                  <Label htmlFor="randomize" className="cursor-pointer">
                    Randomize name assignment (shuffle names before assigning)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipAdmins"
                    checked={options.skipAdmins}
                    onCheckedChange={(checked) => setOptions({ ...options, skipAdmins: checked as boolean })}
                  />
                  <Label htmlFor="skipAdmins" className="cursor-pointer">
                    Skip admin users (don't update admin/super_admin accounts)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="onlyResidents"
                    checked={options.onlyResidents}
                    onCheckedChange={(checked) => setOptions({ ...options, onlyResidents: checked as boolean })}
                  />
                  <Label htmlFor="onlyResidents" className="cursor-pointer">
                    Only update residents (skip collectors and other roles)
                  </Label>
                </div>
              </div>
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
                      <p>{result.updated} user(s) updated successfully.</p>
                      {result.error && <p className="text-sm text-yellow-600 mt-1">{result.error}</p>}
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">Error</p>
                      <p>{result.error || 'Failed to update user names'}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleUpdate}
              disabled={isLoading || !namesText.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Names...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Update User Names
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

