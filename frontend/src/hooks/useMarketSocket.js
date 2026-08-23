// Hook de cotations temps réel via WebSocket (/ws/market).
// - WebSocket natif (aucune dépendance ajoutée), reconnexion à backoff exponentiel,
//   détection de perte, ré-abonnement automatique, anti-abonnements multiples.
// - `symbols` : liste des symboles à suivre ; les changements ajustent les abonnements.
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws/market';

export function useMarketSocket(symbols) {
  const token = useAuthStore((s) => s.token);
  const [quotes, setQuotes] = useState({}); // symbol -> { bid, ask, mid, ts }
  const [connected, setConnected] = useState(false);

  const wsRef = useRef(null);
  const subsRef = useRef(new Set());
  const reconnectRef = useRef(null);
  const backoffRef = useRef(1000);
  const closedRef = useRef(false);

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
        if (m.type === 'quote') {
          setQuotes((prev) => ({ ...prev, [m.symbol]: { bid: m.bid, ask: m.ask, mid: m.mid, ts: m.ts } }));
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
