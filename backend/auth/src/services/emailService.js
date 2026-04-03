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

const sendOTPEmail = async (toEmail, otp, type) => {
  // In development, just log the OTP
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n[DEV EMAIL] To: ${toEmail} | Type: ${type} | OTP: ${otp}\n`);
    return;
  }

  const subject =
    type === 'EMAIL_VERIFY' ? 'FinTracker — Verify your email' : 'FinTracker — Reset your password';

  const body =
    type === 'EMAIL_VERIFY'
      ? `Your email verification OTP is: <strong>${otp}</strong>. Expires in 10 minutes.`
      : `Your password reset OTP is: <strong>${otp}</strong>. Expires in 10 minutes.`;

  await getTransporter().sendMail({
    from: `"FinTracker" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    html: `<p>${body}</p>`,
  });
};

module.exports = { sendOTPEmail };
