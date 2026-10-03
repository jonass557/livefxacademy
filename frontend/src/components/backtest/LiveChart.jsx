import React, { useEffect, useRef, useState } from 'react';
import { init, dispose } from 'klinecharts';
import api from '../../lib/api';
import { Loader2, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/button';
import './chart-landscape.css';
import {
  CHART_STYLES, ensureCustomOverlaysAndIndicators, detectPriceDigits,
  DrawToolsMenu, IndicatorsMenu, MarketPicker, ChartWatermark, useFullscreen,
  configureMT4Chart, ChartZoomControls, buildKLineStyles,
  useChartStyles, ChartStyleButton, ChartStyleSettingsModal,
  useChartOverlayManager, SelectedOverlayBar, CandleCountdownBadge,
  ChartErrorBoundary,
} from './chartShared';

const REFRESH_MS = 15000; // rafraîchissement auto (quasi temps réel)

/**
 * Graphique du marché en direct (chandeliers japonais KLineCharts) affiché
 * dès l'ouverture de la page Backtesting : sélecteur de marché par catégorie
 * et d'unité de temps dans l'entête, menus Outils/Indicateurs, personnalisation
 * complète des couleurs MT5/TV, mise à jour automatique.
 */
export default function LiveChart({
  provider, symbol, timeframe, symbolName,
  symbols, timeframes, onSelectSymbol, onSelectTimeframe,
}) {
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

  const {
    styles: chartColors,
    applyStyles,
    applyPreset,
    resetDefault,
    open: styleModalOpen,
    setOpen: setStyleModalOpen,
  } = useChartStyles(chartRef);

  const overlayManager = useChartOverlayManager(chartRef);

  // ---- Initialisation du graphique (une seule fois) ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    ensureCustomOverlaysAndIndicators();
    const chart = init(el);
    chart.setStyles(buildKLineStyles(chartColors));
    const unbindMT4 = configureMT4Chart(chart);
    chartRef.current = chart;
    return () => {
      unbindMT4?.();
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

  // z-[60] : au-dessus du bouton menu flottant du sidebar mobile (z-50).
  const wrapClass = fullscreen
    ? 'fixed inset-0 z-[60] flex flex-col gap-1 bg-background p-1 overflow-hidden'
    : 'h-full w-full flex flex-col gap-1 overflow-hidden p-0 m-0';
  const chartHeight = fullscreen ? undefined : '100%';

  return (
    <ChartErrorBoundary>
      <div className={wrapClass}>
        {/* Barre unique : sélecteur de marché + menus + statut + plein écran */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pl-24 sm:pl-28 pr-1 py-0.5" data-chart-toolbar>
          <span className="relative flex h-2 w-2 mr-0.5" title="Marché en direct">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <MarketPicker
            symbols={symbols}
            timeframes={timeframes}
            symbol={symbol}
            timeframe={timeframe}
            onSelectSymbol={onSelectSymbol}
            onSelectTimeframe={onSelectTimeframe}
          />
          <DrawToolsMenu chartRef={chartRef} overlayManager={overlayManager} />
          <IndicatorsMenu
            chartRef={chartRef}
            active={activeIndicators}
            setActive={setActiveIndicators}
            panesRef={indicatorPanesRef}
          />
          <ChartStyleButton onClick={() => setStyleModalOpen(true)} />
          <ChartZoomControls chartRef={chartRef} />
          <span className="text-[11px] text-muted-foreground hidden xs:flex items-center gap-1 ml-auto">
            <RefreshCw className="h-3 w-3" />
            {lastUpdate ? lastUpdate.toLocaleTimeString('fr-FR') : '…'}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFullscreen((f) => !f)}
            className="h-7 px-2 ml-auto xs:ml-0"
            title={fullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Graphique pleine largeur (les outils sont dans les menus) */}
        <div
          className="relative flex-1 min-h-[300px] w-full rounded-none border-0 overflow-hidden transition-colors"
          style={{ height: chartHeight, backgroundColor: chartColors?.bgColor || undefined }}
          data-chart-container
        >
          {/* Modal de personnalisation des couleurs */}
          <ChartStyleSettingsModal
            open={styleModalOpen}
            onClose={() => setStyleModalOpen(false)}
            styles={chartColors}
            onApplyStyles={applyStyles}
            onApplyPreset={applyPreset}
            onReset={resetDefault}
          />

          {/* Barre d'action contextuelle au clic sur un outil de dessin (Paramètres & Suppression) */}
          <SelectedOverlayBar
            overlay={overlayManager.selectedOverlay}
            chartRef={chartRef}
            onDelete={overlayManager.deleteSelected}
            onDeselect={() => overlayManager.setSelectedOverlay(null)}
          />

          {/* Entête OHLC en surimpression avec compte à rebours de clôture, façon MT5 */}
          {last && typeof last.close === 'number' && typeof last.open === 'number' && (
            <div className="pointer-events-none absolute left-1 top-1 z-20 flex items-center gap-2 rounded-md bg-background/90 backdrop-blur-sm border px-2 py-1 shadow-sm sm:left-2 sm:top-2">
              <div>
                <p className="text-[10px] font-semibold text-primary sm:text-xs leading-none mb-0.5">
                  {symbolName || symbol} <span className="text-foreground">{timeframe}</span>
                </p>
                <p className="text-[9px] tabular-nums text-muted-foreground sm:text-[11px] leading-tight">
                  O {last.open.toFixed(digits)} H {(last.high ?? last.open).toFixed(digits)} L {(last.low ?? last.close).toFixed(digits)}{' '}
                  <span className={last.close >= last.open ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                    C {last.close.toFixed(digits)}
                  </span>
                </p>
              </div>
              <div className="h-6 w-px bg-border mx-0.5 hidden xs:block" />
              <CandleCountdownBadge timeframe={timeframe} />
            </div>
          )}
          <div ref={containerRef} className="w-full h-full" />
          <ChartWatermark />
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
    </ChartErrorBoundary>
  );
}
