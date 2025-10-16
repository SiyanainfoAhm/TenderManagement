// Local Email Server for Development (CommonJS version)
const express = require('express')
const nodemailer = require('nodemailer')
const cors = require('cors')

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())

// ============================================
// GMAIL SMTP CONFIGURATION
// ============================================
const GMAIL_USER = 'jollyhires.dev@gmail.com'
const GMAIL_APP_PASSWORD = 'mplvbkrfdiyuzuzd'  // App Password: mplv bkrf diyu zuzd (without spaces)

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  }
})

// Test email configuration on startup
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Gmail SMTP Connection Error:', error.message)
    console.log('⚠️  Please check your Gmail App Password!')
  } else {
    console.log('✅ Gmail SMTP is ready to send emails')
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
  console.log(`📮 From: ${GMAIL_USER}`)

  try {
    const mailOptions = {
      from: `"Tender Manager" <${GMAIL_USER}>`,
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
    console.error('❌ Failed to send email:', error.message)
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Email Server',
    provider: 'Gmail',
    email: GMAIL_USER
  })
})

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50))
  console.log('📧 Email Server Started!')
  console.log('='.repeat(50))
  console.log(`🌐 Server running on: http://localhost:${PORT}`)
  console.log(`📨 Email endpoint: http://localhost:${PORT}/api/send-email`)
  console.log(`✅ SMTP Provider: Gmail (${GMAIL_USER})`)
  console.log(`📧 Sender: Tender Manager <${GMAIL_USER}>`)
  console.log('='.repeat(50))
  console.log('\n✨ Ready to send invitation emails via Gmail!\n')
})

