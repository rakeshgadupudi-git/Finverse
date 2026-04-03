import { stocks, searchStocks, getTopGainers, getTopLosers, getTrendingStocks, getSectors, getStocksBySector, getStocksByCapCategory, getStockByTicker as stockDataGetStock } from '../services/stockData.js';

export const getStocks = (req, res) => {
  const query = req.query.q;
  const sector = req.query.sector;
  const cap = req.query.cap;
  const type = req.query.type;

  if (type === 'gainers') return res.json(getTopGainers());
  if (type === 'losers') return res.json(getTopLosers());
  if (type === 'trending') return res.json(getTrendingStocks());
  if (type === 'sectors') return res.json(getSectors());

  if (query) return res.json(searchStocks(query));
  if (sector) return res.json(getStocksBySector(sector));
  if (cap) return res.json(getStocksByCapCategory(cap));

  return res.json(stocks);
};

export const getStockByTicker = (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const stock = stockDataGetStock(ticker);

  if (!stock) {
    return res.status(404).json({ error: 'Stock not found' });
  }

  return res.json(stock);
};
