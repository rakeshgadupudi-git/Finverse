import { fetchLiveQuote, getCachedQuote, isCacheFresh } from '../services/alphaVantage.js';
import { getStockByTicker } from '../services/stockData.js';

const MARKET_SYMBOLS = [
  { key: 'NIFTY 50',   symbol: '^NSEI',    prefix: '₹' },
  { key: 'SENSEX',     symbol: '^BSESN',   prefix: '₹' },
  { key: 'BANK NIFTY', symbol: '^NSEBANK', prefix: '₹' },
  { key: 'USD/INR',    symbol: 'USDINR=X', prefix: '₹' },
  { key: 'GOLD',       symbol: 'GC=F',     prefix: '$' },
  { key: 'CRUDE OIL',  symbol: 'CL=F',     prefix: '$' },
  { key: 'BTC',        symbol: 'BTC-USD',  prefix: '$' },
  { key: 'NIFTY IT',   symbol: '^CNXIT',   prefix: '₹' },
];

export const getMarketIndices = async (req, res) => {
  const results = await Promise.all(
    MARKET_SYMBOLS.map(async ({ key, symbol, prefix }) => {
      try {
        const quote = await fetchLiveQuote(symbol);
        if (quote) {
          return {
            symbol: key,
            price: `${prefix}${Number(quote.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
            change: `${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`,
            up: quote.changePercent >= 0,
          };
        }
      } catch {}
      return null;
    })
  );

  const data = results.filter(Boolean);
  return res.json({ data });
};

export const getLivePrice = async (req, res) => {
  const ticker = req.query.ticker;
  const tickers = req.query.tickers;

  // Single ticker fetch
  if (ticker) {
    const upperTicker = ticker.toUpperCase();

    // Verify stock exists in our dataset
    const mockStock = getStockByTicker(upperTicker);
    if (!mockStock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    // Check if we have fresh cache
    if (isCacheFresh(upperTicker)) {
      const cached = getCachedQuote(upperTicker);
      return res.json({
        ticker: upperTicker,
        source: 'cache',
        data: cached
      });
    }

    // Fetch live
    const quote = await fetchLiveQuote(upperTicker);
    if (quote) {
      return res.json({
        ticker: upperTicker,
        source: 'live',
        data: quote
      });
    }

    // Fallback to mock data
    return res.json({
      ticker: upperTicker,
      source: 'mock',
      data: {
        symbol: upperTicker,
        price: mockStock.price,
        change: mockStock.change,
        changePercent: mockStock.changePercent,
        open: mockStock.price - mockStock.change,
        high: mockStock.weekHigh52,
        low: mockStock.weekLow52,
        volume: mockStock.avgVolume,
        previousClose: mockStock.price - mockStock.change,
        latestTradingDay: new Date().toISOString().split('T')[0],
        fetchedAt: Date.now()
      }
    });
  }

  // Batch fetch
  if (tickers) {
    const tickerList = tickers
      .toUpperCase()
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t)
      .slice(0, 10); // Max 10

    const results = {};

    for (const t of tickerList) {
      if (isCacheFresh(t)) {
        results[t] = { source: 'cache', data: getCachedQuote(t) };
      } else {
        const quote = await fetchLiveQuote(t);
        if (quote) {
          results[t] = { source: 'live', data: quote };
        } else {
          const mock = getStockByTicker(t);
          if (mock) {
            results[t] = {
              source: 'mock',
              data: {
                symbol: t,
                price: mock.price,
                change: mock.change,
                changePercent: mock.changePercent,
                volume: mock.avgVolume,
                fetchedAt: Date.now()
              }
            };
          }
        }
      }
    }

    return res.json({ results });
  }

  return res.status(400).json({ error: 'Provide ?ticker= or ?tickers= parameter' });
};
