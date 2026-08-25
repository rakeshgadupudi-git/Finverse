# FinTracker — PRD & TRD


## PRD ( Product Requirements Document )

### Auth
- Register / Login / Logout
- Email verification (OTP)
- Forgot password / Reset password
- Session management (JWT)

### Portfolio Management
- Add holdings (stock, quantity, buy price, buy date)
- Edit holdings
- Delete holdings (soft delete)
- Real-time price tracking
- Performance metrics (P&L, XIRR, CAGR)
- Portfolio health score

### Transaction Tracking
- Log income / expense transactions
- ML-powered auto-categorization
- Manual category override
- Edit transactions
- Delete transactions (soft delete)
- Filter by date, category, amount

### Stock Discovery
- Search stocks by name / ticker / sector
- Screeners: gainers, losers, trending, by sector, by market cap
- Individual stock detail (fundamentals + technicals)
- SWOT analysis (AI generated)
- Analyst sentiment & recommendation score

### Financial Intelligence
- Financial health score (4-factor: savings, diversity, stability, overspend)
- Budget planning (category-wise recommendations)
- Spending forecast (next-month prediction)
- Anomaly detection (unusual spending alerts)

### Market News
- News feed per ticker
- Sentiment labels (positive / negative / neutral)
- Global market news

### FinChat AI Copilot
- Conversational financial advisor
- Tool-calling: portfolio metrics, expense insights, stock analysis, projections
- Chat history (session-based)
- Streaming responses

### Watchlist
- Add / remove stocks from watchlist
- Price change alerts for watchlist items

### Price Alerts
- Set price threshold per stock (above / below)
- Push notification or in-app alert when threshold is crossed

### Export
- Export transactions as CSV
- Export portfolio as CSV

### Settings & Preferences
- Theme (light / dark)
- Currency preference
- Notification preferences
- Account management (change password, delete account)

### Pagination
- All list endpoints (transactions, news, holdings, search results)

---

## TRD ( Technical Requirements Document )

### Auth
- Register
  - Email
  - Password
  - Confirm password
  - On submit → hash password (bcrypt, 12 rounds) → save user → send OTP email
- Login
  - Email
  - Password
  - Validate credentials → sign JWT (access token 15 min + refresh token 7 days) → return tokens
- Verify Email
  - OTP sent to email on register
  - POST with OTP → mark user `isVerified = true`
- Forgot Password
  - POST email → generate reset token → send email link
- Reset Password
  - POST ( resetToken, newPassword ) → update password → invalidate token
- Refresh Token
  - POST ( refreshToken ) → return new access token

---

### Portfolio

- Add Holding
  - API call → save holding to DB with userId, ticker, qty, buyPrice, buyDate
  - Fetch live price → calculate current value, P&L

- Edit Holding
  - PATCH holding record (qty, buyPrice, buyDate)

- Delete Holding
  - Set `isActive = false` (soft delete)

- Get Portfolio
  - GET all holdings for user → fetch live prices → compute P&L, XIRR, CAGR, weight per holding

---

### Transactions

- Add Transaction
  - API → send description, amount, date, type (income/expense)
  - Fire ML service call → get category prediction (confidence threshold 80%)
  - If confidence < 80% → use rule-based fallback
  - Save to DB with category

- Edit Transaction
  - PATCH transaction (amount, category, description, date)

- Delete Transaction
  - Set `isActive = false`

- Get Transactions
  - GET with filters ( dateFrom, dateTo, category, type ) + pagination ( limit, offset )

---

### Stock Discovery

- Search Stocks
  - GET → query DB / mock store → return matching stocks by name or ticker
  - Screener filters: sector, marketCap, type (gainers/losers/trending)

- Get Stock Detail
  - GET /:ticker → return full fundamentals (PE, ROE, ROCE, D/E, div yield) + technicals

- Get AI Insight
  - GET /:ticker/insight → call Groq LLM → return SWOT + recommendation + sentiment

---

### Financial Intelligence (ML Pipeline)

- Categorize Transaction
  - POST description string → ML service (TF-IDF + Random Forest) → category + confidence
  - Fallback: rule-based keyword matching if ML service is down

- Detect Anomalies
  - POST transactions list → ML service (Isolation Forest) → list of anomaly flags with messages

- Forecast Next Month
  - POST monthly expense history → ML service (Holt's Double Exponential Smoothing)
  - <2 months: return last value
  - 2–5 months: weighted moving average
  - ≥6 months: Holt's smoothing (α=0.4, β=0.3)
  - Response: `{ predictedExpense, trend, pctChange }`

- Health Score
  - POST transactions → ML service (K-Means, 4-cluster) → score 0–100 + grade (Excellent/Good/Fair/Poor) + factor breakdown
  - Factors: savings_ratio, expense_diversity, income_consistency, overspend_ratio

---

### FinChat AI Copilot

- Send Message
  - POST message → Backend → Groq LLM (llama-3.3-70b-versatile) with tool-calling
  - Max recursion depth: 3 tool calls per turn
  - 4 registered tools:
    - `getPortfolioMetrics` → holdings + health + diversification
    - `getExpenseInsights` → spending breakdown + anomalies
    - `getStockAnalysis` → SWOT + recommendation for a ticker
    - `getFinancialProjections` → Monte Carlo portfolio simulations
  - Stream response back to frontend via SSE (Server-Sent Events)

- Get Chat History
  - GET sessions for user → list of past conversations

---

### Watchlist

- Add to Watchlist
  - POST ( userId, ticker ) → save to watchlist table

- Remove from Watchlist
  - DELETE ( userId, ticker )

- Get Watchlist
  - GET → return all tickers with live prices for user

---

### Price Alerts

- Create Alert
  - POST ( userId, ticker, targetPrice, direction: above/below )
  - Cron job (every 5 min) checks live prices against alert thresholds
  - Fire socket signal or push notification when threshold is crossed

- Delete Alert
  - DELETE alert by ID

---

### Market News

- Get News
  - GET ( ticker?, limit, offset )
  - Calls NewsData API → falls back to mock news store if API is down
  - Returns articles with sentiment label

---

## DB Schema

### User
```
id              ( primary_key, uuid, not null )
name            ( varchar, not null )
email           ( varchar, unique, not null )
password        ( varchar, not null )         ← bcrypt hashed
isVerified      ( boolean, default false )
createdAt       ( timestamp )
updatedAt       ( timestamp )
lastSeen        ( timestamp )
```

### OTPToken
```
id              ( primary_key, uuid )
userId          ( foreign_key → User )
token           ( varchar )
type            ( enum: EMAIL_VERIFY, PASSWORD_RESET )
expiresAt       ( timestamp )
used            ( boolean, default false )
```

### Portfolio
```
id              ( primary_key, uuid )
userId          ( foreign_key → User )
name            ( varchar, default 'My Portfolio' )
createdAt       ( timestamp )
updatedAt       ( timestamp )
```

### Holding
```
id              ( primary_key, uuid )
portfolioId     ( foreign_key → Portfolio )
ticker          ( varchar, not null )
quantity        ( decimal, not null )
buyPrice        ( decimal, not null )
buyDate         ( date, not null )
isActive        ( boolean, default true )     ← soft delete
createdAt       ( timestamp )
updatedAt       ( timestamp )
```

### Transaction
```
id              ( primary_key, uuid )
userId          ( foreign_key → User )
description     ( varchar )
amount          ( decimal, not null )
type            ( enum: INCOME, EXPENSE )
category        ( varchar )
categorySource  ( enum: ML, RULE, MANUAL )
date            ( date, not null )
isActive        ( boolean, default true )     ← soft delete
isEdited        ( boolean, default false )
createdAt       ( timestamp )
updatedAt       ( timestamp )
```

### Watchlist
```
id              ( primary_key, uuid )
userId          ( foreign_key → User )
ticker          ( varchar, not null )
addedAt         ( timestamp )
```

### Alert
```
id              ( primary_key, uuid )
userId          ( foreign_key → User )
ticker          ( varchar, not null )
targetPrice     ( decimal, not null )
direction       ( enum: ABOVE, BELOW )
isActive        ( boolean, default true )
triggeredAt     ( timestamp, nullable )
createdAt       ( timestamp )
```

### ChatSession
```
id              ( primary_key, uuid )
userId          ( foreign_key → User )
title           ( varchar )
createdAt       ( timestamp )
updatedAt       ( timestamp )
```

### ChatMessage
```
id              ( primary_key, uuid )
sessionId       ( foreign_key → ChatSession )
role            ( enum: USER, ASSISTANT )
content         ( text )
toolCalls       ( json, nullable )
createdAt       ( timestamp )
```

---

## API Design

```
PUT    → replace entire object with a new one
PATCH  → update one or two properties of an object
DELETE → soft delete ( isActive = false )
GET    → fetch data, no request body
POST   → send data to server
```

---

### Auth

```
Register User
POST  /api/auth/register
Body: { name, email, password, confirmPassword }

Login User
POST  /api/auth/login
Body: { email, password }

Verify Email
POST  /api/auth/verify-email
Body: { otp }

Refresh Token
POST  /api/auth/refresh
Body: { refreshToken }

Forgot Password
POST  /api/auth/forgot-password
Body: { email }

Reset Password
POST  /api/auth/reset-password
Body: { resetToken, newPassword }

Logout
POST  /api/auth/logout
```

---

### User

```
Get Current User
GET   /api/user/me

Update Profile
PATCH /api/user/me
Body: { name }

Change Password
PATCH /api/user/change-password
Body: { currentPassword, newPassword }

Delete Account
DELETE /api/user/me
```

---

### Portfolio

```
Get Portfolio
GET   /api/portfolio

Add Holding
POST  /api/portfolio/holding
Body: { ticker, quantity, buyPrice, buyDate }

Edit Holding
PATCH /api/portfolio/holding/:holdingId
Body: { quantity?, buyPrice?, buyDate? }

Delete Holding
DELETE /api/portfolio/holding/:holdingId

Get Portfolio Analytics
GET   /api/portfolio/analytics
```

---

### Transactions

```
Get Transactions
GET   /api/transactions
Eg:   /api/transactions?type=EXPENSE&category=Food&dateFrom=2024-01-01&dateTo=2024-12-31&limit=50&offset=0

Add Transaction
POST  /api/transactions
Body: { description, amount, type, date, category? }

Edit Transaction
PATCH /api/transactions/:transactionId
Body: { description?, amount?, category?, date? }

Delete Transaction
DELETE /api/transactions/:transactionId

Export Transactions
GET   /api/transactions/export?format=csv
```

---

### Financial Intelligence

```
Categorize Transaction
POST  /api/finance/categorize
Body: { description }

Get Anomalies
POST  /api/finance/anomalies
Body: { transactions[] }

Get Forecast
POST  /api/finance/forecast
Body: { monthlyExpenses[] }

Get Health Score
POST  /api/finance/health-score
Body: { transactions[] }

Get Budget Recommendations
POST  /api/finance/budgets
Body: { transactions[] }

ML Service Status
GET   /api/finance/ml-status
```

---

### Stocks

```
Search / List Stocks
GET   /api/stocks
Eg:   /api/stocks?q=reliance&sector=Energy&cap=large&type=gainers&limit=20&offset=0

Get Stock Detail
GET   /api/stocks/:ticker

Get AI Insight
GET   /api/stocks/:ticker/insight

Get Live Price
GET   /api/stocks/:ticker/price
```

---

### Market News

```
Get News Feed
GET   /api/news
Eg:   /api/news?ticker=INFY&limit=20&offset=0
```

---

### Watchlist

```
Get Watchlist
GET   /api/watchlist

Add to Watchlist
POST  /api/watchlist
Body: { ticker }

Remove from Watchlist
DELETE /api/watchlist/:ticker
```

---

### Alerts

```
Get Alerts
GET   /api/alerts

Create Alert
POST  /api/alerts
Body: { ticker, targetPrice, direction }

Delete Alert
DELETE /api/alerts/:alertId
```

---

### FinChat

```
Send Message (streaming)
POST  /api/finchat/stream
Body: { message, sessionId? }
Response: Server-Sent Events stream

Get Chat Sessions
GET   /api/finchat/sessions

Get Session Messages
GET   /api/finchat/sessions/:sessionId/messages
Eg:   /api/finchat/sessions/:sessionId/messages?limit=50&offset=0

Delete Session
DELETE /api/finchat/sessions/:sessionId
```
