# Deploying FinTracker to Cloud Providers

This guide outlines how to deploy the FinTracker application to the cloud, hosting the **Node.js/FastAPI backends on Render**, the **React frontend on Vercel**, and using **MongoDB Atlas for the database**.

---

## 1. Database Setup (MongoDB Atlas)
The auth and business services require a MongoDB connection. We recommend using the free tier of MongoDB Atlas.

1. **Sign Up / Log In:** Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and log in.
2. **Create a Database Cluster:** Select the Free Shared Tier, choose your preferred cloud provider and region close to your users, and click **Create Cluster**.
3. **Database Access User:** Create a database user with a secure password. Remember these credentials.
4. **Network Access:** In the "Network Access" tab, click **Add IP Address** and add `0.0.0.0/0` (allow access from anywhere) so that the Render servers can connect to the database.
5. **Get Connection String:** Go to the "Database" tab, click **Connect**, select **Drivers**, and copy the connection string. Replace `<password>` with your database user's password.
   * Example connection string format: `mongodb+srv://username:password@cluster.mongodb.net/fintracker?retryWrites=true&w=majority`

---

## 2. Backend Services Deployment (Render)
Render connects directly to your GitHub repository and automatically deploys when you push to `main`.

### Service A: Auth & Main Database Service (`backend/auth`)
1. Create a new **Web Service** on Render.
2. Connect your GitHub repository.
3. Configure the following settings:
   * **Name:** `fintracker-auth-service`
   * **Root Directory:** `backend/auth`
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `node server.js`
4. Add the following **Environment Variables** in the service settings:
   * `MONGODB_URI`: *Your MongoDB Atlas connection string*
   * `JWT_ACCESS_SECRET`: *A secure random string*
   * `JWT_REFRESH_SECRET`: *A secure random string*
   * `EMAIL_USER`: *Your Gmail address (for OTP verifications)*
   * `EMAIL_PASS`: *Your Google App Password (not your main password)*
   * `FRONTEND_URL`: *The URL of your deployed Vercel frontend (e.g. `https://fintracker.vercel.app`)*
   * `NODE_ENV`: `production`

### Service B: Core API Service (`backend/api`)
1. Create a second **Web Service** on Render.
2. Connect your GitHub repository.
3. Configure the following settings:
   * **Name:** `fintracker-api-service`
   * **Root Directory:** `backend/api`
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `node src/server.js`
4. Add the following **Environment Variables**:
   * `GROQ_API_KEY`: *Your Groq Cloud API Key*
   * `NEWSDATA_API_KEY`: *Your NewsData.io API Key*
   * `NODE_ENV`: `production`

### Service C: ML Microservice (`backend/ml`) *(Optional)*
If you want ML-powered categorizations, anomalies, and forecasting:
1. Create a third **Web Service** on Render.
2. Connect your GitHub repository.
3. Configure the following settings:
   * **Name:** `fintracker-ml-service`
   * **Root Directory:** `backend/ml`
   * **Runtime:** `Python`
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## 3. Frontend Deployment (Vercel)
Vercel is optimal for hosting static React apps built with Vite.

1. **Vercel Project Setup:**
   * Go to [Vercel](https://vercel.com) and click **Add New Project**.
   * Import your GitHub repository.
2. **Configure Settings:**
   * **Framework Preset:** `Vite`
   * **Root Directory:** `frontend`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
3. **Configure Rewrite Proxies (`vercel.json`):**
   * We have pre-configured [vercel.json](file:///d:/IIIT%20Dharwad/FS_Project/frontend/vercel.json) in your `frontend` workspace folder.
   * Edit [vercel.json](file:///d:/IIIT%20Dharwad/FS_Project/frontend/vercel.json) to replace the placeholder destination URLs with your actual Render Web Service URLs:
     * Replace `https://fintracker-auth.onrender.com` with your **Auth Service** URL on Render.
     * Replace `https://fintracker-api.onrender.com` with your **Core API Service** URL on Render.
   * Commit and push this change to GitHub. Vercel will pick it up and run your proxy routes seamlessly.
4. **Deploy:** Click **Deploy**. Vercel will compile and host your frontend.

---

## 4. Verification Check
Once all services are active:
* Verify that the Vercel app loads.
* Try registering a new account: this will verify the connection between the frontend, Vercel routing proxy, Render Auth Service, MongoDB Atlas database, and Gmail SMTP transport.
