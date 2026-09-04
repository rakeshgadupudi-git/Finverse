'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { T } from '@/lib/tokens';
import { accountApi } from '@/services/api';
import { useSettings } from '@/context/SettingsContext';

const ACCOUNT_TYPES = ['savings', 'current', 'salary', 'credit', 'wallet', 'investment', 'loan', 'other'];
const ACCENT_COLORS = ['#00d4aa', '#9d77f7', '#f5c842', '#f97316', '#3b82f6', '#ef4444', '#ec4899', '#10b981'];

const TYPE_ICONS = {
  savings: '🏦', current: '🏧', salary: '💼', credit: '💳',
  wallet: '👛', investment: '📈', loan: '📄', other: '💰',
};

function utilizationColor(pct) {
  if (pct >= 90) return T.accent.danger;
  if (pct >= 70) return T.accent.gold;
  if (pct >= 30) return T.accent.orange || '#f97316';
  return T.accent.teal;
}

const EMPTY_FORM = { name: '', accountType: 'savings', institution: '', balance: '', creditLimit: '', currentOutstanding: '', color: '#00d4aa', notes: '' };

function AccountModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item ? {
    name: item.name, accountType: item.accountType, institution: item.institution || '',
    balance: String(item.balance || 0), creditLimit: String(item.creditLimit || 0),
    currentOutstanding: String(item.currentOutstanding || 0),
    color: item.color || '#00d4aa', notes: item.notes || '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isCredit = form.accountType === 'credit';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.accountType) return;
    setSaving(true);
    await onSave({
      ...form,
      balance: parseFloat(form.balance) || 0,
      creditLimit: parseFloat(form.creditLimit) || 0,
      currentOutstanding: parseFloat(form.currentOutstanding) || 0,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Sticky header — always visible while scrolling */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, position: 'sticky', top: 0,
          background: 'var(--bg-elevated, #111827)', zIndex: 1,
          paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)',
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{item ? 'Edit Account' : 'Add Account'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 14 }}>

            {/* Row 1: Account Name — full width */}
            <div>
              <label className="form-label">Account Name *</label>
              <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. HDFC Savings" required />
            </div>

            {/* Row 2: Account Type chips — full width */}
            <div>
              <label className="form-label">Account Type *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {ACCOUNT_TYPES.map((t) => (
                  <button key={t} type="button" className={`radio-chip${form.accountType === t ? ' active' : ''}`} style={{ fontSize: 12 }} onClick={() => set('accountType', t)}>
                    {TYPE_ICONS[t]} {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Institution + Balance (2-col) for non-credit, or credit fields */}
            {!isCredit ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Institution / Bank</label>
                  <input className="input-field" value={form.institution} onChange={(e) => set('institution', e.target.value)} placeholder="e.g. HDFC Bank" />
                </div>
                <div>
                  <label className="form-label">Current Balance (₹)</label>
                  <input className="input-field" type="number" step="0.01" value={form.balance} onChange={(e) => set('balance', e.target.value)} placeholder="0" />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="form-label">Institution / Bank</label>
                  <input className="input-field" value={form.institution} onChange={(e) => set('institution', e.target.value)} placeholder="e.g. HDFC Bank" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Credit Limit (₹)</label>
                    <input className="input-field" type="number" step="0.01" value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="form-label">Current Outstanding (₹)</label>
                    <input className="input-field" type="number" step="0.01" value={form.currentOutstanding} onChange={(e) => set('currentOutstanding', e.target.value)} placeholder="0" />
                  </div>
                </div>
              </>
            )}

            {/* Row 4: Card Color — full width */}
            <div>
              <label className="form-label">Card Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                {ACCENT_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => set('color', c)} style={{
                    width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0,
                    border: `3px solid ${form.color === c ? 'var(--text-primary)' : 'transparent'}`, transition: 'border 0.15s',
                  }} />
                ))}
                <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)}
                  style={{ width: 26, height: 26, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'none', padding: 0, flexShrink: 0 }} />
              </div>
            </div>

            {/* Row 5: Notes — full width */}
            <div>
              <label className="form-label">Notes</label>
              <textarea className="input-field" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Optional" style={{ resize: 'vertical' }} />
            </div>

          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving…' : item ? 'Save Changes' : 'Add Account'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AccountCard({ account, onEdit, onDelete, onQuickUpdate }) {
  const [quickEdit, setQuickEdit] = useState(false);
  const [draft, setDraft] = useState('');
  const isCredit = account.accountType === 'credit';
  const fmt = (n) => (n || 0).toLocaleString('en-IN');

  const commitQuick = () => {
    const val = parseFloat(draft);
    if (!isNaN(val) && val >= 0) onQuickUpdate(account._id, isCredit ? { currentOutstanding: val } : { balance: val });
    setQuickEdit(false);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card"
      style={{ padding: 18, borderTop: `3px solid ${account.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-invert)', border: `2px solid ${account.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {TYPE_ICONS[account.accountType] || '💰'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{account.name}</div>
            {account.institution && <div style={{ fontSize: 11, color: T.text.tertiary }}>{account.institution}</div>}
          </div>
        </div>
        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: 'var(--surface-invert)', border: `1px solid ${account.color}50`, color: account.color, fontWeight: 700, textTransform: 'capitalize' }}>
          {account.accountType}
        </span>
      </div>

      {isCredit ? (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.text.tertiary, marginBottom: 4 }}>
              <span>Outstanding</span>
              <span>{account.creditUtilization != null ? `${account.creditUtilization}% used` : ''}</span>
            </div>
            <div style={{ height: 6, background: 'var(--surface-progress-bg)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, account.creditUtilization || 0)}%`, background: utilizationColor(account.creditUtilization || 0), borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text.tertiary, marginTop: 4 }}>
              <span style={{ color: utilizationColor(account.creditUtilization || 0), fontWeight: 700, fontFamily: 'var(--font-mono)' }}>₹{fmt(account.currentOutstanding)}</span>
              <span>/ ₹{fmt(account.creditLimit)}</span>
            </div>
          </div>
          {account.availableCredit != null && (
            <div style={{ fontSize: 12, color: T.text.secondary }}>Available: <span style={{ color: T.accent.teal, fontWeight: 600 }}>₹{fmt(account.availableCredit)}</span></div>
          )}
        </>
      ) : (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: T.text.tertiary, marginBottom: 4 }}>Balance</div>
          {quickEdit ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input autoFocus type="number" step="0.01" value={draft} onChange={(e) => setDraft(e.target.value)}
                onBlur={commitQuick} onKeyDown={(e) => { if (e.key === 'Enter') commitQuick(); if (e.key === 'Escape') setQuickEdit(false); }}
                className="input-field" style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 800 }} placeholder={fmt(account.balance)} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: T.accent.teal, fontFamily: 'var(--font-mono)' }}>₹{fmt(account.balance)}</span>
              <button onClick={() => { setQuickEdit(true); setDraft(String(account.balance || 0)); }}
                className="radio-chip" style={{ fontSize: 10, padding: '3px 8px' }}>Update</button>
            </div>
          )}
          <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 4 }}>Updated {new Date(account.lastUpdated).toLocaleDateString('en-IN')}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="secondary-btn" style={{ flex: 1, fontSize: 12 }} onClick={() => onEdit(account)}>Edit</button>
        <button className="danger-btn" style={{ flex: 1, fontSize: 12 }} onClick={() => onDelete(account._id)}>Delete</button>
      </div>
    </motion.div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: payload[0]?.color, fontWeight: 700 }}>{payload[0]?.payload?.name}</div>
      <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>₹{(payload[0]?.value || 0).toLocaleString('en-IN')}</div>
    </div>
  );
}

export default function AccountsPage({ currency = 'INR', accounts: propAccounts = [], setAccounts: setPropAccounts }) {
  const [localAccounts, setLocalAccounts] = useState(null);
  const [loading, setLoading] = useState(!propAccounts.length);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const { toast } = useSettings();

  const accounts = localAccounts ?? propAccounts;
  const setAccounts = (updater) => {
    const next = typeof updater === 'function' ? updater(accounts) : updater;
    setLocalAccounts(next);
    if (setPropAccounts) setPropAccounts(next);
  };

  const summary = useMemo(() => {
    const nonCredit = ['savings', 'current', 'salary', 'wallet', 'investment', 'other'];
    const totalAssets = accounts.filter((a) => nonCredit.includes(a.accountType)).reduce((s, a) => s + (a.balance || 0), 0);
    const totalOutstanding = accounts.filter((a) => a.accountType === 'credit').reduce((s, a) => s + (a.currentOutstanding || 0), 0);
    const totalCreditLimit = accounts.filter((a) => a.accountType === 'credit').reduce((s, a) => s + (a.creditLimit || 0), 0);
    const overallUtil = totalCreditLimit > 0 ? Math.round((totalOutstanding / totalCreditLimit) * 100) : 0;
    return { totalAssets, totalOutstanding, totalCreditLimit, overallUtil, netWorth: totalAssets - totalOutstanding };
  }, [accounts]);

  const chartData = useMemo(() =>
    accounts.filter((a) => a.accountType !== 'credit' && (a.balance || 0) > 0).map((a) => ({
      name: a.name, value: a.balance || 0, color: a.color || '#00d4aa',
    })),
    [accounts]
  );

  const creditAccounts = accounts.filter((a) => a.accountType === 'credit');

  const handleSave = async (form) => {
    try {
      if (editItem) {
        const { data } = await accountApi.update(editItem._id, form);
        setAccounts((p) => p.map((a) => a._id === editItem._id ? data.account : a));
        toast('Account updated', 'success');
      } else {
        const { data } = await accountApi.create(form);
        setAccounts((p) => [...p, data.account]);
        toast('Account added', 'success');
      }
    } catch (err) {
      toast(err.message || 'Failed to save account', 'error');
    } finally {
      setShowAdd(false);
      setEditItem(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account?')) return;
    try {
      await accountApi.remove(id);
      setAccounts((p) => p.filter((a) => a._id !== id));
      toast('Account deleted', 'success');
    } catch {
      toast('Failed to delete account', 'error');
    }
  };

  const handleQuickUpdate = async (id, update) => {
    try {
      const { data } = await accountApi.update(id, update);
      setAccounts((p) => p.map((a) => a._id === id ? data.account : a));
    } catch {
      toast('Failed to update balance', 'error');
    }
  };

  const fmt = (n) => (n || 0).toLocaleString('en-IN');

  return (
    <div className="fade-up" style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Accounts & Assets</h1>
          <p style={{ color: T.text.tertiary, fontSize: 13, marginTop: 4 }}>Track balances, credit utilization and net worth</p>
        </div>
        <button className="primary-btn" onClick={() => setShowAdd(true)}>+ Add Account</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Net Worth', value: `₹${fmt(summary.netWorth)}`, color: summary.netWorth >= 0 ? T.accent.teal : T.accent.danger },
          { label: 'Total Assets', value: `₹${fmt(summary.totalAssets)}`, color: T.accent.teal },
          { label: 'Credit Outstanding', value: `₹${fmt(summary.totalOutstanding)}`, color: T.accent.danger },
          { label: 'Credit Utilization', value: `${summary.overallUtil}%`, color: utilizationColor(summary.overallUtil) },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 11, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Asset bar chart */}
      {chartData.length > 0 && (
        <div className="glass-card" style={{ padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Account Balances</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : `${(v / 1e3).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Credit utilization */}
      {creditAccounts.length > 0 && (
        <div className="glass-card" style={{ padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Credit Cards</div>
          {creditAccounts.map((a) => (
            <div key={a._id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{a.name}</span>
                <span style={{ color: utilizationColor(a.creditUtilization || 0), fontWeight: 700 }}>{a.creditUtilization || 0}%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, a.creditUtilization || 0)}%`, background: utilizationColor(a.creditUtilization || 0), borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text.tertiary, marginTop: 4 }}>
                <span>₹{fmt(a.currentOutstanding)} outstanding</span>
                <span>₹{fmt(a.creditLimit)} limit</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account cards grid */}
      {accounts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: T.text.tertiary }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏦</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No accounts yet</div>
          <div style={{ fontSize: 13 }}>Add your bank accounts, wallets, and credit cards</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          <AnimatePresence>
            {accounts.map((a) => (
              <AccountCard key={a._id} account={a} onEdit={setEditItem} onDelete={handleDelete} onQuickUpdate={handleQuickUpdate} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {(showAdd || editItem) && (
          <AccountModal item={editItem} onClose={() => { setShowAdd(false); setEditItem(null); }} onSave={handleSave} />
        )}
      </AnimatePresence>
    </div>
  );
}
