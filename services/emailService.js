const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  const service = (process.env.EMAIL_SERVICE || '').toLowerCase();

  if (service === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // For Gmail, use an App Password if 2FA is enabled
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: String(process.env.EMAIL_PORT) === '465', // secure if using port 465
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
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
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
    
    const frontendBase = process.env.FRONTEND_BASE_URL || 'https://saranyamariajohnson48.github.io/freshnest-frontend';
    const resetUrl = `${frontendBase}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
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

// Send Staff Welcome Email
const sendStaffWelcomeEmail = async (email, staffData) => {
  try {
    console.log('🔧 Sending staff welcome email to:', email);
    
    const transporter = createTransporter();
    
    // Test the connection
    console.log('🔍 Testing email connection...');
    await transporter.verify();
    console.log('✅ Email connection verified successfully');
    
    const { fullName, username, password, employeeId } = staffData;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `Welcome to FreshNest Team - Your Account Details`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to FreshNest Team</title>
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
            <div style="padding: 30px 20px;">
              <h2 style="color: #004030; margin-bottom: 20px; font-size: 24px; text-align: center;">🎉 Welcome to the Team!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Dear <strong>${fullName}</strong>,
              </p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                Welcome to FreshNest! We're excited to have you join our team. Your staff account has been created successfully. Below are your login credentials and important information:
              </p>
              
              <!-- Credentials Box -->
              <div style="background-color: #f8f9fa; border: 2px solid #437057; border-radius: 10px; padding: 25px; margin: 30px 0;">
                <h3 style="color: #004030; margin-top: 0; margin-bottom: 20px; text-align: center;">Your Account Details</h3>
                
                <div style="margin-bottom: 15px;">
                  <strong style="color: #004030;">Employee ID:</strong>
                  <span style="background-color: #e8f5e8; padding: 5px 10px; border-radius: 5px; font-family: 'Courier New', monospace; margin-left: 10px;">${employeeId}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <strong style="color: #004030;">Username/Email:</strong>
                  <span style="background-color: #e8f5e8; padding: 5px 10px; border-radius: 5px; font-family: 'Courier New', monospace; margin-left: 10px;">${username}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <strong style="color: #004030;">Temporary Password:</strong>
                  <span style="background-color: #fff3cd; padding: 5px 10px; border-radius: 5px; font-family: 'Courier New', monospace; margin-left: 10px;">${password}</span>
                </div>
              </div>
              
              <!-- Login Instructions -->
              <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h4 style="color: #1976d2; margin-top: 0;">🔐 First Login Instructions:</h4>
                <ol style="color: #666; margin: 0; padding-left: 20px;">
                  <li>Visit the FreshNest staff login page</li>
                  <li>Use your username/email and temporary password above</li>
                  <li><strong>Important:</strong> Change your password immediately after first login</li>
                  <li>Complete your profile information</li>
                </ol>
              </div>
              
              <!-- Security Notice -->
              <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h4 style="color: #f57c00; margin-top: 0;">🔒 Security Reminder:</h4>
                <ul style="color: #666; margin: 0; padding-left: 20px;">
                  <li>Keep your login credentials secure and confidential</li>
                  <li>Never share your password with anyone</li>
                  <li>Log out when you finish your work session</li>
                  <li>Report any suspicious activity immediately</li>
                </ul>
              </div>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                If you have any questions or need assistance, please don't hesitate to contact your supervisor or the IT support team.
              </p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                We look forward to working with you!
              </p>
              
              <p style="color: #004030; font-size: 16px; font-weight: bold; margin-top: 30px;">
                Best regards,<br>
                The FreshNest Team
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
        Welcome to FreshNest Team!
        
        Dear ${fullName},
        
        Welcome to FreshNest! Your staff account has been created successfully.
        
        Your Account Details:
        - Employee ID: ${employeeId}
        - Username/Email: ${username}
        - Temporary Password: ${password}
        
        First Login Instructions:
        1. Visit the FreshNest staff login page
        2. Use your username/email and temporary password above
        3. IMPORTANT: Change your password immediately after first login
        4. Complete your profile information
        
        Security Reminder:
        - Keep your login credentials secure and confidential
        - Never share your password with anyone
        - Log out when you finish your work session
        - Report any suspicious activity immediately
        
        If you have any questions, please contact your supervisor or IT support.
        
        Best regards,
        The FreshNest Team
        
        © 2024 FreshNest. All rights reserved.
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Staff welcome email sent successfully to ${email}`);
    console.log(`📧 Message ID: ${result.messageId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending staff welcome email:', error);
    
    // Fallback: Log credentials to console for development
    console.log(`🔄 FALLBACK - Staff credentials for ${email}:`);
    console.log(`👤 Employee ID: ${staffData.employeeId}`);
    console.log(`📧 Username: ${staffData.username}`);
    console.log(`🔑 Password: ${staffData.password}`);
    
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendStaffWelcomeEmail,
  sendSupplierOnboardingEmail: async (email, supplierName = 'Supplier') => {
    try {
      const transporter = createTransporter();
      await transporter.verify();

      const subject = 'FreshNest – Supplier Onboarding: Document Submission Request';
      const frontendBase = process.env.FRONTEND_BASE_URL || 'https://saranyamariajohnson48.github.io/freshnest-frontend';
      const formUrl = process.env.ONBOARDING_FORM_URL || `${frontendBase}/SupplierOnboardingPublic.jsx`;
      console.log('📧 Supplier onboarding email link:', formUrl);
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Supplier Onboarding - FreshNest</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #004030;">
              <h1 style="color: #004030; margin: 0; font-size: 32px; font-weight: bold;">Fresh<span style="color: #437057;">Nest</span></h1>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Fresh Groceries, Delivered Fresh</p>
            </div>

            <div style="padding: 30px 20px;">
              <h2 style="color: #004030; margin-bottom: 20px; font-size: 22px; text-align: center;">Supplier Onboarding – Document Submission</h2>
              <p style="color: #444; font-size: 15px; line-height: 1.7;">Hello <strong>${supplierName}</strong>,</p>
              <p style="color: #444; font-size: 15px; line-height: 1.7;">We are initiating your onboarding as a supplier with FreshNest. Please reply to this email with the following digital documents/details:</p>

              <div style="background-color: #f8f9fa; border: 2px dashed #437057; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <ol style="color: #004030; font-size: 15px; line-height: 1.9; padding-left: 18px; margin: 0;">
                  <li>Business Registration/License Number</li>
                  <li>GST/Tax Identification Number</li>
                  <li>Bank Details (Account name, number, IFSC/SWIFT)</li>
                  <li>Product Catalog (PDF/Sheet) and Pricing List</li>
                  <li>Quality Certifications (if any): ISO/HACCP/etc.</li>
                  <li>Delivery Terms & Lead Times</li>
                  <li>Primary Contact Details (Name, Email, Phone, Address)</li>
                </ol>
              </div>

              <p style="color: #666; font-size: 14px;">Optional: Any existing references or client list.</p>
              <div style="text-align:center; margin-top:28px;">
                <a href="${formUrl}" target="_blank" rel="noopener noreferrer" style="background-color:#004030; color:#ffffff; padding:12px 18px; text-decoration:none; border-radius:8px; font-weight:bold;">Open Supplier Onboarding Form</a>
              </div>
              <p style="color: #444; font-size: 15px; line-height: 1.7; margin-top: 24px;">Thank you,<br><strong>FreshNest Procurement Team</strong></p>
            </div>

            <div style="border-top: 1px solid #eee; padding: 20px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 10px 10px;">
              <p style="color: #999; font-size: 12px; margin: 0;">© 2024 FreshNest. All rights reserved.<br>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject,
        html,
        text: `Supplier Onboarding – Document Submission\n\nHello ${supplierName},\n\nPlease reply with: 1) Business License, 2) GST/Tax ID, 3) Bank details, 4) Product catalog and pricing, 5) Certifications, 6) Delivery terms & lead times, 7) Primary contact details.\n\nThank you,\nFreshNest Procurement Team`
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Supplier onboarding email sent to ${email} (id: ${result.messageId})`);
      return true;
    } catch (err) {
      console.error('❌ Error sending supplier onboarding email:', err);
      return false;
    }
  }
};