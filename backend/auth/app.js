const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./src/middleware/errorHandler');

const authRoutes         = require('./src/routes/auth');
const userRoutes         = require('./src/routes/user');
const portfolioRoutes    = require('./src/routes/portfolio');
const transactionRoutes  = require('./src/routes/transactions');
const watchlistRoutes    = require('./src/routes/watchlist');
const alertRoutes        = require('./src/routes/alerts');
const taxRoutes          = require('./src/routes/tax');
const goalRoutes         = require('./src/routes/goals');
const billRoutes         = require('./src/routes/bills');
const notificationRoutes = require('./src/routes/notifications');
const plannedPaymentRoutes = require('./src/routes/plannedPayments');
const shoppingListRoutes   = require('./src/routes/shoppingLists');
const warrantyRoutes       = require('./src/routes/warranties');
const loyaltyCardRoutes    = require('./src/routes/loyaltyCards');
const debtRoutes           = require('./src/routes/debts');
const accountRoutes        = require('./src/routes/accounts');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow request if no origin (curl/Postman/same-origin), localhost, or any *.vercel.app domain
      if (!origin || origin.endsWith('.vercel.app') || origin === process.env.FRONTEND_URL || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/planned-payments', plannedPaymentRoutes);
app.use('/api/shopping-lists',   shoppingListRoutes);
app.use('/api/warranties',       warrantyRoutes);
app.use('/api/loyalty-cards',    loyaltyCardRoutes);
app.use('/api/debts',            debtRoutes);
app.use('/api/accounts',         accountRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'FinTracker server running', env: process.env.NODE_ENV });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
