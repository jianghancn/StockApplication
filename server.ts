import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import yahooFinance from "yahoo-finance2";

// Suppress yahoo-finance2 notices
yahooFinance.suppressNotices(['yahooSurvey']);

// A curated list of popular dividend-paying and value stocks to screen
const TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'BRK-B', 'JNJ', 'JPM', 'V',
  'PG', 'UNH', 'HD', 'CVX', 'ABBV', 'LLY', 'MRK', 'PEP', 'KO', 'BAC',
  'TMO', 'WMT', 'COST', 'MCD', 'CSCO', 'CRM', 'DIS', 'VZ', 'ADBE', 'TXN',
  'NKE', 'PFE', 'INTC', 'T', 'IBM', 'MMM', 'CAT', 'BA', 'GE', 'F',
  'GM', 'XOM', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SPG', 'O', 'MO', 'PM',
  'RTX', 'HON', 'LMT', 'UPS', 'UNP', 'SBUX', 'TGT', 'DE', 'LUV', 'DAL',
  'KMB', 'CL', 'SYY', 'GILD', 'BMY', 'CVS', 'WBA', 'T', 'VZ', 'CMCSA',
  'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'ED', 'PEG', 'WEC', 'ES'
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for the stock screener
  app.get("/api/screener", async (req, res) => {
    try {
      // 1. Fetch basic quotes for all tickers
      const quotes = await yahooFinance.quote(TICKERS);

      // 2. Filter by PE < 25, Dividend > 0, and Price near 52-week low
      let candidates = quotes.filter(q => {
        const pe = q.trailingPE || q.forwardPE;
        const div = q.dividendYield || 0;
        const price = q.regularMarketPrice;
        const low52 = q.fiftyTwoWeekLow;

        if (!pe || !price || !low52) return false;

        // Criteria: PE < 25, Dividend > 1%
        return pe < 25 && div > 0.01;
      });

      // Sort by proximity to 52-week low (closest first)
      candidates.sort((a, b) => {
        const proxA = (a.regularMarketPrice! - a.fiftyTwoWeekLow!) / a.fiftyTwoWeekLow!;
        const proxB = (b.regularMarketPrice! - b.fiftyTwoWeekLow!) / b.fiftyTwoWeekLow!;
        return proxA - proxB;
      });

      // Take top 15 closest to 52-week low to keep API calls reasonable
      const topCandidates = candidates.slice(0, 15);

      const results = [];
      for (const q of topCandidates) {
        try {
          // 3. For the remaining stocks, check 3-year revenue/profit growth
          const summary = await yahooFinance.quoteSummary(q.symbol, { modules: ['incomeStatementHistory'] });
          const incomeStatements = summary.incomeStatementHistory?.incomeStatementHistory;

          let revGrowth = null;
          let profitGrowth = null;

          if (incomeStatements && incomeStatements.length >= 3) {
            const recent = incomeStatements[0];
            const older = incomeStatements[2];
            
            if (older.totalRevenue && recent.totalRevenue) {
              revGrowth = (recent.totalRevenue - older.totalRevenue) / Math.abs(older.totalRevenue);
            }
            if (older.netIncome && recent.netIncome) {
              profitGrowth = (recent.netIncome - older.netIncome) / Math.abs(older.netIncome);
            }
          }

          // Filter by positive growth if data is available
          if ((revGrowth === null || revGrowth > 0) && (profitGrowth === null || profitGrowth > 0)) {
            results.push({
              symbol: q.symbol,
              shortName: q.shortName,
              price: q.regularMarketPrice,
              pe: q.trailingPE || q.forwardPE,
              dividendYield: q.dividendYield,
              fiftyTwoWeekLow: q.fiftyTwoWeekLow,
              fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
              revGrowth3Y: revGrowth,
              profitGrowth3Y: profitGrowth
            });
          }
        } catch (err) {
          console.error(`Error fetching summary for ${q.symbol}`, err);
          // Push without growth data if it fails, so we still show the stock
          results.push({
            symbol: q.symbol,
            shortName: q.shortName,
            price: q.regularMarketPrice,
            pe: q.trailingPE || q.forwardPE,
            dividendYield: q.dividendYield,
            fiftyTwoWeekLow: q.fiftyTwoWeekLow,
            fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
            revGrowth3Y: null,
            profitGrowth3Y: null
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error('Screener error:', error);
      res.status(500).json({ error: 'Failed to fetch stock data' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
