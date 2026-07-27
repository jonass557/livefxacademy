import React, { useEffect, useRef, useState } from 'react';
import { init, dispose } from 'klinecharts';
import api from '../../lib/api';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  CHART_STYLES, ensureRectOverlay, detectPriceDigits,
  DrawingToolbar, IndicatorButtons,
} from './chartShared';

const REFRESH_MS = 15000; // rafraîchissement auto (quasi temps réel)

/**
 * Graphique du marché en direct (chandeliers japonais KLineCharts) affiché
 * dès l'ouverture de la page Backtesting : suit la paire/timeframe choisies,
 * se met à jour automatiquement, avec outils de dessin et indicateurs.
 */
export default function LiveChart({ provider, symbol, timeframe, symbolName }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const timerRef = useRef(null);
  const digitsSetRef = useRef(false);
  const indicatorPanesRef = useRef({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeIndicators, setActiveIndicators] = useState({});

  // ---- Initialisation du graphique (une seule fois) ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    ensureRectOverlay();
    const chart = init(el);
    chart.setStyles(CHART_STYLES);
    chartRef.current = chart;
    return () => {
      clearInterval(timerRef.current);
      dispose(el);
      chartRef.current = null;
    };
  }, []);

  // ---- Chargement + rafraîchissement sur changement de marché ----
  useEffect(() => {
    if (!symbol || !timeframe) return;
    let cancelled = false;
    digitsSetRef.current = false;

    const load = async (initial) => {
      try {
        const { data } = await api.get('/backtests/candles', {
          params: { provider, symbol, timeframe, count: 300 },
        });
        if (cancelled || !chartRef.current) return;
        const kline = (data.candles || []).map((c) => ({
          timestamp: c.time * 1000, open: c.open, high: c.high, low: c.low, close: c.close,
        }));
        if (!digitsSetRef.current && kline.length) {
          chartRef.current.setPriceVolumePrecision?.(detectPriceDigits(data.candles), 0);
          digitsSetRef.current = true;
        }
        chartRef.current.applyNewData(kline);
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        if (!cancelled && initial) setError(err.response?.data?.message || 'Données de marché indisponibles');
      } finally {
        if (!cancelled && initial) setLoading(false);
      }
    };

    setLoading(true);
    setError(null);
    load(true);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => load(false), REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
    };
  }, [provider, symbol, timeframe]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          {symbolName || symbol} • {timeframe} — Marché en direct
        </p>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          {lastUpdate ? `Mis à jour à ${lastUpdate.toLocaleTimeString('fr-FR')}` : '…'}
        </span>
      </div>

      <div className="flex gap-2">
        <DrawingToolbar chartRef={chartRef} />
        <div className="flex-1 min-w-0 space-y-2">
          <IndicatorButtons
            chartRef={chartRef}
            active={activeIndicators}
            setActive={setActiveIndicators}
            panesRef={indicatorPanesRef}
          />
          <div className="relative">
            <div ref={containerRef} className="w-full rounded-lg border" style={{ height: 420 }} />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
