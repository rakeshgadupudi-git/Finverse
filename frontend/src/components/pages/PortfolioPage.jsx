'use client';
import { useMemo, useState, useCallback } from 'react';

// Popular Indian stocks for Add-Modal autocomplete
const POPULAR_STOCKS = [
  { symbol: 'RELIANCE',   name: 'Reliance Industries',          sector: 'Energy'  },
  { symbol: 'TCS',        name: 'Tata Consultancy Services',    sector: 'IT'      },
  { symbol: 'INFY',       name: 'Infosys Ltd',                  sector: 'IT'      },
  { symbol: 'HDFCBANK',   name: 'HDFC Bank',                    sector: 'Banking' },
  { symbol: 'ICICIBANK',  name: 'ICICI Bank',                   sector: 'Banking' },
  { symbol: 'SBIN',       name: 'State Bank of India',          sector: 'Banking' },
  { symbol: 'AXISBANK',   name: 'Axis Bank',                    sector: 'Banking' },
  { symbol: 'KOTAKBANK',  name: 'Kotak Mahindra Bank',          sector: 'Banking' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank',                sector: 'Banking' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever',           sector: 'FMCG'   },
  { symbol: 'ITC',        name: 'ITC Ltd',                      sector: 'FMCG'   },
  { symbol: 'NESTLEIND',  name: 'Nestle India',                 sector: 'FMCG'   },
  { symbol: 'TITAN',      name: 'Titan Company',                sector: 'FMCG'   },
  { symbol: 'ASIANPAINT', name: 'Asian Paints',                 sector: 'FMCG'   },
  { symbol: 'MARICO',     name: 'Marico Ltd',                   sector: 'FMCG'   },
  { symbol: 'DABUR',      name: 'Dabur India',                  sector: 'FMCG'   },
  { symbol: 'BRITANNIA',  name: 'Britannia Industries',         sector: 'FMCG'   },
  { symbol: 'PIDILITIND', name: 'Pidilite Industries',          sector: 'FMCG'   },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel',                sector: 'Telecom' },
  { symbol: 'WIPRO',      name: 'Wipro Ltd',                    sector: 'IT'     },
  { symbol: 'HCLTECH',    name: 'HCL Technologies',             sector: 'IT'     },
  { symbol: 'TECHM',      name: 'Tech Mahindra',                sector: 'IT'     },
  { symbol: 'LT',         name: 'Larsen & Toubro',              sector: 'Infra'  },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement',             sector: 'Infra'  },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ',            sector: 'Infra'  },
  { symbol: 'GRASIM',     name: 'Grasim Industries',            sector: 'Infra'  },
  { symbol: 'HAVELLS',    name: 'Havells India',                sector: 'Infra'  },
  { symbol: 'SIEMENS',    name: 'Siemens India',                sector: 'Infra'  },
  { symbol: 'IRCTC',      name: 'Indian Railway Catering',      sector: 'Infra'  },
  { symbol: 'SUNPHARMA',  name: 'Sun Pharmaceutical',           sector: 'Pharma' },
  { symbol: 'DRREDDY',    name: "Dr. Reddy's Laboratories",     sector: 'Pharma' },
  { symbol: 'CIPLA',      name: 'Cipla Ltd',                    sector: 'Pharma' },
  { symbol: 'DIVISLAB',   name: "Divi's Laboratories",          sector: 'Pharma' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals',             sector: 'Pharma' },
  { symbol: 'MARUTI',     name: 'Maruti Suzuki India',          sector: 'Auto'   },
  { symbol: 'TATAMOTORS', name: 'Tata Motors',                  sector: 'Auto'   },
  { symbol: 'EICHERMOT',  name: 'Eicher Motors',                sector: 'Auto'   },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp',                sector: 'Auto'   },
  { symbol: 'M&M',        name: 'Mahindra & Mahindra',          sector: 'Auto'   },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto',                   sector: 'Auto'   },
  { symbol: 'TATASTEEL',  name: 'Tata Steel',                   sector: 'Metal'  },
  { symbol: 'HINDALCO',   name: 'Hindalco Industries',          sector: 'Metal'  },
  { symbol: 'JSWSTEEL',   name: 'JSW Steel',                    sector: 'Metal'  },
  { symbol: 'VEDL',       name: 'Vedanta Ltd',                  sector: 'Metal'  },
  { symbol: 'NTPC',       name: 'NTPC Ltd',                     sector: 'Energy' },
  { symbol: 'ONGC',       name: 'Oil & Natural Gas Corp',       sector: 'Energy' },
  { symbol: 'POWERGRID',  name: 'Power Grid Corporation',       sector: 'Energy' },
  { symbol: 'BPCL',       name: 'Bharat Petroleum',             sector: 'Energy' },
  { symbol: 'IOC',        name: 'Indian Oil Corporation',       sector: 'Energy' },
  { symbol: 'ADANIENT',   name: 'Adani Enterprises',            sector: 'Energy' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance',                sector: 'Finance'},
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv',                sector: 'Finance'},
  { symbol: 'HDFCLIFE',   name: 'HDFC Life Insurance',          sector: 'Finance'},
  { symbol: 'SBILIFE',    name: 'SBI Life Insurance',           sector: 'Finance'},
  { symbol: 'ICICIPRULI', name: 'ICICI Prudential Life',        sector: 'Finance'},
  { symbol: 'ZOMATO',     name: 'Zomato Ltd',                   sector: 'IT'     },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products',       sector: 'FMCG'  },
  { symbol: 'COAL',       name: 'Coal India',                   sector: 'Energy' },
];
import ConfirmModal from '@/components/ui/ConfirmModal';
import { T } from '@/lib/tokens';
import { fmt, fmtPct } from '@/lib/utils';
import { usePortfolio } from '@/context/PortfolioContext';
import {
  GrowthChart, AllocationPie, ProjectionChart, HealthRing, HeatmapChart,
  DrawdownChart, RiskReturnScatter } from
'@/components/charts/PortfolioCharts';
import { HoldingRow, HoldingEditRow, HoldingCardMobile, ShimmerRows, LiveDot, SortArrow, GRID_COLS } from '@/components/portfolio/HoldingsTable';


// ═══════════════════════════════════════════
// ANIMATED NUMBER
// ═══════════════════════════════════════════

function AnimatedNumber({ value, prefix = '', suffix = '', color }) {
  return (
    <span className="mono animated-number" style={{ color }}>
            {prefix}{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}{suffix}
        </span>);

}

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

export default function PortfolioPage({ currency }) {
  const {
    loading, prices, stats, insights, refreshPrices, addHolding, updateHolding, removeHolding,
    enrichedHoldings, healthScore, diversification, concentration,
    sectorAllocation, taxIntelligence, predictive, xirr, momentum, projection,
    growthData, drawdownData, riskReturnData, taxTimeline
  } = usePortfolio();

  // State
  const [sortKey, setSortKey] = useState('currentValue');
  const [sortDir, setSortDir] = useState('desc');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [scenario, setScenario] = useState('base');
  const [timeframe, setTimeframe] = useState('6M');
  const [activeTab, setActiveTab] = useState('holdings');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ qty: '', buyPrice: '' });
  const [editError, setEditError] = useState('');
  const [deleteHoldingId, setDeleteHoldingId] = useState(null);
  const [addForm, setAddForm] = useState({
    symbol: '', name: '', sector: 'IT', qty: '', buyPrice: '',
    buyDate: new Date().toISOString().slice(0, 10),
  });
  // Search autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  // Per-field validation errors
  const [addErrors, setAddErrors] = useState({});

  // ── Stock search autocomplete ──────────────
  const handleSymbolSearch = useCallback((query) => {
    setSearchQuery(query);
    setAddForm(f => ({ ...f, symbol: query }));
    setAddErrors(e => ({ ...e, symbol: '' }));
    if (query.length < 1) { setSearchResults([]); setShowSearchDrop(false); return; }
    const q = query.toUpperCase();
    const results = POPULAR_STOCKS.filter(s =>
      s.symbol.startsWith(q) || s.name.toUpperCase().includes(q)
    ).slice(0, 8);
    setSearchResults(results);
    setShowSearchDrop(results.length > 0);
  }, []);

  const handleSelectStock = useCallback((stock) => {
    setAddForm(f => ({ ...f, symbol: stock.symbol, name: stock.name, sector: stock.sector }));
    setSearchQuery(stock.symbol);
    setShowSearchDrop(false);
    setAddErrors(e => ({ ...e, symbol: '', name: '' }));
  }, []);

  // ── Add holding with validation ────────────
  const handleAddSubmit = useCallback(() => {
    const sym = addForm.symbol.toUpperCase().trim();
    const errors = {};
    if (!sym)                              errors.symbol    = 'Ticker symbol is required';
    if (!addForm.name.trim())              errors.name      = 'Company name is required';
    if (!addForm.qty || Number(addForm.qty) <= 0)
                                           errors.qty       = 'Enter a valid quantity';
    if (!addForm.buyPrice || Number(addForm.buyPrice) <= 0)
                                           errors.buyPrice  = 'Enter a valid price';
    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    addHolding({
      symbol: sym,
      name: addForm.name.trim(),
      sector: addForm.sector,
      qty: Number(addForm.qty),
      buyPrice: Number(addForm.buyPrice),
      buyDate: addForm.buyDate,
    });
    setAddForm({ symbol: '', name: '', sector: 'IT', qty: '', buyPrice: '', buyDate: new Date().toISOString().slice(0, 10) });
    setSearchQuery('');
    setAddErrors({});
    setShowAddModal(false);
  }, [addForm, addHolding]);

  const handleStartEdit = useCallback((id, qty, buyPrice) => {
    setEditingId(id);
    setEditForm({ qty: String(qty), buyPrice: String(buyPrice) });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingId === null) return;
    const qty = Number(editForm.qty);
    const buyPrice = Number(editForm.buyPrice);
    if (qty <= 0 || buyPrice <= 0) { setEditError('Quantity and buy price must be greater than 0'); return; }
    setEditError('');
    updateHolding(editingId, { qty, buyPrice });
    setEditingId(null);
  }, [editingId, editForm, updateHolding]);

  const handleCancelEdit = useCallback(() => setEditingId(null), []);

  const handleDeleteHolding = useCallback((id) => {
    setDeleteHoldingId(id);
  }, []);

  const confirmDeleteHolding = useCallback(() => {
    if (deleteHoldingId !== null) { removeHolding(deleteHoldingId); setDeleteHoldingId(null); }
  }, [deleteHoldingId, removeHolding]);

  const hasAnyLive = useMemo(() => {
    return Object.values(prices).some((p) => p && typeof p.price === 'number' && p.price > 0);
  }, [prices]);

  // Sorted & filtered holdings
  const displayHoldings = useMemo(() => {
    let list = [...enrichedHoldings];
    if (sectorFilter !== 'All') {
      list = list.filter((h) => h.sector === sectorFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'symbol':        cmp = a.symbol.localeCompare(b.symbol);          break;
        case 'sector':        cmp = a.sector.localeCompare(b.sector);          break;
        case 'currentValue':  cmp = a.currentValue - b.currentValue;           break;
        case 'currentPrice':  cmp = a.currentPrice - b.currentPrice;           break;
        case 'gainPct':       cmp = a.gainPct - b.gainPct;                     break;
        case 'dayChangePct':  cmp = a.dayChangePct - b.dayChangePct;           break;
        case 'allocationPct': cmp = a.allocationPct - b.allocationPct;         break;
        case 'gain':          cmp = a.gain - b.gain;                           break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [enrichedHoldings, sortKey, sortDir, sectorFilter]);

  const sectors = useMemo(() => {
    const s = new Set(enrichedHoldings.map((h) => h.sector));
    return ['All', ...Array.from(s).sort()];
  }, [enrichedHoldings]);

  // Dynamic growth + drawdown data
  const currentGrowthData    = useMemo(() => growthData(timeframe),    [growthData,    timeframe]);
  const currentDrawdownData  = useMemo(() => drawdownData(timeframe),  [drawdownData,  timeframe]);

  // Max drawdown % for the intelligence card (use 6M as canonical view)
  const sixMDrawdown = useMemo(() => drawdownData('6M'), [drawdownData]);
  const maxDrawdown  = useMemo(() => {
    if (!sixMDrawdown || sixMDrawdown.length === 0) return 0;
    return Math.min(...sixMDrawdown.map(d => d.drawdown));
  }, [sixMDrawdown]);

  // Duplicate symbol check for Add Modal warning
  const isDuplicateSymbol = useMemo(() =>
    enrichedHoldings.some(h => h.symbol === addForm.symbol.toUpperCase().trim()),
    [enrichedHoldings, addForm.symbol]
  );

  // Total invested cost across all holdings (for header summary)
  const totalInvested = useMemo(() =>
    enrichedHoldings.reduce((s, h) => s + h.qty * h.buyPrice, 0),
    [enrichedHoldings]
  );

  const handleSort = useCallback((key) => {
    setSortDir((d) => sortKey === key ? d === 'desc' ? 'asc' : 'desc' : 'desc');
    setSortKey(key);
  }, [sortKey]);

  const allocationData = useMemo(() => {
    return sectorAllocation.map((s) => ({
      label: s.sector,
      value: s.value,
      color: s.color
    }));
  }, [sectorAllocation]);

  const isEmpty = enrichedHoldings.length === 0;

  // CSV Export
  const handleExportCSV = useCallback(() => {
    if (enrichedHoldings.length === 0) return;
    const headers = ['Symbol', 'Name', 'Sector', 'Qty', 'Buy Price', 'CMP', 'Value', 'P&L', 'P&L %', 'Allocation %'];
    const rows = enrichedHoldings.map((h) => [
    h.symbol, h.name, h.sector, h.qty, h.buyPrice.toFixed(2),
    h.currentPrice.toFixed(2), h.currentValue.toFixed(2), h.gain.toFixed(2),
    h.gainPct.toFixed(2), h.allocationPct.toFixed(2)]
    );
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [enrichedHoldings]);

  // Win rate + profit factor
  const winRate = useMemo(() => {
    if (enrichedHoldings.length === 0) return 0;
    return Math.round(enrichedHoldings.filter((h) => h.gain > 0).length / enrichedHoldings.length * 100);
  }, [enrichedHoldings]);

  const profitFactor = useMemo(() => {
    const gains = enrichedHoldings.filter((h) => h.gain > 0).reduce((s, h) => s + h.gain, 0);
    const losses = Math.abs(enrichedHoldings.filter((h) => h.gain < 0).reduce((s, h) => s + h.gain, 0));
    return losses > 0 ? (gains / losses).toFixed(2) : gains > 0 ? '∞' : '0';
  }, [enrichedHoldings]);

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* ═══ HEADER ═══ */}
            <div className="portfolio-header">
                <div className="portfolio-header-left">
                    <HealthRing score={healthScore.score} color={healthScore.color} size={72} label={healthScore.grade} />
                    <div className="portfolio-header-info">
                        <h1 className="page-title">Portfolio</h1>
                        <div className="portfolio-value-big" style={{ color: T.accent.teal }}>
                            {fmt(stats.totalValue, currency)}
                        </div>
                        <div className="portfolio-day-change" style={{ color: stats.dayGain >= 0 ? T.accent.teal : T.accent.danger }}>
                            {stats.dayGain >= 0 ? '▲' : '▼'} {fmt(Math.abs(stats.dayGain), currency)} ({fmtPct(stats.dayGainPct)}) today
                        </div>
                        <div className="port-summary-wrap">
                            <div className="port-summary-item">
                                <span className="port-summary-label">Invested</span>
                                <span className="port-summary-value mono">{fmt(totalInvested, currency)}</span>
                            </div>
                            <div className="port-summary-item">
                                <span className="port-summary-label">Total P&L</span>
                                <span className="port-summary-value mono" style={{ color: stats.totalGain >= 0 ? T.accent.teal : T.accent.danger }}>
                                    {stats.totalGain >= 0 ? '+' : ''}{fmt(stats.totalGain, currency)}
                                </span>
                            </div>
                            <div className="port-summary-item">
                                <span className="port-summary-label">Overall Return</span>
                                <span className="port-summary-value mono" style={{ color: stats.totalGain >= 0 ? T.accent.teal : T.accent.danger }}>
                                    {stats.totalGain >= 0 ? '+' : ''}{fmtPct(totalInvested > 0 ? (stats.totalGain / totalInvested) * 100 : 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="portfolio-header-right">
                    <div className="live-indicator" style={{ color: hasAnyLive ? T.accent.teal : T.text.tertiary }}>
                        {hasAnyLive && <LiveDot loading={loading} />}
                        {hasAnyLive ? 'Real-time' : 'Mock Data'}
                    </div>
                    <button className="retry-btn" onClick={refreshPrices} disabled={loading} style={{ fontSize: 11, padding: '5px 12px' }}>↻ Refresh</button>
                </div>
            </div>

            {/* ═══ INTELLIGENCE GRID ═══ */}
            <div className="intelligence-grid">
                <div className="intelligence-card">
                    <div className="intelligence-card-label">📊 Diversification</div>
                    <div className="intelligence-card-value" style={{ color: diversification.score >= 60 ? T.accent.teal : T.accent.gold }}>
                        {diversification.score}
                    </div>
                    <div className="intelligence-card-sub">{diversification.grade}</div>
                    <div className="intelligence-card-hint">
                        {diversification.score >= 60 ? 'Well-diversified portfolio' : diversification.score >= 40 ? 'Consider adding 2-3 sectors' : 'High risk — diversify urgently'}
                    </div>
                </div>

                <div className="intelligence-card">
                    <div className="intelligence-card-label">🎯 Concentration</div>
                    <div className="intelligence-card-value" style={{ color: concentration.color }}>
                        {concentration.maxWeight.toFixed(1)}%
                    </div>
                    <div className="intelligence-card-sub">{concentration.level} · {concentration.maxWeightSymbol}</div>
                    <div className="intelligence-card-hint">
                        {concentration.maxWeight > 40 ? '⚠️ Top stock > 40% — rebalance' : concentration.maxWeight > 25 ? 'Monitor top holding' : '✓ Well balanced'}
                    </div>
                </div>

                <div className="intelligence-card">
                    <div className="intelligence-card-label">🚀 Momentum</div>
                    <div className="intelligence-card-value" style={{ color: momentum.color }}>
                        {momentum.score > 0 ? '+' : ''}{momentum.score}
                    </div>
                    <div className="intelligence-card-sub">{momentum.label}</div>
                </div>

                <div className="intelligence-card">
                    <div className="intelligence-card-label">📈 XIRR</div>
                    <div className="intelligence-card-value" style={{ color: xirr >= 0 ? T.accent.teal : T.accent.danger }}>
                        {xirr > 0 ? '+' : ''}{xirr}%
                    </div>
                    <div className="intelligence-card-sub">Annualized return</div>
                    <div className="intelligence-card-hint">
                        {xirr > 15 ? '🏆 Beating Nifty 50 avg (12-15%)' : xirr > 8 ? '✓ Decent, near benchmark' : '⚠️ Below inflation-adj returns'}
                    </div>
                </div>

                <div className="intelligence-card">
                    <div className="intelligence-card-label">⚡ Sharpe</div>
                    <div className="intelligence-card-value" style={{ color: stats.sharpeRatio > 1.5 ? T.accent.teal : stats.sharpeRatio > 0.5 ? T.accent.gold : T.accent.danger }}>
                        {stats.sharpeRatio.toFixed(2)}
                    </div>
                    <div className="intelligence-card-sub">β: {stats.beta} · Vol: {stats.volatility}%</div>
                    <div className="intelligence-card-hint">
                        {stats.sharpeRatio > 1.5 ? 'Excellent risk-adjusted returns' : stats.sharpeRatio > 0.5 ? 'Acceptable, room to improve' : 'Poor — too much risk for return'}
                    </div>
                </div>

                <div className="intelligence-card">
                    <div className="intelligence-card-label">🏆 Win Rate</div>
                    <div className="intelligence-card-value" style={{ color: winRate >= 60 ? T.accent.teal : winRate >= 40 ? T.accent.gold : T.accent.danger }}>
                        {winRate}%
                    </div>
                    <div className="intelligence-card-sub">
                        {enrichedHoldings.filter((h) => h.gain > 0).length} of {enrichedHoldings.length} profitable
                    </div>
                </div>

                <div className="intelligence-card">
                    <div className="intelligence-card-label">⚖️ Profit Factor</div>
                    <div className="intelligence-card-value" style={{ color: Number(profitFactor) > 1.5 ? T.accent.teal : T.accent.gold }}>
                        {profitFactor}
                    </div>
                    <div className="intelligence-card-sub">Gains / Losses ratio</div>
                </div>

                <div className="intelligence-card">
                    <div className="intelligence-card-label">🛡️ Max Drawdown</div>
                    <div className="intelligence-card-value" style={{ color: maxDrawdown < -20 ? T.accent.danger : maxDrawdown < -10 ? T.accent.gold : T.accent.teal }}>
                        {maxDrawdown.toFixed(1)}%
                    </div>
                    <div className="intelligence-card-sub">6M peak-to-trough</div>
                    <div className="intelligence-card-hint">
                        {maxDrawdown < -20 ? '⚠️ Severe drawdown — review risk' : maxDrawdown < -10 ? 'Moderate dip from peak' : '✓ Portfolio staying near peak'}
                    </div>
                </div>
            </div>

            {/* ═══ SMART INSIGHTS CAROUSEL ═══ */}
            {insights.length > 0 &&
      <div className="insight-carousel">
                    {insights.map((insight, i) => {
          const borderColor = insight.type === 'danger' ? T.accent.danger :
          insight.type === 'warning' ? T.accent.orange :
          insight.type === 'success' ? T.accent.teal :
          T.accent.blue;

          return (
            <div key={i} className="insight-chip" style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}>
                                <div className="insight-chip-title" style={{ color: borderColor }}>
                                    <span className="insight-chip-icon">{insight.icon}</span>
                                    {insight.title}
                                </div>
                                <div className="insight-chip-message">{insight.message}</div>
                                {insight.action &&
              <button className="insight-chip-action" style={{ color: borderColor }}>
                                        {insight.action} →
                                    </button>
              }
                            </div>);

        })}
                </div>
      }

            {/* ═══ TAB NAV ═══ */}
            <div className="stock-detail-tabs" style={{ marginBottom: 0 }}>
                {[['holdings', 'Holdings'], ['analytics', 'Analytics'], ['projections', 'Projections'], ['tax', 'Tax Intel']].map(([id, label]) =>
        <button key={id} className={`stock-detail-tab${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>
        )}
            </div>

            {/* ═══ GROWTH (Analytics Tab) ═══ */}
            {activeTab === 'analytics' && <div className="glass-card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>Growth Trend</div>
                    <div className="timeframe-toggle">
                        {['1M', '3M', '6M', '1Y'].map((tf) =>
          <button key={tf} className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`} onClick={() => setTimeframe(tf)}>
                                {tf}
                            </button>
          )}
                    </div>
                </div>
                <GrowthChart data={currentGrowthData} />
                <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: T.text.tertiary }}>
                        <div style={{ width: 12, height: 2, background: T.accent.teal, borderRadius: 1 }} /> Portfolio
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: T.text.tertiary }}>
                        <div style={{ width: 12, height: 2, background: T.accent.gold, borderRadius: 1, opacity: 0.6 }} /> Nifty 50
                    </div>
                </div>
            </div>}

            {/* ═══ PROJECTION (Projections Tab) ═══ */}
            {activeTab === 'projections' && <div className="glass-card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>Future Projection</div>
                    <div className="scenario-toggle">
                        {['bull', 'base', 'bear'].map((s) =>
          <button key={s} className={`scenario-btn ${scenario === s ? 'active' : ''}`} onClick={() => setScenario(s)}>
                                {s === 'bull' ? '🐂 Bull' : s === 'bear' ? '🐻 Bear' : '📊 Base'}
                            </button>
          )}
                    </div>
                </div>
                <ProjectionChart
        months={projection.months}
        base={projection.base}
        bull={projection.bull}
        bear={projection.bear}
        confidenceLow={projection.confidenceLow}
        confidenceHigh={projection.confidenceHigh}
        activeScenario={scenario} />

                <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10.5, color: T.text.tertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        {scenario === 'bull' ? 'Bull' : scenario === 'bear' ? 'Bear' : 'Base'} Case — 6M Estimate
                    </div>
                    <div className="mono" style={{
          fontSize: 20, fontWeight: 700,
          color: scenario === 'bull' ? T.accent.teal : scenario === 'bear' ? T.accent.danger : T.accent.purple
        }}>
                        {fmt(
            (scenario === 'bull' ? projection.bull : scenario === 'bear' ? projection.bear : projection.base)[
            projection.months.length - 1] ?? 0,
            currency
          )}
                    </div>
                    <div style={{ fontSize: 11, color: T.text.secondary, marginTop: 6, lineHeight: 1.5 }}>
                        {scenario === 'bull' ?
          `In a strong market (like 2021), your portfolio could reach ${fmt(projection.bull[projection.months.length - 1] ?? 0, currency)}. This assumes ~18% CAGR & ₹25k SIP.` :
          scenario === 'bear' ?
          `If markets fall (like 2020), you might see ${fmt(projection.bear[projection.months.length - 1] ?? 0, currency)}. This is the cautious scenario at ~4% CAGR.` :
          `Based on historical averages (~12% CAGR), your portfolio should be worth ${fmt(projection.base[projection.months.length - 1] ?? 0, currency)} in 6 months with ₹25k monthly SIP.`
          }
                    </div>
                </div>
            </div>}

            {/* ═══ DRAWDOWN + RISK-RETURN ═══ */}
            {activeTab === 'analytics' && <div className="portfolio-two-col">
                <div className="glass-card" style={{ padding: '22px 24px' }}>
                    <div className="card-title">📉 Drawdown (Underwater Plot)</div>
                    <div style={{ fontSize: 11, color: T.text.tertiary, marginBottom: 12 }}>
                        Shows when your portfolio was below its peak. Deeper = larger loss from peak.
                    </div>
                    <DrawdownChart data={currentDrawdownData} />
                </div>
                <div className="glass-card" style={{ padding: '22px 24px' }}>
                    <div className="card-title">⚡ Risk vs Return</div>
                    <div style={{ fontSize: 11, color: T.text.tertiary, marginBottom: 12 }}>
                        Each stock plotted by risk (volatility) and return. Top-left = ideal (high return, low risk).
                    </div>
                    <RiskReturnScatter data={riskReturnData} />
                </div>
            </div>}

            {/* ═══ HOLDINGS TABLE ═══ */}
            {(activeTab === 'holdings') && <div className="glass-card holdings-table">
                {/* Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${T.border.subtle}`, flexWrap: 'wrap', gap: 8 }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>Holdings ({displayHoldings.length})</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select className="sector-filter" value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)}>
                            {sectors.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Sectors' : s}</option>)}
                        </select>
                        <button className="export-btn" onClick={handleExportCSV} title="Export CSV" style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border.medium}`,
              color: T.text.secondary, cursor: 'pointer', fontWeight: 600
            }}>
                            📥 CSV
                        </button>
                    </div>
                </div>

                {/* Desktop Header */}
                <div className="holdings-header" style={{ gridTemplateColumns: GRID_COLS }}>
                    <span onClick={() => handleSort('symbol')}>Stock <SortArrow k="symbol" sortKey={sortKey} sortDir={sortDir} /></span>
                    <span style={{ textAlign: 'right' }}>Qty</span>
                    <span style={{ textAlign: 'right' }}>Avg Cost</span>
                    <span style={{ textAlign: 'right' }} onClick={() => handleSort('currentPrice')}>CMP <SortArrow k="currentPrice" sortKey={sortKey} sortDir={sortDir} /></span>
                    <span style={{ textAlign: 'right' }} onClick={() => handleSort('currentValue')}>Value <SortArrow k="currentValue" sortKey={sortKey} sortDir={sortDir} /></span>
                    <span style={{ textAlign: 'right' }} onClick={() => handleSort('dayChangePct')}>Day Δ <SortArrow k="dayChangePct" sortKey={sortKey} sortDir={sortDir} /></span>
                    <span style={{ textAlign: 'right' }} onClick={() => handleSort('gainPct')}>P&L <SortArrow k="gainPct" sortKey={sortKey} sortDir={sortDir} /></span>
                    <span style={{ textAlign: 'right' }} onClick={() => handleSort('allocationPct')}>Alloc% <SortArrow k="allocationPct" sortKey={sortKey} sortDir={sortDir} /></span>
                    <span style={{ textAlign: 'center' }}>Trend</span>
                    <span style={{ textAlign: 'center' }}>Actions</span>
                </div>

                {/* Rows — desktop + mobile */}
                {loading && enrichedHoldings.length === 0 ?
        <ShimmerRows count={4} cols={GRID_COLS} /> :
        isEmpty ?
        <div className="empty-state-small" style={{ padding: 40 }}>
                        <div style={{ fontSize: 42, marginBottom: 12, opacity: 0.2 }}>📂</div>
                        <div style={{ fontSize: 14, color: T.text.tertiary, fontWeight: 600 }}>No holdings yet</div>
                        <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 4 }}>Add your first stock to get started</div>
                    </div> :

        <>
                        {/* Desktop rows */}
                        {displayHoldings.map((h) =>
          editingId === h.id ?
          <HoldingEditRow
            key={h.id}
            symbol={h.symbol}
            sector={h.sector}
            editQty={editForm.qty}
            editBuyPrice={editForm.buyPrice}
            onChangeQty={(v) => setEditForm((f) => ({ ...f, qty: v }))}
            onChangeBuyPrice={(v) => setEditForm((f) => ({ ...f, buyPrice: v }))}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit} /> :


          <HoldingRow
            key={h.id}
            {...h}
            currency={currency}
            onEdit={handleStartEdit}
            onDelete={handleDeleteHolding} />


          )}
                        {/* Mobile cards */}
                        {displayHoldings.map((h) =>
          <HoldingCardMobile
            key={`m-${h.id}`}
            {...h}
            currency={currency}
            onEdit={handleStartEdit}
            onDelete={handleDeleteHolding} />

          )}

                        {/* Holdings total row — desktop only */}
                        {displayHoldings.length > 0 && (() => {
            const tInv  = displayHoldings.reduce((s, h) => s + h.qty * h.buyPrice, 0);
            const tVal  = displayHoldings.reduce((s, h) => s + (h.currentValue ?? h.qty * h.currentPrice), 0);
            const tGain = displayHoldings.reduce((s, h) => s + h.gain, 0);
            const tGainPct = tInv > 0 ? (tGain / tInv) * 100 : 0;
            const up = tGain >= 0;
            return (
              <div className="holdings-total-row" style={{ gridTemplateColumns: GRID_COLS }}>
                <span style={{ fontWeight: 700, color: T.text.primary, fontSize: 12 }}>
                  TOTAL ({displayHoldings.length})
                </span>
                <span />
                <span className="mono" style={{ textAlign: 'right', fontSize: 12, color: T.text.secondary }}>{fmt(tInv, currency)}</span>
                <span />
                <span className="mono" style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: T.text.primary }}>{fmt(tVal, currency)}</span>
                <span />
                <span style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ color: up ? T.accent.teal : T.accent.danger, fontWeight: 700, fontSize: 13 }}>
                    {up ? '+' : ''}{fmt(tGain, currency)}
                  </div>
                  <div className="mono" style={{ color: up ? T.accent.teal : T.accent.danger, fontSize: 10.5 }}>
                    {up ? '+' : ''}{tGainPct.toFixed(2)}%
                  </div>
                </span>
                <span /><span /><span />
              </div>
            );
          })()}
                    </>
        }
            </div>}

            {/* ═══ ALLOCATION — TREEMAP + HEATMAP ═══ */}
            {activeTab === 'holdings' && <div className="portfolio-two-col">
                <div className="glass-card" style={{ padding: '22px 24px' }}>
                    <div className="card-title">Sector Allocation</div>
                    <AllocationPie data={allocationData} />
                </div>
                <div className="glass-card" style={{ padding: '22px 24px' }}>
                    <div className="card-title">Allocation Heatmap</div>
                    <HeatmapChart data={allocationData} />
                </div>
            </div>}

            {/* ═══ TAX + PREDICTIVE ═══ */}
            {activeTab === 'tax' && <><div className="analytics-section">
                {/* Tax Intelligence */}
                <div className="analytics-card">
                    <div className="card-title">🧾 Tax Intelligence</div>
                    <div className="analytics-metric-row">
                        <span style={{ fontSize: 12, color: T.text.secondary }}>Total Unrealized Gain</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: stats.totalGain >= 0 ? T.accent.teal : T.accent.danger }}>
                            {fmt(stats.totalGain, currency)}
                        </span>
                    </div>
                    <div className="analytics-metric-row">
                        <span style={{ fontSize: 12, color: T.text.secondary }}>Short-Term Gain</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: T.accent.orange }}>
                            {fmt(taxIntelligence.shortTermGain, currency)}
                        </span>
                    </div>
                    <div className="analytics-metric-row">
                        <span style={{ fontSize: 12, color: T.text.secondary }}>Long-Term Gain</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: T.accent.teal }}>
                            {fmt(taxIntelligence.longTermGain, currency)}
                        </span>
                    </div>
                    <div className="analytics-metric-row">
                        <span style={{ fontSize: 12, color: T.text.secondary }}>Est. STCG Tax (15%)</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: T.accent.danger }}>
                            {fmt(taxIntelligence.shortTermTax, currency)}
                        </span>
                    </div>
                    <div className="analytics-metric-row">
                        <span style={{ fontSize: 12, color: T.text.secondary }}>Est. LTCG Tax (10%)</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: T.accent.danger }}>
                            {fmt(taxIntelligence.longTermTax, currency)}
                        </span>
                    </div>

                    {/* HARVESTING OPPORTUNITIES */}
                    {taxIntelligence.harvestingOpportunities.length > 0 &&
          <>
                            <div className="section-divider" style={{ margin: '8px 0' }} />
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.accent.gold, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                                💡 Harvesting Opportunities
                            </div>
                            {taxIntelligence.harvestingOpportunities.map((o, i) =>
            <div key={i} className="analytics-metric-row">
                                    <span style={{ fontSize: 12, color: T.text.secondary }}>{o.symbol} loss</span>
                                    <span className="mono" style={{ fontSize: 12, color: T.accent.gold }}>
                                        Save {fmt(o.taxSaving, currency)}
                                    </span>
                                </div>
            )}
                        </>
          }

                    {/* TAX TIMELINE */}
                    {taxTimeline.length > 0 &&
          <>
                            <div className="section-divider" style={{ margin: '10px 0' }} />
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.accent.blue, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                                📅 Holdings Timeline (LTCG Eligibility)
                            </div>
                            <div className="tax-timeline-table">
                                <div className="tax-timeline-header">
                                    <span>Stock</span>
                                    <span>Hold</span>
                                    <span>Days to LTCG</span>
                                    <span>Tax Now</span>
                                    <span>Tax if Long</span>
                                </div>
                                {taxTimeline.map((t, i) =>
              <div key={i} className="tax-timeline-row">
                                        <span style={{ fontWeight: 600, color: T.text.primary }}>{t.symbol}</span>
                                        <span className="mono" style={{ fontSize: 11, color: T.text.secondary }}>
                                            {t.holdDays}d
                                        </span>
                                        <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: t.isLongTerm ? T.accent.teal : t.daysToLTCG < 30 ? T.accent.gold : T.accent.orange
                }}>
                                            {t.isLongTerm ? '✓ LTCG' : `${t.daysToLTCG}d left`}
                                        </span>
                                        <span className="mono" style={{ fontSize: 11, color: T.accent.danger }}>
                                            {fmt(t.taxIfSoldNow, currency)}
                                        </span>
                                        <span className="mono" style={{ fontSize: 11, color: T.accent.teal }}>
                                            {fmt(t.taxIfHeldLong, currency)}
                                        </span>
                                    </div>
              )}
                            </div>
                            {taxTimeline.some((t) => !t.isLongTerm && t.daysToLTCG < 30 && t.gain > 0) &&
            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.15)' }}>
                                    <div style={{ fontSize: 11, color: T.accent.gold, fontWeight: 600 }}>
                                        💡 Tip: {taxTimeline.filter((t) => !t.isLongTerm && t.daysToLTCG < 30 && t.gain > 0).map((t) => t.symbol).join(', ')} {taxTimeline.filter((t) => !t.isLongTerm && t.daysToLTCG < 30).length === 1 ? 'is' : 'are'} close to LTCG eligibility. Hold to save on tax!
                                    </div>
                                </div>
            }
                        </>
          }
                </div>

                {/* Predictive Analytics — with plain English */}
                <div className="analytics-card">
                    <div className="card-title">🔮 Predictive Analytics</div>

                    <div className="predictive-plain">
                        <div className="predictive-scenario">
                            <div className="predictive-scenario-label" style={{ color: T.accent.teal }}>📈 Expected (1Y)</div>
                            <div className="mono predictive-scenario-value" style={{ color: T.accent.teal, fontSize: 18, fontWeight: 800 }}>
                                {fmt(predictive.futureValueP50, currency)}
                            </div>
                            <div className="predictive-scenario-desc">
                                Based on historical returns & current holdings, your portfolio should be worth this in 1 year. Assumes ~12% average CAGR.
                            </div>
                        </div>

                        <div className="predictive-scenario">
                            <div className="predictive-scenario-label" style={{ color: T.accent.blue }}>🎯 Best Case (90th %ile)</div>
                            <div className="mono predictive-scenario-value" style={{ color: T.accent.blue }}>
                                {fmt(predictive.futureValueP90, currency)}
                            </div>
                            <div className="predictive-scenario-desc">
                                In a strong market (like 2021), you could reach this. This happens ~10% of the time.
                            </div>
                        </div>

                        <div className="predictive-scenario">
                            <div className="predictive-scenario-label" style={{ color: T.accent.orange }}>⬇️ Downside (10th %ile)</div>
                            <div className="mono predictive-scenario-value" style={{ color: T.accent.orange }}>
                                {fmt(predictive.futureValueP10, currency)}
                            </div>
                            <div className="predictive-scenario-desc">
                                If markets fall (like 2020), you might see this. This also happens ~10% of the time.
                            </div>
                        </div>
                    </div>

                    <div className="section-divider" style={{ margin: '12px 0' }} />

                    <div className="analytics-metric-row">
                        <span style={{ fontSize: 12, color: T.text.secondary }}>Loss Probability</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: predictive.downsideRisk > 30 ? T.accent.danger : T.accent.teal }}>
                            {predictive.downsideRisk}%
                        </span>
                    </div>
                    <div style={{ fontSize: 10, color: T.text.tertiary, marginTop: 2, marginBottom: 6 }}>
                        There{"'"}s a {predictive.downsideRisk}% chance you lose money in the next year (assumes you don{"'"}t add/remove stocks).
                    </div>

                    <div className="analytics-metric-row">
                        <span style={{ fontSize: 12, color: T.text.secondary }}>VaR (95%)</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: T.accent.danger }}>
                            {fmt(predictive.var95, currency)}
                        </span>
                    </div>
                    <div className="analytics-metric-row">
                        <span style={{ fontSize: 12, color: T.text.secondary }}>🌪️ Market Crash (−30%)</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: T.accent.danger }}>
                            {fmt(predictive.crashImpact, currency)}
                        </span>
                    </div>
                </div>
            </div></>}

            {/* ═══ HEALTH BREAKDOWN (shown in analytics tab) ═══ */}
            {activeTab === 'analytics' && <div className="glass-card" style={{ padding: '22px 24px' }}>
                <div className="card-title">🏥 Portfolio Health Breakdown</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                    {healthScore.factors.map((f, i) => {
            const ratio = f.score / f.max;
            const barColor = ratio >= 0.7 ? T.accent.teal : ratio >= 0.4 ? T.accent.gold : T.accent.danger;
            const ratingLabel = ratio >= 0.7 ? 'GOOD' : ratio >= 0.4 ? 'NEEDS WORK' : 'POOR';
            const ratingColor = ratio >= 0.7 ? T.accent.teal : ratio >= 0.4 ? T.accent.gold : T.accent.danger;

            // Generate action items
            let action = '';
            if (f.label.includes('Diversification') && ratio < 0.7) action = 'Add underweight sectors like Pharma or FMCG';else
            if (f.label.includes('Concentration') && ratio < 0.7) action = `Reduce top holding below 30%`;else
            if (f.label.includes('Volatility') && ratio < 0.7) action = 'Add low-volatility stocks or bonds';else
            if (f.label.includes('Returns') && ratio < 0.5) action = 'Review underperforming holdings';else
            if (ratio >= 0.7) action = 'Keep current approach';

            return (
              <div key={i} className="health-factor-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontSize: 11.5, color: T.text.secondary, fontWeight: 600 }}>{f.label}</span>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span className="mono" style={{ fontSize: 11, color: T.text.tertiary }}>{f.score}/{f.max}</span>
                                        <span style={{ fontSize: 9, fontWeight: 800, color: ratingColor, background: `${ratingColor}15`, padding: '2px 8px', borderRadius: 4 }}>
                                            {ratingLabel}
                                        </span>
                                    </div>
                                </div>
                                <div className="health-factor-bar">
                                    <div className="health-factor-fill" style={{ width: `${ratio * 100}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}88)` }} />
                                </div>
                                <div style={{ fontSize: 10.5, color: T.text.tertiary, marginTop: 6 }}>{f.description}</div>
                                {action &&
                <div style={{ fontSize: 10, color: barColor, marginTop: 4, fontWeight: 600 }}>
                                        → {action}
                                    </div>
                }
                            </div>);

          })}
                </div>
            </div>}

            {/* ═══ ADD STOCK FAB ═══ */}
            <button className="add-stock-fab" onClick={() => setShowAddModal(true)} title="Add Stock">
                <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>Add Stock</span>
            </button>

            {/* ═══ ADD STOCK MODAL ═══ */}
            {showAddModal &&
      <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, margin: 0 }}>Add Stock Holding</h3>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: T.text.tertiary, fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
                        </div>

                        <div className="modal-form-grid">
                            <div className="modal-field" style={{ position: 'relative' }}>
                                <label className="modal-label">Symbol *</label>
                                <div className="stock-search-wrap">
                                    <input
                                        className={`modal-input${addErrors.symbol ? ' modal-input-error' : ''}`}
                                        placeholder="Search e.g. RELIANCE or Reliance"
                                        value={searchQuery}
                                        onChange={(e) => handleSymbolSearch(e.target.value)}
                                        onBlur={() => setTimeout(() => setShowSearchDrop(false), 150)}
                                        autoComplete="off"
                                    />
                                    {showSearchDrop && (
                                        <div className="stock-search-dropdown">
                                            {searchResults.map((s) => (
                                                <div key={s.symbol} className="stock-search-item"
                                                    onMouseDown={() => handleSelectStock(s)}>
                                                    <span className="stock-search-sym">{s.symbol}</span>
                                                    <span className="stock-search-name">{s.name}</span>
                                                    <span className="stock-search-sector">{s.sector}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {addErrors.symbol && <div className="modal-field-error">{addErrors.symbol}</div>}
                                {isDuplicateSymbol && !addErrors.symbol && (
                                    <div className="modal-duplicate-warning">⚠️ This stock is already in your portfolio</div>
                                )}
                            </div>
                            <div className="modal-field">
                                <label className="modal-label">Company Name *</label>
                                <input
                                    className={`modal-input${addErrors.name ? ' modal-input-error' : ''}`}
                                    placeholder="e.g. Reliance Industries"
                                    value={addForm.name}
                                    onChange={(e) => { setAddForm((f) => ({ ...f, name: e.target.value })); setAddErrors((err) => ({ ...err, name: '' })); }}
                                />
                                {addErrors.name && <div className="modal-field-error">{addErrors.name}</div>}
                            </div>
                            <div className="modal-field">
                                <label className="modal-label">Sector</label>
                                <select className="modal-input" value={addForm.sector}
              onChange={(e) => setAddForm((f) => ({ ...f, sector: e.target.value }))}>
                                    {['IT', 'Banking', 'FMCG', 'Pharma', 'Auto', 'Energy', 'Metal', 'Infra', 'Finance', 'Telecom', 'Other'].map((s) =>
                <option key={s} value={s}>{s}</option>
                )}
                                </select>
                            </div>
                            <div className="modal-field">
                                <label className="modal-label">Quantity *</label>
                                <input
                                    className={`modal-input${addErrors.qty ? ' modal-input-error' : ''}`}
                                    type="number" min="1" placeholder="e.g. 10"
                                    value={addForm.qty}
                                    onChange={(e) => { setAddForm((f) => ({ ...f, qty: e.target.value })); setAddErrors((err) => ({ ...err, qty: '' })); }}
                                />
                                {addErrors.qty && <div className="modal-field-error">{addErrors.qty}</div>}
                            </div>
                            <div className="modal-field">
                                <label className="modal-label">Buy Price (₹) *</label>
                                <input
                                    className={`modal-input${addErrors.buyPrice ? ' modal-input-error' : ''}`}
                                    type="number" min="0.01" step="0.01" placeholder="e.g. 2450.00"
                                    value={addForm.buyPrice}
                                    onChange={(e) => { setAddForm((f) => ({ ...f, buyPrice: e.target.value })); setAddErrors((err) => ({ ...err, buyPrice: '' })); }}
                                />
                                {addErrors.buyPrice && <div className="modal-field-error">{addErrors.buyPrice}</div>}
                            </div>
                            <div className="modal-field">
                                <label className="modal-label">Buy Date</label>
                                <input className="modal-input" type="date"
              value={addForm.buyDate}
              onChange={(e) => setAddForm((f) => ({ ...f, buyDate: e.target.value }))} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button className="modal-btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="modal-btn-primary" onClick={handleAddSubmit}>
                                + Add to Portfolio
                            </button>
                        </div>
                    </div>
                </div>
      }

            {/* Edit validation error toast */}
            {editError && <div className="error-state" style={{ position: 'fixed', bottom: 80, right: 24, zIndex: 100, maxWidth: 320 }}>{editError}</div>}

            {/* Delete confirmation */}
            {deleteHoldingId !== null && (
              <ConfirmModal
                title="Remove Holding?"
                desc="This holding will be permanently removed from your portfolio."
                confirmLabel="Remove"
                onConfirm={confirmDeleteHolding}
                onCancel={() => setDeleteHoldingId(null)}
              />
            )}
        </div>);

}