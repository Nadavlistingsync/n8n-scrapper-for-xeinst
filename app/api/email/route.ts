import { NextRequest, NextResponse } from 'next/server'
import { getLeads, updateLeadStatus } from '@/lib/supabase'
import { sendOutreachEmail } from '@/lib/email'
import { EmailResult } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadIds, dryRun = false } = body

    let leadsToEmail = []

    if (leadIds && Array.isArray(leadIds)) {
      // Email specific leads (must be approved)
      const allLeads = await getLeads()
      leadsToEmail = allLeads.filter(lead => 
        leadIds.includes(lead.id) && 
        lead.email_approved === true
      )
    } else {
      // Email all leads that have been approved and haven't been contacted
      const allLeads = await getLeads()
      leadsToEmail = allLeads.filter(lead => 
        lead.email && 
        !lead.email_sent && 
        lead.status === 'new' &&
        lead.email_approved === true
      )
    }

    if (leadsToEmail.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No approved leads found to email',
        emailsSent: 0,
      })
    }

    console.log(`Preparing to email ${leadsToEmail.length} approved leads (dry run: ${dryRun})`)

    let emailsSent = 0
    const errors: string[] = []

    for (const lead of leadsToEmail) {
      try {
        if (!lead.email) {
          errors.push(`No email for ${lead.github_username}`)
          continue
        }

        if (dryRun) {
          console.log(`[DRY RUN] Would send email to ${lead.email} for ${lead.github_username}`)
          emailsSent++
        } else {
          const emailSent = await sendOutreachEmail(lead)
          if (emailSent) {
            await updateLeadStatus(lead.id, 'contacted', true)
            emailsSent++
            console.log(`Email sent to ${lead.email}`)
          } else {
            errors.push(`Failed to send email to ${lead.email}`)
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        const errorMsg = `Error emailing ${lead.github_username}: ${error}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    const result: EmailResult = {
      success: true,
      message: `${dryRun ? 'Dry run' : 'Email campaign'} completed. Sent ${emailsSent} emails.`,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined,
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Email campaign error:', error)
    
    const result: EmailResult = {
      success: false,
      message: `Email campaign failed: ${error}`,
      emailsSent: 0,
      errors: [error as string],
    }

    return NextResponse.json(result, { status: 500 })
  }
} 