'use client';

import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from
'recharts';







const timeRanges = [
{ label: '1D', days: 1 },
{ label: '1W', days: 7 },
{ label: '1M', days: 30 },
{ label: '3M', days: 90 },
{ label: '1Y', days: 365 },
{ label: '5Y', days: 1825 }];


export default function PriceChart({ data, currentPrice }) {
  const [range, setRange] = useState('1Y');

  const selectedDays = timeRanges.find((r) => r.label === range)?.days || 365;
  const filteredData = data.slice(-selectedDays);

  const firstPrice = filteredData[0]?.price || currentPrice;
  const isPositive = currentPrice >= firstPrice;
  const gradientColor = isPositive ? '#10b981' : '#ef4444';

  const formatDate = (date) => {
    const d = new Date(date);
    if (selectedDays <= 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
    if (selectedDays <= 90) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="chart-container">
            <div className="chart-header">
                <h3 className="chart-title">Price Chart</h3>
                <div className="chart-range-buttons">
                    {timeRanges.map((r) =>
          <button
            key={r.label}
            onClick={() => setRange(r.label)}
            className={`chart-range-btn ${range === r.label ? 'active' : ''}`}>
            
                            {r.label}
                        </button>
          )}
                </div>
            </div>
            <div className="chart-body">
                <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={filteredData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                        <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="var(--text-tertiary)"
              fontSize={11}
              tickLine={false}
              interval="preserveStartEnd" />
            
                        <YAxis
              stroke="var(--text-tertiary)"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `₹${v.toLocaleString()}`}
              domain={['auto', 'auto']} />
            
                        <Tooltip
              contentStyle={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-primary)'
              }}
              formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Price']}
              labelFormatter={(label) => new Date(String(label)).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
            
                        <Area
              type="monotone"
              dataKey="price"
              stroke={gradientColor}
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, fill: gradientColor }} />
            
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>);

}