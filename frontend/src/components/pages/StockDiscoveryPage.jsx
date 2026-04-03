'use client';
import { useState, useMemo } from 'react';
import { T } from '@/lib/tokens';
import { fmt, fmtPct } from '@/lib/utils';
import { MOCK_PRICES } from '@/lib/data/mockData';
import { stocks } from '@/lib/data/stockData';
import { generateAIInsight } from '@/lib/ai/aiEngine';
import { useLivePrices } from '@/hooks/useLivePrice';

const SECTORS = ['All', ...Array.from(new Set(stocks.map((s) => s.sector)))];

export default function StockDiscoveryPage({ currency }) {
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('overview');

  const tickers = stocks.map((s) => s.ticker);
  const { prices: livePrices, loading, refresh } = useLivePrices(tickers, 120000);
  const hasAnyLive = Object.values(livePrices).some((p) => p?.data?.price);

  const getPrice = (ticker) => {
    const live = livePrices[ticker];
    if (live?.data?.price) return { price: live.data.price, change: live.data.change, changePct: live.data.changePercent, isLive: true, high: live.data.high, low: live.data.low, volume: live.data.volume };
    const mock = MOCK_PRICES[ticker];
    if (mock) return { price: mock.price, change: mock.change, changePct: mock.changePct, isLive: false, high: mock.high, low: mock.low, volume: mock.volume };
    const s = stocks.find((x) => x.ticker === ticker);
    return { price: s?.price || 0, change: s?.change || 0, changePct: s?.changePercent || 0, isLive: false, high: s?.weekHigh52 || 0, low: s?.weekLow52 || 0, volume: '0' };
  };

  const filtered = useMemo(() => stocks.filter((s) => {
    if (sectorFilter !== 'All' && s.sector !== sectorFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.ticker.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [search, sectorFilter]);

  const insight = useMemo(() => selected ? generateAIInsight(selected) : null, [selected]);

  const closeModal = () => { setSelected(null); setTab('overview'); };

  const scoreFromInsight = (stock) => {
    const i = generateAIInsight(stock);
    return (i.recommendation.confidence / 10).toFixed(1);
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 className="page-title">Stock Intelligence</h1><p style={{ fontSize: 13, color: T.text.tertiary, marginTop: 4 }}>AI-driven analysis with live BSE prices · {stocks.length} stocks</p></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasAnyLive && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: T.accent.teal, boxShadow: `0 0 8px ${T.accent.teal}60`, animation: 'pulseDot 2s ease infinite' }} />}
          <span style={{ fontSize: 10.5, color: hasAnyLive ? T.accent.teal : T.text.tertiary, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {hasAnyLive ? 'Live BSE' : 'Loading...'}
          </span>
          <button className="retry-btn" onClick={refresh} disabled={loading} style={{ fontSize: 11, padding: '5px 12px' }}>↻</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input-field" style={{ maxWidth: 260 }} placeholder="Search stocks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {SECTORS.map((s) => <button key={s} className={`filter-pill${sectorFilter === s ? ' active' : ''}`} onClick={() => setSectorFilter(s)}>{s}</button>)}
      </div>

      <div className="stock-grid-discovery">
        {filtered.map((stock) => {
          const p = getPrice(stock.ticker);
          const up = (p.changePct ?? 0) >= 0;
          const si = generateAIInsight(stock);
          const score = (si.recommendation.confidence / 10).toFixed(1);
          const scoreNum = parseFloat(score);
          const scoreBg = scoreNum >= 8 ? 'rgba(0,212,170,.12)' : scoreNum >= 5 ? 'rgba(245,200,66,.12)' : 'rgba(255,94,108,.12)';
          const scoreColor = scoreNum >= 8 ? T.accent.teal : scoreNum >= 5 ? T.accent.gold : T.accent.danger;
          return (
            <div key={stock.ticker} className="stock-intelligence-card" onClick={() => { setSelected(stock); setTab('overview'); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{stock.ticker}</span>
                    {p.isLive && <span style={{ fontSize: 8, padding: '2px 5px', borderRadius: 4, background: 'rgba(0,212,170,.12)', color: T.accent.teal, fontWeight: 700 }}>LIVE</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.text.tertiary, marginTop: 2 }}>{stock.name}</div>
                </div>
                <div className="score-badge" style={{ background: scoreBg, color: scoreColor }}>◈ {score}/10</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{fmt(p.price || stock.price, currency)}</span>
                <span className="mono" style={{ fontSize: 12, color: up ? T.accent.teal : T.accent.danger, fontWeight: 600 }}>{up ? '▲' : '▼'} {fmtPct(p.changePct ?? stock.changePercent)}</span>
              </div>
              <div style={{ marginTop: 10 }}><span className="tag" style={{ background: 'rgba(77,159,255,.1)', color: T.accent.blue }}>{stock.sector}</span></div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selected && insight && (
        <div className="stock-detail-modal" onClick={closeModal}>
          <div className="stock-detail-panel fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Fraunces',serif" }}>{selected.ticker}</span>
                  {getPrice(selected.ticker).isLive && <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, background: 'rgba(0,212,170,.12)', color: T.accent.teal, fontWeight: 700 }}>LIVE BSE</span>}
                </div>
                <div style={{ fontSize: 13, color: T.text.tertiary }}>{selected.name} · {selected.sector}</div>
              </div>
              <button onClick={closeModal} style={{ color: T.text.tertiary, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="stock-detail-tabs">
              <button className={`stock-detail-tab${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
              <button className={`stock-detail-tab${tab === 'swot' ? ' active' : ''}`} onClick={() => setTab('swot')}>SWOT Analysis</button>
            </div>

            {tab === 'overview' && (() => {
              const p = getPrice(selected.ticker);
              const up = (p.changePct ?? selected.changePercent) >= 0;
              const rec = insight.recommendation;
              const actionColor = rec.action.includes('Buy') ? T.accent.teal : rec.action.includes('Sell') ? T.accent.danger : T.accent.gold;
              return (
                <div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', marginBottom: 16 }}>
                    <span className="mono" style={{ fontSize: 36, fontWeight: 700 }}>{fmt(p.price || selected.price, currency)}</span>
                    <span className="mono" style={{ fontSize: 16, color: up ? T.accent.teal : T.accent.danger }}>
                      {up ? '+' : ''}{fmt(p.change || selected.change, currency)} ({fmtPct(p.changePct ?? selected.changePercent)})
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <span style={{ padding: '4px 12px', borderRadius: 20, background: `${actionColor}18`, color: actionColor, fontSize: 12, fontWeight: 700 }}>{rec.action}</span>
                    <span style={{ fontSize: 12, color: T.text.tertiary }}>Confidence: {rec.confidence}%</span>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${rec.confidence}%`, background: actionColor, borderRadius: 2, transition: 'width .5s' }} />
                    </div>
                  </div>
                  <div className="metrics-grid" style={{ marginBottom: 20 }}>
                    <div className="metric-chip"><div className="metric-chip-label">High</div><div className="metric-chip-value mono">{fmt(Number(p.high) || selected.weekHigh52, currency)}</div></div>
                    <div className="metric-chip"><div className="metric-chip-label">Low</div><div className="metric-chip-value mono">{fmt(Number(p.low) || selected.weekLow52, currency)}</div></div>
                    <div className="metric-chip"><div className="metric-chip-label">P/E</div><div className="metric-chip-value mono">{selected.pe}x</div></div>
                    <div className="metric-chip"><div className="metric-chip-label">ROE</div><div className="metric-chip-value mono">{selected.roe}%</div></div>
                    <div className="metric-chip"><div className="metric-chip-label">D/E Ratio</div><div className="metric-chip-value mono">{selected.debtToEquity}</div></div>
                    <div className="metric-chip"><div className="metric-chip-label">Market Cap</div><div className="metric-chip-value mono">₹{(selected.marketCap / 100000).toFixed(0)}L Cr</div></div>
                  </div>
                </div>
              );
            })()}

            {tab === 'swot' && (
              <div className="swot-grid">
                <div className="swot-card strength"><div className="swot-title" style={{ color: T.accent.teal }}>Strengths</div>{insight.swot.strengths.map((s, i) => <div key={i} className="swot-item">• {s}</div>)}</div>
                <div className="swot-card weakness"><div className="swot-title" style={{ color: T.accent.danger }}>Weaknesses</div>{insight.swot.weaknesses.map((w, i) => <div key={i} className="swot-item">• {w}</div>)}</div>
                <div className="swot-card opportunity"><div className="swot-title" style={{ color: T.accent.blue }}>Opportunities</div>{insight.swot.opportunities.map((o, i) => <div key={i} className="swot-item">• {o}</div>)}</div>
                <div className="swot-card threat"><div className="swot-title" style={{ color: T.accent.orange }}>Threats</div>{insight.swot.threats.map((t, i) => <div key={i} className="swot-item">• {t}</div>)}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
