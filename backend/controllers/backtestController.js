// Contrôleur du module de backtesting.
// Orchestration : validation → récupération des bougies (fournisseur) →
// précalcul des indicateurs → moteur → statistiques → sauvegarde (optionnelle).
const { Backtest } = require('../models');
const { getProvider, listProviders, TIMEFRAMES } = require('../utils/marketData');
const { granularityOf, isValidTimeframe, MAX_CANDLES } = require('../utils/marketData/provider');
const { computeIndicators, listIndicators } = require('../utils/indicators');
const { collectSpecs } = require('../utils/backtest/strategy');
const { runBacktest } = require('../utils/backtest/engine');
const { computeStats } = require('../utils/backtest/stats');

// Garde-fous de taille des documents Mongo.
const MAX_SAVED_TRADES = 2000;
const MAX_EQUITY_POINTS = 2000;

// Sous-échantillonne la courbe d'équité pour l'affichage/stockage.
function downsample(points, max) {
  if (!Array.isArray(points) || points.length <= max) return points;
  const step = points.length / max;
  const out = [];
  for (let i = 0; i < max; i++) out.push(points[Math.floor(i * step)]);
  out[out.length - 1] = points[points.length - 1]; // conserver le dernier point
  return out;
}

// Métadonnées pour construire le formulaire côté client.
exports.getMeta = async (req, res) => {
  try {
    res.json({
      providers: listProviders(),
      timeframes: TIMEFRAMES,
      indicators: listIndicators(),
      templates: [
        { key: 'ema_cross', label: 'Croisement EMA', parameters: { fast: 9, slow: 21 } },
        { key: 'rsi', label: 'RSI (survente/surachat)', parameters: { period: 14, oversold: 30, overbought: 70 } },
        { key: 'macd', label: 'MACD (croisement signal)', parameters: { fast: 12, slow: 26, signal: 9 } },
        { key: 'bollinger', label: 'Bandes de Bollinger (retour à la moyenne)', parameters: { period: 20, mult: 2 } },
        { key: 'custom', label: 'Règles personnalisées', parameters: {} },
      ],
      max_candles: MAX_CANDLES,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Lance un backtest. Body :
// { provider, symbol, timeframe, start_date, end_date, strategy, config, name?, save? }
exports.runBacktest = async (req, res) => {
  try {
    const { provider: providerName = 'deriv', symbol, timeframe, start_date, end_date, strategy = {}, config = {}, name, save = true } = req.body;

    // --- Validation ---
    if (!symbol) return res.status(400).json({ message: 'Le symbole est requis' });
    if (!isValidTimeframe(timeframe)) return res.status(400).json({ message: 'Unité de temps invalide' });
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (isNaN(start) || isNaN(end)) return res.status(400).json({ message: 'Dates invalides' });
    if (start >= end) return res.status(400).json({ message: 'La date de début doit précéder la date de fin' });
    if (end > new Date()) return res.status(400).json({ message: 'La date de fin ne peut pas être dans le futur' });
    const initialBalance = Number(config.initial_balance);
    if (!(initialBalance > 0)) return res.status(400).json({ message: 'Le solde initial doit être positif' });

    let provider;
    try { provider = getProvider(providerName); }
    catch (e) { return res.status(400).json({ message: e.message }); }

    const meta = provider.getSymbolMeta(symbol);
    if (!meta) return res.status(400).json({ message: 'Symbole non supporté : ' + symbol });

    // --- Données de marché ---
    const candles = await provider.fetchCandles({
      symbol,
      granularity: granularityOf(timeframe),
      start: Math.floor(start.getTime() / 1000),
      end: Math.floor(end.getTime() / 1000),
    });
    if (!candles.length) return res.status(422).json({ message: 'Aucune donnée disponible pour cette période' });

    // --- Indicateurs + moteur + stats ---
    const store = computeIndicators(candles, collectSpecs(strategy));
    strategy.__symbol = meta.name || symbol;
    const { trades, equity_curve, final_balance } = runBacktest({ candles, store, strategy, config, pip: meta.pip });
    const stats = computeStats(trades, equity_curve, initialBalance, final_balance);

    const payload = {
      provider: providerName,
      symbol,
      symbol_name: meta.name,
      timeframe,
      start_date: start,
      end_date: end,
      candles_count: candles.length,
      strategy,
      config,
      stats,
      trades: trades.slice(0, MAX_SAVED_TRADES),
      equity_curve: downsample(equity_curve, MAX_EQUITY_POINTS),
    };

    let saved = null;
    if (save) {
      saved = await Backtest.create({ ...payload, user_id: req.user.id, name: name || `${meta.name} ${timeframe}` });
    }

    // Les bougies sont renvoyées au client (graphique chandeliers + replay)
    // mais ne sont PAS persistées en base (trop volumineux) — voir getBacktestCandles.
    res.json({ id: saved ? saved._id : null, truncated_trades: trades.length > MAX_SAVED_TRADES, ...payload, candles });
  } catch (err) {
    console.error('Backtest error:', err);
    res.status(502).json({ message: err.message || 'Erreur lors du backtest' });
  }
};

// Bougies OHLC d'un backtest sauvegardé : re-téléchargées depuis le fournisseur
// (elles ne sont pas stockées en base). Utilisé par le mode Replay sur l'historique.
exports.getBacktestCandles = async (req, res) => {
  try {
    const b = await Backtest.findOne({ _id: req.params.id, user_id: req.user.id })
      .select('provider symbol timeframe start_date end_date');
    if (!b) return res.status(404).json({ message: 'Backtest non trouvé' });

    let provider;
    try { provider = getProvider(b.provider); }
    catch (e) { return res.status(400).json({ message: e.message }); }

    const candles = await provider.fetchCandles({
      symbol: b.symbol,
      granularity: granularityOf(b.timeframe),
      start: Math.floor(new Date(b.start_date).getTime() / 1000),
      end: Math.floor(new Date(b.end_date).getTime() / 1000),
    });
    if (!candles.length) return res.status(422).json({ message: 'Aucune donnée disponible pour cette période' });

    res.json({ candles });
  } catch (err) {
    console.error('Backtest candles error:', err);
    res.status(502).json({ message: err.message || 'Erreur lors de la récupération des bougies' });
  }
};

// Bougies récentes d'un marché (graphique en direct de la page Backtesting).
// Query : provider?, symbol, timeframe, count? (défaut 300, max 1000)
//         ou start_date/end_date pour une période délimitée (aperçu avant replay).
exports.getMarketCandles = async (req, res) => {
  try {
    const { provider: providerName = 'deriv', symbol, timeframe = 'H1', start_date, end_date } = req.query;
    const count = Math.min(Math.max(Number(req.query.count) || 300, 1), 1000);
    if (!symbol) return res.status(400).json({ message: 'Le symbole est requis' });
    if (!isValidTimeframe(timeframe)) return res.status(400).json({ message: 'Unité de temps invalide' });

    let provider;
    try { provider = getProvider(providerName); }
    catch (e) { return res.status(400).json({ message: e.message }); }

    const meta = provider.getSymbolMeta(symbol);
    if (!meta) return res.status(400).json({ message: 'Symbole non supporté : ' + symbol });

    const granularity = granularityOf(timeframe);
    let start, end;
    if (start_date && end_date) {
      // Période explicite (aperçu de la zone à backtester).
      start = Math.floor(new Date(start_date).getTime() / 1000);
      end = Math.floor(new Date(end_date).getTime() / 1000);
      if (!(start < end)) return res.status(400).json({ message: 'Période invalide' });
      // Marge de contexte avant/après la période (10 % de part et d'autre).
      const margin = Math.max(Math.floor((end - start) * 0.1), granularity * 10);
      start -= margin;
      end = Math.min(end + margin, Math.floor(Date.now() / 1000));
    } else {
      end = Math.floor(Date.now() / 1000);
      start = end - count * granularity;
    }
    const candles = await provider.fetchCandles({ symbol, granularity, start, end });

    res.json({ symbol, symbol_name: meta.name, timeframe, candles });
  } catch (err) {
    console.error('Market candles error:', err);
    res.status(502).json({ message: err.message || 'Erreur lors de la récupération des données de marché' });
  }
};

// Historique des backtests de l'utilisateur (sans les gros champs).
exports.listBacktests = async (req, res) => {
  try {
    const items = await Backtest.find({ user_id: req.user.id })
      .select('-trades -equity_curve -strategy -config')
      .sort({ created_at: -1 })
      .limit(50);
    res.json(items.map(b => ({ ...b.toObject(), id: b._id })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Détail complet d'un backtest.
exports.getBacktest = async (req, res) => {
  try {
    const b = await Backtest.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!b) return res.status(404).json({ message: 'Backtest non trouvé' });
    res.json({ ...b.toObject(), id: b._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Suppression.
exports.deleteBacktest = async (req, res) => {
  try {
    const b = await Backtest.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
    if (!b) return res.status(404).json({ message: 'Backtest non trouvé' });
    res.json({ message: 'Backtest supprimé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
