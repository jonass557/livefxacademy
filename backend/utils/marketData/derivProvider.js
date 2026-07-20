// utils/marketData/derivProvider.js
// Fournisseur de données historiques FOREX via l'API WebSocket de Deriv.
//
// Endpoint : wss://ws.derivws.com/websockets/v3?app_id=<DERIV_APP_ID>
// Requête bougies : { ticks_history, style:'candles', granularity, end, count, adjust_start_time }
// Réponse : { msg_type:'candles', candles:[{ epoch, open, high, low, close }] }
// NB : les données de marché ne requièrent PAS de token d'autorisation (app_id suffit).
//      Le forex Deriv ne fournit PAS de volume → champ `volume` omis.
const WebSocket = require('ws')
const { TIMEFRAMES, MAX_CANDLES } = require('./provider')

const APP_ID = process.env.DERIV_APP_ID || '1089' // 1089 = app_id public de test
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`
const PER_REQUEST = 5000 // maximum de bougies par requête Deriv
const SOCKET_TIMEOUT = 25000

// Paires majeures exposées (pip = taille d'un point : 0.01 pour les paires JPY, sinon 0.0001).
const SYMBOLS = [
  { symbol: 'frxEURUSD', name: 'EUR/USD', pip: 0.0001 },
  { symbol: 'frxGBPUSD', name: 'GBP/USD', pip: 0.0001 },
  { symbol: 'frxUSDJPY', name: 'USD/JPY', pip: 0.01 },
  { symbol: 'frxAUDUSD', name: 'AUD/USD', pip: 0.0001 },
  { symbol: 'frxUSDCAD', name: 'USD/CAD', pip: 0.0001 },
  { symbol: 'frxUSDCHF', name: 'USD/CHF', pip: 0.0001 },
  { symbol: 'frxNZDUSD', name: 'NZD/USD', pip: 0.0001 },
  { symbol: 'frxEURGBP', name: 'EUR/GBP', pip: 0.0001 },
  { symbol: 'frxEURJPY', name: 'EUR/JPY', pip: 0.01 },
  { symbol: 'frxGBPJPY', name: 'GBP/JPY', pip: 0.01 },
]

function listSymbols() { return SYMBOLS }
function listTimeframes() { return TIMEFRAMES }
function getSymbolMeta(symbol) { return SYMBOLS.find((s) => s.symbol === symbol) || null }

// Ouvre une connexion WS, exécute `job(send)` puis ferme. `send(payload)` renvoie
// une promesse résolue avec la réponse Deriv correspondante (matching par req_id).
function withSocket(job) {
  return new Promise((resolve, reject) => {
    let settled = false
    const ws = new WebSocket(WS_URL)
    const pending = new Map() // req_id -> { resolve, reject }
    let reqSeq = 0

    const timer = setTimeout(() => {
      if (!settled) { settled = true; try { ws.close() } catch (_) {} reject(new Error('Deriv: délai de connexion dépassé')) }
    }, SOCKET_TIMEOUT)

    const finish = (fn, arg) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try { ws.close() } catch (_) {}
      fn(arg)
    }

    const send = (payload) =>
      new Promise((res, rej) => {
        const req_id = ++reqSeq
        pending.set(req_id, { res, rej })
        ws.send(JSON.stringify({ ...payload, req_id }))
      })

    ws.on('open', () => {
      Promise.resolve()
        .then(() => job(send))
        .then((result) => finish(resolve, result))
        .catch((err) => finish(reject, err))
    })

    ws.on('message', (raw) => {
      let msg
      try { msg = JSON.parse(raw.toString()) } catch (_) { return }
      const entry = msg.req_id != null ? pending.get(msg.req_id) : null
      if (!entry) return
      pending.delete(msg.req_id)
      if (msg.error) entry.rej(new Error('Deriv: ' + (msg.error.message || 'erreur API')))
      else entry.res(msg)
    })

    ws.on('error', (err) => finish(reject, new Error('Deriv: ' + err.message)))
    ws.on('close', () => {
      if (!settled) { settled = true; clearTimeout(timer); reject(new Error('Deriv: connexion fermée')) }
    })
  })
}

// Récupère les bougies OHLC de `start` à `end` (epoch secondes), paginées à rebours.
async function fetchCandles({ symbol, granularity, start, end }) {
  if (!getSymbolMeta(symbol)) throw new Error('Symbole non supporté : ' + symbol)
  const startEpoch = Math.floor(start)
  const endEpoch = Math.floor(end)
  if (!(startEpoch < endEpoch)) throw new Error('Période invalide (début ≥ fin)')

  return withSocket(async (send) => {
    const byEpoch = new Map()
    let cursorEnd = endEpoch

    // Boucle de pagination : on remonte le temps tant qu'il reste des bougies
    // dans la période et qu'on n'a pas atteint le plafond.
    for (let guard = 0; guard < Math.ceil(MAX_CANDLES / PER_REQUEST) + 2; guard++) {
      const msg = await send({
        ticks_history: symbol,
        style: 'candles',
        granularity,
        end: cursorEnd,
        count: PER_REQUEST,
        adjust_start_time: 1,
      })
      const candles = Array.isArray(msg.candles) ? msg.candles : []
      if (candles.length === 0) break

      let earliest = cursorEnd
      for (const c of candles) {
        const t = Number(c.epoch)
        if (t < earliest) earliest = t
        if (t >= startEpoch && t <= endEpoch && !byEpoch.has(t)) {
          byEpoch.set(t, {
            time: t,
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
          })
        }
      }

      // On a atteint (ou dépassé) le début demandé, ou le plafond, ou plus rien à paginer.
      if (earliest <= startEpoch || byEpoch.size >= MAX_CANDLES || candles.length < PER_REQUEST) break
      cursorEnd = earliest - 1
    }

    const out = Array.from(byEpoch.values()).sort((a, b) => a.time - b.time)
    // Respecte le plafond en conservant les bougies les plus récentes.
    return out.length > MAX_CANDLES ? out.slice(out.length - MAX_CANDLES) : out
  })
}

module.exports = {
  name: 'deriv',
  label: 'Deriv (Forex)',
  listSymbols,
  listTimeframes,
  getSymbolMeta,
  fetchCandles,
}
