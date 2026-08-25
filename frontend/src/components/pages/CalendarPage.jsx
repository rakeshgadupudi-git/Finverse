'use client';
import { useState, useEffect, useMemo, memo } from 'react';
import { BarChart, Bar, Tooltip, ResponsiveContainer } from 'recharts';
import { billApi } from '@/services/api';
import { T } from '@/lib/tokens';
import ChartTooltip from '@/components/ChartTooltip';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const toKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const todayKey = new Date().toISOString().slice(0, 10);

const fmt = (n) => (n || 0).toLocaleString('en-IN');

// ── CalendarCell ──────────────────────────────────────────────────────────────
const CalendarCell = memo(function CalendarCell({ dayObj, dayData, isToday, onClick }) {
  const { date, currentMonth } = dayObj;
  const key = toKey(date);
  const isFuture = key > todayKey;
  const data = dayData || { income: 0, expense: 0, bills: [], subscriptions: [] };
  const hasOverdueBill = !isFuture && data.bills.some(b => b.status === 'overdue');

  let cls = 'calendar-cell';
  if (isToday) cls += ' today';
  else if (!currentMonth) cls += ' other-month';
  else if (isFuture) cls += ' future';
  if (hasOverdueBill) cls += ' has-overdue-bill';

  const billDots = Math.min(data.bills.length, 3);
  const subDots  = Math.min(data.subscriptions.length, 2);
  const overdueCount = data.bills.filter(b => b.status === 'overdue').length;

  return (
    <div className={cls} onClick={() => onClick(key)}>
      <div className="calendar-cell__day">{date.getDate()}</div>
      {data.income > 0 && <div className="calendar-cell__income">+{fmt(data.income)}</div>}
      {data.expense > 0 && <div className="calendar-cell__expense">-{fmt(data.expense)}</div>}
      {data.income > 0 && data.expense > 0 && (
        <div className="calendar-cell__net" style={{ color: data.income - data.expense >= 0 ? 'rgba(0,212,170,0.6)' : 'rgba(255,94,108,0.6)' }}>
          net {data.income - data.expense >= 0 ? '+' : ''}{fmt(data.income - data.expense)}
        </div>
      )}
      {(billDots > 0 || subDots > 0) && (
        <div className="calendar-cell__dots">
          {Array.from({ length: billDots }).map((_, i) => (
            <div key={`b${i}`} className={`calendar-cell__dot ${i < overdueCount ? 'calendar-cell__dot--overdue' : 'calendar-cell__dot--bill'}`} />
          ))}
          {Array.from({ length: subDots }).map((_, i) => (
            <div key={`s${i}`} className="calendar-cell__dot calendar-cell__dot--sub" />
          ))}
        </div>
      )}
    </div>
  );
});

// ── DayModal ──────────────────────────────────────────────────────────────────
const DayModal = memo(function DayModal({ dayKey, dayData, onClose }) {
  const data = dayData || { income: 0, expense: 0, bills: [], subscriptions: [], txList: [] };
  const date = new Date(dayKey + 'T00:00:00');
  const label = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  const allBills = [...(data.bills || []), ...(data.subscriptions || [])];

  const billRowClass = (b) => {
    if (b.status === 'overdue') return 'calendar-modal__bill-row calendar-modal__bill-row--overdue';
    if (b.type === 'subscription' || b.recurring) return 'calendar-modal__bill-row calendar-modal__bill-row--sub';
    return 'calendar-modal__bill-row calendar-modal__bill-row--upcoming';
  };

  const billAccent = (b) => {
    if (b.status === 'overdue') return '#ff5e6c';
    if (b.type === 'subscription' || b.recurring) return '#9d77f7';
    return '#f5c842';
  };

  return (
    <div className="calendar-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="calendar-modal">
        <div className="calendar-modal__header">
          <div className="calendar-modal__title">{label}</div>
          <button className="calendar-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Transactions section */}
        <div className="calendar-modal__section">
          <div className="calendar-modal__section-title">Transactions</div>
          {(!data.txList || data.txList.length === 0)
            ? <div className="calendar-modal__empty">No transactions on this day</div>
            : data.txList.map((tx) => (
              <div key={tx.id} className="calendar-modal__tx-row">
                <div className="calendar-modal__tx-info">
                  <div className="calendar-modal__tx-desc">{tx.description || 'Transaction'}</div>
                  <div className="calendar-modal__tx-cat">{tx.category}</div>
                </div>
                <div className="calendar-modal__tx-amt" style={{ color: tx.type === 'income' ? '#00d4aa' : '#ff5e6c' }}>
                  {tx.type === 'income' ? '+' : '-'}₹{fmt(tx.amount)}
                </div>
              </div>
            ))
          }
        </div>

        {/* Bills & Subscriptions section */}
        <div className="calendar-modal__section">
          <div className="calendar-modal__section-title">Bills & Subscriptions</div>
          {allBills.length === 0
            ? <div className="calendar-modal__empty">No bills due on this day</div>
            : allBills.map((b, i) => (
              <div key={b._id || b.id || i} className={billRowClass(b)}>
                <div className="calendar-modal__bill-info">
                  <div className="calendar-modal__bill-name">{b.name}</div>
                  <div className="calendar-modal__bill-tag">
                    {b.status === 'overdue' ? 'Overdue · ' : ''}{b.category || (b.type === 'subscription' ? 'Subscription' : 'Bill')}
                  </div>
                </div>
                <div className="calendar-modal__bill-amt" style={{ color: billAccent(b) }}>
                  ₹{fmt(b.amount)}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
});

// ── CashFlowBar ───────────────────────────────────────────────────────────────
const CashFlowBar = memo(function CashFlowBar({ transactions, viewMonth }) {
  const data = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const weeks = [
      { label: 'Wk 1', income: 0, expense: 0 },
      { label: 'Wk 2', income: 0, expense: 0 },
      { label: 'Wk 3', income: 0, expense: 0 },
      { label: 'Wk 4', income: 0, expense: 0 },
      { label: 'Wk 5', income: 0, expense: 0 },
    ];
    transactions.forEach(tx => {
      const d = new Date(tx.date + 'T00:00:00');
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 7), 4);
      if (tx.type === 'income') weeks[weekIdx].income += tx.amount;
      else weeks[weekIdx].expense += tx.amount;
    });
    return weeks.filter(w => w.income > 0 || w.expense > 0);
  }, [transactions, viewMonth]);

  if (data.length === 0) return null;

  return (
    <div className="calendar-cashflow">
      <div className="calendar-cashflow__header">
        <div className="calendar-cashflow__title">Monthly Cash Flow</div>
        <div className="calendar-cashflow__legend">
          <div className="calendar-cashflow__legend-item">
            <div className="calendar-cashflow__legend-dot" style={{ background: '#00d4aa' }} />
            Income
          </div>
          <div className="calendar-cashflow__legend-item">
            <div className="calendar-cashflow__legend-dot" style={{ background: '#ff5e6c' }} />
            Expense
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} barGap={4} barCategoryGap="30%">
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="income" name="Income" fill="#00d4aa" radius={[4,4,0,0]} maxBarSize={40} />
          <Bar dataKey="expense" name="Expense" fill="#ff5e6c" radius={[4,4,0,0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

// ── Summary Cards ─────────────────────────────────────────────────────────────
const SummaryCards = memo(function SummaryCards({ transactions, bills, viewMonth }) {
  const { income, expense, billsTotal } = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    let inc = 0, exp = 0;
    transactions.forEach(tx => {
      const d = new Date(tx.date + 'T00:00:00');
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      if (tx.type === 'income') inc += tx.amount;
      else exp += tx.amount;
    });
    const bt = bills.reduce((s, b) => s + (b.amount || 0), 0);
    return { income: inc, expense: exp, billsTotal: bt };
  }, [transactions, bills, viewMonth]);

  const cards = [
    { label: 'Income', value: income, color: '#00d4aa' },
    { label: 'Expenses', value: expense, color: '#ff5e6c' },
    { label: 'Bills Due', value: billsTotal, color: '#f5c842' },
  ];

  return (
    <div className="calendar-summary">
      {cards.map(c => (
        <div key={c.label} className="calendar-summary-card">
          <div className="calendar-summary-card__label">{c.label}</div>
          <div className="calendar-summary-card__value" style={{ color: c.color }}>₹{fmt(c.value)}</div>
        </div>
      ))}
    </div>
  );
});

// ── CalendarPage ──────────────────────────────────────────────────────────────
export default function CalendarPage({ transactions = [] }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [viewType, setViewType] = useState('month');
  const [selectedDay, setSelectedDay] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    billApi.getAll()
      .then(({ data }) => setBills(data.bills || data || []))
      .catch(() => setBills([]))
      .finally(() => setLoading(false));
  }, []);

  // Build dayMap: "YYYY-MM-DD" → { income, expense, bills[], subscriptions[], txList[] }
  const dayMap = useMemo(() => {
    const map = new Map();

    const getOrCreate = (key) => {
      if (!map.has(key)) map.set(key, { income: 0, expense: 0, bills: [], subscriptions: [], txList: [] });
      return map.get(key);
    };

    transactions.forEach(tx => {
      const key = tx.date.slice(0, 10);
      const d = getOrCreate(key);
      if (tx.type === 'income') d.income += tx.amount;
      else d.expense += tx.amount;
      d.txList.push(tx);
    });

    bills.forEach(bill => {
      // dueDate from API may be a day-of-month integer or a full ISO date
      let key = '';
      if (bill.dueDate) {
        if (typeof bill.dueDate === 'string' && bill.dueDate.includes('-')) {
          key = bill.dueDate.slice(0, 10);
        } else {
          // day-of-month number — place it on that day of the current view month
          const day = parseInt(bill.dueDate, 10);
          if (day >= 1 && day <= 31) {
            const y = viewMonth.getFullYear();
            const m = String(viewMonth.getMonth() + 1).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            key = `${y}-${m}-${d}`;
          }
        }
      } else if (bill.nextDue) {
        key = String(bill.nextDue).slice(0, 10);
      }
      if (!key) return;
      const d = getOrCreate(key);
      if (bill.type === 'subscription' || bill.recurring || bill.category === 'Subscription' || bill.category === 'Streaming') {
        d.subscriptions.push(bill);
      } else {
        d.bills.push(bill);
      }
    });

    return map;
  }, [transactions, bills, viewMonth]);

  // Build grid of days for month view
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: new Date(year, month, 1 - (firstDay - i)), currentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), currentMonth: true });
    }
    while (days.length % 7 !== 0) {
      const extra = days.length - daysInMonth - firstDay + 1;
      days.push({ date: new Date(year, month + 1, extra), currentMonth: false });
    }
    return days;
  }, [viewMonth]);

  // Build 7 days for week view (current week containing today)
  const weekDays = useMemo(() => {
    const ref = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sunday = new Date(ref);
    sunday.setDate(ref.getDate() - ref.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return { date: d, currentMonth: d.getMonth() === viewMonth.getMonth() };
    });
  // viewMonth intentionally not in deps — week view always shows the current real week
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevMonth = () => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday   = () => setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));

  const handleCellClick = (key) => setSelectedDay(key);
  const closeModal = () => setSelectedDay(null);

  const displayDays = viewType === 'week' ? weekDays : calendarDays;

  if (loading) {
    return (
      <div className="calendar-page">
        <div style={{ color: T.text.tertiary, fontSize: 14, textAlign: 'center', paddingTop: 60 }}>Loading calendar…</div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
          <div className="calendar-month-label">{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</div>
          <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
          <button className="calendar-nav-btn" onClick={goToday} style={{ fontSize: 12, opacity: 0.8 }}>Today</button>
        </div>
        <div className="calendar-view-toggle">
          <button className={`calendar-view-btn${viewType === 'month' ? ' active' : ''}`} onClick={() => setViewType('month')}>Month</button>
          <button className={`calendar-view-btn${viewType === 'week' ? ' active' : ''}`} onClick={() => setViewType('week')}>Week</button>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards transactions={transactions} bills={bills} viewMonth={viewMonth} />

      {/* Weekday labels */}
      <div className="calendar-grid">
        {WEEKDAYS.map(d => <div key={d} className="calendar-weekday">{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div className="calendar-grid" style={{ marginTop: -8 }}>
        {displayDays.map((dayObj, i) => {
          const key = toKey(dayObj.date);
          return (
            <CalendarCell
              key={key + i}
              dayObj={dayObj}
              dayData={dayMap.get(key)}
              isToday={key === todayKey}
              onClick={handleCellClick}
            />
          );
        })}
      </div>

      {/* Cash flow chart */}
      <CashFlowBar transactions={transactions} viewMonth={viewMonth} />

      {/* Day modal */}
      {selectedDay && (
        <DayModal
          dayKey={selectedDay}
          dayData={dayMap.get(selectedDay)}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
