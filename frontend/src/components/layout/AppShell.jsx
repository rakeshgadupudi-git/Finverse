'use client';
import { useState, useEffect } from 'react';
import { T } from '@/lib/tokens';
import { useTheme } from '@/components/providers/ThemeProvider';
import { isMarketOpen } from '@/lib/utils';
import { MOCK_TICKERS } from '@/lib/data/mockData';
import { transactionApi, normalizeTx } from '@/services/api';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import DashboardPage from '@/components/pages/DashboardPage';
import TransactionsPage from '@/components/pages/TransactionsPage';
import PortfolioPage from '@/components/pages/PortfolioPage';
import InsightsPage from '@/components/pages/InsightsPage';
import MarketNewsPage from '@/components/pages/MarketNewsPage';
import StockDiscoveryPage from '@/components/pages/StockDiscoveryPage';
import SettingsPage from '@/components/pages/SettingsPage';


const NAV_ITEMS = [
{ id: 'dashboard', icon: '◈', label: 'Dashboard' },
{ id: 'transactions', icon: '↔', label: 'Transactions' },
{ id: 'portfolio', icon: '◎', label: 'Portfolio' },
{ id: 'stocks', icon: '◇', label: 'Stock Intelligence' },
{ id: 'insights', icon: '◉', label: 'Insights' },
{ id: 'news', icon: '◆', label: 'Market News' },
{ id: 'settings', icon: '◐', label: 'Settings' }];


function TickerBar() {
  const [tickers, setTickers] = useState(MOCK_TICKERS);

  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const res = await fetch('/api/live-price/market-indices');
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) setTickers(json.data);
        }
      } catch {}
    };
    fetchIndices();
    const id = setInterval(fetchIndices, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const items = [...tickers, ...tickers];
  return (
    <div className="ticker-bar">
            <div className="ticker-live-badge">
                <div className="market-dot open" />
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', color: T.accent.teal, textTransform: 'uppercase' }}>Live</span>
            </div>
            <div className="ticker-wrap">
                <div className="ticker-inner">
                    {items.map((t, i) =>
          <div key={i} className="market-chip">
                            <span style={{ color: T.text.secondary, fontSize: 11, fontWeight: 700, letterSpacing: '0.3px' }}>{t.symbol}</span>
                            <span className="mono" style={{ color: T.text.primary, fontSize: 12.5, fontWeight: 600 }}>{t.price}</span>
                            <span className="mono" style={{ color: t.up ? T.accent.teal : T.accent.danger, fontWeight: 700, fontSize: 11 }}>
                                {t.up ? '▲' : '▼'} {t.change}
                            </span>
                        </div>
          )}
                </div>
            </div>
        </div>);

}

function ToastContainer() {
  const { toasts, dismissToast } = useSettings();
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
            {toasts.map((t) =>
      <div key={t.id} className={`toast ${t.type}`} onClick={() => dismissToast(t.id)} style={{ cursor: 'pointer' }}>
                    <span>{t.type === 'success' ? '✓' : t.type === 'warning' ? '⚠' : t.type === 'error' ? '✕' : 'ℹ'}</span>
                    <span>{t.message}</span>
                </div>
      )}
        </div>);

}

function AppShellInner({ currency, setCurrency, userName = 'User', setUserName, onLogout }) {
  const [page, setPage] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [open, setOpen] = useState(isMarketOpen());
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const id = setInterval(() => setOpen(isMarketOpen()), 60000);
    return () => clearInterval(id);
  }, []);

  // Load transactions from backend on mount
  useEffect(() => {
    transactionApi.getAll()
      .then(({ data }) => {
        setTransactions((data.transactions || []).map(normalizeTx));
      })
      .catch(() => {
        // No token yet or server down — start with empty list
        setTransactions([]);
      })
      .finally(() => setTxLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = {
    dashboard: <DashboardPage transactions={transactions} currency={currency} navigate={setPage} userName={userName} />,
    transactions: <TransactionsPage transactions={transactions} setTransactions={setTransactions} currency={currency} loading={txLoading} />,
    portfolio: <PortfolioPage currency={currency} />,
    stocks: <StockDiscoveryPage currency={currency} />,
    insights: <InsightsPage transactions={transactions} currency={currency} />,
    news: <MarketNewsPage />,
    settings: <SettingsPage currency={currency} setCurrency={setCurrency} transactions={transactions} userName={userName} setUserName={setUserName} onLogout={onLogout} />
  };

  return (
    <div style={{ background: T.bg.base, minHeight: '100vh', color: T.text.primary, fontFamily: "'Manrope',sans-serif" }}>
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-text">Fin<span className="logo-accent">Tracker</span> <span style={{ fontSize: 14, color: T.accent.purple }}>AI</span></div>
                    <div style={{ marginTop: 8 }}>
                        <div className={`market-status ${open ? 'open' : 'closed'}`}>
                            <div className={`market-dot ${open ? 'open' : 'closed'}`} />
                            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.8px', color: open ? T.accent.teal : T.text.tertiary, textTransform: 'uppercase' }}>
                                {open ? 'Market Open' : 'Market Closed'}
                            </span>
                        </div>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="section-label" style={{ paddingLeft: 6, marginBottom: 10 }}>Navigation</div>
                    {NAV_ITEMS.map((item) =>
          <button key={item.id} onClick={() => setPage(item.id)} className={`nav-btn${page === item.id ? ' active' : ''}`}>
                            <span className="nav-icon" style={{ opacity: page === item.id ? 1 : .55 }}>{item.icon}</span>
                            {item.label}
                        </button>
          )}
                </nav>
                <div className="sidebar-footer">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 9, background: 'linear-gradient(135deg,rgba(0,212,170,.2),rgba(157,119,247,.2))', border: '1px solid rgba(0,212,170,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: T.accent.teal, fontFamily: "'Fraunces',serif" }}>{userName.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, color: T.text.primary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                            <div style={{ fontSize: 10.5, color: T.text.tertiary, marginTop: 1 }}>Pro · NSE/BSE</div>
                        </div>
                        <button
                            onClick={toggleTheme}
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 15, padding: '4px', flexShrink: 0, lineHeight: 1 }}>
                            {theme === 'dark' ? '☀' : '🌙'}
                        </button>
                        {onLogout && <button onClick={onLogout} title="Logout" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 16, padding: '4px', flexShrink: 0, lineHeight: 1 }}>⏻</button>}
                    </div>
                </div>
            </aside>

            <div className="app-shell">
                <TickerBar />
                <main className="main-content">
                    {pages[page]}
                </main>
            </div>

            <ToastContainer />
        </div>);

}

import { PortfolioProvider } from '@/context/PortfolioContext';
import ChatWindow from '@/finchat/components/ChatWindow';

export default function AppShell({ currency, setCurrency, userName, setUserName, onLogout }) {
  return (
    <SettingsProvider>
            <PortfolioProvider>
                <AppShellInner currency={currency} setCurrency={setCurrency} userName={userName} setUserName={setUserName} onLogout={onLogout} />
                <ChatWindow />
            </PortfolioProvider>
        </SettingsProvider>);

}
