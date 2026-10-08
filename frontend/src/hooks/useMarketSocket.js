// Hook de cotations temps réel via WebSocket (/ws/market).
// - WebSocket natif (aucune dépendance ajoutée), reconnexion à backoff exponentiel,
//   détection de perte, ré-abonnement automatique, anti-abonnements multiples.
// - `symbols` : liste des symboles à suivre ; les changements ajustent les abonnements.
// - Optimisation haute fréquence type TradingView : diffusion directe instantanée (0 ms)
//   vers les graphiques via `useRealtimeQuote` et mise en tampon cadencée (~200 ms) pour
//   les composants React afin d'éviter la congestion du thread JS.
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../lib/api';

const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws/market';

// Registre global des écouteurs directs par symbole (0 ms de latence pour les graphiques)
const quoteListeners = new Map(); // symbol -> Set of callbacks

export function registerRealtimeQuoteListener(symbol, callback) {
  if (!symbol || typeof callback !== 'function') return () => {};
  if (!quoteListeners.has(symbol)) {
    quoteListeners.set(symbol, new Set());
  }
  quoteListeners.get(symbol).add(callback);
  return () => {
    const set = quoteListeners.get(symbol);
    if (set) {
      set.delete(callback);
      if (set.size === 0) quoteListeners.delete(symbol);
    }
  };
}

/**
 * Hook pour écouter les ticks en direct d'un symbole avec 0 ms de latence,
 * sans déclencher de re-render React sur le composant parent.
 */
export function useRealtimeQuote(symbol, onQuote) {
  const cbRef = useRef(onQuote);
  useEffect(() => {
    cbRef.current = onQuote;
  }, [onQuote]);

  useEffect(() => {
    if (!symbol) return;
    const handler = (q) => {
      cbRef.current?.(q);
    };
    return registerRealtimeQuoteListener(symbol, handler);
  }, [symbol]);
}

export function useMarketSocket(symbols) {
  const token = useAuthStore((s) => s.token);
  const [quotes, setQuotes] = useState({}); // symbol -> { bid, ask, mid, ts }
  const [connected, setConnected] = useState(false);

  const wsRef = useRef(null);
  const subsRef = useRef(new Set());
  const reconnectRef = useRef(null);
  const backoffRef = useRef(1000);
  const closedRef = useRef(false);

  // Buffer de cadencement pour les re-renders React (évite le gel du thread)
  const pendingQuotesRef = useRef({});
  const flushTimerRef = useRef(null);

  const symbolsKey = (symbols || []).filter(Boolean).slice().sort().join(',');

  // Connexion (dépend uniquement du token).
  useEffect(() => {
    if (!token) return;
    closedRef.current = false;

    const connect = () => {
      let ws;
      try { ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`); }
      catch { scheduleReconnect(); return; }
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        backoffRef.current = 1000;
        const arr = Array.from(subsRef.current);
        if (arr.length) ws.send(JSON.stringify({ action: 'subscribe', symbols: arr }));
      };

      ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch { return; }
        if (m.type === 'quote' && m.symbol) {
          const q = { bid: m.bid, ask: m.ask, mid: m.mid, ts: m.ts, symbol: m.symbol };

          // 1. Dispatch DIRECT et IMMÉDIAT (0 ms) aux graphiques abonnés
          const listeners = quoteListeners.get(m.symbol);
          if (listeners && listeners.size > 0) {
            listeners.forEach((fn) => {
              try { fn(q); } catch (_) {}
            });
          }

          // 2. Mise en tampon des cotations pour l'état React global (Watchlist, P&L)
          pendingQuotesRef.current[m.symbol] = q;

          // 3. Cadencement des mises à jour React (max 5 fps / ~200ms) pour maintenir un canvas à 60 fps
          if (!flushTimerRef.current) {
            flushTimerRef.current = setTimeout(() => {
              flushTimerRef.current = null;
              const pending = pendingQuotesRef.current;
              pendingQuotesRef.current = {};
              setQuotes((prev) => ({ ...prev, ...pending }));
            }, 200);
          }
        }
      };

      ws.onclose = () => { setConnected(false); if (!closedRef.current) scheduleReconnect(); };
      ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
    };

    const scheduleReconnect = () => {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, 15000);
        connect();
      }, backoffRef.current);
    };

    connect();
    return () => {
      closedRef.current = true;
      clearTimeout(reconnectRef.current);
      clearTimeout(flushTimerRef.current);
      try { wsRef.current?.close(); } catch { /* noop */ }
    };
  }, [token]);

  // Ajuste les abonnements quand la liste de symboles change.
  useEffect(() => {
    const next = new Set((symbols || []).filter(Boolean));
    const prev = subsRef.current;
    const toAdd = [...next].filter((s) => !prev.has(s));
    const toRemove = [...prev].filter((s) => !next.has(s));
    subsRef.current = next;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (toAdd.length) ws.send(JSON.stringify({ action: 'subscribe', symbols: toAdd }));
      if (toRemove.length) ws.send(JSON.stringify({ action: 'unsubscribe', symbols: toRemove }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return { quotes, connected };
}
