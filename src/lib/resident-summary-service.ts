import { supabase } from './supabase';

export interface ResidentSummary {
  resident: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  walletBalance: number;
  totalEarned: number;
  totalUsed: number;
  kilograms: number;
  co2Saved: number;
  points: number;
  recyclerTier: string;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  material_type?: string;
  kgs?: number;
  status: string;
}

export async function getResidentSummary(residentId: string): Promise<ResidentSummary> {
  // Load profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role')
    .eq('id', residentId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to load resident profile: ${profileError.message}`);
  }
  if (!profile) {
    throw new Error('Resident not found');
  }

  // Load wallet (support user_wallets then fallback to wallets)
  let walletBalance = 0;
  let points = 0;
  let recyclerTier = 'bronze';

  const { data: userWallet, error: userWalletError } = await supabase
    .from('user_wallets')
    .select('current_points, total_points_earned, tier')
    .eq('user_id', residentId)
    .maybeSingle();

  if (userWallet && !userWalletError) {
    walletBalance = Number(userWallet.current_points || 0);
    points = Number(userWallet.total_points_earned ?? userWallet.current_points ?? 0);
    recyclerTier = userWallet.tier || recyclerTier;
  } else {
    const { data: legacyWallet, error: legacyWalletError } = await supabase
      .from('wallets')
      .select('balance, total_points, tier')
      .eq('user_id', residentId)
      .maybeSingle();
    if (legacyWalletError) {
      // Continue; wallet might not exist yet
    }
    if (legacyWallet) {
      walletBalance = Number(legacyWallet.balance || 0);
      points = Number(legacyWallet.total_points ?? legacyWallet.balance ?? 0);
      recyclerTier = legacyWallet.tier || recyclerTier;
    }
  }

  // Load transactions (points-based; 1 point = R1 display)
  const { data: txRows, error: txError } = await supabase
    .from('transactions')
    .select('id, created_at, description, points, amount, transaction_type, status')
    .eq('user_id', residentId)
    .order('created_at', { ascending: false });

  if (txError) {
    throw new Error(`Failed to load transactions: ${txError.message}`);
  }

  const transactions: Transaction[] = (txRows || []).map((t: any) => {
    const numericPoints = Number(t.points ?? 0);
    const numericAmount = Number(t.amount ?? numericPoints);
    const isCredit = (t.transaction_type ? String(t.transaction_type).toLowerCase() === 'credit' : numericPoints >= 0 || numericAmount >= 0);
    return {
      id: t.id,
      type: isCredit ? 'credit' : 'debit',
      amount: Math.abs(numericAmount),
      description: t.description || (isCredit ? 'Credit' : 'Debit'),
      date: t.created_at,
      status: t.status || 'completed'
    };
  });

  const totalEarned = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalUsed = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Load approved pickups and items to compute kilograms and impact
  const { data: pickups, error: pickupsError } = await supabase
    .from('pickups')
    .select('id, status')
    .eq('customer_id', residentId)
    .in('status', ['approved', 'completed']);
  if (pickupsError) {
    throw new Error(`Failed to load pickups: ${pickupsError.message}`);
  }

  const pickupIds = (pickups || []).map(p => p.id);
  let kilograms = 0;
  if (pickupIds.length > 0) {
    const { data: pickupItems, error: itemsError } = await supabase
      .from('pickup_items')
      .select('kilograms')
      .in('pickup_id', pickupIds);
    if (!itemsError) {
      kilograms = (pickupItems || []).reduce((sum: number, i: any) => sum + Number(i.kilograms || 0), 0);
    }
  }

  // Simple CO2 estimate (1kg recycled ≈ 1kg CO2 saved as display proxy)
  const co2Saved = kilograms;

  return {
    resident: {
      id: profile.id,
      name: profile.full_name || 'Unknown',
      email: profile.email,
      phone: profile.phone || ''
    },
    walletBalance,
    totalEarned,
    totalUsed,
    kilograms,
    co2Saved,
    points,
    recyclerTier,
    transactions
  };
}

export interface ApprovedCollectionListItem {
  id: string;
  user_id: string;
  resident_name: string;
  resident_email: string;
  material_type: string;
  kgs: number;
  amount: number;
  rate_per_kg: number | null;
  status: string;
  date: string;
}

export async function getAllApprovedCollections(): Promise<ApprovedCollectionListItem[]> {
  // Fetch approved/completed pickups
  const { data: pickups, error: pickupsError } = await supabase
    .from('pickups')
    .select('id, customer_id, status, submitted_at, started_at')
    .in('status', ['approved', 'completed']);
  if (pickupsError) {
    throw new Error(`Failed to load approved pickups: ${pickupsError.message}`);
  }

  const pickupIds = (pickups || []).map(p => p.id);
  const userIds = Array.from(new Set((pickups || []).map(p => p.customer_id))).filter(Boolean) as string[];

  // Fetch pickup items
  const { data: items } = pickupIds.length > 0 ? await supabase
    .from('pickup_items')
    .select('id, pickup_id, material_id, kilograms, rate_per_kg')
    .in('pickup_id', pickupIds) : { data: [] as any[] } as any;

  // Fetch materials
  const materialIds = Array.from(new Set((items || []).map((i: any) => i.material_id))).filter(Boolean) as string[];
  const { data: materials } = materialIds.length > 0 ? await supabase
    .from('materials')
    .select('id, name, rate_per_kg')
    .in('id', materialIds) : { data: [] as any[] } as any;
  const materialById: Map<string, any> = new Map((materials || []).map((m: any) => [m.id, m]));

  // Fetch users
  const { data: profiles } = userIds.length > 0 ? await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds) : { data: [] as any[] } as any;
  const profileById: Map<string, any> = new Map((profiles || []).map((u: any) => [u.id, u]));

  // Build list items by mapping each pickup item
  const approvedById = new Map((pickups || []).map(p => [p.id, p]));
  const itemsList: ApprovedCollectionListItem[] = (items || []).map((it: any) => {
    const pickup = approvedById.get(it.pickup_id);
    const user = pickup ? profileById.get(pickup.customer_id) : undefined;
    const material: any = it.material_id ? materialById.get(it.material_id) : undefined;
    const rate = Number(it.rate_per_kg ?? material?.rate_per_kg ?? 0) || null;
    const kgs = Number(it.kilograms || 0);
    const amount = rate != null ? kgs * rate : 0;
    return {
      id: it.id,
      user_id: pickup?.customer_id || '',
      resident_name: user?.full_name || 'Unknown',
      resident_email: user?.email || '',
      material_type: material?.name || 'Unknown',
      kgs,
      amount,
      rate_per_kg: rate,
      status: pickup?.status || 'approved',
      date: pickup?.submitted_at || pickup?.started_at || new Date().toISOString()
    };
  });

  return itemsList;
}
