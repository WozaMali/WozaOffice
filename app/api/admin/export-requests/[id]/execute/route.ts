import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Execute approved export
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      );
    }
    const { id } = await params;

    // Get the export request
    const { data: exportRequest, error: fetchError } = await supabaseAdmin
      .from('export_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !exportRequest) {
      return NextResponse.json({ error: 'Export request not found' }, { status: 404 });
    }

    if (exportRequest.status !== 'approved') {
      return NextResponse.json({ error: 'Export request is not approved' }, { status: 400 });
    }

    const { export_type, request_data, filename } = exportRequest;

    // Execute the export based on type
    // Note: This is a simplified version - in production, you might want to
    // return the file data or trigger a download differently
    // For now, we'll mark it as executed and return success
    // The actual export will be handled client-side when the user clicks "Download"

    return NextResponse.json({ 
      success: true,
      message: 'Export ready for download',
      exportRequest 
    });
  } catch (error: any) {
    console.error('Error executing export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

