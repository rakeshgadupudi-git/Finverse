'use client';

import React from 'react';
import Link from 'next/link';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';

import { useWatchlist } from '@/components/providers/WatchlistProvider';
import { useLivePrice } from '@/hooks/useLivePrice';






export default function StockCard({ stock, compact }) {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { liveData, isLive } = useLivePrice(stock.ticker, 120000);
  const inWatchlist = isInWatchlist(stock.ticker);

  // Use live data if available, otherwise fall back to mock
  const price = liveData?.price ?? stock.price;
  const change = liveData?.change ?? stock.change;
  const changePercent = liveData?.changePercent ?? stock.changePercent;
  const isPositive = changePercent >= 0;

  const handleWatchlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWatchlist) removeFromWatchlist(stock.ticker);else
    addToWatchlist(stock.ticker);
  };

  if (compact) {
    return (
      <Link href={`/stock/${stock.ticker}`} className="stock-card-compact">
                <div className="stock-card-compact-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="stock-ticker">{stock.ticker}</span>
                        {isLive && <span className="live-dot" title="Live price" />}
                    </div>
                    <span className="stock-name-small">{stock.name}</span>
                </div>
                <div className="stock-card-compact-right">
                    <span className="stock-price">₹{price.toLocaleString()}</span>
                    <span className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                    </span>
                </div>
            </Link>);

  }

  return (
    <Link href={`/stock/${stock.ticker}`} className="stock-card">
            <div className="stock-card-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="stock-ticker">{stock.ticker}</span>
                    <span className="stock-sector-badge">{stock.sector}</span>
                    {isLive && <span className="live-dot" title="Live price" style={{ marginLeft: 6 }} />}
                </div>
                <button onClick={handleWatchlist} className={`watchlist-btn ${inWatchlist ? 'active' : ''}`}>
                    <Star size={16} fill={inWatchlist ? 'currentColor' : 'none'} />
                </button>
            </div>
            <div className="stock-name">{stock.name}</div>
            <div className="stock-card-price-row">
                <span className="stock-price-lg">₹{price.toLocaleString()}</span>
                <span className={`stock-change-badge ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                </span>
            </div>
            <div className="stock-card-metrics">
                <div className="metric-item">
                    <span className="metric-label">P/E</span>
                    <span className="metric-value">{stock.pe ? stock.pe.toFixed(1) : 'N/A'}</span>
                </div>
                <div className="metric-item">
                    <span className="metric-label">M.Cap</span>
                    <span className="metric-value">₹{stock.marketCap > 1000 ? `${Math.round(stock.marketCap / 100)}K` : stock.marketCap.toLocaleString()} Cr</span>
                </div>
                <div className="metric-item">
                    <span className="metric-label">ROE</span>
                    <span className="metric-value">{stock.roe}%</span>
                </div>
            </div>
            <span className="stock-cap-label">{stock.capCategory}</span>
        </Link>);

}