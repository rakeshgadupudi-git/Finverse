export function calculatePortfolioStats(
holdings,
prices)
{
  if (holdings.length === 0) {
    return {
      totalValue: 0, totalCost: 0, totalGain: 0, totalPct: 0,
      dayGain: 0, dayGainPct: 0, volatility: 0, sharpeRatio: 0, beta: 1,
      bestPerformer: { symbol: '—', gainPct: 0 },
      worstPerformer: { symbol: '—', gainPct: 0 }
    };
  }

  let totalValue = 0;
  let totalCost = 0;
  let dayGain = 0;

  let best = { symbol: '—', gainPct: -Infinity };
  let worst = { symbol: '—', gainPct: Infinity };

  holdings.forEach((h) => {
    const live = prices[h.symbol] || { price: h.buyPrice, change: 0, changePct: 0 };
    const currentVal = h.qty * live.price;
    const costVal = h.qty * h.buyPrice;

    totalValue += currentVal;
    totalCost += costVal;
    dayGain += h.qty * live.change;

    const gainPct = h.buyPrice > 0 ? (live.price - h.buyPrice) / h.buyPrice * 100 : 0;

    if (gainPct > best.gainPct) best = { symbol: h.symbol, gainPct };
    if (gainPct < worst.gainPct) worst = { symbol: h.symbol, gainPct };
  });

  const totalGain = totalValue - totalCost;
  const totalPct = totalCost > 0 ? totalGain / totalCost * 100 : 0;
  const dayGainPct = totalValue - dayGain > 0 ? dayGain / (totalValue - dayGain) * 100 : 0;

  // Risk Metrics — computed from per-holding gain percentages
  const gainPcts = holdings.map((h) => {
    const live = prices[h.symbol] || { price: h.buyPrice };
    return h.buyPrice > 0 ? (live.price - h.buyPrice) / h.buyPrice * 100 : 0;
  });
  const avgGainPct = gainPcts.length > 0 ? gainPcts.reduce((s, v) => s + v, 0) / gainPcts.length : 0;
  const variance = gainPcts.length > 0
    ? gainPcts.reduce((s, v) => s + Math.pow(v - avgGainPct, 2), 0) / gainPcts.length
    : 0;
  const volatility = parseFloat(Math.sqrt(variance).toFixed(2));
  const sharpeRatio = volatility > 0 ? parseFloat(((avgGainPct - 6.5) / volatility).toFixed(2)) : 0;
  const beta = parseFloat((avgGainPct / 12).toFixed(2));

  return {
    totalValue, totalCost, totalGain, totalPct,
    dayGain, dayGainPct,
    volatility, sharpeRatio, beta,
    bestPerformer: best.symbol === '—' ? { symbol: '—', gainPct: 0 } : best,
    worstPerformer: worst.symbol === '—' ? { symbol: '—', gainPct: 0 } : worst
  };
}

export function generateInsights(stats, holdings, prices = {}) {
  const insights = [];
  if (holdings.length === 0) return insights;

  const totalValue = stats.totalValue || 1;

  // 1. Concentration Risk — by value  (priority 10 / 8)
  const holdingValues = holdings
    .map((h) => ({ symbol: h.symbol, value: h.qty * (prices[h.symbol]?.price || h.buyPrice) }))
    .sort((a, b) => b.value - a.value);
  const topPct = holdingValues[0].value / totalValue * 100;

  if (topPct > 40) {
    insights.push({
      type: 'danger', icon: '⚠️', priority: 10,
      title: 'Critical Concentration',
      message: `${holdingValues[0].symbol} is ${topPct.toFixed(1)}% of your portfolio. Extreme risk — consider rebalancing.`,
      action: 'Rebalance',
    });
  } else if (topPct > 30) {
    insights.push({
      type: 'warning', icon: '📊', priority: 8,
      title: 'Overweight Stock',
      message: `${holdingValues[0].symbol} is ${topPct.toFixed(1)}% of your portfolio. Consider trimming.`,
      action: 'Review Allocation',
    });
  }

  // 2. Sector concentration  (priority 7)
  const sectorMap = {};
  holdings.forEach((h) => {
    const val = h.qty * (prices[h.symbol]?.price || h.buyPrice);
    sectorMap[h.sector || 'Others'] = (sectorMap[h.sector || 'Others'] || 0) + val;
  });
  Object.entries(sectorMap).forEach(([sector, val]) => {
    const pct = val / totalValue * 100;
    if (pct > 50) {
      insights.push({
        type: 'warning', icon: '🏭', priority: 7,
        title: 'Sector Concentration',
        message: `${sector} sector is ${pct.toFixed(1)}% of your portfolio. Diversify across sectors.`,
        action: 'Explore Sectors',
      });
    }
  });

  // 3. Profit Booking — best performer  (priority 6)
  if (stats.bestPerformer.symbol !== '—' && stats.bestPerformer.gainPct > 25) {
    insights.push({
      type: 'success', icon: '💰', priority: 6,
      title: 'Profit Booking',
      message: `${stats.bestPerformer.symbol} is up ${stats.bestPerformer.gainPct.toFixed(1)}%. Consider booking partial profits.`,
      action: 'Sell Partial',
    });
  } else {
    // Enhancement: multiple gainers (>20%) when best performer hasn't crossed 25%
    const bigGainers = holdings.filter((h) => {
      const price = prices[h.symbol]?.price || h.buyPrice;
      return h.buyPrice > 0 && (price - h.buyPrice) / h.buyPrice * 100 > 20;
    });
    if (bigGainers.length >= 2) {
      const syms = bigGainers.map((h) => h.symbol).join(', ');
      insights.push({
        type: 'success', icon: '💰', priority: 6,
        title: 'Multiple Gainers',
        message: `${bigGainers.length} stocks (${syms}) are up >20% — consider locking in partial profits.`,
        action: 'Sell Partial',
      });
    }
  }

  // 4. Exit Risk  (priority 9)
  if (stats.worstPerformer.symbol !== '—' && stats.worstPerformer.gainPct < -15) {
    insights.push({
      type: 'danger', icon: '🚪', priority: 9,
      title: 'Exit Risk Alert',
      message: `${stats.worstPerformer.symbol} is down ${Math.abs(stats.worstPerformer.gainPct).toFixed(1)}%. Review your thesis or set stop-loss.`,
      action: 'Review Position',
    });
  }

  // 5. Averaging Opportunity — aggregated into ONE insight  (priority 5)
  // Excludes the worst performer (already covered by Exit Risk — avoid contradictory advice)
  const avgCandidates = holdings
    .filter((h) => h.symbol !== stats.worstPerformer.symbol)
    .map((h) => {
      const price = prices[h.symbol]?.price || h.buyPrice;
      const drop = h.buyPrice > 0 ? (h.buyPrice - price) / h.buyPrice * 100 : 0;
      return { symbol: h.symbol, drop };
    })
    .filter((c) => c.drop > 8 && c.drop < 20)
    .sort((a, b) => b.drop - a.drop);

  if (avgCandidates.length === 1) {
    insights.push({
      type: 'info', icon: '🎯', priority: 5,
      title: 'Averaging Opportunity',
      message: `${avgCandidates[0].symbol} is ${avgCandidates[0].drop.toFixed(1)}% below your cost. Good entry if thesis holds.`,
      action: 'Add Position',
    });
  } else if (avgCandidates.length >= 2) {
    const names = avgCandidates.slice(0, 3).map((c) => c.symbol).join(', ');
    insights.push({
      type: 'info', icon: '🎯', priority: 5,
      title: 'Averaging Opportunities',
      message: `${avgCandidates.length} stocks (${names}) are 8–20% below cost — potential accumulation zones.`,
      action: 'Review Positions',
    });
  }

  // 6. Low Diversification  (priority 4)
  if (holdings.length < 5) {
    insights.push({
      type: 'warning', icon: '🔀', priority: 4,
      title: 'Low Diversification',
      message: `Only ${holdings.length} holdings. Add more sectors/stocks to reduce risk.`,
      action: 'Explore Stocks',
    });
  }

  // 7. Momentum — negative (priority 2) | positive (priority 2)
  // Mutually exclusive thresholds — no tie possible
  if (stats.dayGainPct < -2) {
    insights.push({
      type: 'warning', icon: '📉', priority: 2,
      title: 'Momentum Weakening',
      message: `Portfolio down ${Math.abs(stats.dayGainPct).toFixed(2)}% today. Monitor closely.`,
      action: 'Check Holdings',
    });
  } else if (stats.dayGainPct > 2.5) {
    insights.push({
      type: 'success', icon: '🚀', priority: 2,
      title: 'Strong Day Momentum',
      message: `Portfolio up ${stats.dayGainPct.toFixed(2)}% today — strong buying across holdings.`,
      action: 'See Analytics',
    });
  }

  // 8. High Volatility Warning  (priority 3)
  if (stats.volatility > 20) {
    insights.push({
      type: 'warning', icon: '🌊', priority: 3,
      title: 'High Volatility',
      message: `Portfolio volatility at ${stats.volatility}%. Consider hedging or adding stable assets.`,
      action: 'Hedge Portfolio',
    });
  }

  // 9. Healthy Portfolio — only shown when no other insight fired  (priority 1)
  if (insights.length === 0) {
    insights.push({
      type: 'success', icon: '✅', priority: 1,
      title: 'Portfolio Looking Healthy',
      message: 'No concentration risks, no exit alerts — your holdings are well-balanced. Keep monitoring.',
      action: 'See Analytics',
    });
  }

  // Sort by priority descending, limit to 6
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 6);
}

// ═══════════════════════════════════════════
// PROJECTION ENGINE — 3 scenarios
// ═══════════════════════════════════════════

export function projectPortfolio(
currentValue,
monthlySIP = 25000,
annualReturn = 12,
months = 6)
{
  if (currentValue <= 0) {
    const empty = Array(months).fill(0);
    return { months: empty.map((_, i) => `M${i + 1}`), base: empty, bull: empty, bear: empty, confidenceLow: empty, confidenceHigh: empty };
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const labels = [];
  for (let i = 1; i <= months; i++) {
    labels.push(monthNames[(now.getMonth() + i) % 12]);
  }

  const scenarios = {
    bull: annualReturn + 6,
    base: annualReturn,
    bear: Math.max(annualReturn - 8, -5)
  };

  const compute = (returnRate) => {
    const monthlyReturn = Math.pow(1 + returnRate / 100, 1 / 12);
    const values = [];
    let running = currentValue;
    for (let i = 0; i < months; i++) {
      running = running * monthlyReturn + monthlySIP;
      values.push(Math.round(running));
    }
    return values;
  };

  const base = compute(scenarios.base);
  const bull = compute(scenarios.bull);
  const bear = compute(scenarios.bear);

  // Confidence bands: ±1σ around base
  const sigma = 0.08; // 8% monthly uncertainty
  const confidenceLow = base.map((v, i) => Math.round(v * (1 - sigma * Math.sqrt(i + 1))));
  const confidenceHigh = base.map((v, i) => Math.round(v * (1 + sigma * Math.sqrt(i + 1))));

  return { months: labels, base, bull, bear, confidenceLow, confidenceHigh };
}