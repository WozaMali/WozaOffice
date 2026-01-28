import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = getAdminClient();
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bucket = 'ads';

    // Ensure bucket exists
    try {
      const { data: buckets } = await (supabaseAdmin as any).storage.listBuckets?.() || { data: [] };
      const exists = Array.isArray(buckets) && buckets.some((b: any) => b.name === bucket);
      if (!exists && (supabaseAdmin as any).storage.createBucket) {
        await (supabaseAdmin as any).storage.createBucket(bucket, { 
          public: true,
          allowedMimeTypes: ['image/gif', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
        });
      }
    } catch (bucketError: any) {
      console.error('Bucket creation/check error:', bucketError);
      // Continue anyway, bucket might already exist
    }

    // Upload file
    const timestamp = Date.now();
    const safeName = (file.name || 'ad').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const ext = file.name.split('.').pop() || 'gif';
    const path = `login/${safeName}-${timestamp}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 400 });
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error: any) {
    console.error('Ad upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

