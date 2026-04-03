import {
  calculateHealthScore,
  calculateDiversification,
  calculateConcentration,
  enrichHoldings,
  calculatePredictiveAnalytics } from
'@/lib/portfolioAnalyticsEngine';
import {
  calcHealthScore,
  detectAnomalies,
  calcBudgets } from
'@/lib/financeEngine';
import { generateAIInsight } from '@/lib/ai/aiEngine';
import { MOCK_PRICES } from '@/lib/data/mockData';


import { stocks } from '@/lib/data/stockData';

// Helper to get raw data for tools
function getLocalData() {
  let transactions = [];
  let portfolio = [];

  if (typeof window !== 'undefined') {
    const storedTx = localStorage.getItem('fin_transactions');
    if (storedTx) transactions = JSON.parse(storedTx);
    const storedPortfolio = localStorage.getItem('fin_portfolio');
    if (storedPortfolio) portfolio = JSON.parse(storedPortfolio);
  }

  return { transactions, portfolio };
}

export const financialTools = {
  getPortfolioMetrics: () => {
    const { portfolio } = getLocalData();
    if (portfolio.length === 0) return { error: "No portfolio holdings found." };

    const enriched = enrichHoldings(portfolio, MOCK_PRICES, MOCK_PRICES);
    const health = calculateHealthScore(enriched, 12.5, 1.0);
    const diversification = calculateDiversification(enriched);
    const concentration = calculateConcentration(enriched);

    return {
      healthScore: health.score,
      healthGrade: health.grade,
      healthFactors: health.factors,
      diversificationScore: diversification.score,
      diversificationGrade: diversification.grade,
      concentrationLevel: concentration.level,
      maxWeight: concentration.maxWeight,
      maxWeightSymbol: concentration.maxWeightSymbol
    };
  },

  getExpenseInsights: () => {
    const { transactions } = getLocalData();
    if (transactions.length === 0) return { error: "No transactions found." };

    const health = calcHealthScore(transactions);
    const anomalies = detectAnomalies(transactions);
    const budgets = calcBudgets(transactions);

    return {
      financialHealthScore: health.score,
      grade: health.grade,
      anomalies: anomalies.map((a) => a.message),
      budgetStatus: budgets.map((b) => ({
        category: b.category,
        spent: b.spent,
        suggested: b.suggested,
        status: b.status
      }))
    };
  },

  getStockAnalysis: (ticker) => {
    const stock = stocks.find((s) => s.ticker === ticker);
    if (!stock) return { error: `Stock with ticker ${ticker} not found.` };

    const insight = generateAIInsight(stock);
    return {
      ticker: stock.ticker,
      name: stock.name,
      recommendation: insight.recommendation.action,
      confidence: insight.recommendation.confidence,
      valuation: insight.recommendation.valuationAlert,
      swot: insight.swot,
      reasoning: insight.recommendation.reasoning
    };
  },

  getFinancialProjections: (months = 12) => {
    const { portfolio } = getLocalData();
    if (portfolio.length === 0) return { error: "No portfolio found for projections." };

    const enriched = enrichHoldings(portfolio, MOCK_PRICES, MOCK_PRICES);
    const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);
    const projections = calculatePredictiveAnalytics(totalValue, 12, 12.5, months);

    return {
      currentValue: totalValue,
      projectionMonths: months,
      expectedValue: projections.futureValueP50,
      downsideRisk: projections.downsideRisk,
      worstCaseScenario: projections.worstCase,
      var95: projections.var95
    };
  }
};

export const toolDefinitions = [
{
  name: "getPortfolioMetrics",
  description: "Get detailed portfolio performance, health, diversification, and concentration metrics.",
  parameters: { type: "object", properties: {} }
},
{
  name: "getExpenseInsights",
  description: "Get analysis of spending habits, budget status, and detected anomalies in transactions.",
  parameters: { type: "object", properties: {} }
},
{
  name: "getStockAnalysis",
  description: "Get comprehensive AI-driven analysis for a specific stock ticker, including SWOT and recommendation.",
  parameters: {
    type: "object",
    properties: {
      ticker: { type: "string", description: "The stock ticker symbol (e.g., RELIANCE, TCS)." }
    },
    required: ["ticker"]
  }
},
{
  name: "getFinancialProjections",
  description: "Calculate future portfolio value projections based on current holdings and historical volatility.",
  parameters: {
    type: "object",
    properties: {
      months: { type: "number", description: "Number of months to project into the future." }
    }
  }
}];