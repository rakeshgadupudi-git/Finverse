'use client';

import React from 'react';






function MetricCard({ label, value, suffix, highlight }) {
  return (
    <div className={`metric-card ${highlight ? `metric-${highlight}` : ''}`}>
            <span className="metric-card-label">{label}</span>
            <span className="metric-card-value">
                {value}{suffix && <span className="metric-card-suffix">{suffix}</span>}
            </span>
        </div>);

}

export default function FundamentalsPanel({ stock }) {
  const getROEHighlight = (v) => v > 20 ? 'good' : v > 10 ? 'neutral' : 'bad';
  const getDebtHighlight = (v) => v === 0 ? 'good' : v < 0.5 ? 'good' : v < 1 ? 'neutral' : 'bad';
  const getGrowthHighlight = (v) => v > 15 ? 'good' : v > 5 ? 'neutral' : 'bad';

  return (
    <div className="fundamentals-panel">
            <h3 className="section-title">Fundamentals</h3>
            <div className="fundamentals-grid">
                <MetricCard label="Market Cap" value={`₹${stock.marketCap > 100000 ? (stock.marketCap / 100).toFixed(0) + 'K' : stock.marketCap.toLocaleString()}`} suffix=" Cr" />
                <MetricCard label="P/E Ratio" value={stock.pe > 0 ? stock.pe.toFixed(1) : 'N/A'} suffix="x" />
                <MetricCard label="EPS" value={`₹${stock.eps.toFixed(2)}`} />
                <MetricCard label="Book Value" value={`₹${stock.bookValue.toLocaleString()}`} />
                <MetricCard label="Revenue Growth" value={stock.revenueGrowth.toFixed(1)} suffix="%" highlight={getGrowthHighlight(stock.revenueGrowth)} />
                <MetricCard label="Profit Growth" value={stock.profitGrowth.toFixed(1)} suffix="%" highlight={getGrowthHighlight(stock.profitGrowth)} />
                <MetricCard label="Debt to Equity" value={stock.debtToEquity.toFixed(2)} highlight={getDebtHighlight(stock.debtToEquity)} />
                <MetricCard label="ROE" value={stock.roe.toFixed(1)} suffix="%" highlight={getROEHighlight(stock.roe)} />
                <MetricCard label="ROCE" value={stock.roce > 0 ? stock.roce.toFixed(1) : 'N/A'} suffix={stock.roce > 0 ? '%' : ''} />
                <MetricCard label="Dividend Yield" value={stock.dividendYield.toFixed(2)} suffix="%" />
                <MetricCard label="Promoter Holding" value={stock.promoterHolding.toFixed(1)} suffix="%" />
                <MetricCard label="FII/DII Holding" value={stock.institutionalHolding.toFixed(1)} suffix="%" />
                <MetricCard label="52W High" value={`₹${stock.weekHigh52.toLocaleString()}`} />
                <MetricCard label="52W Low" value={`₹${stock.weekLow52.toLocaleString()}`} />
                <MetricCard label="Face Value" value={`₹${stock.faceValue}`} />
                <MetricCard label="Avg. Volume" value={(stock.avgVolume / 1000000).toFixed(1)} suffix="M" />
            </div>
        </div>);

}