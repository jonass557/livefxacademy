// Client API du module Trading Demo (au-dessus de l'instance axios `api`).
import api from './api';

export const DEFAULT_DEMO_INSTRUMENTS = [
  { symbol: 'EURUSD', name: 'EUR / USD', category: 'FOREX', digits: 5, pip_size: 0.0001, contract_size: 100000, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'GBPUSD', name: 'GBP / USD', category: 'FOREX', digits: 5, pip_size: 0.0001, contract_size: 100000, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'USDJPY', name: 'USD / JPY', category: 'FOREX', digits: 3, pip_size: 0.01, contract_size: 100000, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'USDCHF', name: 'USD / CHF', category: 'FOREX', digits: 5, pip_size: 0.0001, contract_size: 100000, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'AUDUSD', name: 'AUD / USD', category: 'FOREX', digits: 5, pip_size: 0.0001, contract_size: 100000, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'USDCAD', name: 'USD / CAD', category: 'FOREX', digits: 5, pip_size: 0.0001, contract_size: 100000, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'NZDUSD', name: 'NZD / USD', category: 'FOREX', digits: 5, pip_size: 0.0001, contract_size: 100000, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'EURGBP', name: 'EUR / GBP', category: 'FOREX', digits: 5, pip_size: 0.0001, contract_size: 100000, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'EURJPY', name: 'EUR / JPY', category: 'FOREX', digits: 3, pip_size: 0.01, contract_size: 100000, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'GBPJPY', name: 'GBP / JPY', category: 'FOREX', digits: 3, pip_size: 0.01, contract_size: 100000, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'XAUUSD', name: 'Or / USD (Gold)', category: 'METALS', digits: 2, pip_size: 0.1, contract_size: 100, leverage: 100, min_lot: 0.01, max_lot: 50, lot_step: 0.01 },
  { symbol: 'XAGUSD', name: 'Argent / USD (Silver)', category: 'METALS', digits: 3, pip_size: 0.01, contract_size: 5000, leverage: 100, min_lot: 0.01, max_lot: 50, lot_step: 0.01 },
  { symbol: 'BTCUSD', name: 'Bitcoin / USD', category: 'CRYPTO', digits: 2, pip_size: 1, contract_size: 1, leverage: 20, min_lot: 0.01, max_lot: 10, lot_step: 0.01 },
  { symbol: 'ETHUSD', name: 'Ethereum / USD', category: 'CRYPTO', digits: 2, pip_size: 0.1, contract_size: 1, leverage: 20, min_lot: 0.01, max_lot: 50, lot_step: 0.01 },
  { symbol: 'SOLUSD', name: 'Solana / USD', category: 'CRYPTO', digits: 2, pip_size: 0.01, contract_size: 10, leverage: 20, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'US500', name: 'S&P 500', category: 'INDICES', digits: 2, pip_size: 0.1, contract_size: 1, leverage: 50, min_lot: 0.1, max_lot: 100, lot_step: 0.1 },
  { symbol: 'US100', name: 'Nasdaq 100', category: 'INDICES', digits: 2, pip_size: 0.1, contract_size: 1, leverage: 50, min_lot: 0.1, max_lot: 100, lot_step: 0.1 },
  { symbol: 'US30', name: 'Dow Jones 30', category: 'INDICES', digits: 2, pip_size: 1, contract_size: 1, leverage: 50, min_lot: 0.1, max_lot: 100, lot_step: 0.1 },
  { symbol: 'R_10', name: 'Volatility 10 Index', category: 'SYNTHETIC', digits: 3, pip_size: 0.01, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'R_25', name: 'Volatility 25 Index', category: 'SYNTHETIC', digits: 3, pip_size: 0.01, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'R_50', name: 'Volatility 50 Index', category: 'SYNTHETIC', digits: 4, pip_size: 0.001, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'R_75', name: 'Volatility 75 Index', category: 'SYNTHETIC', digits: 2, pip_size: 0.1, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'R_100', name: 'Volatility 100 Index', category: 'SYNTHETIC', digits: 2, pip_size: 0.1, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index', category: 'SYNTHETIC', digits: 2, pip_size: 0.01, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index', category: 'SYNTHETIC', digits: 2, pip_size: 0.1, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index', category: 'SYNTHETIC', digits: 2, pip_size: 0.1, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'BOOM500', name: 'Boom 500 Index', category: 'SYNTHETIC', digits: 3, pip_size: 0.01, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'BOOM1000', name: 'Boom 1000 Index', category: 'SYNTHETIC', digits: 3, pip_size: 0.01, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'CRASH500', name: 'Crash 500 Index', category: 'SYNTHETIC', digits: 3, pip_size: 0.01, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
  { symbol: 'CRASH1000', name: 'Crash 1000 Index', category: 'SYNTHETIC', digits: 3, pip_size: 0.01, contract_size: 1, leverage: 100, min_lot: 0.01, max_lot: 100, lot_step: 0.01 },
];

export function generateClientFallbackCandles(symbol = 'EURUSD', timeframe = 'H1', count = 300) {
  const clean = String(symbol || 'EURUSD').replace(/^frx/i, '').replace(/^cry/i, '').toUpperCase();
  const baseMap = {
    EURUSD: 1.085, GBPUSD: 1.272, USDJPY: 154.5, USDCHF: 0.884, AUDUSD: 0.658,
    USDCAD: 1.385, NZDUSD: 0.598, EURGBP: 0.853, EURJPY: 167.6, GBPJPY: 196.5,
    XAUUSD: 2650, XAGUSD: 31.2, BTCUSD: 89500, ETHUSD: 3120, SOLUSD: 185,
    US500: 5950, US100: 20850, US30: 43800, OTC_SPC: 5950, OTC_NDX: 20850, OTC_DJI: 43800,
    R_10: 6350, R_25: 2850, R_50: 195, R_75: 125000, R_100: 1650,
    '1HZ10V': 9100, '1HZ75V': 6800, '1HZ100V': 850,
    BOOM500: 4500, BOOM1000: 14200, CRASH500: 4100, CRASH1000: 7800,
  };
  let price = baseMap[clean] || 100;
  const digits = clean.includes('JPY') ? 3 : (price < 10 ? 5 : 2);
  const factor = Math.pow(10, digits);
  const tfSecMap = {
    M1: 60, M5: 300, M15: 900, M30: 1800,
    H1: 3600, H2: 7200, H4: 14400, H6: 21600, H8: 28800,
    D1: 86400, W1: 604800, MN: 2592000,
  };
  const stepSec = tfSecMap[timeframe] || 3600;
  const nowBucket = Math.floor(Date.now() / 1000 / stepSec) * stepSec;
  let seed = clean.split('').reduce((a, ch) => a + ch.charCodeAt(0) * 31, 1337);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const volPct = price < 10 ? 0.0014 : 0.0025;
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const time = nowBucket - i * stepSec;
    const open = price;
    let delta = (rand() - 0.495) * open * volPct;
    if (Math.abs(delta) < open * volPct * 0.18) {
      delta = (delta >= 0 ? 1 : -1) * open * volPct * 0.25;
    }
    const close = Math.max(open * 0.2, open + delta);
    const bodyMax = Math.max(open, close);
    const bodyMin = Math.min(open, close);
    const bodySize = Math.max(bodyMax - bodyMin, open * volPct * 0.15);
    const high = bodyMax + rand() * bodySize * 0.85;
    const low = Math.max(open * 0.1, bodyMin - rand() * bodySize * 0.85);
    out.push({
      time,
      open: Math.round(open * factor) / factor,
      high: Math.round(high * factor) / factor,
      low: Math.round(low * factor) / factor,
      close: Math.round(close * factor) / factor,
      volume: Math.floor(120 + rand() * 900),
    });
    price = close;
  }
  return out;
}

export const demoApi = {
  getAccount: () => api.get('/demo/account').then((r) => r.data),
  reset: () => api.post('/demo/account/reset').then((r) => r.data),
  instruments: (category) =>
    api.get('/demo/instruments', { params: category ? { category } : {} })
      .then((r) => {
        const list = r.data?.instruments;
        if (Array.isArray(list) && list.length > 0) return r.data;
        const filtered = category ? DEFAULT_DEMO_INSTRUMENTS.filter((i) => i.category === String(category).toUpperCase()) : DEFAULT_DEMO_INSTRUMENTS;
        return { instruments: filtered };
      })
      .catch(() => {
        const filtered = category ? DEFAULT_DEMO_INSTRUMENTS.filter((i) => i.category === String(category).toUpperCase()) : DEFAULT_DEMO_INSTRUMENTS;
        return { instruments: filtered };
      }),
  candles: (symbol, timeframe, count = 300) =>
    api.get('/demo/candles', { params: { symbol, timeframe, count } })
      .then((r) => {
        if (Array.isArray(r.data?.candles) && r.data.candles.length > 0) return r.data;
        return { symbol, timeframe, candles: generateClientFallbackCandles(symbol, timeframe, count) };
      })
      .catch(() => ({
        symbol,
        timeframe,
        candles: generateClientFallbackCandles(symbol, timeframe, count),
      })),
  positions: () => api.get('/demo/positions').then((r) => r.data),
  orders: () => api.get('/demo/orders').then((r) => r.data),
  history: () => api.get('/demo/history').then((r) => r.data),
  openMarket: (body) => api.post('/demo/orders/market', body).then((r) => r.data),
  closePosition: (id, volume) => api.post(`/demo/positions/${id}/close`, volume != null ? { volume } : {}).then((r) => r.data),
  updatePosition: (id, body) => api.patch(`/demo/positions/${id}`, body).then((r) => r.data),
  createPending: (body) => api.post('/demo/orders/pending', body).then((r) => r.data),
  updatePending: (id, body) => api.patch(`/demo/orders/${id}`, body).then((r) => r.data),
  cancelPending: (id) => api.delete(`/demo/orders/${id}`).then((r) => r.data),
  watchlist: () => api.get('/demo/watchlist').then((r) => r.data).catch(() => ({ symbols: ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD', 'R_75'] })),
  updateWatchlist: (symbol, action) => api.post('/demo/watchlist', { symbol, action }).then((r) => r.data),
  alerts: (symbol) => api.get('/demo/alerts', { params: symbol ? { symbol } : {} }).then((r) => r.data),
  createAlert: (body) => api.post('/demo/alerts', body).then((r) => r.data),
  toggleAlert: (id) => api.patch(`/demo/alerts/${id}`).then((r) => r.data),
  triggerAlert: (id, body) => api.post(`/demo/alerts/${id}/trigger`, body || {}).then((r) => r.data),
  deleteAlert: (id) => api.delete(`/demo/alerts/${id}`).then((r) => r.data),
  clearAlerts: (symbol) => api.delete('/demo/alerts', { params: symbol ? { symbol } : {} }).then((r) => r.data),
};

// Catégories affichées dans le terminal.
export const DEMO_CATEGORIES = [
  { key: 'FOREX', label: 'Forex' },
  { key: 'CRYPTO', label: 'Crypto' },
  { key: 'METALS', label: 'Métaux' },
  { key: 'INDICES', label: 'Indices' },
  { key: 'SYNTHETIC', label: 'Synthétiques' },
  { key: 'OTHER', label: 'Autres' },
];

export const DEMO_TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H2', 'H4', 'H6', 'H8', 'D1', 'W1', 'MN'];

export const fmt = (n, d = 2) => (n == null || isNaN(n) ? '—' : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }));

