'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

import { searchStocks } from '@/lib/data/stockData';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();
  const searchRef = useRef(null);

  useEffect(() => {
    if (query.length >= 1) {
      const res = searchStocks(query).slice(0, 6);
      setResults(res);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (ticker) => {
    setQuery('');
    setShowResults(false);
    router.push(`/stock/${ticker}`);
  };

  return (
    <header className="app-header">
            <div ref={searchRef} className="header-search-container">
                <div className="header-search">
                    <Search size={16} className="header-search-icon" />
                    <input
            type="text"
            placeholder="Search stocks... (e.g., Reliance, TCS)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="header-search-input" />
          
                </div>
                {showResults && results.length > 0 &&
        <div className="search-dropdown">
                        {results.map((stock) =>
          <button
            key={stock.ticker}
            onClick={() => handleSelect(stock.ticker)}
            className="search-result-item">
            
                                <div className="search-result-left">
                                    <span className="search-result-ticker">{stock.ticker}</span>
                                    <span className="search-result-name">{stock.name}</span>
                                </div>
                                <div className="search-result-right">
                                    <span className="search-result-price">₹{stock.price.toLocaleString()}</span>
                                    <span className={`search-result-change ${stock.changePercent >= 0 ? 'positive' : 'negative'}`}>
                                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                    </span>
                                </div>
                            </button>
          )}
                    </div>
        }
            </div>

            <div className="header-actions">
                <button className="header-icon-btn" aria-label="Notifications">
                    <Bell size={18} />
                    <span className="notification-dot" />
                </button>
                <button onClick={toggleTheme} className="header-icon-btn" aria-label="Toggle theme">
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </header>);

}