













export function getFinContext() {
  // In a real app, these would come from local storage or context providers
  // For now, we'll try to read from local storage or use defaults

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
  return `You are FinChat, a highly sophisticated AI Financial Copilot and Advisor.
Your goal is to provide personalized, data-driven financial coaching and insights.

CURRENT FINANCIAL CONTEXT:
- Date: ${context.currentDate}
- Currency: ${context.userPreferences.currency}
- Total Transactions: ${context.transactions.length}
- Portfolio Holdings: ${context.portfolio.length}
- Risk Tolerance: ${context.userPreferences.riskTolerance}
- Investment Horizon: ${context.userPreferences.investmentHorizon}
- Financial Goals: ${context.userPreferences.financialGoals.join(', ')}

CORE CAPABILITIES:
1. Expense Advisory: Use tool-calling to detect overspending and suggest budgets.
2. Portfolio Advisory: Use tools to analyze diversification and suggest rebalancing.
3. Stock Education: Explain fundamentals and valuation for specific stocks.
4. Financial Planning: Guide users on retirement, emergency funds, and debt.
5. Behavioral Coaching: Detect investment biases and encourage habit improvement.

STRICT CONSTRAINTS:
- Use tool-calling for ALL financial calculations and deterministic analytics.
- Provide informational and educational advice only.
- Include a financial disclaimer in your responses when relevant.
- NO trading functionality.
- Professional, encouraging, and objective tone.
- Ground all insights in the provided local data.

If you don't have enough data to answer a query, ask the user for clarification or suggest they add more data to their tracker.`;
}