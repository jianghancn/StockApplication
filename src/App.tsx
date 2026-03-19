import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StockData {
  symbol: string;
  shortName: string;
  price: number;
  pe: number;
  dividendYield: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  revGrowth3Y: number | null;
  profitGrowth3Y: number | null;
}

export default function App() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStocks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/screener');
      if (!response.ok) throw new Error('Failed to fetch stock data');
      const data = await response.json();
      setStocks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const formatPercent = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'N/A';
    return `${(val * 100).toFixed(2)}%`;
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'N/A';
    return `$${val.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-slate-900 mb-2">Value Stock Screener</h1>
            <p className="text-slate-500 max-w-2xl">
              Discover stocks trading near their 52-week lows with strong fundamentals: P/E &lt; 25, high dividend yield, and positive 3-year revenue & profit growth.
            </p>
          </div>
          <button
            onClick={fetchStocks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            {loading ? 'Scanning Market...' : 'Refresh Data'}
          </button>
        </header>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">Error loading data</h3>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse h-48" />
            ))}
          </div>
        )}

        {/* Data Grid */}
        {!loading && !error && stocks.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No stocks found</h3>
            <p className="text-slate-500">No stocks currently match all the strict screening criteria.</p>
          </div>
        )}

        {!loading && !error && stocks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks.map((stock) => {
              const proximityToLow = ((stock.price - stock.fiftyTwoWeekLow) / stock.fiftyTwoWeekLow) * 100;
              
              return (
                <div key={stock.symbol} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{stock.symbol}</h2>
                      <p className="text-sm text-slate-500 truncate max-w-[180px]" title={stock.shortName}>{stock.shortName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-light text-slate-900">{formatCurrency(stock.price)}</div>
                      <div className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full inline-flex items-center mt-1",
                        proximityToLow < 5 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      )}>
                        {proximityToLow.toFixed(1)}% above 52w low
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm mt-6">
                    <div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">P/E Ratio</div>
                      <div className="font-mono text-slate-700">{stock.pe?.toFixed(2) || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Div Yield</div>
                      <div className="font-mono text-slate-700 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        {formatPercent(stock.dividendYield)}
                      </div>
                    </div>
                    
                    <div className="col-span-2 h-px bg-slate-100 my-1" />

                    <div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">3Y Rev Growth</div>
                      <div className="font-mono flex items-center gap-1">
                        {stock.revGrowth3Y !== null ? (
                          <>
                            {stock.revGrowth3Y > 0 ? (
                              <TrendingUp className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-500" />
                            )}
                            <span className={stock.revGrowth3Y > 0 ? "text-emerald-700" : "text-red-700"}>
                              {formatPercent(stock.revGrowth3Y)}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">3Y Profit Growth</div>
                      <div className="font-mono flex items-center gap-1">
                        {stock.profitGrowth3Y !== null ? (
                          <>
                            {stock.profitGrowth3Y > 0 ? (
                              <TrendingUp className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-500" />
                            )}
                            <span className={stock.profitGrowth3Y > 0 ? "text-emerald-700" : "text-red-700"}>
                              {formatPercent(stock.profitGrowth3Y)}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Visual 52-week range bar */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
                      <span>{formatCurrency(stock.fiftyTwoWeekLow)}</span>
                      <span>52W Range</span>
                      <span>{formatCurrency(stock.fiftyTwoWeekHigh)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                      {stock.fiftyTwoWeekLow && stock.fiftyTwoWeekHigh && stock.price && (
                        <div 
                          className="absolute top-0 bottom-0 w-1.5 bg-slate-900 rounded-full"
                          style={{ 
                            left: `${Math.max(0, Math.min(100, ((stock.price - stock.fiftyTwoWeekLow) / (stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow)) * 100))}%`,
                            transform: 'translateX(-50%)'
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
