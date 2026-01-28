import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create a regular Supabase client (not admin) to test login
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        error_code: error.status,
        details: error
      }, { status: 400 });
    }

    // Sign out immediately after testing
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Login test successful',
      data: {
        user_id: data.user?.id,
        email: data.user?.email
      }
    });

  } catch (error: any) {
    console.error('Test login error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

