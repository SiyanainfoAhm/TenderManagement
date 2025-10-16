// Vercel Serverless Function to send emails via MSG91 SMTP
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, html } = req.body

  // Validate input
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' })
  }

  try {
    // Create transporter using MSG91 SMTP credentials
    const transporter = nodemailer.createTransport({
      host: 'smtp.mailer91.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: 'emailer@ok5pr0.mailer91.com',
        pass: 'TF5mOPAURXYqoX2q'
      },
      tls: {
        rejectUnauthorized: false // For compatibility
      }
    })

    // Email options
    const mailOptions = {
      from: '"Tender Manager" <emailer@ok5pr0.mailer91.com>',
      to: to,
      subject: subject,
      html: html
    }

    // Send email
    const info = await transporter.sendMail(mailOptions)

    console.log('Email sent successfully:', info.messageId)

    return res.status(200).json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('Failed to send email:', error)
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    })
  }
}

