'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line } from
'recharts';








export default function FundamentalCharts({ revenueHistory, profitHistory, holdingHistory }) {
  const combinedFinancials = revenueHistory.map((r, i) => ({
    year: r.year,
    revenue: r.value,
    profit: profitHistory[i]?.value || 0
  }));

  return (
    <div className="fundamental-charts-grid">
            {/* Revenue & Profit Chart */}
            <div className="chart-container">
                <h3 className="chart-title">Revenue &amp; Profit Trend</h3>
                <div className="chart-subtitle">₹ in Crores</div>
                <div className="chart-body">
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={combinedFinancials} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="year" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} />
                            <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                            <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}
                formatter={(value) => [`₹${Number(value).toLocaleString()} Cr`]} />
              
                            <Legend />
                            <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                            <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Holding Pattern Chart */}
            <div className="chart-container">
                <h3 className="chart-title">Shareholding Pattern</h3>
                <div className="chart-subtitle">Quarterly trend (%)</div>
                <div className="chart-body">
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={holdingHistory} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="quarter" stroke="var(--text-tertiary)" fontSize={10} tickLine={false} />
                            <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                            <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}
                formatter={(value) => [`${Number(value).toFixed(1)}%`]} />
              
                            <Legend />
                            <Line type="monotone" dataKey="promoter" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Promoter" />
                            <Line type="monotone" dataKey="institutional" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Institutional" />
                            <Line type="monotone" dataKey="retail" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} name="Retail" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>);

}