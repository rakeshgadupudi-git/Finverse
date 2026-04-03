
import { getNewsByTicker } from '../data/newsData.js';

function generateSWOT(stock) {
  const strengths = [];
  const weaknesses = [];
  const opportunities = [];
  const threats = [];

  // Strengths
  if (stock.roe > 20) strengths.push(`High Return on Equity (${stock.roe}%) indicates efficient use of shareholder capital`);
  if (stock.roce > 25) strengths.push(`Excellent Return on Capital Employed (${stock.roce}%) shows strong capital allocation`);
  if (stock.debtToEquity < 0.3) strengths.push('Low debt-to-equity ratio provides financial stability and flexibility');
  if (stock.promoterHolding > 50) strengths.push(`Strong promoter holding (${stock.promoterHolding}%) shows management confidence`);
  if (stock.revenueGrowth > 15) strengths.push(`Robust revenue growth of ${stock.revenueGrowth}% YoY demonstrates strong demand`);
  if (stock.profitGrowth > 20) strengths.push(`Impressive profit growth of ${stock.profitGrowth}% indicates improving margins`);
  if (stock.dividendYield > 2) strengths.push(`Attractive dividend yield of ${stock.dividendYield}% provides income to investors`);
  if (stock.institutionalHolding > 40) strengths.push(`High institutional holding (${stock.institutionalHolding}%) indicates strong institutional confidence`);
  if (stock.capCategory === 'Large Cap') strengths.push('Large-cap status provides stability and liquidity');
  if (stock.avgVolume > 10000000) strengths.push('High trading volume ensures excellent liquidity');

  if (strengths.length < 2) {
    strengths.push(`Established player in the ${stock.sector} sector with brand recognition`);
    strengths.push('Diversified business model provides revenue stability');
  }

  // Weaknesses
  if (stock.pe > 50) weaknesses.push(`High P/E ratio (${stock.pe}x) suggests expensive valuation relative to earnings`);
  if (stock.debtToEquity > 1) weaknesses.push(`Elevated debt-to-equity ratio (${stock.debtToEquity}) increases financial risk`);
  if (stock.revenueGrowth < 5) weaknesses.push(`Sluggish revenue growth (${stock.revenueGrowth}%) may indicate market saturation`);
  if (stock.profitGrowth < 0) weaknesses.push(`Declining profits (${stock.profitGrowth}%) raise concerns about operational efficiency`);
  if (stock.roe < 10) weaknesses.push(`Low ROE (${stock.roe}%) suggests suboptimal capital utilization`);
  if (stock.promoterHolding < 20 && stock.promoterHolding > 0) weaknesses.push(`Low promoter holding (${stock.promoterHolding}%) may indicate reduced insider confidence`);
  if (stock.dividendYield === 0) weaknesses.push('Zero dividend yield — company retains all profits, no income for investors');

  if (weaknesses.length < 2) {
    weaknesses.push('Sector-specific regulatory risks may impact future growth');
    weaknesses.push('Global macroeconomic slowdown could affect business performance');
  }

  // Opportunities
  if (stock.sector === 'IT') opportunities.push('Digital transformation spending globally creates long-term growth runway');
  if (stock.sector === 'Banking') opportunities.push('India\'s underpenetrated credit market offers significant growth potential');
  if (stock.sector === 'Pharma') opportunities.push('Growing domestic healthcare market and US generic drug opportunities');
  if (stock.sector === 'Automobile') opportunities.push('EV transition and growing middle class drive auto demand in India');
  if (stock.sector === 'FMCG') opportunities.push('Rising rural consumption and premiumization trends benefit FMCG companies');
  if (stock.sector === 'Energy') opportunities.push('Energy transition investments and petrochemical expansion offer growth');
  if (stock.sector === 'Technology') opportunities.push('Digital India initiatives and startup ecosystem create massive opportunities');
  opportunities.push('India\'s GDP growth trajectory supports long-term market expansion');
  opportunities.push('Government reforms and infrastructure spending create tailwinds');
  if (stock.revenueGrowth > 20) opportunities.push('High growth trajectory positions company for market share gains');

  // Threats
  if (stock.sector === 'IT') threats.push('AI disruption and automation may reduce demand for traditional IT services');
  if (stock.sector === 'Banking') threats.push('Rising NPAs in a slowing economy could impact asset quality');
  threats.push('Geopolitical tensions and trade wars create uncertainty');
  threats.push('Currency fluctuations may impact profitability');
  if (stock.pe > 40) threats.push('Premium valuations leave limited margin of safety in market downturns');
  if (stock.debtToEquity > 0.8) threats.push('High leverage amplifies risk during economic downturns');

  return {
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 4),
    opportunities: opportunities.slice(0, 4),
    threats: threats.slice(0, 4)
  };
}

function generateRecommendation(stock) {
  let score = 50; // Start neutral

  // Valuation
  const sectorAvgPE = {
    'IT': 28, 'Banking': 15, 'FMCG': 45, 'Energy': 20, 'Pharma': 30,
    'Automobile': 18, 'Metals': 12, 'Telecom': 25, 'Finance': 22,
    'Power': 14, 'Mining': 10, 'Consumer': 35, 'Retail': 50,
    'Technology': 40, 'Conglomerate': 25, 'Electronics': 45, 'Chemicals': 18
  };
  const avgPE = sectorAvgPE[stock.sector] || 20;

  if (stock.pe > 0 && stock.pe < avgPE * 0.7) score += 15;else
  if (stock.pe > 0 && stock.pe < avgPE) score += 8;else
  if (stock.pe > avgPE * 1.5) score -= 12;else
  if (stock.pe > avgPE * 1.2) score -= 5;

  // Growth
  if (stock.revenueGrowth > 20) score += 12;else
  if (stock.revenueGrowth > 10) score += 6;else
  if (stock.revenueGrowth < 0) score -= 10;

  if (stock.profitGrowth > 25) score += 15;else
  if (stock.profitGrowth > 10) score += 8;else
  if (stock.profitGrowth < 0) score -= 12;

  // Quality
  if (stock.roe > 25) score += 10;else
  if (stock.roe > 15) score += 5;else
  if (stock.roe < 5) score -= 8;

  if (stock.roce > 30) score += 8;

  // Debt
  if (stock.debtToEquity === 0) score += 5;else
  if (stock.debtToEquity < 0.3) score += 3;else
  if (stock.debtToEquity > 1.5) score -= 10;else
  if (stock.debtToEquity > 0.8) score -= 5;

  // Dividend
  if (stock.dividendYield > 3) score += 5;else
  if (stock.dividendYield > 1.5) score += 2;

  // Promoter holding
  if (stock.promoterHolding > 60) score += 5;
  if (stock.institutionalHolding > 50) score += 3;

  // Clamp score
  score = Math.max(10, Math.min(95, score));

  let action;
  if (score >= 78) action = 'Strong Buy';else
  if (score >= 62) action = 'Buy';else
  if (score >= 42) action = 'Hold';else
  if (score >= 28) action = 'Sell';else
  action = 'Strong Sell';

  // Risk score (0-100, higher = more risky)
  let risk = 50;
  if (stock.debtToEquity > 1) risk += 15;
  if (stock.pe > 60) risk += 10;
  if (stock.profitGrowth < 0) risk += 12;
  if (stock.capCategory === 'Small Cap') risk += 10;
  if (stock.capCategory === 'Mid Cap') risk += 5;
  if (stock.roe > 20) risk -= 8;
  if (stock.dividendYield > 2) risk -= 5;
  if (stock.promoterHolding > 50) risk -= 5;
  risk = Math.max(10, Math.min(95, risk));

  let outlook;
  if (score >= 65) outlook = 'Bullish';else
  if (score >= 40) outlook = 'Sideways';else
  outlook = 'Bearish';

  let valuationAlert;
  if (stock.pe > 0 && stock.pe > avgPE * 1.3) valuationAlert = 'Overvalued';else
  if (stock.pe > 0 && stock.pe < avgPE * 0.8) valuationAlert = 'Undervalued';else
  valuationAlert = 'Fair Value';

  const shortTerm = stock.changePercent > 1 ? 'High' : stock.changePercent > -1 ? 'Medium' : 'Low';
  const midTerm = stock.revenueGrowth > 15 ? 'High' : stock.revenueGrowth > 5 ? 'Medium' : 'Low';
  const longTerm = stock.roe > 15 && stock.revenueGrowth > 8 ? 'High' : stock.roe > 8 ? 'Medium' : 'Low';

  const reasoning = [];
  if (stock.pe < avgPE) reasoning.push(`Trading below sector average P/E (${stock.pe}x vs ${avgPE}x avg) represents value opportunity`);
  if (stock.pe > avgPE * 1.3) reasoning.push(`Premium valuation (${stock.pe}x P/E) vs sector avg ${avgPE}x warrants caution`);
  if (stock.revenueGrowth > 15) reasoning.push(`Strong revenue growth of ${stock.revenueGrowth}% supports bullish thesis`);
  if (stock.profitGrowth > 20) reasoning.push(`Excellent profit growth trajectory enhances earnings outlook`);
  if (stock.profitGrowth < 0) reasoning.push(`Declining profits indicate operational challenges`);
  if (stock.roe > 25) reasoning.push(`Superior ROE indicates efficient capital management`);
  if (stock.debtToEquity > 1) reasoning.push(`High debt levels increase financial risk`);
  if (stock.dividendYield > 2.5) reasoning.push(`Attractive dividend yield provides cushion against downside`);

  if (reasoning.length < 3) reasoning.push(`${stock.sector} sector fundamentals remain intact for long-term growth`);

  return {
    action,
    confidence: score,
    riskScore: risk,
    outlook,
    shortTermSuitability: shortTerm,
    midTermSuitability: midTerm,
    longTermSuitability: longTerm,
    valuationAlert,
    reasoning: reasoning.slice(0, 5)
  };
}

function seededRand(seed) {
  let x = seed === 0 ? 1 : seed;
  x ^= x << 13; x ^= x >> 17; x ^= x << 5;
  return (x >>> 0) / 0xFFFFFFFF;
}

function tickerSeed(ticker) {
  return ticker.split('').reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1), 0);
}

function generateSentiment(stock) {
  const news = getNewsByTicker(stock.ticker);
  const positiveNews = news.filter((n) => n.sentiment === 'positive').length;
  const totalNews = news.length || 1;
  const seed = tickerSeed(stock.ticker || 'STOCK');

  const socialScore = Math.round(positiveNews / totalNews * 60 + (stock.changePercent > 0 ? 20 : 5) + seededRand(seed + 1) * 15);
  const analystRating = Math.round((stock.roe / 5 + stock.revenueGrowth / 3 + (100 - (stock.pe || 50)) / 10) * 10) / 10;
  const confidenceScore = Math.min(95, Math.max(30, Math.round(socialScore * 0.4 + analystRating * 3 + seededRand(seed + 2) * 10)));

  const totalAnalysts = Math.floor(seededRand(seed + 3) * 20) + 15;
  const buyRatio = stock.roe > 15 && stock.revenueGrowth > 10 ? 0.6 : stock.roe > 8 ? 0.4 : 0.25;
  const buyCount = Math.round(totalAnalysts * buyRatio);
  const sellCount = Math.round(totalAnalysts * (1 - buyRatio) * 0.3);
  const holdCount = totalAnalysts - buyCount - sellCount;

  return {
    socialScore: Math.min(100, Math.max(10, socialScore)),
    analystRating: Math.min(5, Math.max(1, Math.round(analystRating * 10) / 10)),
    retailSentiment: stock.changePercent > 0.5 ? 'Bullish' : stock.changePercent < -0.5 ? 'Bearish' : 'Neutral',
    confidenceScore: Math.min(100, Math.max(10, confidenceScore)),
    analystConsensus: buyCount > holdCount + sellCount ? 'Buy' : holdCount > buyCount ? 'Hold' : 'Sell',
    totalAnalysts,
    buyCount,
    holdCount,
    sellCount
  };
}

export function generateAIInsight(stock) {
  return {
    swot: generateSWOT(stock),
    recommendation: generateRecommendation(stock),
    sentiment: generateSentiment(stock)
  };
}