// utils/backtest/engine.js
// Moteur de backtest : rejoue les bougies dans l'ordre chronologique, simule les
// ordres achat/vente, gère les positions (multiples possibles), Stop Loss, Take
// Profit, Trailing Stop, et applique spread / commission / slippage / levier.
//
// Modèle de P&L (forex, simplifié et documenté) :
//   - CONTRACT_SIZE = 100 000 unités par lot standard.
//   - profit_brut(quote) = sens * (prixSortie - prixEntrée) * CONTRACT_SIZE * lots
//     (exact en devise de cotation ; on suppose compte ≈ devise de cotation).
//   - spread + slippage sont intégrés aux prix d'exécution ; la commission est
//     un coût par lot prélevé à la clôture.
//   - Le levier borne la taille via la marge requise (notionnel / levier).
//
// Ordre de traitement par bougie :
//   1) gestion des positions déjà ouvertes (trailing → SL → TP → sortie sur signal)
//   2) entrées (au close) si la capacité (max_positions) le permet
//   3) valorisation de l'équité (mark-to-market) pour la courbe d'équité
const { buildSignals, evaluateConditions } = require('./strategy')

const CONTRACT_SIZE = 100000

// Taille de position (en lots) selon le mode.
function computeLots(config, balance, pip) {
  const { position_size = 0.1, position_size_mode = 'lots', sl_pips = 0 } = config
  if (position_size_mode === 'percent') {
    const risk = balance * (position_size / 100)
    const pipValuePerLot = pip * CONTRACT_SIZE
    const slPips = sl_pips > 0 ? sl_pips : 100 // repli : risque supposé de 100 pips
    return Math.max(0, risk / (slPips * pipValuePerLot))
  }
  return Math.max(0, position_size) // mode 'lots'
}

function runBacktest({ candles, store, strategy, config, pip }) {
  const signals = buildSignals(strategy)
  const risk = strategy.risk || {}
  const spread = Number(config.spread || 0)
  const slippage = Number(config.slippage || 0)
  const commission = Number(config.commission || 0)
  const leverage = Math.max(1, Number(config.leverage || 1))
  const maxPositions = Math.max(1, Number(config.max_positions || 1))
  const slPips = Number(risk.sl_pips || 0)
  const tpPips = Number(risk.tp_pips || 0)
  const trailPips = Number(risk.trailing_pips || 0)

  let balance = Number(config.initial_balance || 0)
  let marginUsed = 0
  const open = []
  const trades = []
  const equity_curve = []

  const unrealized = (pos, priceClose) =>
    (pos.side === 'long' ? 1 : -1) * (priceClose - pos.entry_price) * CONTRACT_SIZE * pos.lots

  // Ouvre une position au close de la bougie i (si marge suffisante).
  function openPosition(side, i) {
    const c = candles[i]
    const lots = computeLots(config, balance, pip)
    if (!(lots > 0)) return
    const cost = (spread + slippage) * pip
    const entry = side === 'long' ? c.close + cost : c.close - cost
    const margin = (lots * CONTRACT_SIZE * entry) / leverage
    if (margin > balance - marginUsed) return // levier : marge insuffisante → pas d'entrée
    let sl = null, tp = null
    if (side === 'long') {
      if (slPips > 0) sl = entry - slPips * pip
      if (tpPips > 0) tp = entry + tpPips * pip
    } else {
      if (slPips > 0) sl = entry + slPips * pip
      if (tpPips > 0) tp = entry - tpPips * pip
    }
    marginUsed += margin
    open.push({ side, entry_time: c.time, entry_index: i, entry_price: entry, sl, tp, lots, margin, trailed: false })
  }

  // Clôture une position à `exitPrice` (niveau brut ; le slippage est appliqué ici).
  function closePosition(pos, exitPrice, reason, exitTime) {
    const exitFill = pos.side === 'long' ? exitPrice - slippage * pip : exitPrice + slippage * pip
    const sign = pos.side === 'long' ? 1 : -1
    const gross = sign * (exitFill - pos.entry_price) * CONTRACT_SIZE * pos.lots
    const commissionCost = commission * pos.lots
    const net = gross - commissionCost
    balance += net
    marginUsed -= pos.margin
    trades.push({
      symbol: strategy.__symbol || '',
      side: pos.side === 'long' ? 'buy' : 'sell',
      entry_time: pos.entry_time,
      exit_time: exitTime,
      entry_price: pos.entry_price,
      exit_price: exitFill,
      sl: pos.sl,
      tp: pos.tp,
      size: pos.lots,
      profit: net,
      pips: (sign * (exitFill - pos.entry_price)) / pip,
      duration_sec: exitTime - pos.entry_time,
      close_reason: reason,
    })
  }

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]

    // 1) Gestion des positions ouvertes AUX bougies précédentes.
    for (let k = open.length - 1; k >= 0; k--) {
      const pos = open[k]
      if (pos.entry_index === i) continue // ouverte à cette bougie → gérée dès la suivante

      // Trailing stop : resserre le SL dans le sens favorable.
      if (trailPips > 0) {
        if (pos.side === 'long') {
          const cand = c.high - trailPips * pip
          if (pos.sl == null || cand > pos.sl) { pos.sl = cand; pos.trailed = true }
        } else {
          const cand = c.low + trailPips * pip
          if (pos.sl == null || cand < pos.sl) { pos.sl = cand; pos.trailed = true }
        }
      }

      // SL prioritaire sur TP si les deux sont touchés dans la même bougie (prudent).
      let closed = false
      if (pos.side === 'long') {
        if (pos.sl != null && c.low <= pos.sl) { closePosition(pos, pos.sl, pos.trailed ? 'trailing' : 'sl', c.time); closed = true }
        else if (pos.tp != null && c.high >= pos.tp) { closePosition(pos, pos.tp, 'tp', c.time); closed = true }
      } else {
        if (pos.sl != null && c.high >= pos.sl) { closePosition(pos, pos.sl, pos.trailed ? 'trailing' : 'sl', c.time); closed = true }
        else if (pos.tp != null && c.low <= pos.tp) { closePosition(pos, pos.tp, 'tp', c.time); closed = true }
      }
      if (closed) { open.splice(k, 1); continue }

      // Sortie sur signal (au close).
      const exitSet = pos.side === 'long' ? signals.longExit : signals.shortExit
      if (evaluateConditions(store, candles, exitSet, i)) {
        closePosition(pos, c.close, 'signal', c.time)
        open.splice(k, 1)
      }
    }

    // 2) Entrées (au close) si capacité disponible.
    if (open.length < maxPositions && evaluateConditions(store, candles, signals.longEntry, i)) openPosition('long', i)
    if (open.length < maxPositions && evaluateConditions(store, candles, signals.shortEntry, i)) openPosition('short', i)

    // 3) Équité mark-to-market.
    let equity = balance
    for (const pos of open) equity += unrealized(pos, c.close)
    equity_curve.push({ t: c.time, equity })
  }

  // Clôture des positions résiduelles à la dernière bougie.
  const lastIdx = candles.length - 1
  if (lastIdx >= 0) {
    const last = candles[lastIdx]
    for (const pos of open.slice()) closePosition(pos, last.close, 'end', last.time)
    open.length = 0
    if (equity_curve.length) equity_curve[equity_curve.length - 1] = { t: last.time, equity: balance }
  }

  return { trades, equity_curve, final_balance: balance }
}

module.exports = { runBacktest, CONTRACT_SIZE }
