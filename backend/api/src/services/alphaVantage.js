// Yahoo Finance chart API — no key required, works for NSE Indian stocks
// Endpoint: /v8/finance/chart/{SYMBOL}.NS

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const priceCache = new Map();

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

function toNseSymbol(ticker) {
  // Indices (^NSEI), forex (USDINR=X), futures (GC=F, CL=F), crypto (BTC-USD) — use as-is
  if (ticker.startsWith('^') || ticker.includes('=') || ticker.includes('-')) return ticker;
  return `${ticker}.NS`;
}

export async function fetchLiveQuote(ticker) {
  const cached = priceCache.get(ticker);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const symbol = toNseSymbol(ticker);
    const url = `${YF_BASE}/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { headers: YF_HEADERS, signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta || !meta.regularMarketPrice) {
      console.warn(`[Price] No data from Yahoo Finance for ${ticker}`);
      return cached?.data || null;
    }

    const prevClose = meta.chartPreviousClose ?? meta.regularMarketPrice;
    const price = meta.regularMarketPrice;
    const change = parseFloat((price - prevClose).toFixed(2));
    const changePercent = parseFloat(((change / prevClose) * 100).toFixed(2));

    const quote = {
      symbol: ticker,
      price,
      open: meta.regularMarketPrice,
      high: meta.regularMarketDayHigh ?? price,
      low: meta.regularMarketDayLow ?? price,
      volume: meta.regularMarketVolume ?? 0,
      previousClose: prevClose,
      change,
      changePercent,
      weekHigh52: meta.fiftyTwoWeekHigh ?? price,
      weekLow52: meta.fiftyTwoWeekLow ?? price,
      latestTradingDay: new Date(meta.regularMarketTime * 1000).toISOString().split('T')[0],
      fetchedAt: Date.now()
    };

    priceCache.set(ticker, { data: quote, timestamp: Date.now() });
    console.log(`[Price] ${ticker}: ₹${price} (${changePercent > 0 ? '+' : ''}${changePercent}%)`);
    return quote;
  } catch (error) {
    console.error(`[Price] Error fetching ${ticker}:`, error.message);
    return cached?.data || null;
  }
}

export async function fetchBatchQuotes(tickers) {
  const results = new Map();
  // Fetch in parallel for speed
  await Promise.all(
    tickers.map(async (ticker) => {
      const quote = await fetchLiveQuote(ticker);
      if (quote) results.set(ticker, quote);
    })
  );
  return results;
}

export function getCachedQuote(ticker) {
  const cached = priceCache.get(ticker);
  return cached?.data || null;
}

export function isCacheFresh(ticker) {
  const cached = priceCache.get(ticker);
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_TTL_MS;
}
