

function generatePriceHistory(basePrice, volatility, trend) {
  const points = [];
  let price = basePrice * 0.6;
  const now = new Date();
  for (let i = 1825; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const noise = (Math.random() - 0.5) * volatility * price;
    const trendComponent = trend * price * 0.0002;
    price = Math.max(price * 0.5, price + noise + trendComponent);
    points.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price * 100) / 100,
      volume: Math.floor(Math.random() * 10000000) + 1000000
    });
  }
  // Normalize last price to basePrice
  const scale = basePrice / points[points.length - 1].price;
  return points.map((p) => ({ ...p, price: Math.round(p.price * scale * 100) / 100 }));
}

function generateRevenueHistory(base, growth) {
  const years = ['FY19', 'FY20', 'FY21', 'FY22', 'FY23', 'FY24'];
  let val = base;
  return years.map((year) => {
    const entry = { year, value: Math.round(val) };
    val *= 1 + growth / 100 + (Math.random() - 0.3) * 0.05;
    return entry;
  });
}

function generateProfitHistory(base, growth) {
  const years = ['FY19', 'FY20', 'FY21', 'FY22', 'FY23', 'FY24'];
  let val = base;
  return years.map((year) => {
    const entry = { year, value: Math.round(val) };
    val *= 1 + growth / 100 + (Math.random() - 0.3) * 0.08;
    return entry;
  });
}

function generateHoldingHistory(promoter, inst) {
  const quarters = ['Q1 FY23', 'Q2 FY23', 'Q3 FY23', 'Q4 FY23', 'Q1 FY24', 'Q2 FY24', 'Q3 FY24', 'Q4 FY24'];
  return quarters.map((quarter) => {
    const p = promoter + (Math.random() - 0.5) * 2;
    const i = inst + (Math.random() - 0.5) * 3;
    const r = 100 - p - i;
    return {
      quarter,
      promoter: Math.round(p * 10) / 10,
      institutional: Math.round(i * 10) / 10,
      retail: Math.round(r * 10) / 10
    };
  });
}

export const stocks = [
{
  ticker: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Energy', industry: 'Oil & Gas - Refining',
  price: 2456.75, change: 34.25, changePercent: 1.41, marketCap: 1662000, capCategory: 'Large Cap',
  pe: 28.5, eps: 86.2, revenueGrowth: 18.3, profitGrowth: 22.1, debtToEquity: 0.39,
  roe: 9.8, roce: 11.2, dividendYield: 0.32, promoterHolding: 50.3, institutionalHolding: 34.2, retailHolding: 15.5,
  weekHigh52: 2856, weekLow52: 2180, avgVolume: 12500000, bookValue: 1145, faceValue: 10,
  priceHistory: generatePriceHistory(2456.75, 0.018, 0.8),
  revenueHistory: generateRevenueHistory(550000, 15),
  profitHistory: generateProfitHistory(65000, 18),
  holdingHistory: generateHoldingHistory(50.3, 34.2)
},
{
  ticker: 'TCS', name: 'Tata Consultancy Services Ltd', sector: 'IT', industry: 'IT Services',
  price: 3842.30, change: -18.90, changePercent: -0.49, marketCap: 1406000, capCategory: 'Large Cap',
  pe: 32.1, eps: 119.7, revenueGrowth: 12.5, profitGrowth: 10.8, debtToEquity: 0.05,
  roe: 48.2, roce: 62.8, dividendYield: 1.24, promoterHolding: 72.3, institutionalHolding: 20.1, retailHolding: 7.6,
  weekHigh52: 4250, weekLow52: 3310, avgVolume: 3200000, bookValue: 285, faceValue: 1,
  priceHistory: generatePriceHistory(3842.30, 0.014, 0.5),
  revenueHistory: generateRevenueHistory(220000, 12),
  profitHistory: generateProfitHistory(42000, 10),
  holdingHistory: generateHoldingHistory(72.3, 20.1)
},
{
  ticker: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking', industry: 'Private Bank',
  price: 1678.45, change: 12.60, changePercent: 0.76, marketCap: 1280000, capCategory: 'Large Cap',
  pe: 19.8, eps: 84.8, revenueGrowth: 25.2, profitGrowth: 20.3, debtToEquity: 0, roe: 16.9, roce: 0,
  dividendYield: 1.15, promoterHolding: 26.0, institutionalHolding: 55.2, retailHolding: 18.8,
  weekHigh52: 1880, weekLow52: 1400, avgVolume: 9800000, bookValue: 550, faceValue: 1,
  priceHistory: generatePriceHistory(1678.45, 0.016, 0.7),
  revenueHistory: generateRevenueHistory(180000, 22),
  profitHistory: generateProfitHistory(45000, 18),
  holdingHistory: generateHoldingHistory(26.0, 55.2)
},
{
  ticker: 'INFY', name: 'Infosys Ltd', sector: 'IT', industry: 'IT Services',
  price: 1524.80, change: -8.35, changePercent: -0.54, marketCap: 632000, capCategory: 'Large Cap',
  pe: 27.3, eps: 55.9, revenueGrowth: 8.2, profitGrowth: 6.9, debtToEquity: 0.08,
  roe: 31.5, roce: 39.8, dividendYield: 2.35, promoterHolding: 14.8, institutionalHolding: 62.3, retailHolding: 22.9,
  weekHigh52: 1740, weekLow52: 1280, avgVolume: 8200000, bookValue: 192, faceValue: 5,
  priceHistory: generatePriceHistory(1524.80, 0.015, 0.4),
  revenueHistory: generateRevenueHistory(140000, 9),
  profitHistory: generateProfitHistory(25000, 7),
  holdingHistory: generateHoldingHistory(14.8, 62.3)
},
{
  ticker: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking', industry: 'Private Bank',
  price: 1052.30, change: 8.75, changePercent: 0.84, marketCap: 740000, capCategory: 'Large Cap',
  pe: 17.2, eps: 61.2, revenueGrowth: 22.8, profitGrowth: 28.5, debtToEquity: 0, roe: 17.8, roce: 0,
  dividendYield: 0.95, promoterHolding: 0, institutionalHolding: 72.5, retailHolding: 27.5,
  weekHigh52: 1180, weekLow52: 850, avgVolume: 12000000, bookValue: 380, faceValue: 2,
  priceHistory: generatePriceHistory(1052.30, 0.017, 0.9),
  revenueHistory: generateRevenueHistory(120000, 20),
  profitHistory: generateProfitHistory(35000, 25),
  holdingHistory: generateHoldingHistory(0, 72.5)
},
{
  ticker: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', sector: 'FMCG', industry: 'Personal Care',
  price: 2345.60, change: -5.20, changePercent: -0.22, marketCap: 551000, capCategory: 'Large Cap',
  pe: 55.8, eps: 42.0, revenueGrowth: 5.2, profitGrowth: 3.8, debtToEquity: 0,
  roe: 22.1, roce: 30.5, dividendYield: 1.62, promoterHolding: 61.9, institutionalHolding: 25.4, retailHolding: 12.7,
  weekHigh52: 2720, weekLow52: 2170, avgVolume: 2100000, bookValue: 42, faceValue: 1,
  priceHistory: generatePriceHistory(2345.60, 0.012, 0.2),
  revenueHistory: generateRevenueHistory(58000, 5),
  profitHistory: generateProfitHistory(10000, 4),
  holdingHistory: generateHoldingHistory(61.9, 25.4)
},
{
  ticker: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecom', industry: 'Telecom Services',
  price: 1542.90, change: 22.30, changePercent: 1.47, marketCap: 920000, capCategory: 'Large Cap',
  pe: 75.2, eps: 20.5, revenueGrowth: 14.8, profitGrowth: 45.2, debtToEquity: 1.82,
  roe: 18.5, roce: 14.2, dividendYield: 0.52, promoterHolding: 55.1, institutionalHolding: 33.2, retailHolding: 11.7,
  weekHigh52: 1680, weekLow52: 1050, avgVolume: 5500000, bookValue: 215, faceValue: 5,
  priceHistory: generatePriceHistory(1542.90, 0.02, 1.2),
  revenueHistory: generateRevenueHistory(140000, 14),
  profitHistory: generateProfitHistory(8000, 40),
  holdingHistory: generateHoldingHistory(55.1, 33.2)
},
{
  ticker: 'ITC', name: 'ITC Ltd', sector: 'FMCG', industry: 'Tobacco & FMCG',
  price: 438.55, change: 2.15, changePercent: 0.49, marketCap: 548000, capCategory: 'Large Cap',
  pe: 26.1, eps: 16.8, revenueGrowth: 8.9, profitGrowth: 12.5, debtToEquity: 0,
  roe: 28.5, roce: 36.2, dividendYield: 3.15, promoterHolding: 0, institutionalHolding: 52.8, retailHolding: 47.2,
  weekHigh52: 500, weekLow52: 390, avgVolume: 15000000, bookValue: 72, faceValue: 1,
  priceHistory: generatePriceHistory(438.55, 0.013, 0.6),
  revenueHistory: generateRevenueHistory(62000, 9),
  profitHistory: generateProfitHistory(18000, 12),
  holdingHistory: generateHoldingHistory(0, 52.8)
},
{
  ticker: 'SBIN', name: 'State Bank of India', sector: 'Banking', industry: 'Public Bank',
  price: 628.45, change: 5.80, changePercent: 0.93, marketCap: 561000, capCategory: 'Large Cap',
  pe: 9.8, eps: 64.1, revenueGrowth: 18.9, profitGrowth: 35.2, debtToEquity: 0, roe: 20.2, roce: 0,
  dividendYield: 1.98, promoterHolding: 57.5, institutionalHolding: 28.3, retailHolding: 14.2,
  weekHigh52: 720, weekLow52: 520, avgVolume: 18000000, bookValue: 398, faceValue: 1,
  priceHistory: generatePriceHistory(628.45, 0.019, 0.8),
  revenueHistory: generateRevenueHistory(340000, 16),
  profitHistory: generateProfitHistory(50000, 30),
  holdingHistory: generateHoldingHistory(57.5, 28.3)
},
{
  ticker: 'BAJFINANCE', name: 'Bajaj Finance Ltd', sector: 'Finance', industry: 'NBFC',
  price: 6845.20, change: -42.80, changePercent: -0.62, marketCap: 424000, capCategory: 'Large Cap',
  pe: 30.5, eps: 224.4, revenueGrowth: 28.5, profitGrowth: 22.8, debtToEquity: 3.42,
  roe: 22.8, roce: 12.5, dividendYield: 0.44, promoterHolding: 54.7, institutionalHolding: 30.2, retailHolding: 15.1,
  weekHigh52: 7800, weekLow52: 5900, avgVolume: 2800000, bookValue: 1080, faceValue: 2,
  priceHistory: generatePriceHistory(6845.20, 0.022, 0.6),
  revenueHistory: generateRevenueHistory(42000, 25),
  profitHistory: generateProfitHistory(12000, 20),
  holdingHistory: generateHoldingHistory(54.7, 30.2)
},
{
  ticker: 'WIPRO', name: 'Wipro Ltd', sector: 'IT', industry: 'IT Services',
  price: 452.80, change: -3.40, changePercent: -0.75, marketCap: 236000, capCategory: 'Large Cap',
  pe: 22.8, eps: 19.9, revenueGrowth: 3.2, profitGrowth: -2.5, debtToEquity: 0.18,
  roe: 16.2, roce: 19.8, dividendYield: 0.22, promoterHolding: 72.9, institutionalHolding: 18.5, retailHolding: 8.6,
  weekHigh52: 540, weekLow52: 380, avgVolume: 6500000, bookValue: 128, faceValue: 2,
  priceHistory: generatePriceHistory(452.80, 0.018, 0.2),
  revenueHistory: generateRevenueHistory(90000, 4),
  profitHistory: generateProfitHistory(11000, -1),
  holdingHistory: generateHoldingHistory(72.9, 18.5)
},
{
  ticker: 'TATAMOTORS', name: 'Tata Motors Ltd', sector: 'Automobile', industry: 'Auto - Passenger',
  price: 785.30, change: 15.20, changePercent: 1.97, marketCap: 289000, capCategory: 'Large Cap',
  pe: 8.5, eps: 92.4, revenueGrowth: 26.5, profitGrowth: 180.2, debtToEquity: 0.98,
  roe: 35.2, roce: 18.5, dividendYield: 0.38, promoterHolding: 46.4, institutionalHolding: 35.8, retailHolding: 17.8,
  weekHigh52: 920, weekLow52: 580, avgVolume: 14000000, bookValue: 295, faceValue: 2,
  priceHistory: generatePriceHistory(785.30, 0.025, 1.4),
  revenueHistory: generateRevenueHistory(340000, 22),
  profitHistory: generateProfitHistory(18000, 80),
  holdingHistory: generateHoldingHistory(46.4, 35.8)
},
{
  ticker: 'MARUTI', name: 'Maruti Suzuki India Ltd', sector: 'Automobile', industry: 'Auto - Passenger',
  price: 10825.40, change: 85.30, changePercent: 0.79, marketCap: 340000, capCategory: 'Large Cap',
  pe: 26.8, eps: 403.9, revenueGrowth: 20.2, profitGrowth: 42.5, debtToEquity: 0,
  roe: 16.5, roce: 22.1, dividendYield: 0.83, promoterHolding: 56.4, institutionalHolding: 30.5, retailHolding: 13.1,
  weekHigh52: 12500, weekLow52: 9200, avgVolume: 950000, bookValue: 2680, faceValue: 5,
  priceHistory: generatePriceHistory(10825.40, 0.016, 0.8),
  revenueHistory: generateRevenueHistory(115000, 18),
  profitHistory: generateProfitHistory(9500, 35),
  holdingHistory: generateHoldingHistory(56.4, 30.5)
},
{
  ticker: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries', sector: 'Pharma', industry: 'Pharmaceuticals',
  price: 1685.20, change: 12.40, changePercent: 0.74, marketCap: 404000, capCategory: 'Large Cap',
  pe: 38.2, eps: 44.1, revenueGrowth: 10.5, profitGrowth: 32.8, debtToEquity: 0.12,
  roe: 16.8, roce: 20.5, dividendYield: 0.59, promoterHolding: 54.5, institutionalHolding: 30.8, retailHolding: 14.7,
  weekHigh52: 1850, weekLow52: 1300, avgVolume: 3200000, bookValue: 310, faceValue: 1,
  priceHistory: generatePriceHistory(1685.20, 0.02, 0.9),
  revenueHistory: generateRevenueHistory(42000, 10),
  profitHistory: generateProfitHistory(9000, 28),
  holdingHistory: generateHoldingHistory(54.5, 30.8)
},
{
  ticker: 'ASIANPAINT', name: 'Asian Paints Ltd', sector: 'Consumer', industry: 'Paints',
  price: 2768.90, change: -28.50, changePercent: -1.02, marketCap: 265000, capCategory: 'Large Cap',
  pe: 52.3, eps: 52.9, revenueGrowth: 2.8, profitGrowth: -5.2, debtToEquity: 0.22,
  roe: 28.5, roce: 35.2, dividendYield: 0.72, promoterHolding: 52.6, institutionalHolding: 29.8, retailHolding: 17.6,
  weekHigh52: 3420, weekLow52: 2520, avgVolume: 1800000, bookValue: 198, faceValue: 1,
  priceHistory: generatePriceHistory(2768.90, 0.018, -0.2),
  revenueHistory: generateRevenueHistory(34000, 4),
  profitHistory: generateProfitHistory(4800, -3),
  holdingHistory: generateHoldingHistory(52.6, 29.8)
},
{
  ticker: 'LTIM', name: 'LTIMindtree Ltd', sector: 'IT', industry: 'IT Services',
  price: 5420.10, change: -65.30, changePercent: -1.19, marketCap: 160000, capCategory: 'Large Cap',
  pe: 34.2, eps: 158.5, revenueGrowth: 6.8, profitGrowth: 4.2, debtToEquity: 0.02,
  roe: 26.8, roce: 33.5, dividendYield: 0.92, promoterHolding: 68.6, institutionalHolding: 22.8, retailHolding: 8.6,
  weekHigh52: 6200, weekLow52: 4600, avgVolume: 850000, bookValue: 625, faceValue: 1,
  priceHistory: generatePriceHistory(5420.10, 0.02, 0.3),
  revenueHistory: generateRevenueHistory(35000, 7),
  profitHistory: generateProfitHistory(4800, 5),
  holdingHistory: generateHoldingHistory(68.6, 22.8)
},
{
  ticker: 'ADANIENT', name: 'Adani Enterprises Ltd', sector: 'Conglomerate', industry: 'Diversified',
  price: 2680.40, change: 45.80, changePercent: 1.74, marketCap: 306000, capCategory: 'Large Cap',
  pe: 68.5, eps: 39.1, revenueGrowth: 42.5, profitGrowth: 55.2, debtToEquity: 1.45,
  roe: 12.5, roce: 10.8, dividendYield: 0.04, promoterHolding: 72.6, institutionalHolding: 15.8, retailHolding: 11.6,
  weekHigh52: 3490, weekLow52: 2050, avgVolume: 4200000, bookValue: 420, faceValue: 1,
  priceHistory: generatePriceHistory(2680.40, 0.035, 1.0),
  revenueHistory: generateRevenueHistory(85000, 35),
  profitHistory: generateProfitHistory(3200, 45),
  holdingHistory: generateHoldingHistory(72.6, 15.8)
},
{
  ticker: 'NESTLEIND', name: 'Nestle India Ltd', sector: 'FMCG', industry: 'Food Products',
  price: 2425.80, change: 8.90, changePercent: 0.37, marketCap: 234000, capCategory: 'Large Cap',
  pe: 72.5, eps: 33.5, revenueGrowth: 9.8, profitGrowth: 14.2, debtToEquity: 0,
  roe: 108.5, roce: 142.8, dividendYield: 1.52, promoterHolding: 62.8, institutionalHolding: 25.2, retailHolding: 12.0,
  weekHigh52: 2800, weekLow52: 2100, avgVolume: 420000, bookValue: 32, faceValue: 10,
  priceHistory: generatePriceHistory(2425.80, 0.012, 0.4),
  revenueHistory: generateRevenueHistory(18000, 10),
  profitHistory: generateProfitHistory(2800, 13),
  holdingHistory: generateHoldingHistory(62.8, 25.2)
},
{
  ticker: 'TATASTEEL', name: 'Tata Steel Ltd', sector: 'Metals', industry: 'Steel',
  price: 142.35, change: 3.80, changePercent: 2.74, marketCap: 177000, capCategory: 'Large Cap',
  pe: 0, eps: -5.2, revenueGrowth: -8.5, profitGrowth: -120.5, debtToEquity: 0.82,
  roe: -4.2, roce: 5.8, dividendYield: 2.52, promoterHolding: 33.2, institutionalHolding: 42.5, retailHolding: 24.3,
  weekHigh52: 185, weekLow52: 110, avgVolume: 28000000, bookValue: 112, faceValue: 1,
  priceHistory: generatePriceHistory(142.35, 0.028, 0.3),
  revenueHistory: generateRevenueHistory(240000, -5),
  profitHistory: generateProfitHistory(8000, -80),
  holdingHistory: generateHoldingHistory(33.2, 42.5)
},
{
  ticker: 'POWERGRID', name: 'Power Grid Corp of India', sector: 'Power', industry: 'Power Transmission',
  price: 285.60, change: 1.25, changePercent: 0.44, marketCap: 265000, capCategory: 'Large Cap',
  pe: 16.5, eps: 17.3, revenueGrowth: 8.2, profitGrowth: 12.8, debtToEquity: 1.58,
  roe: 18.5, roce: 12.2, dividendYield: 4.12, promoterHolding: 57.9, institutionalHolding: 30.5, retailHolding: 11.6,
  weekHigh52: 340, weekLow52: 230, avgVolume: 12000000, bookValue: 105, faceValue: 10,
  priceHistory: generatePriceHistory(285.60, 0.015, 0.7),
  revenueHistory: generateRevenueHistory(42000, 8),
  profitHistory: generateProfitHistory(16000, 12),
  holdingHistory: generateHoldingHistory(57.9, 30.5)
},
{
  ticker: 'HCLTECH', name: 'HCL Technologies Ltd', sector: 'IT', industry: 'IT Services',
  price: 1625.40, change: -8.20, changePercent: -0.50, marketCap: 441000, capCategory: 'Large Cap',
  pe: 25.8, eps: 63.0, revenueGrowth: 7.5, profitGrowth: 8.2, debtToEquity: 0.06,
  roe: 24.2, roce: 30.5, dividendYield: 3.08, promoterHolding: 60.7, institutionalHolding: 28.5, retailHolding: 10.8,
  weekHigh52: 1850, weekLow52: 1300, avgVolume: 3800000, bookValue: 278, faceValue: 2,
  priceHistory: generatePriceHistory(1625.40, 0.015, 0.5),
  revenueHistory: generateRevenueHistory(100000, 8),
  profitHistory: generateProfitHistory(16000, 9),
  holdingHistory: generateHoldingHistory(60.7, 28.5)
},
{
  ticker: 'COALINDIA', name: 'Coal India Ltd', sector: 'Mining', industry: 'Coal Mining',
  price: 385.20, change: 6.40, changePercent: 1.69, marketCap: 237000, capCategory: 'Large Cap',
  pe: 7.2, eps: 53.5, revenueGrowth: 12.8, profitGrowth: 18.5, debtToEquity: 0.08,
  roe: 52.5, roce: 68.2, dividendYield: 6.25, promoterHolding: 66.1, institutionalHolding: 22.8, retailHolding: 11.1,
  weekHigh52: 450, weekLow52: 310, avgVolume: 8500000, bookValue: 115, faceValue: 10,
  priceHistory: generatePriceHistory(385.20, 0.02, 0.5),
  revenueHistory: generateRevenueHistory(140000, 12),
  profitHistory: generateProfitHistory(32000, 16),
  holdingHistory: generateHoldingHistory(66.1, 22.8)
},
{
  ticker: 'DRREDDY', name: "Dr. Reddy's Laboratories", sector: 'Pharma', industry: 'Pharmaceuticals',
  price: 6280.50, change: 42.30, changePercent: 0.68, marketCap: 105000, capCategory: 'Large Cap',
  pe: 20.5, eps: 306.4, revenueGrowth: 12.2, profitGrowth: 18.5, debtToEquity: 0.08,
  roe: 18.2, roce: 22.5, dividendYield: 0.64, promoterHolding: 26.7, institutionalHolding: 48.5, retailHolding: 24.8,
  weekHigh52: 6800, weekLow52: 5200, avgVolume: 680000, bookValue: 1780, faceValue: 5,
  priceHistory: generatePriceHistory(6280.50, 0.016, 0.6),
  revenueHistory: generateRevenueHistory(24000, 12),
  profitHistory: generateProfitHistory(5000, 16),
  holdingHistory: generateHoldingHistory(26.7, 48.5)
},
{
  ticker: 'JSWSTEEL', name: 'JSW Steel Ltd', sector: 'Metals', industry: 'Steel',
  price: 865.30, change: 18.50, changePercent: 2.18, marketCap: 209000, capCategory: 'Large Cap',
  pe: 32.5, eps: 26.6, revenueGrowth: 5.8, profitGrowth: -15.2, debtToEquity: 0.95,
  roe: 8.5, roce: 10.2, dividendYield: 0.81, promoterHolding: 44.8, institutionalHolding: 35.2, retailHolding: 20.0,
  weekHigh52: 980, weekLow52: 680, avgVolume: 4500000, bookValue: 345, faceValue: 1,
  priceHistory: generatePriceHistory(865.30, 0.025, 0.4),
  revenueHistory: generateRevenueHistory(165000, 6),
  profitHistory: generateProfitHistory(12000, -10),
  holdingHistory: generateHoldingHistory(44.8, 35.2)
},
// Mid Cap stocks
{
  ticker: 'PERSISTENT', name: 'Persistent Systems Ltd', sector: 'IT', industry: 'IT Services',
  price: 5280.40, change: 120.50, changePercent: 2.33, marketCap: 82000, capCategory: 'Mid Cap',
  pe: 62.5, eps: 84.5, revenueGrowth: 18.5, profitGrowth: 32.8, debtToEquity: 0.02,
  roe: 24.5, roce: 30.8, dividendYield: 0.42, promoterHolding: 31.1, institutionalHolding: 45.8, retailHolding: 23.1,
  weekHigh52: 5800, weekLow52: 3600, avgVolume: 520000, bookValue: 380, faceValue: 5,
  priceHistory: generatePriceHistory(5280.40, 0.025, 1.5),
  revenueHistory: generateRevenueHistory(6500, 18),
  profitHistory: generateProfitHistory(1200, 28),
  holdingHistory: generateHoldingHistory(31.1, 45.8)
},
{
  ticker: 'TRENT', name: 'Trent Ltd', sector: 'Retail', industry: 'Fashion Retail',
  price: 5460.80, change: 85.20, changePercent: 1.59, marketCap: 194000, capCategory: 'Mid Cap',
  pe: 145.2, eps: 37.6, revenueGrowth: 52.5, profitGrowth: 85.2, debtToEquity: 0.32,
  roe: 28.5, roce: 22.8, dividendYield: 0.05, promoterHolding: 37.0, institutionalHolding: 42.5, retailHolding: 20.5,
  weekHigh52: 6200, weekLow52: 3200, avgVolume: 1200000, bookValue: 145, faceValue: 1,
  priceHistory: generatePriceHistory(5460.80, 0.03, 2.0),
  revenueHistory: generateRevenueHistory(8500, 45),
  profitHistory: generateProfitHistory(450, 70),
  holdingHistory: generateHoldingHistory(37.0, 42.5)
},
{
  ticker: 'DIXON', name: 'Dixon Technologies Ltd', sector: 'Electronics', industry: 'Consumer Electronics',
  price: 12850.60, change: 320.40, changePercent: 2.56, marketCap: 77000, capCategory: 'Mid Cap',
  pe: 105.8, eps: 121.5, revenueGrowth: 48.2, profitGrowth: 62.5, debtToEquity: 0.15,
  roe: 25.2, roce: 32.8, dividendYield: 0.08, promoterHolding: 34.2, institutionalHolding: 42.8, retailHolding: 23.0,
  weekHigh52: 14500, weekLow52: 7800, avgVolume: 380000, bookValue: 520, faceValue: 2,
  priceHistory: generatePriceHistory(12850.60, 0.035, 2.2),
  revenueHistory: generateRevenueHistory(12000, 42),
  profitHistory: generateProfitHistory(350, 50),
  holdingHistory: generateHoldingHistory(34.2, 42.8)
},
{
  ticker: 'ZOMATO', name: 'Zomato Ltd', sector: 'Technology', industry: 'Internet Services',
  price: 245.80, change: 8.50, changePercent: 3.58, marketCap: 216000, capCategory: 'Mid Cap',
  pe: 310.0, eps: 0.8, revenueGrowth: 62.5, profitGrowth: 300.0, debtToEquity: 0,
  roe: 2.5, roce: 3.2, dividendYield: 0, promoterHolding: 0, institutionalHolding: 65.2, retailHolding: 34.8,
  weekHigh52: 280, weekLow52: 120, avgVolume: 22000000, bookValue: 18, faceValue: 1,
  priceHistory: generatePriceHistory(245.80, 0.035, 2.5),
  revenueHistory: generateRevenueHistory(7500, 55),
  profitHistory: generateProfitHistory(-1200, 200),
  holdingHistory: generateHoldingHistory(0, 65.2)
},
// Small Cap stocks
{
  ticker: 'ROUTE', name: 'Route Mobile Ltd', sector: 'Technology', industry: 'Cloud Communications',
  price: 1680.50, change: -25.30, changePercent: -1.48, marketCap: 10500, capCategory: 'Small Cap',
  pe: 42.5, eps: 39.5, revenueGrowth: 22.5, profitGrowth: 15.8, debtToEquity: 0.08,
  roe: 18.2, roce: 22.5, dividendYield: 0.12, promoterHolding: 60.2, institutionalHolding: 22.5, retailHolding: 17.3,
  weekHigh52: 2100, weekLow52: 1400, avgVolume: 120000, bookValue: 235, faceValue: 5,
  priceHistory: generatePriceHistory(1680.50, 0.03, 0.3),
  revenueHistory: generateRevenueHistory(3200, 20),
  profitHistory: generateProfitHistory(280, 14),
  holdingHistory: generateHoldingHistory(60.2, 22.5)
},
{
  ticker: 'TANLA', name: 'Tanla Platforms Ltd', sector: 'Technology', industry: 'Cloud Communications',
  price: 925.40, change: 18.60, changePercent: 2.05, marketCap: 12500, capCategory: 'Small Cap',
  pe: 18.5, eps: 50.0, revenueGrowth: 15.8, profitGrowth: 8.5, debtToEquity: 0,
  roe: 22.8, roce: 28.5, dividendYield: 0.54, promoterHolding: 37.5, institutionalHolding: 35.2, retailHolding: 27.3,
  weekHigh52: 1150, weekLow52: 720, avgVolume: 450000, bookValue: 245, faceValue: 2,
  priceHistory: generatePriceHistory(925.40, 0.028, 0.5),
  revenueHistory: generateRevenueHistory(3500, 14),
  profitHistory: generateProfitHistory(680, 9),
  holdingHistory: generateHoldingHistory(37.5, 35.2)
},
{
  ticker: 'DEEPAKFERT', name: 'Deepak Fertilisers Ltd', sector: 'Chemicals', industry: 'Fertilizers',
  price: 545.20, change: 12.80, changePercent: 2.40, marketCap: 6900, capCategory: 'Small Cap',
  pe: 12.5, eps: 43.6, revenueGrowth: 8.5, profitGrowth: -12.5, debtToEquity: 0.65,
  roe: 14.2, roce: 12.8, dividendYield: 1.28, promoterHolding: 45.8, institutionalHolding: 28.5, retailHolding: 25.7,
  weekHigh52: 680, weekLow52: 420, avgVolume: 580000, bookValue: 385, faceValue: 10,
  priceHistory: generatePriceHistory(545.20, 0.03, 0.2),
  revenueHistory: generateRevenueHistory(8500, 8),
  profitHistory: generateProfitHistory(650, -8),
  holdingHistory: generateHoldingHistory(45.8, 28.5)
}];


export function getStockByTicker(ticker) {
  return stocks.find((s) => s.ticker === ticker.toUpperCase());
}

export function searchStocks(query) {
  const q = query.toLowerCase();
  return stocks.filter((s) =>
  s.ticker.toLowerCase().includes(q) ||
  s.name.toLowerCase().includes(q) ||
  s.sector.toLowerCase().includes(q)
  );
}

export function getTopGainers() {
  return [...stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
}

export function getTopLosers() {
  return [...stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
}

export function getTrendingStocks() {
  return [...stocks].sort((a, b) => b.avgVolume - a.avgVolume).slice(0, 8);
}

export function getStocksBySector(sector) {
  return stocks.filter((s) => s.sector === sector);
}

export function getSectors() {
  return [...new Set(stocks.map((s) => s.sector))];
}

export function getStocksByCapCategory(cap) {
  return stocks.filter((s) => s.capCategory === cap);
}