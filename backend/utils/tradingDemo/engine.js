// utils/tradingDemo/engine.js
// Moteur financier du compte démo : validations, ouverture/fermeture (totale et
// partielle), marge, et recalcul des métriques (Balance/Equity/Margin/Free/Level).
// Toutes les opérations sont VIRTUELLES et déterminées côté serveur.
const { Position, Trade } = require('../../models');
const liveFeed = require('../marketData/liveFeed');
const { executionPrice, closePrice, computeProfit, requiredMargin } = require('./pricing');

const EPS = 1e-9;

// --- Validations ---------------------------------------------------------
function validateVolume(instrument, volume) {
  const v = Number(volume);
  if (!(v > 0)) throw new Error('Volume invalide');
  if (v < instrument.min_volume - EPS) throw new Error(`Volume minimum : ${instrument.min_volume}`);
  if (v > instrument.max_volume + EPS) throw new Error(`Volume maximum : ${instrument.max_volume}`);
  const steps = v / instrument.volume_step;
  if (Math.abs(steps - Math.round(steps)) > 1e-6) {
    throw new Error(`Le volume doit être un multiple de ${instrument.volume_step}`);
  }
  return v;
}

// Cohérence SL/TP par rapport au prix de référence et au sens.
function validateStops(side, refPrice, stopLoss, takeProfit) {
  if (stopLoss != null) {
    if (side === 'BUY' && !(stopLoss < refPrice)) throw new Error('Le Stop Loss doit être inférieur au prix (BUY)');
    if (side === 'SELL' && !(stopLoss > refPrice)) throw new Error('Le Stop Loss doit être supérieur au prix (SELL)');
  }
  if (takeProfit != null) {
    if (side === 'BUY' && !(takeProfit > refPrice)) throw new Error('Le Take Profit doit être supérieur au prix (BUY)');
    if (side === 'SELL' && !(takeProfit < refPrice)) throw new Error('Le Take Profit doit être inférieur au prix (SELL)');
  }
}

// --- Marquage & métriques ------------------------------------------------
// Met à jour current_price + profit flottant d'une position selon la cotation.
function markPosition(position, instrument, quote) {
  if (!quote) return position;
  const mark = closePrice(position.side, quote); // prix auquel on clôturerait
  position.current_price = mark;
  position.profit = computeProfit(instrument, position.side, position.volume, position.entry_price, mark);
  return position;
}

// Recalcule Equity/Used Margin/Free Margin/Margin Level à partir des positions
// ouvertes (marquées au marché). `instrumentsById` : Map id->Instrument.
function recomputeMetrics(account, openPositions, instrumentsById) {
  let usedMargin = 0;
  let floating = 0;
  for (const p of openPositions) {
    const inst = instrumentsById.get(String(p.instrument_id));
    if (inst) {
      const q = liveFeed.getQuote(p.symbol);
      if (q) markPosition(p, inst, q);
    }
    usedMargin += p.margin || 0;
    floating += p.profit || 0;
  }
  account.used_margin = round2(usedMargin);
  account.equity = round2(account.balance + floating);
  account.free_margin = round2(account.equity - usedMargin);
  const marginLevel = usedMargin > 0 ? (account.equity / usedMargin) * 100 : null;
  return { floating: round2(floating), marginLevel: marginLevel == null ? null : round2(marginLevel) };
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

// --- Ouverture au marché -------------------------------------------------
async function openMarketPosition({ account, instrument, side, volume, stopLoss = null, takeProfit = null }) {
  if (!['BUY', 'SELL'].includes(side)) throw new Error('Sens invalide');
  const v = validateVolume(instrument, volume);

  const quote = liveFeed.getQuote(instrument.symbol);
  if (!quote) throw new Error('Prix indisponible pour cet instrument');

  const price = executionPrice(side, quote); // BUY=ask, SELL=bid (prix serveur)
  if (!(price > 0)) throw new Error('Prix indisponible');
  validateStops(side, price, stopLoss, takeProfit);

  const margin = requiredMargin(instrument, v, price, account.leverage);
  if (margin > account.free_margin + EPS) {
    throw new Error('Marge insuffisante pour ouvrir cette position');
  }

  const position = await Position.create({
    demo_account_id: account._id,
    instrument_id: instrument._id,
    symbol: instrument.symbol,
    side,
    volume: v,
    entry_price: price,
    current_price: closePrice(side, quote),
    stop_loss: stopLoss,
    take_profit: takeProfit,
    margin: round2(margin),
    profit: computeProfit(instrument, side, v, price, closePrice(side, quote)),
    status: 'OPEN',
    opened_at: new Date(),
  });

  // Réserve la marge et rafraîchit les métriques.
  account.used_margin = round2(account.used_margin + margin);
  await refreshAccount(account);
  return position;
}

// --- Fermeture (totale ou partielle) ------------------------------------
async function closePosition({ account, instrument, position, volume = null, reason = 'MANUAL' }) {
  if (position.status !== 'OPEN') throw new Error('Position déjà fermée');
  const quote = liveFeed.getQuote(position.symbol);
  if (!quote) throw new Error('Prix indisponible pour clôturer');
  const exit = closePrice(position.side, quote);

  let closeVol = volume == null ? position.volume : Number(volume);
  if (!(closeVol > 0) || closeVol > position.volume + EPS) throw new Error('Volume de clôture invalide');

  // Si le résidu passerait sous le volume minimum, on clôture entièrement.
  const remaining = position.volume - closeVol;
  const fullClose = remaining < instrument.min_volume - EPS || Math.abs(remaining) < EPS;

  const proportion = fullClose ? 1 : closeVol / position.volume;
  const realizedVol = fullClose ? position.volume : closeVol;
  const profit = computeProfit(instrument, position.side, realizedVol, position.entry_price, exit);
  const releasedMargin = fullClose ? position.margin : round2(position.margin * proportion);

  // Journalise le trade fermé.
  await Trade.create({
    demo_account_id: account._id,
    instrument_id: instrument._id,
    symbol: position.symbol,
    side: position.side,
    volume: realizedVol,
    entry_price: position.entry_price,
    exit_price: exit,
    stop_loss: position.stop_loss,
    take_profit: position.take_profit,
    profit: round2(profit),
    opened_at: position.opened_at,
    closed_at: new Date(),
    close_reason: fullClose ? reason : 'PARTIAL',
  });

  // Applique le résultat au compte.
  account.balance = round2(account.balance + profit);
  account.used_margin = round2(Math.max(0, account.used_margin - releasedMargin));

  if (fullClose) {
    position.status = 'CLOSED';
    await position.deleteOne();
  } else {
    position.volume = round2(position.volume - closeVol);
    position.margin = round2(position.margin - releasedMargin);
    markPosition(position, instrument, quote);
    await position.save();
  }

  await refreshAccount(account);
  return { profit: round2(profit), fullClose };
}

// Recharge les positions ouvertes, recalcule et persiste les métriques du compte.
async function refreshAccount(account) {
  const { Instrument } = require('../../models');
  const openPositions = await Position.find({ demo_account_id: account._id, status: 'OPEN' });
  const ids = [...new Set(openPositions.map((p) => String(p.instrument_id)))];
  const instruments = await Instrument.find({ _id: { $in: ids } });
  const map = new Map(instruments.map((i) => [String(i._id), i]));
  const metrics = recomputeMetrics(account, openPositions, map);
  // Persiste les positions marquées.
  await Promise.all(openPositions.map((p) => p.save()));
  await account.save();
  return { account, openPositions, metrics };
}

// Ouvre une position à un PRIX IMPOSÉ (déclenchement d'un pending order au niveau).
// Vérifie la marge ; lève une erreur si insuffisante (l'appelant annule le pending).
async function openAtPrice({ account, instrument, side, volume, price, stopLoss = null, takeProfit = null }) {
  const v = validateVolume(instrument, volume);
  if (!(price > 0)) throw new Error('Prix de déclenchement invalide');
  const margin = requiredMargin(instrument, v, price, account.leverage);
  if (margin > account.free_margin + EPS) throw new Error('Marge insuffisante au déclenchement');

  const quote = liveFeed.getQuote(instrument.symbol);
  const mark = quote ? closePrice(side, quote) : price;
  const position = await Position.create({
    demo_account_id: account._id,
    instrument_id: instrument._id,
    symbol: instrument.symbol,
    side, volume: v,
    entry_price: price,
    current_price: mark,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    margin: round2(margin),
    profit: computeProfit(instrument, side, v, price, mark),
    status: 'OPEN',
    opened_at: new Date(),
  });
  account.used_margin = round2(account.used_margin + margin);
  await refreshAccount(account);
  return position;
}

module.exports = {
  validateVolume, validateStops, markPosition, recomputeMetrics,
  openMarketPosition, openAtPrice, closePosition, refreshAccount, round2,
};
