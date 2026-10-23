// Hook de cotations temps réel haute résilience via WebSocket (/ws/market)
// avec basculement automatique et transparent sur Polling HTTP haute vitesse (/api/demo/quotes).
// - Si le WebSocket fonctionne : flux 0 ms.
// - Si le WebSocket est coupé ou bloqué par le proxy cPanel / réseau mobile :
//   le polling HTTP prend le relais immédiatement sans AUCUN message d'erreur ni blocage.
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api, { API_URL } from '../lib/api';

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
  const wsConnectedRef = useRef(false);
  const subsRef = useRef(new Set());
  const reconnectRef = useRef(null);
  const backoffRef = useRef(1000);
  const closedRef = useRef(false);

  // Buffer de cadencement pour les re-renders React
  const pendingQuotesRef = useRef({});
  const flushTimerRef = useRef(null);
  const pollTimerRef = useRef(null);

  const symbolsKey = (symbols || []).filter(Boolean).slice().sort().join(',');

  // Dispatch helper
  const dispatchQuote = (q) => {
    if (!q || !q.symbol) return;
    // 1. Dispatch direct aux graphiques (0 ms)
    const listeners = quoteListeners.get(q.symbol);
    if (listeners && listeners.size > 0) {
      listeners.forEach((fn) => {
        try { fn(q); } catch (_) {}
      });
    }

    // 2. Mise en tampon des cotations pour l'état React global
    pendingQuotesRef.current[q.symbol] = q;

    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        const pending = pendingQuotesRef.current;
        pendingQuotesRef.current = {};
        setQuotes((prev) => ({ ...prev, ...pending }));
      }, 150);
    }
  };

  // Polling HTTP de secours (haute vitesse : 1.5s) quand le WebSocket n'est pas actif
  const startHttpFallback = () => {
    if (pollTimerRef.current) return;

    const poll = async () => {
      if (closedRef.current) return;
      if (wsConnectedRef.current) {
        // Le WebSocket est actif, pas besoin du polling
        return;
      }

      const activeSymbols = Array.from(subsRef.current);
      if (activeSymbols.length > 0) {
        try {
          const res = await api.get('/demo/quotes', {
            params: { symbols: activeSymbols.join(',') },
            timeout: 4000,
          });
          const received = res.data?.quotes || {};
          let hasAny = false;
          Object.values(received).forEach((q) => {
            if (q && q.mid > 0) {
              dispatchQuote(q);
              hasAny = true;
            }
          });
          if (hasAny) {
            setConnected(true);
          }
        } catch (_) {
          // Erreur réseau temporaire, on réessaie au prochain cycle
        }
      }

      if (!closedRef.current && !wsConnectedRef.current) {
        pollTimerRef.current = setTimeout(poll, 1600);
      }
    };

    pollTimerRef.current = setTimeout(poll, 1000);
  };

  const stopHttpFallback = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // Connexion WebSocket
  useEffect(() => {
    closedRef.current = false;

    // Démarre le secours HTTP après un court délai au cas où le WebSocket met du temps ou échoue
    const fallbackTimeout = setTimeout(() => {
      if (!wsConnectedRef.current) {
        startHttpFallback();
      }
    }, 2000);

    const connect = () => {
      if (closedRef.current) return;
      let ws;
      try {
        const authParam = token ? `?token=${encodeURIComponent(token)}` : '';
        ws = new WebSocket(`${WS_URL}${authParam}`);
      } catch {
        wsConnectedRef.current = false;
        startHttpFallback();
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        wsConnectedRef.current = true;
        setConnected(true);
        stopHttpFallback();
        backoffRef.current = 1000;
        const arr = Array.from(subsRef.current);
        if (arr.length) ws.send(JSON.stringify({ action: 'subscribe', symbols: arr }));
      };

      ws.onmessage = (e) => {
        let m;
        try { m = JSON.parse(e.data); } catch { return; }
        if (m.type === 'quote' && m.symbol) {
          dispatchQuote({ bid: m.bid, ask: m.ask, mid: m.mid, ts: m.ts, symbol: m.symbol });
        }
      };

      ws.onclose = () => {
        wsConnectedRef.current = false;
        // Basculer immédiatement sur HTTP de secours pour ne pas bloquer l'interface
        startHttpFallback();
        if (!closedRef.current) scheduleReconnect();
      };

      ws.onerror = () => {
        wsConnectedRef.current = false;
        startHttpFallback();
        try { ws.close(); } catch { /* noop */ }
      };
    };

    const scheduleReconnect = () => {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 1.5, 12000);
        connect();
      }, backoffRef.current);
    };

    connect();

    return () => {
      closedRef.current = true;
      wsConnectedRef.current = false;
      clearTimeout(fallbackTimeout);
      clearTimeout(reconnectRef.current);
      clearTimeout(flushTimerRef.current);
      stopHttpFallback();
      try { wsRef.current?.close(); } catch { /* noop */ }
    };
  }, [token]);

  // Ajuste les abonnements quand la liste de symboles change
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
