import express from 'express';
import cors from 'cors';
import errorHandler from './middleware/errorHandler.js';

import stocksRoutes from './routes/stocks.js';
import newsRoutes from './routes/news.js';
import livePriceRoutes from './routes/livePrice.js';
import aiInsightsRoutes from './routes/aiInsights.js';
import finChatRoutes from './routes/finChat.js';
import financeRoutes from './routes/finance.js';

const app = express();

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: false,
}));

app.use(express.json());

app.use('/api/stocks', stocksRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/live-price', livePriceRoutes);
app.use('/api/ai-insights', aiInsightsRoutes);
app.use('/api/finchat', finChatRoutes);
app.use('/api/finance', financeRoutes);

app.use(errorHandler);

export default app;
