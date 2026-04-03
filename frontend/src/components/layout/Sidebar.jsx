'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,

  Newspaper,
  Star,
  Compass,
  TrendingUp,
  Menu,
  X,
  BarChart3 } from
'lucide-react';

const navItems = [
{ href: '/', label: 'Dashboard', icon: LayoutDashboard },
{ href: '/discover', label: 'Discover', icon: Compass },
{ href: '/news', label: 'News', icon: Newspaper },
{ href: '/watchlist', label: 'Watchlist', icon: Star }];


export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
            {/* Mobile toggle */}
            <button
        onClick={() => setMobileOpen(true)}
        className="sidebar-mobile-toggle"
        aria-label="Open menu">
        
                <Menu size={22} />
            </button>

            {/* Overlay */}
            {mobileOpen &&
      <div
        className="sidebar-overlay"
        onClick={() => setMobileOpen(false)} />

      }

            {/* Sidebar */}
            <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h1 className="sidebar-title">StockInsight</h1>
                            <span className="sidebar-subtitle">India</span>
                        </div>
                    </div>
                    <button
            onClick={() => setMobileOpen(false)}
            className="sidebar-close">
            
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
                
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </Link>);

          })}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-disclaimer">
                        <BarChart3 size={14} />
                        <span>For research only.<br />Not financial advice.</span>
                    </div>
                </div>
            </aside>
        </>);

}