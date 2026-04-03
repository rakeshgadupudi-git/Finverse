

export const marketNews = [
{
  id: '1', title: 'Sensex Rallies 500 Points on Strong FII Inflows',
  summary: 'Indian markets surged on the back of strong foreign institutional investor buying across sectors.',
  source: 'Economic Times', date: '2026-02-20', sentiment: 'positive', category: 'market',
  aiSummary: 'Markets showed strength with FII inflows driving broad-based rally. Banking and IT sectors led gains.'
},
{
  id: '2', title: 'RBI Holds Repo Rate Steady at 6.5%',
  summary: 'The Reserve Bank of India maintained its benchmark lending rate, citing stable inflation outlook.',
  source: 'Mint', date: '2026-02-19', sentiment: 'neutral', category: 'economy',
  aiSummary: 'RBI kept rates unchanged as expected. Accommodative stance suggests potential future cuts if inflation remains contained.'
},
{
  id: '3', title: 'IT Sector Faces Headwinds as US Spending Slows',
  summary: 'Major Indian IT companies may see slower revenue growth amid cautious US enterprise spending.',
  source: 'Business Standard', date: '2026-02-18', sentiment: 'negative', category: 'sector',
  aiSummary: 'US tech spending cuts could impact Indian IT giants. TCS, Infosys, and Wipro may revise guidance downward.'
},
{
  id: '4', title: 'Reliance Jio Announces 5G Expansion to Tier-3 Cities',
  summary: 'Reliance Jio is expanding its 5G network coverage to over 500 tier-3 cities across India.',
  source: 'NDTV Profit', date: '2026-02-20', ticker: 'RELIANCE', sentiment: 'positive', category: 'company',
  aiSummary: 'Jio\'s aggressive 5G expansion strengthens Reliance\'s telecom dominance. Revenue upside potential from new markets.'
},
{
  id: '5', title: 'TCS Wins $2 Billion Deal from European Bank',
  summary: 'TCS bags a landmark multi-year digital transformation contract from a top European financial institution.',
  source: 'Moneycontrol', date: '2026-02-19', ticker: 'TCS', sentiment: 'positive', category: 'company',
  aiSummary: 'Mega deal win boosts TCS order book significantly. Strong pipeline visibility for next 2-3 years.'
},
{
  id: '6', title: 'HDFC Bank Posts 18% Growth in Q3 Net Profit',
  summary: 'HDFC Bank reported strong quarterly results with net profit rising 18% year-on-year.',
  source: 'Financial Express', date: '2026-02-17', ticker: 'HDFCBANK', sentiment: 'positive', category: 'company',
  aiSummary: 'Robust earnings beat estimates. Asset quality remains strong with improving NIM. Integration synergies visible.'
},
{
  id: '7', title: 'Infosys Faces Class Action Lawsuit in US Courts',
  summary: 'Infosys has been named in a class action lawsuit related to visa compliance practices.',
  source: 'Reuters India', date: '2026-02-18', ticker: 'INFY', sentiment: 'negative', category: 'company',
  aiSummary: 'Legal risks mount for Infosys. Financial impact likely limited but reputational concerns persist.'
},
{
  id: '8', title: 'Tata Motors EV Sales Surge 45% in January',
  summary: 'Tata Motors continues to dominate India\'s electric vehicle market with strong monthly sales growth.',
  source: 'Autocar India', date: '2026-02-16', ticker: 'TATAMOTORS', sentiment: 'positive', category: 'company',
  aiSummary: 'EV leadership strengthening. Market share gains in both ICE and electric segments drive bullish outlook.'
},
{
  id: '9', title: 'Government Announces PLI Scheme for Semiconductor Manufacturing',
  summary: 'India plans to invest ₹76,000 crore in domestic semiconductor manufacturing under an expanded PLI scheme.',
  source: 'The Hindu Business Line', date: '2026-02-15', sentiment: 'positive', category: 'economy',
  aiSummary: 'Semiconductor PLI scheme benefits electronics manufacturers. Dixon Technologies and Tata Electronics are key beneficiaries.'
},
{
  id: '10', title: 'Crude Oil Prices Drop Below $70, Boosting Indian Sentiment',
  summary: 'Brent crude fell below $70 per barrel, providing relief to India\'s current account deficit concerns.',
  source: 'Bloomberg Quint', date: '2026-02-14', sentiment: 'positive', category: 'market',
  aiSummary: 'Lower crude prices benefit India as a net importer. OMCs and airlines see margin upside. Positive for INR.'
},
{
  id: '11', title: 'Zomato Quick Commerce Revenue Triples in Latest Quarter',
  summary: 'Zomato\'s Blinkit business shows exponential growth, becoming a significant revenue contributor.',
  source: 'Inc42', date: '2026-02-17', ticker: 'ZOMATO', sentiment: 'positive', category: 'company',
  aiSummary: 'Quick commerce becoming Zomato\'s growth engine. Path to profitability becoming clearer with scale.'
},
{
  id: '12', title: 'Pharma Sector Rally as US FDA Approvals Accelerate',
  summary: 'Indian pharma companies received multiple US FDA approvals, boosting sector sentiment.',
  source: 'Pharma Biz', date: '2026-02-16', sentiment: 'positive', category: 'sector',
  aiSummary: 'FDA approval acceleration benefits Sun Pharma and Dr. Reddy\'s. Revenue growth visibility improves.'
},
{
  id: '13', title: 'Asian Paints Volume Growth Disappoints in Q3',
  summary: 'Asian Paints reported flat volume growth citing competitive pressures and raw material cost increases.',
  source: 'Economic Times', date: '2026-02-15', ticker: 'ASIANPAINT', sentiment: 'negative', category: 'company',
  aiSummary: 'Volume growth stagnation is concerning. Competitive intensity from Birla Opus is a key risk to monitor.'
},
{
  id: '14', title: 'SBI Plans to Raise ₹20,000 Crore via Bonds',
  summary: 'State Bank of India announces plans to raise capital through bond issuance to fund growth.',
  source: 'Mint', date: '2026-02-14', ticker: 'SBIN', sentiment: 'neutral', category: 'company',
  aiSummary: 'Capital raising supports growth plans. Strong balance sheet and government backing provide stability.'
},
{
  id: '15', title: 'Steel Prices Recover as China Stimulus Boosts Demand',
  summary: 'Global steel prices saw a sharp recovery following China\'s fresh economic stimulus measures.',
  source: 'Metal Bulletin', date: '2026-02-13', sentiment: 'positive', category: 'sector',
  aiSummary: 'Steel price recovery benefits Tata Steel and JSW Steel. Margin improvement expected in coming quarters.'
}];


export function getNewsByTicker(ticker) {
  return marketNews.filter((n) => n.ticker === ticker || !n.ticker);
}

export function getMarketNews() {
  return marketNews.filter((n) => n.category === 'market' || n.category === 'economy');
}

export function getNewsBySentiment(sentiment) {
  return marketNews.filter((n) => n.sentiment === sentiment);
}