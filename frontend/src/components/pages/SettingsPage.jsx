'use client';
import { useState, useMemo, useEffect } from 'react';
import { T } from '@/lib/tokens';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/components/providers/ThemeProvider';
import { exportTransactionsForRange } from '@/lib/exportCSV';
import { userApi } from '@/services/api';


/* ─── Reusable sub-components ─── */
function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <span className="toggle-track" />
            <span className="toggle-thumb" />
        </label>);

}

function Section({ icon, title, desc, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="settings-section">
            <div className="settings-header" onClick={() => setOpen(!open)}>
                <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{icon}</span>
                <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text.primary }}>{title}</div>
                    {desc && <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 1 }}>{desc}</div>}
                </div>
                <span className={`settings-chevron${open ? ' open' : ''}`}>▼</span>
            </div>
            <div className={`settings-body${open ? ' open' : ''}`}>{children}</div>
        </div>);

}

function Row({ label, desc, children }) {
  return (
    <div className="settings-row">
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="settings-row-label">{label}</div>
                {desc && <div className="settings-row-desc">{desc}</div>}
            </div>
            {children}
        </div>);

}

function RadioChips({ value, options, onChange }) {
  return (
    <div className="radio-chips">
            {options.map((o) =>
      <button key={o.value} className={`radio-chip${value === o.value ? ' active' : ''}`} onClick={() => onChange(o.value)}>{o.label}</button>
      )}
        </div>);

}

function ConfirmModal({ title, desc, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
            <div className="confirm-card fade-in" onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Fraunces',serif", marginBottom: 8, color: T.text.primary }}>{title}</div>
                <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.7, marginBottom: 22 }}>{desc}</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="secondary-btn" onClick={onCancel}>Cancel</button>
                    <button className="danger-btn" onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </div>
        </div>);

}

/* ─── MAIN SETTINGS PAGE ─── */
export default function SettingsPage({ currency, setCurrency, transactions, userName: initialUserName = 'User', setUserName, onLogout }) {
  const { settings, update, updateNested, updateFinancial, resetAll, toast } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [profileName, setProfileName] = useState(initialUserName);
  const [showReset, setShowReset] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [exportRange, setExportRange] = useState('all');

  // Profile & auth state
  const [userEmail, setUserEmail] = useState('');
  const [cpCurrent, setCpCurrent] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Fetch user from backend on mount
  useEffect(() => {
    userApi.getMe()
      .then(({ data }) => {
        const { name, email } = data.user;
        setUserEmail(email || '');
        setProfileName(name || initialUserName);
        if (setUserName) setUserName(name || initialUserName);
        localStorage.setItem('fintracker_username', name || initialUserName);
      })
      .catch(() => {
        const stored = localStorage.getItem('fintracker_useremail');
        if (stored) setUserEmail(stored);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCurrency = (c) => { setCurrency(c); update('currency', c); toast(`Currency set to ${c}`); };
  const handleExport = () => {
    try {
      const count = exportTransactionsForRange(transactions, exportRange, currency);
      toast(`Exported ${count} transactions as CSV`);
    } catch { toast('No transactions to export', 'warning'); }
  };
  const handleReset = () => { resetAll(); setCurrency('INR'); setShowReset(false); toast('All settings reset to defaults', 'info'); };

  const handleProfileSave = async () => {
    try {
      await userApi.updateMe(profileName);
      localStorage.setItem('fintracker_username', profileName);
      if (setUserName) setUserName(profileName);
      toast('Profile updated');
    } catch { toast('Failed to save profile', 'error'); }
  };

  const handleChangePassword = async () => {
    if (!cpCurrent || !cpNew || !cpConfirm) { toast('Please fill all password fields', 'warning'); return; }
    if (cpNew.length < 6) { toast('New password must be at least 6 characters', 'warning'); return; }
    if (cpNew !== cpConfirm) { toast('New passwords do not match', 'warning'); return; }
    setCpLoading(true);
    try {
      await userApi.changePassword(cpCurrent, cpNew);
      setCpCurrent(''); setCpNew(''); setCpConfirm('');
      toast('Password updated successfully');
    } catch (err) {
      toast(err.message || 'Failed to change password', 'error');
    } finally { setCpLoading(false); }
  };

  const handleDeleteAccount = async () => {
    try {
      await userApi.deleteMe();
      toast('Account deleted', 'info');
      setTimeout(() => { localStorage.clear(); if (onLogout) onLogout(); }, 800);
    } catch (err) { toast(err.message || 'Failed to delete account', 'error'); }
    setShowDeleteAccount(false);
  };

  const sections = useMemo(() => [
  { id: 'profile', icon: '◉', title: 'Profile', desc: 'Account information' },
  { id: 'appearance', icon: '◐', title: 'Appearance', desc: 'Theme & display' },
  { id: 'notifications', icon: '◈', title: 'Notifications', desc: 'Alerts & reminders' },
  { id: 'financial', icon: '◎', title: 'Financial Preferences', desc: 'Risk, AI & investment' },
  { id: 'data', icon: '↔', title: 'Data & Export', desc: 'Backup & export' },
  { id: 'about', icon: '◇', title: 'About & Support', desc: 'Info & help' },
  { id: 'danger', icon: '⚠', title: 'Danger Zone', desc: 'Reset & delete' }],
  []);

  const filtered = search ?
  sections.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase())) :
  sections;

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 680 }}>
            <div>
                <h1 className="page-title">Settings</h1>
                <p style={{ fontSize: 13, color: T.text.tertiary, marginTop: 4 }}>Configure your FinTracker experience</p>
            </div>

            {/* Search */}
            <input className="input-field" placeholder="Search settings..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />

            {/* ── PROFILE ── */}
            {filtered.some((s) => s.id === 'profile') &&
      <Section icon="◉" title="Profile" desc="Account information" defaultOpen>
                    {userEmail && (
                      <Row label="Email" desc="Your account email address">
                        <span style={{ fontSize: 13, color: T.text.secondary }}>{userEmail}</span>
                      </Row>
                    )}
                    <Row label="Display Name" desc="Shown in the sidebar and across the app">
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input className="input-field" value={profileName} onChange={(e) => setProfileName(e.target.value)} style={{ maxWidth: 180 }} />
                            <button className="primary-btn" style={{ fontSize: 12, padding: '6px 14px' }} onClick={handleProfileSave}>Save</button>
                        </div>
                    </Row>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8, paddingTop: 14 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text.secondary, marginBottom: 10 }}>Change Password</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 280 }}>
                        <input className="input-field" type="password" placeholder="Current password" value={cpCurrent} onChange={(e) => setCpCurrent(e.target.value)} />
                        <input className="input-field" type="password" placeholder="New password (min 6 chars)" value={cpNew} onChange={(e) => setCpNew(e.target.value)} />
                        <input className="input-field" type="password" placeholder="Confirm new password" value={cpConfirm} onChange={(e) => setCpConfirm(e.target.value)} />
                        <button className="primary-btn" style={{ fontSize: 12, padding: '6px 14px', alignSelf: 'flex-start' }} disabled={cpLoading} onClick={handleChangePassword}>
                          {cpLoading ? 'Saving…' : 'Update Password'}
                        </button>
                      </div>
                    </div>
                </Section>
      }

            {/* ── APPEARANCE ── */}
            {filtered.some((s) => s.id === 'appearance') &&
      <Section icon="◐" title="Appearance" desc="Theme & display preferences" defaultOpen>
                    <Row label="Theme" desc="Switch between dark and light mode">
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className={`radio-chip${theme === 'dark' ? ' active' : ''}`}
                                onClick={() => { if (theme !== 'dark') { toggleTheme(); toast('Switched to dark mode'); } }}>
                                🌙 Dark
                            </button>
                            <button
                                className={`radio-chip${theme === 'light' ? ' active' : ''}`}
                                onClick={() => { if (theme !== 'light') { toggleTheme(); toast('Switched to light mode'); } }}>
                                ☀ Light
                            </button>
                        </div>
                    </Row>
                    <Row label="Currency" desc="Used across all pages for formatting">
                        <RadioChips value={settings.currency} options={[{ value: 'INR', label: '₹ INR' }, { value: 'USD', label: '$ USD' }]} onChange={handleCurrency} />
                    </Row>
                    <Row label="Language" desc="Display language for the app">
                        <RadioChips value={settings.language} options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिन्दी' }]} onChange={(v) => { if (v === 'hi') { toast('Hindi UI coming soon!', 'info'); return; } update('language', v); toast('Language set to English'); }} />
                    </Row>
                </Section>
      }

            {/* ── NOTIFICATIONS ── */}
            {filtered.some((s) => s.id === 'notifications') &&
      <Section icon="◈" title="Notifications" desc="Control your alerts & reminders">
                    <Row label="Monthly Report" desc="Receive monthly financial summary"><Toggle checked={settings.notifications.monthlyReport} onChange={(v) => {updateNested('monthlyReport', v);toast(v ? 'Monthly reports enabled' : 'Monthly reports disabled');}} /></Row>
                    <Row label="Budget Alerts" desc="Notify when spending exceeds budget"><Toggle checked={settings.notifications.budgetAlerts} onChange={(v) => {updateNested('budgetAlerts', v);toast(v ? 'Budget alerts enabled' : 'Budget alerts disabled');}} /></Row>
                    <Row label="Stock News" desc="Breaking news for your watchlist stocks"><Toggle checked={settings.notifications.stockNews} onChange={(v) => {updateNested('stockNews', v);toast(v ? 'Stock news alerts on' : 'Stock news alerts off');}} /></Row>
                    <Row label="Price Alerts" desc="Notify on significant price movements"><Toggle checked={settings.notifications.priceAlerts} onChange={(v) => {updateNested('priceAlerts', v);toast(v ? 'Price alerts enabled' : 'Price alerts disabled');}} /></Row>
                    <Row label="AI Insights" desc="Get AI-powered financial tips daily"><Toggle checked={settings.notifications.aiInsights} onChange={(v) => {updateNested('aiInsights', v);toast(v ? 'AI insights enabled' : 'AI insights disabled');}} /></Row>
                    <Row label="Watchlist Alerts" desc="Track stocks you follow"><Toggle checked={settings.notifications.watchlistAlerts} onChange={(v) => {updateNested('watchlistAlerts', v);toast(v ? 'Watchlist alerts on' : 'Watchlist alerts off');}} /></Row>
                    <Row label="Market Open/Close" desc="Daily market hour notifications"><Toggle checked={settings.notifications.marketOpenClose} onChange={(v) => {updateNested('marketOpenClose', v);toast(v ? 'Market notifications on' : 'Market notifications off');}} /></Row>
                </Section>
      }

            {/* ── FINANCIAL PREFERENCES ── */}
            {filtered.some((s) => s.id === 'financial') &&
      <Section icon="◎" title="Financial Preferences" desc="AI mode, risk & investment settings">
                    <Row label="Risk Tolerance" desc="Affects portfolio insights & recommendations">
                        <RadioChips value={settings.financial.riskTolerance} options={[{ value: 'conservative', label: '🛡 Safe' }, { value: 'balanced', label: '⚖ Balanced' }, { value: 'aggressive', label: '🚀 Aggressive' }]} onChange={(v) => {updateFinancial('riskTolerance', v);toast(`Risk tolerance: ${v}`);}} />
                    </Row>
                    <Row label="AI Insight Mode" desc="Controls the tone and aggressiveness of AI suggestions">
                        <RadioChips value={settings.financial.aiMode} options={[{ value: 'conservative', label: 'Conservative' }, { value: 'balanced', label: 'Balanced' }, { value: 'aggressive', label: 'Aggressive' }]} onChange={(v) => {updateFinancial('aiMode', v);toast(`AI mode: ${v}`);}} />
                    </Row>
                    <Row label="Investment Horizon" desc="Short (<1yr), Medium (1-5yr), Long (5yr+)">
                        <RadioChips value={settings.financial.investmentHorizon} options={[{ value: 'short', label: 'Short' }, { value: 'medium', label: 'Medium' }, { value: 'long', label: 'Long' }]} onChange={(v) => {updateFinancial('investmentHorizon', v);toast(`Horizon: ${v}-term`);}} />
                    </Row>
                    <Row label="Stock Style" desc="Prefer value stocks, growth, or both">
                        <RadioChips value={settings.financial.stockStyle} options={[{ value: 'value', label: 'Value' }, { value: 'growth', label: 'Growth' }, { value: 'blend', label: 'Blend' }]} onChange={(v) => {updateFinancial('stockStyle', v);toast(`Stock style: ${v}`);}} />
                    </Row>
                    <Row label="Smart Budgeting" desc="AI automatically suggests budgets"><Toggle checked={settings.financial.smartBudgeting} onChange={(v) => {updateFinancial('smartBudgeting', v);toast(v ? 'Smart budgeting on' : 'Smart budgeting off');}} /></Row>
                    <Row label="Behavioral Insights" desc="Analyze spending habits and patterns"><Toggle checked={settings.financial.behavioralInsights} onChange={(v) => {updateFinancial('behavioralInsights', v);toast(v ? 'Behavioral insights on' : 'Off');}} /></Row>
                    <Row label="Auto SIP Reminders" desc="Monthly reminder for systematic investments"><Toggle checked={settings.financial.autoSipReminders} onChange={(v) => {updateFinancial('autoSipReminders', v);toast(v ? 'SIP reminders enabled' : 'SIP reminders off');}} /></Row>
                </Section>
      }

            {/* ── DATA & EXPORT ── */}
            {filtered.some((s) => s.id === 'data') &&
      <Section icon="↔" title="Data & Export" desc="Export, backup & sync">
                    <Row label="Export Range" desc="Choose what data to include in CSV">
                        <RadioChips value={exportRange} options={[{ value: 'all', label: 'All Time' }, { value: 'month', label: 'This Month' }, { value: 'year', label: 'This Year' }]} onChange={setExportRange} />
                    </Row>
                    <div style={{ padding: '12px 0', display: 'flex', gap: 10 }}>
                        <button className="primary-btn" onClick={handleExport}>⬇ Export CSV</button>
                    </div>
                    <Row label="Data Sync" desc="Cloud sync — coming soon">
                        <span className="tag" style={{ background: 'rgba(77,159,255,.1)', color: T.accent.blue }}>Coming Soon</span>
                    </Row>
                </Section>
      }

            {/* ── ABOUT ── */}
            {filtered.some((s) => s.id === 'about') &&
      <Section icon="◇" title="About & Support" desc="Version, help & feedback">
                    <div style={{ padding: '8px 0' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text.primary, marginBottom: 4 }}>FinTracker AI</div>
                        <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.8 }}>
                            Personal finance management and stock intelligence platform for Indian markets. Track expenses, analyze portfolios, and discover stocks with AI-driven insights.
                        </div>
                        <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 8 }}>Version 2.0.0 · React + Vite · Alpha Vantage API</div>
                    </div>
                    <Row label="Financial Disclaimer" desc="">
                        <span style={{ fontSize: 11, color: T.text.tertiary, lineHeight: 1.6, maxWidth: 280, textAlign: 'right' }}>
                            This app is for informational purposes only. Not financial advice. Past performance ≠ future results.
                        </span>
                    </Row>
                    <div style={{ padding: '12px 0', display: 'flex', gap: 10 }}>
                        <button className="secondary-btn" style={{ fontSize: 12 }} onClick={() => { window.open('mailto:feedback@fintracker.app?subject=FinTracker Feedback'); toast('Opening email client...'); }}>💬 Send Feedback</button>
                        <button className="secondary-btn" style={{ fontSize: 12 }} onClick={() => { window.open('https://github.com/fintracker/issues', '_blank'); toast('Opening bug report...'); }}>🐛 Report Bug</button>
                    </div>
                </Section>
      }

            {/* ── DANGER ZONE ── */}
            {filtered.some((s) => s.id === 'danger') &&
      <Section icon="⚠" title="Danger Zone" desc="Irreversible actions">
                    <Row label="Reset All Settings" desc="Restore default preferences">
                        <button className="danger-btn" onClick={() => setShowReset(true)}>Reset Settings</button>
                    </Row>
                    <Row label="Clear App Data" desc="Remove all local data including transactions">
                        <button className="danger-btn" onClick={() => setShowClear(true)}>Clear Data</button>
                    </Row>
                    <Row label="Delete Account" desc="Permanently delete your account and all data">
                        <button className="danger-btn" onClick={() => setShowDeleteAccount(true)}>Delete Account</button>
                    </Row>
                </Section>
      }

            {/* Confirm Modal — Reset Settings */}
            {showReset &&
      <ConfirmModal
        title="Reset All Settings?"
        desc="This will restore all preferences to their default values. Your transaction data will not be affected."
        confirmLabel="Reset Everything"
        onConfirm={handleReset}
        onCancel={() => setShowReset(false)} />
      }

            {/* Confirm Modal — Clear All Data */}
            {showClear &&
      <ConfirmModal
        title="Clear All App Data?"
        desc="This will permanently delete all transactions and local data. This cannot be undone."
        confirmLabel="Clear Everything"
        onConfirm={() => { localStorage.clear(); toast('All data cleared', 'warning'); setTimeout(() => window.location.reload(), 800); }}
        onCancel={() => setShowClear(false)} />
      }

            {/* Confirm Modal — Delete Account */}
            {showDeleteAccount &&
      <ConfirmModal
        title="Delete Account?"
        desc="Permanently deletes your account and all associated data from the server. This cannot be undone."
        confirmLabel="Delete My Account"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteAccount(false)} />
      }
        </div>);

}