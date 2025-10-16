// Local Email Server for Development
// Run this to test email sending on localhost
import express from 'express'
import nodemailer from 'nodemailer'
import cors from 'cors'

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())

// ============================================
// EMAIL CONFIGURATION - Choose one:
// ============================================

// OPTION 1: Gmail SMTP (Recommended for Testing)
const USE_GMAIL = true  // Set to true to use Gmail
const GMAIL_USER = 'jollyhires.dev@gmail.com'
const GMAIL_APP_PASSWORD = 'mplvbkrfdiyuzuzd'  // Gmail App Password

// OPTION 2: MSG91 SMTP
const MSG91_USER = 'emailer@ok5pr0.mailer91.com'
const MSG91_PASS = 'TF5mOPAURXYqoX2q'

// Create transporter based on choice
const transporter = nodemailer.createTransport(
  USE_GMAIL ? {
    // Gmail SMTP Configuration
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD
    }
  } : {
    // MSG91 SMTP Configuration
    host: 'smtp.mailer91.com',
    port: 587,
    secure: false,
    auth: {
      user: MSG91_USER,
      pass: MSG91_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  }
)

// Test email configuration on startup
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ SMTP Connection Error:', error)
  } else {
    console.log('✅ SMTP Server is ready to send emails')
  }
})

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body

  if (!to || !subject || !html) {
    return res.status(400).json({ 
      error: 'Missing required fields: to, subject, html' 
    })
  }

  console.log(`\n📧 Sending email to: ${to}`)
  console.log(`📝 Subject: ${subject}`)

  try {
    const mailOptions = {
      from: USE_GMAIL 
        ? `"Tender Manager" <${GMAIL_USER}>`
        : '"Tender Manager" <emailer@ok5pr0.mailer91.com>',
      to: to,
      subject: subject,
      html: html
    }

    const info = await transporter.sendMail(mailOptions)

    console.log('✅ Email sent successfully!')
    console.log('📨 Message ID:', info.messageId)
    console.log('📬 Response:', info.response)

    res.status(200).json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('❌ Failed to send email:', error)
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Email Server' })
})

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50))
  console.log('📧 Email Server Started!')
  console.log('='.repeat(50))
  console.log(`🌐 Server running on: http://localhost:${PORT}`)
  console.log(`📨 Email endpoint: http://localhost:${PORT}/api/send-email`)
  console.log(`✅ SMTP Provider: ${USE_GMAIL ? `Gmail (${GMAIL_USER})` : 'MSG91'}`)
  console.log('='.repeat(50))
  console.log('\n✨ Ready to send invitation emails!\n')
})

