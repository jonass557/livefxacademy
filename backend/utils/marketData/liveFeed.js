// utils/marketData/liveFeed.js
// Hub de cotations TEMPS RÉEL partagé (singleton). Maintient des connexions
// WebSocket persistantes vers les fournisseurs, met en cache la dernière cotation
// par instrument et diffuse les mises à jour via EventEmitter.
//
// - Deriv  : flux `ticks` (forex, métaux, indices) — prix mid.
// - Binance: flux `@bookTicker` (crypto) — meilleur bid/ask → mid.
// - Bid/Ask exposés = dérivés d'un SPREAD configuré par instrument
//   (bid = mid - spread/2, ask = mid + spread/2). Décision projet : le spread
//   n'est jamais « inventé » côté client, il est déterminé côté serveur.
//
// Anti-abonnements multiples : compteur de références par symbole. Reconnexion
// automatique avec backoff ; ré-abonnement à la reprise. Aucune clé requise.
const EventEmitter = require('events');
const WebSocket = require('ws');

const DERIV_URL = `wss://ws.derivws.com/websockets/v3?app_id=${process.env.DERIV_APP_ID || '1089'}`;
const BINANCE_URL = 'wss://stream.binance.com:9443/ws';
const MAX_BACKOFF = 30000;

class LiveFeed extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);
    this.meta = new Map();     // demoSymbol -> { provider, ps, spread, digits }
    this.quotes = new Map();   // demoSymbol -> { symbol, mid, bid, ask, ts }
    this.refs = new Map();     // demoSymbol -> nombre d'abonnés

    this.deriv = { ws: null, ready: false, subs: new Set(), psToSym: new Map(), subId: new Map(), backoff: 1000, timer: null, ping: null };
    this.binance = { ws: null, ready: false, subs: new Set(), psToSym: new Map(), backoff: 1000, timer: null };
  }

  // Alimente le hub avec les instruments (au démarrage / après seed).
  init(instruments) {
    for (const i of instruments) {
      if (!i.provider_symbol) continue; // ex. SYNTHETIC non branché → pas de prix
      this.meta.set(i.symbol, {
        provider: i.provider,
        ps: i.provider_symbol,
        spread: (i.spread_pips || 0) * (i.pip_size || 0),
        digits: i.digits || 5,
      });
    }
  }

  getQuote(symbol) { return this.quotes.get(symbol) || null; }
  getAllQuotes() { return Array.from(this.quotes.values()); }

  // Enregistre un intérêt pour un symbole (ouvre l'abonnement amont au 1er abonné).
  subscribe(symbol) {
    const meta = this.meta.get(symbol);
    if (!meta) return false;
    const n = (this.refs.get(symbol) || 0) + 1;
    this.refs.set(symbol, n);
    if (n === 1) {
      if (meta.provider === 'binance') this._binanceSub(meta.ps, symbol);
      else this._derivSub(meta.ps, symbol);
    }
    return true;
  }

  // Retire un intérêt (ferme l'abonnement amont quand plus personne n'écoute).
  unsubscribe(symbol) {
    const n = (this.refs.get(symbol) || 0) - 1;
    if (n <= 0) {
      this.refs.delete(symbol);
      const meta = this.meta.get(symbol);
      if (meta) {
        if (meta.provider === 'binance') this._binanceUnsub(meta.ps, symbol);
        else this._derivUnsub(meta.ps, symbol);
      }
    } else {
      this.refs.set(symbol, n);
    }
  }

  _setQuote(symbol, mid, ts) {
    const meta = this.meta.get(symbol);
    if (!meta || !(mid > 0)) return;
    const half = (meta.spread || 0) / 2;
    const q = { symbol, mid, bid: mid - half, ask: mid + half, ts: ts || Date.now() };
    this.quotes.set(symbol, q);
    this.emit('quote', q);
  }

  // ---------------- Deriv ----------------
  _derivSub(ps, symbol) {
    this.deriv.psToSym.set(ps, symbol);
    this.deriv.subs.add(ps);
    this._ensureDeriv();
    if (this.deriv.ready) this._derivSend({ ticks: ps, subscribe: 1 });
  }
  _derivUnsub(ps, symbol) {
    this.deriv.subs.delete(ps);
    this.deriv.psToSym.delete(ps);
    const id = this.deriv.subId.get(ps);
    if (id && this.deriv.ready) this._derivSend({ forget: id });
    this.deriv.subId.delete(ps);
  }
  _derivSend(payload) {
    try { this.deriv.ws.send(JSON.stringify(payload)); } catch (_) {}
  }
  _ensureDeriv() {
    if (this.deriv.ws) return;
    const ws = new WebSocket(DERIV_URL);
    this.deriv.ws = ws;
    ws.on('open', () => {
      this.deriv.ready = true;
      this.deriv.backoff = 1000;
      for (const ps of this.deriv.subs) this._derivSend({ ticks: ps, subscribe: 1 });
      clearInterval(this.deriv.ping);
      this.deriv.ping = setInterval(() => this._derivSend({ ping: 1 }), 20000);
    });
    ws.on('message', (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch (_) { return; }
      if (msg.msg_type === 'tick' && msg.tick) {
        const t = msg.tick;
        const sym = this.deriv.psToSym.get(t.symbol);
        if (sym) {
          if (msg.subscription && msg.subscription.id) this.deriv.subId.set(t.symbol, msg.subscription.id);
          this._setQuote(sym, Number(t.quote), Number(t.epoch) * 1000);
        }
      }
    });
    const down = () => {
      this.deriv.ready = false;
      clearInterval(this.deriv.ping);
      try { ws.removeAllListeners(); ws.close(); } catch (_) {}
      this.deriv.ws = null;
      if (this.deriv.subs.size) {
        clearTimeout(this.deriv.timer);
        this.deriv.timer = setTimeout(() => this._ensureDeriv(), this.deriv.backoff);
        this.deriv.backoff = Math.min(this.deriv.backoff * 2, MAX_BACKOFF);
      }
    };
    ws.on('close', down);
    ws.on('error', down);
  }

  // ---------------- Binance ----------------
  _binanceSub(ps, symbol) {
    this.binance.psToSym.set(ps.toUpperCase(), symbol);
    this.binance.subs.add(ps.toLowerCase());
    this._ensureBinance();
    if (this.binance.ready) this._binanceSend('SUBSCRIBE', [`${ps.toLowerCase()}@bookTicker`]);
  }
  _binanceUnsub(ps, symbol) {
    this.binance.subs.delete(ps.toLowerCase());
    this.binance.psToSym.delete(ps.toUpperCase());
    if (this.binance.ready) this._binanceSend('UNSUBSCRIBE', [`${ps.toLowerCase()}@bookTicker`]);
  }
  _binanceSend(method, params) {
    try { this.binance.ws.send(JSON.stringify({ method, params, id: Date.now() })); } catch (_) {}
  }
  _ensureBinance() {
    if (this.binance.ws) return;
    const ws = new WebSocket(BINANCE_URL);
    this.binance.ws = ws;
    ws.on('open', () => {
      this.binance.ready = true;
      this.binance.backoff = 1000;
      const params = Array.from(this.binance.subs).map((s) => `${s}@bookTicker`);
      if (params.length) this._binanceSend('SUBSCRIBE', params);
    });
    ws.on('message', (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch (_) { return; }
      // bookTicker : { u, s:'BTCUSDT', b:bid, B, a:ask, A }
      if (msg && msg.s && msg.b && msg.a) {
        const sym = this.binance.psToSym.get(msg.s.toUpperCase());
        if (sym) {
          const mid = (Number(msg.b) + Number(msg.a)) / 2;
          this._setQuote(sym, mid, Date.now());
        }
      }
    });
    const down = () => {
      this.binance.ready = false;
      try { ws.removeAllListeners(); ws.close(); } catch (_) {}
      this.binance.ws = null;
      if (this.binance.subs.size) {
        clearTimeout(this.binance.timer);
        this.binance.timer = setTimeout(() => this._ensureBinance(), this.binance.backoff);
        this.binance.backoff = Math.min(this.binance.backoff * 2, MAX_BACKOFF);
      }
    };
    ws.on('close', down);
    ws.on('error', down);
  }
}

// Singleton partagé par le serveur WS client, le contrôleur et le moteur.
module.exports = new LiveFeed();
