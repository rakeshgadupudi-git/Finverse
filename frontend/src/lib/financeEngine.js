// FinTracker AI — Financial Intelligence Engine


/* ═══════════════════════════════════════════
   FINANCIAL HEALTH SCORE (0–100)
   ═══════════════════════════════════════════ */


export function calcHealthScore(transactions) {
  const inc = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savings = inc - exp;
  const savingsRatio = inc > 0 ? savings / inc * 100 : 0;

  // Factor 1: Savings ratio (max 35pts)
  const f1 = Math.min(35, savingsRatio / 30 * 35);

  // Factor 2: Expense diversity — fewer dominant categories = healthier (max 25pts)
  const catMap = {};
  transactions.filter((t) => t.type === 'expense').forEach((t) => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const cats = Object.values(catMap);
  const maxCat = Math.max(...cats, 1);
  const diversity = cats.length > 0 ? 1 - maxCat / (exp || 1) : 0.5;
  const f2 = diversity * 25;

  // Factor 3: Income consistency (max 20pts)
  const incTx = transactions.filter((t) => t.type === 'income');
  const f3 = incTx.length >= 3 ? 20 : incTx.length >= 1 ? 12 : 0;

  // Factor 4: No overspending (max 20pts)
  const f4 = savings >= 0 ? 20 : Math.max(0, 20 + savings / inc * 20);

  const score = Math.round(Math.max(0, Math.min(100, f1 + f2 + f3 + f4)));
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  const color = score >= 80 ? '#00d4aa' : score >= 60 ? '#4d9fff' : score >= 40 ? '#f5c842' : '#ff5e6c';

  return {
    score, grade, color,
    factors: [
      { label: 'Savings Rate', score: Math.round(f1), max: 35 },
      { label: 'Expense Diversity', score: Math.round(f2), max: 25 },
      { label: 'Income Stability', score: Math.round(f3), max: 20 },
      { label: 'No Overspend', score: Math.round(f4), max: 20 }]

  };
}

/* ═══════════════════════════════════════════
   SPENDING ANOMALIES
   ═══════════════════════════════════════════ */

export function detectAnomalies(transactions) {
  const anomalies = [];
  const expenses = transactions.filter((t) => t.type === 'expense');
  if (expenses.length === 0) return anomalies;

  // Category spending analysis
  const catMap = {};
  expenses.forEach((t) => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
  const avgPerCat = totalExp / Math.max(Object.keys(catMap).length, 1);

  // Find overspending categories
  Object.entries(catMap).forEach(([cat, amt]) => {
    const ratio = amt / avgPerCat;
    if (ratio > 1.8) {
      anomalies.push({ type: 'spike', message: `${cat} spending is ${Math.round((ratio - 1) * 100)}% above average`, severity: 'warning', icon: '▲' });
    }
  });

  // Weekend spending pattern
  const weekendExp = expenses.filter((t) => {
    const d = new Date(t.date).getDay();
    return d === 0 || d === 6;
  }).reduce((s, t) => s + t.amount, 0);
  const weekdayExp = totalExp - weekendExp;
  if (weekendExp > weekdayExp * 0.6) {
    anomalies.push({ type: 'weekend', message: 'Weekend spending is disproportionately high', severity: 'info', icon: '◎' });
  }

  // Recurring transaction detection
  const FIXED_COST_CATS = new Set(['Rent', 'Utilities', 'Investment']);
  const descCounts = {};
  expenses.forEach((t) => { descCounts[t.description] = (descCounts[t.description] || 0) + 1; });
  Object.entries(descCounts).forEach(([desc, count]) => {
    if (count >= 3) {
      const tx = expenses.find((t) => t.description === desc);
      const label = tx && FIXED_COST_CATS.has(tx.category) ? 'recurring payment' : 'possible subscription';
      anomalies.push({ type: 'recurring', message: `"${desc}" appears ${count} times — ${label}`, severity: 'info', icon: '↻' });
    }
  });

  return anomalies.slice(0, 4);
}

/* ═══════════════════════════════════════════
   BUDGET INTELLIGENCE
   ═══════════════════════════════════════════ */

export function calcBudgets(transactions) {
  const now = new Date();
  const cy = now.getFullYear(), cm = now.getMonth();

  const isMonth = (t, y, m) => {
    const d = new Date(t.date);
    return d.getFullYear() === y && d.getMonth() === m;
  };

  // Current month spending per category
  const curExp = transactions.filter((t) => t.type === 'expense' && isMonth(t, cy, cm));
  if (curExp.length === 0) return [];

  const curCat = {};
  curExp.forEach((t) => { curCat[t.category] = (curCat[t.category] || 0) + t.amount; });

  // Past 3 months average per category
  const pastCat = {};
  const activeMonths = new Set();
  for (let i = 1; i <= 3; i++) {
    const d = new Date(cy, cm - i, 1);
    const py = d.getFullYear(), pm = d.getMonth();
    const monthExp = transactions.filter((t) => t.type === 'expense' && isMonth(t, py, pm));
    if (monthExp.length > 0) {
      activeMonths.add(`${py}-${pm}`);
      monthExp.forEach((t) => { pastCat[t.category] = (pastCat[t.category] || 0) + t.amount; });
    }
  }
  const nMonths = Math.max(1, activeMonths.size);

  // Current month income for income-based fallback
  const curIncome = transactions
    .filter((t) => t.type === 'income' && isMonth(t, cy, cm))
    .reduce((s, t) => s + t.amount, 0);
  const curTotalExp = curExp.reduce((s, t) => s + t.amount, 0);

  return Object.entries(curCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, spent]) => {
      // Budget = past avg for this category; fallback = income-proportional allocation
      const pastAvg = pastCat[cat] ? Math.round(pastCat[cat] / nMonths) : null;
      const incomeBudget = curIncome > 0
        ? Math.round(curIncome * (spent / curTotalExp) * 1.15)
        : spent;
      const budget = pastAvg || incomeBudget;
      const pct = budget > 0 ? (spent / budget) * 100 : 100;
      const status = pct > 110 ? 'over' : pct > 85 ? 'warning' : 'safe';
      return { category: cat, spent, budget, pct: Math.min(pct, 150), status };
    });
}

/* ═══════════════════════════════════════════
   PREDICTIVE SPENDING
   ═══════════════════════════════════════════ */
export function predictNextMonth(monthlyData) {
  // Only use months that actually have spending data
  const active = monthlyData.filter((m) => m.expenses > 0);

  if (active.length === 0) return { predictedExpense: 0, trend: 'stable', pctChange: 0 };
  if (active.length === 1) return { predictedExpense: active[0].expenses, trend: 'stable', pctChange: 0 };

  const last3 = active.slice(-3);
  const avg = last3.reduce((s, d) => s + d.expenses, 0) / last3.length;

  const lastExp = active[active.length - 1].expenses;
  const prevExp = active[active.length - 2].expenses;

  // Clamp momentum to ±40% — prevents explosion when prevExp is tiny or zero
  const rawMomentum = prevExp > 0 ? (lastExp - prevExp) / prevExp : 0;
  const momentum = Math.max(-0.4, Math.min(0.4, rawMomentum));

  const predicted = Math.max(0, Math.round(avg * (1 + momentum * 0.4)));
  const pctChange = lastExp > 0 ? Math.round((predicted - lastExp) / lastExp * 100) : 0;
  const trend = pctChange > 5 ? 'up' : pctChange < -5 ? 'down' : 'stable';

  return { predictedExpense: predicted, trend, pctChange };
}
