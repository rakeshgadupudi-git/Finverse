













export function getFinContext() {
  let transactions = [];
  let portfolio = [];
  let preferences = {
    currency: 'INR',
    riskTolerance: 'Medium',
    investmentHorizon: '5-10 years',
    financialGoals: ['Wealth Creation', 'Emergency Fund']
  };

  if (typeof window !== 'undefined') {
    const storedTx = localStorage.getItem('fin_transactions');
    if (storedTx) transactions = JSON.parse(storedTx);

    const storedPortfolio = localStorage.getItem('fintracker_portfolio_holdings');
    if (storedPortfolio) portfolio = JSON.parse(storedPortfolio);

    // Sync with live settings from SettingsContext
    try {
      const savedSettings = localStorage.getItem('fintracker_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.currency) preferences.currency = parsed.currency;
        if (parsed.financial) {
          const riskMap = { conservative: 'Low', balanced: 'Medium', aggressive: 'High' };
          const horizonMap = { short: '1-3 years', medium: '5-10 years', long: '10+ years' };
          if (parsed.financial.riskTolerance) {
            preferences.riskTolerance = riskMap[parsed.financial.riskTolerance] || parsed.financial.riskTolerance;
          }
          if (parsed.financial.investmentHorizon) {
            preferences.investmentHorizon = horizonMap[parsed.financial.investmentHorizon] || parsed.financial.investmentHorizon;
          }
        }
      }
    } catch { /* ignore parse errors */ }

    const storedPrefs = localStorage.getItem('fin_preferences');
    if (storedPrefs) preferences = { ...preferences, ...JSON.parse(storedPrefs) };
  }

  return {
    transactions,
    portfolio,
    userPreferences: preferences,
    currentDate: new Date().toISOString().split('T')[0]
  };
}

export function getSystemPrompt(context) {
  const txSnippet = context.transactions.length > 0
    ? JSON.stringify(context.transactions.slice(-30))
    : 'No transactions recorded yet.';

  const portfolioSnippet = context.portfolio.length > 0
    ? JSON.stringify(context.portfolio)
    : 'No portfolio holdings recorded yet.';

  return `You are FinChat, a highly sophisticated AI Financial Copilot and Advisor.
Your goal is to provide personalized, data-driven financial coaching and insights.

CURRENT FINANCIAL CONTEXT:
- Date: ${context.currentDate}
- Currency: ${context.userPreferences.currency}
- Risk Tolerance: ${context.userPreferences.riskTolerance}
- Investment Horizon: ${context.userPreferences.investmentHorizon}
- Financial Goals: ${context.userPreferences.financialGoals.join(', ')}

USER TRANSACTIONS (last 30, JSON):
${txSnippet}

USER PORTFOLIO HOLDINGS (JSON):
${portfolioSnippet}

CORE CAPABILITIES:
1. Expense Advisory: Analyze spending, detect overspending, and suggest budgets from the transaction data above.
2. Portfolio Advisory: Use tools for diversification analysis and rebalancing suggestions.
3. Stock Education: Explain fundamentals and valuation for specific stocks (use getStockAnalysis tool).
4. Financial Planning: Guide on retirement, emergency funds, and debt.
5. Behavioral Coaching: Detect investment biases and encourage habit improvement.

STRICT CONSTRAINTS:
- For computed analytics (portfolio metrics, projections), use tool-calling.
- For questions answerable from the raw data above, answer directly.
- Provide informational and educational advice only. Include disclaimers.
- NO trading functionality. Professional, encouraging, objective tone.
- If data is missing, ask the user to add transactions or portfolio holdings.`;
}