# FinTracker

### Working Demo

<video src="./fintracker.mp4" controls="controls" style="max-width: 100%;">
</video>

FinTracker is a multi-service personal finance platform built around a React frontend, two Node/Express backend services, and an optional FastAPI ML microservice. The repository combines personal finance workflows like transactions, goals, bills, and account tracking with market-data features such as stock discovery, live prices, news, AI insights, and chat-based financial assistance.

## Architecture

The application is split into four runnable parts:

| Component | Path | Default Port | Responsibility |
| --- | --- | --- | --- |
| Frontend | `frontend` | `5173` | React + Vite UI, client-side state, page routing inside the app shell, and API calls through Vite proxy rules |
| API service | `backend/api` | `5000` | Market data, stock discovery, live prices, AI insights, finance analytics, FinChat orchestration, and news aggregation |
| Auth service | `backend/auth` | `5001` | Authentication, JWT flows, MongoDB-backed user/business data, alerts, transactions, portfolio records, and operational cron jobs |
| ML service | `backend/ml` | `8000` | Optional FastAPI service for transaction categorization, anomaly detection, expense forecasting, and financial health scoring |

## Startup Model

- Root `npm run dev` starts the API service, auth service, and frontend together.
- Root `npm run dev` does not start the ML service.
- The ML service must be started separately if you want ML-backed categorization and finance endpoints.
- In development, the frontend talks to `/api/...` and Vite proxies those requests to either `5000` or `5001` based on the route.

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm
- Python 3.10+ recommended for `backend/ml`
- A MongoDB instance reachable through `MONGODB_URI`

### Install Dependencies

Install dependencies in the root and in each Node service:

```bash
npm install
cd backend/auth && npm install
cd ../api && npm install
cd ../../frontend && npm install
```

Install Python dependencies only if you plan to run the ML service:

```bash
cd backend/ml
pip install -r requirements.txt
```

### Run the Stack

Start the frontend + API service + auth service from the repository root:

```bash
npm run dev
```

Start the ML service separately in another terminal:

```bash
cd backend/ml
python -m uvicorn main:app --reload --port 8000
```

You can also use the root helper script for the ML service:

```bash
npm run dev:ml
```

### Useful Root Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts `backend/api`, `backend/auth`, and `frontend` concurrently |
| `npm run dev:api` | Starts only the API service |
| `npm run dev:auth` | Starts only the auth service |
| `npm run dev:frontend` | Starts only the frontend |
| `npm run dev:ml` | Starts the ML service with Uvicorn |
| `npm run build:frontend` | Builds the Vite frontend |

## Environment Variables

Documented here by service name only. Keep secrets out of version control.

### Auth Service

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRY`
- `JWT_REFRESH_EXPIRY`
- `EMAIL_USER`
- `EMAIL_PASS`
- `FRONTEND_URL`
- `API_SERVICE_URL`
- `ML_SERVICE_URL`
- `PORT`
- `NODE_ENV`

### API Service

- `GROQ_API_KEY`
- `NEWSDATA_API_KEY`
- `ML_SERVICE_URL`
- `FRONTEND_URL`
- `PORT`
- `NODE_ENV`

### Frontend

- `VITE_ALPHA_VANTAGE_API_KEY`

### ML Service

- `PORT`
- `HOST`
- `FORCE_RETRAIN`

## Route Ownership

The frontend uses a shared `/api` base path, but the Vite proxy splits requests across two backend services.

### Auth Service Routes on `5001`

- `/api/auth`
- `/api/user`
- `/api/portfolio`
- `/api/transactions`
- `/api/watchlist`
- `/api/alerts`
- `/api/tax`
- `/api/goals`
- `/api/bills`
- `/api/notifications`
- `/api/planned-payments`
- `/api/shopping-lists`
- `/api/warranties`
- `/api/loyalty-cards`
- `/api/debts`
- `/api/accounts`

### API Service Routes on `5000`

- `/api/stocks`
- `/api/news`
- `/api/live-price`
- `/api/ai-insights`
- `/api/finchat`
- `/api/finance`

## Project Structure

```text
FS_Project/
|-- backend/
|   |-- api/
|   |   `-- src/
|   |       |-- controllers/   # Market, news, finance, AI insights, and chat handlers
|   |       |-- middleware/    # Shared Express error handling
|   |       |-- routes/        # API-service route registration
|   |       |-- services/      # Market data, news, finance logic, ML bridge, FinChat tools
|   |       |-- app.js         # Express app wiring
|   |       `-- server.js      # API entry point
|   |-- auth/
|   |   |-- app.js             # Express app wiring, security middleware, route mounting
|   |   |-- server.js          # Auth entry point and cron scheduling
|   |   `-- src/
|   |       |-- config/        # MongoDB connection setup
|   |       |-- controllers/   # CRUD/business logic for user and finance modules
|   |       |-- middleware/    # Auth guard and centralized error handling
|   |       |-- models/        # Mongoose models for users, holdings, alerts, bills, and more
|   |       |-- routes/        # Auth/business route definitions
|   |       |-- services/      # JWT, email, and related helpers
|   |       `-- utils/         # Shared response helpers
|   `-- ml/
|       |-- data/              # Training/input datasets
|       |-- models/            # ML model implementations
|       |-- main.py            # FastAPI application and prediction endpoints
|       |-- requirements.txt   # Python dependencies
|       `-- train.py           # Training entry point
|-- docs/
|   `-- PRD_TRD.md             # Product and technical requirements reference
|-- frontend/
|   |-- public/                # Static assets
|   `-- src/
|       |-- components/        # Page, layout, UI, chart, and domain components
|       |-- context/           # Shared React state providers
|       |-- finchat/           # Chat UI, tools, memory, and context for FinChat
|       |-- hooks/             # Reusable custom hooks
|       |-- lib/               # Client-side finance logic, analytics, data helpers, and tokens
|       |-- services/          # HTTP client wrappers for backend endpoints
|       |-- styles/            # Global and page-level CSS
|       |-- App.jsx            # Frontend app root
|       `-- main.jsx           # Vite entry point
|-- package.json               # Root dev orchestration scripts
`-- README.md
```

## Feature Mapping

- Authentication: landing/login/register/OTP/reset flows in the frontend, backed by `backend/auth` JWT and email workflows.
- Transactions: transaction pages and filters in the frontend, stored in MongoDB through `backend/auth`, with optional ML categorization.
- Portfolio: holdings and portfolio state stored in `backend/auth`, with current-price enrichment fetched from `backend/api`.
- Goals: CRUD flows handled end-to-end by `backend/auth`.
- Bills and planned payments: owned by `backend/auth`, including scheduled reminder jobs.
- Debts and accounts: owned by `backend/auth` and surfaced through dedicated frontend pages.
- Shopping lists, warranties, and loyalty cards: lifestyle modules implemented in `backend/auth` and exposed in the main app shell.
- Watchlist and alerts: persistence and alert scheduling live in `backend/auth`; live-price checks depend on `backend/api`.
- Stock intelligence: stock search, stock detail, and curated stock analytics live in `backend/api`.
- Market news: served by `backend/api` through external-news integration with in-repo fallback content.
- Finance analytics: forecast, anomaly, budgeting, and health-score endpoints live in `backend/api`, backed by local logic and optional ML calls.
- FinChat: chat UI lives in `frontend/src/finchat`, while orchestration and tool-calling live in `backend/api`.

## Integration and Data Flow

- The frontend uses relative `/api/...` calls from `frontend/src/services/api.js`.
- `frontend/vite.config.js` proxies auth/business routes to `http://localhost:5001`.
- The same Vite config proxies general `/api` market and AI routes to `http://localhost:5000`.
- The auth service calls the API service for live market enrichment, such as portfolio net-worth pricing and alert checks.
- The API service calls the ML service through `ML_SERVICE_URL` for finance predictions and health analysis.
- The auth service also attempts direct ML categorization for new transactions when the ML service is available.
- If the ML service is down, the Node services are designed to continue operating with rule-based or non-ML fallbacks.

## Data Sources and Fallbacks

- MongoDB is the primary persistence layer for auth and business-domain data in `backend/auth`.
- Stock discovery data in `backend/api` is backed by curated in-repo datasets and generators rather than a live market database.
- News fetching uses NewsData when `NEWSDATA_API_KEY` is configured, otherwise cached or mock fallback data is used.
- FinChat requires `GROQ_API_KEY`; without it, the chat endpoint cannot provide LLM responses.
- Finance analytics can use the optional FastAPI ML service, but the API layer includes fallback logic for health score, forecast, anomaly detection, and budgeting flows.
- Transaction categorization in the auth service also degrades gracefully when ML is unavailable.

## Current Limitations and Notes

- No automated test suite is visible at the repository root or in the service directories.
- The ML service is optional for local development, but some finance and categorization features become less capable without it.
- Some market, stock, and news behavior is mock-backed or generated from in-repo data rather than fully live upstream systems.
- The frontend is a single-page app shell rather than a multi-package workspace, so most UI modules are kept in `frontend/src/components` and related support folders.
- The root README is the best quick-start entry point; detailed requirements live in `docs/PRD_TRD.md`.

## Developer Notes

- Use `frontend/vite.config.js` as the source of truth for development proxy behavior.
- Use `backend/auth/app.js` and `backend/api/src/app.js` as the source of truth for route ownership.
- Use `backend/auth/server.js`, `backend/api/src/server.js`, and `backend/ml/main.py` as the source of truth for default ports and startup behavior.
- The ML service lives under `backend/ml`, not `ml` at the repository root.
