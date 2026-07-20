// utils/backtest/strategy.js
// Traduction d'une stratégie (template OU règles personnalisées) en « signaux »
// exploitables par le moteur, + évaluation des conditions bougie par bougie.
//
// Un signal est un ensemble de conditions ANDées. Une stratégie produit jusqu'à
// 4 jeux de signaux : longEntry / longExit / shortEntry / shortExit.
//
// Une condition : { left, operator, right } où left/right sont des « opérandes ».
// Opérande : { source:'indicator'|'price'|'value', indicator?, params?, field?, price?, value? }
// Opérateurs : '>' '<' '>=' '<=' '=' 'cross_above' 'cross_below'.
const { indicatorKey } = require('../indicators')

// ---- Constructeurs d'opérandes (sucre syntaxique pour les templates) ----
const ind = (indicator, params = {}, field) => ({ source: 'indicator', indicator, params, field })
const price = (p = 'close') => ({ source: 'price', price: p })
const val = (value) => ({ source: 'value', value })

// ---- Résolution d'une valeur d'opérande à l'index i ----
function valueAt(store, candles, operand, i) {
  if (!operand || i < 0) return null
  if (operand.source === 'value') return Number(operand.value)
  if (operand.source === 'price') return candles[i][operand.price || 'close']
  if (operand.source === 'indicator') {
    const series = store[indicatorKey(operand.indicator, operand.params)]
    if (series == null) return null
    if (Array.isArray(series)) return series[i]
    // Indicateur à sorties multiples ({ field: [...] }) → champ demandé (ou 1er).
    const field = operand.field || Object.keys(series)[0]
    return series[field] ? series[field][i] : null
  }
  return null
}

// ---- Évaluation d'une condition ----
function evaluateCondition(store, candles, cond, i) {
  const op = cond.operator
  const L = valueAt(store, candles, cond.left, i)
  const R = valueAt(store, candles, cond.right, i)
  if (op === 'cross_above' || op === 'cross_below') {
    const Lp = valueAt(store, candles, cond.left, i - 1)
    const Rp = valueAt(store, candles, cond.right, i - 1)
    if (L == null || R == null || Lp == null || Rp == null) return false
    return op === 'cross_above' ? Lp <= Rp && L > R : Lp >= Rp && L < R
  }
  if (L == null || R == null) return false
  switch (op) {
    case '>': return L > R
    case '<': return L < R
    case '>=': return L >= R
    case '<=': return L <= R
    case '=': return Math.abs(L - R) < 1e-9
    default: return false
  }
}

// Toutes les conditions doivent être vraies (AND). Un jeu vide = pas de signal.
function evaluateConditions(store, candles, conditions, i) {
  if (!conditions || conditions.length === 0) return false
  return conditions.every((c) => evaluateCondition(store, candles, c, i))
}

// ---- Templates : génèrent les signaux selon la direction ----
function applyDirection(sig, dir) {
  if (dir === 'long') { sig.shortEntry = null; sig.shortExit = null }
  else if (dir === 'short') { sig.longEntry = null; sig.longExit = null }
  return sig
}

function templateSignals(template, p, dir) {
  let sig = { longEntry: null, longExit: null, shortEntry: null, shortExit: null }
  switch (template) {
    case 'ema_cross': {
      const fast = p.fast || 9, slow = p.slow || 21
      sig.longEntry = [{ left: ind('ema', { period: fast }), operator: 'cross_above', right: ind('ema', { period: slow }) }]
      sig.longExit = [{ left: ind('ema', { period: fast }), operator: 'cross_below', right: ind('ema', { period: slow }) }]
      sig.shortEntry = [{ left: ind('ema', { period: fast }), operator: 'cross_below', right: ind('ema', { period: slow }) }]
      sig.shortExit = [{ left: ind('ema', { period: fast }), operator: 'cross_above', right: ind('ema', { period: slow }) }]
      break
    }
    case 'rsi': {
      const period = p.period || 14, os = p.oversold || 30, ob = p.overbought || 70
      sig.longEntry = [{ left: ind('rsi', { period }), operator: 'cross_above', right: val(os) }]
      sig.longExit = [{ left: ind('rsi', { period }), operator: 'cross_above', right: val(ob) }]
      sig.shortEntry = [{ left: ind('rsi', { period }), operator: 'cross_below', right: val(ob) }]
      sig.shortExit = [{ left: ind('rsi', { period }), operator: 'cross_below', right: val(os) }]
      break
    }
    case 'macd': {
      const params = { fast: p.fast || 12, slow: p.slow || 26, signal: p.signal || 9 }
      sig.longEntry = [{ left: ind('macd', params, 'macd'), operator: 'cross_above', right: ind('macd', params, 'signal') }]
      sig.longExit = [{ left: ind('macd', params, 'macd'), operator: 'cross_below', right: ind('macd', params, 'signal') }]
      sig.shortEntry = [{ left: ind('macd', params, 'macd'), operator: 'cross_below', right: ind('macd', params, 'signal') }]
      sig.shortExit = [{ left: ind('macd', params, 'macd'), operator: 'cross_above', right: ind('macd', params, 'signal') }]
      break
    }
    case 'bollinger': {
      const params = { period: p.period || 20, mult: p.mult || 2 }
      sig.longEntry = [{ left: price(), operator: 'cross_below', right: ind('bollinger', params, 'lower') }]
      sig.longExit = [{ left: price(), operator: 'cross_above', right: ind('bollinger', params, 'mid') }]
      sig.shortEntry = [{ left: price(), operator: 'cross_above', right: ind('bollinger', params, 'upper') }]
      sig.shortExit = [{ left: price(), operator: 'cross_below', right: ind('bollinger', params, 'mid') }]
      break
    }
    default:
      break
  }
  return applyDirection(sig, dir)
}

// ---- Construction des signaux (template ou règles personnalisées) ----
function buildSignals(strategy) {
  const dir = (strategy.risk && strategy.risk.direction) || 'long'
  if (strategy.template && strategy.template !== 'custom') {
    return templateSignals(strategy.template, strategy.parameters || {}, dir)
  }
  const sig = { longEntry: null, longExit: null, shortEntry: null, shortExit: null }
  if (dir === 'short') { sig.shortEntry = strategy.entry_rules || []; sig.shortExit = strategy.exit_rules || [] }
  else { sig.longEntry = strategy.entry_rules || []; sig.longExit = strategy.exit_rules || [] }
  return sig
}

// ---- Collecte des indicateurs référencés (pour précalcul) ----
function collectSpecs(strategy) {
  const sig = buildSignals(strategy)
  const specs = []
  const add = (operand) => {
    if (operand && operand.source === 'indicator') specs.push({ type: operand.indicator, params: operand.params })
  }
  for (const set of [sig.longEntry, sig.longExit, sig.shortEntry, sig.shortExit]) {
    for (const cond of set || []) { add(cond.left); add(cond.right) }
  }
  return specs
}

module.exports = { buildSignals, collectSpecs, evaluateConditions, evaluateCondition, valueAt }
