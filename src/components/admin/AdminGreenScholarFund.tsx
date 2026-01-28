'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GreenScholarFundService, type Scholar, type Disbursement } from '@/lib/green-scholar-fund-service'
import { Trash2, TreePine, Coins, TrendingUp, Users, School, Filter, Search, Plus, Award, Calendar } from 'lucide-react'

export default function AdminGreenScholarFund() {
	const [overview, setOverview] = useState<{ totalPetRevenue: number; totalCashDonations: number; totalDisbursed: number; remainingBalance: number }>()
	const [monthly, setMonthly] = useState<Array<{ month: string; pet_revenue: number; donations: number; distributions: number; net_change: number }>>([])
	const [scholars, setScholars] = useState<Scholar[]>([])
	const [disbursements, setDisbursements] = useState<Disbursement[]>([])
	const [filters, setFilters] = useState<{ school?: string; grade?: string; region?: string }>({})
	const [reward, setReward] = useState<{ scholarId: string; amount: string; type: 'points' | 'cash'; purpose: string }>({ scholarId: '', amount: '', type: 'points', purpose: '' })

	const handleDeleteDisbursement = async (disbursementId: string) => {
		const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to delete this disbursement? This action cannot be undone.') : true;
		if (!confirmed) return;

		try {
			const result = await GreenScholarFundService.deleteDisbursement(disbursementId);
			if (result.success) {
				// Refresh the data
				const [ov, mb, sc, ds] = await Promise.all([
					GreenScholarFundService.getFundOverview(),
					GreenScholarFundService.getMonthlyBreakdown(),
					GreenScholarFundService.listScholars(filters),
					GreenScholarFundService.listDisbursements(),
				])
				setOverview(ov)
				setMonthly(mb)
				setScholars(sc)
				setDisbursements(ds)
				alert('Disbursement deleted successfully');
			} else {
				alert(`Failed to delete disbursement: ${result.message}`);
			}
		} catch (error) {
			console.error('Error deleting disbursement:', error);
			alert('Failed to delete disbursement');
		}
	}

	useEffect(() => {
		// Show UI immediately, load data in background
		(async () => {
			const [ov, mb, sc, ds] = await Promise.all([
				GreenScholarFundService.getFundOverview(),
				GreenScholarFundService.getMonthlyBreakdown(),
				GreenScholarFundService.listScholars(filters),
				GreenScholarFundService.listDisbursements(),
			])
			setOverview(ov)
			setMonthly(mb)
			setScholars(sc)
			setDisbursements(ds)
		})()
	}, [filters.school, filters.grade, filters.region])

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
			<div className="w-full">
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
					<div>
						<h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Green Scholar Fund</h1>
						<p className="text-gray-600">PET revenue and donations for youth education</p>
					</div>
					<div className="flex items-center gap-3">
						<div className="text-right">
							<div className="text-sm text-gray-500">Total Balance</div>
							<div className="text-2xl font-bold text-green-600">C{overview?.remainingBalance?.toFixed(2) ?? '0.00'}</div>
						</div>
						<div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
							<TreePine className="h-8 w-8 text-white" />
						</div>
					</div>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
					<Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-semibold text-green-900">Total PET Revenue</CardTitle>
							<div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
								<TreePine className="h-5 w-5 text-white" />
							</div>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-green-600 mb-1">
								C{(overview?.totalPetRevenue ?? 0).toFixed(2)}
							</div>
							<p className="text-sm text-green-700 font-medium">
								From recycling
							</p>
						</CardContent>
					</Card>

					<Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-semibold text-blue-900">Cash Donations</CardTitle>
							<div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
								<Coins className="h-5 w-5 text-white" />
							</div>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-blue-600 mb-1">
								C{(overview?.totalCashDonations ?? 0).toFixed(2)}
							</div>
							<p className="text-sm text-blue-700 font-medium">
								Direct donations
							</p>
						</CardContent>
					</Card>

					<Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-semibold text-purple-900">Total Disbursed</CardTitle>
							<div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
								<TrendingUp className="h-5 w-5 text-white" />
							</div>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-purple-600 mb-1">
								C{(overview?.totalDisbursed ?? 0).toFixed(2)}
							</div>
							<p className="text-sm text-purple-700 font-medium">
								To scholars
							</p>
						</CardContent>
					</Card>

					<Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-2xl transition-all duration-300">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-semibold text-emerald-900">Remaining Balance</CardTitle>
							<div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
								<Award className="h-5 w-5 text-white" />
							</div>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-emerald-600 mb-1">
								C{(overview?.remainingBalance ?? 0).toFixed(2)}
							</div>
							<p className="text-sm text-emerald-700 font-medium">
								Available funds
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Monthly Breakdown */}
				<Card className="border-0 shadow-xl bg-white mb-8">
					<CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
						<CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
							<Calendar className="h-5 w-5 text-blue-600" />
							Monthly Breakdown
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow className="bg-gray-50">
										<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</TableHead>
										<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PET Revenue</TableHead>
										<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Donations</TableHead>
										<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distributions</TableHead>
										<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Change</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{monthly.map((m, idx) => (
										<TableRow key={idx} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
											<TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{new Date(m.month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
											</TableCell>
											<TableCell className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
												C{m.pet_revenue.toFixed(2)}
											</TableCell>
											<TableCell className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
												C{m.donations.toFixed(2)}
											</TableCell>
											<TableCell className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
												C{m.distributions.toFixed(2)}
											</TableCell>
											<TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
												<span className={`${m.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
													C{m.net_change.toFixed(2)}
												</span>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				{/* Scholar Registry and Disbursements */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
					<Card className="border-0 shadow-xl bg-white">
						<CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
							<CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
								<Users className="h-5 w-5 text-blue-600" />
								Scholar Registry ({scholars.length})
							</CardTitle>
						</CardHeader>
						<CardContent className="p-6 space-y-4">
							<div className="grid md:grid-cols-4 gap-2">
								<div className="relative">
									<Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
									<Input 
										placeholder="Filter by school" 
										onChange={(e) => setFilters(f => ({ ...f, school: e.target.value || undefined }))} 
										className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
									/>
								</div>
								<Input 
									placeholder="Filter by grade" 
									onChange={(e) => setFilters(f => ({ ...f, grade: e.target.value || undefined }))} 
									className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
								/>
								<Input 
									placeholder="Filter by region" 
									onChange={(e) => setFilters(f => ({ ...f, region: e.target.value || undefined }))} 
									className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
								/>
								<Button variant="outline" onClick={() => setFilters({})} className="border-gray-300 hover:bg-gray-50">
									<Filter className="h-4 w-4 mr-2" />Clear
								</Button>
							</div>
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="bg-gray-50">
											<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</TableHead>
											<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</TableHead>
											<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</TableHead>
											<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{scholars.map(s => (
											<TableRow key={s.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
												<TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.name}</TableCell>
												<TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.school || '—'}</TableCell>
												<TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.grade || '—'}</TableCell>
												<TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.region || '—'}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>

					<Card className="border-0 shadow-xl bg-white">
						<CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
							<CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
								<Coins className="h-5 w-5 text-green-600" />
								Disbursements ({disbursements.length})
							</CardTitle>
						</CardHeader>
						<CardContent className="p-6 space-y-4">
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="bg-gray-50">
											<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scholar</TableHead>
											<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</TableHead>
											<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</TableHead>
											<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</TableHead>
											<TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{disbursements.map(d => (
											<TableRow key={d.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
												<TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.scholar_name || d.scholar_id}</TableCell>
												<TableCell className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">R{d.amount.toFixed(2)}</TableCell>
												<TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(d.date).toLocaleDateString()}</TableCell>
												<TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{d.purpose}</TableCell>
												<TableCell className="px-6 py-4 whitespace-nowrap">
													<Button
														variant="destructive"
														size="sm"
														onClick={() => handleDeleteDisbursement(d.id)}
														className="h-8 w-8 p-0 text-red-600 border-red-300 hover:bg-red-50"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-4 border-t border-gray-200">
								<Input 
									placeholder="Scholar ID" 
									onChange={(e) => setReward(r => ({ ...r, scholarId: e.target.value }))} 
									value={reward.scholarId}
									className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
								/>
								<Input 
									type="number" 
									placeholder="Amount" 
									onChange={(e) => setReward(r => ({ ...r, amount: e.target.value }))} 
									value={reward.amount}
									className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
								/>
								<Input 
									placeholder="Purpose" 
									onChange={(e) => setReward(r => ({ ...r, purpose: e.target.value }))} 
									value={reward.purpose}
									className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
								/>
								<Button 
									disabled={!reward.scholarId || !reward.amount} 
									onClick={async () => {
										await GreenScholarFundService.addDisbursement({ scholar_id: reward.scholarId, amount: Number(reward.amount), purpose: reward.purpose })
										setReward({ scholarId: '', amount: '', type: 'points', purpose: '' })
									}}
									className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
								>
									<Plus className="h-4 w-4 mr-2" />Add Disbursement
								</Button>
							</div>

							<div className="flex gap-2 pt-4 border-t border-gray-200">
								<Input 
									placeholder="Collection ID for PET processing" 
									id="petCollection"
									className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
								/>
								<Button 
									variant="outline" 
									onClick={async () => {
										const input = document.getElementById('petCollection') as HTMLInputElement | null
										const id = input?.value?.trim()
										if (!id) return
										await GreenScholarFundService.processPetContributionForCollection(id)
										// reload
										const [ov, mb, ds] = await Promise.all([
											GreenScholarFundService.getFundOverview(),
											GreenScholarFundService.getMonthlyBreakdown(),
											GreenScholarFundService.listDisbursements(),
										])
										setOverview(ov)
										setMonthly(mb)
										setDisbursements(ds)
									}}
									className="border-gray-300 hover:bg-gray-50"
								>
									<TreePine className="h-4 w-4 mr-2" />Process PET Contribution
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Reward Distribution */}
				<Card className="border-0 shadow-xl bg-white">
					<CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
						<CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
							<Award className="h-5 w-5 text-purple-600" />
							Reward Distribution
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6">
						<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
							<Select value={reward.scholarId} onValueChange={(v) => setReward(r => ({ ...r, scholarId: v }))}>
								<SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
									<SelectValue placeholder="Select scholar" />
								</SelectTrigger>
								<SelectContent>
									{scholars.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
								</SelectContent>
							</Select>
							<Input 
								type="number" 
								placeholder="Amount or points" 
								value={reward.amount} 
								onChange={(e) => setReward(r => ({ ...r, amount: e.target.value }))}
								className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
							/>
							<Select value={reward.type} onValueChange={(v) => setReward(r => ({ ...r, type: v as any }))}>
								<SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
									<SelectValue placeholder="Reward type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="points">Points</SelectItem>
									<SelectItem value="cash">Cash</SelectItem>
								</SelectContent>
							</Select>
							<Input 
								placeholder="Purpose / milestone" 
								value={reward.purpose} 
								onChange={(e) => setReward(r => ({ ...r, purpose: e.target.value }))}
								className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
							/>
							<Button 
								disabled={!reward.scholarId || !reward.amount} 
								onClick={async () => {
									await GreenScholarFundService.awardReward({ scholar_id: reward.scholarId, type: reward.type, amount: Number(reward.amount), purpose: reward.purpose })
									setReward({ scholarId: '', amount: '', type: 'points', purpose: '' })
								}}
								className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
							>
								<Award className="h-4 w-4 mr-2" />Assign Reward
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}


