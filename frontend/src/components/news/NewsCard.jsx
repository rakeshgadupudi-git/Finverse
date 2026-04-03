'use client';

import React from 'react';

import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';






export default function NewsCard({ news, showAISummary = true }) {
  const sentimentConfig = {
    positive: { color: 'sentiment-positive', icon: <TrendingUp size={12} />, label: 'Positive' },
    negative: { color: 'sentiment-negative', icon: <TrendingDown size={12} />, label: 'Negative' },
    neutral: { color: 'sentiment-neutral', icon: <Minus size={12} />, label: 'Neutral' }
  };

  const config = sentimentConfig[news.sentiment];

  return (
    <div className="news-card">
            <div className="news-card-header">
                <div className="news-meta">
                    <span className="news-source">{news.source}</span>
                    <span className="news-date">{new Date(news.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className={`news-sentiment-badge ${config.color}`}>
                    {config.icon}
                    <span>{config.label}</span>
                </div>
            </div>
            <h4 className="news-title">{news.title}</h4>
            <p className="news-summary">{news.summary}</p>
            {showAISummary && news.aiSummary &&
      <div className="news-ai-summary">
                    <div className="ai-summary-header">
                        <Sparkles size={12} />
                        <span>AI Summary</span>
                    </div>
                    <p>{news.aiSummary}</p>
                </div>
      }
            {news.ticker &&
      <span className="news-ticker-tag">{news.ticker}</span>
      }
        </div>);

}