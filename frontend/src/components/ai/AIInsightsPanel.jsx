'use client';

import React from 'react';

import {
  Shield, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
  Target, Zap, BarChart3, ArrowUpRight, ArrowDownRight } from
'lucide-react';





export default function AIInsightsPanel({ insight }) {
  const { recommendation: rec, swot, sentiment: sent } = insight;

  const actionColors = {
    'Strong Buy': 'action-strong-buy',
    'Buy': 'action-buy',
    'Hold': 'action-hold',
    'Sell': 'action-sell',
    'Strong Sell': 'action-strong-sell'
  };

  const outlookIcon = rec.outlook === 'Bullish' ? <TrendingUp size={16} /> :
  rec.outlook === 'Bearish' ? <TrendingDown size={16} /> : <Minus size={16} />;

  return (
    <div className="ai-insights-container">
            {/* Recommendation Card */}
            <div className="ai-card ai-recommendation-card">
                <div className="ai-card-header">
                    <Target size={18} />
                    <h3>AI Recommendation</h3>
                </div>
                <div className={`ai-action-badge ${actionColors[rec.action]}`}>
                    {rec.action}
                </div>
                <div className="ai-confidence-bar">
                    <span>Confidence</span>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${rec.confidence}%` }} />
                    </div>
                    <span className="progress-value">{rec.confidence}%</span>
                </div>
                <div className="ai-metrics-row">
                    <div className="ai-metric">
                        <span className="ai-metric-label">Outlook</span>
                        <span className={`ai-metric-value outlook-${rec.outlook.toLowerCase()}`}>
                            {outlookIcon} {rec.outlook}
                        </span>
                    </div>
                    <div className="ai-metric">
                        <span className="ai-metric-label">Risk Score</span>
                        <span className={`ai-metric-value ${rec.riskScore > 60 ? 'risk-high' : rec.riskScore > 35 ? 'risk-medium' : 'risk-low'}`}>
                            <Shield size={14} /> {rec.riskScore}/100
                        </span>
                    </div>
                </div>
                <div className={`valuation-alert valuation-${rec.valuationAlert.toLowerCase().replace(' ', '-')}`}>
                    <AlertTriangle size={14} />
                    <span>{rec.valuationAlert}</span>
                </div>
            </div>

            {/* Time Horizon Card */}
            <div className="ai-card">
                <div className="ai-card-header">
                    <BarChart3 size={18} />
                    <h3>Investment Horizon</h3>
                </div>
                <div className="horizon-grid">
                    {[
          { label: 'Short Term', value: rec.shortTermSuitability, desc: '< 6 months' },
          { label: 'Mid Term', value: rec.midTermSuitability, desc: '6-24 months' },
          { label: 'Long Term', value: rec.longTermSuitability, desc: '> 2 years' }].
          map((h) =>
          <div key={h.label} className={`horizon-item horizon-${h.value.toLowerCase()}`}>
                            <span className="horizon-label">{h.label}</span>
                            <span className="horizon-value">{h.value}</span>
                            <span className="horizon-desc">{h.desc}</span>
                        </div>
          )}
                </div>
            </div>

            {/* Sentiment Card */}
            <div className="ai-card">
                <div className="ai-card-header">
                    <Zap size={18} />
                    <h3>Market Sentiment</h3>
                </div>
                <div className="sentiment-metrics">
                    <div className="sentiment-metric">
                        <span className="sentiment-label">Social Score</span>
                        <div className="sentiment-gauge">
                            <div className="gauge-fill" style={{ width: `${sent.socialScore}%` }} />
                        </div>
                        <span className="sentiment-value">{sent.socialScore}/100</span>
                    </div>
                    <div className="sentiment-metric">
                        <span className="sentiment-label">Analyst Rating</span>
                        <div className="sentiment-gauge">
                            <div className="gauge-fill" style={{ width: `${sent.analystRating / 5 * 100}%` }} />
                        </div>
                        <span className="sentiment-value">{sent.analystRating}/5.0</span>
                    </div>
                    <div className="sentiment-metric">
                        <span className="sentiment-label">Confidence</span>
                        <div className="sentiment-gauge">
                            <div className="gauge-fill" style={{ width: `${sent.confidenceScore}%` }} />
                        </div>
                        <span className="sentiment-value">{sent.confidenceScore}%</span>
                    </div>
                </div>
                <div className="analyst-consensus">
                    <div className="analyst-bar">
                        <div className="analyst-buy" style={{ width: `${sent.buyCount / sent.totalAnalysts * 100}%` }}>{sent.buyCount} Buy</div>
                        <div className="analyst-hold" style={{ width: `${sent.holdCount / sent.totalAnalysts * 100}%` }}>{sent.holdCount} Hold</div>
                        <div className="analyst-sell" style={{ width: `${sent.sellCount / sent.totalAnalysts * 100}%` }}>{sent.sellCount} Sell</div>
                    </div>
                    <span className="analyst-total">{sent.totalAnalysts} Analysts</span>
                </div>
            </div>

            {/* SWOT Card */}
            <div className="ai-card ai-swot-card">
                <div className="ai-card-header">
                    <CheckCircle size={18} />
                    <h3>SWOT Analysis</h3>
                </div>
                <div className="swot-grid">
                    <div className="swot-section swot-strengths">
                        <h4><ArrowUpRight size={14} /> Strengths</h4>
                        <ul>{swot.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                    <div className="swot-section swot-weaknesses">
                        <h4><ArrowDownRight size={14} /> Weaknesses</h4>
                        <ul>{swot.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
                    </div>
                    <div className="swot-section swot-opportunities">
                        <h4><TrendingUp size={14} /> Opportunities</h4>
                        <ul>{swot.opportunities.map((o, i) => <li key={i}>{o}</li>)}</ul>
                    </div>
                    <div className="swot-section swot-threats">
                        <h4><AlertTriangle size={14} /> Threats</h4>
                        <ul>{swot.threats.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    </div>
                </div>
            </div>

            {/* Reasoning */}
            <div className="ai-card">
                <div className="ai-card-header">
                    <Target size={18} />
                    <h3>AI Reasoning</h3>
                </div>
                <ul className="ai-reasoning-list">
                    {rec.reasoning.map((r, i) =>
          <li key={i}>{r}</li>
          )}
                </ul>
            </div>
        </div>);

}