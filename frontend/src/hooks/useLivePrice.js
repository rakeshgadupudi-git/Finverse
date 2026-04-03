'use client';

import { useState, useEffect, useCallback } from 'react';























export function useLivePrice(ticker, autoRefreshMs = 60000) {
  const [liveData, setLiveData] = useState(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPrice = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/live-price?ticker=${encodeURIComponent(ticker)}`);
      if (res.ok) {
        const json = await res.json();
        setLiveData(json.data);
        setSource(json.source);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error(`Failed to fetch live price for ${ticker}:`, err);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchPrice();

    if (autoRefreshMs > 0) {
      const interval = setInterval(fetchPrice, autoRefreshMs);
      return () => clearInterval(interval);
    }
  }, [fetchPrice, autoRefreshMs]);

  return {
    liveData,
    source,
    loading,
    isLive: source === 'live' || source === 'cache',
    lastUpdated,
    refresh: fetchPrice
  };
}

const PRICE_CACHE = {};
const CACHE_TTL = 30000; // 30 seconds

// Hook for batch fetching multiple tickers
export function useLivePrices(tickers, autoRefreshMs = 120000) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(async (isManual = false) => {
    if (tickers.length === 0) return;

    // Check cache first (skip if manual refresh)
    if (!isManual) {
      const allInCache = tickers.every((t) => PRICE_CACHE[t] && Date.now() - PRICE_CACHE[t].timestamp < CACHE_TTL);
      if (allInCache) {
        const cachedResults = {};
        tickers.forEach((t) => {cachedResults[t] = { data: PRICE_CACHE[t].data, source: 'cache' };});
        setPrices((prev) => ({ ...prev, ...cachedResults }));
        return;
      }
    }

    setLoading(true);

    try {
      // Batch requests (alpha vantage/internal api limits)
      const batches = [];
      for (let i = 0; i < tickers.length; i += 8) {
        batches.push(tickers.slice(i, i + 8));
      }

      const allResults = {};

      await Promise.all(batches.map(async (batch) => {
        try {
          const res = await fetch(`/api/live-price?tickers=${batch.join(',')}`);
          if (res.ok) {
            const json = await res.json();
            Object.entries(json.results || {}).forEach(([ticker, result]) => {
              const data = result.data;
              allResults[ticker] = { data, source: result.source };
              PRICE_CACHE[ticker] = { data, timestamp: Date.now() };
            });
          }
        } catch (e) {
          console.error('Batch fetch error:', e);
        }
      }));

      setPrices((prev) => ({ ...prev, ...allResults }));
    } catch (err) {
      console.error('Failed to batch fetch prices:', err);
    } finally {
      setLoading(false);
    }
  }, [tickers.join(',')]);

  useEffect(() => {
    fetchPrices();

    if (autoRefreshMs > 0) {
      const interval = setInterval(() => fetchPrices(), autoRefreshMs);
      return () => clearInterval(interval);
    }
  }, [fetchPrices, autoRefreshMs]);

  return {
    prices,
    loading,
    refresh: () => fetchPrices(true)
  };
}