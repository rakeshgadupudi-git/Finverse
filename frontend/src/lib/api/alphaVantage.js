// Alpha Vantage API service with in-memory caching and rate limiting
// Free tier: 25 requests/day, 5 requests/minute

const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '';
const BASE_URL = 'https://www.alphavantage.co/query';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_DELAY_MS = 1200; // 1.2s between calls (5/min limit)




















// In-memory cache (persists across requests in the same server instance)
const priceCache = new Map();
let lastApiCallTime = 0;

// Ticker to BSE symbol mapping
function toBseSymbol(ticker) {
  return `${ticker}.BSE`;
}

async function rateLimitedFetch(url) {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  if (timeSinceLastCall < MIN_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS - timeSinceLastCall));
  }
  lastApiCallTime = Date.now();
  return fetch(url);
}

export async function fetchLiveQuote(ticker) {
  // Check cache first
  const cached = priceCache.get(ticker);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const symbol = toBseSymbol(ticker);
    const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
    const response = await rateLimitedFetch(url);
    const data = await response.json();

    const gq = data['Global Quote'];
    if (!gq || !gq['05. price']) {
      console.warn(`No data returned for ${ticker}`);
      return cached?.data || null; // Return stale cache if available
    }

    const quote = {
      symbol: ticker,
      price: parseFloat(gq['05. price']),
      open: parseFloat(gq['02. open']),
      high: parseFloat(gq['03. high']),
      low: parseFloat(gq['04. low']),
      volume: parseInt(gq['06. volume'], 10),
      previousClose: parseFloat(gq['08. previous close']),
      change: parseFloat(gq['09. change']),
      changePercent: parseFloat(gq['10. change percent']?.replace('%', '') || '0'),
      latestTradingDay: gq['07. latest trading day'] || '',
      fetchedAt: Date.now()
    };

    // Update cache
    priceCache.set(ticker, { data: quote, timestamp: Date.now() });
    return quote;
  } catch (error) {
    console.error(`Error fetching live quote for ${ticker}:`, error);
    return cached?.data || null; // Fallback to stale cache
  }
}

export async function fetchBatchQuotes(tickers) {
  const results = new Map();

  for (const ticker of tickers) {
    const quote = await fetchLiveQuote(ticker);
    if (quote) {
      results.set(ticker, quote);
    }
  }

  return results;
}

export function getCachedQuote(ticker) {
  const cached = priceCache.get(ticker);
  if (cached) return cached.data;
  return null;
}

export function isCacheFresh(ticker) {
  const cached = priceCache.get(ticker);
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_TTL_MS;
}