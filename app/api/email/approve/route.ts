import { NextRequest, NextResponse } from 'next/server'
import { getLeads, markEmailPendingApproval, approveEmail, rejectEmail } from '@/lib/supabase'
import { generateEmailContent, generateDMScript } from '@/lib/email'
import { PendingEmail } from '@/lib/types'

export async function GET() {
  try {
    // Get leads that have emails but haven't been contacted yet
    const allLeads = await getLeads()
    const leadsForApproval = allLeads.filter(lead => 
      !lead.email_sent && 
      lead.status === 'new' &&
      !lead.email_pending_approval &&
      !lead.email_approved
    )

    const pendingEmails: PendingEmail[] = []

    for (const lead of leadsForApproval) {
      if (lead.email) {
        // Generate email content for approval
        const emailContent = generateEmailContent(lead)
        pendingEmails.push({
          leadId: lead.id,
          github_username: lead.github_username,
          email: lead.email,
          repo_name: lead.repo_name,
          repo_description: lead.repo_description,
          emailContent
        })
      } else {
        // Generate DM script for approval
        const dmScript = generateDMScript(lead)
        pendingEmails.push({
          leadId: lead.id,
          github_username: lead.github_username,
          email: '',
          repo_name: lead.repo_name,
          repo_description: lead.repo_description,
          emailContent: '',
          dmScript
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      pendingEmails,
      count: pendingEmails.length 
    })
  } catch (error) {
    console.error('Error getting pending emails:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get pending emails' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, leadIds } = body

    if (!action || !leadIds || !Array.isArray(leadIds)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    let updatedCount = 0
    const errors: string[] = []

    for (const leadId of leadIds) {
      try {
        if (action === 'approve') {
          await approveEmail(leadId)
          updatedCount++
        } else if (action === 'reject') {
          await rejectEmail(leadId)
          updatedCount++
        } else if (action === 'mark-pending') {
          await markEmailPendingApproval(leadId)
          updatedCount++
        }
      } catch (error) {
        const errorMsg = `Error processing lead ${leadId}: ${error}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${action} completed for ${updatedCount} leads`,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error processing email approval:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process email approval' },
      { status: 500 }
    )
  }
} 