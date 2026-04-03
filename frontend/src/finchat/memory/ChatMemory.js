





const MEMORY_KEY = 'finchat_history';
const PREFS_KEY = 'finchat_preferences';

export function saveMessage(message) {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  history.push(message);
  // Keep only last 50 messages to save space
  localStorage.setItem(MEMORY_KEY, JSON.stringify(history.slice(-50)));
}

export function getHistory() {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(MEMORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MEMORY_KEY);
}

export function saveFinPrefs(prefs) {
  if (typeof window === 'undefined') return;
  const current = getFinPrefs();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}

export function getFinPrefs() {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(PREFS_KEY);
  return stored ? JSON.parse(stored) : {
    riskTolerance: 'Medium',
    investmentHorizon: '5-10 years',
    financialGoals: ['Wealth Creation', 'Emergency Fund']
  };
}