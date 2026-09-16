const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts/styles for simple static app
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiter: Max 15 requests per 15 minutes per IP
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many email requests from this IP. Please try again after 15 minutes.'
  }
});

// Cache for Ethereal test transporter if no live credentials provided
let etherealTransporter = null;

/**
 * Creates and returns a Nodemailer transporter based on environment variables.
 * Falls back to an automatic Ethereal test account if no credentials are configured.
 */
async function getTransporter() {
  // Option 1: Gmail App Password
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const cleanPass = process.env.GMAIL_APP_PASSWORD.trim().replace(/\s+/g, '');
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // use STARTTLS on port 587 for maximum compatibility
        auth: {
          user: process.env.GMAIL_USER.trim(),
          pass: cleanPass
        },
        connectionTimeout: 10000
      }),
      isTestAccount: false,
      sender: process.env.GMAIL_USER.trim()
    };
  }

  // Option 2: Gmail OAuth2
  if (
    process.env.GMAIL_USER &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  ) {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.GMAIL_USER,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN
        }
      }),
      isTestAccount: false,
      sender: process.env.GMAIL_USER
    };
  }

  // Option 3: Custom SMTP
  if (process.env.SMTP_HOST) {
    return {
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        } : undefined
      }),
      isTestAccount: false,
      sender: process.env.SENDER_EMAIL || process.env.SMTP_USER || 'noreply@gmail.com'
    };
  }

  // Option 4: Ethereal Dev/Test Fallback
  if (!etherealTransporter) {
    console.log('ℹ️ No live email credentials configured in .env. Initializing Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    console.log(`✅ Ethereal Test Account initialized: ${testAccount.user}`);
    etherealTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  return {
    transporter: etherealTransporter,
    isTestAccount: true,
    sender: process.env.SENDER_EMAIL || 'noreply@gmail.com'
  };
}

/**
 * Validation helper function
 */
function validateEmailInput(email, message) {
  const errors = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('Recipient email is required.');
  } else if (!emailRegex.test(email.trim())) {
    errors.push('Please enter a valid email address.');
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    errors.push('Message text is required.');
  } else if (message.length > 10000) {
    errors.push('Message exceeds the maximum length of 10,000 characters.');
  }

  return errors;
}

// Send Email API Endpoint
app.post('/api/send-email', emailLimiter, async (req, res) => {
  try {
    const { email, message, subject, senderName } = req.body || {};

    // 1. Validate inputs
    const validationErrors = validateEmailInput(email, message);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(' ')
      });
    }

    const cleanEmail = email.trim();
    const cleanMessage = message.trim();
    const cleanSubject = (subject && typeof subject === 'string' && subject.trim()) 
      ? subject.trim() 
      : 'Test Email';
    const cleanSenderName = (senderName && typeof senderName === 'string' && senderName.trim())
      ? senderName.trim()
      : 'Test Email Sender';

    // 2. Get Mail Transporter
    const { transporter, isTestAccount, sender } = await getTransporter();

    // 3. Send Email
    const mailOptions = {
      from: `"${cleanSenderName.replace(/"/g, '')}" <${sender}>`,
      to: cleanEmail,
      subject: cleanSubject,
      text: cleanMessage,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333;">
        <h2 style="color: #4f46e5; margin-top: 0;">Test Email</h2>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 15px; white-space: pre-wrap;">${cleanMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280;">Sent via Simple Test Email Sender App</p>
      </div>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${cleanEmail}. Message ID: ${info.messageId}`);

    let previewUrl = null;
    if (isTestAccount) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`🔗 Ethereal Preview URL: ${previewUrl}`);
      }
    }

    // 4. Return success response
    return res.status(200).json({
      success: true,
      message: 'Email sent successfully.',
      recipient: cleanEmail,
      isTestMode: isTestAccount,
      previewUrl: previewUrl || undefined
    });

  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    
    // Do not expose internal server/credential details to client
    return res.status(500).json({
      success: false,
      message: 'Failed to send email. Please try again.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
