// Client API du module Trading Demo (au-dessus de l'instance axios `api`).
import api from './api';

export const demoApi = {
  getAccount: () => api.get('/demo/account').then((r) => r.data),
  reset: () => api.post('/demo/account/reset').then((r) => r.data),
  instruments: (category) => api.get('/demo/instruments', { params: category ? { category } : {} }).then((r) => r.data),
  candles: (symbol, timeframe, count = 300) => api.get('/demo/candles', { params: { symbol, timeframe, count } }).then((r) => r.data),
  positions: () => api.get('/demo/positions').then((r) => r.data),
  orders: () => api.get('/demo/orders').then((r) => r.data),
  history: () => api.get('/demo/history').then((r) => r.data),
  openMarket: (body) => api.post('/demo/orders/market', body).then((r) => r.data),
  closePosition: (id, volume) => api.post(`/demo/positions/${id}/close`, volume != null ? { volume } : {}).then((r) => r.data),
  updatePosition: (id, body) => api.patch(`/demo/positions/${id}`, body).then((r) => r.data),
  createPending: (body) => api.post('/demo/orders/pending', body).then((r) => r.data),
  updatePending: (id, body) => api.patch(`/demo/orders/${id}`, body).then((r) => r.data),
  cancelPending: (id) => api.delete(`/demo/orders/${id}`).then((r) => r.data),
  watchlist: () => api.get('/demo/watchlist').then((r) => r.data),
  updateWatchlist: (symbol, action) => api.post('/demo/watchlist', { symbol, action }).then((r) => r.data),
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

export const DEMO_TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];

export const fmt = (n, d = 2) => (n == null || isNaN(n) ? '—' : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }));
