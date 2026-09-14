





const PREFS_KEY = 'finchat_preferences';

function getMemoryKey() {
  const email = (typeof window !== 'undefined' && localStorage.getItem('fintracker_useremail')) || 'default';
  return `finchat_history_${email}`;
}

export function saveMessage(message) {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  history.push(message);
  // Keep only last 50 messages to save space
  localStorage.setItem(getMemoryKey(), JSON.stringify(history.slice(-50)));
}

export function getHistory() {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(getMemoryKey());
  return stored ? JSON.parse(stored) : [];
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getMemoryKey());
}

// Call on logout to wipe the current user's chat history
export function clearAllUserHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getMemoryKey());
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