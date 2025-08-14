import { NextRequest, NextResponse } from 'next/server'
import { updateLead } from '@/lib/google-sheets-db'
import { Lead } from '@/lib/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, emailSent } = body

    if (!status || !['new', 'contacted', 'responded', 'converted'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    const updatedLead = await updateLead(params.id, { 
      status: status as Lead['status'],
      ...(emailSent && { email_sent: true, email_sent_at: new Date().toISOString() })
    })

    if (!updatedLead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, lead: updatedLead })
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update lead' },
      { status: 500 }
    )
  }
} 