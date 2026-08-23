// Contrôleur du module Trading Demo (transactions 100 % virtuelles).
// Sécurité : toutes les routes sont authentifiées ; chaque ressource est vérifiée
// comme appartenant au compte démo de req.user.id (isolation stricte).
const { DemoAccount, Instrument, Position, PendingOrder, Trade, Watchlist } = require('../models');
const liveFeed = require('../utils/marketData/liveFeed');
const engine = require('../utils/tradingDemo/engine');
const watcher = require('../utils/tradingDemo/watcher');
const { getCandles } = require('../utils/marketData/candleService');
const { validateStops } = require('../utils/tradingDemo/engine');

// Anti-double-clic : verrou court par compte pour sérialiser les écritures d'ordres.
const accountLocks = new Set();
async function withAccountLock(accountId, fn) {
  const key = String(accountId);
  if (accountLocks.has(key)) throw new Error('Opération déjà en cours, réessayez');
  accountLocks.add(key);
  try { return await fn(); } finally { accountLocks.delete(key); }
}

// Génère un numéro de compte démo lisible.
function genAccountNumber() {
  return 'DEMO-' + Math.floor(1000000 + Math.random() * 8999999);
}

// Récupère (ou crée à la volée) le compte démo de l'utilisateur courant.
async function getOrCreateAccount(userId) {
  let account = await DemoAccount.findOne({ user_id: userId });
  if (!account) {
    account = await DemoAccount.create({
      user_id: userId,
      account_number: genAccountNumber(),
    });
  }
  return account;
}

// GET /api/demo/account — compte + métriques temps réel.
exports.getAccount = async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.user.id);
    await engine.refreshAccount(account);
    res.json({ account: publicAccount(account) });
  } catch (err) {
    console.error('demo getAccount:', err.message);
    res.status(500).json({ message: 'Erreur compte démo' });
  }
};

// POST /api/demo/account/reset — réinitialise le compte démo (solde, positions, ordres).
exports.resetAccount = async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.user.id);
    await Promise.all([
      Position.deleteMany({ demo_account_id: account._id }),
      PendingOrder.deleteMany({ demo_account_id: account._id }),
    ]);
    account.balance = account.initial_balance;
    account.equity = account.initial_balance;
    account.used_margin = 0;
    account.free_margin = account.initial_balance;
    account.status = 'active';
    await account.save();
    res.json({ account: publicAccount(account), message: 'Compte démo réinitialisé' });
  } catch (err) {
    console.error('demo resetAccount:', err.message);
    res.status(500).json({ message: 'Erreur réinitialisation' });
  }
};

// GET /api/demo/instruments — liste des instruments activés (+ dernière cotation connue).
exports.getInstruments = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { enabled: true };
    if (category) filter.category = category;
    const instruments = await Instrument.find(filter).sort({ category: 1, symbol: 1 });
    const out = instruments.map((i) => {
      const q = liveFeed.getQuote(i.symbol);
      return {
        symbol: i.symbol, name: i.name, category: i.category, digits: i.digits,
        min_volume: i.min_volume, max_volume: i.max_volume, volume_step: i.volume_step,
        pip_size: i.pip_size, spread_pips: i.spread_pips,
        bid: q ? round(q.bid, i.digits) : null,
        ask: q ? round(q.ask, i.digits) : null,
      };
    });
    res.json({ instruments: out });
  } catch (err) {
    console.error('demo getInstruments:', err.message);
    res.status(500).json({ message: 'Erreur instruments' });
  }
};

// GET /api/demo/candles?symbol=EURUSD&timeframe=H1&count=300 — historique graphique.
exports.getCandles = async (req, res) => {
  try {
    const { symbol, timeframe = 'H1', count = 300 } = req.query;
    if (!symbol) return res.status(400).json({ message: 'symbol requis' });
    const instrument = await Instrument.findOne({ symbol, enabled: true });
    if (!instrument) return res.status(404).json({ message: 'Instrument introuvable' });
    if (!instrument.provider_symbol) return res.json({ symbol, timeframe, candles: [] });
    const candles = await getCandles(instrument, timeframe, count);
    res.json({ symbol, symbol_name: instrument.name, timeframe, candles });
  } catch (err) {
    console.error('demo getCandles:', err.message);
    res.status(502).json({ message: err.message || 'Données indisponibles' });
  }
};

// GET /api/demo/positions — positions ouvertes (marquées au marché).
exports.getPositions = async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.user.id);
    await engine.refreshAccount(account);
    const positions = await Position.find({ demo_account_id: account._id, status: 'OPEN' }).sort({ opened_at: -1 });
    res.json({ positions: positions.map(publicPosition) });
  } catch (err) {
    console.error('demo getPositions:', err.message);
    res.status(500).json({ message: 'Erreur positions' });
  }
};

// GET /api/demo/orders — ordres en attente.
exports.getOrders = async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.user.id);
    const orders = await PendingOrder.find({ demo_account_id: account._id, status: 'PENDING' }).sort({ created_at: -1 });
    res.json({ orders: orders.map(publicOrder) });
  } catch (err) {
    console.error('demo getOrders:', err.message);
    res.status(500).json({ message: 'Erreur ordres' });
  }
};

// GET /api/demo/history — historique des trades fermés.
exports.getHistory = async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.user.id);
    const trades = await Trade.find({ demo_account_id: account._id }).sort({ closed_at: -1 }).limit(200);
    res.json({ trades: trades.map(publicTrade) });
  } catch (err) {
    console.error('demo getHistory:', err.message);
    res.status(500).json({ message: 'Erreur historique' });
  }
};

// POST /api/demo/orders/market — ouverture au marché. Body: { symbol, side, volume, stop_loss?, take_profit? }
exports.openMarket = async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.user.id);
    if (account.status !== 'active') return res.status(400).json({ message: 'Compte démo inactif' });

    const { symbol, side, volume, stop_loss = null, take_profit = null } = req.body;
    if (!symbol || !side || volume == null) return res.status(400).json({ message: 'symbol, side et volume requis' });

    const instrument = await Instrument.findOne({ symbol, enabled: true });
    if (!instrument) return res.status(404).json({ message: 'Instrument introuvable ou désactivé' });

    watcher.ensure(symbol); // garantit le flux de prix pour SL/TP à venir
    const position = await withAccountLock(account._id, () =>
      engine.openMarketPosition({
        account, instrument, side,
        volume: Number(volume),
        stopLoss: stop_loss == null ? null : Number(stop_loss),
        takeProfit: take_profit == null ? null : Number(take_profit),
      })
    );
    res.status(201).json({ position: publicPosition(position), account: publicAccount(account) });
  } catch (err) {
    res.status(400).json({ message: err.message || "Impossible d'ouvrir la position" });
  }
};

// POST /api/demo/positions/:id/close — fermeture totale ou partielle. Body: { volume? }
exports.closePosition = async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.user.id);
    const position = await Position.findOne({ _id: req.params.id, demo_account_id: account._id, status: 'OPEN' });
    if (!position) return res.status(404).json({ message: 'Position introuvable' });
    const instrument = await Instrument.findById(position.instrument_id);
    if (!instrument) return res.status(404).json({ message: 'Instrument introuvable' });

    const { volume = null } = req.body || {};
    const result = await withAccountLock(account._id, () =>
      engine.closePosition({ account, instrument, position, volume: volume == null ? null : Number(volume), reason: 'MANUAL' })
    );
    res.json({ ...result, account: publicAccount(account) });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Impossible de fermer la position' });
  }
};

// PATCH /api/demo/positions/:id — modifie SL/TP. Body: { stop_loss?, take_profit? }
exports.updatePosition = async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.user.id);
    const position = await Position.findOne({ _id: req.params.id, demo_account_id: account._id, status: 'OPEN' });
    if (!position) return res.status(404).json({ message: 'Position introuvable' });

    const { stop_loss, take_profit } = req.body || {};
    const sl = stop_loss === undefined ? position.stop_loss : (stop_loss == null ? null : Number(stop_loss));
    const tp = take_profit === undefined ? position.take_profit : (take_profit == null ? null : Number(take_profit));
    validateStops(position.side, position.entry_price, sl, tp);
    position.stop_loss = sl;
    position.take_profit = tp;
    await position.save();
    res.json({ position: publicPosition(position) });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Modification impossible' });
  }
};

// POST /api/demo/orders/pending — crée un ordre en attente.
// Body: { symbol, type, volume, entry_price, stop_loss?, take_profit? }
exports.createPending = async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.user.id);
    if (account.status !== 'active') return res.status(400).json({ message: 'Compte démo inactif' });

    const { symbol, type, volume, entry_price, stop_loss = null, take_profit = null } = req.body;
    const TYPES = ['BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP'];
    if (!symbol || !TYPES.includes(type) || volume == null || entry_price == null) {
      return res.status(400).json({ message: 'Champs requis : symbol, type valide, volume, entry_price' });
    }
    const instrument = await Instrument.findOne({ symbol, enabled: true });
    if (!instrument) return res.status(404).json({ message: 'Instrument introuvable' });

    engine.validateVolume(instrument, volume);

    const quote = liveFeed.getQuote(symbol);
    if (!quote) return res.status(400).json({ message: 'Prix indisponible pour placer cet ordre' });
    const entry = Number(entry_price);
    const ref = quote.mid;

    // Cohérence du niveau vs marché selon le type.
    const errMsg = {
      BUY_LIMIT: 'Le prix doit être INFÉRIEUR au marché (BUY LIMIT)',
      SELL_LIMIT: 'Le prix doit être SUPÉRIEUR au marché (SELL LIMIT)',
      BUY_STOP: 'Le prix doit être SUPÉRIEUR au marché (BUY STOP)',
      SELL_STOP: 'Le prix doit être INFÉRIEUR au marché (SELL STOP)',
    };
    const ok =
      (type === 'BUY_LIMIT' && entry < ref) ||
      (type === 'SELL_LIMIT' && entry > ref) ||
      (type === 'BUY_STOP' && entry > ref) ||
      (type === 'SELL_STOP' && entry < ref);
    if (!ok) return res.status(400).json({ message: errMsg[type] });

    // SL/TP cohérents avec le sens de l'ordre.
    const side = type.startsWith('BUY') ? 'BUY' : 'SELL';
    validateStops(side, entry, stop_loss == null ? null : Number(stop_loss), take_profit == null ? null : Number(take_profit));

    const order = await PendingOrder.create({
      demo_account_id: account._id,
      instrument_id: instrument._id,
      symbol, type,
      volume: Number(volume),
      entry_price: entry,
      stop_loss: stop_loss == null ? null : Number(stop_loss),
      take_profit: take_profit == null ? null : Number(take_profit),
      status: 'PENDING',
    });
    watcher.ensure(symbol); // surveillance immédiate du niveau
    res.status(201).json({ order: publicOrder(order) });
  } catch (err) {
    res.status(400).json({ message: err.message || "Impossible de créer l'ordre" });
  }
};

// PATCH /api/demo/orders/:id — modifie un pending (prix/volume/SL/TP).
exports.updatePending = async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.user.id);
    const order = await PendingOrder.findOne({ _id: req.params.id, demo_account_id: account._id, status: 'PENDING' });
    if (!order) return res.status(404).json({ message: 'Ordre introuvable' });
    const instrument = await Instrument.findById(order.instrument_id);
    if (!instrument) return res.status(404).json({ message: 'Instrument introuvable' });

    const { entry_price, volume, stop_loss, take_profit } = req.body || {};
    if (volume != null) { engine.validateVolume(instrument, volume); order.volume = Number(volume); }
    if (entry_price != null) order.entry_price = Number(entry_price);
    if (stop_loss !== undefined) order.stop_loss = stop_loss == null ? null : Number(stop_loss);
    if (take_profit !== undefined) order.take_profit = take_profit == null ? null : Number(take_profit);

    const side = order.type.startsWith('BUY') ? 'BUY' : 'SELL';
    validateStops(side, order.entry_price, order.stop_loss, order.take_profit);
    await order.save();
    res.json({ order: publicOrder(order) });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Modification impossible' });
  }
};

// DELETE /api/demo/orders/:id — annule un ordre en attente.
exports.cancelPending = async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.user.id);
    const order = await PendingOrder.findOne({ _id: req.params.id, demo_account_id: account._id, status: 'PENDING' });
    if (!order) return res.status(404).json({ message: 'Ordre introuvable' });
    order.status = 'CANCELLED';
    await order.save();
    res.json({ message: 'Ordre annulé' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Annulation impossible' });
  }
};

// GET /api/demo/watchlist — favoris de l'utilisateur.
exports.getWatchlist = async (req, res) => {
  try {
    let wl = await Watchlist.findOne({ user_id: req.user.id });
    if (!wl) wl = await Watchlist.create({ user_id: req.user.id, symbols: ['EURUSD', 'BTCUSD', 'XAUUSD'] });
    res.json({ symbols: wl.symbols });
  } catch (err) {
    console.error('demo getWatchlist:', err.message);
    res.status(500).json({ message: 'Erreur watchlist' });
  }
};

// POST /api/demo/watchlist — ajoute/retire un symbole. Body: { symbol, action:'add'|'remove' }
exports.updateWatchlist = async (req, res) => {
  try {
    const { symbol, action } = req.body || {};
    if (!symbol || !['add', 'remove'].includes(action)) return res.status(400).json({ message: 'symbol et action requis' });
    let wl = await Watchlist.findOne({ user_id: req.user.id });
    if (!wl) wl = await Watchlist.create({ user_id: req.user.id, symbols: [] });
    if (action === 'add' && !wl.symbols.includes(symbol)) wl.symbols.push(symbol);
    if (action === 'remove') wl.symbols = wl.symbols.filter((s) => s !== symbol);
    await wl.save();
    res.json({ symbols: wl.symbols });
  } catch (err) {
    console.error('demo updateWatchlist:', err.message);
    res.status(500).json({ message: 'Erreur watchlist' });
  }
};

// --- Sérialiseurs (formes publiques) ---
function round(n, d = 2) { const f = Math.pow(10, d); return Math.round((n + Number.EPSILON) * f) / f; }
function publicAccount(a) {
  const level = a.used_margin > 0 ? round((a.equity / a.used_margin) * 100, 2) : null;
  return {
    id: a._id, account_number: a.account_number, currency: a.currency, leverage: a.leverage,
    balance: round(a.balance), equity: round(a.equity), used_margin: round(a.used_margin),
    free_margin: round(a.free_margin), margin_level: level,
    floating_pnl: round(a.equity - a.balance), initial_balance: a.initial_balance, status: a.status,
  };
}
function publicPosition(p) {
  return {
    id: p._id, symbol: p.symbol, side: p.side, volume: p.volume,
    entry_price: p.entry_price, current_price: p.current_price,
    stop_loss: p.stop_loss, take_profit: p.take_profit,
    margin: p.margin, profit: round(p.profit), opened_at: p.opened_at,
  };
}
function publicOrder(o) {
  return {
    id: o._id, symbol: o.symbol, type: o.type, volume: o.volume, entry_price: o.entry_price,
    stop_loss: o.stop_loss, take_profit: o.take_profit, status: o.status, created_at: o.created_at,
  };
}
function publicTrade(t) {
  return {
    id: t._id, symbol: t.symbol, side: t.side, volume: t.volume,
    entry_price: t.entry_price, exit_price: t.exit_price, profit: round(t.profit),
    close_reason: t.close_reason, opened_at: t.opened_at, closed_at: t.closed_at,
  };
}
