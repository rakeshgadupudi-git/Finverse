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

### Account Management
- Bank accounts, credit cards, e-wallets, and investment portfolio balance tracking
- Support for multiple account types (savings, current, credit, wallet, investment, loan)
- Aggregated net worth view

### Bill Tracking & Subscriptions
- Track utility bills, subscriptions, rent, and EMIs
- Due dates tracking (day of month 1–31) with configurable reminder periods (1–30 days)
- Mark bills as paid and track last payment date

### Debt & Loan Tracker
- Manage personal loans, peer-to-peer lending, or borrowings
- Support for interest rates and calculation types (none, simple, compound)
- Installment payments tracking with reference to transactions

### Financial Goals
- Create savings and milestone goals (Emergency Fund, Wedding, Education, etc.)
- Set target amount and target date, and calculate needed monthly contributions
- Auto-track progress percentage

### Loyalty Cards Vault
- Digitize physical loyalty/membership cards
- Store barcode/QR values and types (CODE128, EAN13, QR, NONE)
- Custom card styling (colors) and expiry reminders

### Planned Payments
- Schedule future or recurring transactions (Food, Transport, Rent, etc.)
- Set reminder days before the scheduled date
- Automatically or manually convert to active transaction on due date

### Shopping Lists
- Maintain shopping lists with itemized products, quantities, units, and estimated prices
- Checked state management for items
- Convert checked items directly into expense transactions

### Warranty Vault
- Upload and archive purchase receipts and serial numbers for household items/gadgets
- Track warranty period (in months) and calculate precise expiry dates
- Automatic reminder alerts a few months before warranty expiration

### Notifications Center
- Centralized user inbox for app alerts (alert, goal, bill, system)
- Read/unread status tracking
- Dynamic banner notices in the header

### Tax & GST Engines (India)
- AY 2025-26 Indian Income Tax calculator supporting Old vs New tax regimes
- Incorporates Standard Deduction (₹50k Old / ₹75k New), 80C, 80D, NPS, and Home Loan interest deductions
- Computes Section 87A rebate (capped at ₹12.5k for Old regime / ₹25k for New regime) and Marginal Relief
- Public GST calculator showing Base Amount, GST Rate, Tax Amount, and CGST/SGST split


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

### Accounts

- Create Account
  - POST ( name, accountType, institution?, balance?, creditLimit?, currentOutstanding?, color?, notes? ) → save to DB with userId
- Get Accounts
  - GET → return all active accounts for user, computing aggregated net worth, total balance, credit outstanding, and asset/liability stats
- Update Account
  - PATCH ( id ) ( name?, accountType?, institution?, balance?, creditLimit?, currentOutstanding?, color?, notes? ) → update account record
- Delete Account
  - DELETE ( id ) → set `isActive = false`

---

### Bills

- Create Bill
  - POST ( name, amount, dueDate, frequency?, category?, reminderDaysBefore? ) → save to DB with userId
- Get Bills
  - GET → return active bills for the user, sorting by closest upcoming due date in the current calendar month
- Update Bill / Mark Paid
  - PATCH ( id ) ( name?, amount?, dueDate?, frequency?, category?, reminderDaysBefore?, lastPaidAt? ) → update bill record. When marked paid, set `lastPaidAt = Date.now`
- Delete Bill
  - DELETE ( id ) → set `isActive = false`

---

### Debts

- Create Debt
  - POST ( direction, counterpartyName, principalAmount, interestRate?, interestType?, startDate, dueDate?, notes? ) → save to DB with userId
- Get Debts
  - GET → return all active debts, calculating total borrowed, total lent, remaining balance per debt, and interest accumulated
- Add Debt Payment
  - POST ( id ) /payments ( amount, date?, note?, convertToTransaction? ) → push payment sub-document, create corresponding Transaction of type INCOME/EXPENSE if requested, and update debt status/closedAt if balance is settled
- Delete Debt
  - DELETE ( id ) → set `isActive = false`

---

### Goals

- Create Goal
  - POST ( title, targetAmount, currentAmount?, targetDate, category?, monthlyContribution?, notes? ) → save to DB with userId
- Get Goals
  - GET → return all active goals, computing percentage progress and average monthly contribution needed to reach target
- Update Goal / Add Savings
  - PATCH ( id ) ( title?, targetAmount?, currentAmount?, targetDate?, category?, monthlyContribution?, notes?, isCompleted? ) → update goal record
- Delete Goal
  - DELETE ( id ) → set `isActive = false`

---

### Loyalty Cards

- Create Card
  - POST ( cardName, issuer?, cardType?, cardNumber?, barcodeValue?, barcodeType?, expiryDate?, color?, notes? ) → save to DB with userId
- Get Cards
  - GET → return all active cards for user
- Update Card
  - PATCH ( id ) ( cardName?, issuer?, cardType?, cardNumber?, barcodeValue?, barcodeType?, expiryDate?, color?, notes? ) → update card record
- Delete Card
  - DELETE ( id ) → set `isActive = false`

---

### Notifications

- Get Notifications
  - GET → return notifications for user (sorted by descending createdAt) with pagination and read/unread filters
- Mark as Read
  - PATCH ( id ) /read → set `isRead = true`
- Mark All as Read
  - POST /read-all → set `isRead = true` for all notifications of the user
- Create Notification
  - Internal system service triggered by cron/checkers (e.g. bill reminders, goal progression, warranty limits) to push an entry to DB

---

### Planned Payments

- Create Planned Payment
  - POST ( title, amount, scheduledDate, category?, reminderDaysBefore?, notes? ) → save to DB with userId
- Get Planned Payments
  - GET → return pending/paid planned payments for user
- Convert to Transaction
  - POST ( id ) /convert → change status to 'paid', create corresponding Transaction (type EXPENSE, category, description=title, amount, date=scheduledDate) and reference `convertedTxId` in PlannedPayment
- Delete Planned Payment
  - DELETE ( id ) → set `isActive = false`

---

### Shopping Lists

- Create Shopping List
  - POST ( name, store?, items[] ) → save to DB with userId
- Get Shopping Lists
  - GET → return all active shopping lists for user
- Add/Update/Check Items
  - PATCH ( id ) ( name?, store?, status?, items[] ) → update list fields or list items. If checking an item and converting, post to transaction service
- Convert List to Expense
  - POST ( id ) /convert → create transaction representing the sum of checked items actualPrices, mark shopping list status as 'completed'
- Delete Shopping List
  - DELETE ( id ) → set `isActive = false`

---

### Warranties

- Create Warranty
  - POST ( productName, brand?, itemType?, purchaseDate, warrantyMonths, serialNumber?, notes?, receiptImageUrl?, reminderMonthsBefore? ) → save to DB with userId
- Get Warranties
  - GET → return active warranties, calculating precise expiry dates and months/days remaining
- Update Warranty
  - PATCH ( id ) ( productName?, brand?, itemType?, purchaseDate?, warrantyMonths?, serialNumber?, notes?, receiptImageUrl?, reminderMonthsBefore? ) → update warranty record
- Delete Warranty
  - DELETE ( id ) → set `isActive = false`

---

### Tax & GST Engines

- Calculate Income Tax (AY 2025-26)
  - POST /calculate ( age, basicSalary, hraReceived, specialAllowance, ltaReceived, rentPaid, metroCity, standardDeductionsOverride?, section80C?, section80D_self?, section80D_parents?, section80CCD_1B_nps?, interestHomeLoan?, otherIncome? )
  - Logic:
    1. Apply Standard Deduction (₹50,000 for Old, ₹75,000 for New)
    2. Compute HRA Exemption (minimum of: Actual HRA, Rent Paid - 10% Basic, 50% Basic for metro or 40% for non-metro)
    3. Old Regime deductions: Cap 80C at ₹1.5L, 80D self/parents at ₹25k/₹50k, NPS at ₹50k, Home Loan at ₹2L
    4. Compute Taxable Income under both Regimes
    5. Compute Slab Tax progressive steps
    6. Apply Rebate 87A (income ≤ ₹5L Old capped at ₹12.5k / income ≤ ₹7L New capped at ₹25k) with Marginal Relief if applicable
    7. Add 4% Health & Education Cess
    8. Generate comparison report with optimal regime selection and tax-saving investment suggestions
- Calculate GST
  - POST /gst ( amount, gstRate, isInclusive )
  - Returns Base Amount, GST Amount, Total Amount, CGST (GST/2), and SGST (GST/2)

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

### Account
```
id                  ( primary_key, objectid )
userId              ( foreign_key → User, required )
name                ( string, required )
accountType         ( enum: savings, current, salary, credit, wallet, investment, loan, other, required )
institution         ( string, default '' )
balance             ( number, default 0 )
creditLimit         ( number, default 0 )
currentOutstanding  ( number, default 0 )
color               ( string, default '#00d4aa' )
lastUpdated         ( date, default Date.now )
notes               ( string, default '' )
isActive            ( boolean, default true )
createdAt           ( timestamp )
updatedAt           ( timestamp )
```

### Bill
```
id                  ( primary_key, objectid )
userId              ( foreign_key → User, required )
name                ( string, required )
amount              ( number, required )
dueDate             ( number, range 1-31, required )
frequency           ( enum: monthly, quarterly, yearly, default monthly )
category            ( enum: Streaming, Utilities, Insurance, EMI, Rent, Subscription, Other, default Other )
isActive            ( boolean, default true )
lastPaidAt          ( date, default null )
reminderDaysBefore  ( number, default 3 )
createdAt           ( timestamp )
updatedAt           ( timestamp )
```

### Debt
```
id                  ( primary_key, objectid )
userId              ( foreign_key → User, required )
direction           ( enum: BORROWED, LENT, required )
counterpartyName    ( string, required )
principalAmount     ( number, required )
interestRate        ( number, default 0 )
interestType        ( enum: none, simple, compound, default none )
startDate           ( date, default Date.now, required )
dueDate             ( date, default null )
payments            ( array of { amount, date, note, txId } )
status              ( enum: active, closed, default active )
closedAt            ( date, default null )
linkedTransactionId ( foreign_key → Transaction, default null )
notes               ( string, default '' )
isActive            ( boolean, default true )
createdAt           ( timestamp )
updatedAt           ( timestamp )
```

### Goal
```
id                  ( primary_key, objectid )
userId              ( foreign_key → User, required )
title               ( string, required )
targetAmount        ( number, required )
currentAmount       ( number, default 0 )
targetDate          ( date, required )
category            ( enum: Emergency Fund, Vehicle, Home, Education, Vacation, Retirement, Wedding, Other, default Other )
monthlyContribution ( number, default 0 )
notes               ( string, default '' )
isCompleted         ( boolean, default false )
isActive            ( boolean, default true )
createdAt           ( timestamp )
updatedAt           ( timestamp )
```

### LoyaltyCard
```
id                  ( primary_key, objectid )
userId              ( foreign_key → User, required )
cardName            ( string, required )
issuer              ( string, default '' )
cardType            ( enum: Loyalty, Credit, Debit, Membership, Gift, Other, default Loyalty )
cardNumber          ( string, default '' )
barcodeValue        ( string, default '' )
barcodeType         ( enum: CODE128, EAN13, QR, NONE, default CODE128 )
expiryDate          ( date, default null )
color               ( string, default '#00d4aa' )
notes               ( string, default '' )
isActive            ( boolean, default true )
createdAt           ( timestamp )
updatedAt           ( timestamp )
```

### Notification
```
id                  ( primary_key, objectid )
userId              ( foreign_key → User, required )
title               ( string, required, max 120 chars )
message             ( string, required, max 500 chars )
type                ( enum: alert, goal, bill, system, default system )
isRead              ( boolean, default false )
createdAt           ( timestamp )
updatedAt           ( timestamp )
```

### PlannedPayment
```
id                  ( primary_key, objectid )
userId              ( foreign_key → User, required )
title               ( string, required )
amount              ( number, required )
scheduledDate       ( date, required )
category            ( enum: Food, Transport, Entertainment, Shopping, Health, Rent, Utilities, Investment, Others, default Others )
notes               ( string, default '' )
reminderDaysBefore  ( number, default 3 )
status              ( enum: pending, paid, cancelled, default pending )
convertedTxId       ( foreign_key → Transaction, default null )
isActive            ( boolean, default true )
createdAt           ( timestamp )
updatedAt           ( timestamp )
```

### ShoppingList
```
id                  ( primary_key, objectid )
userId              ( foreign_key → User, required )
name                ( string, default 'Shopping List', required )
store               ( string, default '' )
status              ( enum: active, completed, default active )
items               ( array of { name, estimatedPrice, actualPrice, quantity, unit, category, checked, convertedTxId } )
isActive            ( boolean, default true )
createdAt           ( timestamp )
updatedAt           ( timestamp )
```

### Warranty
```
id                  ( primary_key, objectid )
userId              ( foreign_key → User, required )
productName         ( string, required )
brand               ( string, default '' )
itemType            ( enum: Electronics, Appliances, Furniture, Vehicle, Jewelry, Other, default Electronics )
purchaseDate        ( date, required )
warrantyMonths      ( number, required )
serialNumber        ( string, default '' )
notes               ( string, default '' )
linkedTransactionId ( foreign_key → Transaction, default null )
receiptImageUrl     ( string, default '' )
reminderMonthsBefore( number, default 1 )
isActive            ( boolean, default true )
createdAt           ( timestamp )
updatedAt           ( timestamp )
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

---

### Accounts

```
Get Accounts & Net Worth
GET   /api/accounts

Create Account
POST  /api/accounts
Body: { name, accountType, institution?, balance?, creditLimit?, currentOutstanding?, color?, notes? }

Update Account
PATCH /api/accounts/:accountId
Body: { name?, accountType?, institution?, balance?, creditLimit?, currentOutstanding?, color?, notes? }

Delete Account (soft)
DELETE /api/accounts/:accountId
```

---

### Bills

```
Get Bills List
GET   /api/bills

Create Bill
POST  /api/bills
Body: { name, amount, dueDate, frequency?, category?, reminderDaysBefore? }

Update Bill / Mark Paid
PATCH /api/bills/:billId
Body: { name?, amount?, dueDate?, frequency?, category?, reminderDaysBefore?, lastPaidAt? }

Delete Bill (soft)
DELETE /api/bills/:billId
```

---

### Debts

```
Get Debts List
GET   /api/debts

Create Debt
POST  /api/debts
Body: { direction, counterpartyName, principalAmount, interestRate?, interestType?, startDate, dueDate?, notes? }

Add Debt Payment
POST  /api/debts/:debtId/payments
Body: { amount, date?, note?, convertToTransaction? }

Delete Debt (soft)
DELETE /api/debts/:debtId
```

---

### Goals

```
Get Goals List
GET   /api/goals

Create Goal
POST  /api/goals
Body: { title, targetAmount, currentAmount?, targetDate, category?, monthlyContribution?, notes? }

Update Goal / Add Savings
PATCH /api/goals/:goalId
Body: { title?, targetAmount?, currentAmount?, targetDate?, category?, monthlyContribution?, notes?, isCompleted? }

Delete Goal (soft)
DELETE /api/goals/:goalId
```

---

### Loyalty Cards

```
Get Loyalty Cards List
GET   /api/loyalty-cards

Create Loyalty Card
POST  /api/loyalty-cards
Body: { cardName, issuer?, cardType?, cardNumber?, barcodeValue?, barcodeType?, expiryDate?, color?, notes? }

Update Loyalty Card
PATCH /api/loyalty-cards/:cardId
Body: { cardName?, issuer?, cardType?, cardNumber?, barcodeValue?, barcodeType?, expiryDate?, color?, notes? }

Delete Loyalty Card (soft)
DELETE /api/loyalty-cards/:cardId
```

---

### Notifications

```
Get Notifications Feed
GET   /api/notifications
Eg:   /api/notifications?isRead=false&limit=20&offset=0

Mark Notification as Read
PATCH /api/notifications/:notificationId/read

Mark All Notifications as Read
POST  /api/notifications/read-all
```

---

### Planned Payments

```
Get Planned Payments List
GET   /api/planned-payments

Create Planned Payment
POST  /api/planned-payments
Body: { title, amount, scheduledDate, category?, reminderDaysBefore?, notes? }

Convert Planned Payment to Transaction
POST  /api/planned-payments/:paymentId/convert

Delete Planned Payment (soft)
DELETE /api/planned-payments/:paymentId
```

---

### Shopping Lists

```
Get Shopping Lists
GET   /api/shopping-lists

Create Shopping List
POST  /api/shopping-lists
Body: { name, store?, items[] }

Update Shopping List / Add/Check Items
PATCH /api/shopping-lists/:listId
Body: { name?, store?, status?, items[] }

Convert Checked Items to Transaction
POST  /api/shopping-lists/:listId/convert

Delete Shopping List (soft)
DELETE /api/shopping-lists/:listId
```

---

### Warranties

```
Get Warranties List
GET   /api/warranties

Create Warranty
POST  /api/warranties
Body: { productName, brand?, itemType?, purchaseDate, warrantyMonths, serialNumber?, notes?, receiptImageUrl?, reminderMonthsBefore? }

Update Warranty
PATCH /api/warranties/:warrantyId
Body: { productName?, brand?, itemType?, purchaseDate?, warrantyMonths?, serialNumber?, notes?, receiptImageUrl?, reminderMonthsBefore? }

Delete Warranty (soft)
DELETE /api/warranties/:warrantyId
```

---

### Tax & GST

```
Calculate Income Tax (AY 2025-26)
POST  /api/tax/calculate
Body: { age, basicSalary, hraReceived, specialAllowance, ltaReceived, rentPaid, metroCity, standardDeductionsOverride?, section80C?, section80D_self?, section80D_parents?, section80CCD_1B_nps?, interestHomeLoan?, otherIncome? }

Calculate GST
POST  /api/tax/gst
Body: { amount, gstRate, isInclusive }
```

