'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { T, CATEGORIES, CAT_COLORS } from '@/lib/tokens';
import { plannedPaymentApi, normalizeTx } from '@/services/api';
import { useSettings } from '@/context/SettingsContext';

function urgencyColor(urgency) {
  if (urgency === 'overdue') return T.accent.danger;
  if (urgency === 'due-soon') return T.accent.gold;
  return T.accent.teal;
}

function urgencyLabel(p) {
  if (p.status === 'paid') return 'Paid';
  if (p.status === 'cancelled') return 'Cancelled';
  if (p.urgency === 'overdue') return `${Math.abs(p.daysUntil)}d overdue`;
  if (p.daysUntil === 0) return 'Due today';
  return `In ${p.daysUntil}d`;
}

const EMPTY_FORM = {
  title: '', amount: '', scheduledDate: new Date().toISOString().slice(0, 10),
  category: 'Others', notes: '', reminderDaysBefore: 3,
};

function PaymentModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item ? {
    title: item.title,
    amount: String(item.amount),
    scheduledDate: new Date(item.scheduledDate).toISOString().slice(0, 10),
    category: item.category,
    notes: item.notes || '',
    reminderDaysBefore: item.reminderDaysBefore ?? 3,
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.scheduledDate) return;
    setSaving(true);
    await onSave({ ...form, amount: parseFloat(form.amount), reminderDaysBefore: Number(form.reminderDaysBefore) });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{item ? 'Edit Payment' : 'Add Planned Payment'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label className="form-label">Title *</label>
              <input className="input-field" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Rakesh's Shopping" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Amount (₹) *</label>
                <input className="input-field" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" required />
              </div>
              <div>
                <label className="form-label">Scheduled Date *</label>
                <input className="input-field" type="date" value={form.scheduledDate} onChange={(e) => set('scheduledDate', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="form-label">Category</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <button key={c} type="button"
                    className={`radio-chip${form.category === c ? ' active' : ''}`}
                    style={{ fontSize: 12 }}
                    onClick={() => set('category', c)}
                  >{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Remind me X days before ({form.reminderDaysBefore} days)</label>
              <input type="range" min="0" max="30" value={form.reminderDaysBefore} onChange={(e) => set('reminderDaysBefore', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--teal)' }} />
            </div>
            <div>
              <label className="form-label">Notes</label>
              <textarea className="input-field" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Optional" style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving…' : item ? 'Save Changes' : 'Add Payment'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PaymentRow({ payment, currency, onEdit, onDelete, onPay }) {
  const [paying, setPaying] = useState(false);
  const color = payment.status === 'paid' ? T.text.tertiary
    : payment.status === 'cancelled' ? T.text.tertiary
    : urgencyColor(payment.urgency);
  const catColor = CAT_COLORS[payment.category] || T.accent.teal;
  const fmt = (n) => n?.toLocaleString('en-IN') ?? '0';

  const handlePay = async () => {
    if (!window.confirm(`Mark "${payment.title}" as paid? This will create a transaction entry.`)) return;
    setPaying(true);
    await onPay(payment._id);
    setPaying(false);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, opacity: payment.status !== 'pending' ? 0.65 : 1 }}
    >
      <div style={{ width: 4, height: 40, borderRadius: 2, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{payment.title}</span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--surface-invert)', border: `1px solid ${catColor}40`, color: catColor, fontWeight: 600 }}>{payment.category}</span>
        </div>
        <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 3 }}>
          {new Date(payment.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {payment.notes && ` · ${payment.notes}`}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-mono)', color: T.text.primary }}>
          {currency === 'USD' ? '$' : '₹'}{fmt(payment.amount)}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          background: payment.urgency === 'overdue' ? 'var(--surface-danger)' : payment.urgency === 'due-soon' ? 'var(--surface-gold)' : 'var(--surface-teal)',
          color, display: 'inline-block', marginTop: 3,
        }}>{urgencyLabel(payment)}</span>
      </div>
      {payment.status === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button onClick={handlePay} disabled={paying} className="primary-btn" style={{ fontSize: 11, padding: '5px 10px', whiteSpace: 'nowrap' }}>
            {paying ? '…' : '✓ Pay'}
          </button>
          <button onClick={() => onEdit(payment)} className="secondary-btn" style={{ fontSize: 11, padding: '5px 10px' }}>Edit</button>
          <button onClick={() => onDelete(payment._id)} className="danger-btn" style={{ fontSize: 11, padding: '5px 10px' }}>✕</button>
        </div>
      )}
    </motion.div>
  );
}

const STATUS_FILTERS = ['all', 'pending', 'paid', 'cancelled'];

export default function PlannedPaymentsPage({ currency = 'INR', onTransactionAdded }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filter, setFilter] = useState('pending');
  const { toast } = useSettings();

  useEffect(() => {
    plannedPaymentApi.getAll()
      .then(({ data }) => setPayments(data.payments || []))
      .catch(() => toast('Failed to load payments', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return payments;
    return payments.filter((p) => p.status === filter);
  }, [payments, filter]);

  const summary = useMemo(() => {
    const pending = payments.filter((p) => p.status === 'pending');
    return {
      totalPending: pending.reduce((s, p) => s + p.amount, 0),
      overdueCount: pending.filter((p) => p.urgency === 'overdue').length,
      dueThisWeek: pending.filter((p) => p.daysUntil >= 0 && p.daysUntil <= 7).length,
    };
  }, [payments]);

  const handleSave = async (form) => {
    try {
      if (editItem) {
        const { data } = await plannedPaymentApi.update(editItem._id, form);
        setPayments((p) => p.map((x) => x._id === editItem._id ? data.payment : x));
        toast('Payment updated', 'success');
      } else {
        const { data } = await plannedPaymentApi.create(form);
        setPayments((p) => [...p, data.payment].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)));
        toast('Payment scheduled', 'success');
      }
    } catch (err) {
      toast(err.message || 'Failed to save payment', 'error');
    } finally {
      setShowAdd(false);
      setEditItem(null);
    }
  };

  const handlePay = async (id) => {
    try {
      const { data } = await plannedPaymentApi.pay(id, {});
      setPayments((p) => p.map((x) => x._id === id ? data.payment : x));
      if (data.transaction && onTransactionAdded) onTransactionAdded(data.transaction);
      toast('Payment marked as paid — transaction created', 'success');
    } catch (err) {
      toast(err.message || 'Failed to mark as paid', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this planned payment?')) return;
    try {
      await plannedPaymentApi.remove(id);
      setPayments((p) => p.filter((x) => x._id !== id));
      toast('Payment deleted', 'success');
    } catch {
      toast('Failed to delete payment', 'error');
    }
  };

  const fmt = (n) => n?.toLocaleString('en-IN') ?? '0';

  return (
    <div className="fade-up" style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Planned Payments</h1>
          <p style={{ color: T.text.tertiary, fontSize: 13, marginTop: 4 }}>Schedule one-time future expenses</p>
        </div>
        <button className="primary-btn" onClick={() => setShowAdd(true)}>+ Add Payment</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Pending', value: `${currency === 'USD' ? '$' : '₹'}${fmt(summary.totalPending)}`, color: T.accent.teal },
          { label: 'Overdue', value: summary.overdueCount, color: T.accent.danger },
          { label: 'Due This Week', value: summary.dueThisWeek, color: T.accent.gold },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 11, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {STATUS_FILTERS.map((f) => (
          <button key={f} className={`radio-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && ` (${payments.filter((p) => p.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: T.text.tertiary, padding: 48 }}>Loading payments…</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: T.text.tertiary }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⏰</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No payments here</div>
          <div style={{ fontSize: 13 }}>{payments.length === 0 ? 'Schedule your first planned payment' : 'No payments match this filter'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {filtered.map((p) => (
              <PaymentRow key={p._id} payment={p} currency={currency} onEdit={setEditItem} onDelete={handleDelete} onPay={handlePay} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {(showAdd || editItem) && (
          <PaymentModal
            item={editItem}
            onClose={() => { setShowAdd(false); setEditItem(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
