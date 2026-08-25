'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════
   TYPES & ENUMS
   ═══════════════════════════════════════════ */



































const DEFAULT_SETTINGS = {
  theme: 'dark',
  currency: 'INR',
  language: 'en',
  notifications: {
    monthlyReport: true,
    budgetAlerts: true,
    stockNews: true,
    priceAlerts: false,
    aiInsights: true,
    watchlistAlerts: false,
    marketOpenClose: false
  },
  financial: {
    riskTolerance: 'balanced',
    aiMode: 'balanced',
    investmentHorizon: 'medium',
    stockStyle: 'blend',
    smartBudgeting: true,
    behavioralInsights: true,
    autoSipReminders: false
  }
};

/* ═══════════════════════════════════════════
   TOAST SYSTEM
   ═══════════════════════════════════════════ */






/* ═══════════════════════════════════════════
   CONTEXT
   ═══════════════════════════════════════════ */











const Ctx = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

/* ═══════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════ */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('fintracker_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });
  const [toasts, setToasts] = useState([]);

  // Persist to localStorage whenever settings change
  useEffect(() => {
    try { localStorage.setItem('fintracker_settings', JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  const update = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateNested = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
  }, []);

  const updateFinancial = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, financial: { ...prev.financial, [key]: value } }));
  }, []);

  const resetAll = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('fintracker_settings');
  }, []);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ settings, update, updateNested, updateFinancial, resetAll, toasts, toast, dismissToast }}>
            {children}
        </Ctx.Provider>);

}