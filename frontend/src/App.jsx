'use client';
import { useState } from 'react';
import LandingPage from '@/components/pages/LandingPage';
import AppShell from '@/components/layout/AppShell';

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('fintracker_access_token'));
  const [userName, setUserName] = useState(() => localStorage.getItem('fintracker_username') || 'User');
  const [currency, setCurrency] = useState(() => {
    try {
      const saved = localStorage.getItem('fintracker_settings');
      return saved ? (JSON.parse(saved).currency || 'INR') : 'INR';
    } catch { return 'INR'; }
  });

  const handleLogin = (user) => {
    const name  = (user && user.name)  ? user.name  : 'User';
    const email = (user && user.email) ? user.email : '';
    localStorage.setItem('fintracker_username', name);
    localStorage.setItem('fintracker_useremail', email);
    setUserName(name);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('fintracker_access_token');
    localStorage.removeItem('fintracker_refresh_token');
    localStorage.removeItem('fintracker_username');
    localStorage.removeItem('fintracker_useremail');
    setLoggedIn(false);
  };

  if (!loggedIn) return <LandingPage onLogin={handleLogin} />;
  return <AppShell currency={currency} setCurrency={setCurrency} userName={userName} setUserName={setUserName} onLogout={handleLogout} />;
}
