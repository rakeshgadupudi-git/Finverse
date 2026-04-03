// FinTracker AI — Portfolio Analytics Engine
// Separated engines: risk, allocation, tax, health, prediction



// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════









































































// ═══════════════════════════════════════════
// SECTOR COLORS
// ═══════════════════════════════════════════

const SECTOR_COLORS = {
  'IT': '#4d9fff',
  'Banking': '#00d4aa',
  'Energy': '#ff8c42',
  'FMCG': '#f5c842',
  'Pharma': '#9d77f7',
  'Auto': '#ff5e6c',
  'Metals': '#7d8fa0',
  'Infra': '#00b894',
  'Telecom': '#e84393',
  'Others': '#636e72'
};

// ═══════════════════════════════════════════
// ENRICHED HOLDINGS — single price lookup
// ═══════════════════════════════════════════

export function enrichHoldings(
holdings,
prices,
mockPrices)
{
  const totalValue = holdings.reduce((sum, h) => {
    const p = prices[h.symbol]?.price || h.buyPrice;
    return sum + h.qty * p;
  }, 0);

  return holdings.map((h) => {
    const live = prices[h.symbol];
    const currentPrice = live?.price || h.buyPrice;
    const currentValue = h.qty * currentPrice;
    const investedValue = h.qty * h.buyPrice;
    const gain = currentValue - investedValue;
    const gainPct = h.buyPrice > 0 ? (currentPrice - h.buyPrice) / h.buyPrice * 100 : 0;
    const dayChange = live ? h.qty * live.change : 0;
    const dayChangePct = live?.changePct || 0;
    const allocationPct = totalValue > 0 ? currentValue / totalValue * 100 : 0;

    return {
      id: h.id,
      symbol: h.symbol,
      name: h.name,
      sector: h.sector || 'Others',
      qty: h.qty,
      buyPrice: h.buyPrice,
      buyDate: h.buyDate || '2025-01-01',
      currentPrice,
      currentValue,
      investedValue,
      gain,
      gainPct,
      dayChange,
      dayChangePct,
      allocationPct,
      isLive: !!live,
      sparkline: mockPrices[h.symbol]?.history || []
    };
  });
}

// ═══════════════════════════════════════════
// PORTFOLIO HEALTH SCORE
// ═══════════════════════════════════════════

export function calculateHealthScore(
enriched,
volatility,
beta)
{
  if (enriched.length === 0) {
    return { score: 0, grade: 'N/A', color: '#636e72', factors: [] };
  }

  const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);

  // Factor 1: Diversification (max 25)
  const weights = enriched.map((h) => h.allocationPct / 100);
  const hhi = weights.reduce((s, w) => s + w * w, 0);
  const sectorSet = new Set(enriched.map((h) => h.sector));
  const diversScore = Math.min(25, (1 - hhi) * 20 + Math.min(sectorSet.size, 5) * 1);

  // Factor 2: Volatility (max 25) — lower is better
  const volScore = Math.max(0, Math.min(25, 25 - (volatility - 5) * 1.5));

  // Factor 3: Beta stability (max 20) — closer to 1 is better
  const betaDev = Math.abs(beta - 1);
  const betaScore = Math.max(0, Math.min(20, 20 - betaDev * 20));

  // Factor 4: Concentration (max 15) — lower max weight is better
  const maxWeight = Math.max(...weights) * 100;
  const concScore = Math.max(0, Math.min(15, 15 - (maxWeight - 20) * 0.3));

  // Factor 5: Drawdown proxy (max 15) — fewer negative holdings is better
  const negCount = enriched.filter((h) => h.gain < 0).length;
  const ddScore = Math.max(0, Math.min(15, 15 - negCount * 3));

  const score = Math.round(Math.max(0, Math.min(100, diversScore + volScore + betaScore + concScore + ddScore)));
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  const color = score >= 80 ? '#00d4aa' : score >= 60 ? '#4d9fff' : score >= 40 ? '#f5c842' : '#ff5e6c';

  return {
    score, grade, color,
    factors: [
    { label: 'Diversification', score: Math.round(diversScore), max: 25, description: `${sectorSet.size} sectors, ${enriched.length} stocks` },
    { label: 'Volatility', score: Math.round(volScore), max: 25, description: `${volatility}% annualized` },
    { label: 'Beta Stability', score: Math.round(betaScore), max: 20, description: `β = ${beta}` },
    { label: 'Concentration', score: Math.round(concScore), max: 15, description: `Max weight ${maxWeight.toFixed(1)}%` },
    { label: 'Drawdown', score: Math.round(ddScore), max: 15, description: `${negCount} stocks in red` }]

  };
}

// ═══════════════════════════════════════════
// DIVERSIFICATION METRICS
// ═══════════════════════════════════════════

export function calculateDiversification(enriched) {
  if (enriched.length === 0) return { score: 0, sectorCount: 0, stockCount: 0, hhi: 1, grade: 'N/A' };

  const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);
  const weights = enriched.map((h) => totalValue > 0 ? h.currentValue / totalValue : 0);
  const hhi = weights.reduce((s, w) => s + w * w, 0);
  const sectorCount = new Set(enriched.map((h) => h.sector)).size;

  // Score: combination of HHI (lower=better) and sector count
  const hhiComponent = (1 - hhi) * 60;
  const sectorComponent = Math.min(sectorCount, 6) * 6.67;
  const score = Math.round(Math.min(100, hhiComponent + sectorComponent));
  const grade = score >= 80 ? 'Well Diversified' : score >= 60 ? 'Moderate' : score >= 40 ? 'Concentrated' : 'Highly Concentrated';

  return { score, sectorCount, stockCount: enriched.length, hhi: Math.round(hhi * 10000) / 10000, grade };
}

// ═══════════════════════════════════════════
// CONCENTRATION RISK
// ═══════════════════════════════════════════

export function calculateConcentration(enriched) {
  if (enriched.length === 0) {
    return { maxWeight: 0, maxWeightSymbol: '—', top3Weight: 0, hhi: 0, level: 'Low', color: '#00d4aa' };
  }

  const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);
  const sorted = [...enriched].sort((a, b) => b.currentValue - a.currentValue);
  const maxWeight = totalValue > 0 ? sorted[0].currentValue / totalValue * 100 : 0;
  const top3Value = sorted.slice(0, 3).reduce((s, h) => s + h.currentValue, 0);
  const top3Weight = totalValue > 0 ? top3Value / totalValue * 100 : 0;
  const weights = enriched.map((h) => totalValue > 0 ? h.currentValue / totalValue : 0);
  const hhi = weights.reduce((s, w) => s + w * w, 0);

  let level = 'Low';
  let color = '#00d4aa';
  if (maxWeight > 50) {level = 'Critical';color = '#ff5e6c';} else
  if (maxWeight > 35) {level = 'High';color = '#ff8c42';} else
  if (maxWeight > 25) {level = 'Moderate';color = '#f5c842';}

  return { maxWeight, maxWeightSymbol: sorted[0].symbol, top3Weight, hhi, level, color };
}

// ═══════════════════════════════════════════
// SECTOR ALLOCATION
// ═══════════════════════════════════════════

export function calculateSectorAllocation(enriched) {
  const sectorMap = {};
  enriched.forEach((h) => {
    if (!sectorMap[h.sector]) sectorMap[h.sector] = { value: 0, count: 0 };
    sectorMap[h.sector].value += h.currentValue;
    sectorMap[h.sector].count++;
  });

  const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);

  return Object.entries(sectorMap).
  map(([sector, { value, count }]) => ({
    sector,
    value,
    weight: totalValue > 0 ? value / totalValue * 100 : 0,
    holdings: count,
    color: SECTOR_COLORS[sector] || SECTOR_COLORS['Others']
  })).
  sort((a, b) => b.value - a.value);
}

// ═══════════════════════════════════════════
// TAX INTELLIGENCE
// ═══════════════════════════════════════════

export function calculateTaxIntelligence(enriched) {
  const now = new Date();
  let shortTermGain = 0,longTermGain = 0;
  const harvestingOpportunities = [];
  const holdingsNearLongTerm = [];

  enriched.forEach((h) => {
    const buyDate = new Date(h.buyDate);
    const holdDays = Math.floor((now.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
    const isLongTerm = holdDays >= 365;

    if (h.gain >= 0) {
      if (isLongTerm) longTermGain += h.gain;else
      shortTermGain += h.gain;
    } else {
      // Tax loss harvesting opportunity
      harvestingOpportunities.push({
        symbol: h.symbol,
        loss: Math.abs(h.gain),
        taxSaving: Math.round(Math.abs(h.gain) * 0.15) // 15% STCG rate
      });
    }

    // Holdings close to becoming long-term
    if (!isLongTerm && holdDays >= 300) {
      holdingsNearLongTerm.push({
        symbol: h.symbol,
        daysLeft: 365 - holdDays
      });
    }
  });

  // Indian equity tax rates: STCG 15%, LTCG 10% above ₹1L
  const shortTermTax = Math.round(shortTermGain * 0.15);
  const longTermTax = Math.round(Math.max(0, longTermGain - 100000) * 0.10);

  return {
    totalRealizedGain: shortTermGain + longTermGain,
    shortTermGain,
    longTermGain,
    shortTermTax,
    longTermTax,
    harvestingOpportunities: harvestingOpportunities.sort((a, b) => b.taxSaving - a.taxSaving),
    holdingsNearLongTerm
  };
}

// ═══════════════════════════════════════════
// PREDICTIVE ANALYTICS
// ═══════════════════════════════════════════

export function calculatePredictiveAnalytics(
totalValue,
annualReturn = 12,
volatility = 12.5,
months = 12)
{
  if (totalValue <= 0) {
    return { futureValueP50: 0, futureValueP10: 0, futureValueP90: 0, downsideRisk: 0, worstCase: 0, crashImpact: 0, var95: 0 };
  }

  const mu = annualReturn / 100;
  const sigma = volatility / 100;
  const t = months / 12;

  // Log-normal model
  const drift = (mu - 0.5 * sigma * sigma) * t;
  const diffusion = sigma * Math.sqrt(t);

  // Percentiles using z-scores
  const p50 = totalValue * Math.exp(drift);
  const p10 = totalValue * Math.exp(drift - 1.28 * diffusion);
  const p90 = totalValue * Math.exp(drift + 1.28 * diffusion);
  const worstCase = totalValue * Math.exp(drift - 2 * diffusion);

  // Probability of loss
  const zLoss = -drift / diffusion;
  const downsideRisk = Math.round(normalCDF(zLoss) * 100);

  // Value at Risk (95%)
  const var95 = totalValue - totalValue * Math.exp(drift - 1.645 * diffusion);

  // Market crash scenario (-30%)
  const crashImpact = totalValue * 0.70;

  return {
    futureValueP50: Math.round(p50),
    futureValueP10: Math.round(p10),
    futureValueP90: Math.round(p90),
    downsideRisk,
    worstCase: Math.round(worstCase),
    crashImpact: Math.round(crashImpact),
    var95: Math.round(var95)
  };
}

// Approximation of standard normal CDF
function normalCDF(x) {
  const a1 = 0.254829592,a2 = -0.284496736,a3 = 1.421413741,a4 = -1.453152027,a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// ═══════════════════════════════════════════
// XIRR CALCULATION (Newton-Raphson)
// ═══════════════════════════════════════════

export function calculateXIRR(
enriched)
{
  if (enriched.length === 0) return 0;

  // Build cashflows: buy is outflow, current value is inflow
  const cashflows = [];
  const now = new Date();

  enriched.forEach((h) => {
    cashflows.push({ date: new Date(h.buyDate), amount: -(h.qty * h.buyPrice) });
  });
  const totalCurrentValue = enriched.reduce((s, h) => s + h.currentValue, 0);
  cashflows.push({ date: now, amount: totalCurrentValue });

  // Newton-Raphson
  let rate = 0.1;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0,dnpv = 0;
    cashflows.forEach((cf) => {
      const years = (cf.date.getTime() - cashflows[0].date.getTime()) / (365.25 * 24 * 3600 * 1000);
      const factor = Math.pow(1 + rate, years);
      npv += cf.amount / factor;
      dnpv -= years * cf.amount / (factor * (1 + rate));
    });
    if (Math.abs(dnpv) < 1e-10) break;
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < 1e-7) break;
    rate = newRate;
  }

  return Math.round(rate * 10000) / 100; // percentage with 2 decimals
}

// ═══════════════════════════════════════════
// PORTFOLIO MOMENTUM (simple moving average cross)
// ═══════════════════════════════════════════

export function calculateMomentum(enriched) {
  if (enriched.length === 0) return { score: 0, label: 'No Data', color: '#636e72' };

  // Weighted avg of holding gains as momentum proxy
  const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);
  const weightedGain = enriched.reduce((s, h) => s + h.gainPct * (h.currentValue / (totalValue || 1)), 0);

  const score = Math.max(-100, Math.min(100, Math.round(weightedGain)));
  let label = 'Neutral',color = '#f5c842';
  if (score > 10) {label = 'Bullish';color = '#00d4aa';} else
  if (score > 5) {label = 'Mildly Bullish';color = '#00d4aa';} else
  if (score < -10) {label = 'Bearish';color = '#ff5e6c';} else
  if (score < -5) {label = 'Mildly Bearish';color = '#ff8c42';}

  return { score, label, color };
}

// ═══════════════════════════════════════════
// GROWTH DATA — dynamic from holdings
// ═══════════════════════════════════════════







export function generateGrowthData(
enriched,
mockPrices,
timeframe = '6M')
{
  if (enriched.length === 0) return [];

  // Determine how many points based on timeframe
  const pointsMap = { '1M': 5, '3M': 8, '6M': 12, '1Y': 13 };
  const numPoints = pointsMap[timeframe] || 12;

  // Build portfolio value series from historical prices
  const portfolioValues = [];
  for (let i = 0; i < numPoints; i++) {
    let value = 0;
    enriched.forEach((h) => {
      const history = mockPrices[h.symbol]?.history || [];
      if (history.length > 0) {
        // Map point index to history index
        const histIdx = Math.min(Math.floor(i / (numPoints - 1) * (history.length - 1)), history.length - 1);
        value += h.qty * history[histIdx];
      } else {
        // Interpolate from buyPrice to currentPrice
        const frac = i / (numPoints - 1);
        value += h.qty * (h.buyPrice + (h.currentPrice - h.buyPrice) * frac);
      }
    });
    portfolioValues.push(Math.round(value));
  }

  // Generate benchmark (Nifty 50) — simulated with ~12% annual growth + noise
  const baseNifty = portfolioValues[0] * 0.98; // Start slight below portfolio
  const monthsSpan = timeframe === '1M' ? 1 : timeframe === '3M' ? 3 : timeframe === '6M' ? 6 : 12;
  const monthlyReturn = Math.pow(1.12, 1 / 12) - 1;

  // Date labels
  const now = new Date();
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const monthsBack = monthsSpan - i / (numPoints - 1) * monthsSpan;
    const d = new Date(now);
    d.setMonth(d.getMonth() - Math.round(monthsBack));
    const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

    const benchmarkValue = Math.round(baseNifty * Math.pow(1 + monthlyReturn, i / (numPoints - 1) * monthsSpan));

    points.push({
      date: dateStr,
      portfolio: portfolioValues[i],
      benchmark: benchmarkValue
    });
  }

  return points;
}

// ═══════════════════════════════════════════
// DRAWDOWN CHART DATA
// ═══════════════════════════════════════════







export function calculateDrawdown(growthData) {
  if (growthData.length === 0) return [];

  let peak = growthData[0].portfolio;
  return growthData.map((gp) => {
    peak = Math.max(peak, gp.portfolio);
    const dd = peak > 0 ? (gp.portfolio - peak) / peak * 100 : 0;
    return {
      date: gp.date,
      drawdown: Math.round(dd * 100) / 100,
      value: gp.portfolio
    };
  });
}

// ═══════════════════════════════════════════
// RISK–RETURN SCATTER DATA
// ═══════════════════════════════════════════










export function calculateRiskReturnData(
enriched,
mockPrices)
{
  return enriched.map((h) => {
    const history = mockPrices[h.symbol]?.history || [];
    let risk = 0;
    if (history.length > 2) {
      const returns = history.slice(1).map((p, i) => (p - history[i]) / (history[i] || 1));
      const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
      const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
      risk = Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100; // annualized %
    }

    const sectorColors = {
      'IT': '#4d9fff', 'Banking': '#00d4aa', 'Energy': '#ff8c42',
      'FMCG': '#f5c842', 'Pharma': '#9d77f7', 'Auto': '#ff5e6c',
      'Metals': '#7d8fa0', 'Infra': '#00b894', 'Telecom': '#e84393', 'Others': '#636e72'
    };

    return {
      symbol: h.symbol,
      sector: h.sector,
      risk,
      returnPct: Math.round(h.gainPct * 100) / 100,
      value: h.currentValue,
      color: sectorColors[h.sector] || '#636e72'
    };
  });
}

// ═══════════════════════════════════════════
// TAX TIMELINE (enhanced)
// ═══════════════════════════════════════════













export function calculateTaxTimeline(enriched) {
  const now = new Date();
  return enriched.map((h) => {
    const buyDate = new Date(h.buyDate);
    const holdDays = Math.floor((now.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
    const isLongTerm = holdDays >= 365;
    const daysToLTCG = isLongTerm ? 0 : Math.max(0, 365 - holdDays);
    const gain = h.gain;

    // Tax if sold now
    const taxIfSoldNow = gain > 0 ?
    isLongTerm ?
    Math.round(Math.max(0, gain - 100000) * 0.10) // LTCG 10% above ₹1L
    : Math.round(gain * 0.15) // STCG 15%
    : 0;

    // Tax if held to long-term
    const taxIfHeldLong = gain > 0 ? Math.round(Math.max(0, gain - 100000) * 0.10) : 0;

    return {
      symbol: h.symbol,
      buyDate: h.buyDate,
      holdDays,
      daysToLTCG,
      isLongTerm,
      gain,
      taxLiability: taxIfSoldNow,
      taxIfSoldNow,
      taxIfHeldLong
    };
  }).sort((a, b) => a.daysToLTCG - b.daysToLTCG);
}