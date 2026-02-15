import { getSupabaseClient, getSupabaseAdminClient } from './supabase';
import { realtimeManager } from './realtimeManager';
import { 
  Profile, 
  Pickup, 
  Payment, 
  Material
} from './supabase';

// Custom interface for transformed pickup data with nested properties
export interface TransformedPickup extends Pickup {
  customer?: {
    full_name: string;
    email: string;
    phone?: string;
  } | null;
  collector?: {
    full_name: string;
    email: string;
    phone?: string;
  } | null;
  address?: {
    line1: string;
    suburb: string;
    city: string;
    postal_code: string;
  } | null;
  // Calculated totals from pickup_items
  total_kg: number;
  total_value: number;
}

// Real-time subscription types
export type RealtimeCallback<T> = (payload: { new: T; old: T; eventType: string }) => void;

// Recent Activity interface
export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

// ============================================================================
// TEST CONNECTION
// ============================================================================

export async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...');
  console.log('🔗 URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('🔑 Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not Set');
  
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error);
      return { success: false, error };
    }
    
    console.log('✅ Connection test successful');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Connection test exception:', error);
    return { success: false, error };
  }
}

// ============================================================================
// USERS MANAGEMENT
// ============================================================================

export async function getUsers(): Promise<Profile[]> {
  console.log('🔍 Fetching users from unified users table...');
  
  try {
    const supabase = getSupabaseClient();
    // Fetch all users in pages to bypass the 1000-row default cap
    const pageSize = 1000;
    let page = 0;
    let allRows: any[] = [];

    while (true) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          full_name,
          phone,
          role_id,
          status,
          created_at,
          updated_at,
          roles!role_id(name)
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('❌ Error fetching users:', error);
        throw error;
      }

      const rows = data || [];
      allRows = allRows.concat(rows);

      if (rows.length < pageSize) break; // last page
      page += 1;

      // safety guard to prevent accidental infinite loop
      if (page > 200) {
        console.warn('⚠️ Aborting users pagination after 200k rows for safety');
        break;
      }
    }

    console.log('✅ Users fetched successfully:', allRows.length, 'users found');
    if (allRows.length > 0) {
      console.log('📋 Sample user data:', allRows[0]);
    }
    
    // Transform unified users data to Profile format for compatibility
    const profiles = allRows.map(user => {
      let resolvedRole = (user as any).role || (user.roles as any)?.name || user.role_id || 'member'
      const emailLower = String(user.email || '').toLowerCase()
      if (emailLower === 'superadmin@wozamali.co.za') {
        resolvedRole = 'super_admin'
      }
      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Name',
        phone: user.phone,
        role: resolvedRole,
        is_active: user.status === 'active',
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    }) || [];
    
    return profiles;
  } catch (error) {
    console.error('❌ Exception in getUsers:', error);
    throw error;
  }
}

export function subscribeToUsers(callback: RealtimeCallback<Profile>) {
  const supabase = getSupabaseClient();
  realtimeManager.subscribe('users_changes', (channel) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload: any) => {
      callback({ new: payload.new as Profile, old: payload.old as Profile, eventType: payload.eventType });
    })
  })
  return () => realtimeManager.unsubscribe('users_changes')
}

export async function updateUserRole(userId: string, role: string, isActive: boolean) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role, is_active: isActive })
    .eq('id', userId);

  if (error) throw error;
}

export async function deleteUser(userId: string) {
  console.log(`🗑️ Deleting user ${userId}...`);
  
  try {
    const supabase = getSupabaseClient();
    // First, get the user to check if they have any collections
    const { data: userCollections, error: collectionsError } = await supabase
      .from('unified_collections')
      .select('id')
      .or(`customer_id.eq.${userId},collector_id.eq.${userId}`)
      .limit(1);

    if (collectionsError) {
      console.error('❌ Error checking user collections:', collectionsError);
      throw collectionsError;
    }

    if (userCollections && userCollections.length > 0) {
      throw new Error('Cannot delete user with existing collections. Please reassign or delete collections first.');
    }

    // Delete user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('❌ Error deleting user profile:', profileError);
      throw profileError;
    }

    console.log('✅ User deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Exception in deleteUser:', error);
    throw error;
  }
}

export async function getUserDetails(userId: string) {
  console.log(`🔍 Fetching user details for ${userId}...`);
  
  try {
    const supabase = getSupabaseClient();
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
      throw profileError;
    }

    // Get user's collections
    const { data: collections, error: collectionsError } = await supabase
      .from('unified_collections')
      .select('id, collection_code, status, total_weight_kg, total_value, created_at')
      .or(`customer_id.eq.${userId},collector_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (collectionsError) {
      console.error('❌ Error fetching user collections:', collectionsError);
      // Don't throw, just continue without collections
    }

    // Get user's wallet data with fallback to legacy wallets
    let wallet: any = null;
    let walletResp = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (walletResp.error && (walletResp.error.code === 'PGRST205' || walletResp.error.message?.includes("Could not find the table 'public.user_wallets'"))) {
      console.warn('⚠️ user_wallets not found, falling back to wallets');
      walletResp = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    }
    if (walletResp.error) {
      console.error('❌ Error fetching user wallet:', walletResp.error);
      // Don't throw, just continue without wallet
    } else {
      wallet = walletResp.data;
    }

    console.log('✅ User details fetched successfully');
    return {
      profile,
      collections: collections || [],
      wallet: wallet || null
    };
  } catch (error) {
    console.error('❌ Exception in getUserDetails:', error);
    throw error;
  }
}

export async function updateUserProfile(userId: string, updateData: {
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
}) {
  console.log(`✏️ Updating user profile for ${userId}...`);
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }

    console.log('✅ User profile updated successfully');
    return data;
  } catch (error) {
    console.error('❌ Exception in updateUserProfile:', error);
    throw error;
  }
}

/**
 * Bulk update user names in the users table
 * @param names Array of full names to assign to users
 * @param options Options for name assignment
 * @returns Result with count of updated users
 */
export async function bulkUpdateUserNames(
  names: string[],
  options: {
    randomize?: boolean; // If true, randomly assign names; if false, assign sequentially
    skipAdmins?: boolean; // If true, skip admin/super_admin users
    onlyResidents?: boolean; // If true, only update users with 'resident' role
  } = {}
): Promise<{ success: boolean; updated: number; error?: string }> {
  console.log(`🔄 Bulk updating user names with ${names.length} names...`);
  const supabase = getSupabaseClient();
  
  try {
    // Fetch all users
    const users = await getUsers();
    
    if (users.length === 0) {
      return { success: false, updated: 0, error: 'No users found' };
    }
    
    // Filter users based on options
    let usersToUpdate = users;
    
    if (options.skipAdmins) {
      usersToUpdate = usersToUpdate.filter(
        user => !['admin', 'super_admin', 'superadmin'].includes(user.role?.toLowerCase() || '')
      );
    }
    
    if (options.onlyResidents) {
      usersToUpdate = usersToUpdate.filter(
        user => user.role?.toLowerCase() === 'resident'
      );
    }
    
    if (usersToUpdate.length === 0) {
      return { success: false, updated: 0, error: 'No users match the filter criteria' };
    }
    
    // Prepare names array (repeat if needed)
    const namePool = options.randomize 
      ? [...names].sort(() => Math.random() - 0.5) // Shuffle for random assignment
      : names;
    
    // Extend name pool if we have more users than names
    const extendedNames: string[] = [];
    while (extendedNames.length < usersToUpdate.length) {
      extendedNames.push(...namePool);
    }
    const finalNames = extendedNames.slice(0, usersToUpdate.length);
    
    // Update users in batches
    const batchSize = 50;
    let updatedCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < usersToUpdate.length; i += batchSize) {
      const batch = usersToUpdate.slice(i, i + batchSize);
      const updates = batch.map((user, idx) => {
        const fullName = finalNames[i + idx];
        // Parse name into first_name and last_name
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        return {
          id: user.id,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString()
        };
      });
      
      // Update each user
      for (const update of updates) {
        try {
          const { error } = await supabase
            .from('users')
            .update({
              full_name: update.full_name,
              first_name: update.first_name,
              last_name: update.last_name,
              updated_at: update.updated_at
            })
            .eq('id', update.id);
          
          if (error) {
            errors.push(`User ${update.id}: ${error.message}`);
          } else {
            updatedCount++;
          }
        } catch (err: any) {
          errors.push(`User ${update.id}: ${err.message}`);
        }
      }
    }
    
    if (errors.length > 0) {
      console.warn(`⚠️ Some updates failed:`, errors);
    }
    
    console.log(`✅ Bulk update complete: ${updatedCount} users updated`);
    return {
      success: updatedCount > 0,
      updated: updatedCount,
      error: errors.length > 0 ? `${errors.length} errors occurred` : undefined
    };
  } catch (error: any) {
    console.error('❌ Exception in bulkUpdateUserNames:', error);
    return { success: false, updated: 0, error: error.message };
  }
}

/**
 * Get users created within a date range
 * @param startDate Start date (inclusive)
 * @param endDate End date (inclusive, defaults to end of today)
 * @returns Array of users created in the date range
 */
export async function getUsersByDateRange(
  startDate: Date,
  endDate?: Date
): Promise<Profile[]> {
  console.log(`🔍 Fetching users created between ${startDate.toISOString()} and ${endDate?.toISOString() || 'now'}...`);
  
  try {
    const end = endDate || new Date();
    // Set to end of day
    end.setHours(23, 59, 59, 999);
    
    // Set start to beginning of day
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        full_name,
        phone,
        role_id,
        status,
        created_at,
        updated_at,
        roles!role_id(name)
      `)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users by date range:', error);
      throw error;
    }

    // Transform to Profile format
    const profiles = (data || []).map(user => {
      let resolvedRole = (user as any).role || (user.roles as any)?.name || user.role_id || 'member';
      const emailLower = String(user.email || '').toLowerCase();
      if (emailLower === 'superadmin@wozamali.co.za') {
        resolvedRole = 'super_admin';
      }
      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Name',
        phone: user.phone,
        role: resolvedRole,
        is_active: user.status === 'active',
        created_at: user.created_at,
        updated_at: user.updated_at
      };
    });

    console.log(`✅ Found ${profiles.length} users in date range`);
    return profiles;
  } catch (error) {
    console.error('❌ Exception in getUsersByDateRange:', error);
    throw error;
  }
}

/**
 * Bulk delete users by date range
 * @param startDate Start date (inclusive)
 * @param endDate End date (inclusive, defaults to end of today)
 * @param options Options for deletion
 * @returns Result with count of deleted users
 */
export async function bulkDeleteUsersByDateRange(
  startDate: Date,
  endDate?: Date,
  options: {
    skipAdmins?: boolean; // If true, skip admin/super_admin users
    forceDeleteWithCollections?: boolean; // If true, delete even if user has collections (dangerous!)
  } = {}
): Promise<{ success: boolean; deleted: number; errors: string[] }> {
  console.log(`🗑️ Bulk deleting users created between ${startDate.toISOString()} and ${endDate?.toISOString() || 'now'}...`);
  
  try {
    // Get users in date range
    const users = await getUsersByDateRange(startDate, endDate);
    
    if (users.length === 0) {
      return { success: true, deleted: 0, errors: [] };
    }
    
    // Filter users based on options
    let usersToDelete = users;
    
    if (options.skipAdmins) {
      usersToDelete = usersToDelete.filter(
        user => !['admin', 'super_admin', 'superadmin'].includes(user.role?.toLowerCase() || '')
      );
    }
    
    if (usersToDelete.length === 0) {
      return { success: true, deleted: 0, errors: [] };
    }
    
    let deletedCount = 0;
    const errors: string[] = [];
    
    // Delete users one by one
    for (const user of usersToDelete) {
      try {
        // Check for collections unless force delete is enabled
        if (!options.forceDeleteWithCollections) {
          const { data: userCollections, error: collectionsError } = await supabase
            .from('unified_collections')
            .select('id')
            .or(`customer_id.eq.${user.id},collector_id.eq.${user.id}`)
            .limit(1);
          
          if (collectionsError) {
            errors.push(`${user.email}: Error checking collections - ${collectionsError.message}`);
            continue;
          }
          
          if (userCollections && userCollections.length > 0) {
            errors.push(`${user.email}: Cannot delete - user has ${userCollections.length} collection(s)`);
            continue;
          }
        }
        
        // Delete from users table
        const supabase = getSupabaseClient();
        const supabaseAdmin = getSupabaseAdminClient();
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id);
        
        if (deleteError) {
          errors.push(`${user.email}: ${deleteError.message}`);
          continue;
        }
        
        // Try to delete from auth (may fail if user doesn't exist in auth)
        try {
          if (supabaseAdmin) {
            await supabaseAdmin.auth.admin.deleteUser(user.id);
          }
        } catch (authError: any) {
          // Ignore auth errors - user might not exist in auth
          console.log(`ℹ️ Could not delete from auth for ${user.email}: ${authError.message}`);
        }
        
        deletedCount++;
      } catch (err: any) {
        errors.push(`${user.email}: ${err.message}`);
      }
    }
    
    console.log(`✅ Bulk delete complete: ${deletedCount} users deleted, ${errors.length} errors`);
    return {
      success: deletedCount > 0 || errors.length === 0,
      deleted: deletedCount,
      errors
    };
  } catch (error: any) {
    console.error('❌ Exception in bulkDeleteUsersByDateRange:', error);
    return { success: false, deleted: 0, errors: [error.message] };
  }
}

/**
 * Generate email address from name and surname with variety
 * Formats: firstname.surname, firstnamesurname, firstname.surname12, f.surname, etc.
 */
function generateEmail(firstName: string, surname: string, index?: number): string {
  const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const last = surname.toLowerCase().replace(/[^a-z]/g, '');
  const firstInitial = first.charAt(0);
  
  // Use index to determine format variety (cycles through different formats)
  const formatType = index !== undefined ? (index % 6) : Math.floor(Math.random() * 6);
  
  let email = '';
  
  switch (formatType) {
    case 0:
      // Format: firstname.surname@gmail.com
      email = `${first}.${last}`;
      break;
    case 1:
      // Format: firstnamesurname@gmail.com (no dot)
      email = `${first}${last}`;
      break;
    case 2:
      // Format: firstname.surname12@gmail.com (with 1-2 digit number)
      const num1 = (index !== undefined ? index : Math.floor(Math.random() * 100)) % 99 + 1;
      email = `${first}.${last}${num1}`;
      break;
    case 3:
      // Format: firstname12surname@gmail.com (number in middle)
      const num2 = (index !== undefined ? index : Math.floor(Math.random() * 100)) % 99 + 1;
      email = `${first}${num2}${last}`;
      break;
    case 4:
      // Format: f.surname@gmail.com (initial and surname)
      email = `${firstInitial}.${last}`;
      break;
    case 5:
      // Format: firstname.s@gmail.com (firstname and initial)
      email = `${first}.${last.charAt(0)}`;
      break;
    default:
      email = `${first}.${last}`;
  }
  
  return `${email}@gmail.com`;
}

/**
 * Generate South African phone number
 */
function generatePhoneNumber(index: number): string {
  // Generate a unique phone number based on index
  // South African mobile format: +27 followed by 9 digits
  // Valid mobile prefixes: 060, 061, 062, 063, 071, 072, 073, 074, 076, 079, 081, 082, 083, 084
  // We'll use 060-079 range for simplicity
  const prefix = 60 + (index % 20); // 60-79
  const suffix = String(1000000 + (index * 12345) % 9000000).padStart(7, '0'); // 7 digits
  return `+27${prefix}${suffix}`;
}

/**
 * Generate Dobsonville address with real street names
 */
function generateDobsonvilleAddress(index: number): {
  street_addr: string;
  subdivision: string;
  city: string;
  postal_code: string;
} {
  // Dobsonville extensions
  const extensions = ['Dobsonville', 'Dobsonville Ext 1', 'Dobsonville Ext 2'];
  const extension = extensions[index % extensions.length];
  
  // Real street names in Dobsonville (from actual street directories)
  const streets = [
    // Main Dobsonville streets
    'Molefe Street', 'Botsi Street', 'Dzana Street', 'Gwele Street',
    'Hashe Street', 'Jabulani Street', 'Khosa Street', 'Ledwaba Street',
    'Lubazi Street', 'Main Road', 'Majova Street', 'Mayikane Street',
    'Mogorosi Street', 'Mogosi Link', 'Mokhesi Street', 'Mokhudi Street',
    'Molebatsi Street', 'Moloto Street', 'Mongeyela Link', 'Msikana Street',
    'Nomwa Street', 'Ntlailane Street', 'Sibinga Street', 'Tyilo Street',
    'Williams Street',
    // Dobsonville Gardens streets
    'Acacia Street', 'Azalia Avenue', 'Carnation Street', 'Cosmos Street',
    'Dahlia Street', 'Daisy Street', 'Dascia Street', 'Erica Street',
    'Felicia Street', 'Hibiscus Street', 'Mfolozi Street', 'Phaphamani Crescent',
    'Poppy Street', 'Rose Place', 'Strelitia Link', 'Strelitia Street',
    'Violet Street', 'Wattle Street'
  ];
  
  const street = streets[index % streets.length];
  // Realistic house numbers: 1-800 (typical range for township addresses)
  // Use index to distribute numbers across the range
  const houseNumber = ((index * 7) % 800) + 1; // Distribute numbers across range
  
  return {
    street_addr: `${houseNumber} ${street}`,
    subdivision: extension,
    city: 'Soweto',
    postal_code: '1863' // Dobsonville postal code
  };
}

/**
 * Bulk create users from names and surnames
 * Automatically generates email, phone, and Dobsonville addresses
 */
export async function bulkCreateUsersFromNames(
  names: Array<{ firstName: string; surname: string }>,
  options: {
    role?: string; // Default: 'resident'
    emailDomain?: string; // Default: 'wozamali.com'
    startPhoneIndex?: number; // For phone number generation
  } = {}
): Promise<{ success: boolean; created: number; errors: Array<{ name: string; error: string }> }> {
  console.log(`🔄 Bulk creating ${names.length} users from names...`);
  
  const role = options.role || 'resident';
  const emailDomain = options.emailDomain || 'wozamali.com';
  const startPhoneIndex = options.startPhoneIndex || 0;
  
  let createdCount = 0;
  const errors: Array<{ name: string; error: string }> = [];
  
  const supabase = getSupabaseClient();
  // Get role ID
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', role)
    .single();
  
  if (roleError || !roleData) {
    return {
      success: false,
      created: 0,
      errors: [{ name: 'System', error: `Role '${role}' not found` }]
    };
  }
  
  // Track used emails to avoid duplicates
  const usedEmails = new Set<string>();
  
  for (let i = 0; i < names.length; i++) {
    const { firstName, surname } = names[i];
    const fullName = `${firstName} ${surname}`;
    
    try {
      // Generate email with variety (using index for format selection)
      // If duplicate, increment index to try different format
      let email = generateEmail(firstName, surname, i);
      let emailIndex = i;
      while (usedEmails.has(email)) {
        emailIndex++;
        email = generateEmail(firstName, surname, emailIndex);
      }
      usedEmails.add(email);
      
      // Generate phone number
      const phone = generatePhoneNumber(startPhoneIndex + i);
      
      // Generate address
      const address = generateDobsonvilleAddress(i);
      
      // Create user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          first_name: firstName,
          last_name: surname,
          full_name: fullName,
          email: email,
          phone: phone,
          role_id: roleData.id,
          subdivision: address.subdivision,
          street_addr: address.street_addr,
          city: address.city,
          postal_code: address.postal_code,
          status: 'active'
        })
        .select()
        .single();
      
      if (userError) {
        errors.push({ name: fullName, error: userError.message });
        continue;
      }
      
      createdCount++;
      console.log(`✅ Created user ${i + 1}/${names.length}: ${fullName} (${email})`);
    } catch (err: any) {
      errors.push({ name: fullName, error: err.message || 'Unknown error' });
    }
  }
  
  console.log(`✅ Bulk create complete: ${createdCount} users created, ${errors.length} errors`);
  return {
    success: createdCount > 0,
    created: createdCount,
    errors
  };
}

export async function createUser(userData: {
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
}) {
  console.log(`➕ Creating new user: ${userData.email}...`);
  
  try {
    const supabase = getSupabaseClient();
    const supabaseAdmin = getSupabaseAdminClient();
    // First, create the user in Supabase Auth
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: 'TempPassword123!', // Temporary password that user will need to change
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: userData.full_name,
        phone: userData.phone || '',
        role: userData.role
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user in authentication system');
    }

    // Then create the profile record
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: userData.full_name,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.role,
        is_active: userData.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating user profile:', profileError);
      // Try to clean up the auth user if profile creation failed
      if (supabaseAdmin) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      }
      throw profileError;
    }

    // Create a wallet for the user
    try {
      await supabase
        .from('user_wallets')
        .insert({
          user_id: authData.user.id,
          current_points: 0,
          total_points_earned: 0,
          total_points_spent: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (walletError) {
      console.warn('⚠️ Warning: Could not create wallet for user:', walletError);
      // Don't fail the user creation if wallet creation fails
    }

    console.log('✅ User created successfully:', profileData);
    return profileData;
  } catch (error) {
    console.error('❌ Exception in createUser:', error);
    throw error;
  }
}

// ============================================================================
// PICKUPS MANAGEMENT (SIMPLIFIED)
// ============================================================================

// Simple cache to prevent duplicate calls within 1 second (reduced for debugging)
let pickupsCache: { data: TransformedPickup[] | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_DURATION = 1000; // 1 second (reduced for debugging)

// Function to clear the cache manually
export function clearPickupsCache() {
  pickupsCache = { data: null, timestamp: 0 };
  console.log('🗑️ Pickups cache cleared');
}

export async function getPickups(): Promise<TransformedPickup[]> {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (pickupsCache.data && (now - pickupsCache.timestamp) < CACHE_DURATION) {
    console.log('📋 Using cached pickups data');
    return pickupsCache.data;
  }
  
  console.log('🔍 Fetching pickups from unified_collections...');
  
  try {
    // Unified-only source
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('unified_collections')
      .select('id, customer_id, pickup_address_id, total_weight_kg, computed_value, total_value, status, created_at, updated_at, customer_name, customer_email, collector_name, pickup_address')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('❌ Error fetching unified_collections:', error);
      pickupsCache = { data: [], timestamp: Date.now() };
      return [];
    }

    const rows = (data || []) as any[];
    if (rows.length === 0) {
      console.log('📭 No pickup data found');
      pickupsCache = { data: [], timestamp: Date.now() };
      return [];
    }

    // Transform unified rows to TransformedPickup
    const transformedPickups: TransformedPickup[] = rows.map((c: any) => {
      const totalKg = Number(c.total_weight_kg || 0);
      // Prefer computed_value when present; fallback to total_value
      const totalValue = Number((c.computed_value ?? c.total_value) || 0);

      return {
        // Base
        ...c,
        id: c.id,
        user_id: c.customer_id,
        address_id: c.pickup_address_id || null,
        total_kg: totalKg,
        total_value: totalValue,
        status: c.status || 'pending',
        created_at: c.created_at,
        updated_at: c.updated_at,
        // Nested display fields
        customer: {
          full_name: c.customer_name || 'Unknown Customer',
          email: c.customer_email || '',
          phone: c.customer_phone || ''
        },
        collector: {
          full_name: c.collector_name || 'Unassigned',
          email: c.collector_email || '',
          phone: c.collector_phone || ''
        },
        address: {
          line1: c.pickup_address || 'No address',
          suburb: c.suburb || '',
          city: c.city || '',
          postal_code: c.postal_code || ''
        },
        pickup_items: []
      } as TransformedPickup;
    });

    console.log('✅ Pickups transformed (unified) successfully:', transformedPickups.length);
    // Cache the result
    pickupsCache = { data: transformedPickups, timestamp: Date.now() };
    return transformedPickups;
  } catch (error) {
    console.error('❌ Exception in getPickups:', error);
    // Return empty array instead of throwing to prevent page crash
    pickupsCache = { data: [], timestamp: Date.now() };
    return [];
  }
}

export function subscribeToPickups(callback: RealtimeCallback<any>) {
  // Single channel listening to all potential sources
  const supabase = getSupabaseClient();
  return supabase
    .channel('pickups_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pickups' }, (payload) => {
      pickupsCache = { data: null, timestamp: 0 };
      callback({ new: payload.new as any, old: payload.old as any, eventType: payload.eventType });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'unified_collections' }, (payload) => {
      pickupsCache = { data: null, timestamp: 0 };
      callback({ new: payload.new as any, old: payload.old as any, eventType: payload.eventType });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, (payload) => {
      pickupsCache = { data: null, timestamp: 0 };
      callback({ new: payload.new as any, old: payload.old as any, eventType: payload.eventType });
    })
    .subscribe();
}

export async function updatePickupStatus(pickupId: string, status: string, approvalNote?: string) {
  console.log(`🔄 Updating collection ${pickupId} status to: ${status}`);

  try {
    const supabase = getSupabaseClient();
    // Prefer unified_collections; fallback to collections
    let isUnified = true;
    let existsResp = await supabase
      .from('unified_collections')
      .select('id')
      .eq('id', pickupId)
      .maybeSingle();

    if (existsResp.error || !existsResp.data) {
      isUnified = false;
      existsResp = await supabase
        .from('collections')
        .select('id')
      .eq('id', pickupId)
        .maybeSingle();
      if (existsResp.error || !existsResp.data) {
        console.error('❌ Collection not found in unified_collections or collections');
        throw existsResp.error || new Error('Collection not found');
      }
    }

    // For approved/rejected, use RPC to ensure wallet/points are posted atomically
    if (status === 'approved' || status === 'rejected') {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user?.id) throw authErr || new Error('Not authenticated');

      if (status === 'approved') {
        const { error: rpcErr } = await supabase.rpc('approve_collection', {
          p_collection_id: pickupId,
          p_approver_id: authData.user.id,
          p_note: approvalNote ?? null,
          p_idempotency_key: null
        });
        if (rpcErr) throw rpcErr;

        // Best-effort: automatically process PET Bottles contribution for this approved collection
        try {
          await fetch('/api/green-scholar/pet-bottles-contribution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collectionId: pickupId })
          });
        } catch (e) {
          console.warn('⚠️ PET processing skipped:', e);
        }
      } else {
        const { error: rpcErr } = await supabase.rpc('reject_collection', {
          p_collection_id: pickupId,
          p_approver_id: authData.user.id,
          p_note: approvalNote ?? null
        });
        if (rpcErr) throw rpcErr;
      }

      // Return updated row
      const postResp = isUnified
        ? await supabase.from('unified_collections').select('*').eq('id', pickupId).maybeSingle()
        : await supabase.from('collections').select('*').eq('id', pickupId).maybeSingle();
      if (postResp.error) throw postResp.error;
      console.log('✅ Collection status updated via RPC:', postResp.data?.status);
      return postResp.data;
    }

    // For other statuses, direct update on the appropriate table
    const updateResp = isUnified
      ? await supabase
          .from('unified_collections')
          .update({ status, admin_notes: approvalNote, updated_at: new Date().toISOString() })
          .eq('id', pickupId)
          .select()
          .maybeSingle()
      : await supabase
          .from('collections')
          .update({ status, admin_notes: approvalNote, updated_at: new Date().toISOString() })
          .eq('id', pickupId)
          .select()
          .maybeSingle();

    if (updateResp.error) throw updateResp.error;
    console.log('✅ Collection status updated:', updateResp.data?.status);
    return updateResp.data;
  } catch (error) {
    console.error('❌ Exception in updatePickupStatus:', error);
    throw error;
  }
}

// Helper function to update customer wallet after approval using unified system
async function updateCustomerWallet(customerId: string, totalValue: number, totalWeight: number) {
  console.log(`💰 Updating unified wallet for customer ${customerId} with value: ${totalValue}`);
  
  try {
    // Calculate points (1 point = 1kg, as requested)
    const totalPoints = Math.floor(totalWeight); // 1 point per kg

    // Use the simple wallet update function
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('update_wallet_simple', {
      p_user_id: customerId,
      p_amount: totalValue,
      p_transaction_type: 'collection_approval',
      p_weight_kg: totalWeight,
      p_description: `Collection approved - ${totalWeight}kg recycled`,
      p_reference_id: null // Will be set by the calling function
    });

    if (error) {
      console.error('❌ Error updating unified wallet:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log(`✅ Unified wallet updated successfully: +${totalPoints} points, +C${totalValue} credits`);
    return data;
  } catch (error) {
    console.error('❌ Exception in updateCustomerWallet:', error);
    // Don't throw here, collection approval should still succeed
    return false;
  }
}

// ============================================================================
// PAYMENTS & WITHDRAWALS
// ============================================================================

export async function getPayments(): Promise<Payment[]> {
  console.log('🔍 Fetching payments from Supabase...');
  
  try {
    const supabase = getSupabaseClient();
    // Fetch payments; if payments table missing, return empty to avoid crashing dashboard
    const paymentsResp = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (paymentsResp.error) {
      const err = paymentsResp.error as any;
      if (err.code === 'PGRST205' || err.message?.includes("Could not find the table 'public.payments'")) {
        console.debug('payments not found; returning empty payments list');
        return [];
      }
      console.error('❌ Error fetching payments:', err);
      return [];
    }

    const paymentsData = paymentsResp.data || [];

    // Fetch pickup details separately (note: pickups don't have total_kg/total_value columns)
    const pickupIds = Array.from(new Set(paymentsData?.map(p => p.pickup_id).filter(Boolean) || []));
    // Try to fetch pickups for mapping; tolerate missing pickups table
    let pickups: any[] = [];
    if (pickupIds.length > 0) {
      const pickupsResp = await supabase
      .from('pickups')
      .select('id, customer_id')
        .in('id', pickupIds);
      if (pickupsResp.error) {
        const pErr = pickupsResp.error as any;
        if (pErr.code === 'PGRST205' || pErr.message?.includes("Could not find the table 'public.pickups'")) {
          console.debug('pickups not found while resolving payments; skipping pickup join');
          pickups = [];
        } else {
          console.error('❌ Error fetching pickups for payments:', pErr);
          pickups = [];
        }
      } else {
        pickups = pickupsResp.data || [];
      }
    }

    // Fetch customer profiles for the pickups (using customer_id)
    const customerIds = Array.from(new Set(pickups?.map(p => p.customer_id).filter(Boolean) || []));
    const supabaseForProfiles = getSupabaseClient();
    const { data: customerProfiles } = customerIds.length > 0 ? await supabaseForProfiles
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', customerIds) : { data: [] };

    // Transform the data
    const transformedPayments = (paymentsData || []).map(payment => {
      const pickup = pickups?.find(p => p.id === payment.pickup_id);
      const customer = customerProfiles?.find(p => p.id === pickup?.customer_id);

      return {
        ...payment,
        pickup: pickup ? {
          customer: customer ? {
            full_name: customer.full_name || 'Unknown',
            email: customer.email,
            phone: customer.phone
          } : null,
          // Note: total_kg and total_value are calculated from pickup_items, not stored in pickups table
          total_kg: 0, // This would need to be calculated separately if needed
          total_value: 0 // This would need to be calculated separately if needed
        } : null
      };
    });

    console.log('✅ Payments fetched successfully:', transformedPayments.length, 'payments found');
    return transformedPayments;
  } catch (error) {
    console.error('❌ Exception in getPayments:', error);
    throw error;
  }
}

export function subscribeToPayments(callback: RealtimeCallback<Payment>) {
  const supabase = getSupabaseClient();
  return supabase
    .channel('payments_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => {
      callback({ new: payload.new as Payment, old: payload.old as Payment, eventType: payload.eventType });
    })
    .subscribe();
}

export async function updatePaymentStatus(paymentId: string, status: string, adminNotes?: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('payments')
    .update({ 
      status, 
      admin_notes: adminNotes,
      processed_at: status === 'approved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId);

  if (error) throw error;
}

// ============================================================================
// WITHDRAWALS MANAGEMENT (USING withdrawal_requests)
// ============================================================================

export type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  payout_method?: 'wallet' | 'cash' | 'bank_transfer' | 'mobile_money';
  owner_name?: string;
  bank_name?: string;
  account_number?: string;
  account_type?: string;
  branch_code?: string;
  processed_by?: string;
  processed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  user?: { full_name?: string; email?: string } | null;
};

export async function getWithdrawals(status?: string): Promise<Withdrawal[]> {
  try {
    console.log('🔍 getWithdrawals called with status:', status);
    
    // Use API route that has access to service role key
    const params = new URLSearchParams();
    if (status && status !== 'all') {
      params.append('status', status);
    }
    
    const response = await fetch(`/api/admin/withdrawals?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 API response:', data);
    
    return data.withdrawals || [];
  } catch (e) {
    console.error('❌ Error fetching withdrawals:', e);
    return [];
  }
}

// Fallback: derive displayable withdrawals from unified_collections when withdrawal_requests is empty or blocked by RLS
export async function getWithdrawalsFallbackFromCollections(params?: { collectionId?: string; customerEmail?: string; limit?: number }): Promise<Withdrawal[]> {
  try {
    const supabase = getSupabaseClient();
    const collectionSelect = 'id, customer_id, customer_email, computed_value, total_value, status, created_at, updated_at';
    let q = supabase
      .from('unified_collections')
      .select(collectionSelect)
      .in('status', ['approved','completed'])
      .order('updated_at', { ascending: false });

    if (params?.collectionId) {
      q = q.eq('id', params.collectionId);
    }
    if (params?.customerEmail) {
      q = q.eq('customer_email', params.customerEmail);
    }
    if (params?.limit && params.limit > 0) {
      q = q.limit(params.limit);
    }

    const { data, error } = await q;
    if (error) {
      console.log('getWithdrawalsFallbackFromCollections: unified_collections error (ignored):', error.message);
      return [];
    }
    const rows = (data || []) as any[];
    if (rows.length === 0) return [];

    // Fetch user names by customer_id (user_profiles) and by email (users) for display
    const profileIds = Array.from(new Set(rows.map(r => r.customer_id).filter(Boolean)));
    const emails = Array.from(new Set(rows.map(r => String(r.customer_email || '').toLowerCase()).filter(Boolean)));
    const supabaseForUsers = getSupabaseClient();
    const { data: profiles } = profileIds.length > 0 ? await supabaseForUsers
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', profileIds) : { data: [] } as any;
    const { data: usersByEmail } = emails.length > 0 ? await supabaseForUsers
      .from('users')
      .select('email, full_name')
      .in('email', emails) : { data: [] } as any;

    const byProfile: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { byProfile[String(p.id)] = p; });
    const byEmail: Record<string, any> = {};
    (usersByEmail || []).forEach((u: any) => { byEmail[String((u.email||'').toLowerCase())] = u; });

    const fallback: Withdrawal[] = rows.map(r => {
      const amount = Number((r.computed_value ?? r.total_value) || 0) || 0;
      const userBlock = byProfile[String(r.customer_id)] || byEmail[String((r.customer_email||'').toLowerCase())] || null;
      return {
        id: r.id,
        user_id: r.customer_id || '',
        amount,
        status: r.status || 'approved',
        created_at: r.created_at,
        updated_at: r.updated_at,
        processed_at: r.updated_at,
        notes: null,
        user: userBlock ? { full_name: userBlock.full_name, email: userBlock.email } : { full_name: undefined, email: r.customer_email }
      } as Withdrawal;
    });

    return fallback;
  } catch (e) {
    console.error('❌ Error in getWithdrawalsFallbackFromCollections:', e);
    return [];
  }
}

export function subscribeToWithdrawals(callback: RealtimeCallback<any>) {
  // Use regular client for real-time subscriptions
  // Note: This may not work if RLS blocks the subscription, but we'll try
  const supabase = getSupabaseClient();
  return supabase
    .channel('withdrawal_requests_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, (payload) => {
      callback({ new: payload.new as any, old: payload.old as any, eventType: payload.eventType });
    })
    .subscribe();
}

export async function updateWithdrawalStatusOffice(
  withdrawalId: string,
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled',
  adminNotes?: string,
  payoutMethod?: 'wallet' | 'cash' | 'bank_transfer' | 'mobile_money'
): Promise<void> {
  try {
    console.log('🔍 Updating withdrawal status via API:', { withdrawalId, status, adminNotes, payoutMethod });

    const response = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        adminNotes,
        payoutMethod
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Withdrawal status updated successfully:', result);

    if (result.warning) {
      console.warn('⚠️ Warning:', result.warning);
    }

  } catch (error) {
    console.error('❌ Error updating withdrawal status:', error);
    throw error;
  }
}

// Assign collector to a unified collection (Office action)
export async function assignCollectorToCollection(collectionId: string, collectorId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('collections')
      .update({ collector_id: collectorId, updated_at: new Date().toISOString() })
      .eq('id', collectionId)
      .select('id')
      .single();
    if (error) {
      console.error('❌ Error assigning collector:', error);
      return false;
    }
    return !!data;
  } catch (e) {
    console.error('❌ Exception in assignCollectorToCollection:', e);
    return false;
  }
}

// ============================================================================
// MATERIALS & PRICING
// ============================================================================

export async function getMaterials(): Promise<Material[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export function subscribeToMaterials(callback: RealtimeCallback<Material>) {
  const supabase = getSupabaseClient();
  return supabase
    .channel('materials_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, (payload) => {
      callback({ new: payload.new as Material, old: payload.old as Material, eventType: payload.eventType });
    })
    .subscribe();
}

export async function updateMaterialPricing(materialId: string, ratePerKg: number) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('materials')
    .update({ rate_per_kg: ratePerKg })
    .eq('id', materialId);

  if (error) throw error;
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

export async function getRecentActivity(limit: number = 20) {
  console.log('🔍 Fetching recent activity...');
  
  try {
    const supabase = getSupabaseClient();
    const activities: any[] = [];

    // Get recent collections from unified schema
    console.log('🔍 Fetching recent collections...');
    const { data: recentCollections, error: collectionsError } = await supabase
      .from('unified_collections')
      .select('id, status, created_at, updated_at, customer_id, collection_code, customer_name')
      .order('created_at', { ascending: false })
      .limit(10);

    if (collectionsError) {
      console.error('❌ Error fetching recent collections:', collectionsError);
      console.error('❌ Error details:', {
        message: collectionsError.message,
        details: collectionsError.details,
        hint: collectionsError.hint,
        code: collectionsError.code
      });
      // Don't throw error, just log and continue with empty array
      console.log('⚠️ Continuing with empty collections array due to error');
    } else if (recentCollections) {
      console.log('✅ Recent collections fetched:', recentCollections.length, 'collections found');
      
      // Process collections - customer names are already denormalized in unified_collections
      recentCollections.forEach(collection => {
        const customerName = collection.customer_name || 'Customer';
        const collectionCode = collection.collection_code || collection.id;
        
        if (collection.status === 'pending' || collection.status === 'submitted') {
          activities.push({
            id: collection.id,
            type: 'collection_created',
            title: 'New Collection Submitted',
            description: `${customerName} - Collection ${collectionCode} submitted`,
            timestamp: collection.created_at,
            metadata: { collection_id: collection.id, collection_code: collectionCode, customer_name: customerName }
          });
        } else if (collection.status === 'approved') {
          activities.push({
            id: collection.id,
            type: 'collection_approved',
            title: 'Collection Approved',
            description: `${customerName} - Collection ${collectionCode} approved`,
            timestamp: collection.updated_at || collection.created_at,
            metadata: { collection_id: collection.id, collection_code: collectionCode, customer_name: customerName }
          });
        } else if (collection.status === 'rejected') {
          activities.push({
            id: collection.id,
            type: 'collection_rejected',
            title: 'Collection Rejected',
            description: `${customerName} - Collection ${collectionCode} rejected`,
            timestamp: collection.updated_at || collection.created_at,
            metadata: { collection_id: collection.id, collection_code: collectionCode, customer_name: customerName }
          });
        } else if (collection.status === 'completed') {
          activities.push({
            id: collection.id,
            type: 'collection_completed',
            title: 'Collection Completed',
            description: `${customerName} - Collection ${collectionCode} completed`,
            timestamp: collection.updated_at || collection.created_at,
            metadata: { collection_id: collection.id, collection_code: collectionCode, customer_name: customerName }
          });
        }
      });
    }

    // Get recent user registrations from unified schema
    const { data: recentUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching recent users:', usersError);
      console.error('❌ Users error details:', {
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint,
        code: usersError.code
      });
    } else if (recentUsers) {
      recentUsers.forEach(user => {
        activities.push({
          id: user.id,
          type: 'user_registered',
          title: 'New User Registered',
          description: `${user.full_name || 'User'} (${user.role})`,
          timestamp: user.created_at,
          metadata: { user_id: user.id, user_name: user.full_name, role: user.role }
        });
      });
    }

    // Sort all activities by timestamp and take the most recent ones
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    console.log('✅ Recent activity fetched successfully:', sortedActivities.length, 'activities found');
    return sortedActivities;
    
  } catch (error) {
    console.error('❌ Exception in getRecentActivity:', error);
    throw error;
  }
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

export function subscribeToAllChanges(callbacks: {
  users?: RealtimeCallback<Profile>;
  pickups?: RealtimeCallback<Pickup>;
  payments?: RealtimeCallback<Payment>;
  materials?: RealtimeCallback<Material>;
}) {
  const cleanups: Array<() => void> = [];

  if (callbacks.users) {
    const sub: any = subscribeToUsers(callbacks.users);
    cleanups.push(typeof sub === 'function' ? sub : () => sub?.unsubscribe?.());
  }
  if (callbacks.pickups) {
    const sub: any = subscribeToPickups(callbacks.pickups);
    cleanups.push(typeof sub === 'function' ? sub : () => sub?.unsubscribe?.());
  }
  if (callbacks.payments) {
    const sub: any = subscribeToPayments(callbacks.payments);
    cleanups.push(typeof sub === 'function' ? sub : () => sub?.unsubscribe?.());
  }
  if (callbacks.materials) {
    const sub: any = subscribeToMaterials(callbacks.materials);
    cleanups.push(typeof sub === 'function' ? sub : () => sub?.unsubscribe?.());
  }

  return cleanups;
}

// ============================================================================
// WALLET MANAGEMENT
// ============================================================================

let walletTablesMissing = false;

export async function getWalletData() {
  console.log('🔍 Fetching wallet data from Supabase...');
  
  try {
    // Short-circuit if we already detected missing wallet tables
    if (walletTablesMissing) {
      return {
        wallets: [],
        source: 'user_wallets',
        totalWallets: 0,
        totalCashBalance: 0,
        totalCurrentPoints: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0,
        totalLifetimeEarnings: 0,
        totalWeight: 0,
        totalCollections: 0
      };
    }

    // First try unified table `user_wallets`
    const supabase = getSupabaseClient();
    let source: 'user_wallets' | 'wallets' = 'user_wallets';
    let walletsResp = await supabase
      .from('user_wallets')
      .select('*')
      .order('current_points', { ascending: false });

    // If missing table (404/PGRST205), fall back to legacy `wallets`
    if (walletsResp.error && (walletsResp.error.code === 'PGRST205' || walletsResp.error.message?.includes("Could not find the table 'public.user_wallets'"))) {
      console.debug('user_wallets not found, falling back to wallets');
      source = 'wallets';
      walletsResp = await supabase
        .from('wallets')
        .select('*')
        .order('balance', { ascending: false });
    }

    if (walletsResp.error) {
      const err = walletsResp.error as any;
      if (err.code === 'PGRST205' || err.message?.includes("Could not find the table 'public.")) {
        console.debug('wallet tables not found; returning zeroed wallet totals');
        walletTablesMissing = true;
      } else {
        console.debug('wallet fetch warning:', err);
      }
      // Return safe empty totals so the dashboard still loads (no console error)
      return {
        wallets: [],
        source,
        totalWallets: 0,
        totalCashBalance: 0,
        totalCurrentPoints: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0,
        totalLifetimeEarnings: 0,
        totalWeight: 0,
        totalCollections: 0
      };
    }

    const wallets = walletsResp.data || [];

    console.log(`✅ Wallet data fetched from ${source}:`, wallets.length, 'wallets found');
    if (wallets.length > 0) console.log('📋 Sample wallet data:', wallets[0]);
    
    // Calculate totals supporting both schemas
    const totalWallets = wallets.length;
    const totalCurrentPoints = wallets.reduce((sum: number, w: any) => sum + (w.current_points ?? w.balance ?? 0), 0);
    const totalPointsEarned = wallets.reduce((sum: number, w: any) => sum + (w.total_points_earned ?? w.total_points ?? 0), 0);
    const totalPointsSpent = wallets.reduce((sum: number, w: any) => sum + (w.total_points_spent ?? 0), 0);

    // Convert points to cash equivalent (1 point = R1)
    const totalCashBalance = totalCurrentPoints;
    const totalLifetimeEarnings = totalPointsEarned;

    return {
      wallets,
      source,
      totalWallets,
      totalCashBalance,
      totalCurrentPoints,
      totalPointsEarned,
      totalPointsSpent,
      totalLifetimeEarnings,
      totalWeight: 0,
      totalCollections: 0
    };
  } catch (error: any) {
    console.error('❌ Exception in getWalletData:', error);
    
    // Check if it's a permission error
    if (error?.code === '42501' || error?.message?.includes('permission denied')) {
      console.warn('⚠️ Permission denied for user_wallets table. Admin may need wallet permissions.');
      console.warn('💡 Run FIX_WALLET_PERMISSIONS.sql to grant admin access to wallet data.');
    }
    
    // Return empty data instead of throwing to prevent dashboard crash
    return {
      wallets: [],
      totalWallets: 0,
      totalCashBalance: 0,
      totalCurrentPoints: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0,
      totalLifetimeEarnings: 0,
      totalWeight: 0,
      totalCollections: 0,
      permissionError: true,
      errorMessage: error?.message || 'Unknown error'
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatCurrency(amount: number): string {
  return `C ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${kg.toFixed(1)}kg`;
}

// ============================================================================
// ANALYTICS FUNCTIONS (FIXED FOR ACTUAL SCHEMA)
// ============================================================================

export async function getSystemImpact() {
  console.log('🔍 Fetching system impact data (unified schema first)...');

  try {
    const supabase = getSupabaseClient();
    // Prefer unified_collections → fallback to collections → legacy pickups
    const revenueStatuses = new Set(['approved', 'completed']);

    // Try unified_collections (minimal, safe columns)
    const collectionsResp = await supabase
      .from('unified_collections')
      .select('id, status, customer_id, collector_id, total_weight_kg, total_value, created_at, updated_at');

    let source: 'unified_collections' | 'pickups' = 'unified_collections';

    if (collectionsResp.error) {
      console.debug('unified_collections not available, falling back to legacy pickups');
      source = 'pickups';
      const { data: pickups, error: pickupsError } = await supabase
        .from('pickups')
        .select('id, customer_id, status, created_at');
      if (pickupsError) throw pickupsError;

      const totalPickups = pickups?.length || 0;
      const pendingPickups = pickups?.filter(p => (p as any).status === 'pending' || (p as any).status === 'submitted').length || 0;

      // Skip item/value computation in legacy fallback to avoid 400s on missing tables
      const totalKg = 0;
      const totalValue = 0;
      const uniqueCustomers = new Set((pickups || []).map(p => (p as any).customer_id).filter(Boolean)).size;

      const totalCO2Saved = totalKg * 2.5;
      const totalWaterSaved = totalKg * 100;
      const totalLandfillSaved = totalKg;
      const totalTreesEquivalent = totalKg * 0.1;

      return {
        total_pickups: totalPickups,
        pending_pickups: pendingPickups,
        total_kg_collected: totalKg,
        total_value_generated: totalValue,
        unique_customers: uniqueCustomers,
        unique_collectors: 0,
        total_co2_saved: totalCO2Saved,
        total_water_saved: totalWaterSaved,
        total_landfill_saved: totalLandfillSaved,
        total_trees_equivalent: totalTreesEquivalent
      };
    }

    const rows = (collectionsResp.data as any[]) || [];
    const totalPickups = rows.length;
    const pendingPickups = rows.filter(r => r.status === 'pending' || r.status === 'submitted').length;
    const totalKg = rows.reduce((s, r) => s + (Number(r.total_weight_kg) || 0), 0);
    // Prefer total_value; derive from items if absent
    let totalValue = rows.reduce((s, r) => s + (Number(r.total_value) || 0), 0);
    if (!totalValue) {
      const ids = rows.map(r => r.id);
      const { data: items } = await supabase
        .from('collection_materials')
        .select('collection_id, quantity, unit_price')
        .in('collection_id', ids);
      totalValue = (items || []).reduce((s, it: any) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
    }
    const uniqueCustomers = new Set(rows.map(r => r.customer_id).filter(Boolean)).size;
    const uniqueCollectors = new Set(rows.map(r => r.collector_id).filter(Boolean)).size;

    const totalCO2Saved = totalKg * 2.5;
    const totalWaterSaved = totalKg * 100;
    const totalLandfillSaved = totalKg;
    const totalTreesEquivalent = totalKg * 0.1;

    console.log('✅ System impact data fetched successfully');
    return {
      total_pickups: totalPickups,
      pending_pickups: pendingPickups,
      total_kg_collected: totalKg,
      total_value_generated: totalValue,
      unique_customers: uniqueCustomers,
      unique_collectors: uniqueCollectors,
      total_co2_saved: totalCO2Saved,
      total_water_saved: totalWaterSaved,
      total_landfill_saved: totalLandfillSaved,
      total_trees_equivalent: totalTreesEquivalent
    };
  } catch (error) {
    console.error('❌ Exception in getSystemImpact:', error);
    throw error;
  }
}

export async function getMaterialPerformance() {
  console.log('🔍 Fetching material performance data (unified schema)...');

  try {
    const supabase = getSupabaseClient();
    // Fetch collection items and their parent collections' status
    const { data: items, error: itemsError } = await supabase
      .from('collection_materials')
      .select('collection_id, material_id, quantity, unit_price');
    if (itemsError) {
      // Fallback to legacy pickup_items
      console.debug('collection_materials not available, falling back to pickup_items');
      const { data: legacyItems, error: legacyErr } = await supabase
        .from('pickup_items')
        .select('pickup_id, material_id, kilograms');
      if (legacyErr) throw legacyErr;
      const { data: pickups, error: pErr } = await supabase
        .from('pickups')
        .select('id, status');
      if (pErr) throw pErr;
      const approvedPickupIds = new Set((pickups || []).filter((p: any) => p.status === 'approved').map((p: any) => p.id));
      const { data: mats } = await supabase.from('materials').select('id, name, category, current_rate, rate_per_kg');
      const idToMat = new Map((mats || []).map((m: any) => [String(m.id), m]));
      const stats: any = {};
      (legacyItems || []).forEach((it: any) => {
        if (!approvedPickupIds.has(it.pickup_id)) return;
        const m = idToMat.get(String(it.material_id)) || {};
        const key = String(m.name || 'Unknown Material');
        if (!stats[key]) {
          stats[key] = {
            material_name: key,
            category: m.category || 'Unknown',
            pickup_count: 0,
            total_kg_collected: 0,
            total_value_generated: 0,
            avg_kg_per_pickup: 0,
            rate_per_kg: Number(m.current_rate ?? m.rate_per_kg ?? it.rate_per_kg ?? 0) || 0
          };
        }
        stats[key].pickup_count += 1;
        stats[key].total_kg_collected += Number(it.kilograms) || 0;
        const rate = Number(stats[key].rate_per_kg) || 0;
        stats[key].total_value_generated += (Number(it.kilograms) || 0) * rate;
        stats[key].avg_kg_per_pickup = stats[key].total_kg_collected / stats[key].pickup_count;
      });
      return Object.values(stats).sort((a: any, b: any) => b.total_kg_collected - a.total_kg_collected);
    }

    const collectionIds = Array.from(new Set((items || []).map((it: any) => it.collection_id).filter(Boolean)));
    let { data: collections, error: collErr } = await supabase
      .from('unified_collections')
      .select('id, status');
    if (collErr) {
      console.debug('unified_collections not available, using collections');
      const resp = await supabase.from('collections').select('id, status');
      collErr = resp.error as any;
      collections = resp.data as any[];
    }
    if (collErr) throw collErr;
    const approvedSet = new Set((collections || []).filter((c: any) => c.status === 'approved' || c.status === 'completed').map((c: any) => c.id));

    const { data: mats } = await supabase.from('materials').select('id, name, category, current_rate, rate_per_kg');
    const idToMat = new Map((mats || []).map((m: any) => [String(m.id), m]));

    const stats: any = {};
    (items || []).forEach((it: any) => {
      if (!approvedSet.has(it.collection_id)) return;
      const m = idToMat.get(String(it.material_id)) || {};
      const key = String(m.name || 'Unknown Material');
      if (!stats[key]) {
        const rate = Number(m.current_rate ?? m.rate_per_kg ?? it.unit_price ?? 0) || 0;
        stats[key] = {
          material_name: key,
          category: m.category || 'Unknown',
          pickup_count: 0,
          total_kg_collected: 0,
          total_value_generated: 0,
          avg_kg_per_pickup: 0,
          rate_per_kg: rate
        };
      }
      stats[key].pickup_count += 1;
      const qty = Number(it.quantity) || 0;
      const unitPrice = Number(it.unit_price ?? stats[key].rate_per_kg) || 0;
      stats[key].total_kg_collected += qty;
      stats[key].total_value_generated += qty * unitPrice;
      stats[key].avg_kg_per_pickup = stats[key].total_kg_collected / stats[key].pickup_count;
    });

    const performanceData = Object.values(stats).sort((a: any, b: any) => b.total_kg_collected - a.total_kg_collected);
    console.log('✅ Material performance data fetched successfully');
    return performanceData;
  } catch (error) {
    console.error('❌ Exception in getMaterialPerformance:', error);
    throw error;
  }
}

// ============================================================================
// COLLECTION DELETION (DEEP WIPE FOR TESTING)
// ============================================================================

export async function deleteCollectionDeep(collectionId: string): Promise<boolean> {
  console.log('🗑️ Deleting collection and related records via server route:', collectionId);
  
  if (!collectionId || typeof collectionId !== 'string') {
    console.error('❌ Invalid collectionId provided:', collectionId);
    return false;
  }
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.warn('⚠️ Delete request timed out after 15 seconds');
      controller.abort();
    }, 15000); // 15s timeout
    
    console.log('🔄 Making API request to /api/admin/delete-collection...');
    const res = await fetch('/api/admin/delete-collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    console.log('📡 API response received:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
    });
    
    if (!res.ok) {
      const msg = await res.json().catch(() => ({}));
      console.error('❌ Delete API failed:', {
        status: res.status,
        statusText: res.statusText,
        response: msg
      });
      return false;
    }
    
    const responseData = await res.json().catch(() => ({}));
    console.log('✅ Delete API succeeded:', responseData);
    return true;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('❌ Delete request was aborted (timeout)');
    } else {
      console.error('❌ Exception in deleteCollectionDeep:', error);
    }
    return false;
  }
}

export async function getCollectorPerformance() {
  console.log('🔍 Fetching collector performance data (unified schema)...');

  try {
    const supabase = getSupabaseClient();
    // Prefer unified_collections; fallback to collections; legacy has no collectors
    let { data: rows, error } = await supabase
      .from('unified_collections')
      .select('id, collector_id, status, total_weight_kg, total_value, created_at, updated_at');
    if (error) {
      console.debug('unified_collections not available, trying collections');
      const resp = await supabase
        .from('collections')
        .select('id, collector_id, status, weight_kg, total_weight_kg, total_value, created_at, updated_at');
      error = resp.error as any;
      rows = resp.data as any[];
    }
    if (error) {
      console.debug('collections not available; returning empty collectors performance');
      return [];
    }

    const revenueStatuses = new Set(['approved', 'completed']);
    const filtered = (rows || []).filter((r: any) => revenueStatuses.has(r.status));
    const collectorIds = Array.from(new Set(filtered.map((r: any) => r.collector_id).filter(Boolean)));
    const { data: users } = collectorIds.length > 0
      ? await supabase.from('users').select('id, full_name, email, phone').in('id', collectorIds)
      : { data: [] as any[] } as any;
    const idToUser = new Map((users || []).map((u: any) => [String(u.id), u]));

    // If value not present, compute from items
    const byId = new Map<string, any[]>();
    filtered.forEach((r: any) => {
      if (!byId.has(r.id)) byId.set(r.id, []);
    });
    const ids = filtered.map((r: any) => r.id);
    const { data: items } = ids.length > 0
      ? await supabase.from('collection_materials').select('collection_id, quantity, unit_price').in('collection_id', ids)
      : { data: [] as any[] } as any;
    const itemsByCollection = new Map<string, any[]>();
    (items || []).forEach((it: any) => {
      if (!itemsByCollection.has(it.collection_id)) itemsByCollection.set(it.collection_id, []);
      itemsByCollection.get(it.collection_id)!.push(it);
    });

    const stats = new Map<string, any>();
    filtered.forEach((r: any) => {
      const cid = String(r.collector_id || '');
      if (!cid) return;
      if (!stats.has(cid)) {
        stats.set(cid, {
          collector_id: cid,
          collector_name: (idToUser.get(cid) as any)?.full_name || 'Unassigned',
          collector_email: (idToUser.get(cid) as any)?.email || '',
          total_pickups: 0,
          total_kg_collected: 0,
          total_value_generated: 0,
          total_co2_saved: 0,
          last_activity: r.updated_at || r.created_at
        });
      }
      const s = stats.get(cid)!;
      s.total_pickups += 1;
      const kg = Number(r.total_weight_kg) || 0;
      s.total_kg_collected += kg;
      const itemsFor = itemsByCollection.get(r.id) || [];
      const computedFromItems = itemsFor.reduce((sum, it: any) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
      const value = Number(r.total_value) || computedFromItems;
      s.total_value_generated += value;
      s.total_co2_saved += kg * 2.5;
      const last = new Date(s.last_activity).getTime();
      const curr = new Date(r.updated_at || r.created_at).getTime();
      if (curr > last) s.last_activity = r.updated_at || r.created_at;
    });

    return Array.from(stats.values()).sort((a, b) => b.total_value_generated - a.total_value_generated);
  } catch (error) {
    console.error('❌ Exception in getCollectorPerformance:', error);
    throw error;
  }
}

export async function getCustomerPerformance() {
  console.log('🔍 Fetching customer performance data (unified schema)...');

  try {
    const supabase = getSupabaseClient();
    // Prefer unified_collections; fallback to collections; legacy last
    const revenueStatuses = new Set(['approved', 'completed']);
    let { data: rows, error } = await supabase
      .from('unified_collections')
      .select('id, customer_id, status, total_weight_kg, total_value, created_at');
    if (error) {
      console.debug('unified_collections not available, trying collections');
      const resp = await supabase
        .from('collections')
        .select('id, user_id, status, total_weight_kg, total_value, created_at');
      error = resp.error as any;
      rows = resp.data as any[];
    }

    if (!error && rows && rows.length > 0) {
      const filtered = (rows || []).filter((r: any) => revenueStatuses.has(r.status));
      const ids = filtered.map((r: any) => r.id);
      const custIds = Array.from(new Set(filtered.map((r: any) => (('customer_id' in r) ? r.customer_id : r.user_id)).filter(Boolean)));

      const { data: items } = ids.length > 0
        ? await supabase.from('collection_materials').select('collection_id, quantity, unit_price').in('collection_id', ids)
        : { data: [] as any[] } as any;
      const itemsByCollection = new Map<string, any[]>();
      (items || []).forEach((it: any) => {
        if (!itemsByCollection.has(it.collection_id)) itemsByCollection.set(it.collection_id, []);
        itemsByCollection.get(it.collection_id)!.push(it);
      });

      // Fetch users for names/emails
      const { data: users } = custIds.length > 0
        ? await supabase.from('users').select('id, full_name, email').in('id', custIds)
        : { data: [] as any[] } as any;
      const idToUser = new Map((users || []).map((u: any) => [String(u.id), u]));
      // Fallback to legacy profiles if any unresolved
      const resolved = new Set((users || []).map((u: any) => String(u.id)));
      const unresolved = custIds.filter(id => !resolved.has(String(id)));
      const { data: legacyProfiles } = unresolved.length > 0
        ? await supabase.from('profiles').select('id, full_name, email').in('id', unresolved)
        : { data: [] as any[] } as any;
      const idToLegacy = new Map((legacyProfiles || []).map((p: any) => [String(p.id), p]));

      // Wallets
      const { data: wallets1, error: wErr1 } = custIds.length > 0
        ? await supabase.from('user_wallets').select('user_id, current_points').in('user_id', custIds)
        : { data: [] as any[], error: null } as any;
      let wallets = wallets1 || [];
      if (wErr1 || !wallets1) {
        const { data: w2 } = custIds.length > 0
          ? await supabase.from('wallets').select('user_id, balance').in('user_id', custIds)
          : { data: [] as any[] } as any;
        wallets = (w2 || []).map((w: any) => ({ user_id: w.user_id, current_points: w.balance }));
      }

      const stats: any = {};
      filtered.forEach((r: any) => {
        const customerId = String(('customer_id' in r) ? r.customer_id : r.user_id || '');
        if (!customerId) return;
        if (!stats[customerId]) {
          const u = idToUser.get(customerId) || idToLegacy.get(customerId) || {};
          const wallet = (wallets || []).find((w: any) => String(w.user_id) === customerId);
          stats[customerId] = {
            customer_id: customerId,
            customer_name: (u as any).full_name || 'Unknown Resident',
            customer_email: (u as any).email || '',
            total_pickups: 0,
            total_kg_recycled: 0,
            total_value_earned: 0,
            total_wallet_balance: Number(wallet?.current_points) || 0,
            last_activity: r.created_at
          };
        }
        const s = stats[customerId];
        s.total_pickups += 1;
        const kg = Number(r.total_weight_kg ?? r.total_weight_kg) || 0;
        s.total_kg_recycled += kg;
        const itemsFor = itemsByCollection.get(r.id) || [];
        const computedFromItems = itemsFor.reduce((sum, it: any) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
        const value = Number(r.total_value) || computedFromItems;
        s.total_value_earned += value;
        s.last_activity = r.created_at;
      });

      return Object.values(stats).sort((a: any, b: any) => b.total_value_earned - a.total_value_earned);
    }

    // Legacy fallback
    console.debug('Falling back to legacy pickups for customer performance');
    const { data: pickups, error: pErr } = await supabase
      .from('pickups')
      .select('id, customer_id, status, created_at')
      .eq('status', 'approved');
    if (pErr) throw pErr;
    const { data: pickupItems } = await supabase.from('pickup_items').select('pickup_id, kilograms, material_id');
    const ids = Array.from(new Set((pickups || []).map((p: any) => p.customer_id).filter(Boolean)));
    const { data: profiles } = ids.length > 0 ? await supabase.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] as any[] } as any;
    const idToProfile = new Map((profiles || []).map((p: any) => [String(p.id), p]));

    const stats: any = {};
    (pickups || []).forEach((p: any) => {
      const customerId = String(p.customer_id || '');
      if (!customerId) return;
      if (!stats[customerId]) {
        const prof = idToProfile.get(customerId) || {};
        stats[customerId] = {
          customer_id: customerId,
          customer_name: (prof as any).full_name || 'Unknown Resident',
          customer_email: (prof as any).email || '',
          total_pickups: 0,
          total_kg_recycled: 0,
          total_value_earned: 0,
          total_wallet_balance: 0,
          last_activity: p.created_at
        };
      }
      const s = stats[customerId];
      s.total_pickups += 1;
      const itemsFor = (pickupItems || []).filter((it: any) => it.pickup_id === p.id);
      const kg = itemsFor.reduce((sum, it: any) => sum + (Number(it.kilograms) || 0), 0);
      const value = itemsFor.reduce((sum, it: any) => sum + (Number(it.kilograms) || 0) * (Number(it.rate_per_kg) || 0), 0);
      s.total_kg_recycled += kg;
      s.total_value_earned += value;
    });

    return Object.values(stats).sort((a: any, b: any) => b.total_value_earned - a.total_value_earned);
  } catch (error) {
    console.error('❌ Exception in getCustomerPerformance:', error);
    throw error;
  }
}