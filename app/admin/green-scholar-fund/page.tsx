'use client'

import { useEffect, useMemo, useState } from 'react'
import { GreenScholarFundService, type Disbursement, type Scholar } from '@/lib/green-scholar-fund-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Sparkles, School, HandCoins, Recycle } from 'lucide-react'

export default function GreenScholarFundPage() {
	const [overview, setOverview] = useState<{ totalPetRevenue: number; totalCashDonations: number; totalDisbursed: number; remainingBalance: number }>()
	const [scholars, setScholars] = useState<Scholar[]>([])
	const [disbursements, setDisbursements] = useState<Disbursement[]>([])
	const [metrics, setMetrics] = useState<{ totalKg: number; co2SavedKg: number; points: number; nextTierProgressPct: number }>()
	const [monthly, setMonthly] = useState<Array<{ month: string; pet_revenue: number; donations: number; distributions: number; net_change: number }>>([])
	const [filters, setFilters] = useState<{ school?: string; grade?: string; region?: string }>({})
	const [loading, setLoading] = useState(true)
	const [reward, setReward] = useState<{ scholarId: string; amount: string; type: 'points' | 'cash'; purpose: string }>({ scholarId: '', amount: '', type: 'points', purpose: '' })
	const [deleteCollectionId, setDeleteCollectionId] = useState('')
	const [deleting, setDeleting] = useState(false)

	useEffect(() => {
		let mounted = true
		async function load() {
			setLoading(true)
			try {
				const [ov, sc, ds, im, mb] = await Promise.all([
					GreenScholarFundService.getFundOverview(),
					GreenScholarFundService.listScholars(filters),
					GreenScholarFundService.listDisbursements(),
					GreenScholarFundService.getImpactMetrics(),
					GreenScholarFundService.getMonthlyBreakdown(),
				])
				if (!mounted) return
				setOverview(ov)
				setScholars(sc)
				setDisbursements(ds)
				setMetrics(im)
				setMonthly(mb)
			} finally {
				if (mounted) setLoading(false)
			}
		}
		load()
		return () => { mounted = false }
	}, [filters.school, filters.grade, filters.region])

	const palette = useMemo(() => ({
		bg: 'bg-amber-50',
		card: 'bg-white',
		accent: 'text-amber-800',
		muted: 'text-amber-700',
		chip: 'bg-emerald-100 text-emerald-800',
	}), [])

	async function handleDeleteCollection() {
		if (!deleteCollectionId) return
		const ok = typeof window !== 'undefined' ? window.confirm(`Delete collection ${deleteCollectionId}? This will also remove its PET contribution from Green Scholar.`) : true
		if (!ok) return
		setDeleting(true)
		try {
			const res = await fetch('/api/admin/delete-collection', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ collectionId: deleteCollectionId })
			})
			const json = await res.json().catch(() => ({}))
			if (!res.ok || json?.ok === false) {
				const msg = json?.error || json?.reason || `HTTP ${res.status}`
				if (typeof window !== 'undefined') window.alert(`Failed to delete: ${msg}`)
				return
			}
			if (typeof window !== 'undefined') window.alert('Deleted successfully')
			// Refresh overview + monthly breakdown
			const [ov, mb] = await Promise.all([
				GreenScholarFundService.getFundOverview(),
				GreenScholarFundService.getMonthlyBreakdown(),
			])
			setOverview(ov)
			setMonthly(mb)
			setDeleteCollectionId('')
		} finally {
			setDeleting(false)
		}
	}

	return (
		<div className={`min-h-screen ${palette.bg} p-4 md:p-6`}>
			<div className="max-w-7xl mx-auto space-y-6">
				<header className="flex items-center justify-between">
					<h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
						<Recycle className="w-6 h-6 text-emerald-600" />
						Green Scholar Fund
					</h1>
				</header>

				<Tabs defaultValue="overview" className="space-y-4">
					<TabsList>
						<TabsTrigger value="overview">Fund Overview</TabsTrigger>
						<TabsTrigger value="scholars">Scholar Registry</TabsTrigger>
						<TabsTrigger value="disburse">Disbursements</TabsTrigger>
						<TabsTrigger value="impact">Impact Metrics</TabsTrigger>
						<TabsTrigger value="rewards">Rewards</TabsTrigger>
					</TabsList>

					<TabsContent value="overview">
						{/* Admin tools: delete a PET-linked collection by ID */}
						<Card className={`${palette.card} mb-4`}>
							<CardHeader>
								<CardTitle>Admin Tools</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex flex-col md:flex-row gap-2 items-start md:items-end">
									<div className="w-full md:w-80">
										<Input placeholder="Collection ID" value={deleteCollectionId} onChange={(e) => setDeleteCollectionId(e.target.value)} />
									</div>
									<Button disabled={deleting || !deleteCollectionId} variant="destructive" onClick={handleDeleteCollection}>
										{deleting ? 'Deleting…' : 'Delete PET-linked Collection'}
									</Button>
								</div>
							</CardContent>
						</Card>
						<div className="grid md:grid-cols-4 gap-4">
							{[{
								title: 'Total PET revenue', value: overview?.totalPetRevenue ?? 0, icon: <Recycle className="w-4 h-4" />
							}, {
								title: 'Cash donations', value: overview?.totalCashDonations ?? 0, icon: <HandCoins className="w-4 h-4" />
							}, {
								title: 'Disbursed', value: overview?.totalDisbursed ?? 0, icon: <School className="w-4 h-4" />
							}, {
								title: 'Remaining balance', value: overview?.remainingBalance ?? 0, icon: <Sparkles className="w-4 h-4" />
							}].map((c, i) => (
								<Card key={i} className={palette.card}>
									<CardHeader className="flex flex-row items-center justify-between pb-2">
										<CardTitle className="text-sm font-medium">{c.title}</CardTitle>
										<Badge variant="secondary">{c.icon}</Badge>
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">R{(c.value).toFixed(2)}</div>
									</CardContent>
								</Card>
							))}
						</div>

						<div className="mt-4">
							<Card className={palette.card}>
								<CardHeader>
									<CardTitle>Monthly Breakdown</CardTitle>
								</CardHeader>
								<CardContent>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Month</TableHead>
												<TableHead>PET</TableHead>
												<TableHead>Donations</TableHead>
												<TableHead>Distributions</TableHead>
												<TableHead>Net</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{monthly.map((m, idx) => (
												<TableRow key={idx}>
													<TableCell>{new Date(m.month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</TableCell>
													<TableCell>R{m.pet_revenue.toFixed(2)}</TableCell>
													<TableCell>R{m.donations.toFixed(2)}</TableCell>
													<TableCell>R{m.distributions.toFixed(2)}</TableCell>
													<TableCell>R{m.net_change.toFixed(2)}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					<TabsContent value="scholars" className="space-y-4">
						<Card className={palette.card}>
							<CardHeader>
								<CardTitle>Scholar Registry</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid md:grid-cols-4 gap-2">
									<Input placeholder="Filter by school" onChange={(e) => setFilters(f => ({ ...f, school: e.target.value || undefined }))} />
									<Input placeholder="Filter by grade" onChange={(e) => setFilters(f => ({ ...f, grade: e.target.value || undefined }))} />
									<Input placeholder="Filter by region" onChange={(e) => setFilters(f => ({ ...f, region: e.target.value || undefined }))} />
									<div className="flex items-center justify-end">
										<Button onClick={() => setFilters({})} variant="outline">Clear</Button>
									</div>
								</div>
								<Separator />
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>School</TableHead>
											<TableHead>Grade</TableHead>
											<TableHead>Region</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{scholars.map(s => (
											<TableRow key={s.id}>
												<TableCell className="font-medium">{s.name}</TableCell>
												<TableCell>{s.school || '—'}</TableCell>
												<TableCell>{s.grade || '—'}</TableCell>
												<TableCell>{s.region || '—'}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<div className="flex justify-end"><AddScholarButton onAdded={() => setFilters(f => ({ ...f }))} /></div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="disburse" className="space-y-4">
						<Card className={palette.card}>
							<CardHeader>
								<CardTitle>Disbursement Tracker</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Scholar</TableHead>
											<TableHead>Amount</TableHead>
											<TableHead>Date</TableHead>
											<TableHead>Purpose</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{disbursements.map(d => (
											<TableRow key={d.id}>
												<TableCell className="font-medium">{d.scholar_name || d.scholar_id}</TableCell>
												<TableCell>R{d.amount.toFixed(2)}</TableCell>
												<TableCell>{new Date(d.date).toLocaleDateString()}</TableCell>
												<TableCell>{d.purpose}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<div className="flex justify-end"><AddDisbursementButton onAdded={() => setFilters(f => ({ ...f }))} /></div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="impact">
						<Card className={palette.card}>
							<CardHeader>
								<CardTitle>Recycling Impact</CardTitle>
							</CardHeader>
							<CardContent className="grid md:grid-cols-3 gap-4">
								<div>
									<div className="text-sm text-muted-foreground">Total kilograms recycled</div>
									<div className="text-2xl font-bold">{metrics?.totalKg?.toFixed(1) ?? '0.0'} kg</div>
								</div>
								<div>
									<div className="text-sm text-muted-foreground">CO₂ saved</div>
									<div className="text-2xl font-bold">{metrics?.co2SavedKg?.toFixed(1) ?? '0.0'} kg</div>
								</div>
								<div>
									<div className="text-sm text-muted-foreground">Points earned</div>
									<div className="text-2xl font-bold">{metrics?.points ?? 0}</div>
								</div>
								<div className="col-span-3">
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm text-muted-foreground">Progress toward next tier</span>
										<span className="text-sm font-medium">{metrics?.nextTierProgressPct ?? 0}%</span>
									</div>
									<Progress value={metrics?.nextTierProgressPct ?? 0} />
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="rewards">
						<Card className={palette.card}>
							<CardHeader>
								<CardTitle>Reward Distribution</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid md:grid-cols-5 gap-2">
									<Select value={reward.scholarId} onValueChange={(v) => setReward(r => ({ ...r, scholarId: v }))}>
										<SelectTrigger className="w-full"><SelectValue placeholder="Select scholar" /></SelectTrigger>
										<SelectContent>
											{scholars.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
										</SelectContent>
									</Select>
									<Input type="number" placeholder="Amount or points" value={reward.amount} onChange={(e) => setReward(r => ({ ...r, amount: e.target.value }))} />
									<Select value={reward.type} onValueChange={(v) => setReward(r => ({ ...r, type: v as any }))}>
										<SelectTrigger className="w-full"><SelectValue placeholder="Reward type" /></SelectTrigger>
										<SelectContent>
											<SelectItem value="points">Points</SelectItem>
											<SelectItem value="cash">Cash</SelectItem>
										</SelectContent>
									</Select>
									<Input placeholder="Purpose / milestone" value={reward.purpose} onChange={(e) => setReward(r => ({ ...r, purpose: e.target.value }))} />
									<Button disabled={!reward.scholarId || !reward.amount} onClick={async () => {
										await GreenScholarFundService.awardReward({ scholar_id: reward.scholarId, type: reward.type, amount: Number(reward.amount), purpose: reward.purpose })
										setReward({ scholarId: '', amount: '', type: 'points', purpose: '' })
									}}>Assign Reward</Button>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}

function AddScholarButton({ onAdded }: { onAdded: () => void }) {
	const [open, setOpen] = useState(false)
	const [name, setName] = useState('')
	const [school, setSchool] = useState('')
	const [grade, setGrade] = useState('')
	const [region, setRegion] = useState('')
	const [busy, setBusy] = useState(false)
	return (
		<div className="flex gap-2">
			<Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
			<Input placeholder="School" value={school} onChange={e => setSchool(e.target.value)} />
			<Input placeholder="Grade" value={grade} onChange={e => setGrade(e.target.value)} />
			<Input placeholder="Region" value={region} onChange={e => setRegion(e.target.value)} />
			<Button disabled={busy || !name} onClick={async () => {
				setBusy(true)
				try {
					await GreenScholarFundService.addScholar({ name, school, grade, region })
					setName(''); setSchool(''); setGrade(''); setRegion('')
					onAdded()
				} finally { setBusy(false) }
			}}>Add Scholar</Button>
		</div>
	)
}

function AddDisbursementButton({ onAdded }: { onAdded: () => void }) {
	const [scholarId, setScholarId] = useState('')
	const [amount, setAmount] = useState('')
	const [purpose, setPurpose] = useState('')
	const [busy, setBusy] = useState(false)
	return (
		<div className="flex gap-2">
			<Input placeholder="Scholar ID" value={scholarId} onChange={e => setScholarId(e.target.value)} />
			<Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
			<Input placeholder="Purpose" value={purpose} onChange={e => setPurpose(e.target.value)} />
			<Button disabled={busy || !scholarId || !amount} onClick={async () => {
				setBusy(true)
				try {
					await GreenScholarFundService.addDisbursement({ scholar_id: scholarId, amount: Number(amount), purpose })
					setScholarId(''); setAmount(''); setPurpose('')
					onAdded()
				} finally { setBusy(false) }
			}}>Add Disbursement</Button>
		</div>
	)
}


