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
  transactions.filter((t) => t.type === 'expense').forEach((t) => {catMap[t.category] = (catMap[t.category] || 0) + t.amount;});
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
  expenses.forEach((t) => {catMap[t.category] = (catMap[t.category] || 0) + t.amount;});
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
  const descCounts = {};
  expenses.forEach((t) => {descCounts[t.description] = (descCounts[t.description] || 0) + 1;});
  Object.entries(descCounts).forEach(([desc, count]) => {
    if (count >= 3) {
      anomalies.push({ type: 'recurring', message: `"${desc}" appears ${count} times — possible subscription`, severity: 'info', icon: '↻' });
    }
  });

  return anomalies.slice(0, 4);
}

/* ═══════════════════════════════════════════
   BUDGET INTELLIGENCE
   ═══════════════════════════════════════════ */








export function calcBudgets(transactions) {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const catMap = {};
  expenses.forEach((t) => {catMap[t.category] = (catMap[t.category] || 0) + t.amount;});
  const totalExp = expenses.reduce((s, t) => s + t.amount, 0);

  return Object.entries(catMap).
  sort((a, b) => b[1] - a[1]).
  map(([cat, spent]) => {
    const ratio = totalExp > 0 ? spent / totalExp : 0;
    const suggested = Math.round(income * ratio * 0.85); // suggest 85% of proportional share
    const pct = suggested > 0 ? spent / suggested * 100 : 0;
    const status = pct > 110 ? 'over' : pct > 80 ? 'warning' : 'safe';
    return { category: cat, spent, suggested, pct: Math.min(pct, 150), status };
  }).
  slice(0, 5);
}

/* ═══════════════════════════════════════════
   PREDICTIVE SPENDING
   ═══════════════════════════════════════════ */
export function predictNextMonth(monthlyData) {
  if (monthlyData.length < 2) return { predictedExpense: 0, trend: 'stable', pctChange: 0 };
  const last3 = monthlyData.slice(-3);
  const avg = last3.reduce((s, d) => s + d.expenses, 0) / last3.length;
  const lastExp = monthlyData[monthlyData.length - 1].expenses;
  const prevExp = monthlyData[monthlyData.length - 2].expenses;
  const momentum = (lastExp - prevExp) / (prevExp || 1);
  const predicted = Math.round(avg * (1 + momentum * 0.5));
  const pctChange = (predicted - lastExp) / (lastExp || 1) * 100;
  const trend = pctChange > 3 ? 'up' : pctChange < -3 ? 'down' : 'stable';
  return { predictedExpense: predicted, trend, pctChange: Math.round(pctChange) };
}