'use client';
import { useState, useEffect } from 'react';
import { T } from '@/lib/tokens';
import { useTheme } from '@/components/providers/ThemeProvider';
import { isMarketOpen } from '@/lib/utils';
import { MOCK_TICKERS } from '@/lib/data/mockData';
import { transactionApi, normalizeTx, accountApi } from '@/services/api';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import DashboardPage from '@/components/pages/DashboardPage';
import TransactionsPage from '@/components/pages/TransactionsPage';
import PortfolioPage from '@/components/pages/PortfolioPage';
import InsightsPage from '@/components/pages/InsightsPage';
import MarketNewsPage from '@/components/pages/MarketNewsPage';
import StockDiscoveryPage from '@/components/pages/StockDiscoveryPage';
import SettingsPage from '@/components/pages/SettingsPage';
import TaxCalculatorPage from '@/components/pages/TaxCalculatorPage';
import GoalsPage from '@/components/pages/GoalsPage';
import BillsPage from '@/components/pages/BillsPage';
import CalculatorsPage from '@/components/pages/CalculatorsPage';
import CalendarPage from '@/components/pages/CalendarPage';
import PlannedPaymentsPage from '@/components/pages/PlannedPaymentsPage';
import ShoppingListPage from '@/components/pages/ShoppingListPage';
import WarrantyVaultPage from '@/components/pages/WarrantyVaultPage';
import LoyaltyCardsPage from '@/components/pages/LoyaltyCardsPage';
import DebtTrackerPage from '@/components/pages/DebtTrackerPage';
import AccountsPage from '@/components/pages/AccountsPage';


const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard',    icon: '◈', label: 'Dashboard' },
      { id: 'transactions', icon: '↔', label: 'Transactions' },
      { id: 'portfolio',    icon: '◎', label: 'Portfolio' },
      { id: 'goals',        icon: '◉', label: 'Goals' },
    ],
  },
  {
    label: 'Finance',
    collapsible: true,
    defaultOpen: true,
    items: [
      { id: 'bills',    icon: '◆',  label: 'Bills' },
      { id: 'planned',  icon: '⏰', label: 'Planned Payments', sub: true },
      { id: 'debt',     icon: '↕',  label: 'Debt Tracker',    sub: true },
      { id: 'accounts', icon: '🏦', label: 'Accounts',        sub: true },
    ],
  },
  {
    label: 'Lifestyle',
    collapsible: true,
    defaultOpen: true,
    items: [
      { id: 'calendar', icon: '◷',  label: 'Calendar' },
      { id: 'shopping', icon: '🛒', label: 'Shopping List',  sub: true },
      { id: 'warranty', icon: '🛡', label: 'Warranty Vault', sub: true },
      { id: 'loyalty',  icon: '💳', label: 'Loyalty Cards',  sub: true },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'stocks',   icon: '◇', label: 'Stock Intelligence' },
      { id: 'insights', icon: '◉', label: 'Insights' },
      { id: 'news',     icon: '◆', label: 'Market News' },
    ],
  },
  {
    label: 'Tools',
    collapsible: true,
    defaultOpen: false,
    items: [
      { id: 'tax',         icon: '₹', label: 'Tax Calculator', sub: true },
      { id: 'calculators', icon: '∑', label: 'Calculators',    sub: true },
      { id: 'settings',    icon: '⚙', label: 'Settings',       sub: true },
    ],
  },
];

// Bottom nav items — 4 main destinations always visible on mobile
const BOTTOM_NAV_ITEMS = [
  { id: 'dashboard',    icon: '◈', label: 'Home' },
  { id: 'transactions', icon: '↔', label: 'Txns' },
  { id: 'portfolio',    icon: '◎', label: 'Portfolio' },
  { id: 'goals',        icon: '◉', label: 'Goals' },
];


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
      } catch { /* network unavailable — keep mock tickers */ }
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

function GroupedNav({ page, setPage, onNavClick }) {
  const [openGroups, setOpenGroups] = useState(() => {
    const result = {};
    NAV_GROUPS.forEach((g) => { result[g.label] = g.defaultOpen !== false; });
    return result;
  });

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleNavClick = (id) => {
    setPage(id);
    if (onNavClick) onNavClick();
  };

  return (
    <div>
      {NAV_GROUPS.map((group) => {
        const isOpen = openGroups[group.label] !== false;
        return (
          <div key={group.label} className="nav-group">
            <div
              className={`nav-group-label${group.collapsible ? ' collapsible' : ''}`}
              onClick={group.collapsible ? () => toggleGroup(group.label) : undefined}
            >
              <span>{group.label}</span>
              {group.collapsible && (
                <span className={`nav-group-chevron${isOpen ? ' open' : ''}`}>▶</span>
              )}
            </div>
            {(!group.collapsible || isOpen) && group.items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`nav-btn${item.sub ? ' nav-sub-btn' : ''}${page === item.id ? ' active' : ''}`}
              >
                <span className="nav-icon" style={{ opacity: page === item.id ? 1 : 0.55 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AppShellInner({ currency, setCurrency, userName = 'User', setUserName, onLogout }) {
  const [page, setPage] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(isMarketOpen());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const id = setInterval(() => setOpen(isMarketOpen()), 60000);
    return () => clearInterval(id);
  }, []);

  // Close sidebar on route change (mobile)
  const handleSetPage = (id) => {
    setPage(id);
    setSidebarOpen(false);
  };

  // Close sidebar on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

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
  }, []);

  // Load accounts from backend on mount
  useEffect(() => {
    accountApi.getAll()
      .then(({ data }) => setAccounts(data.accounts || []))
      .catch(() => setAccounts([]));
  }, []);

  // Sync transactions to localStorage so FinChat can access them
  useEffect(() => {
    if (!txLoading) {
      localStorage.setItem('fin_transactions', JSON.stringify(transactions));
    }
  }, [transactions, txLoading]);

  const pages = {
    dashboard:   <DashboardPage transactions={transactions} currency={currency} navigate={handleSetPage} userName={userName} accounts={accounts} />,
    transactions: <TransactionsPage transactions={transactions} setTransactions={setTransactions} currency={currency} loading={txLoading} />,
    portfolio:   <PortfolioPage currency={currency} />,
    goals:       <GoalsPage currency={currency} />,
    bills:       <BillsPage currency={currency} />,
    planned:     <PlannedPaymentsPage currency={currency} onTransactionAdded={(tx) => setTransactions((p) => [normalizeTx(tx), ...p])} />,
    debt:        <DebtTrackerPage currency={currency} onTransactionAdded={(tx) => setTransactions((p) => [normalizeTx(tx), ...p])} />,
    accounts:    <AccountsPage currency={currency} accounts={accounts} setAccounts={setAccounts} />,
    calendar:    <CalendarPage transactions={transactions} currency={currency} />,
    shopping:    <ShoppingListPage currency={currency} onTransactionAdded={(txs) => setTransactions((p) => [...(Array.isArray(txs) ? txs : [txs]).map(normalizeTx), ...p])} />,
    warranty:    <WarrantyVaultPage transactions={transactions} />,
    loyalty:     <LoyaltyCardsPage />,
    stocks:      <StockDiscoveryPage currency={currency} />,
    insights:    <InsightsPage transactions={transactions} currency={currency} />,
    news:        <MarketNewsPage />,
    tax:         <TaxCalculatorPage />,
    calculators: <CalculatorsPage />,
    settings:    <SettingsPage currency={currency} setCurrency={setCurrency} transactions={transactions} userName={userName} setUserName={setUserName} onLogout={onLogout} />
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: "'Manrope',sans-serif" }}>

      {/* ── Sidebar overlay (mobile only) ── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
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
              <GroupedNav page={page} setPage={setPage} onNavClick={() => setSidebarOpen(false)} />
          </nav>
          <div className="sidebar-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 9, background: 'linear-gradient(135deg,var(--surface-teal),var(--surface-purple))', border: '1px solid var(--surface-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--teal)', fontFamily: "'Fraunces',serif" }}>{userName.charAt(0).toUpperCase()}</div>
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

      {/* ── Mobile top header ── */}
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <span className="mobile-menu-icon">
            <span />
            <span />
            <span />
          </span>
        </button>
        <div className="mobile-header-logo">
          Fin<span style={{ color: 'var(--teal)', fontStyle: 'italic' }}>Tracker</span>
          <span style={{ fontSize: 11, color: T.accent.purple, marginLeft: 4 }}>AI</span>
        </div>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 18, padding: '4px', lineHeight: 1 }}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
      </header>

      <div className="app-shell">
          <TickerBar />
          <main className="main-content">
              {pages[page]}
          </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`mobile-bottom-nav-item${page === item.id ? ' active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span className="mobile-bottom-nav-icon">{item.icon}</span>
            <span className="mobile-bottom-nav-label">{item.label}</span>
          </button>
        ))}
        {/* Settings shortcut */}
        <button
          className={`mobile-bottom-nav-item${page === 'settings' ? ' active' : ''}`}
          onClick={() => setPage('settings')}
        >
          <span className="mobile-bottom-nav-icon">⚙</span>
          <span className="mobile-bottom-nav-label">Settings</span>
        </button>
      </nav>

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
