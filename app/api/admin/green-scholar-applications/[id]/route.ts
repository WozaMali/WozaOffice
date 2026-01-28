import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 0

// GET - Get a specific application
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json(
				{ error: 'Supabase admin client not configured' },
				{ status: 500 }
			)
		}

		const { id } = await params

		const { data, error } = await supabaseAdmin
			.from('green_scholar_applications')
			.select('*')
			.eq('id', id)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				return NextResponse.json(
					{ error: 'Application not found' },
					{ status: 404 }
				)
			}
			console.error('Error fetching application:', error)
			return NextResponse.json(
				{ error: error.message },
				{ status: 500 }
			)
		}

		return NextResponse.json({ application: data })
	} catch (error: any) {
		console.error('Error in GET application:', error)
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		)
	}
}

// PATCH - Update application status or other fields
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json(
				{ error: 'Supabase admin client not configured' },
				{ status: 500 }
			)
		}

		const { id } = await params
		const body = await request.json()

		const { data, error } = await supabaseAdmin
			.from('green_scholar_applications')
			.update({
				...body,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select()
			.single()

		if (error) {
			console.error('Error updating application:', error)
			return NextResponse.json(
				{ error: error.message },
				{ status: 500 }
			)
		}

		return NextResponse.json({ application: data })
	} catch (error: any) {
		console.error('Error in PATCH application:', error)
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		)
	}
}

// DELETE - Delete an application
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json(
				{ error: 'Supabase admin client not configured' },
				{ status: 500 }
			)
		}

		const { id } = await params

		const { error } = await supabaseAdmin
			.from('green_scholar_applications')
			.delete()
			.eq('id', id)

		if (error) {
			console.error('Error deleting application:', error)
			return NextResponse.json(
				{ error: error.message },
				{ status: 500 }
			)
		}

		return NextResponse.json({ success: true })
	} catch (error: any) {
		console.error('Error in DELETE application:', error)
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		)
	}
}

