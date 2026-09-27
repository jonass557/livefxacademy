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
const PRIMARY_WS_URL = process.env.DERIV_WS_URL || 'wss://api.derivws.com/trading/v1/options/ws/public'
const PER_REQUEST = 5000 // maximum de bougies par requête Deriv
const SOCKET_TIMEOUT = 4000 // 4s timeout max pour réactivité immédiate

// Cache mémoire des bougies pour un chargement instantané (0 ms)
const candleCache = new Map() // key -> { candles, expiresAt }
const CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes

// Correspondance des symboles Deriv vers Yahoo Finance pour fallback de secours
const DERIV_TO_YAHOO_SYMBOL = {
  frxEURUSD: 'EURUSD=X',
  frxGBPUSD: 'GBPUSD=X',
  frxUSDJPY: 'USDJPY=X',
  frxAUDUSD: 'AUDUSD=X',
  frxUSDCAD: 'USDCAD=X',
  frxUSDCHF: 'USDCHF=X',
  frxNZDUSD: 'NZDUSD=X',
  frxEURGBP: 'EURGBP=X',
  frxEURJPY: 'EURJPY=X',
  frxGBPJPY: 'GBPJPY=X',
  frxEURCHF: 'EURCHF=X',
  frxEURAUD: 'EURAUD=X',
  frxEURNZD: 'EURNZD=X',
  frxGBPAUD: 'GBPAUD=X',
  frxGBPCAD: 'GBPCAD=X',
  frxGBPNZD: 'GBPNZD=X',
  frxAUDJPY: 'AUDJPY=X',
  frxCADJPY: 'CADJPY=X',
  frxCHFJPY: 'CHFJPY=X',
  frxAUDCAD: 'AUDCAD=X',
  frxAUDNZD: 'AUDNZD=X',
  frxNZDCAD: 'NZDCAD=X',
  frxNZDJPY: 'NZDJPY=X',
  frxXAUUSD: 'GC=F',
  frxXAGUSD: 'SI=F',
  frxXPTUSD: 'PL=F',
  frxXPDUSD: 'PA=F',
  OTC_SPC: '^GSPC',
  OTC_DJI: '^DJI',
  OTC_NDX: '^NDX',
  OTC_FTSE: '^FTSE',
  OTC_GDAXI: '^GDAXI',
  OTC_N225: '^N225',
  OTC_FCHI: '^FCHI',
  cryBTCUSD: 'BTC-USD',
  cryETHUSD: 'ETH-USD',
}

// Marchés exposés, groupés par catégorie (pip = taille d'un point).
// Tous disponibles via ticks_history sans autorisation (app_id suffit).
const SYMBOLS = [
  // --- Forex ---
  { symbol: 'frxEURUSD', name: 'EUR/USD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxGBPUSD', name: 'GBP/USD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxUSDJPY', name: 'USD/JPY', pip: 0.01, category: 'forex' },
  { symbol: 'frxAUDUSD', name: 'AUD/USD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxUSDCAD', name: 'USD/CAD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxUSDCHF', name: 'USD/CHF', pip: 0.0001, category: 'forex' },
  { symbol: 'frxNZDUSD', name: 'NZD/USD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxEURGBP', name: 'EUR/GBP', pip: 0.0001, category: 'forex' },
  { symbol: 'frxEURJPY', name: 'EUR/JPY', pip: 0.01, category: 'forex' },
  { symbol: 'frxGBPJPY', name: 'GBP/JPY', pip: 0.01, category: 'forex' },
  { symbol: 'frxEURCHF', name: 'EUR/CHF', pip: 0.0001, category: 'forex' },
  { symbol: 'frxEURAUD', name: 'EUR/AUD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxEURNZD', name: 'EUR/NZD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxGBPAUD', name: 'GBP/AUD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxGBPCAD', name: 'GBP/CAD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxGBPNZD', name: 'GBP/NZD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxAUDJPY', name: 'AUD/JPY', pip: 0.01, category: 'forex' },
  { symbol: 'frxCADJPY', name: 'CAD/JPY', pip: 0.01, category: 'forex' },
  { symbol: 'frxCHFJPY', name: 'CHF/JPY', pip: 0.01, category: 'forex' },
  { symbol: 'frxAUDCAD', name: 'AUD/CAD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxAUDNZD', name: 'AUD/NZD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxNZDCAD', name: 'NZD/CAD', pip: 0.0001, category: 'forex' },
  { symbol: 'frxNZDJPY', name: 'NZD/JPY', pip: 0.01, category: 'forex' },
  // --- Métaux ---
  { symbol: 'frxXAUUSD', name: 'Or (XAU/USD)', pip: 0.1, category: 'metal' },
  { symbol: 'frxXAGUSD', name: 'Argent (XAG/USD)', pip: 0.01, category: 'metal' },
  { symbol: 'frxXPTUSD', name: 'Platine (XPT/USD)', pip: 0.1, category: 'metal' },
  { symbol: 'frxXPDUSD', name: 'Palladium (XPD/USD)', pip: 0.1, category: 'metal' },
  // --- Indices ---
  { symbol: 'OTC_SPC', name: 'S&P 500 (US 500)', pip: 1, category: 'indice' },
  { symbol: 'OTC_DJI', name: 'Wall Street 30', pip: 1, category: 'indice' },
  { symbol: 'OTC_NDX', name: 'US Tech 100', pip: 1, category: 'indice' },
  { symbol: 'OTC_FTSE', name: 'UK 100', pip: 1, category: 'indice' },
  { symbol: 'OTC_GDAXI', name: 'Allemagne 40', pip: 1, category: 'indice' },
  { symbol: 'OTC_N225', name: 'Japon 225', pip: 1, category: 'indice' },
  { symbol: 'OTC_FCHI', name: 'France 40', pip: 1, category: 'indice' },
  // --- Crypto ---
  { symbol: 'cryBTCUSD', name: 'Bitcoin (BTC/USD)', pip: 1, category: 'crypto' },
  { symbol: 'cryETHUSD', name: 'Ethereum (ETH/USD)', pip: 0.1, category: 'crypto' },
]

function listSymbols() { return SYMBOLS }
function listTimeframes() { return TIMEFRAMES }
function getSymbolMeta(symbol) { return SYMBOLS.find((s) => s.symbol === symbol) || null }

// Tente une connexion WS sur l'URL donnée.
function connectSocket(url, job) {
  return new Promise((resolve, reject) => {
    let settled = false
    const ws = new WebSocket(url)
    const pending = new Map() // req_id -> { res, rej }
    let reqSeq = 0

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        try { ws.close() } catch (_) {}
        reject(new Error('Deriv: délai de connexion dépassé (timeout 4s)'))
      }
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

// Récupère les bougies depuis Deriv via WebSocket.
async function fetchFromDerivWS({ symbol, granularity, startEpoch, endEpoch, count }) {
  const targetCount = count ? Math.min(count, MAX_CANDLES) : MAX_CANDLES
  return connectSocket(PRIMARY_WS_URL, async (send) => {
    const byEpoch = new Map()
    let cursorEnd = endEpoch

    for (let guard = 0; guard < Math.ceil(targetCount / PER_REQUEST) + 2; guard++) {
      const msg = await send({
        ticks_history: symbol,
        style: 'candles',
        granularity,
        end: cursorEnd,
        count: Math.min(targetCount - byEpoch.size, PER_REQUEST),
        adjust_start_time: 1,
      })
      const candles = Array.isArray(msg.candles) ? msg.candles : []
      if (candles.length === 0) break

      let earliest = cursorEnd
      for (const c of candles) {
        const t = Number(c.epoch)
        if (t < earliest) earliest = t
        const inRange = startEpoch != null ? (t >= startEpoch && t <= endEpoch) : (t <= endEpoch)
        if (inRange && !byEpoch.has(t)) {
          byEpoch.set(t, {
            time: t,
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
          })
        }
      }

      if ((startEpoch != null && earliest <= startEpoch) || byEpoch.size >= targetCount || candles.length < PER_REQUEST) break
      cursorEnd = earliest - 1
    }

    const out = Array.from(byEpoch.values()).sort((a, b) => a.time - b.time)
    return out.length > targetCount ? out.slice(out.length - targetCount) : out
  })
}

// Récupère les bougies OHLC avec cache mémoire et secours transparent Yahoo Finance.
async function fetchCandles({ symbol, granularity, start, end, count }) {
  if (!getSymbolMeta(symbol)) throw new Error('Symbole non supporté : ' + symbol)
  const endEpoch = end ? Math.floor(end) : Math.floor(Date.now() / 1000)
  const startEpoch = start ? Math.floor(start) : null
  if (startEpoch != null && !(startEpoch < endEpoch)) throw new Error('Période invalide (début ≥ fin)')

  const targetCount = count || (startEpoch != null ? MAX_CANDLES : 300)

  // 1. Vérification du cache mémoire (retour en 0 ms)
  const cacheKey = `${symbol}:${granularity}:${startEpoch || 'latest'}:${endEpoch}:${targetCount}`
  const cached = candleCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt && cached.candles?.length > 0) {
    return cached.candles
  }

  let candles = []
  let errorDeriv = null

  // 2. Tentative via Deriv WebSocket
  try {
    candles = await fetchFromDerivWS({ symbol, granularity, startEpoch, endEpoch, count: targetCount })
  } catch (err) {
    errorDeriv = err
    console.warn(`[derivProvider] Deriv indisponible (${err.message}). Basculement automatique sur Yahoo Finance...`)
  }

  // 3. Secours automatique sur Yahoo Finance si Deriv a échoué ou n'a renvoyé aucune donnée
  if (!candles || candles.length === 0) {
    const yahooSymbol = DERIV_TO_YAHOO_SYMBOL[symbol]
    if (yahooSymbol) {
      try {
        const yahoo = require('./yahooProvider')
        // Si startEpoch n'est pas fourni, on remonte assez loin pour inclure les vendredis lors du week-end
        const yStart = startEpoch || (endEpoch - targetCount * granularity * 3)
        candles = await yahoo.fetchCandles({ symbol: yahooSymbol, granularity, start: yStart, end: endEpoch })
        if (candles?.length > 0) {
          console.log(`[derivProvider] Récupéré avec succès ${candles.length} bougies via Yahoo Finance (${yahooSymbol})`)
          if (candles.length > targetCount) candles = candles.slice(candles.length - targetCount)
        }
      } catch (yahooErr) {
        console.error(`[derivProvider] Fallback Yahoo a également échoué : ${yahooErr.message}`)
        if (errorDeriv) throw errorDeriv
        throw yahooErr
      }
    } else if (errorDeriv) {
      throw errorDeriv
    }
  }

  // Mise en cache mémoire (limite à 300 entrées pour la RAM)
  if (candles && candles.length > 0) {
    if (candleCache.size > 300) {
      const oldestKey = candleCache.keys().next().value
      candleCache.delete(oldestKey)
    }
    candleCache.set(cacheKey, { candles, expiresAt: Date.now() + CACHE_TTL_MS })
  }

  return candles || []
}

module.exports = {
  name: 'deriv',
  label: 'Deriv (Forex)',
  listSymbols,
  listTimeframes,
  getSymbolMeta,
  fetchCandles,
  DERIV_TO_YAHOO_SYMBOL,
}
