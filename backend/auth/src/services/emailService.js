const nodemailer = require('nodemailer');

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const buildHtmlTemplate = (otp, type) => {
  const title =
    type === 'EMAIL_VERIFY' ? 'Verify Your Email Address' : 'Reset Your Password';
  const subtext =
    type === 'EMAIL_VERIFY'
      ? 'Use the code below to verify your FinTracker account.'
      : 'Use the code below to reset your FinTracker password.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0d14;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d14;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#111827;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                Fin<span style="color:#00d4aa;">Tracker</span>
              </div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;letter-spacing:1px;text-transform:uppercase;">
                Built for India
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#f9fafb;">${title}</h2>
              <p style="margin:0 0 28px;font-size:14px;color:#9ca3af;line-height:1.6;">${subtext}</p>

              <!-- OTP Block -->
              <div style="background:#0d1117;border:1px solid rgba(0,212,170,0.3);border-radius:10px;padding:20px;text-align:center;margin-bottom:28px;">
                <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">Your one-time code</div>
                <span style="display:block;font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:800;letter-spacing:10px;color:#00d4aa;line-height:1;">
                  ${otp}
                </span>
              </div>

              <!-- Expiry -->
              <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;">
                ⏱ This code expires in <strong style="color:#f9fafb;">10 minutes</strong>.
              </p>

              <!-- Security Warning -->
              <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px 16px;">
                <p style="margin:0;font-size:12.5px;color:#fca5a5;line-height:1.5;">
                  🔒 <strong>Do not share this code with anyone.</strong> FinTracker will never ask you for this OTP over phone, chat, or email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11.5px;color:#4b5563;text-align:center;">
                If you did not request this, please ignore this email. Your account remains secure.<br />
                &copy; 2026 FinTracker &mdash; Built for India
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const sendOTPEmail = async (toEmail, otp, type) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[EMAIL CONFIG ERROR] EMAIL_USER and EMAIL_PASS must be configured on the auth service.');
    throw new Error('Email delivery is not configured. Please contact support.');
  }

  // Validate EMAIL_USER looks like an email address
  if (!process.env.EMAIL_USER.includes('@')) {
    console.error(
      `[EMAIL CONFIG ERROR] EMAIL_USER="${process.env.EMAIL_USER}" is not a valid email address. ` +
      `Set it to your full Gmail address (e.g., user@gmail.com). OTP for ${toEmail}: ${otp}`
    );
    return;
  }

  const subject =
    type === 'EMAIL_VERIFY'
      ? 'FinTracker — Verify your email'
      : 'FinTracker — Reset your password';

  try {
    await getTransporter().sendMail({
      from: `"FinTracker" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html: buildHtmlTemplate(otp, type),
    });
    console.log(`[EMAIL] OTP sent successfully to ${toEmail}`);
  } catch (err) {
    // Provide clear guidance for common Gmail SMTP errors
    if (err.message.includes('535') || err.message.includes('Username and Password not accepted')) {
      console.error(
        `[EMAIL AUTH ERROR] Gmail rejected credentials. Make sure:\n` +
        `  1. EMAIL_USER is your full Gmail address\n` +
        `  2. EMAIL_PASS is a Google App Password (not your account password)\n` +
        `  3. 2-Step Verification is enabled on your Google account\n` +
        `  Generate App Password at: https://myaccount.google.com/apppasswords`
      );
    } else {
      console.error(`[EMAIL ERROR] Failed to send to ${toEmail}:`, err.message);
    }
    throw new Error(`Failed to send OTP email. Please try again or contact support.`);
  }
};

module.exports = { sendOTPEmail };
