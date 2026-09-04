'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { authApi } from '@/services/api';
import PasswordInput from '@/components/ui/PasswordInput';
import PasswordStrength from '@/components/ui/PasswordStrength';

export default function LandingPage({ onLogin }) {
  const [mode, setMode] = useState('hero');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [name, setName] = useState('');
  // OTP state: 6 individual boxes
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const [userId, setUserId] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shake, setShake] = useState(false);
  // OTP countdown timer (seconds)
  const [otpTimer, setOtpTimer] = useState(0);
  const timerRef = useRef(null);
  // Forgot/Reset password state
  const [resetUserId, setResetUserId] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [resetOtp, setResetOtp] = useState('');

  // ── OTP timer ────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setOtpTimer(600);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setOtpTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (mode === 'otp') startTimer();
    return () => clearInterval(timerRef.current);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTimer = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Reset form ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setEmail(''); setPass(''); setConfirmPass('');
    setName(''); setOtpDigits(['', '', '', '', '', '']);
    setErrors({}); setApiError('');
    setNewPass(''); setConfirmNewPass(''); setResetOtp('');
    clearInterval(timerRef.current);
  };

  const switchMode = (next) => { resetForm(); setMode(next); };

  // ── Shake helper ──────────────────────────────────────────────────────────
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    const errs = {};
    if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email';
    if (pass.length < 6) errs.pass = 'Password must be at least 6 characters';
    if (pass !== confirmPass) errs.confirmPass = 'Passwords do not match';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({}); setApiError(''); setLoading(true);
    try {
      const data = await authApi.register(name.trim(), email, pass, confirmPass);
      setUserId(data.data.userId);
      switchMode('otp');
    } catch (err) {
      setApiError(err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ── OTP verify ────────────────────────────────────────────────────────────
  const getOtpValue = () => otpDigits.join('');

  const handleOTPVerify = async () => {
    const otp = getOtpValue();
    if (otp.length !== 6) { setErrors({ otp: 'Enter all 6 digits' }); return; }
    setErrors({}); setApiError(''); setLoading(true);
    try {
      await authApi.verifyEmail(userId, otp);
      clearInterval(timerRef.current);
      switchMode('login');
      setTimeout(() => setApiError('Email verified! You can now sign in.'), 50);
    } catch (err) {
      setApiError(err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setApiError(''); setLoading(true);
    try {
      await authApi.resendOtp(userId, 'EMAIL_VERIFY');
      setOtpDigits(['', '', '', '', '', '']);
      startTimer();
      setApiError('New OTP sent!');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email';
    if (!pass) errs.pass = 'Password is required';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({}); setApiError(''); setLoading(true);
    try {
      const data = await authApi.login(email, pass);
      const { accessToken, refreshToken, user } = data.data;
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('fintracker_access_token', accessToken);
      storage.setItem('fintracker_refresh_token', refreshToken);
      // Always also set in localStorage so app-level check works
      if (!rememberMe) {
        localStorage.setItem('fintracker_access_token', accessToken);
        localStorage.setItem('fintracker_refresh_token', refreshToken);
      }
      onLogin(user);
    } catch (err) {
      // Parse 429 Retry-After if present
      if (err.message && err.message.toLowerCase().includes('too many')) {
        setApiError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        setApiError(err.message);
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ───────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrors({ email: 'Enter a valid email' }); return; }
    setErrors({}); setApiError(''); setLoading(true);
    try {
      const data = await authApi.forgotPassword(email);
      const nextUserId = data.data?.userId;
      setResetUserId(nextUserId || null);

      // The API intentionally hides whether an email exists. Only enter the
      // reset form when the server created a reset token for this account.
      if (!nextUserId) {
        setApiError('If that email exists, an OTP has been sent. Check your inbox or try again later.');
        return;
      }

      switchMode('reset');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Reset password ────────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    const errs = {};
    if (!resetOtp || resetOtp.length !== 6) errs.resetOtp = 'Enter the 6-digit OTP';
    if (newPass.length < 6) errs.newPass = 'Password must be at least 6 characters';
    if (newPass !== confirmNewPass) errs.confirmNewPass = 'Passwords do not match';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({}); setApiError(''); setLoading(true);
    try {
      await authApi.resetPassword(resetUserId, resetOtp, newPass);
      switchMode('login');
      setTimeout(() => setApiError('Password reset! You can now sign in.'), 50);
    } catch (err) {
      setApiError(err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ── OTP box key handlers ──────────────────────────────────────────────────
  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[i] = digit;
    setOtpDigits(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
    if (next.join('').length === 6) {
      // Auto-submit
      setTimeout(() => {
        const otp = next.join('');
        if (otp.length === 6) handleOTPVerifyDirect(next.join(''));
      }, 100);
    }
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOTPVerifyDirect = async (otpVal) => {
    if (otpVal.length !== 6) return;
    setErrors({}); setApiError(''); setLoading(true);
    try {
      await authApi.verifyEmail(userId, otpVal);
      clearInterval(timerRef.current);
      switchMode('login');
      setTimeout(() => setApiError('Email verified! You can now sign in.'), 50);
    } catch (err) {
      setApiError(err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ── handleSubmit ──────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (mode === 'register') handleRegister();
    else if (mode === 'login') handleLogin();
    else if (mode === 'otp') handleOTPVerify();
    else if (mode === 'forgot') handleForgotPassword();
    else if (mode === 'reset') handleResetPassword();
  };

  return (
    <div className="landing-page">
      <div className="landing-glow-1" />
      <div className="landing-glow-2" />

      {/* ── NAV ─────────────────────────────── */}
      <nav className="landing-nav">
        <button className="landing-nav-logo" onClick={() => setMode('hero')}>
          Fin<span className="accent">Tracker</span>
        </button>
        <ul className="landing-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#stats">Portfolio</a></li>
          <li><a href="#cta">Pricing</a></li>
          <li><a href="#footer">Blog</a></li>
        </ul>
        <button className="landing-nav-cta" onClick={() => setMode('login')}>
          Sign In
        </button>
      </nav>

      {/* ── HERO ────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-left">
          <div className="landing-hero-badge">
            Live API · 60s Auto-refresh · Secure by design
          </div>

          <h1 className="landing-hero-heading">
            Your wealth,<br />
            <em>reimagined</em>
          </h1>

          <p className="landing-hero-subtext">
            FinTracker turns raw market data into decisions you can act on —
            real-time portfolio insights, smart transaction analytics, and
            deep intelligence on 30+ Indian stocks.
          </p>

          <div className="landing-hero-actions">
            <button className="landing-btn-primary" onClick={() => setMode('register')}>
              Start for free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button className="landing-btn-secondary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              Watch demo
            </button>
          </div>

          <div className="landing-hero-trust">
            <div className="landing-trust-item">
              <div className="landing-trust-check">✓</div>
              Bank-grade encryption
            </div>
            <div className="landing-trust-item">
              <div className="landing-trust-check">✓</div>
              No credit card required
            </div>
            <div className="landing-trust-item">
              <div className="landing-trust-check">✓</div>
              Free forever plan
            </div>
          </div>
        </div>

        {/* ── CHART CARD ─────────────────────── */}
        <div className="landing-hero-right">
          <div className="landing-chart-card">
            <div className="landing-ai-pill">AI-Powered</div>

            <div className="landing-chart-header">
              <div>
                <div className="landing-chart-label">Portfolio Value</div>
                <div className="landing-chart-value">₹12,84,350</div>
                <div className="landing-chart-delta">↑ +8.42% this month</div>
              </div>
              <div className="landing-chart-period-tag">1M · 3M · 1Y</div>
            </div>

            {/* SVG Chart */}
            <svg className="landing-mini-chart" viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="landingAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E5A0" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00E5A0" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="35" x2="420" y2="35" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <line x1="0" y1="70" x2="420" y2="70" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <line x1="0" y1="105" x2="420" y2="105" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

              {/* Area fill */}
              <path
                className="landing-chart-area-animated"
                d="M0,115 C30,110 50,100 70,95 C90,90 100,105 120,85 C140,65 155,70 175,55 C195,40 210,45 230,30 C250,15 265,25 285,20 C305,15 320,30 340,18 C360,6 380,12 420,8 L420,140 L0,140 Z"
                fill="url(#landingAreaGrad)"
              />

              {/* Main line */}
              <path
                className="landing-chart-line-animated"
                d="M0,115 C30,110 50,100 70,95 C90,90 100,105 120,85 C140,65 155,70 175,55 C195,40 210,45 230,30 C250,15 265,25 285,20 C305,15 320,30 340,18 C360,6 380,12 420,8"
                fill="none"
                stroke="#00E5A0"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Highlight dot */}
              <circle cx="420" cy="8" r="4" fill="#00E5A0" opacity="0.9" />
              <circle cx="420" cy="8" r="8" fill="#00E5A0" opacity="0.15" />
            </svg>

            {/* Ticker strip */}
            <div className="landing-ticker-strip">
              <div className="landing-ticker-item">
                <div className="landing-ticker-symbol">RELIANCE</div>
                <div className="landing-ticker-price">₹2,947</div>
                <div className="landing-ticker-up">+1.24%</div>
              </div>
              <div className="landing-ticker-item">
                <div className="landing-ticker-symbol">INFY</div>
                <div className="landing-ticker-price">₹1,783</div>
                <div className="landing-ticker-up">+0.87%</div>
              </div>
              <div className="landing-ticker-item">
                <div className="landing-ticker-symbol">HDFC</div>
                <div className="landing-ticker-price">₹1,614</div>
                <div className="landing-ticker-down">−0.32%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="landing-section-divider"><div className="landing-divider-line" /></div>

      {/* ── FEATURES ─────────────────────────── */}
      <section className="landing-features-section" id="features">
        <div className="landing-section-header">
          <div>
            <div className="landing-section-tag">// Core capabilities</div>
            <h2 className="landing-section-title">
              Everything your<br />portfolio <em>deserves</em>
            </h2>
          </div>
          <p className="landing-section-desc">
            Built specifically for Indian markets — from real-time NSE/BSE feeds
            to smart spending intelligence that learns your financial behavior over time.
          </p>
        </div>

        <div className="landing-features-grid">
          {/* Featured large card */}
          <div className="landing-feature-card featured">
            <div className="landing-feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="landing-feature-title">Live Portfolio</div>
            <p className="landing-feature-desc">
              Real-time price feeds with animated P&L flash — every position updates
              the moment the market moves. See unrealized gains, sector exposure, and
              risk score all in one view.
            </p>

            <div className="landing-sparkline-wrap">
              <svg viewBox="0 0 360 80" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 80 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5A0" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#00E5A0" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,60 C40,55 60,45 80,40 C100,35 110,50 130,35 C150,20 165,28 185,18 C205,8 220,14 240,10 C260,6 280,12 300,6 C320,0 340,4 360,2 L360,80 L0,80 Z" fill="url(#sg)" />
                <path d="M0,60 C40,55 60,45 80,40 C100,35 110,50 130,35 C150,20 165,28 185,18 C205,8 220,14 240,10 C260,6 280,12 300,6 C320,0 340,4 360,2" fill="none" stroke="#00E5A0" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <div className="landing-featured-stats">
              <div>
                <div className="landing-featured-stat-label">TODAY P&L</div>
                <div className="landing-featured-stat-value teal">+₹4,230</div>
              </div>
              <div>
                <div className="landing-featured-stat-label">TOTAL RETURN</div>
                <div className="landing-featured-stat-value">+28.4%</div>
              </div>
              <div>
                <div className="landing-featured-stat-label">HOLDINGS</div>
                <div className="landing-featured-stat-value">14 stocks</div>
              </div>
            </div>

            <span className="landing-feature-tag">⬡ Live NSE / BSE feeds</span>
          </div>

          {/* Card 2: Smart Transactions */}
          <div className="landing-feature-card">
            <div className="landing-feature-icon gold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div className="landing-feature-title">Smart Transactions</div>
            <p className="landing-feature-desc">
              Debounced search, smart filters, and bulk CSV export. Find any
              transaction across years in under a second.
            </p>
            <span className="landing-feature-tag gold">⬡ Bulk export</span>
          </div>

          {/* Card 3: Smart Insights */}
          <div className="landing-feature-card">
            <div className="landing-feature-icon purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </div>
            <div className="landing-feature-title">Smart Insights</div>
            <p className="landing-feature-desc">
              Behavioral spending analysis that surfaces patterns before they
              become problems.
            </p>
            <span className="landing-feature-tag purple">⬡ Smart analytics</span>
          </div>

          {/* Card 4: Stock Intel */}
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h18v18H3z" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div className="landing-feature-title">Stock Intel</div>
            <p className="landing-feature-desc">
              Deep analysis on 30+ curated Indian stocks — fundamentals,
              technicals, and sentiment scored daily.
            </p>
            <span className="landing-feature-tag">⬡ 30+ stocks</span>
          </div>

          {/* Card 5: Secure by Design */}
          <div className="landing-feature-card">
            <div className="landing-feature-icon gold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="landing-feature-title">Secure by Design</div>
            <p className="landing-feature-desc">
              Bank-grade encryption, zero data selling, read-only broker
              connections via OAuth.
            </p>
            <span className="landing-feature-tag gold">⬡ 256-bit AES</span>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────── */}
      <section className="landing-stats-section" id="stats">
        <div className="landing-stats-grid">
          <div className="landing-stat-item">
            <div className="landing-stat-num">₹<span className="accent">840</span>Cr</div>
            <div className="landing-stat-label">Portfolio value tracked</div>
          </div>
          <div className="landing-stat-item">
            <div className="landing-stat-num"><span className="accent">30+</span></div>
            <div className="landing-stat-label">Indian stocks analyzed daily</div>
          </div>
          <div className="landing-stat-item">
            <div className="landing-stat-num"><span className="accent">60s</span></div>
            <div className="landing-stat-label">Auto-refresh interval</div>
          </div>
          <div className="landing-stat-item">
            <div className="landing-stat-num"><span className="accent">99.9</span>%</div>
            <div className="landing-stat-label">Uptime SLA</div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────── */}
      <section className="landing-cta-section" id="cta">
        <div className="landing-cta-banner">
          <div className="landing-cta-pretitle">// Start your journey</div>
          <h2 className="landing-cta-title">
            Track smarter.<br /><em>Grow faster.</em>
          </h2>
          <p className="landing-cta-sub">
            Join thousands of investors who've moved from spreadsheets to
            real-time intelligence.
          </p>
          <div className="landing-cta-actions">
            <button className="landing-btn-primary" onClick={() => setMode('register')}>
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button className="landing-btn-secondary" onClick={() => setMode('login')}>
              View pricing
            </button>
          </div>
          <div className="landing-cta-footnote">
            Free forever plan available · No credit card required
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────── */}
      <footer className="landing-footer" id="footer">
        <div className="landing-footer-copy">© 2026 FinTracker · Built for India</div>
        <div className="landing-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
          <a href="#">Twitter</a>
        </div>
      </footer>

      {/* ── AUTH OVERLAY ─────────────────────── */}
      {/* Shake keyframes injected inline */}
      <style>{`@keyframes auth-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(4px)}}`}</style>

      {(mode === 'login' || mode === 'register' || mode === 'otp' || mode === 'forgot' || mode === 'reset') && (
        <div className="landing-auth-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) switchMode('hero');
        }}>
          <div className="landing-auth-card" style={shake ? { animation: 'auth-shake 0.5s ease' } : {}}>
            <div className="landing-auth-title">
              {mode === 'register' ? 'Create Account'
                : mode === 'otp'    ? 'Verify Email'
                : mode === 'forgot' ? 'Forgot Password'
                : mode === 'reset'  ? 'Reset Password'
                : 'Welcome back'}
            </div>
            <div className="landing-auth-subtitle">
              {mode === 'register' ? 'Start your financial journey'
                : mode === 'otp'    ? `We sent a 6-digit code to ${email}`
                : mode === 'forgot' ? 'Enter your email to receive a reset OTP'
                : mode === 'reset'  ? 'Enter the OTP and your new password'
                : 'Sign in to FinTracker'}
            </div>

            {apiError && (
              <div className={`auth-api-message${(apiError.startsWith('Email verified') || apiError.startsWith('New OTP') || apiError.startsWith('Password reset')) ? ' auth-api-success' : ' auth-api-error'}`}>
                {apiError}
              </div>
            )}

            {/* ── REGISTER FIELDS ── */}
            {mode === 'register' && (
              <>
                <div>
                  <input className={`landing-auth-input${errors.name ? ' input-error' : ''}`} placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                  {errors.name && <span className="validation-error">{errors.name}</span>}
                </div>
                <div>
                  <input className={`landing-auth-input${errors.email ? ' input-error' : ''}`} placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  {errors.email && <span className="validation-error">{errors.email}</span>}
                </div>
                <div>
                  <PasswordInput className="landing-auth-input" placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)} error={errors.pass} autoComplete="new-password" />
                  <PasswordStrength password={pass} />
                </div>
                <div>
                  <PasswordInput className="landing-auth-input" placeholder="Confirm Password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} error={errors.confirmPass} autoComplete="new-password" />
                </div>
              </>
            )}

            {/* ── LOGIN FIELDS ── */}
            {mode === 'login' && (
              <>
                <div>
                  <input className={`landing-auth-input${errors.email ? ' input-error' : ''}`} placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  {errors.email && <span className="validation-error">{errors.email}</span>}
                </div>
                <div>
                  <PasswordInput className="landing-auth-input" placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)} error={errors.pass} autoComplete="current-password" />
                  <div style={{ textAlign: 'right', marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: '#00d4aa', cursor: 'pointer' }} onClick={() => switchMode('forgot')}>Forgot password?</span>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: '#00d4aa', width: 14, height: 14 }} />
                  Remember me
                </label>
              </>
            )}

            {/* ── OTP 6-BOX ── */}
            {mode === 'otp' && (
              <div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '4px 0 8px' }}>
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="landing-auth-input"
                      style={{ width: 44, textAlign: 'center', fontSize: 22, fontWeight: 700, padding: '10px 0', letterSpacing: 0 }}
                    />
                  ))}
                </div>
                {errors.otp && <span className="validation-error">{errors.otp}</span>}

                {/* Timer + Resend */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
                  <span style={{ color: otpTimer > 0 ? '#9ca3af' : '#00d4aa', fontFamily: 'monospace', fontWeight: 600 }}>
                    {otpTimer > 0 ? `⏱ ${formatTimer(otpTimer)}` : '⏱ Expired'}
                  </span>
                  <button type="button" onClick={handleResendOtp} disabled={otpTimer > 0 || loading}
                    style={{ background: 'none', border: 'none', color: otpTimer > 0 ? '#4b5563' : '#00d4aa', cursor: otpTimer > 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                    Resend OTP
                  </button>
                </div>
              </div>
            )}

            {/* ── FORGOT PASSWORD ── */}
            {mode === 'forgot' && (
              <div>
                <input className={`landing-auth-input${errors.email ? ' input-error' : ''}`} placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                {errors.email && <span className="validation-error">{errors.email}</span>}
              </div>
            )}

            {/* ── RESET PASSWORD ── */}
            {mode === 'reset' && (
              <>
                <div>
                  <input className={`landing-auth-input${errors.resetOtp ? ' input-error' : ''}`} placeholder="6-digit OTP from email" value={resetOtp} maxLength={6} onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))} />
                  {errors.resetOtp && <span className="validation-error">{errors.resetOtp}</span>}
                </div>
                <div>
                  <PasswordInput className="landing-auth-input" placeholder="New Password" value={newPass} onChange={(e) => setNewPass(e.target.value)} error={errors.newPass} autoComplete="new-password" />
                  <PasswordStrength password={newPass} />
                </div>
                <div>
                  <PasswordInput className="landing-auth-input" placeholder="Confirm New Password" value={confirmNewPass} onChange={(e) => setConfirmNewPass(e.target.value)} error={errors.confirmNewPass} autoComplete="new-password" />
                </div>
              </>
            )}

            <button className="landing-auth-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Please wait…'
                : mode === 'register' ? 'Create Account →'
                : mode === 'otp'      ? 'Verify OTP →'
                : mode === 'forgot'   ? 'Send Reset OTP →'
                : mode === 'reset'    ? 'Reset Password →'
                : 'Sign In →'}
            </button>

            {(mode === 'login' || mode === 'register') && (
              <div className="landing-auth-switch">
                {mode === 'register' ? 'Have an account? ' : 'New here? '}
                <span onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}>
                  {mode === 'register' ? 'Sign In' : 'Create one'}
                </span>
              </div>
            )}
            <div className="landing-auth-back" onClick={() => switchMode('hero')}>
              ← Back
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
