"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, RefreshCw } from "lucide-react";

type PendingEmployee = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  employee_number: string | null;
  status: string | null;
};

export default function PendingEmployeesPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PendingEmployee[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, phone, employee_number, status')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: true });
    if (!error) setRows(data as PendingEmployee[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('users')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await load();
    setLoading(false);
  };

  const reject = async (id: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('users')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await load();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Pending Employees</h1>
          <Button onClick={load} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Awaiting Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-300">Employee #</TableHead>
                  <TableHead className="text-gray-300">Name</TableHead>
                  <TableHead className="text-gray-300">Email</TableHead>
                  <TableHead className="text-gray-300">Phone</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400">No pending employees</TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-gray-200">{r.employee_number || '-'}</TableCell>
                    <TableCell className="text-gray-200">{r.full_name}</TableCell>
                    <TableCell className="text-gray-200">{r.email}</TableCell>
                    <TableCell className="text-gray-200">{r.phone || '-'}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" onClick={() => approve(r.id)} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reject(r.id)} disabled={loading} className="border-gray-600 text-gray-200 hover:bg-gray-800">
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


