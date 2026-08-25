import fetch from 'node-fetch';
import cron from 'node-cron';


const CATEGORY_TO_TAG = {
  business: 'Markets',
  top: 'Markets',
  technology: 'IT Sector',
  politics: 'Policy',
  economy: 'Economy',
  science: 'Markets',
  entertainment: 'Markets',
  sports: 'Markets',
  health: 'Markets',
  world: 'Markets',
};

const MOCK_FALLBACK = [
  {
    id: '1', title: 'Sensex Rallies 500 Points on Strong FII Inflows',
    summary: 'Indian markets surged on the back of strong foreign institutional investor buying across sectors.',
    source: 'Economic Times', date: '2026-02-20', time: '2d ago',
    sentiment: 'positive', tag: 'Markets', category: 'market',
    aiSummary: 'Markets showed strength with FII inflows driving broad-based rally. Banking and IT sectors led gains.'
  },
  {
    id: '2', title: 'RBI Holds Repo Rate Steady at 6.5%',
    summary: 'The Reserve Bank of India maintained its benchmark lending rate, citing stable inflation outlook.',
    source: 'Mint', date: '2026-02-19', time: '3d ago',
    sentiment: 'neutral', tag: 'Economy', category: 'economy',
    aiSummary: 'RBI kept rates unchanged as expected. Accommodative stance suggests potential future cuts if inflation remains contained.'
  },
  {
    id: '3', title: 'IT Sector Faces Headwinds as US Spending Slows',
    summary: 'Major Indian IT companies may see slower revenue growth amid cautious US enterprise spending.',
    source: 'Business Standard', date: '2026-02-18', time: '4d ago',
    sentiment: 'negative', tag: 'IT Sector', category: 'sector',
    aiSummary: 'US tech spending cuts could impact Indian IT giants. TCS, Infosys, and Wipro may revise guidance downward.'
  },
  {
    id: '4', title: 'Reliance Jio Announces 5G Expansion to Tier-3 Cities',
    summary: 'Reliance Jio is expanding its 5G network coverage to over 500 tier-3 cities across India.',
    source: 'NDTV Profit', date: '2026-02-20', time: '2d ago',
    ticker: 'RELIANCE', sentiment: 'positive', tag: 'Markets', category: 'company',
    aiSummary: "Jio's aggressive 5G expansion strengthens Reliance's telecom dominance. Revenue upside potential from new markets."
  },
  {
    id: '5', title: 'TCS Wins $2 Billion Deal from European Bank',
    summary: 'TCS bags a landmark multi-year digital transformation contract from a top European financial institution.',
    source: 'Moneycontrol', date: '2026-02-19', time: '3d ago',
    ticker: 'TCS', sentiment: 'positive', tag: 'IT Sector', category: 'company',
    aiSummary: 'Mega deal win boosts TCS order book significantly. Strong pipeline visibility for next 2-3 years.'
  },
  {
    id: '6', title: 'HDFC Bank Posts 18% Growth in Q3 Net Profit',
    summary: 'HDFC Bank reported strong quarterly results with net profit rising 18% year-on-year.',
    source: 'Financial Express', date: '2026-02-17', time: '5d ago',
    ticker: 'HDFCBANK', sentiment: 'positive', tag: 'Markets', category: 'company',
    aiSummary: 'Robust earnings beat estimates. Asset quality remains strong with improving NIM. Integration synergies visible.'
  },
  {
    id: '7', title: 'Crude Oil Prices Drop Below $70, Boosting Indian Sentiment',
    summary: "Brent crude fell below $70 per barrel, providing relief to India's current account deficit concerns.",
    source: 'Bloomberg Quint', date: '2026-02-14', time: '8d ago',
    sentiment: 'positive', tag: 'Commodities', category: 'market',
    aiSummary: 'Lower crude prices benefit India as a net importer. OMCs and airlines see margin upside. Positive for INR.'
  },
  {
    id: '8', title: 'Government Announces PLI Scheme for Semiconductor Manufacturing',
    summary: 'India plans to invest ₹76,000 crore in domestic semiconductor manufacturing under an expanded PLI scheme.',
    source: 'The Hindu Business Line', date: '2026-02-15', time: '7d ago',
    sentiment: 'positive', tag: 'Policy', category: 'economy',
    aiSummary: 'Semiconductor PLI scheme benefits electronics manufacturers. Dixon Technologies and Tata Electronics are key beneficiaries.'
  },
];

let newsCache = [];

function relativeTime(pubDateStr) {
  const diffMs = Date.now() - new Date(pubDateStr).getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function mapArticle(raw, index) {
  const cat = raw.category?.[0] || 'business';
  return {
    id: raw.article_id || String(index + 1),
    title: raw.title || '',
    summary: raw.description || raw.title || '',
    source: raw.source_name || 'Unknown',
    date: raw.pubDate ? raw.pubDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    time: raw.pubDate ? relativeTime(raw.pubDate) : 'Recently',
    sentiment: raw.sentiment || 'neutral',
    tag: CATEGORY_TO_TAG[cat] || 'Markets',
    category: cat,
    tags: Array.isArray(raw.keywords) ? raw.keywords.slice(0, 3) : [],
    url: raw.link || '',
  };
}

export async function fetchAndCacheNews() {
  const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
  if (!NEWSDATA_API_KEY) {
    console.warn('[News] NEWSDATA_API_KEY not set, using mock data');
    return;
  }
  const API_URL = `https://newsdata.io/api/1/latest?apikey=${NEWSDATA_API_KEY}&category=business&q=stock+market+OR+finance+OR+investing+OR+sensex+OR+nifty+OR+economy+OR+earnings+OR+IPO&language=en`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeout);
    const json = await res.json();
    if (json.status === 'success' && json.results?.length) {
      const FINANCE_KEYWORDS = ['stock', 'market', 'finance', 'invest', 'sensex', 'nifty', 'bse', 'nse', 'economy', 'earnings', 'ipo', 'share', 'trade', 'fund', 'bank', 'equity', 'profit', 'revenue', 'gdp', 'inflation', 'rate', 'rupee', 'rbi', 'sebi', 'dividend'];
      const isFinanceArticle = (raw) => {
        const text = `${raw.title || ''} ${raw.description || ''} ${(raw.keywords || []).join(' ')}`.toLowerCase();
        return FINANCE_KEYWORDS.some((kw) => text.includes(kw));
      };
      newsCache = json.results.filter(isFinanceArticle).map(mapArticle);
      console.log(`[News] Cached ${newsCache.length} finance articles from NewsData.io`);
    } else {
      console.warn('[News] API returned no results:', json.message || json.status);
    }
  } catch (err) {
    console.error('[News] Fetch failed, using existing cache:', err.message);
  }
}

export function initNewsService() {
  fetchAndCacheNews();
  cron.schedule('0 7 * * *', () => {
    console.log('[News] Running scheduled morning fetch...');
    fetchAndCacheNews();
  });
  console.log('[News] Service initialized — cron scheduled at 07:00 daily');
}

export function getAllNews() {
  return newsCache.length ? newsCache : MOCK_FALLBACK;
}

export function getNewsByTicker(ticker) {
  return getAllNews().filter((n) => n.ticker === ticker || !n.ticker);
}

export function getMarketNews() {
  return getAllNews().filter((n) => ['market', 'economy', 'business', 'top'].includes(n.category));
}

export function getNewsBySentiment(sentiment) {
  return getAllNews().filter((n) => n.sentiment === sentiment);
}
