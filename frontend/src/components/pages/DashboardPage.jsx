'use client';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { T, CAT_COLORS } from '@/lib/tokens';
import { fmt, fmtPct } from '@/lib/utils';
import { niceScale, chartDimensions, DEFAULT_PAD, clampTooltip } from '@/lib/charts/engine';
import { calcHealthScore, detectAnomalies, calcBudgets, predictNextMonth } from '@/lib/financeEngine';


/* ═══════════════════════════════════════════
   useContainerWidth — debounced, SSR-safe
   ═══════════════════════════════════════════ */
function useContainerWidth(ref) {
  const [w, setW] = useState(400);
  useEffect(() => {
    if (typeof window === 'undefined' || !ref.current) return;
    let timer;
    const ro = new ResizeObserver(([entry]) => {
      clearTimeout(timer);
      timer = setTimeout(() => setW(entry.contentRect.width), 80);
    });
    ro.observe(ref.current);
    return () => { ro.disconnect(); clearTimeout(timer); };
  }, [ref]);
  return w;
}

/* ═══════════════════════════════════════════
   INTERACTIVE DONUT CHART
   ═══════════════════════════════════════════ */
function DonutChart({ data, currency }) {
  const [hov, setHov] = useState(null);
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  if (!total) return (
    <div className="empty-state">
      <div className="empty-icon">◈</div>
      <div className="empty-title">No expenses yet</div>
      <div className="empty-desc">Add transactions to see your spending breakdown</div>
    </div>
  );

  const SIZE = 190, cx = SIZE / 2, cy = SIZE / 2, r = 68, stroke = 34;
  const circ = 2 * Math.PI * r;
  const GAP = 0;
  let offset = 0;
  const hovItem = hov !== null ? data[hov] : null;

  return (
    <div className="chart-enter" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 20 }}>

      {/* LEFT — Bold donut ring */}
      <div style={{ position: 'relative', flexShrink: 0, width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {data.map((d, i) => {
            const pct = d.value / total;
            const dash = Math.max(0, pct * circ - GAP);
            const gap = circ - dash;
            const o = offset;
            offset += pct * circ;
            const isH = hov === i;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={d.color}
                strokeWidth={isH ? stroke + 7 : stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-o}
                strokeLinecap="butt"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: 'stroke-width .25s ease, opacity .2s ease, filter .2s ease',
                  opacity: hov !== null && !isH ? 0.18 : 1,
                  cursor: 'pointer',
                  filter: isH ? `drop-shadow(0 0 14px ${d.color}99)` : 'none',
                }}
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)} />
            );
          })}
        </svg>
        {/* Center label */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {hovItem ? (
            <>
              <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: hovItem.color, lineHeight: 1 }}>
                {(hovItem.value / total * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 9.5, color: hovItem.color, fontWeight: 600, marginTop: 3 }}>{hovItem.label}</div>
              <div className="mono" style={{ fontSize: 10, color: T.text.tertiary, marginTop: 2 }}>{fmt(hovItem.value, currency)}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 9, color: T.text.tertiary, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 3 }}>Total Spent</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: T.text.primary, lineHeight: 1 }}>{fmt(total, currency)}</div>
              <div style={{ fontSize: 9, color: T.text.tertiary, marginTop: 3 }}>{data.length} categories</div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT — Legend list with mini bars */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
        {data.map((d, i) => {
          const pct = total > 0 ? (d.value / total * 100) : 0;
          const isH = hov === i;
          return (
            <div key={d.label}
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{
                cursor: 'pointer',
                opacity: hov !== null && !isH ? 0.3 : 1,
                transition: 'opacity .15s',
                padding: '5px 8px',
                borderRadius: 8,
                background: isH ? `${d.color}0d` : 'transparent',
                border: `1px solid ${isH ? d.color + '30' : 'transparent'}`,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: T.text.secondary, fontWeight: 500 }}>{d.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span className="mono" style={{ fontSize: 10.5, color: T.text.primary, fontWeight: 600 }}>{fmt(d.value, currency)}</span>
                  <span style={{ fontSize: 9.5, color: d.color, fontWeight: 700, minWidth: 26, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: d.color, transition: 'width .4s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   INTERACTIVE LINE CHART — auto-scaled
   ═══════════════════════════════════════════ */
function LineChart({ data, currency }) {
  const containerRef = useRef(null);
  const cw = useContainerWidth(containerRef);
  const [hov, setHov] = useState(null);

  const { max: yMax, ticks: yTicks } = useMemo(() => {
    const m = Math.max(...data.flatMap((d) => [d.income, d.expenses]));
    return niceScale(m);
  }, [data]);

  const pad = DEFAULT_PAD;
  const { w, h, chartW, chartH } = useMemo(() => chartDimensions(cw, pad), [cw, pad]);

  const x = useCallback((i) => pad.l + i / (data.length - 1) * chartW, [pad.l, chartW, data.length]);
  const y = useCallback((v) => pad.t + chartH - v / yMax * chartH, [pad.t, chartH, yMax]);
  const makePath = useCallback((vals) => vals.map((v, i) => `${x(i)},${y(v)}`).join(' '), [x, y]);

  const paths = useMemo(() => ({
    income: makePath(data.map((d) => d.income)),
    expense: makePath(data.map((d) => d.expenses))
  }), [data, makePath]);

  const tooltip = useMemo(() => {
    if (hov === null) return null;
    const pos = clampTooltip(x(hov), y(data[hov].income) - 68, w);
    return { ...pos, d: data[hov] };
  }, [hov, data, x, y, w]);

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }} className="chart-enter">
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={pad.l} x2={w - pad.r} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,.04)" strokeWidth="1" />
            <text x={pad.l - 6} y={y(tick) + 3.5} textAnchor="end" fill={T.text.tertiary} fontSize="8" fontFamily="'Roboto Mono',monospace">{fmt(tick, currency)}</text>
          </g>
        ))}
        {data.map((d, i) => <text key={d.month} x={x(i)} y={h - 6} textAnchor="middle" fill={T.text.tertiary} fontSize="9">{d.month}</text>)}
        <defs>
          <linearGradient id="lgI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.teal} stopOpacity=".2" /><stop offset="100%" stopColor={T.accent.teal} stopOpacity="0" /></linearGradient>
          <linearGradient id="lgE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.orange} stopOpacity=".14" /><stop offset="100%" stopColor={T.accent.orange} stopOpacity="0" /></linearGradient>
        </defs>
        <polygon points={`${x(0)},${y(0)} ${paths.income} ${x(data.length - 1)},${y(0)}`} fill="url(#lgI)" />
        <polygon points={`${x(0)},${y(0)} ${paths.expense} ${x(data.length - 1)},${y(0)}`} fill="url(#lgE)" />
        <polyline points={paths.income} fill="none" stroke={T.accent.teal} strokeWidth="2.5" strokeLinejoin="round" />
        <polyline points={paths.expense} fill="none" stroke={T.accent.orange} strokeWidth="2.5" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={`h-${i}`} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'crosshair' }}>
            <rect x={x(i) - chartW / data.length / 2} y={pad.t} width={chartW / data.length} height={chartH} fill="transparent" />
            {hov === i && <line x1={x(i)} x2={x(i)} y1={pad.t} y2={pad.t + chartH} stroke="rgba(255,255,255,.1)" strokeWidth="1" strokeDasharray="4 3" />}
            <circle cx={x(i)} cy={y(d.income)} r={hov === i ? 5 : 3.5} fill={hov === i ? T.accent.teal : T.bg.base} stroke={T.accent.teal} strokeWidth="2" style={{ transition: 'r .12s' }} />
            <circle cx={x(i)} cy={y(d.expenses)} r={hov === i ? 5 : 3.5} fill={hov === i ? T.accent.orange : T.bg.base} stroke={T.accent.orange} strokeWidth="2" style={{ transition: 'r .12s' }} />
          </g>
        ))}
      </svg>
      {tooltip && (
        <div style={{ position: 'absolute', left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)', background: T.bg.elevated, border: `1px solid ${T.border.medium}`, borderRadius: 10, padding: '8px 13px', pointerEvents: 'none', zIndex: 10, minWidth: 115, boxShadow: '0 8px 28px rgba(0,0,0,.5)' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.text.tertiary, marginBottom: 4 }}>{tooltip.d.month}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, marginBottom: 1.5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.accent.teal }} />
            <span style={{ color: T.text.secondary }}>Inc:</span>
            <span className="mono" style={{ fontWeight: 700, color: T.accent.teal }}>{fmt(tooltip.d.income, currency)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.accent.orange }} />
            <span style={{ color: T.text.secondary }}>Exp:</span>
            <span className="mono" style={{ fontWeight: 700, color: T.accent.orange }}>{fmt(tooltip.d.expenses, currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   INTERACTIVE BAR CHART — auto-scaled
   ═══════════════════════════════════════════ */
function BarChart({ data, currency }) {
  const containerRef = useRef(null);
  const cw = useContainerWidth(containerRef);
  const [hov, setHov] = useState(null);

  const padB = { ...DEFAULT_PAD, b: 34 };
  const { w, h, chartW, chartH } = useMemo(() => chartDimensions(cw, padB), [cw, padB]);
  const { max: yMax, ticks: yTicks } = useMemo(() => niceScale(Math.max(...data.map((d) => d.value))), [data]);
  const barW = useMemo(() => Math.min(40, chartW / data.length * 0.55), [chartW, data.length]);

  if (!data.length) return <div className="empty-state"><div className="empty-icon">◇</div><div className="empty-title">No spending data</div></div>;

  return (
    <div ref={containerRef} style={{ width: '100%' }} className="chart-enter">
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={padB.l} x2={w - padB.r} y1={padB.t + chartH - tick / yMax * chartH} y2={padB.t + chartH - tick / yMax * chartH} stroke="rgba(255,255,255,.04)" strokeWidth="1" />
            <text x={padB.l - 5} y={padB.t + chartH - tick / yMax * chartH + 3.5} textAnchor="end" fill={T.text.tertiary} fontSize="8" fontFamily="'Roboto Mono',monospace">{fmt(tick, currency)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const bx = padB.l + (i + 0.5) * (chartW / data.length) - barW / 2;
          const bh = d.value / yMax * chartH;
          const by = padB.t + chartH - bh;
          const isH = hov === i;
          return (
            <g key={d.label} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
              <defs><linearGradient id={`b${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={d.color} stopOpacity="1" /><stop offset="100%" stopColor={d.color} stopOpacity=".45" /></linearGradient></defs>
              <rect x={bx} y={by} width={barW} height={bh} rx={5} fill={`url(#b${i})`}
                style={{ transition: 'all .15s', filter: isH ? `drop-shadow(0 3px 10px ${d.color}55)` : 'none', opacity: hov !== null && !isH ? 0.3 : 1 }} />
              {isH && <text x={bx + barW / 2} y={by - 5} textAnchor="middle" fill={d.color} fontSize="9" fontWeight="700" fontFamily="'Roboto Mono',monospace">{fmt(d.value, currency)}</text>}
              <text x={bx + barW / 2} y={h - 8} textAnchor="middle" fill={isH ? T.text.primary : T.text.tertiary} fontSize="9" style={{ transition: 'fill .12s' }}>{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HEALTH SCORE RING
   ═══════════════════════════════════════════ */
function HealthRing({ score, color, grade, factors }) {
  const r = 52, circ = 2 * Math.PI * r;
  const dashLen = score / 100 * circ;
  return (
    <div>
      <div className="health-ring-wrap" style={{ width: 130, height: 130, margin: '0 auto 14px' }}>
        <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%' }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="8" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dashLen} ${circ - dashLen}`} strokeDashoffset={circ * 0.25} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray .8s cubic-bezier(.16,1,.3,1)' }} />
        </svg>
        <div className="health-ring-label">
          <div className="health-ring-score" style={{ color }}>{score}</div>
          <div className="health-ring-grade" style={{ color }}>{grade}</div>
        </div>
      </div>
      {factors.map((f) => (
        <div key={f.label} className="factor-row">
          <span className="factor-label">{f.label}</span>
          <div className="factor-track"><div className="factor-fill" style={{ width: `${f.score / f.max * 100}%`, background: color }} /></div>
          <span className="factor-pts">{f.score}/{f.max}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD HEADER
   ═══════════════════════════════════════════ */
function DashboardHeader({ savings, userName }) {
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isHealthy = savings >= 0;

  return (
    <div className="dash-page-header">
      <div>
        <div className="dash-greeting">{greeting}, {userName || 'User'} 👋</div>
        <h1 className="page-title" style={{ marginTop: 4 }}>Dashboard</h1>
        <div className="dash-date">{dateStr}</div>
      </div>
      <div className="dash-header-badge" style={{ borderColor: isHealthy ? 'rgba(0,212,170,.2)' : 'rgba(255,94,108,.2)', background: isHealthy ? 'rgba(0,212,170,.06)' : 'rgba(255,94,108,.06)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: isHealthy ? T.accent.teal : T.accent.danger }}>
          {isHealthy ? '◈ Finances On Track' : '⚠ Review Spending'}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STAT CARD WITH ICON
   ═══════════════════════════════════════════ */
function StatCard({ label, value, sub, subColor, icon, accentColor, trend }) {
  return (
    <div className="dash-stat">
      <div className="dash-stat-header">
        <div className="dash-stat-label">{label}</div>
        <div className="dash-stat-icon" style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}28`, color: accentColor }}>{icon}</div>
      </div>
      <div className="dash-stat-val" style={{ color: accentColor }}>{value}</div>
      {sub && <div className="dash-stat-sub" style={{ color: subColor || 'var(--stat-label)' }}>{sub}</div>}
      {trend != null && (
        <div className="dash-stat-bar-track">
          <div className="dash-stat-bar-fill" style={{ width: `${Math.min(Math.abs(trend), 100)}%`, background: `linear-gradient(90deg, ${accentColor}70, ${accentColor})` }} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════ */
export default function DashboardPage({ transactions, currency, navigate, userName }) {
  /* —— Current month filter —— */
  const thisMonthTx = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [transactions]);

  /* —— Monthly stat card values (current month only) —— */
  const income = useMemo(() => thisMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0), [thisMonthTx]);
  const expenses = useMemo(() => thisMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [thisMonthTx]);
  const savings = income - expenses;
  const savingsRate = income > 0 ? savings / income * 100 : 0;

  /* —— Expense breakdown uses current month spending —— */
  const catSpend = useMemo(() => {
    const m = {};
    thisMonthTx.filter((t) => t.type === 'expense').forEach((t) => { m[t.category] = (m[t.category] || 0) + t.amount; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [thisMonthTx]);

  const donutData = useMemo(() => catSpend.map(([cat, val]) => ({ label: cat, value: val, color: CAT_COLORS[cat] || T.accent.purple })), [catSpend]);
  const barData = useMemo(() => catSpend.map(([cat, val]) => ({ label: cat, value: val, color: CAT_COLORS[cat] || T.accent.purple })), [catSpend]);

  const recentTx = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6),
    [transactions]);

  const health = useMemo(() => calcHealthScore(transactions), [transactions]);
  const anomalies = useMemo(() => detectAnomalies(transactions), [transactions]);
  const budgets = useMemo(() => calcBudgets(transactions), [transactions]);

  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('default', { month: 'short' }) });
    }
    return months.map(({ year, month, label }) => {
      const inMonth = transactions.filter((t) => {
        const td = new Date(t.date);
        return td.getFullYear() === year && td.getMonth() === month;
      });
      return {
        month: label,
        income: inMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expenses: inMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [transactions]);

  const prediction = useMemo(() => predictNextMonth(monthlyData), [monthlyData]);

  const anomalyColors = { info: T.accent.blue, warning: T.accent.gold, danger: T.accent.danger };

  if (transactions.length === 0) {
    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <DashboardHeader income={0} expenses={0} savings={0} />
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>◈</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.text.primary, marginBottom: 8, fontFamily: "'Fraunces',serif" }}>Welcome to FinTracker</div>
          <div style={{ fontSize: 13, color: T.text.tertiary, maxWidth: 340, margin: '0 auto 22px', lineHeight: 1.7 }}>
            Start by adding your first transaction to unlock your financial dashboard.
          </div>
          <button className="primary-btn" onClick={() => navigate && navigate('transactions')}>+ Add First Transaction</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* —— Page Header —— */}
      <DashboardHeader income={income} expenses={expenses} savings={savings} userName={userName} />

      {/* —— Row 1: Financial Summary Cards —— */}
      <div className="dash-grid dash-grid-4">
        <StatCard
          label="Net Savings"
          value={`${savings >= 0 ? '+' : ''}${fmt(savings, currency)}`}
          sub={`${fmtPct(savingsRate)} of income saved`}
          subColor={savings >= 0 ? T.accent.teal : T.accent.danger}
          icon={savings >= 0 ? '◈' : '▼'}
          accentColor={savings >= 0 ? T.accent.teal : T.accent.danger}
          trend={Math.abs(savingsRate)}
        />
        <StatCard
          label="Monthly Income"
          value={fmt(income, currency)}
          sub="Total earnings this period"
          icon="◎"
          accentColor={T.accent.teal}
          trend={70}
        />
        <StatCard
          label="Monthly Expenses"
          value={fmt(expenses, currency)}
          sub={income > 0 ? `${(expenses / income * 100).toFixed(0)}% of income` : 'Track your spending'}
          subColor={expenses / income > 0.8 ? T.accent.danger : T.text.tertiary}
          icon="◇"
          accentColor={T.text.primary}
          trend={income > 0 ? (expenses / income * 100) : 0}
        />
        <div className="prediction-card">
          <div className="dash-stat-header">
            <div className="prediction-label" style={{ marginBottom: 0 }}>◈ Next Month Forecast</div>
            <div className="dash-stat-icon" style={{ background: 'rgba(77,159,255,0.15)', border: '1px solid rgba(77,159,255,0.25)', color: T.accent.blue }}>◎</div>
          </div>
          <div className="prediction-val">{fmt(prediction.predictedExpense, currency)}</div>
          {(() => {
            const trendColor = prediction.trend === 'up' ? T.accent.danger : prediction.trend === 'down' ? T.accent.teal : 'var(--stat-label)';
            const trendIcon = prediction.trend === 'up' ? '▲' : prediction.trend === 'down' ? '▼' : '→';
            return (
              <>
                <div className="dash-stat-sub" style={{ color: trendColor }}>
                  {trendIcon} {Math.abs(prediction.pctChange)}% vs last month
                </div>
                <div className="dash-stat-bar-track">
                  <div className="dash-stat-bar-fill" style={{ width: `${Math.min(Math.abs(prediction.pctChange), 100)}%`, background: `linear-gradient(90deg, ${trendColor}70, ${trendColor})` }} />
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* —— Quick Actions —— */}
      {navigate && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary-btn" style={{ fontSize: 12 }} onClick={() => navigate('transactions')}>+ Add Income</button>
          <button className="secondary-btn" style={{ fontSize: 12 }} onClick={() => navigate('transactions')}>+ Add Expense</button>
        </div>
      )}

      {/* —— Row 2: Health Score + Donut —— */}
      <div className="dash-grid dash-grid-2">
        <div className="glass-card" style={{ padding: '22px 20px' }}>
          <div className="card-title">Financial Health Score</div>
          <HealthRing {...health} />
        </div>
        <div className="glass-card" style={{ padding: '22px 20px' }}>
          <div className="card-title">Expense Breakdown</div>
          <DonutChart data={donutData} currency={currency} />
        </div>
      </div>

      {/* —— Row 3: Line Chart (full width) —— */}
      <div className="glass-card" style={{ padding: '22px 20px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Income vs Expenses — 6 Month Trend</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 3, borderRadius: 2, background: T.accent.teal }} /><span style={{ color: T.text.tertiary }}>Income</span></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 3, borderRadius: 2, background: T.accent.orange }} /><span style={{ color: T.text.tertiary }}>Expenses</span></span>
          </div>
        </div>
        <LineChart data={monthlyData} currency={currency} />
      </div>

      {/* —— Row 4: Bar Chart + Budget Progress —— */}
      <div className="dash-grid dash-grid-2-1">
        <div className="glass-card" style={{ padding: '22px 20px', overflow: 'hidden' }}>
          <div className="card-title">Category Spending</div>
          <BarChart data={barData} currency={currency} />
        </div>
        <div className="glass-card" style={{ padding: '22px 20px' }}>
          <div className="card-title">Budget Progress</div>
          {budgets.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-icon">◍</div>
              <div className="empty-desc">Add expenses to see budget analysis</div>
            </div>
          ) : budgets.map((b) => {
            const col = b.status === 'over' ? T.accent.danger : b.status === 'warning' ? T.accent.gold : T.accent.teal;
            const statusLabel = b.status === 'over' ? 'Over' : b.status === 'warning' ? 'Near limit' : 'On track';
            return (
              <div key={b.category} className="budget-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span className="budget-cat">{b.category}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10.5, color: T.text.tertiary }}>
                      {fmt(b.spent, currency)} / {fmt(b.budget, currency)}
                    </span>
                    <span className="budget-pct" style={{ color: col, minWidth: 36, textAlign: 'right' }}>
                      {Math.round(b.pct)}%
                    </span>
                  </div>
                </div>
                <div className="budget-track">
                  <div className="budget-fill" style={{ width: `${Math.min(b.pct, 100)}%`, background: col, transition: 'width .6s cubic-bezier(.16,1,.3,1)' }} />
                </div>
                <div style={{ fontSize: 10, color: col, marginTop: 3, textAlign: 'right', opacity: 0.8 }}>{statusLabel}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* —— Row 5: AI Insights + Recent Activity —— */}
      <div className="dash-grid dash-grid-2">
        <div className="glass-card" style={{ padding: '22px 20px' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: T.accent.purple }}>◈</span> AI Insights
          </div>
          {anomalies.length === 0 ? (
            <div style={{ padding: '16px 0', fontSize: 12.5, color: T.text.tertiary, lineHeight: 1.7 }}>
              <span style={{ color: T.accent.teal, marginRight: 6 }}>✓</span>
              No anomalies detected. Your spending looks healthy!
            </div>
          ) : anomalies.map((a, i) => (
            <div key={i} className="anomaly-card">
              <div className="anomaly-icon" style={{ background: `${anomalyColors[a.severity]}15`, color: anomalyColors[a.severity] }}>{a.icon}</div>
              <div>
                <div className="anomaly-msg">{a.message}</div>
                <div className="anomaly-severity" style={{ color: anomalyColors[a.severity] }}>{a.severity}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card" style={{ padding: '22px 20px' }}>
          <div className="card-title">Recent Activity</div>
          {recentTx.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-icon">↔</div>
              <div className="empty-title">No transactions</div>
              <div className="empty-desc">Add your first transaction to get started</div>
            </div>
          ) : recentTx.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${T.border.subtle}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</div>
                <div style={{ fontSize: 10, color: T.text.tertiary, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_COLORS[t.category] || T.accent.purple, flexShrink: 0 }} />
                  {t.category} · {t.date}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: t.type === 'income' ? T.accent.teal : T.accent.danger, flexShrink: 0, marginLeft: 12 }}>
                {t.type === 'income' ? '+' : '–'}{fmt(t.amount, currency)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
