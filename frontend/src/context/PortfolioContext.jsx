'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { MOCK_PORTFOLIO, MOCK_PRICES } from '@/lib/data/mockData';

import { useLivePrices } from '@/hooks/useLivePrice';
import { calculatePortfolioStats, generateInsights, projectPortfolio } from '@/lib/portfolioEngine';

import {
  enrichHoldings, calculateHealthScore, calculateDiversification,
  calculateConcentration, calculateSectorAllocation, calculateTaxIntelligence,
  calculatePredictiveAnalytics, calculateXIRR, calculateMomentum,
  generateGrowthData, calculateDrawdown, calculateRiskReturnData, calculateTaxTimeline } from
'@/lib/portfolioAnalyticsEngine';






const STORAGE_KEY = 'fintracker_portfolio_holdings';





























const PortfolioContext = createContext(undefined);

function loadPersistedHoldings() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {/* ignore */}
  return null;
}

function persistHoldings(holdings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  } catch {/* ignore */}
}

export function PortfolioProvider({ children }) {
  const [holdings, setHoldings] = useState(() => {
    const persisted = loadPersistedHoldings();
    return (persisted && persisted.length > 0) ? persisted : MOCK_PORTFOLIO;
  });

  // Persist whenever holdings change
  useEffect(() => {
    persistHoldings(holdings);
  }, [holdings]);

  const tickers = useMemo(() => holdings.map((h) => h.symbol), [holdings]);

  const addHolding = useCallback((h) => {
    setHoldings((prev) => [...prev, { ...h, id: Date.now() }]);
  }, []);

  const updateHolding = useCallback((id, updates) => {
    setHoldings((prev) => prev.map((h) =>
    h.id === id ? { ...h, ...updates } : h
    ));
  }, []);

  const removeHolding = useCallback((id) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // Live price fetching
  const { prices: rawPrices, loading, refresh } = useLivePrices(tickers, 120000);

  // Standardize prices format
  const prices = useMemo(() => {
    const result = {};
    tickers.forEach((symbol) => {
      const live = rawPrices[symbol]?.data;
      if (live) {
        result[symbol] = {
          price: live.price,
          change: live.change,
          changePct: live.changePercent
        };
      }
    });
    return result;
  }, [rawPrices, tickers]);

  // Core stats
  const stats = useMemo(() => calculatePortfolioStats(holdings, prices), [holdings, prices]);

  // Enriched holdings
  const enrichedHoldings = useMemo(
    () => enrichHoldings(holdings, prices, MOCK_PRICES),
    [holdings, prices]
  );

  // Analytics — all memoized
  const healthScore = useMemo(
    () => calculateHealthScore(enrichedHoldings, stats.volatility, stats.beta),
    [enrichedHoldings, stats.volatility, stats.beta]
  );

  const diversification = useMemo(
    () => calculateDiversification(enrichedHoldings),
    [enrichedHoldings]
  );

  const concentration = useMemo(
    () => calculateConcentration(enrichedHoldings),
    [enrichedHoldings]
  );

  const sectorAllocation = useMemo(
    () => calculateSectorAllocation(enrichedHoldings),
    [enrichedHoldings]
  );

  const taxIntelligence = useMemo(
    () => calculateTaxIntelligence(enrichedHoldings),
    [enrichedHoldings]
  );

  const predictive = useMemo(
    () => calculatePredictiveAnalytics(stats.totalValue, 12, stats.volatility),
    [stats.totalValue, stats.volatility]
  );

  const xirr = useMemo(() => calculateXIRR(enrichedHoldings), [enrichedHoldings]);
  const momentumVal = useMemo(() => calculateMomentum(enrichedHoldings), [enrichedHoldings]);
  const insights = useMemo(() => generateInsights(stats, holdings, prices), [stats, holdings, prices]);
  const projection = useMemo(() => projectPortfolio(stats.totalValue), [stats.totalValue]);

  // New analytics — growth data as a function of timeframe
  const growthData = useCallback((timeframe) => {
    return generateGrowthData(enrichedHoldings, MOCK_PRICES, timeframe);
  }, [enrichedHoldings]);

  const drawdownData = useCallback((timeframe) => {
    const gd = generateGrowthData(enrichedHoldings, MOCK_PRICES, timeframe);
    return calculateDrawdown(gd);
  }, [enrichedHoldings]);

  const riskReturnData = useMemo(
    () => calculateRiskReturnData(enrichedHoldings, MOCK_PRICES),
    [enrichedHoldings]
  );

  const taxTimeline = useMemo(
    () => calculateTaxTimeline(enrichedHoldings),
    [enrichedHoldings]
  );

  const value = {
    holdings, prices, loading, stats, insights, refreshPrices: refresh,
    addHolding, updateHolding, removeHolding,
    enrichedHoldings, healthScore, diversification, concentration,
    sectorAllocation, taxIntelligence, predictive, xirr,
    momentum: momentumVal, projection,
    growthData, drawdownData, riskReturnData, taxTimeline
  };

  return (
    <PortfolioContext.Provider value={value}>
            {children}
        </PortfolioContext.Provider>);

}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}