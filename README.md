<![CDATA[# FinTracker — Personal Finance & Stock Intelligence Platform

> An all-in-one personal finance management platform with AI-powered insights, stock market intelligence, and an LLM-backed financial assistant — built for India.

## 📽️ Working Demo

<video src="./fintracker.mp4" controls="controls" style="max-width: 100%;">
</video>

---

## 📋 Overview

FinTracker is a full-stack web application that consolidates everyday personal finance workflows — expense tracking, budgeting, bill management, goal planning, debt tracking — with real-time Indian stock market data, portfolio analytics, AI-generated stock insights, and a conversational financial assistant (FinChat) powered by Groq LLMs.

The application is built as a **microservices architecture** with a React frontend, two independent Node.js/Express backend services, and an optional Python ML microservice. It is designed for deployment on **Vercel** (frontend) and **Render** (backend services), with **MongoDB Atlas** as the database.

---

## ✨ Features

### 💰 Personal Finance
- **Transaction Management** — Add, edit, delete, and filter income/expense transactions with automatic ML-powered categorization
- **Dashboard** — At-a-glance financial overview with spending summaries, recent activity, and account balances
- **Goals Tracker** — Create and track savings goals with progress visualization
- **Bills & Reminders** — Recurring bill management with automated reminder notifications (daily cron job)
- **Planned Payments** — Schedule upcoming payments with due-date reminders
- **Debt Tracker** — Track owed/owing debts with payment history
- **Accounts** — Manage multiple bank accounts/wallets
- **Financial Calendar** — Calendar view of transactions and upcoming payments

### 📈 Stock Market & Portfolio
- **Portfolio Management** — Track stock holdings with live price enrichment from Yahoo Finance
- **Live Market Ticker** — Real-time scrolling ticker bar showing major indices
- **Stock Discovery** — Search and explore NSE/BSE stocks with detailed fundamental data
- **AI Insights** — Auto-generated SWOT analysis, buy/hold/sell recommendations, and valuation alerts for every stock
- **Price Alerts** — Set target-price alerts (above/below) with automated monitoring every 15 minutes
- **Watchlist** — Track stocks of interest

### 🤖 AI & Intelligence
- **FinChat** — Conversational AI financial assistant powered by Groq (Llama) with streaming responses and tool-calling for real-time portfolio metrics, expense analysis, stock analysis, and financial projections
- **Financial Health Score** — ML-computed or rule-based health scoring based on spending patterns
- **Anomaly Detection** — Flags unusual transactions using statistical methods
- **Expense Forecasting** — Predicts next-month expenses from historical spending trends
- **Smart Budgeting** — Automated budget suggestions per category based on spending history

### 🛒 Lifestyle Modules
- **Shopping Lists** — Create lists, check off items, and convert purchases into transactions
- **Warranty Vault** — Store product warranty details with expiry reminders
- **Loyalty Cards** — Save loyalty/rewards card details with barcode generation (JsBarcode)

### 🧮 Tools
- **Tax Calculator** — Indian income tax computation (old and new regime) with slab breakdowns
- **GST Calculator** — Quick GST amount computation
- **Financial Calculators** — SIP, EMI, compound interest, and related calculators
- **CSV Export** — Export transaction data

### 🔔 Notifications
- In-app notification system for bill reminders, price alerts, warranty expiry, and planned payment due dates
- Background cron jobs for automated alert processing

### 🎨 UI/UX
- **Dark & Light themes** with system-aware toggling
- **Responsive design** — Full desktop sidebar navigation + mobile bottom tab bar with hamburger menu
- **Framer Motion animations** throughout the UI
- **Recharts-powered** interactive data visualizations

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Framer Motion, Recharts, Lucide React, date-fns, JsBarcode |
| **Auth Service** | Node.js, Express 4, Mongoose, bcryptjs, JSON Web Tokens (access + refresh), express-validator, Helmet, express-rate-limit |
| **API Service** | Node.js, Express 5, Groq SDK (LLM), node-fetch, node-cron |
| **ML Service** | Python, FastAPI, scikit-learn, pandas, NumPy, Pydantic |
| **Database** | MongoDB (via MongoDB Atlas) |
| **Email** | Resend (transactional OTP emails) |
| **Live Prices** | Yahoo Finance Chart API (no key required) |
| **News** | NewsData.io API |
| **AI/LLM** | Groq Cloud API (Llama models via Groq SDK) |
| **Deployment** | Vercel (frontend), Render (backend services) |

---

## 🏗️ Architecture

The application is split into four independently runnable services:

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│             │     │   Auth Service   │     │   API Service    │
│   React     │────▶│   (Port 5001)    │     │   (Port 5000)    │
│   Frontend  │     │                  │     │                  │
│  (Port 5173)│────▶│  MongoDB/Auth/   │     │  Stocks/News/AI/ │
│             │     │  Finance CRUD    │────▶│  FinChat/Finance │
└─────────────┘     └──────────────────┘     └──────────────────┘
                                                      │
                                               ┌──────▼──────┐
                                               │ ML Service  │
                                               │ (Port 8000) │
                                               │ (Optional)  │
                                               └─────────────┘
```

- **Frontend** → Vite dev server proxies `/api/*` routes to the appropriate backend based on path
- **Auth Service** → Owns user auth, all CRUD business data, cron jobs, and MongoDB
- **API Service** → Owns market data, live prices, news, AI insights, and FinChat orchestration
- **ML Service** → Optional Python microservice for ML-powered categorization, anomaly detection, forecasting, and health scoring

### Project Structure

```text
FinTracker/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── pages/          # 19 page components (Dashboard, Portfolio, Goals, etc.)
│       │   ├── layout/         # AppShell with sidebar + mobile nav
│       │   ├── charts/         # Recharts-based portfolio, price, and fundamental charts
│       │   ├── ui/             # Shared UI components (modals, password input)
│       │   ├── stocks/         # Stock discovery and detail components
│       │   ├── portfolio/      # Portfolio-specific components
│       │   ├── news/           # News feed components
│       │   └── ai/             # AI insight display components
│       ├── finchat/            # FinChat AI assistant module
│       │   ├── components/     # Chat window UI
│       │   ├── engine/         # Groq streaming client
│       │   ├── context/        # Financial context builder for LLM
│       │   ├── memory/         # Per-user chat history (localStorage)
│       │   └── tools/          # Client-side financial tool definitions
│       ├── context/            # React context providers (Portfolio, Settings)
│       ├── hooks/              # Custom hooks (useLivePrice, useLocalStorage)
│       ├── services/           # Centralized API client with token refresh
│       ├── lib/                # Finance engines, portfolio analytics, chart helpers
│       └── styles/             # Global CSS + landing page styles
├── backend/
│   ├── auth/                   # Auth & business logic service
│   │   ├── app.js              # Express app: CORS, Helmet, rate limiting, routes
│   │   ├── server.js           # Entry point: DB connect, cron scheduling
│   │   └── src/
│   │       ├── config/         # MongoDB connection
│   │       ├── controllers/    # 16 controllers (auth, transactions, portfolio, etc.)
│   │       ├── middleware/     # JWT auth guard, error handler
│   │       ├── models/         # 18 Mongoose models
│   │       ├── routes/         # 16 route modules
│   │       ├── services/       # JWT token service, Resend email service
│   │       └── utils/          # Response helpers
│   ├── api/                    # Market data & AI service
│   │   └── src/
│   │       ├── controllers/    # Stock, news, AI, FinChat, finance controllers
│   │       ├── routes/         # 6 route modules
│   │       └── services/       # AI engine, FinChat orchestration, Yahoo Finance,
│   │                           # NewsData, stock data, portfolio analytics, ML bridge
│   └── ml/                     # Python ML microservice
│       ├── main.py             # FastAPI app with 4 prediction endpoints
│       ├── train.py            # Model training entry point
│       ├── models/             # Categorizer, anomaly detector, forecaster, health scorer
│       └── data/               # Training datasets
├── docs/
│   ├── PRD_TRD.md              # Product & technical requirements
│   └── deployment_guide.md     # Cloud deployment instructions
├── vercel.json                 # Production proxy rewrites (Vercel → Render)
└── package.json                # Root dev scripts (concurrently)
```

---

## ⚡ How It Works

1. **User registers/logs in** → Auth Service creates the user in MongoDB, sends OTP via Resend email, issues JWT access + refresh tokens
2. **Frontend loads** → AppShell renders the sidebar navigation, live ticker bar, and the active page
3. **Financial data (transactions, goals, bills, etc.)** → All CRUD operations hit the Auth Service, which persists to MongoDB
4. **Live stock prices** → API Service fetches from Yahoo Finance with 5-minute caching, returns to frontend
5. **AI stock insights** → API Service generates SWOT analysis, recommendations, and valuation alerts from curated stock data
6. **FinChat conversations** → Frontend streams messages to the API Service, which orchestrates Groq LLM calls with tool-calling (portfolio metrics, expense analysis, stock analysis, projections)
7. **ML predictions** → API Service calls the optional ML Service for transaction categorization, anomaly detection, expense forecasting, and health scoring; falls back to rule-based logic if ML is unavailable
8. **Background jobs** → Auth Service runs cron jobs: daily bill reminders (09:00), warranty expiry checks (09:00), planned payment alerts (09:05), price alert monitoring (every 15 min)

---

## 📦 Requirements

- **Node.js** 18+
- **npm**
- **Python** 3.10+ _(only if running the ML service)_
- **MongoDB** instance _(MongoDB Atlas free tier works)_

### API Keys (optional but recommended)

| Key | Purpose | Where to Get |
|---|---|---|
| `GROQ_API_KEY` | FinChat LLM responses | [console.groq.com](https://console.groq.com) |
| `NEWSDATA_API_KEY` | Market news feed | [newsdata.io](https://newsdata.io) |
| `RESEND_API_KEY` | OTP verification emails | [resend.com](https://resend.com) |
| `VITE_ALPHA_VANTAGE_API_KEY` | _(Frontend — legacy/optional)_ | [alphavantage.co](https://www.alphavantage.co) |

> **Note:** The app works without these keys — FinChat won't respond, news uses fallback data, OTPs are logged to console, and live prices still work via Yahoo Finance (no key needed).

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/rakeshgadupudi-git/Finverse.git
cd Finverse
```

### 2. Install dependencies

```bash
# Root (concurrently for multi-service dev)
npm install

# Auth service
cd backend/auth && npm install

# API service
cd ../api && npm install

# Frontend
cd ../../frontend && npm install
```

For the ML service (optional):

```bash
cd backend/ml
pip install -r requirements.txt
```

### 3. Configure environment variables

**Auth Service** — Create `backend/auth/.env`:

```env
PORT=5001
NODE_ENV=development

MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

JWT_ACCESS_SECRET=<64_char_random_hex>
JWT_REFRESH_SECRET=<64_char_random_hex>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

RESEND_API_KEY=re_your_api_key_here

FRONTEND_URL=http://localhost:5173
```

**API Service** — Create `backend/api/.env`:

```env
PORT=5000
NODE_ENV=development

GROQ_API_KEY=gsk_your_groq_key_here
NEWSDATA_API_KEY=your_newsdata_key_here
ML_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

**ML Service** _(optional)_ — Create `backend/ml/.env`:

```env
PORT=8000
HOST=0.0.0.0
FORCE_RETRAIN=false
```

### 4. Run the application

Start all three main services concurrently from the project root:

```bash
npm run dev
```

This starts:
- Frontend on `http://localhost:5173`
- API Service on `http://localhost:5000`
- Auth Service on `http://localhost:5001`

To start the ML service separately:

```bash
npm run dev:ml
```

### Available Scripts

| Command | What It Starts |
|---|---|
| `npm run dev` | Frontend + API Service + Auth Service (all three) |
| `npm run dev:frontend` | Frontend only |
| `npm run dev:api` | API Service only |
| `npm run dev:auth` | Auth Service only |
| `npm run dev:ml` | ML Service only (Uvicorn) |
| `npm run build:frontend` | Production build of the frontend |

---

## 🗄️ Database

**MongoDB** is the sole database, managed through **Mongoose** in the Auth Service. The following models are defined:

| Model | Purpose |
|---|---|
| `User` | User accounts with hashed passwords (bcryptjs), email verification status |
| `OTPToken` | Time-limited OTP codes for email verification and password reset |
| `Portfolio` | User portfolio container |
| `Holding` | Individual stock holdings (ticker, quantity, buy price) |
| `Transaction` | Income/expense transactions with category, date, and amount |
| `Goal` | Savings goals with target amount and progress tracking |
| `Bill` | Recurring bills with reminder configuration |
| `PlannedPayment` | Scheduled one-time payments |
| `Debt` | Debts owed/owing with payment history |
| `Account` | Bank accounts/wallets |
| `Alert` | Price alerts (ticker, target price, direction) |
| `Watchlist` | Tracked stock tickers |
| `Notification` | In-app notifications (bill, alert, system types) |
| `ChatMessage` | FinChat conversation messages |
| `ChatSession` | FinChat session containers |
| `ShoppingList` | Shopping lists with items |
| `Warranty` | Product warranty records with expiry tracking |
| `LoyaltyCard` | Loyalty/rewards card details |

---

## 🔌 API Endpoints

### Auth Service (Port 5001)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user + send verification OTP |
| POST | `/api/auth/verify-email` | Verify email with OTP |
| POST | `/api/auth/login` | Login with email/password → JWT tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Initiate password reset → send OTP |
| POST | `/api/auth/reset-password` | Reset password with OTP |
| POST | `/api/auth/resend-otp` | Resend OTP (rate limited: 3 per 15 min) |
| POST | `/api/auth/logout` | Logout (client discards tokens) |
| GET | `/api/user/me` | Get current user profile |
| PATCH | `/api/user/me` | Update user name |
| PATCH | `/api/user/change-password` | Change password |
| DELETE | `/api/user/me` | Delete user account |
| GET/POST/PATCH/DELETE | `/api/transactions` | Transaction CRUD |
| GET/POST/PATCH/DELETE | `/api/portfolio` | Portfolio & holdings CRUD |
| GET/POST/PATCH/DELETE | `/api/goals` | Goals CRUD |
| GET/POST/PATCH/DELETE | `/api/bills` | Bills CRUD |
| GET/POST/PATCH/DELETE | `/api/planned-payments` | Planned payments CRUD |
| GET/POST/PATCH/DELETE | `/api/debts` | Debts CRUD with payment sub-routes |
| GET/POST/PATCH/DELETE | `/api/accounts` | Accounts CRUD |
| GET/POST/PATCH/DELETE | `/api/watchlist` | Watchlist CRUD |
| GET/POST/PATCH/DELETE | `/api/alerts` | Price alerts CRUD |
| GET/PATCH | `/api/notifications` | Get and mark notifications as read |
| GET/POST/PATCH/DELETE | `/api/shopping-lists` | Shopping lists with item sub-routes |
| GET/POST/PATCH/DELETE | `/api/warranties` | Warranties CRUD |
| GET/POST/PATCH/DELETE | `/api/loyalty-cards` | Loyalty cards CRUD |
| POST | `/api/tax/calculate` | Indian income tax calculation |
| POST | `/api/tax/gst` | GST calculation |
| GET | `/health` | Health check |

### API Service (Port 5000)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stocks` | Search/browse stock data |
| GET | `/api/live-price` | Live stock price (Yahoo Finance) |
| GET | `/api/live-price/market-indices` | Live market index prices |
| GET | `/api/news` | Market or stock-specific news |
| GET | `/api/ai-insights` | AI-generated stock analysis (SWOT, recommendation) |
| POST | `/api/finchat/stream` | Streaming FinChat conversation with tool-calling |
| GET/POST | `/api/finance/*` | Health score, anomalies, forecast, budgets |

### ML Service (Port 8000)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Model status check |
| POST | `/predict/category` | Categorize a transaction description |
| POST | `/predict/anomalies` | Detect anomalous transactions |
| POST | `/predict/forecast` | Forecast next month's expenses |
| POST | `/predict/health` | Compute financial health score |

---

## 🔐 Security

- **Password hashing** — bcryptjs with pre-save hooks
- **JWT authentication** — Short-lived access tokens (15 min) + longer-lived refresh tokens (7 days) with automatic silent refresh on the frontend
- **OTP verification** — 6-digit OTPs with 10-minute expiry for email verification and password reset
- **Helmet** — Security headers on the Auth Service
- **Rate limiting** — 100 requests / 15 min per IP on all API routes; stricter 20 / 15 min on auth routes; 3 OTP resend attempts / 15 min per user
- **Input validation** — express-validator on the Auth Service
- **CORS** — Origin-restricted in production
- **Request size limits** — 10kb JSON body limit on Auth Service
- **Email enumeration prevention** — Forgot-password always returns success regardless of whether the email exists

---

## ☁️ Deployment

The project is configured for a **Vercel + Render + MongoDB Atlas** deployment:

| Component | Platform | Config |
|---|---|---|
| Frontend | Vercel | `vercel.json` with proxy rewrites to Render services |
| Auth Service | Render | `backend/auth` — Node web service |
| API Service | Render | `backend/api` — Node web service |
| ML Service | Render _(optional)_ | `backend/ml` — Python web service |
| Database | MongoDB Atlas | Free tier cluster |

Detailed deployment steps are documented in [`docs/deployment_guide.md`](docs/deployment_guide.md).

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| OTP emails not arriving | Check `RESEND_API_KEY` in Auth Service `.env`. Without it, OTPs are logged to the console instead. |
| FinChat returns errors | Ensure `GROQ_API_KEY` is set in the API Service `.env`. Without it, the chat endpoint cannot call the LLM. |
| Live prices not loading | Yahoo Finance API may be rate-limited. The app retries and falls back to cached prices automatically. |
| ML features degraded | The ML service is optional. Without it, the app uses rule-based fallback logic for categorization, health scoring, anomaly detection, and forecasting. |
| Port conflicts | Defaults are 5173 (frontend), 5000 (API), 5001 (auth), 8000 (ML). Change via `PORT` env var or Vite config. |
| MongoDB connection fails | Verify `MONGODB_URI` is correct and that `0.0.0.0/0` is whitelisted in MongoDB Atlas Network Access. |

---

## 👤 Author

**Rakesh Gadupudi** — [github.com/rakeshgadupudi-git](https://github.com/rakeshgadupudi-git)
]]>
