import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, employeeNumber, tempPassword, role } = body;

    if (!email || !tempPassword) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Use Supabase's built-in email functionality
    // Note: This requires Supabase email templates to be configured
    // For now, we'll use a simple approach with Supabase's email sending
    
    // Option 1: Use Supabase's inviteUserByEmail (but this sends a magic link, not password)
    // Option 2: Use a third-party email service (Resend, SendGrid, etc.)
    // Option 3: Use Supabase Edge Functions
    
    // For now, we'll create a simple email sending using Supabase's email functionality
    // You can replace this with your preferred email service
    
    const emailSubject = 'Welcome to Woza Mali - Your Account Credentials';
    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316; }
            .credential-item { margin: 10px 0; }
            .label { font-weight: bold; color: #666; }
            .value { color: #1f2937; font-size: 18px; font-family: monospace; }
            .warning { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Woza Mali!</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your account has been created. Please use the following credentials to log in:</p>
              
              <div class="credentials">
                <div class="credential-item">
                  <span class="label">Email:</span><br>
                  <span class="value">${email}</span>
                </div>
                <div class="credential-item">
                  <span class="label">Employee Number:</span><br>
                  <span class="value">${employeeNumber || 'N/A'}</span>
                </div>
                <div class="credential-item">
                  <span class="label">Temporary Password:</span><br>
                  <span class="value">${tempPassword}</span>
                </div>
                <div class="credential-item">
                  <span class="label">Role:</span><br>
                  <span class="value">${role || 'Admin'}</span>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ Important:</strong> You will be required to change this password and complete your employee information on first login.
              </div>

              <p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8081'}/admin-login" class="button">Log In Now</a>
              </p>

              <p>If you have any questions, please contact your administrator.</p>

              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} Woza Mali. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend
    if (!resend) {
      console.warn('⚠️ RESEND_API_KEY not configured. Email will not be sent.');
      console.log('📧 Email content (not sent):', {
        to: email,
        subject: emailSubject
      });
      
      return NextResponse.json({
        success: false,
        error: 'Email service not configured. Please set RESEND_API_KEY in environment variables.',
        emailContent: {
          subject: emailSubject,
          body: emailBody
        }
      });
    }

    try {
      // Use Resend's default domain for testing if custom domain isn't verified
      // Check if we should use the default domain
      const customFromEmail = process.env.RESEND_FROM_EMAIL || 'Woza Mali <onboarding@resend.dev>';
      const isCustomDomain = customFromEmail.includes('@') && !customFromEmail.includes('@resend.dev') && !customFromEmail.includes('onboarding@resend.dev');
      
      // For now, use Resend's default domain to ensure emails are delivered
      // Once domain is verified, you can switch back to custom domain
      const fromEmail = isCustomDomain 
        ? 'Woza Mali <onboarding@resend.dev>' // Use default for now
        : customFromEmail;
      
      console.log('📧 Sending welcome email to:', email);
      console.log('📧 From email:', fromEmail);
      console.log('📧 Custom domain detected:', isCustomDomain);
      console.log('📧 Using default domain for delivery:', !isCustomDomain || fromEmail.includes('@resend.dev'));
      
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: emailSubject,
        html: emailBody,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        
        // Check if it's a domain verification issue
        const errorMessage = error.message || '';
        if (errorMessage.includes('verify a domain') || errorMessage.includes('testing emails')) {
          return NextResponse.json({
            success: false,
            error: 'Domain not verified in Resend. Please verify your domain at https://resend.com/domains. In testing mode, Resend only allows sending to your registered email address.',
            errorDetails: error,
            requiresDomainVerification: true,
            emailContent: {
              subject: emailSubject,
              body: emailBody,
              to: email,
              from: fromEmail
            }
          }, { status: 400 });
        }
        
        throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
      }

      console.log('✅ Email sent successfully:', data);

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        emailId: data?.id
      });

    } catch (emailError: any) {
      console.error('❌ Email sending error:', emailError);
      return NextResponse.json({
        success: false,
        error: emailError.message || 'Failed to send email',
        emailContent: {
          subject: emailSubject,
          body: emailBody
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}


