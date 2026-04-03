import {
  calculateHealthScore,
  calculateDiversification,
  calculateConcentration,
  enrichHoldings,
  calculatePredictiveAnalytics } from
'./portfolioAnalyticsEngine.js';
import {
  calcHealthScore,
  detectAnomalies,
  calcBudgets } from
'./financeEngine.js';
import { generateAIInsight } from './aiEngine.js';
import { MOCK_PRICES } from './mockData.js';


import { stocks } from './stockData.js';

export const financialTools = {
  getPortfolioMetrics: (_args, userData = {}) => {
    const portfolio = userData.portfolio || [];
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

  getExpenseInsights: (_args, userData = {}) => {
    const transactions = userData.transactions || [];
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

  getStockAnalysis: ({ ticker } = {}, _userData) => {
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

  getFinancialProjections: ({ months = 12 } = {}, userData = {}) => {
    const portfolio = userData.portfolio || [];
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