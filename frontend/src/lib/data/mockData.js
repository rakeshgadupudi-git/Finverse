// FinTracker AI — Mock Data for Finance Modules




































export const MOCK_PRICES =



{
  RELIANCE: {
    price: 2687, change: 237, changePct: 9.67, high: 2710, low: 2640, volume: "4.2M",
    history: [2200, 2280, 2350, 2290, 2400, 2450, 2380, 2500, 2560, 2520, 2600, 2650, 2687]
  },
  TCS: {
    price: 4120, change: 220, changePct: 5.64, high: 4160, low: 4050, volume: "2.1M",
    history: [3750, 3800, 3820, 3900, 3950, 3900, 3980, 4000, 4050, 4100, 4080, 4110, 4120]
  },
  INFY: {
    price: 1512, change: -68, changePct: -4.30, high: 1540, low: 1498, volume: "5.8M",
    history: [1650, 1620, 1600, 1580, 1560, 1590, 1540, 1530, 1520, 1510, 1495, 1505, 1512]
  },
  HDFCBANK: {
    price: 1724, change: 104, changePct: 6.42, high: 1740, low: 1700, volume: "7.3M",
    history: [1560, 1580, 1600, 1620, 1650, 1680, 1700, 1690, 1710, 1715, 1720, 1718, 1724]
  },
  ICICIBANK: {
    price: 1052, change: 28, changePct: 2.73, high: 1065, low: 1038, volume: "5.1M",
    history: [950, 960, 975, 990, 1000, 1010, 1020, 1015, 1030, 1040, 1045, 1048, 1052]
  },
  SBIN: {
    price: 628, change: 12, changePct: 1.95, high: 635, low: 618, volume: "8.4M",
    history: [560, 570, 580, 575, 590, 600, 610, 605, 615, 620, 625, 622, 628]
  }
};

export const MOCK_TICKERS = [
{ symbol: "NIFTY 50", price: "23,547", change: "+0.48%", up: true },
{ symbol: "SENSEX", price: "77,813", change: "+0.42%", up: true },
{ symbol: "BANK NIFTY", price: "49,112", change: "−0.18%", up: false },
{ symbol: "USD/INR", price: "84.72", change: "+0.12%", up: false },
{ symbol: "GOLD", price: "₹85,042", change: "+1.20%", up: true },
{ symbol: "CRUDE OIL", price: "$78.40", change: "−0.34%", up: false },
{ symbol: "BTC", price: "$52,140", change: "+3.10%", up: true },
{ symbol: "NIFTY IT", price: "34,562", change: "+0.82%", up: true }];


export const MOCK_NEWS = [
{ id: 1, title: "RBI keeps repo rate unchanged at 6.5%; signals cautious stance on inflation", source: "Economic Times", time: "2h ago", tag: "Policy", read: false },
{ id: 2, title: "Nifty 50 crosses 23,500 mark; IT and banking sectors lead weekly gains", source: "Moneycontrol", time: "4h ago", tag: "Markets", read: false },
{ id: 3, title: "Reliance Industries Q3 profit jumps 18% YoY; beats analyst estimates", source: "Business Standard", time: "6h ago", tag: "Earnings", read: false },
{ id: 4, title: "Mutual fund SIP inflows hit all-time high of ₹26,000 crore in January", source: "Mint", time: "8h ago", tag: "Mutual Funds", read: false },
{ id: 5, title: "Gold prices hit ₹85,000 per 10g amid global uncertainty", source: "NDTV Profit", time: "10h ago", tag: "Commodities", read: false },
{ id: 6, title: "TCS and Infosys hiring plans for FY26 signal IT sector recovery", source: "Hindu Business Line", time: "12h ago", tag: "IT Sector", read: false },
{ id: 7, title: "FII inflows surge to ₹12,000 crore in February; markets rally", source: "Economic Times", time: "1d ago", tag: "Markets", read: false },
{ id: 8, title: "SEBI proposes new framework for algorithmic trading by retail investors", source: "Business Standard", time: "1d ago", tag: "Policy", read: false },
{ id: 9, title: "HDFC Bank net interest margin expands to 4.3% in Q3", source: "Moneycontrol", time: "2d ago", tag: "Earnings", read: false },
{ id: 10, title: "India's forex reserves cross $650 billion; highest in 18 months", source: "Mint", time: "2d ago", tag: "Economy", read: false },
{ id: 11, title: "Nifty Smallcap 100 outperforms; up 3.2% this week", source: "NDTV Profit", time: "3d ago", tag: "Markets", read: false },
{ id: 12, title: "Crude oil dips below $79; brent falls on demand concerns from China", source: "Economic Times", time: "3d ago", tag: "Commodities", read: false }];


export const MOCK_TRANSACTIONS = [
  // ── March 2026 (current month, partial) ──
  { id: 1,  amount: 50000, category: "Others",        type: "income",  description: "Monthly Salary",       date: "2026-03-01" },
  { id: 2,  amount: 12000, category: "Rent",           type: "expense", description: "Monthly Rent",         date: "2026-03-02" },
  { id: 3,  amount: 8000,  category: "Investment",     type: "expense", description: "SIP – Mutual Fund",    date: "2026-03-05" },
  { id: 4,  amount: 3500,  category: "Food",           type: "expense", description: "Groceries & Dining",   date: "2026-03-07" },
  { id: 5,  amount: 1900,  category: "Travel",         type: "expense", description: "Cab & Fuel",           date: "2026-03-12" },
  { id: 6,  amount: 1400,  category: "Utilities",      type: "expense", description: "Electricity & Water",  date: "2026-03-15" },
  { id: 7,  amount: 4000,  category: "Others",         type: "income",  description: "Freelance Payment",    date: "2026-03-18" },
  // ── February 2026 ──
  { id: 8,  amount: 50000, category: "Others",         type: "income",  description: "Monthly Salary",       date: "2026-02-01" },
  { id: 9,  amount: 12000, category: "Rent",           type: "expense", description: "Monthly Rent",         date: "2026-02-02" },
  { id: 10, amount: 8000,  category: "Investment",     type: "expense", description: "SIP – Mutual Fund",    date: "2026-02-06" },
  { id: 11, amount: 2800,  category: "Food",           type: "expense", description: "Groceries & Dining",   date: "2026-02-08" },
  { id: 12, amount: 5000,  category: "Others",         type: "income",  description: "Freelance Project",    date: "2026-02-10" },
  { id: 13, amount: 1800,  category: "Shopping",       type: "expense", description: "Clothing",             date: "2026-02-12" },
  { id: 14, amount: 2200,  category: "Travel",         type: "expense", description: "Weekend Trip",         date: "2026-02-15" },
  { id: 15, amount: 900,   category: "Food",           type: "expense", description: "Food Delivery",        date: "2026-02-18" },
  { id: 16, amount: 3500,  category: "Shopping",       type: "expense", description: "Electronics",          date: "2026-02-22" },
  // ── January 2026 ──
  { id: 17, amount: 50000, category: "Others",         type: "income",  description: "Monthly Salary",       date: "2026-01-01" },
  { id: 18, amount: 12000, category: "Rent",           type: "expense", description: "Monthly Rent",         date: "2026-01-03" },
  { id: 19, amount: 8000,  category: "Investment",     type: "expense", description: "SIP – Mutual Fund",    date: "2026-01-08" },
  { id: 20, amount: 3600,  category: "Food",           type: "expense", description: "Groceries & Dining",   date: "2026-01-10" },
  { id: 21, amount: 4200,  category: "Entertainment",  type: "expense", description: "OTT & Games",          date: "2026-01-15" },
  { id: 22, amount: 1200,  category: "Health",         type: "expense", description: "Pharmacy",             date: "2026-01-20" },
  { id: 23, amount: 1600,  category: "Utilities",      type: "expense", description: "Electricity & Water",  date: "2026-01-25" },
  // ── December 2025 ──
  { id: 24, amount: 55000, category: "Others",         type: "income",  description: "Salary + Year-end Bonus", date: "2025-12-01" },
  { id: 25, amount: 12000, category: "Rent",           type: "expense", description: "Monthly Rent",         date: "2025-12-03" },
  { id: 26, amount: 8000,  category: "Investment",     type: "expense", description: "SIP – Mutual Fund",    date: "2025-12-06" },
  { id: 27, amount: 4800,  category: "Food",           type: "expense", description: "Groceries & Dining",   date: "2025-12-08" },
  { id: 28, amount: 6500,  category: "Shopping",       type: "expense", description: "Year-end Shopping",    date: "2025-12-20" },
  { id: 29, amount: 3200,  category: "Entertainment",  type: "expense", description: "Holiday Dining",       date: "2025-12-25" },
  { id: 30, amount: 1800,  category: "Travel",         type: "expense", description: "Holiday Travel",       date: "2025-12-28" },
  // ── November 2025 ──
  { id: 31, amount: 47000, category: "Others",         type: "income",  description: "Monthly Salary",       date: "2025-11-01" },
  { id: 32, amount: 12000, category: "Rent",           type: "expense", description: "Monthly Rent",         date: "2025-11-03" },
  { id: 33, amount: 8000,  category: "Investment",     type: "expense", description: "SIP – Mutual Fund",    date: "2025-11-08" },
  { id: 34, amount: 2900,  category: "Food",           type: "expense", description: "Groceries & Dining",   date: "2025-11-10" },
  { id: 35, amount: 1500,  category: "Health",         type: "expense", description: "Doctor Visit",         date: "2025-11-18" },
  { id: 36, amount: 1800,  category: "Travel",         type: "expense", description: "Weekend Trip",         date: "2025-11-23" },
  { id: 37, amount: 1200,  category: "Utilities",      type: "expense", description: "Electricity & Water",  date: "2025-11-28" },
  // ── October 2025 ──
  { id: 38, amount: 48000, category: "Others",         type: "income",  description: "Monthly Salary",       date: "2025-10-01" },
  { id: 39, amount: 12000, category: "Rent",           type: "expense", description: "Monthly Rent",         date: "2025-10-03" },
  { id: 40, amount: 8000,  category: "Investment",     type: "expense", description: "SIP – Mutual Fund",    date: "2025-10-08" },
  { id: 41, amount: 3100,  category: "Food",           type: "expense", description: "Groceries & Dining",   date: "2025-10-10" },
  { id: 42, amount: 2400,  category: "Travel",         type: "expense", description: "Cab & Fuel",           date: "2025-10-15" },
  { id: 43, amount: 1600,  category: "Shopping",       type: "expense", description: "Diwali Shopping",      date: "2025-10-20" },
];


export const MOCK_PORTFOLIO = [
{ id: 1, symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", qty: 10, buyPrice: 2450, buyDate: "2025-03-15" },
{ id: 2, symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", qty: 5, buyPrice: 3900, buyDate: "2025-06-20" },
{ id: 3, symbol: "INFY", name: "Infosys Ltd", sector: "IT", qty: 15, buyPrice: 1580, buyDate: "2025-09-10" },
{ id: 4, symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", qty: 20, buyPrice: 1620, buyDate: "2025-04-05" },
{ id: 5, symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", qty: 12, buyPrice: 1024, buyDate: "2025-07-18" },
{ id: 6, symbol: "SBIN", name: "State Bank of India", sector: "Banking", qty: 25, buyPrice: 616, buyDate: "2025-11-25" }];


export const MONTHLY_DATA = [
{ month: "Sep", income: 48000, expenses: 30000 },
{ month: "Oct", income: 50000, expenses: 34000 },
{ month: "Nov", income: 47000, expenses: 28000 },
{ month: "Dec", income: 55000, expenses: 42000 },
{ month: "Jan", income: 50000, expenses: 31000 },
{ month: "Feb", income: 50000, expenses: 33700 }];