'use client';
import { useMemo, useState, memo } from 'react';
import { T, CAT_COLORS } from '@/lib/tokens';
import { fmt, fmtPct } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// ═══════════════════════════════════════════
// DONUT CHART — spending allocation
// ═══════════════════════════════════════════

const SpendingDonut = memo(({ data, total, currency }) => {
  const [hover, setHover] = useState(null);

  if (data.length === 0 || total === 0) return null;

  // Pre-compute angles so no mutation happens inside JSX map
  const angles = data.reduce((acc, [, val]) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].end : 0;
    const end = prev + (val / total) * 360;
    return [...acc, { start: prev, end }];
  }, []);

  return (
    <div className="insights-donut-section">
      <div style={{ position: 'relative' }}>
        <svg viewBox="0 0 100 100" className="insights-donut-svg">
          {data.map(([cat], i) => {
            const startAngle = angles[i].start;
            const endAngle = angles[i].end;
            const x1 = 50 + 40 * Math.cos(startAngle * Math.PI / 180);
            const y1 = 50 + 40 * Math.sin(startAngle * Math.PI / 180);
            const x2 = 50 + 40 * Math.cos(endAngle * Math.PI / 180);
            const y2 = 50 + 40 * Math.sin(endAngle * Math.PI / 180);
            const large = endAngle - startAngle > 180 ? 1 : 0;
            const d = `M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`;
            const color = CAT_COLORS[cat] || T.accent.purple;
            return (
              <path
                key={cat}
                d={d}
                fill={color}
                stroke={T.bg.base}
                strokeWidth="1"
                opacity={hover === null || hover === i ? 1 : 0.35}
                style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
          <circle cx="50" cy="50" r="26" fill={T.bg.base} />
        </svg>
        {hover !== null && data[hover] && (
          <div className="insights-donut-center">
            <div style={{ fontSize: 10, color: T.text.tertiary, fontWeight: 600 }}>{data[hover][0]}</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: CAT_COLORS[data[hover][0]] || T.accent.purple }}>
              {(data[hover][1] / total * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>
      <div className="insights-donut-legend">
        {data.map(([cat, amt], i) => (
          <div
            key={cat}
            className="insights-legend-item"
            style={{ opacity: hover === null || hover === i ? 1 : 0.4 }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="insights-legend-dot" style={{ background: CAT_COLORS[cat] || T.accent.purple }} />
            <span className="insights-legend-label">{cat}</span>
            <span className="insights-legend-value mono">{fmt(amt, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════
// TIP CARD
// ═══════════════════════════════════════════

const TIP_ICONS = {
  Investment: '📈',
  Budget: '💰',
  Safety: '🛡️',
  Tax: '🧾',
};

const TipCard = memo(({ text, tag }) => {
  const tagColor = tag === 'Investment' ? T.accent.teal
    : tag === 'Budget' ? T.accent.gold
    : tag === 'Tax' ? T.accent.purple
    : T.accent.blue;
  return (
    <div className="insights-tip-card">
      <div className="insights-tip-icon">{TIP_ICONS[tag] || '💡'}</div>
      <div className="insights-tip-body">
        <div className="insights-tip-text">{text}</div>
        <span className="insights-tip-tag" style={{ background: `${tagColor}15`, color: tagColor }}>{tag}</span>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════
// CATEGORY BAR
// ═══════════════════════════════════════════

const CategoryBar = memo(({ name, amount, total, currency }) => {
  const [hovered, setHovered] = useState(false);
  const pct = total > 0 ? amount / total * 100 : 0;
  const color = CAT_COLORS[name] || T.accent.purple;

  return (
    <div
      className="insights-cat-item"
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="insights-cat-header">
        <div className="insights-cat-name">
          <span className="insights-cat-dot" style={{ background: color }} />
          {name}
        </div>
        <div className="insights-cat-values">
          <span className="mono" style={{ color, fontWeight: 600 }}>{fmt(amount, currency)}</span>
          <span style={{ color: T.text.tertiary, fontSize: 10.5 }}>{pct.toFixed(1)}%</span>
        </div>
      </div>
      <div className="insights-cat-bar-track">
        <div className="insights-cat-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {hovered && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
          background: T.bg.elevated, border: `1px solid ${T.border.medium}`,
          borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600,
          color: T.text.primary, pointerEvents: 'none', whiteSpace: 'nowrap',
          zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,.4)',
        }}>
          {fmt(amount, currency)} · {pct.toFixed(1)}%
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════
// BUDGET TARGETS (50/30/20 rule)
// ═══════════════════════════════════════════

const BUDGET_TARGETS = {
  Rent: 30, Food: 15, Travel: 8, Shopping: 8,
  Entertainment: 5, Utilities: 5, Health: 5,
  Investment: 15, Others: 4,
};

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

export default function InsightsPage({ transactions, currency }) {
  const [range, setRange] = useState('6M');

  const filteredTransactions = useMemo(() => {
    if (range === 'All') return transactions;
    const months = range === '1M' ? 1 : range === '3M' ? 3 : 6;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return transactions.filter((t) => new Date(t.date) >= cutoff);
  }, [transactions, range]);

  const income = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [filteredTransactions],
  );
  const expenses = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [filteredTransactions],
  );
  const savings = income - expenses;
  const savingsRate = income > 0 ? savings / income * 100 : 0;

  const cats = useMemo(() => {
    const catSpend = {};
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => { catSpend[t.category] = (catSpend[t.category] || 0) + t.amount; });
    return Object.entries(catSpend).sort((a, b) => b[1] - a[1]);
  }, [filteredTransactions]);

  const topCat = cats[0];

  const monthlyData = useMemo(() => {
    const now = new Date();
    const numMonths = range === '1M' ? 1 : range === '3M' ? 3 : 6;
    const months = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('default', { month: 'short' }) });
    }
    return months.map(({ year, month, label }) => {
      const inMonth = filteredTransactions.filter((t) => {
        const td = new Date(t.date);
        return td.getFullYear() === year && td.getMonth() === month;
      });
      return {
        month: label,
        income: inMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expenses: inMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [filteredTransactions, range]);

  const { spendTrend } = useMemo(() => {
    // Exclude current (potentially incomplete) month from comparison base
    const pastMonths = monthlyData.slice(0, -1).filter((m) => m.expenses > 0);
    const avg = pastMonths.length > 0
      ? pastMonths.reduce((s, m) => s + m.expenses, 0) / pastMonths.length
      : 0;
    const cur = monthlyData[monthlyData.length - 1];
    const trend = avg > 0 && cur ? (cur.expenses - avg) / avg * 100 : 0;
    return { spendTrend: trend };
  }, [monthlyData]);

  const statCards = useMemo(() => [
    {
      title: 'Savings Rate',
      value: fmtPct(savingsRate).replace('+', ''),
      desc: savingsRate > 20 ? "Excellent! You're saving well above average." : 'Try to push your savings rate above 20%.',
      color: savingsRate > 20 ? T.accent.teal : T.accent.gold,
      icon: '💰',
    },
    {
      title: 'Top Expense',
      value: topCat ? topCat[0] : 'N/A',
      desc: topCat ? `${fmt(topCat[1], currency)} spent — ${(topCat[1] / expenses * 100).toFixed(0)}% of total` : '',
      color: T.accent.orange,
      icon: '💳',
    },
    {
      title: 'Spending Trend',
      value: fmtPct(spendTrend),
      desc: spendTrend > 0 ? 'Spending is above your monthly average' : 'Below average — great control!',
      color: spendTrend > 0 ? T.accent.danger : T.accent.teal,
      icon: '📊',
    },
    {
      title: 'Monthly Surplus',
      value: fmt(savings, currency),
      desc: `${fmt(income, currency)} earned — ${fmt(expenses, currency)} spent`,
      color: savings > 0 ? T.accent.teal : T.accent.danger,
      icon: '✅',
    },
  ], [savingsRate, topCat, spendTrend, savings, income, expenses, currency]);

  const tips = useMemo(() => {
    const result = [];
    const month = new Date().getMonth();

    if (savingsRate <= 0) {
      result.push({ text: 'Your expenses exceed your income this period. Review and cut the top spending category immediately.', tag: 'Investment' });
    } else if (savingsRate < 10) {
      result.push({ text: `Savings rate is only ${savingsRate.toFixed(0)}% — below the recommended 20%. Reduce discretionary spending to build a buffer.`, tag: 'Investment' });
    } else if (savingsRate < 20) {
      result.push({ text: `Savings rate is ${savingsRate.toFixed(0)}%. Redirect surplus to a SIP or recurring deposit to hit the 20% target.`, tag: 'Investment' });
    } else {
      result.push({ text: `Strong ${savingsRate.toFixed(0)}% savings rate! Consider investing the surplus in index funds or ELSS for long-term compounding.`, tag: 'Investment' });
    }

    if (topCat) {
      const topPct = expenses > 0 ? (topCat[1] / expenses * 100).toFixed(0) : 0;
      if (topPct > 40) {
        result.push({ text: `${topCat[0]} is consuming ${topPct}% of your total expenses — unusually high. Set a monthly cap for this category.`, tag: 'Budget' });
      } else {
        result.push({ text: `${topCat[0]} is your biggest spend at ${fmt(topCat[1], currency)} (${topPct}%). Track it weekly to stay within budget.`, tag: 'Budget' });
      }
    }

    if (expenses > 0) {
      const target = expenses * 6;
      result.push({ text: `Emergency fund target: ${fmt(target, currency)} (6 months of expenses). Keep this in a liquid fund or high-interest savings account.`, tag: 'Safety' });
    } else {
      result.push({ text: 'Start building an emergency fund equal to 6 months of living expenses for financial security.', tag: 'Safety' });
    }

    if (month === 0 || month === 1 || month === 2) {
      result.push({ text: 'Tax-saving deadline is March 31. Maximise your ₹1.5L limit under Section 80C via ELSS, PPF, or NPS.', tag: 'Tax' });
    } else if (month >= 3 && month <= 6) {
      result.push({ text: 'New financial year started. File advance tax if your tax liability exceeds ₹10,000 to avoid penalties.', tag: 'Tax' });
    } else if (month >= 7 && month <= 9) {
      result.push({ text: 'Mid-year check: review your Form 26AS and ensure TDS credits match your filings.', tag: 'Tax' });
    } else {
      result.push({ text: 'Year-end approaching. Plan tax-saving investments now to avoid a last-minute rush in Q4.', tag: 'Tax' });
    }

    return result;
  }, [savingsRate, topCat, expenses, currency]);

  // Budget scorecard
  const budgetRows = useMemo(() => {
    if (income === 0) return [];
    return cats.map(([cat, amt]) => {
      const actualPct = amt / income * 100;
      const targetPct = BUDGET_TARGETS[cat] ?? 10;
      const status = actualPct <= targetPct ? 'ok' : actualPct <= targetPct * 1.3 ? 'warn' : 'over';
      return { cat, amt, actualPct, targetPct, status };
    });
  }, [cats, income]);

  // Anomaly detection: expenses >2× per-category average (only if category has ≥2 txns)
  const anomalies = useMemo(() => {
    const exp = filteredTransactions.filter((t) => t.type === 'expense');
    const catSum = {}, catCnt = {};
    exp.forEach((t) => {
      catSum[t.category] = (catSum[t.category] || 0) + t.amount;
      catCnt[t.category] = (catCnt[t.category] || 0) + 1;
    });
    const catAvg = Object.fromEntries(
      Object.keys(catSum).map((k) => [k, catSum[k] / catCnt[k]]),
    );
    return exp
      .filter((t) => catAvg[t.category] > 0 && t.amount > catAvg[t.category] * 2 && catCnt[t.category] >= 2)
      .map((t) => ({ ...t, catAvg: catAvg[t.category] }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [filteredTransactions]);

  // ─── Header (always shown) ───────────────────────────────────────
  const header = (
    <div className="insights-header">
      <div>
        <h1 className="page-title">Insights</h1>
        <p className="insights-subtitle">Smart analysis of your spending habits</p>
      </div>
      <div className="insights-range-filter">
        {['1M', '3M', '6M', 'All'].map((r) => (
          <button
            key={r}
            className={`insights-range-btn${range === r ? ' active' : ''}`}
            onClick={() => setRange(r)}
          >{r}</button>
        ))}
      </div>
    </div>
  );

  // ─── Empty state ─────────────────────────────────────────────────
  if (filteredTransactions.length === 0) {
    return (
      <div className="fade-up insights-page">
        {header}
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 40, opacity: 0.2 }}>📊</div>
          <div style={{ fontSize: 14, color: T.text.tertiary, fontWeight: 600, marginTop: 12 }}>
            No transactions in this period
          </div>
          <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 4 }}>
            Add transactions or expand the date range to see insights
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up insights-page">
      {header}

      {/* Stat Cards */}
      <div className="insights-stats-grid">
        {statCards.map((i) => (
          <div key={i.title} className="insights-stat-card">
            <div className="insights-stat-top">
              <span className="insights-stat-label">{i.title}</span>
              <span className="insights-stat-icon" style={{ color: i.color }}>{i.icon}</span>
            </div>
            <div className="insights-stat-value mono" style={{ color: i.color }}>{i.value}</div>
            <div className="insights-stat-desc">{i.desc}</div>
          </div>
        ))}
      </div>

      {/* Monthly Trend — AreaChart */}
      <div className="glass-card insights-card-padded">
        <div className="card-title">Monthly Trend</div>
        <div className="insights-trend-legend">
          <span className="insights-trend-legend-item">
            <span className="insights-trend-legend-dot income" /> Income
          </span>
          <span className="insights-trend-legend-item">
            <span className="insights-trend-legend-dot expense" /> Expenses
          </span>
        </div>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="igGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.accent.teal} stopOpacity={0.22} />
                <stop offset="95%" stopColor={T.accent.teal} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="egGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.accent.danger} stopOpacity={0.18} />
                <stop offset="95%" stopColor={T.accent.danger} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: T.text.tertiary }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: T.text.tertiary }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              width={38}
            />
            <Tooltip
              contentStyle={{
                background: T.bg.elevated,
                border: `1px solid ${T.border.medium}`,
                borderRadius: 8, fontSize: 11,
              }}
              labelStyle={{ color: T.text.secondary, fontWeight: 700 }}
              formatter={(val, name) => [fmt(val, currency), name]}
            />
            <Area type="monotone" dataKey="income" name="Income" stroke={T.accent.teal} strokeWidth={2} fill="url(#igGrad)" dot={false} />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke={T.accent.danger} strokeWidth={2} fill="url(#egGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Spending Breakdown — Donut + Bars */}
      <div className="insights-two-col">
        <div className="glass-card insights-card-padded">
          <div className="card-title">Spending Allocation</div>
          <SpendingDonut data={cats} total={expenses} currency={currency} />
        </div>
        <div className="glass-card insights-card-padded">
          <div className="card-title">Category Breakdown</div>
          <div className="insights-cat-list">
            {cats.map(([cat, amt]) => (
              <CategoryBar key={cat} name={cat} amount={amt} total={expenses} currency={currency} />
            ))}
          </div>
        </div>
      </div>

      {/* Budget Scorecard */}
      {budgetRows.length > 0 && (
        <div className="glass-card insights-card-padded">
          <div className="card-title">Budget Scorecard</div>
          <div style={{ fontSize: 11, color: T.text.tertiary, marginBottom: 12 }}>
            Actual spending vs recommended targets (50/30/20 rule) — as % of income
          </div>
          <div className="insights-budget-grid">
            {budgetRows.map(({ cat, actualPct, targetPct, status }) => {
              const color = status === 'ok' ? T.accent.teal : status === 'warn' ? T.accent.gold : T.accent.danger;
              const catColor = CAT_COLORS[cat] || T.accent.purple;
              const barPct = Math.min(actualPct / Math.max(targetPct * 1.5, actualPct) * 100, 100);
              const targetLinePct = Math.min(targetPct / Math.max(targetPct * 1.5, actualPct) * 100, 100);
              const statusLabel = status === 'ok' ? '✓ On track' : status === 'warn' ? '⚠ Watch' : '✗ Over budget';
              return (
                <div key={cat} className="insights-budget-item">
                  <div className="insights-budget-header">
                    <div className="insights-budget-cat">
                      <span className="insights-cat-dot" style={{ background: catColor }} />
                      {cat}
                    </div>
                    <span
                      className="insights-budget-status"
                      style={{
                        background: `${color}15`,
                        color,
                      }}
                    >{statusLabel}</span>
                  </div>
                  <div className="insights-budget-track">
                    <div
                      className="insights-budget-fill"
                      style={{ width: `${barPct}%`, background: color }}
                    />
                    <div
                      className="insights-budget-target-line"
                      style={{ left: `${targetLinePct}%` }}
                    />
                  </div>
                  <div className="insights-budget-pcts">
                    <span>Actual: {actualPct.toFixed(1)}%</span>
                    <span>Target: ≤{targetPct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Smart Tips + Anomaly Highlights */}
      <div className="insights-two-col">
        {/* Smart Tips */}
        <div className="glass-card insights-card-padded">
          <div className="card-title">💡 Smart Tips</div>
          <div className="insights-tips-list">
            {tips.map((tip, i) => (
              <TipCard key={i} text={tip.text} tag={tip.tag} />
            ))}
          </div>
        </div>

        {/* Anomaly Highlights */}
        {anomalies.length > 0 ? (
          <div className="glass-card insights-card-padded">
            <div className="card-title">⚡ Unusual Transactions</div>
            <div style={{ fontSize: 11, color: T.text.tertiary, marginBottom: 10 }}>
              Expenses more than 2× the average for their category
            </div>
            <div className="insights-anomaly-list">
              {anomalies.map((t) => {
                const abovePct = ((t.amount / t.catAvg - 1) * 100).toFixed(0);
                return (
                  <div key={t.id} className="insights-anomaly-item">
                    <span className="insights-cat-dot" style={{ background: CAT_COLORS[t.category] || T.accent.purple, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: T.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description}
                    </span>
                    <span style={{ fontSize: 10.5, color: T.text.tertiary, flexShrink: 0 }}>{t.date}</span>
                    <span className="mono" style={{ color: T.accent.danger, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {fmt(t.amount, currency)}
                    </span>
                    <span style={{
                      fontSize: 9, color: T.accent.gold, fontWeight: 700,
                      background: 'rgba(245,200,66,0.1)', padding: '2px 6px', borderRadius: 3, flexShrink: 0,
                    }}>
                      +{abovePct}% avg
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="glass-card insights-card-padded" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 28, opacity: 0.25 }}>✅</div>
            <div style={{ fontSize: 12, color: T.text.tertiary, fontWeight: 600 }}>No unusual transactions</div>
            <div style={{ fontSize: 11, color: T.text.tertiary }}>All spending looks within normal range</div>
          </div>
        )}
      </div>
    </div>
  );
}
