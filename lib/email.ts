import { Resend } from 'resend'
import { Lead } from './types'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOutreachEmail(lead: Lead): Promise<boolean> {
  if (!lead.email) {
    console.log(`No email available for ${lead.github_username}`)
    return false
  }

  const emailContent = generateEmailContent(lead)

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@xeinst.com',
      to: [lead.email],
      subject: 'Your awesome n8n workflow caught our attention! 🚀',
      html: emailContent,
    })

    if (error) {
      console.error(`Error sending email to ${lead.email}:`, error)
      return false
    }

    console.log(`Email sent successfully to ${lead.email}:`, data)
    return true
  } catch (error) {
    console.error(`Error sending email to ${lead.email}:`, error)
    return false
  }
}

export function generateEmailContent(lead: Lead): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Join Xeinst - Earn from your n8n workflows</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">🚀 Xeinst</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Monetize your n8n workflows</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Hey there! 👋</h2>
        
        <p>I noticed your awesome n8n workflow <strong>"${lead.repo_name}"</strong> on GitHub and I'm genuinely impressed!</p>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db;">
          <p style="margin: 0; font-style: italic;">
            "${lead.repo_description || 'Your workflow looks amazing!'}"
          </p>
        </div>
        
        <p>We're building <strong>Xeinst</strong> - a new platform where developers like you can earn money by listing and selling their n8n workflows and automation agents.</p>
        
        <h3 style="color: #2c3e50;">Why Xeinst?</h3>
        <ul style="padding-left: 20px;">
          <li>💰 <strong>Monetize your workflows</strong> - Earn passive income</li>
          <li>🌍 <strong>Reach global audience</strong> - Connect with developers worldwide</li>
          <li>🚀 <strong>Easy listing process</strong> - Simple setup and management</li>
          <li>💡 <strong>Community-driven</strong> - Share and discover amazing automations</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://xeinst.com/waitlist" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            Join the Waitlist
          </a>
        </div>
        
        <p>We're currently in beta and looking for early adopters like you. Would you be interested in joining our waitlist?</p>
        
        <p>Best regards,<br>
        The Xeinst Team</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666; text-align: center;">
          You received this email because we found your n8n workflow on GitHub. 
          If you'd prefer not to receive these emails, just reply with "unsubscribe".
        </p>
      </div>
    </body>
    </html>
  `
}

export function generateDMScript(lead: Lead): string {
  return `Hey ${lead.github_username}, I saw your n8n workflow "${lead.repo_name}" and wanted to connect! 🚀`;
}
