// realtime/marketSocket.js
// Serveur WebSocket exposé au frontend pour diffuser les cotations temps réel.
// Chemin : /ws/market?token=<JWT>. Authentifié (même secret que les routes REST).
//
// Protocole client → serveur (JSON) :
//   { action: 'subscribe',   symbols: ['EURUSD', ...] }
//   { action: 'unsubscribe', symbols: ['EURUSD', ...] }
// Serveur → client :
//   { type: 'quote', symbol, bid, ask, mid, ts }
//   { type: 'subscribed'|'error'|'pong', ... }
//
// Anti-abonnements multiples : chaque client a son propre Set ; le hub liveFeed
// gère le comptage de références amont. Nettoyage complet à la déconnexion.
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const liveFeed = require('../utils/marketData/liveFeed');

function attach(server) {
  const wss = new WebSocketServer({ server, path: '/ws/market' });

  // Diffusion : une seule écoute du hub, ré-émission aux clients concernés.
  liveFeed.on('quote', (q) => {
    const payload = JSON.stringify({ type: 'quote', symbol: q.symbol, bid: q.bid, ask: q.ask, mid: q.mid, ts: q.ts });
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN && client.symbols && client.symbols.has(q.symbol)) {
        try { client.send(payload); } catch (_) {}
      }
    });
  });

  wss.on('connection', (ws, req) => {
    // --- Authentification par token en query ---
    let token = null;
    try {
      const url = new URL(req.url, 'http://localhost');
      token = url.searchParams.get('token');
    } catch (_) {}
    if (!token) { try { ws.close(4001, 'token requis'); } catch (_) {} return; }

    try {
      ws.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) {
      try { ws.close(4003, 'token invalide'); } catch (_) {}
      return;
    }

    ws.symbols = new Set();
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch (_) { return; }
      const symbols = Array.isArray(msg.symbols) ? msg.symbols.slice(0, 100) : [];

      if (msg.action === 'subscribe') {
        for (const sym of symbols) {
          if (ws.symbols.has(sym)) continue;      // évite les doublons par client
          if (liveFeed.subscribe(sym)) {
            ws.symbols.add(sym);
            const q = liveFeed.getQuote(sym);      // envoie la dernière valeur connue
            if (q) { try { ws.send(JSON.stringify({ type: 'quote', symbol: q.symbol, bid: q.bid, ask: q.ask, mid: q.mid, ts: q.ts })); } catch (_) {} }
          }
        }
        try { ws.send(JSON.stringify({ type: 'subscribed', symbols: Array.from(ws.symbols) })); } catch (_) {}
      } else if (msg.action === 'unsubscribe') {
        for (const sym of symbols) {
          if (ws.symbols.delete(sym)) liveFeed.unsubscribe(sym);
        }
      } else if (msg.action === 'ping') {
        try { ws.send(JSON.stringify({ type: 'pong', ts: Date.now() })); } catch (_) {}
      }
    });

    const cleanup = () => {
      for (const sym of ws.symbols) liveFeed.unsubscribe(sym);
      ws.symbols.clear();
    };
    ws.on('close', cleanup);
    ws.on('error', cleanup);
  });

  // Heartbeat : coupe les connexions mortes (détection de perte).
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) { try { ws.terminate(); } catch (_) {} return; }
      ws.isAlive = false;
      try { ws.ping(); } catch (_) {}
    });
  }, 30000);
  wss.on('close', () => clearInterval(heartbeat));

  console.log('[market ws] serveur WebSocket /ws/market attaché');
  return wss;
}

module.exports = { attach };
