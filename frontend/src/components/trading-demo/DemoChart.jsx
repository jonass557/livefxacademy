// Graphique chandeliers du terminal démo (KLineCharts). Réutilise les styles,
// outils de dessin et indicateurs partagés avec le module Backtesting.
// Historique via /api/demo/candles ; la dernière bougie est mise à jour en direct
// à partir du prix `mid` reçu par WebSocket.
import React, { useEffect, useRef, useState } from 'react';
import { init, dispose } from 'klinecharts';
import { Loader2, Maximize2, Minimize2, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import '../backtest/chart-landscape.css';
import {
  CHART_STYLES, ensureRectOverlay, detectPriceDigits,
  DrawToolsMenu, IndicatorsMenu, ChartWatermark, useFullscreen, Dropdown,
} from '../backtest/chartShared';
import { demoApi, DEMO_TIMEFRAMES } from '../../lib/demoApi';

const RELOAD_MS = 20000;

export default function DemoChart({ symbol, symbolName, timeframe, onSelectTimeframe, liveQuote }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const timerRef = useRef(null);
  const lastRef = useRef(null);
  const digitsSetRef = useRef(false);
  const panesRef = useRef({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [digits, setDigits] = useState(5);
  const [activeIndicators, setActiveIndicators] = useState({});
  const [fullscreen, setFullscreen] = useFullscreen();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    ensureRectOverlay();
    const chart = init(el);
    chart.setStyles(CHART_STYLES);
    chartRef.current = chart;
    return () => { clearInterval(timerRef.current); dispose(el); chartRef.current = null; };
  }, []);

  useEffect(() => {
    if (!symbol || !timeframe) return;
    let cancelled = false;
    digitsSetRef.current = false;

    const load = async () => {
      try {
        const data = await demoApi.candles(symbol, timeframe, 300);
        if (cancelled || !chartRef.current) return;
        const kline = (data.candles || []).map((c) => ({
          timestamp: c.time * 1000, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume || 0,
        }));
        if (!digitsSetRef.current && data.candles?.length) {
          const d = detectPriceDigits(data.candles);
          chartRef.current.setPriceVolumePrecision?.(d, 0);
          setDigits(d); digitsSetRef.current = true;
        }
        chartRef.current.applyNewData(kline);
        lastRef.current = kline[kline.length - 1] || null;
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Données indisponibles');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    load();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(load, RELOAD_MS);
    return () => { cancelled = true; clearInterval(timerRef.current); };
  }, [symbol, timeframe]);

  // Mise à jour temps réel de la dernière bougie avec le prix mid reçu par WS.
  useEffect(() => {
    const chart = chartRef.current;
    const last = lastRef.current;
    if (!chart || !last || !liveQuote || !(liveQuote.mid > 0)) return;
    const updated = {
      ...last,
      close: liveQuote.mid,
      high: Math.max(last.high, liveQuote.mid),
      low: Math.min(last.low, liveQuote.mid),
    };
    lastRef.current = updated;
    chart.updateData(updated);
  }, [liveQuote]);

  useEffect(() => {
    const resize = () => chartRef.current?.resize();
    const timer = setTimeout(resize, 60);
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
    };
  }, [fullscreen, activeIndicators]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wrapClass = fullscreen
    ? 'fixed inset-0 z-[60] flex flex-col gap-1.5 bg-background p-1.5 overflow-hidden'
    : 'h-full w-full flex flex-col gap-1.5 overflow-hidden';

  return (
    <div className={wrapClass}>
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 flex-shrink-0" data-chart-toolbar>
        <span className="text-xs font-semibold text-primary mr-1">{symbolName || symbol}</span>
        
        {/* Sélecteur d'unité de temps en liste déroulante (exactement comme pour le backtesting) */}
        <TimeframeDropdown timeframe={timeframe} onSelectTimeframe={onSelectTimeframe} />

        <DrawToolsMenu chartRef={chartRef} />
        <IndicatorsMenu chartRef={chartRef} active={activeIndicators} setActive={setActiveIndicators} panesRef={panesRef} />
        <Button size="sm" variant="outline" onClick={() => setFullscreen((f) => !f)} className="h-7 px-2 ml-auto" title="Plein écran">
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      <div className="relative flex-1 min-h-[300px] w-full rounded-lg border overflow-hidden bg-card" data-chart-container>
        <ChartWatermark />
        <div ref={containerRef} className="w-full h-full" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-30">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TimeframeDropdown({ timeframe, onSelectTimeframe }) {
  const [open, setOpen] = useState(false);
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      width="w-48"
      trigger={
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs gap-1.5 font-semibold bg-card hover:bg-muted"
          onClick={() => setOpen((o) => !o)}
          title="Unité de temps"
        >
          <span className="text-muted-foreground text-[11px] font-normal">TF:</span>
          <span>{timeframe}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      }
    >
      <div className="p-1.5 grid grid-cols-4 gap-1">
        {DEMO_TIMEFRAMES.map((tf) => (
          <Button
            key={tf}
            size="sm"
            variant={tf === timeframe ? 'default' : 'ghost'}
            className="h-7 px-2 text-xs font-semibold"
            onClick={() => {
              onSelectTimeframe(tf);
              setOpen(false);
            }}
          >
            {tf}
          </Button>
        ))}
      </div>
    </Dropdown>
  );
}
