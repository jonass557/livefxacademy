// utils/tradingDemo/watcher.js
// Surveillance SERVEUR (source de vérité) : à chaque tick de prix du hub,
//  - déclenche les Stop Loss / Take Profit des positions ouvertes,
//  - déclenche les Pending Orders dont le niveau est atteint.
// Fonctionne indépendamment de la présence de l'utilisateur sur la page.
//
// Pour éviter les traitements concurrents sur un même symbole, un verrou simple
// par symbole sérialise les évaluations.
const liveFeed = require('../marketData/liveFeed');
const { Position, PendingOrder, DemoAccount, Instrument } = require('../../models');
const engine = require('./engine');

const processing = new Set(); // symboles en cours d'évaluation

// Un pending est-il déclenché par la cotation courante ?
// LIMIT : on entre quand le prix revient au niveau (BUY_LIMIT sous le marché, etc.)
// STOP  : on entre quand le prix franchit le niveau.
function isTriggered(type, entry, quote) {
  switch (type) {
    case 'BUY_LIMIT': return quote.ask <= entry;   // achat à un prix plus bas
    case 'SELL_LIMIT': return quote.bid >= entry;   // vente à un prix plus haut
    case 'BUY_STOP': return quote.ask >= entry;   // cassure haussière
    case 'SELL_STOP': return quote.bid <= entry;   // cassure baissière
    default: return false;
  }
}

// SL/TP atteint ? On marque au prix de clôture (BUY→bid, SELL→ask).
function hitStop(position, quote) {
  const mark = position.side === 'BUY' ? quote.bid : quote.ask;
  if (position.stop_loss != null) {
    if (position.side === 'BUY' && mark <= position.stop_loss) return 'STOP_LOSS';
    if (position.side === 'SELL' && mark >= position.stop_loss) return 'STOP_LOSS';
  }
  if (position.take_profit != null) {
    if (position.side === 'BUY' && mark >= position.take_profit) return 'TAKE_PROFIT';
    if (position.side === 'SELL' && mark <= position.take_profit) return 'TAKE_PROFIT';
  }
  return null;
}

async function onQuote(quote) {
  const symbol = quote.symbol;
  if (processing.has(symbol)) return;
  processing.add(symbol);
  try {
    const instrument = await Instrument.findOne({ symbol });
    if (!instrument) return;

    // 1) SL/TP des positions ouvertes sur ce symbole.
    const positions = await Position.find({ symbol, status: 'OPEN' });
    for (const position of positions) {
      const reason = hitStop(position, quote);
      if (reason) {
        const account = await DemoAccount.findById(position.demo_account_id);
        if (account) {
          try { await engine.closePosition({ account, instrument, position, reason }); } catch (_) {}
        }
      }
    }

    // 2) Pending orders sur ce symbole.
    const pendings = await PendingOrder.find({ symbol, status: 'PENDING' });
    for (const order of pendings) {
      if (!isTriggered(order.type, order.entry_price, quote)) continue;
      const account = await DemoAccount.findById(order.demo_account_id);
      if (!account) continue;
      const side = order.type.startsWith('BUY') ? 'BUY' : 'SELL';
      try {
        const position = await engine.openAtPrice({
          account, instrument, side, volume: order.volume,
          price: order.entry_price, stopLoss: order.stop_loss, takeProfit: order.take_profit,
        });
        order.status = 'TRIGGERED';
        order.triggered_position_id = position._id;
        await order.save();
      } catch (_) {
        // Marge insuffisante au déclenchement, etc. → on annule le pending.
        order.status = 'CANCELLED';
        await order.save();
      }
    }
  } catch (err) {
    console.error('[trading-demo watcher]', err.message);
  } finally {
    processing.delete(symbol);
  }
}

let started = false;
const serverSubs = new Set(); // symboles maintenus abonnés côté serveur

// Paires majeures toujours diffusées : nécessaires à la conversion du P&L vers l'USD
// (ex. USDJPY pour les paires en JPY, EURUSD pour les instruments en EUR, etc.),
// même si aucun client ni aucune position ne les concerne directement.
const CONVERSION_SYMBOLS = ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDJPY', 'USDCHF', 'USDCAD'];

// Garantit un flux de prix pour un symbole même sans client connecté
// (appelé à l'ouverture d'une position / création d'un pending → latence minimale).
function ensure(symbol) {
  if (!serverSubs.has(symbol)) {
    if (liveFeed.subscribe(symbol)) serverSubs.add(symbol);
  }
}

// Réconcilie les abonnements serveur avec les symboles réellement « à surveiller ».
async function reconcile() {
  try {
    const [posSyms, ordSyms] = await Promise.all([
      Position.distinct('symbol', { status: 'OPEN' }),
      PendingOrder.distinct('symbol', { status: 'PENDING' }),
    ]);
    const needed = new Set([...posSyms, ...ordSyms, ...CONVERSION_SYMBOLS]);
    for (const s of needed) if (!serverSubs.has(s)) { if (liveFeed.subscribe(s)) serverSubs.add(s); }
    for (const s of Array.from(serverSubs)) if (!needed.has(s)) { liveFeed.unsubscribe(s); serverSubs.delete(s); }
  } catch (err) {
    console.error('[trading-demo watcher] reconcile:', err.message);
  }
}

function start() {
  if (started) return;
  started = true;
  liveFeed.on('quote', onQuote);
  // Abonnement permanent aux paires de conversion (taux → USD pour le P&L).
  for (const s of CONVERSION_SYMBOLS) if (liveFeed.subscribe(s)) serverSubs.add(s);
  reconcile();
  setInterval(reconcile, 20000); // se resynchronise (nouveaux/anciens symboles)
  console.log('[trading-demo watcher] démarré (SL/TP + pending orders, auto-abonnement serveur)');
}

module.exports = { start, ensure, reconcile, isTriggered, hitStop };
