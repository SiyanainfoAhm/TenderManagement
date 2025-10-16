// Direct test of Gmail SMTP
const nodemailer = require('nodemailer')

console.log('Testing Gmail SMTP connection...\n')

const GMAIL_USER = 'jollyhires.dev@gmail.com'
const GMAIL_APP_PASSWORD = 'mplvbkrfdiyuzuzd'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  }
})

console.log('Configuration:')
console.log('Email:', GMAIL_USER)
console.log('Password:', GMAIL_APP_PASSWORD.substring(0, 4) + '****')
console.log('\nVerifying connection...\n')

transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ SMTP Connection Failed!')
    console.log('Error:', error.message)
    console.log('\n🔧 Possible fixes:')
    console.log('1. Verify app password is correct')
    console.log('2. Enable 2-Step Verification in Gmail')
    console.log('3. Generate new app password at: https://myaccount.google.com/apppasswords')
    process.exit(1)
  } else {
    console.log('✅ Gmail SMTP connection successful!')
    console.log('\nTrying to send test email...\n')
    
    // Send test email
    transporter.sendMail({
      from: `"Tender Manager" <${GMAIL_USER}>`,
      to: 'saxena.jatin1987@gmail.com',
      subject: 'Test Email from Tender Manager',
      html: '<h1>Hello!</h1><p>This is a test email from Tender Manager using Gmail SMTP.</p>'
    }, (err, info) => {
      if (err) {
        console.log('❌ Failed to send email:', err.message)
        process.exit(1)
      } else {
        console.log('✅ Email sent successfully!')
        console.log('Message ID:', info.messageId)
        console.log('Response:', info.response)
        console.log('\n🎉 Gmail SMTP is working perfectly!')
        console.log('📧 Check saxena.jatin1987@gmail.com inbox!')
        process.exit(0)
      }
    })
  }
})

