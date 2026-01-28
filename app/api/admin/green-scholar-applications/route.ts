import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 0

// GET - List all applications with optional status filter
export async function GET(request: NextRequest) {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json(
				{ error: 'Supabase admin client not configured' },
				{ status: 500 }
			)
		}

		const { searchParams } = new URL(request.url)
		const status = searchParams.get('status')

		let query = supabaseAdmin
			.from('green_scholar_applications')
			.select('*')
			.order('created_at', { ascending: false })

		if (status) {
			query = query.eq('status', status)
		}

		const { data, error } = await query

		if (error) {
			console.error('Error fetching applications:', error)
			// If table doesn't exist, return empty array instead of error
			if (error.code === '42P01' || error.message?.includes('does not exist')) {
				console.warn('green_scholar_applications table does not exist yet')
				return NextResponse.json({ applications: [] })
			}
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: 500 }
			)
		}

		return NextResponse.json({ applications: data || [] })
	} catch (error: any) {
		console.error('Error in GET applications:', error)
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		)
	}
}

// POST - Create a new application
export async function POST(request: NextRequest) {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json(
				{ error: 'Supabase admin client not configured' },
				{ status: 500 }
			)
		}

		const body = await request.json()

		const { data, error } = await supabaseAdmin
			.from('green_scholar_applications')
			.insert({
				...body,
				status: body.status || 'pending',
			})
			.select()
			.single()

		if (error) {
			console.error('Error creating application:', error)
			return NextResponse.json(
				{ error: error.message },
				{ status: 500 }
			)
		}

		return NextResponse.json({ application: data })
	} catch (error: any) {
		console.error('Error in POST application:', error)
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		)
	}
}

