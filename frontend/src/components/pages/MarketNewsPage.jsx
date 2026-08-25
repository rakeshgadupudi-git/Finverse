'use client';
import { useState, useEffect, useMemo, memo } from 'react';
import { T, NEWS_TAG_COLORS } from '@/lib/tokens';


// ═══════════════════════════════════════════
// SENTIMENT & HELPERS
// ═══════════════════════════════════════════

const SENTIMENT_MAP = {
  Markets: { label: 'Bullish', color: T.accent.teal, icon: '▲' },
  Earnings: { label: 'Bullish', color: T.accent.teal, icon: '▲' },
  'Mutual Funds': { label: 'Bullish', color: T.accent.teal, icon: '▲' },
  'IT Sector': { label: 'Neutral', color: T.accent.blue, icon: '◆' },
  Policy: { label: 'Neutral', color: T.accent.gold, icon: '◆' },
  Economy: { label: 'Neutral', color: T.accent.blue, icon: '◆' },
  Commodities: { label: 'Mixed', color: T.accent.orange, icon: '↕' }
};

const SOURCE_COLORS = {
  'Economic Times': T.accent.teal,
  'Moneycontrol': T.accent.blue,
  'Business Standard': T.accent.purple,
  'Mint': T.accent.gold,
  'NDTV Profit': T.accent.orange,
  'Hindu Business Line': T.accent.danger
};

const readingTime = (title) => Math.max(2, Math.min(5, Math.ceil(title.length / 25)));

// ═══════════════════════════════════════════
// HERO CARD — featured top article
// ═══════════════════════════════════════════

const HeroCard = memo(({ article }) => {
  const sent = SENTIMENT_MAP[article.tag] || { label: 'Neutral', color: T.accent.blue, icon: '◆' };
  const tagColor = NEWS_TAG_COLORS[article.tag] || T.accent.teal;
  const srcColor = SOURCE_COLORS[article.source] || T.accent.blue;

  return (
    <div className="news-hero">
            <div className="news-hero-accent" style={{ background: `linear-gradient(135deg, ${tagColor}20, transparent)` }} />
            <div className="news-hero-content">
                <div className="news-hero-badge-row">
                    <span className="news-tag" style={{ background: `${tagColor}18`, color: tagColor }}>{article.tag}</span>
                    <span className="news-sentiment-badge" style={{ color: sent.color, borderColor: `${sent.color}30` }}>
                        {sent.icon} {sent.label}
                    </span>
                </div>
                <h2 className="news-hero-title">{article.title}</h2>
                <div className="news-meta-row">
                    <span className="news-source">
                        <span className="news-source-dot" style={{ background: srcColor }} />
                        {article.source}
                    </span>
                    <span className="news-meta-sep">·</span>
                    <span>{article.time}</span>
                    <span className="news-meta-sep">·</span>
                    <span>{readingTime(article.title)} min read</span>
                </div>
            </div>
            <div className="news-hero-arrow">→</div>
        </div>);

});

// ═══════════════════════════════════════════
// NEWS ARTICLE CARD
// ═══════════════════════════════════════════

const NewsCard = memo(({ article, isRead }) => {
  const sent = SENTIMENT_MAP[article.tag] || { label: 'Neutral', color: T.accent.blue, icon: '◆' };
  const tagColor = NEWS_TAG_COLORS[article.tag] || T.accent.teal;
  const srcColor = SOURCE_COLORS[article.source] || T.accent.blue;

  return (
    <div className={`news-article ${isRead ? 'news-read' : ''}`}>
            <div className="news-article-body">
                <div className="news-article-title">{article.title}</div>
                <div className="news-meta-row">
                    <span className="news-source">
                        <span className="news-source-dot" style={{ background: srcColor }} />
                        {article.source}
                    </span>
                    <span className="news-meta-sep">·</span>
                    <span>{article.time}</span>
                    <span className="news-meta-sep">·</span>
                    <span>{readingTime(article.title)} min read</span>
                </div>
            </div>
            <div className="news-article-side">
                <span className="news-sentiment-badge" style={{ color: sent.color, borderColor: `${sent.color}30` }}>
                    {sent.icon} {sent.label}
                </span>
                <span className="news-tag" style={{ background: `${tagColor}18`, color: tagColor }}>{article.tag}</span>
            </div>
        </div>);

});

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

export default function MarketNewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('All');
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('fintracker_news_read') || '[]')); }
    catch { return new Set(); }
  });
  const [extraCount, setExtraCount] = useState(0);
  const [lastFilterKey, setLastFilterKey] = useState('');

  useEffect(() => {
    fetch('/api/news?type=market')
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => { setNews(data); setLoading(false); })
      .catch((err) => { console.error('News fetch failed:', err); setLoading(false); });
  }, []);

  const tags = useMemo(() => ['All', ...Array.from(new Set(news.map((n) => n.tag)))], [news]);

  const filtered = useMemo(() => news.filter((n) => {
    if (tagFilter !== 'All' && n.tag !== tagFilter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [news, search, tagFilter]);

  // Reset extra pages when filters change (derived during render, no effect needed)
  const filterKey = `${search}|${tagFilter}`;
  if (filterKey !== lastFilterKey) {
    setExtraCount(0);
    setLastFilterKey(filterKey);
  }
  const visibleCount = 8 + extraCount;

  const heroArticle = filtered[0];
  const restArticles = filtered.slice(1, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleArticleClick = (id) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      try { localStorage.setItem('fintracker_news_read', JSON.stringify([...next])); } catch { /* storage unavailable */ }
      return next;
    });
  };

  // Tag counts
  const tagCounts = useMemo(() => {
    const counts = { All: news.length };
    news.forEach((n) => { counts[n.tag] = (counts[n.tag] || 0) + 1; });
    return counts;
  }, [news]);

  if (loading) return (
    <div className="fade-up news-page">
      <div style={{ color: T.text.secondary, padding: 32, textAlign: 'center' }}>Loading news...</div>
    </div>
  );

  return (
    <div className="fade-up news-page">
            {/* Header */}
            <div className="news-page-header">
                <div>
                    <h1 className="page-title">Market News</h1>
                    <p className="news-page-subtitle">Latest financial news & analysis · {filtered.length} articles</p>
                </div>
                <div className="news-live-badge">
                    <span className="news-live-dot" />
                    Live Feed
                </div>
            </div>

            {/* Search + Filters */}
            <div className="news-controls">
                <div className="news-search-wrap">
                    <span className="news-search-icon">⌕</span>
                    <input
            className="news-search-input"
            placeholder="Search news..."
            value={search}
            onChange={(e) => setSearch(e.target.value)} />
          
                    {search &&
          <button className="news-search-clear" onClick={() => setSearch('')}>✕</button>
          }
                </div>
                <div className="news-filters">
                    {tags.map((tag) =>
          <button
            key={tag}
            className={`news-filter-pill ${tagFilter === tag ? 'active' : ''}`}
            onClick={() => setTagFilter(tag)}>
            
                            {tag}
                            <span className="news-filter-count">{tagCounts[tag] || 0}</span>
                        </button>
          )}
                </div>
            </div>

            {/* Hero */}
            {heroArticle &&
      <div onClick={() => handleArticleClick(heroArticle.id)} style={{ cursor: 'pointer' }}>
                    <HeroCard article={heroArticle} />
                </div>
      }

            {/* Articles Grid */}
            {restArticles.length > 0 ?
      <>
                    <div className="news-grid">
                        {restArticles.map((n) =>
          <div key={n.id} onClick={() => handleArticleClick(n.id)} style={{ cursor: 'pointer' }}>
                                <NewsCard article={n} isRead={readIds.has(n.id)} />
                            </div>
          )}
                    </div>
                    {hasMore && <div style={{ textAlign: 'center', paddingTop: 4 }}>
                        <button className="secondary-btn" onClick={() => setExtraCount((v) => v + 8)}>Load More</button>
                    </div>}
                </> :
      filtered.length === 0 ?
      <div className="news-empty">
                    <div className="news-empty-icon">📰</div>
                    <div className="news-empty-title">No articles found</div>
                    <div className="news-empty-desc">Try adjusting your search or filter</div>
                </div> :
      null}
        </div>);

}