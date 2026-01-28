import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Cache for 20 seconds
export const revalidate = 20;

export async function GET(request: NextRequest) {
   try {
     if (!supabaseAdmin) {
       return NextResponse.json(
         {
           users: [],
           count: 0,
           error: 'Supabase admin client is not configured on the server',
         },
         { status: 200 }
       );
     }

     // Parse pagination parameters
     const { searchParams } = new URL(request.url);
     const page = parseInt(searchParams.get('page') || '1');
     const limit = parseInt(searchParams.get('limit') || '50');
     const offset = (page - 1) * limit;

     // Query users using admin client (bypasses RLS) - OPTIMIZED
     // Fetch all users in pages to bypass Supabase's 1000-row default limit
     const pageSize = 1000;
     let fetchPage = 0;
     let allUsers: any[] = [];
     let hasError = false;
     let errorMessage = null;

     while (true) {
       const from = fetchPage * pageSize;
       const to = from + pageSize - 1;

      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select(`
            id,
            email,
            full_name,
            first_name,
            last_name,
            phone,
            status,
            role,
            role_id,
            street_addr,
             suburb,
             subdivision,
             city,
             postal_code,
            date_of_birth,
            area_id,
            created_at,
            updated_at
          `)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) {
          hasError = true;
          errorMessage = error.message;
          break;
        }

        const rows = data || [];
        allUsers = allUsers.concat(rows);

        // If we got fewer rows than pageSize, we've reached the end
        if (rows.length < pageSize) {
          break;
        }

        fetchPage += 1;

        // Safety guard to prevent infinite loop
        if (fetchPage > 200) {
          console.warn('⚠️ Aborting users pagination after 200k rows for safety');
          break;
        }
      } catch (fetchErr: any) {
        hasError = true;
        errorMessage = fetchErr.message || 'Query error';
        break;
      }
    }

    if (hasError && allUsers.length === 0) {
      return NextResponse.json({
        users: [],
        count: 0,
        error: errorMessage
      }, { status: 200 });
    }

    // Apply pagination to the fetched users
    const totalUsers = allUsers.length;
    const paginatedUsers = allUsers.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalUsers / limit);

    // Get user roles for the paginated users
    const userIds = Array.from(new Set((paginatedUsers || []).map((u: any) => u.id).filter(Boolean)));
    let roles: any[] = [];

    if (userIds.length > 0) {
      try {
        // Fetch roles in batches if needed (Supabase has a limit of ~1000 items per query)
        const batchSize = 1000;
        const rolePromises = [];
        for (let i = 0; i < userIds.length; i += batchSize) {
          const batch = userIds.slice(i, i + batchSize);
          rolePromises.push(
            supabaseAdmin
              .from('user_roles')
              .select('user_id, role_id, role:roles(name)')
              .in('user_id', batch)
          );
        }
        const roleResults = await Promise.allSettled(rolePromises);
        roles = roleResults
          .filter((r: any) => r.status === 'fulfilled' && !r.value.error)
          .flatMap((r: any) => r.value.data || []);
      } catch (rolesErr) {
        // Silently fail - roles are optional
      }
    }

    // Enrich paginated users with role information
    const enrichedUsers = (paginatedUsers || []).map((user: any) => {
      const userRole = roles.find((r: any) => r.user_id === user.id);
      return {
        ...user,
        role: userRole?.role || { name: user.role || 'resident' },
        is_active: user.status === 'active'
      };
    });

    // Debug logging
    console.log(`📊 Users API: Page ${page}/${totalPages}, returning ${enrichedUsers.length} of ${totalUsers} users`);
    if (enrichedUsers.length > 0) {
      console.log('📋 Sample users:', enrichedUsers.slice(0, 3).map((u: any) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status
      })));
    }

    return NextResponse.json({
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages: totalPages
      },
      count: enrichedUsers.length
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        users: [],
        count: 0,
        error: error?.message || 'Internal server error'
      },
      { status: 200 }
    );
  }
}

