const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send OTP Email
const sendOTPEmail = async (email, otp, userType) => {
  try {
    console.log('🔧 Email configuration check:');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
    
    const transporter = createTransporter();
    
    // Test the connection
    console.log('🔍 Testing email connection...');
    await transporter.verify();
    console.log('✅ Email connection verified successfully');
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `FreshNest - Email Verification Code`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification - FreshNest</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #004030;">
              <h1 style="color: #004030; margin: 0; font-size: 32px; font-weight: bold;">
                Fresh<span style="color: #437057;">Nest</span>
              </h1>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Fresh Groceries, Delivered Fresh</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px; text-align: center;">
              <h2 style="color: #004030; margin-bottom: 20px; font-size: 24px;">Email Verification Required</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                Welcome to FreshNest! To complete your ${userType === 'retailer' ? 'retailer' : 'user'} registration, please verify your email address using the verification code below:
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #f8f9fa; border: 2px dashed #437057; border-radius: 10px; padding: 30px; margin: 30px 0;">
                <p style="color: #004030; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Your Verification Code</p>
                <div style="font-size: 36px; font-weight: bold; color: #004030; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otp}
                </div>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
                ⏰ This code will expire in <strong>10 minutes</strong> for security reasons.
              </p>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If you didn't create an account with FreshNest, please ignore this email or contact our support team.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #eee; padding: 20px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 10px 10px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2024 FreshNest. All rights reserved.<br>
                This is an automated email, please do not reply.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `,
      text: `
        FreshNest - Email Verification
        
        Welcome to FreshNest! 
        
        Your verification code is: ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't create an account with FreshNest, please ignore this email.
        
        © 2024 FreshNest. All rights reserved.
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    console.log(`📧 Message ID: ${result.messageId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    
    // Fallback: Log OTP to console for development
    console.log(`🔄 FALLBACK - OTP for ${email}: ${otp}`);
    console.log(`👤 User Type: ${userType}`);
    console.log(`⏰ Valid for 10 minutes`);
    
    return false;
  }
};

// Send Password Reset Email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    console.log('🔧 Sending password reset email to:', email);
    
    const transporter = createTransporter();
    
    // Test the connection
    console.log('🔍 Testing email connection...');
    await transporter.verify();
    console.log('✅ Email connection verified successfully');
    
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `FreshNest - Password Reset Request`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - FreshNest</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #004030;">
              <h1 style="color: #004030; margin: 0; font-size: 32px; font-weight: bold;">
                Fresh<span style="color: #437057;">Nest</span>
              </h1>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Fresh Groceries, Delivered Fresh</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px; text-align: center;">
              <h2 style="color: #004030; margin-bottom: 20px; font-size: 24px;">Password Reset Request</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                We received a request to reset your password for your FreshNest account. Click the button below to create a new password:
              </p>
              
              <!-- Reset Button -->
              <div style="margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #004030; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Reset My Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
                ⏰ This link will expire in <strong>1 hour</strong> for security reasons.
              </p>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If you didn't request a password reset, please ignore this email or contact our support team if you have concerns.
              </p>
              
              <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #437057;">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  <strong>Can't click the button?</strong> Copy and paste this link into your browser:<br>
                  <span style="word-break: break-all; color: #004030;">${resetUrl}</span>
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #eee; padding: 20px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 10px 10px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2024 FreshNest. All rights reserved.<br>
                This is an automated email, please do not reply.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `,
      text: `
        FreshNest - Password Reset Request
        
        We received a request to reset your password for your FreshNest account.
        
        Click this link to reset your password: ${resetUrl}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request a password reset, please ignore this email.
        
        © 2024 FreshNest. All rights reserved.
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent successfully to ${email}`);
    console.log(`📧 Message ID: ${result.messageId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    
    // Fallback: Log reset link to console for development
    console.log(`🔄 FALLBACK - Password reset link for ${email}:`);
    console.log(`🔗 http://localhost:5173/reset-password?token=${resetToken}`);
    console.log(`⏰ Valid for 1 hour`);
    
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail
};