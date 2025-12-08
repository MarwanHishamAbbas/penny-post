import nodemailer from 'nodemailer';
import logger from './winston';
import { env } from '@/config/env';

// Email configuration (use environment variables in production)
const emailConfig = {
  host: env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: env.SMTP_USER || 'ethereal.user@example.com',
    pass: env.SMTP_PASS || 'ethereal.pass',
  },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify connection
transporter.verify((error) => {
  if (error) {
    logger.error('Email service error:', error);
  } else {
    logger.info('Email service ready');
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const mailOptions = {
      from: `Penny Post <${env.SMTP_FROM || 'noreply@example.com'}>`,
      ...options,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent:', {
      to: options.to,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    });

    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string,
  verificationUrl: string,
): Promise<boolean> {
  const subject = 'Verify Your Email Address';
  const verificationLink = `${verificationUrl}?token=${verificationToken}`;

  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Penny Post </h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2>Hi ${name},</h2>
          <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="background: #eee; padding: 10px; border-radius: 5px; word-break: break-all;">
            <a href="${verificationLink}" style="color: #667eea; text-decoration: none;">
              ${verificationLink}
            </a>
          </p>
          
          <p>This verification link will expire in <strong>24 hours</strong>.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>If you didn't create an account with us, please ignore this email.</p>
            <p>Need help? <a href="mailto:support@pennypost.com" style="color: #667eea;">Contact our support team</a></p>
            <p>© ${new Date().getFullYear()} Penny Post . All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

  const text = `
      Verify Your Email Address
      
      Hi ${name},
      
      Thank you for registering! Please verify your email address by visiting:
      
      ${verificationLink}
      
      This verification link will expire in 24 hours.
      
      If you didn't create an account with us, please ignore this email.
      
      Need help? Contact: support@pennypost.com
      
      © ${new Date().getFullYear()} Penny Post . All rights reserved.
    `;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}
