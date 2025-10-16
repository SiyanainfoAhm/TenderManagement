// Email service for sending invitation emails via MSG91 SMTP
export const emailService = {
  // Send invitation email
  async sendInvitation(params: {
    toEmail: string
    toName: string
    companyName: string
    inviterName: string
    role: string
    invitationToken: string
  }): Promise<boolean> {
    const { toEmail, toName, companyName, inviterName, role, invitationToken } = params
    
    // Create invitation link
    const invitationLink = `${window.location.origin}/invitations/${invitationToken}`
    
    // Email content
    const emailSubject = `You've been invited to join ${companyName} on Tender Manager`
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🏢 Tender Manager</h1>
        </div>
        
        <div style="background: #f7f9fc; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${toName || 'there'},</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            <strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on Tender Manager.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #333;"><strong>Company:</strong> ${companyName}</p>
            <p style="margin: 10px 0 0 0; color: #333;"><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
          </div>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Click the button below to accept this invitation:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" 
               style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; line-height: 1.6;">
            Or copy this link: <a href="${invitationLink}" style="color: #667eea;">${invitationLink}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            This invitation expires in 7 days. If you don't want to join ${companyName}, you can ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Tender Manager - Tender Management System</p>
        </div>
      </div>
    `
    
    try {
      // Determine API endpoint based on environment
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168')
        ? 'http://localhost:3001/api/send-email'  // Local email server
        : '/api/send-email'  // Vercel serverless function
      
      console.log('Sending email via:', apiUrl)
      
      // Send via backend API endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: toEmail,
          subject: emailSubject,
          html: emailBody
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Email API error:', errorText)
        throw new Error('Failed to send email')
      }
      
      const result = await response.json()
      console.log('Email sent successfully:', result)
      
      return true
    } catch (error) {
      console.error('Failed to send invitation email:', error)
      throw new Error('Failed to send invitation email')
    }
  }
}

