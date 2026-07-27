import React, { useEffect, useRef, useState } from 'react';
import { init, dispose } from 'klinecharts';
import api from '../../lib/api';
import { Loader2, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/button';
import {
  CHART_STYLES, ensureRectOverlay, detectPriceDigits,
  DrawingToolbar, IndicatorButtons, useFullscreen,
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
  const [last, setLast] = useState(null);   // dernière bougie (entête OHLC)
  const [digits, setDigits] = useState(5);
  const [fullscreen, setFullscreen] = useFullscreen();

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
          const d = detectPriceDigits(data.candles);
          chartRef.current.setPriceVolumePrecision?.(d, 0);
          setDigits(d);
          digitsSetRef.current = true;
        }
        chartRef.current.applyNewData(kline);
        setLast(data.candles?.[data.candles.length - 1] || null);
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

  // Redimensionne le canvas après un changement de conteneur (plein écran, indicateurs).
  useEffect(() => {
    const t = setTimeout(() => chartRef.current?.resize(), 60);
    return () => clearTimeout(t);
  }, [fullscreen, activeIndicators]);

  const wrapClass = fullscreen
    ? 'fixed inset-0 z-50 flex flex-col gap-1.5 bg-background p-1.5 overflow-hidden'
    : 'space-y-2';
  const chartHeight = fullscreen ? undefined : 'clamp(420px, 62vh, 760px)';

  return (
    <div className={wrapClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          {symbolName || symbol} • {timeframe} — Marché en direct
        </p>
        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
          <RefreshCw className="h-3 w-3" />
          {lastUpdate ? `Mis à jour à ${lastUpdate.toLocaleTimeString('fr-FR')}` : '…'}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFullscreen((f) => !f)}
          className="h-7 px-2"
          title={fullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      <div className={`flex gap-1.5 ${fullscreen ? 'flex-1 min-h-0' : ''}`}>
        <DrawingToolbar chartRef={chartRef} />
        <div className={`flex-1 min-w-0 flex flex-col gap-1.5 ${fullscreen ? 'min-h-0' : ''}`}>
          <IndicatorButtons
            chartRef={chartRef}
            active={activeIndicators}
            setActive={setActiveIndicators}
            panesRef={indicatorPanesRef}
          />
          <div className={`relative w-full rounded-lg border overflow-hidden ${fullscreen ? 'flex-1 min-h-0' : ''}`} style={{ height: chartHeight }}>
            {/* Entête symbole + OHLC en surimpression, façon MT5 */}
            <div className="pointer-events-none absolute left-2 top-1.5 z-10 leading-tight">
              <p className="text-xs font-semibold text-primary">
                {symbolName || symbol} <span className="text-foreground">{timeframe}</span>
              </p>
              {last && (
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  O {last.open.toFixed(digits)} H {last.high.toFixed(digits)} L {last.low.toFixed(digits)}{' '}
                  <span className={last.close >= last.open ? 'text-emerald-500' : 'text-red-500'}>
                    C {last.close.toFixed(digits)}
                  </span>
                </p>
              )}
            </div>
            <div ref={containerRef} className="w-full h-full" />
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
