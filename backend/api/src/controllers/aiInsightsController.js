import { getStockByTicker } from '../services/stockData.js';
import { generateAIInsight } from '../services/aiEngine.js';

export const getInsights = (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const stock = getStockByTicker(ticker);

  if (!stock) {
    return res.status(404).json({ error: 'Stock not found' });
  }

  const insight = generateAIInsight(stock);
  return res.json(insight);
};
