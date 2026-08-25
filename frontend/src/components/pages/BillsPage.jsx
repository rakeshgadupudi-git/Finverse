'use client';
import { useState, useEffect } from 'react';
import { billApi } from '@/services/api';
import { T } from '@/lib/tokens';

const fmt = (n) => (n || 0).toLocaleString('en-IN');

const CATEGORY_ICONS = {
  Streaming: '📺', Utilities: '⚡', Insurance: '🛡',
  EMI: '🏦', Rent: '🏠', Subscription: '📦', Other: '📄',
};

const CATEGORIES = Object.keys(CATEGORY_ICONS);
const FREQUENCIES = ['monthly', 'quarterly', 'yearly'];

const NOW_MS = Date.now(); // stable module-level timestamp — avoids impure call during render

// Correct ordinal suffix: 1st, 2nd, 3rd, 21st, 22nd, 31st, etc.
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

function statusStyle(status) {
  if (status === 'overdue')   return { color: '#ff5e6c', bg: 'rgba(255,94,108,0.1)',  border: 'rgba(255,94,108,0.3)'  };
  if (status === 'due-today') return { color: '#ff8c42', bg: 'rgba(255,140,66,0.1)',  border: 'rgba(255,140,66,0.3)'  };
  if (status === 'paid')      return { color: '#00d4aa', bg: 'rgba(0,212,170,0.08)',  border: 'rgba(0,212,170,0.25)'  };
  return                             { color: '#6b7280', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)' };
}

// ── Add/Edit Bill Modal ───────────────────────────────────────────────────────
function BillModal({ onClose, onSave, initial }) {
  const [name, setName]           = useState(initial?.name || '');
  const [amount, setAmount]       = useState(initial?.amount || '');
  const [dueDate, setDueDate]     = useState(initial?.dueDate || 1);
  const [frequency, setFrequency] = useState(initial?.frequency || 'monthly');
  const [category, setCategory]   = useState(initial?.category || 'Other');
  const [reminder, setReminder]   = useState(initial?.reminderDaysBefore ?? 3);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!name.trim() || !amount || !dueDate) { setErr('Name, amount and due day are required.'); return; }
    setErr(''); setLoading(true);
    try {
      await onSave({ name: name.trim(), amount: Number(amount), dueDate: Number(dueDate), frequency, category, reminderDaysBefore: Number(reminder) });
      onClose();
    } catch (e) {
      setErr(e.message || 'Failed to save.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bill-modal-box">
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 20 }}>{initial ? 'Edit Bill' : 'Add Bill'}</div>
        {err && <div className="modal-error">{err}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="form-label">Bill Name *</div>
            <input className="input-field" placeholder="e.g. Netflix, Electricity" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="form-label">Amount (₹) *</div>
              <input className="input-field" type="number" min={0} placeholder="499" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="form-label">Due Day (1–31) *</div>
              <input className="input-field" type="number" min={1} max={31} value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 6 }}>Frequency</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {FREQUENCIES.map((f) => (
                <button key={f} type="button" onClick={() => setFrequency(f)}
                  style={{ padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'inherit', background: frequency === f ? T.accent.teal : 'rgba(255,255,255,0.07)', color: frequency === f ? '#0a0e1a' : T.text.secondary }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 6 }}>Category</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: category === c ? T.accent.teal : 'rgba(255,255,255,0.07)', color: category === c ? '#0a0e1a' : T.text.secondary }}>
                  {CATEGORY_ICONS[c]} {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="form-label">Remind me (days before due)</div>
            <input className="input-field" type="number" min={0} max={30} value={reminder} onChange={(e) => setReminder(e.target.value)} style={{ width: 80 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button type="button" className="radio-chip" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-btn" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving…' : 'Save Bill'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar View ─────────────────────────────────────────────────────────────
function CalendarView({ bills }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const billsByDay = {};
  bills.forEach((b) => {
    const key = b.dueDate;
    if (!billsByDay[key]) billsByDay[key] = [];
    billsByDay[key].push(b);
  });

  const cells = Array.from({ length: firstDay }).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text.secondary, marginBottom: 12 }}>
        {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
      </div>
      <div className="calendar-grid" style={{ marginBottom: 6 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="calendar-day-num" style={{ textAlign: 'center', fontWeight: 700, color: T.text.tertiary, paddingBottom: 4 }}>
            {d}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dayBills = billsByDay[day] || [];
          const isToday = day === now.getDate();
          return (
            <div key={day} className="calendar-cell"
              style={{
                background: isToday ? 'rgba(0,212,170,0.1)' : dayBills.length ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: `1px solid ${isToday ? 'rgba(0,212,170,0.4)' : dayBills.length ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
              }}>
              <div className="calendar-day-num" style={{ fontWeight: isToday ? 800 : 500, color: isToday ? T.accent.teal : T.text.tertiary }}>
                {day}
              </div>
              {dayBills.slice(0, 2).map((b) => {
                const s = statusStyle(b.status);
                return (
                  <div key={b._id} title={b.name} className="calendar-bill-chip"
                    style={{ background: s.bg, color: s.color }}>
                    {CATEGORY_ICONS[b.category]} {b.name}
                  </div>
                );
              })}
              {dayBills.length > 2 && <div style={{ fontSize: 8, color: T.text.tertiary, textAlign: 'center' }}>+{dayBills.length - 2}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Bill Row ──────────────────────────────────────────────────────────────────
function BillRow({ bill, onMarkPaid, onEdit, onDelete }) {
  const isPaid = bill.lastPaidAt && new Date(bill.lastPaidAt) > new Date(NOW_MS - 5 * 24 * 3600 * 1000);
  const st = isPaid ? statusStyle('paid') : statusStyle(bill.status);

  return (
    <div className="bill-row" style={{ background: st.bg, border: `1px solid ${st.border}` }}>
      <div style={{ fontSize: 20, flexShrink: 0 }}>{CATEGORY_ICONS[bill.category] || '📄'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text.primary }}>{bill.name}</div>
        <div style={{ fontSize: 12, color: T.text.tertiary }}>
          Due: {bill.dueDate}{ordinal(bill.dueDate)} of every {bill.frequency === 'monthly' ? 'month' : bill.frequency === 'quarterly' ? 'quarter' : 'year'}
          {bill.daysUntil !== undefined && (
            <span style={{ marginLeft: 8, color: st.color, fontWeight: 600 }}>
              {bill.daysUntil < 0 ? `${Math.abs(bill.daysUntil)}d overdue` : bill.daysUntil === 0 ? 'Due today' : `in ${bill.daysUntil}d`}
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text.primary, fontFamily: 'monospace' }}>₹{fmt(bill.amount)}</div>
        <div style={{ fontSize: 10, color: T.text.tertiary, textTransform: 'capitalize' }}>{bill.frequency}</div>
      </div>
      <div className="bill-row-actions">
        <button type="button" className="primary-btn" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => onMarkPaid(bill._id)}>✓ Paid</button>
        <button type="button" className="radio-chip" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => onEdit(bill)}>✎ Edit</button>
        <button type="button" className="radio-chip" style={{ fontSize: 11, padding: '5px 10px', color: T.accent.danger }} onClick={() => { if (window.confirm(`Remove "${bill.name}"?`)) onDelete(bill._id); }}>✕</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BillsPage() {
  const [bills, setBills]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [view, setView]         = useState('list');

  const load = async () => {
    try {
      const data = await billApi.getAll();
      setBills(data.data.bills || []);
    } catch { setBills([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate   = async (payload) => { await billApi.create(payload); await load(); };
  const handleEdit     = async (id, payload) => { await billApi.update(id, payload); await load(); };
  const handleMarkPaid = async (id) => { await billApi.update(id, { markPaid: true }); await load(); };
  const handleDelete   = async (id) => { await billApi.remove(id); await load(); };

  const now = new Date();
  const next30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const upcoming30 = bills.filter((b) => { const d = new Date(b.nextDueDate); return d >= now && d <= next30; });
  const total30    = upcoming30.reduce((s, b) => s + b.amount, 0);

  const overdue  = bills.filter((b) => b.status === 'overdue');
  const dueToday = bills.filter((b) => b.status === 'due-today');
  const upcoming = bills.filter((b) => b.status === 'upcoming');

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Bills & Subscriptions</h1>
          <p style={{ fontSize: 13, color: T.text.tertiary, marginTop: 4 }}>Track recurring payments</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3, gap: 2 }}>
            {[['list', '☰ List'], ['calendar', '◫ Calendar']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setView(v)}
                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: view === v ? 'rgba(0,212,170,0.2)' : 'transparent', color: view === v ? T.accent.teal : T.text.tertiary }}>
                {l}
              </button>
            ))}
          </div>
          <button type="button" className="primary-btn" onClick={() => setShowAdd(true)}>+ Add Bill</button>
        </div>
      </div>

      {bills.length > 0 && (
        <div className="bills-summary">
          {[
            ['Next 30 Days', `₹${fmt(total30)}`, 'rgba(0,212,170,0.1)', 'rgba(0,212,170,0.3)', T.accent.teal],
            ['Overdue', overdue.length, 'rgba(255,94,108,0.1)', 'rgba(255,94,108,0.3)', T.accent.danger],
            ['Due Today', dueToday.length, 'rgba(255,140,66,0.1)', 'rgba(255,140,66,0.3)', T.accent.orange],
            ['Upcoming', upcoming.length, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.07)', T.text.secondary],
          ].map(([l, v, bg, border, color]) => (
            <div key={l} className="bills-summary-card" style={{ background: bg, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 11, color: T.text.tertiary, marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: T.text.tertiary }}>Loading bills…</div>
      ) : bills.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: T.text.tertiary }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text.secondary, marginBottom: 8 }}>No bills yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Add your recurring bills to never miss a payment.</div>
          <button type="button" className="primary-btn" onClick={() => setShowAdd(true)}>Add first bill</button>
        </div>
      ) : view === 'calendar' ? (
        <CalendarView bills={bills} />
      ) : (
        <div>
          {overdue.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent.danger, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Overdue ({overdue.length})</div>
              {overdue.map((b) => <BillRow key={b._id} bill={b} onMarkPaid={handleMarkPaid} onEdit={setEditBill} onDelete={handleDelete} />)}
            </div>
          )}
          {dueToday.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent.orange, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Due Today ({dueToday.length})</div>
              {dueToday.map((b) => <BillRow key={b._id} bill={b} onMarkPaid={handleMarkPaid} onEdit={setEditBill} onDelete={handleDelete} />)}
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Upcoming ({upcoming.length})</div>
              {upcoming.map((b) => <BillRow key={b._id} bill={b} onMarkPaid={handleMarkPaid} onEdit={setEditBill} onDelete={handleDelete} />)}
            </div>
          )}
        </div>
      )}

      {showAdd   && <BillModal onClose={() => setShowAdd(false)} onSave={handleCreate} />}
      {editBill  && <BillModal onClose={() => setEditBill(null)} onSave={(p) => handleEdit(editBill._id, p)} initial={editBill} />}
    </div>
  );
}
