const crypto = require('crypto');
const User = require('../models/User');
const OTPToken = require('../models/OTPToken');
const Portfolio = require('../models/Portfolio');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../services/tokenService');
const { sendOTPEmail } = require('../services/emailService');
const { success, error } = require('../utils/response');

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return error(res, 'All fields are required', 400);
    }
    if (password !== confirmPassword) {
      return error(res, 'Passwords do not match', 400);
    }
    if (password.length < 6) {
      return error(res, 'Password must be at least 6 characters', 400);
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return error(res, 'Email already registered', 409);
    }

    const user = await User.create({ name, email, password });

    // Create default portfolio for this user
    await Portfolio.create({ userId: user._id });

    // Generate and store OTP
    const otp = generateOTP();
    await OTPToken.create({
      userId: user._id,
      token: otp,
      type: 'EMAIL_VERIFY',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send email asynchronously so it doesn't block the response and cause Vercel 502 timeouts
    sendOTPEmail(email, otp, 'EMAIL_VERIFY').catch(err => console.error('Background email failed:', err));

    return success(
      res,
      { userId: user._id },
      'Registered successfully. Check your email for the OTP.',
      201
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-email
const verifyEmail = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return error(res, 'userId and otp are required', 400);
    }

    const record = await OTPToken.findOne({
      userId,
      token: otp,
      type: 'EMAIL_VERIFY',
      used: false,
    });

    if (!record) {
      return error(res, 'Invalid or expired OTP', 400);
    }
    if (record.expiresAt < new Date()) {
      return error(res, 'OTP has expired', 400);
    }

    record.used = true;
    await record.save();

    await User.findByIdAndUpdate(userId, { isVerified: true });

    return success(res, {}, 'Email verified successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 'Email and password are required', 400);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return error(res, 'Invalid credentials', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return error(res, 'Invalid credentials', 401);
    }

    if (!user.isVerified) {
      return error(res, 'Please verify your email before logging in', 403);
    }

    // Update lastSeen
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return success(res, {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return error(res, 'Refresh token is required', 400);
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return error(res, 'User not found', 401);
    }

    const newAccessToken = generateAccessToken(user._id);
    return success(res, { accessToken: newAccessToken });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return error(res, 'Invalid or expired refresh token', 401);
    }
    next(err);
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return error(res, 'Email is required', 400);
    }

    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    if (!user) {
      return success(res, {}, 'If that email exists, an OTP has been sent');
    }

    // Delete any existing reset OTPs
    await OTPToken.deleteMany({ userId: user._id, type: 'PASSWORD_RESET' });

    const otp = generateOTP();
    await OTPToken.create({
      userId: user._id,
      token: otp,
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send email asynchronously so it doesn't block the response and cause Vercel 502 timeouts
    sendOTPEmail(email, otp, 'PASSWORD_RESET').catch(err => console.error('Background email failed:', err));

    return success(res, { userId: user._id }, 'OTP sent to your email');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { userId, otp, newPassword } = req.body;

    if (!userId || !otp || !newPassword) {
      return error(res, 'userId, otp, and newPassword are required', 400);
    }
    if (newPassword.length < 6) {
      return error(res, 'Password must be at least 6 characters', 400);
    }

    const record = await OTPToken.findOne({
      userId,
      token: otp,
      type: 'PASSWORD_RESET',
      used: false,
    });

    if (!record || record.expiresAt < new Date()) {
      return error(res, 'Invalid or expired OTP', 400);
    }

    record.used = true;
    await record.save();

    const user = await User.findById(userId);
    user.password = newPassword; // pre-save hook hashes it
    await user.save();

    return success(res, {}, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  // Client discards the tokens
  return success(res, {}, 'Logged out successfully');
};

// POST /api/auth/resend-otp
const resendOtp = async (req, res, next) => {
  try {
    const { userId, type } = req.body;

    if (!userId || !type) {
      return error(res, 'userId and type are required', 400);
    }
    if (!['EMAIL_VERIFY', 'PASSWORD_RESET'].includes(type)) {
      return error(res, 'type must be EMAIL_VERIFY or PASSWORD_RESET', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return error(res, 'User not found', 404);
    }

    // Rate limit: max 3 resend attempts per 15 minutes per userId+type
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);
    const recentCount = await OTPToken.countDocuments({
      userId,
      type,
      createdAt: { $gte: windowStart },
    });
    if (recentCount >= 3) {
      return error(res, 'Too many OTP requests. Please wait 15 minutes before trying again.', 429);
    }

    // Delete existing unused OTPs of this type for this user
    await OTPToken.deleteMany({ userId, type, used: false });

    // Generate and store new OTP
    const otp = generateOTP();
    await OTPToken.create({
      userId,
      token: otp,
      type,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send email asynchronously so it doesn't block the response and cause Vercel 502 timeouts
    sendOTPEmail(user.email, otp, type).catch(err => console.error('Background email failed:', err));

    return success(res, {}, 'OTP resent successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, verifyEmail, login, refreshToken, forgotPassword, resetPassword, logout, resendOtp };
