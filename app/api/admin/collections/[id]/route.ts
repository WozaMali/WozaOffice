import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collectionId = id;
    const body = await request.json();
    const { status, admin_notes } = body;

    if (!status || !['approved', 'rejected', 'pending', 'submitted'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    console.log(`🔍 API: Updating collection ${collectionId} to status: ${status}`);

    // First, check which table the collection exists in
    const { data: unifiedCheck } = await supabaseAdmin
      .from('unified_collections')
      .select('id, status')
      .eq('id', collectionId)
      .maybeSingle();
    
    if (!unifiedCheck) {
      return NextResponse.json(
        { error: 'Collection not found in unified_collections' },
        { status: 404 }
      );
    }

    // Try updating unified_collections
    try {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('unified_collections')
        .update({ 
          status, 
          admin_notes: admin_notes || null, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', collectionId)
        .select('*')
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (updated) {
        console.log('✅ API: Successfully updated unified_collections');
        
        // Process PET Bottles contribution if approved (non-blocking)
        if (status === 'approved') {
          try {
            await fetch(`${request.nextUrl.origin}/api/green-scholar/pet-bottles-contribution`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ collectionId })
            });
          } catch (e) {
            console.warn('⚠️ PET contribution processing failed (non-blocking):', e);
          }
        }
        
        return NextResponse.json({ 
          collection: updated,
          success: true 
        });
      }
    } catch (error: any) {
      console.error('❌ API: Error updating unified_collections:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update collection' },
        { status: 500 }
      );
    }
    
    // Fallback return if nothing matched (shouldn't happen given logic above)
    return NextResponse.json(
        { error: 'Failed to update collection' },
        { status: 500 }
    );

  } catch (error: any) {
    console.error('❌ API: Exception in PATCH handler:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
