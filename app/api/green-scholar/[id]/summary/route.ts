import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

// GET /api/green-scholar/:id/summary
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		if (!supabaseUrl || !supabaseAnonKey) {
			return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
		}

		const supabase = createClient(supabaseUrl, supabaseAnonKey)
		const { id: scholarId } = await params

		// Resolve scholar basic profile from unified users
		const { data: userRow } = await supabase
			.from('users')
			.select('id, full_name, email')
			.eq('id', scholarId)
			.maybeSingle()

		// School/grade via optional scholars registry (write model), ignore if missing
		let school: string | null = null
		let grade: string | null = null
		{
			const { data } = await supabase
				.from('scholars')
				.select('school, grade')
				.eq('id', scholarId)
				.maybeSingle()
			if (data) { school = (data as any)?.school ?? null; grade = (data as any)?.grade ?? null }
		}

		// Totals: use unified sources
		// totalRecycledKg from unified_collections for this user (approved/completed)
		let totalRecycledKg = 0
		{
			const { data } = await supabase
				.from('unified_collections')
				.select('total_weight_kg, status, customer_id')
				.eq('customer_id', scholarId)
			if (Array.isArray(data)) {
				totalRecycledKg = data
					.filter(r => ['approved','completed'].includes(String((r as any).status)))
					.reduce((s, r: any) => s + Number(r.total_weight_kg || 0), 0)
			}
		}

		// points from unified wallet_transactions
		let points = 0
		{
			const { data } = await supabase
				.from('wallet_transactions')
				.select('points')
				.eq('user_id', scholarId)
			if (Array.isArray(data)) {
				points = data.reduce((s, r: any) => s + Number(r.points || 0), 0)
			}
		}

		// Funds received from unified green_scholar_transactions (distributions to this scholar)
		let fundsReceived = 0
		{
			const { data } = await supabase
				.from('green_scholar_transactions')
				.select('amount, transaction_type, beneficiary_id')
				.eq('beneficiary_id', scholarId)
				.in('transaction_type', ['distribution','expense'])
			if (Array.isArray(data)) {
				fundsReceived = data.reduce((s, r: any) => s + Number(r.amount || 0), 0)
			}
		}

		// Tier: simple derivation from points
		const tier = points >= 5000 ? 'Gold' : points >= 2500 ? 'Silver' : points >= 1000 ? 'Bronze' : 'Starter'

		return NextResponse.json({
			scholarId,
			name: userRow?.full_name || 'Unknown',
			school: school || '—',
			grade: grade || '—',
			totalRecycledKg,
			points,
			fundsReceived,
			tier
		})
	} catch (error: any) {
		return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
	}
}


