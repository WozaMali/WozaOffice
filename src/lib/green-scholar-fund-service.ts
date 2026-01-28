import { supabase } from './supabase'

export type Scholar = {
	id: string
	name: string
	school?: string | null
	grade?: string | null
	region?: string | null
}

export type Disbursement = {
	id: string
	scholar_id: string
	scholar_name?: string
	amount: number
	date: string
	purpose: string
}

export type FundOverview = {
	totalPetRevenue: number
	totalCashDonations: number
	totalDisbursed: number
	remainingBalance: number
}

export type ImpactMetrics = {
	totalKg: number
	co2SavedKg: number
	points: number
	nextTierProgressPct: number
}

export class GreenScholarFundService {
	static async getFundOverview(): Promise<FundOverview> {
		// Prefer unified read-only sources
		// 1) Try green_scholar_fund_balance (unified)
		const { data: balance } = await supabase
			.from('green_scholar_fund_balance')
			.select('*')
			.order('last_updated', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (balance) {
			const pet = Number(balance.pet_donations_total || balance.total_contributions || 0)
			const donations = Number(balance.direct_donations_total || 0)
			const disbursed = Number(balance.expenses_total || balance.total_distributions || 0)
			const remaining = Number(balance.total_balance || (pet + donations - disbursed))
			return {
				totalPetRevenue: pet,
				totalCashDonations: donations,
				totalDisbursed: disbursed,
				remainingBalance: remaining,
			}
		}

		// 2) Fallback to green_scholar_transactions (unified naming first)
		// Exclude transactions that are in deleted_transactions table
		let pet = 0, donations = 0, disbursed = 0
		{
			// Get all active transaction IDs (not in deleted_transactions)
			const { data: deletedIds } = await supabase
				.from('deleted_transactions')
				.select('original_transaction_id')
				.not('original_transaction_id', 'is', null)
			
			const excludedIds = (deletedIds || []).map((d: any) => d.original_transaction_id).filter(Boolean)
			
			// Build query to exclude deleted transactions
			let query = supabase
				.from('green_scholar_transactions')
				.select('id, amount, transaction_type')
			
			// Exclude deleted transactions if any exist
			if (excludedIds.length > 0) {
				query = query.not('id', 'in', excludedIds)
			}
			
			const { data } = await query
			if (Array.isArray(data)) {
				const sum = (arr: any[], key: string) => arr.filter(r => r.transaction_type === key).reduce((s, r: any) => s + Number(r.amount || 0), 0)
				pet = sum(data, 'pet_contribution') || sum(data, 'pet_donation') || 0
				donations = sum(data, 'donation') || sum(data, 'direct_donation') || 0
				disbursed = sum(data, 'distribution') || sum(data, 'expense') || 0
			}
		}

		// 3) Last-resort fallback: derive PET revenue directly from approved collections materials
		// Exclude collections that are soft deleted
		if (!pet) {
			try {
				// Get deleted collection IDs to exclude
				const { data: deletedCollections } = await supabase
					.from('deleted_transactions')
					.select('original_collection_id')
					.not('original_collection_id', 'is', null)
				
				const excludedCollectionIds = (deletedCollections || []).map((d: any) => d.original_collection_id).filter(Boolean)
				
				let collectionsQuery = supabase
					.from('unified_collections')
					.select('id')
					.in('status', ['approved','completed'])
				
				// Exclude deleted collections if any exist
				if (excludedCollectionIds.length > 0) {
					collectionsQuery = collectionsQuery.not('id', 'in', excludedCollectionIds)
				}
				
				const { data: approved } = await collectionsQuery
				const ids = Array.isArray(approved) ? approved.map((r: any) => r.id) : []
				if (ids.length > 0) {
					const { data: mats } = await supabase
						.from('collection_materials')
						.select('collection_id, quantity, unit_price, materials(name)')
						.in('collection_id', ids)
					pet = (mats || [])
						.filter((r: any) => ((r.materials?.name || '').toLowerCase().includes('pet') || (r.materials?.name || '').toLowerCase().includes('plastic')))
						.reduce((s: number, r: any) => s + (Number(r.quantity || 0) * Number(r.unit_price || 0)), 0)
				}
			} catch {}
		}
		return { totalPetRevenue: pet, totalCashDonations: donations, totalDisbursed: disbursed, remainingBalance: pet + donations - disbursed }
	}

	static async processPetContributionForCollection(collectionId: string): Promise<{ created: boolean; amount: number }> {
		const res = await fetch('/api/green-scholar/pet-bottles-contribution', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ collectionId })
		})
		if (!res.ok) throw new Error('Failed to process PET contribution')
		const data = await res.json()
		return { created: !!data.created, amount: Number(data.amount || 0) }
	}

	static async listScholars(filters?: { school?: string; grade?: string; region?: string }): Promise<Scholar[]> {
		// Prefer dedicated `scholars` table if present
		const { data, error } = await supabase
			.from('scholars')
			.select('id, name, school, grade, region')
			.match({ ...(filters?.school && { school: filters.school }), ...(filters?.grade && { grade: filters.grade }), ...(filters?.region && { region: filters.region }) })

		if (error) {
			// fallback to users table with role = 'scholar' if exists
			const { data: users } = await supabase
				.from('users')
				.select('id, full_name')
				.eq('role_id', 'scholar')
			return (users || []).map((u: any) => ({ id: u.id, name: u.full_name }))
		}
		return (data || []).map((r: any) => ({ id: r.id, name: r.name, school: r.school, grade: r.grade, region: r.region }))
	}

	static async addScholar(input: { name: string; school?: string; grade?: string; region?: string }): Promise<string> {
		const { data, error } = await supabase
			.from('scholars')
			.insert({ name: input.name, school: input.school ?? null, grade: input.grade ?? null, region: input.region ?? null })
			.select('id')
			.single()
		if (error) throw error
		return data.id as string
	}

	static async listDisbursements(): Promise<Disbursement[]> {
		// Prefer unified ledger: green_scholar_transactions with distribution entries
		const { data, error } = await supabase
			.from('green_scholar_transactions')
			.select('*')
			.in('transaction_type', ['distribution', 'expense'])
			.order('created_at', { ascending: false })
		if (!error && Array.isArray(data)) {
			return (data || []).map((r: any) => ({
				id: r.id,
				scholar_id: r.beneficiary_id || r.scholar_id || 'unknown',
				scholar_name: r.beneficiary_name || undefined,
				amount: Number(r.amount || 0),
				date: r.created_at,
				purpose: r.description || '—',
			}))
		}
		// Fallback to local disbursements table
		const { data: d2 } = await supabase
			.from('green_scholar_disbursements')
			.select('id, scholar_id, amount, purpose, created_at, scholars(name)')
			.order('created_at', { ascending: false })
		return (d2 || []).map((r: any) => ({
			id: r.id,
			scholar_id: r.scholar_id,
			scholar_name: r.scholars?.name,
			amount: Number(r.amount || 0),
			date: r.created_at,
			purpose: r.purpose || '—',
		}))
	}

	static async addDisbursement(input: { scholar_id: string; amount: number; purpose: string; date?: string }): Promise<string> {
		// Try unified ledger insert
		const { data, error } = await supabase
			.from('green_scholar_transactions')
			.insert({
				transaction_type: 'distribution',
				amount: input.amount,
				description: input.purpose,
				beneficiary_type: 'scholar',
				beneficiary_id: input.scholar_id,
				created_at: input.date ?? new Date().toISOString(),
			})
			.select('id')
			.single()
		if (!error && data?.id) return data.id as string
		// fallback
		const { data: d2, error: e2 } = await supabase
			.from('green_scholar_disbursements')
			.insert({ scholar_id: input.scholar_id, amount: input.amount, purpose: input.purpose, created_at: input.date ?? new Date().toISOString() })
			.select('id')
			.single()
		if (e2) throw e2
		return d2.id as string
	}

	static async awardReward(input: { scholar_id: string; type: 'points' | 'cash'; amount: number; purpose?: string }): Promise<void> {
		if (input.type === 'points') {
			// Insert wallet points transaction (unified)
			await supabase
				.from('wallet_transactions')
				.insert({ user_id: input.scholar_id, transaction_type: 'reward', points: input.amount, description: input.purpose ?? 'Scholar reward' })
			return
		}
		// Cash: record distribution in unified ledger
		await this.addDisbursement({ scholar_id: input.scholar_id, amount: input.amount, purpose: input.purpose ?? 'Scholar distribution' })
	}

	static async getImpactMetrics(): Promise<ImpactMetrics> {
		let totalKg = 0
		let points = 0
		const { data } = await supabase
			.from('user_recycling_stats')
			.select('total_kg, total_points')
		if (Array.isArray(data)) {
			totalKg = data.reduce((s, r: any) => s + Number(r.total_kg || 0), 0)
			points = data.reduce((s, r: any) => s + Number(r.total_points || 0), 0)
		}
		const co2SavedKg = totalKg * 1.7
		const nextTierProgressPct = Math.min(100, (points % 1000) / 10)
		return { totalKg, co2SavedKg, points, nextTierProgressPct }
	}

	static async getScholarSummary(id: string) {
		const res = await fetch(`/api/green-scholar/${id}/summary`, { cache: 'no-store' })
		if (!res.ok) throw new Error('Failed to fetch scholar summary')
		return res.json()
	}

	static async getMonthlyBreakdown(): Promise<Array<{ month: string; pet_revenue: number; donations: number; distributions: number; net_change: number }>> {
		const { data, error } = await supabase
			.from('green_scholar_monthly_breakdown')
			.select('*')
			.order('month', { ascending: false })
		if (error) throw error
		return (data || []).map((r: any) => ({
			month: r.month,
			pet_revenue: Number(r.pet_revenue || 0),
			donations: Number(r.donations || 0),
			distributions: Number(r.distributions || 0),
			net_change: Number(r.net_change || 0),
		}))
	}

	static async deleteDisbursement(disbursementId: string): Promise<{ success: boolean; message: string }> {
		try {
			// Try to delete from unified ledger first
			const { error: unifiedError } = await supabase
				.from('green_scholar_transactions')
				.delete()
				.eq('id', disbursementId)
				.in('transaction_type', ['distribution', 'expense'])

			if (!unifiedError) {
				return { success: true, message: 'Disbursement deleted successfully' }
			}

			// Fallback to disbursements table
			const { error: disbursementError } = await supabase
				.from('green_scholar_disbursements')
				.delete()
				.eq('id', disbursementId)

			if (disbursementError) {
				throw disbursementError
			}

			return { success: true, message: 'Disbursement deleted successfully' }
		} catch (error) {
			console.error('Error deleting disbursement:', error)
			return { 
				success: false, 
				message: `Failed to delete disbursement: ${error instanceof Error ? error.message : 'Unknown error'}` 
			}
		}
	}
}


