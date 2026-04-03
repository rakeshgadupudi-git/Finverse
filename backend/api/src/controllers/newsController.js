import { getAllNews, getNewsByTicker, getMarketNews, getNewsBySentiment } from '../services/newsData.js';

export const getNews = (req, res) => {
  const ticker = req.query.ticker;
  const sentiment = req.query.sentiment;
  const type = req.query.type;

  if (type === 'market') return res.json(getMarketNews());
  if (ticker) return res.json(getNewsByTicker(ticker));
  if (sentiment) return res.json(getNewsBySentiment(sentiment));

  return res.json(getAllNews());
};
