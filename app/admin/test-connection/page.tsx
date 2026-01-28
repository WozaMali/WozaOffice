"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function TestConnectionPage() {
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<{
    supabase: 'pending' | 'success' | 'error';
    auth: 'pending' | 'success' | 'error';
    database: 'pending' | 'success' | 'error';
  }>({
    supabase: 'pending',
    auth: 'pending',
    database: 'pending'
  });
  const [errorDetails, setErrorDetails] = useState<string>('');

  const testConnection = async () => {
    setIsTesting(true);
    setResults({
      supabase: 'pending',
      auth: 'pending',
      database: 'pending'
    });
    setErrorDetails('');

    try {
      // Test 1: Basic Supabase client
      console.log('Testing Supabase client...');
      setResults(prev => ({ ...prev, supabase: 'success' }));

      // Test 2: Auth connection
      console.log('Testing auth connection...');
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Auth error:', authError);
        setResults(prev => ({ ...prev, auth: 'error' }));
        setErrorDetails(`Auth error: ${authError.message}`);
      } else {
        console.log('Auth connection successful');
        setResults(prev => ({ ...prev, auth: 'success' }));
      }

      // Test 3: Database connection
      console.log('Testing database connection...');
      const { data: dbData, error: dbError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (dbError) {
        console.error('Database error:', dbError);
        setResults(prev => ({ ...prev, database: 'error' }));
        setErrorDetails(prev => prev + `\nDatabase error: ${dbError.message}`);
      } else {
        console.log('Database connection successful');
        setResults(prev => ({ ...prev, database: 'success' }));
      }

    } catch (error) {
      console.error('Connection test error:', error);
      setErrorDetails(`Unexpected error: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusBadge = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'success':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Error</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Connection Test</h1>
          <p className="text-gray-600">Test Supabase connectivity and identify issues</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Supabase Connection</CardTitle>
            <CardDescription>Verify all connection components are working</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testConnection} 
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run Connection Test'
              )}
            </Button>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(results.supabase)}
                  <span className="font-medium">Supabase Client</span>
                </div>
                {getStatusBadge(results.supabase)}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(results.auth)}
                  <span className="font-medium">Authentication</span>
                </div>
                {getStatusBadge(results.auth)}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(results.database)}
                  <span className="font-medium">Database</span>
                </div>
                {getStatusBadge(results.database)}
              </div>
            </div>

            {errorDetails && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800 mb-1">Error Details:</p>
                    <pre className="text-red-700 whitespace-pre-wrap text-xs">{errorDetails}</pre>
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Environment Variables:</strong></p>
              <p>• Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
              <p>• Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
          >
            ← Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
