import { NextResponse } from 'next/server'
import { getLeads } from '@/lib/supabase'

export async function GET() {
  try {
    const leads = await getLeads()
    return NextResponse.json({ success: true, leads })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
} 