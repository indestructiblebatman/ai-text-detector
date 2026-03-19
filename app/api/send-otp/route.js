import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const otpStore = new Map();

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !email.trim()) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minute expiry

    // Store OTP with expiry
    otpStore.set(email, { otp, expiry });

    // Send email via Resend
    await resend.emails.send({
      from: 'Verascript <onboarding@resend.dev>',
      to: email,
      subject: 'Your Verascript verification code',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">Verascript</h2>
          <p style="color: #666; margin-bottom: 32px;">Your verification code is:</p>
          <div style="font-size: 48px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 24px; background: #f5f5f5; border-radius: 8px; margin-bottom: 24px;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">If you didn't request this, ignore this email.</p>
        </div>
      `
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Verification code sent' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending OTP:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send verification code' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const code = searchParams.get('code');

    if (!email || !code) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'missing' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const record = otpStore.get(email);

    if (!record) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'expired' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (Date.now() > record.expiry) {
      otpStore.delete(email);
      return new Response(
        JSON.stringify({ valid: false, reason: 'expired' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if code matches
    if (record.otp !== code) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'invalid' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Valid! Delete the OTP and return success
    otpStore.delete(email);
    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return new Response(
      JSON.stringify({ valid: false, reason: 'error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
