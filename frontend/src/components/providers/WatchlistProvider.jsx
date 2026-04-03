'use client';

import React from 'react';









const WatchlistContext = React.createContext({
  watchlist: [],
  addToWatchlist: () => {},
  removeFromWatchlist: () => {},
  isInWatchlist: () => false
});

export function useWatchlist() {
  return React.useContext(WatchlistContext);
}

export function WatchlistProvider({ children }) {
  const [watchlist, setWatchlist] = React.useState([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('stockinsight-watchlist');
    if (saved) setWatchlist(JSON.parse(saved));
  }, []);

  React.useEffect(() => {
    if (mounted) {
      localStorage.setItem('stockinsight-watchlist', JSON.stringify(watchlist));
    }
  }, [watchlist, mounted]);

  const addToWatchlist = (ticker) => {
    if (!watchlist.find((w) => w.ticker === ticker)) {
      setWatchlist((prev) => [...prev, { ticker, addedAt: new Date().toISOString() }]);
    }
  };

  const removeFromWatchlist = (ticker) => {
    setWatchlist((prev) => prev.filter((w) => w.ticker !== ticker));
  };

  const isInWatchlist = (ticker) => {
    return watchlist.some((w) => w.ticker === ticker);
  };

  return (
    <WatchlistContext.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }}>
            {children}
        </WatchlistContext.Provider>);

}