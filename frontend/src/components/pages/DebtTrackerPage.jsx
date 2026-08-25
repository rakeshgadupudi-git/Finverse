'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { T } from '@/lib/tokens';
import { debtApi } from '@/services/api';
import { useSettings } from '@/context/SettingsContext';

function dueDateColor(status) {
  if (status === 'overdue') return T.accent.danger;
  if (status === 'due-soon') return T.accent.gold;
  if (status === 'upcoming') return T.accent.teal;
  return T.text.tertiary;
}

function dueDateLabel(debt) {
  if (!debt.dueDate || debt.dueDateStatus === 'none') return null;
  if (debt.dueDateStatus === 'overdue') return `${Math.abs(debt.daysUntilDue)}d overdue`;
  if (debt.daysUntilDue === 0) return 'Due today';
  return `Due in ${debt.daysUntilDue}d`;
}

const EMPTY_DEBT_FORM = {
  direction: 'BORROWED', counterpartyName: '', principalAmount: '',
  startDate: new Date().toISOString().slice(0, 10), dueDate: '',
  interestType: 'none', interestRate: '', notes: '', createTransaction: true,
};

const EMPTY_PAYMENT_FORM = {
  amount: '', date: new Date().toISOString().slice(0, 10), note: '', createTransaction: false,
};

function DebtModal({ item, defaultDirection, onClose, onSave }) {
  const [form, setForm] = useState(item ? {
    direction: item.direction, counterpartyName: item.counterpartyName,
    principalAmount: String(item.principalAmount),
    startDate: new Date(item.startDate).toISOString().slice(0, 10),
    dueDate: item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '',
    interestType: item.interestType, interestRate: String(item.interestRate || ''),
    notes: item.notes || '', createTransaction: false,
  } : { ...EMPTY_DEBT_FORM, direction: defaultDirection || 'BORROWED' });
  const [saving, setSaving] = useState(false);
  const [showInterest, setShowInterest] = useState(item ? item.interestType !== 'none' : false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.counterpartyName || !form.principalAmount) return;
    setSaving(true);
    await onSave({
      ...form,
      principalAmount: parseFloat(form.principalAmount),
      interestRate: parseFloat(form.interestRate) || 0,
      interestType: showInterest ? form.interestType : 'none',
      dueDate: form.dueDate || null,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{item ? 'Edit Debt' : 'Add Debt'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 14 }}>
            {!item && (
              <div>
                <label className="form-label">Direction</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { val: 'BORROWED', label: '↑ I Borrowed', color: T.accent.danger },
                    { val: 'LENT', label: '↓ I Lent', color: T.accent.teal },
                  ].map((d) => (
                    <button key={d.val} type="button" onClick={() => set('direction', d.val)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        border: `2px solid ${form.direction === d.val ? d.color : 'var(--border-subtle)'}`,
                        background: form.direction === d.val ? (d.val === 'BORROWED' ? 'var(--surface-danger)' : 'var(--surface-teal)') : 'transparent',
                        color: form.direction === d.val ? d.color : T.text.tertiary,
                      }}>{d.label}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="form-label">{form.direction === 'BORROWED' ? 'Borrowed from' : 'Lent to'} *</label>
              <input className="input-field" value={form.counterpartyName} onChange={(e) => set('counterpartyName', e.target.value)} placeholder="Person / entity name" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Amount (₹) *</label>
                <input className="input-field" type="number" min="0.01" step="0.01" value={form.principalAmount} onChange={(e) => set('principalAmount', e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Start Date</label>
                <input className="input-field" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="form-label">Due Date (optional)</label>
              <input className="input-field" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.text.secondary }}>
                <input type="checkbox" checked={showInterest} onChange={(e) => setShowInterest(e.target.checked)} style={{ accentColor: 'var(--teal)' }} />
                Add interest
              </label>
            </div>
            {showInterest && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Interest Type</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['simple', 'compound'].map((t) => (
                      <button key={t} type="button" className={`radio-chip${form.interestType === t ? ' active' : ''}`} style={{ fontSize: 11 }} onClick={() => set('interestType', t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label">Annual Rate (%)</label>
                  <input className="input-field" type="number" min="0" step="0.1" value={form.interestRate} onChange={(e) => set('interestRate', e.target.value)} placeholder="e.g. 12" />
                </div>
              </div>
            )}
            <div>
              <label className="form-label">Notes</label>
              <textarea className="input-field" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
            </div>
            {!item && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.text.secondary }}>
                <input type="checkbox" checked={form.createTransaction} onChange={(e) => set('createTransaction', e.target.checked)} style={{ accentColor: 'var(--teal)' }} />
                Also create a transaction entry
              </label>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving…' : item ? 'Save Changes' : 'Add Debt'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PaymentModal({ debt, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_PAYMENT_FORM });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true);
    await onSave(debt._id, { ...form, amount: parseFloat(form.amount) });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            Add Payment — {debt.counterpartyName}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label className="form-label">Amount (₹) *</label>
              <input className="input-field" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="form-label">Date</label>
              <input className="input-field" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Note</label>
              <input className="input-field" value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Optional" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.text.secondary }}>
              <input type="checkbox" checked={form.createTransaction} onChange={(e) => set('createTransaction', e.target.checked)} style={{ accentColor: 'var(--teal)' }} />
              Also create a transaction entry
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Adding…' : 'Add Payment'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function DebtCard({ debt, onEdit, onDelete, onAddPayment, onDeletePayment, onClose: onCloseDebt }) {
  const [expanded, setExpanded] = useState(false);
  const fmt = (n) => (n || 0).toLocaleString('en-IN');
  const isBorrowed = debt.direction === 'BORROWED';
  const accentColor = isBorrowed ? T.accent.danger : T.accent.teal;
  const ddLabel = dueDateLabel(debt);
  const ddColor = dueDateColor(debt.dueDateStatus);

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ padding: 18, borderLeft: `4px solid ${accentColor}`, opacity: debt.status === 'closed' ? 0.7 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>{debt.counterpartyName}</span>
            <span style={{ fontSize: 11, color: accentColor, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: isBorrowed ? 'var(--surface-danger)' : 'var(--surface-teal)' }}>
              {isBorrowed ? '↑ I Owe' : '↓ Owed to Me'}
            </span>
            {debt.status === 'closed' && <span style={{ fontSize: 10, color: 'var(--teal)', background: 'var(--surface-teal)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>Closed</span>}
          </div>
          <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 4 }}>
            Since {new Date(debt.startDate).toLocaleDateString('en-IN')}
            {debt.interestType !== 'none' && ` · ${debt.interestType} ${debt.interestRate}% p.a.`}
          </div>
        </div>
        {ddLabel && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: debt.dueDateStatus === 'overdue' ? 'var(--surface-danger)' : debt.dueDateStatus === 'due-soon' ? 'var(--surface-gold)' : 'var(--surface-teal)', color: ddColor, flexShrink: 0 }}>
            {ddLabel}
          </span>
        )}
      </div>

      {/* Amounts */}
      <div style={{ margin: '14px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: T.text.tertiary, textTransform: 'uppercase', marginBottom: 2 }}>Principal</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>₹{fmt(debt.principalAmount)}</div>
        </div>
        {debt.interestType !== 'none' && (
          <div>
            <div style={{ fontSize: 10, color: T.text.tertiary, textTransform: 'uppercase', marginBottom: 2 }}>Interest</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: T.accent.gold }}>+₹{fmt(debt.interestAccrued)}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 10, color: T.text.tertiary, textTransform: 'uppercase', marginBottom: 2 }}>Paid</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: T.accent.teal }}>₹{fmt(debt.totalPaid)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.text.tertiary, textTransform: 'uppercase', marginBottom: 2 }}>Remaining</div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: debt.remainingAmount <= 0 ? T.accent.teal : accentColor }}>
            ₹{fmt(debt.remainingAmount)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text.tertiary, marginBottom: 4 }}>
          <span>Repaid</span><span>{debt.progressPercent}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--surface-progress-bg)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${debt.progressPercent}%`, background: debt.progressPercent >= 100 ? 'var(--teal)' : accentColor, borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* Actions */}
      {debt.status === 'active' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <button className="primary-btn" style={{ fontSize: 12, flex: 1 }} onClick={() => onAddPayment(debt)}>+ Payment</button>
          <button className="secondary-btn" style={{ fontSize: 12 }} onClick={() => onEdit(debt)}>Edit</button>
          <button className="secondary-btn" style={{ fontSize: 12 }} onClick={() => onCloseDebt(debt)}>Close</button>
          <button className="danger-btn" style={{ fontSize: 12 }} onClick={() => onDelete(debt._id)}>✕</button>
        </div>
      )}
      {debt.status === 'closed' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button className="danger-btn" style={{ fontSize: 12, flex: 1 }} onClick={() => onDelete(debt._id)}>Delete</button>
        </div>
      )}

      {/* Payment history toggle */}
      {debt.payments.length > 0 && (
        <>
          <button onClick={() => setExpanded(!expanded)} className="radio-chip" style={{ fontSize: 11, width: '100%' }}>
            {expanded ? '▲' : '▼'} {debt.payments.length} payment{debt.payments.length !== 1 ? 's' : ''}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  {debt.payments.map((p) => (
                    <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', color: T.accent.teal, fontWeight: 700 }}>₹{fmt(p.amount)}</span>
                        {p.note && <span style={{ color: T.text.tertiary, marginLeft: 8 }}>{p.note}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: T.text.tertiary }}>{new Date(p.date).toLocaleDateString('en-IN')}</span>
                        {debt.status === 'active' && (
                          <button onClick={() => onDeletePayment(debt._id, p._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.accent.danger, fontSize: 14, padding: 2 }}>✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

const TABS = ['borrowed', 'lent', 'closed'];

export default function DebtTrackerPage({ currency = 'INR', onTransactionAdded }) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('borrowed');
  const [showAdd, setShowAdd] = useState(false);
  const [addDirection, setAddDirection] = useState('BORROWED');
  const [editDebt, setEditDebt] = useState(null);
  const [paymentDebt, setPaymentDebt] = useState(null);
  const { toast } = useSettings();

  const load = () => {
    debtApi.getAll('all=1')
      .then(({ data }) => setDebts(data.debts || []))
      .catch(() => toast('Failed to load debts', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const { borrowed, lent, closed, totalBorrowed, totalLent, netBalance } = useMemo(() => {
    const borrowed = debts.filter((d) => d.direction === 'BORROWED' && d.status === 'active');
    const lent = debts.filter((d) => d.direction === 'LENT' && d.status === 'active');
    const closed = debts.filter((d) => d.status === 'closed');
    return {
      borrowed, lent, closed,
      totalBorrowed: borrowed.reduce((s, d) => s + d.remainingAmount, 0),
      totalLent: lent.reduce((s, d) => s + d.remainingAmount, 0),
      netBalance: lent.reduce((s, d) => s + d.remainingAmount, 0) - borrowed.reduce((s, d) => s + d.remainingAmount, 0),
    };
  }, [debts]);

  const visible = tab === 'borrowed' ? borrowed : tab === 'lent' ? lent : closed;

  const handleSave = async (form) => {
    try {
      if (editDebt) {
        const { data } = await debtApi.update(editDebt._id, form);
        setDebts((p) => p.map((d) => d._id === editDebt._id ? data.debt : d));
        toast('Debt updated', 'success');
      } else {
        const { data } = await debtApi.create(form);
        setDebts((p) => [data.debt, ...p]);
        toast('Debt added', 'success');
      }
    } catch (err) {
      toast(err.message || 'Failed to save debt', 'error');
    } finally {
      setShowAdd(false);
      setEditDebt(null);
    }
  };

  const handleAddPayment = async (debtId, form) => {
    try {
      const { data } = await debtApi.addPayment(debtId, form);
      setDebts((p) => p.map((d) => d._id === debtId ? data.debt : d));
      toast('Payment recorded', 'success');
    } catch (err) {
      toast(err.message || 'Failed to add payment', 'error');
    } finally {
      setPaymentDebt(null);
    }
  };

  const handleDeletePayment = async (debtId, paymentId) => {
    if (!window.confirm('Delete this payment?')) return;
    try {
      const { data } = await debtApi.deletePayment(debtId, paymentId);
      setDebts((p) => p.map((d) => d._id === debtId ? data.debt : d));
      toast('Payment deleted', 'success');
    } catch {
      toast('Failed to delete payment', 'error');
    }
  };

  const handleCloseDebt = async (debt) => {
    if (!window.confirm(`Mark debt with ${debt.counterpartyName} as closed?`)) return;
    try {
      const { data } = await debtApi.update(debt._id, { status: 'closed' });
      setDebts((p) => p.map((d) => d._id === debt._id ? data.debt : d));
      toast('Debt closed', 'success');
    } catch {
      toast('Failed to close debt', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this debt record?')) return;
    try {
      await debtApi.remove(id);
      setDebts((p) => p.filter((d) => d._id !== id));
      toast('Debt deleted', 'success');
    } catch {
      toast('Failed to delete debt', 'error');
    }
  };

  const fmt = (n) => (Math.abs(n) || 0).toLocaleString('en-IN');

  return (
    <div className="fade-up" style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Debt Tracker</h1>
          <p style={{ color: T.text.tertiary, fontSize: 13, marginTop: 4 }}>Track money you owe and are owed</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="danger-btn" style={{ fontSize: 13 }} onClick={() => { setAddDirection('BORROWED'); setShowAdd(true); }}>+ I Borrowed</button>
          <button className="primary-btn" style={{ fontSize: 13 }} onClick={() => { setAddDirection('LENT'); setShowAdd(true); }}>+ I Lent</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="stat-card" style={{ borderTop: `3px solid ${T.accent.danger}` }}>
          <div style={{ fontSize: 11, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>I Owe</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.accent.danger, fontFamily: 'var(--font-mono)' }}>₹{fmt(totalBorrowed)}</div>
        </div>
        <div className="stat-card" style={{ borderTop: `3px solid ${T.accent.teal}` }}>
          <div style={{ fontSize: 11, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Owed to Me</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.accent.teal, fontFamily: 'var(--font-mono)' }}>₹{fmt(totalLent)}</div>
        </div>
        <div className="stat-card" style={{ borderTop: `3px solid ${netBalance >= 0 ? T.accent.teal : T.accent.danger}` }}>
          <div style={{ fontSize: 11, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Net Balance</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: netBalance >= 0 ? T.accent.teal : T.accent.danger, fontFamily: 'var(--font-mono)' }}>
            {netBalance >= 0 ? '+' : '-'}₹{fmt(netBalance)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map((t) => {
          const count = t === 'borrowed' ? borrowed.length : t === 'lent' ? lent.length : closed.length;
          return (
            <button key={t} className={`radio-chip${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: T.text.tertiary, padding: 48 }}>Loading debts…</div>
      ) : visible.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: T.text.tertiary }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>↕</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No {tab} debts</div>
          <div style={{ fontSize: 13 }}>{tab === 'closed' ? 'No debts have been closed yet' : `Click "+ I ${tab === 'borrowed' ? 'Borrowed' : 'Lent'}" to add one`}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AnimatePresence>
            {visible.map((debt) => (
              <DebtCard key={debt._id} debt={debt}
                onEdit={setEditDebt}
                onDelete={handleDelete}
                onAddPayment={setPaymentDebt}
                onDeletePayment={handleDeletePayment}
                onClose={handleCloseDebt}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {(showAdd || editDebt) && (
          <DebtModal item={editDebt} defaultDirection={addDirection}
            onClose={() => { setShowAdd(false); setEditDebt(null); }}
            onSave={handleSave} />
        )}
        {paymentDebt && (
          <PaymentModal debt={paymentDebt}
            onClose={() => setPaymentDebt(null)}
            onSave={handleAddPayment} />
        )}
      </AnimatePresence>
    </div>
  );
}
