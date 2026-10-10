// Graphique chandeliers du terminal démo (KLineCharts). Réutilise les styles,
// outils de dessin et indicateurs partagés avec le module Backtesting.
// Historique via /api/demo/candles ; la dernière bougie est mise à jour en direct
// à partir du prix `mid` reçu par WebSocket.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { init, dispose } from 'klinecharts';
import { Loader2, Maximize2, Minimize2, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import '../backtest/chart-landscape.css';
import {
  CHART_STYLES, ensureCustomOverlaysAndIndicators, detectPriceDigits,
  DrawToolsMenu, IndicatorsMenu, ChartWatermark, useFullscreen, Dropdown,
  configureMT4Chart, ChartZoomControls, buildKLineStyles,
  useChartStyles, ChartStyleButton, ChartStyleSettingsModal,
  useChartOverlayManager, SelectedOverlayBar, CandleCountdownBadge,
  ChartErrorBoundary, usePriceAlerts, ChartAlertsMenu,
  CreatePriceAlertDialog, ChartContextMenu,
} from '../backtest/chartShared';
import { demoApi, DEMO_TIMEFRAMES } from '../../lib/demoApi';
import { useLanguageStore } from '../../store/languageStore';
import { useRealtimeQuote } from '../../hooks/useMarketSocket';

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

  // État du menu contextuel (clic-droit style TradingView) et modal d'alerte
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, price: null, formattedPrice: '', symbol: '' });
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertTargetPrice, setAlertTargetPrice] = useState('');

  const { language } = useLanguageStore();
  const isEnglish = language === 'en';
  const alertsManager = usePriceAlerts(symbol, chartRef);

  const {
    styles: chartColors,
    applyStyles,
    applyPreset,
    resetDefault,
    open: styleModalOpen,
    setOpen: setStyleModalOpen,
  } = useChartStyles(chartRef);

  const overlayManager = useChartOverlayManager(chartRef, containerRef);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    ensureCustomOverlaysAndIndicators();
    const chart = init(el);
    chart.setStyles(buildKLineStyles(chartColors));
    chart.setBarSpace?.(9);
    const unbindMT4 = configureMT4Chart(chart);
    chartRef.current = chart;
    return () => {
      unbindMT4?.();
      clearInterval(timerRef.current);
      dispose(el);
      chartRef.current = null;
    };
  }, []);

  // Helper pour convertir une unité de temps en millisecondes
  const getTimeframeMs = (tf) => {
    if (!tf) return 60 * 1000;
    if (tf.startsWith('M')) {
      const mins = parseInt(tf.slice(1), 10) || 1;
      return mins * 60 * 1000;
    }
    if (tf.startsWith('H')) {
      const hrs = parseInt(tf.slice(1), 10) || 1;
      return hrs * 3600 * 1000;
    }
    if (tf === 'D1') return 86400 * 1000;
    if (tf === 'W1') return 7 * 86400 * 1000;
    if (tf === 'MN') return 30 * 86400 * 1000;
    return 60 * 1000;
  };

  useEffect(() => {
    if (!symbol || !timeframe) return;
    let cancelled = false;
    digitsSetRef.current = false;

    const load = async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        const data = await demoApi.candles(symbol, timeframe, 300);
        if (cancelled || !chartRef.current) return;
        const raw = data.candles || [];
        const kline = raw
          .map((c) => ({
            timestamp: c.time * 1000,
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
            volume: Number(c.volume || 0),
          }))
          .filter((c) => (
            Number.isFinite(c.timestamp) &&
            Number.isFinite(c.open) &&
            Number.isFinite(c.high) &&
            Number.isFinite(c.low) &&
            Number.isFinite(c.close) &&
            c.open > 0 &&
            c.close > 0 &&
            c.high >= c.low
          ))
          .sort((a, b) => a.timestamp - b.timestamp);

        if (kline.length) {
          if (!digitsSetRef.current) {
            const d = detectPriceDigits(kline);
            chartRef.current.setPriceVolumePrecision?.(d, 0);
            setDigits(d);
            digitsSetRef.current = true;
          }
          if (!isBackground) {
            chartRef.current.applyNewData(kline);
            chartRef.current.setBarSpace?.(9);
            chartRef.current.scrollToRealTime?.();
            lastRef.current = kline[kline.length - 1] || null;
          } else {
            // Background sync silencieux : ne pas perturber le zoom/scroll ni réinitialiser
            const latest = kline[kline.length - 1];
            if (latest && (!lastRef.current || latest.timestamp >= lastRef.current.timestamp)) {
              chartRef.current.updateData(latest);
            }
          }
        }
        setError(null);
      } catch (err) {
        if (!cancelled && !isBackground) setError(err.response?.data?.message || 'Données indisponibles');
      } finally {
        if (!cancelled && !isBackground) setLoading(false);
      }
    };

    load(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => load(true), RELOAD_MS);
    return () => { cancelled = true; clearInterval(timerRef.current); };
  }, [symbol, timeframe]);

  // Traitement instantané du tick de prix (ouverture nouvelle bougie ou mise à jour courante)
  const processLivePriceTick = useCallback((q) => {
    const chart = chartRef.current;
    if (!chart || !q || !(q.mid > 0)) return;
    if (q.symbol && q.symbol !== symbol) return;

    const mid = Number(q.mid);
    if (!Number.isFinite(mid) || mid <= 0) return;

    const last = lastRef.current;
    if (!last) return;

    const tfMs = getTimeframeMs(timeframe);
    const tickTime = Number(q.ts) || Date.now();
    const currentBucket = Math.floor(tickTime / tfMs) * tfMs;

    if (currentBucket > last.timestamp) {
      // Nouvelle bougie en temps réel synchronisée avec l'intervalle de temps (TradingView style)
      const newCandle = {
        timestamp: currentBucket,
        open: mid,
        high: mid,
        low: mid,
        close: mid,
        volume: 0,
      };
      lastRef.current = newCandle;
      chart.updateData(newCandle);
    } else {
      // Mise à jour continue de la bougie en cours
      if (last.close > 0 && Math.abs(mid - last.close) / last.close > 0.15) return;
      const updated = {
        ...last,
        close: mid,
        high: Math.max(last.high, mid),
        low: Math.min(last.low, mid),
      };
      lastRef.current = updated;
      chart.updateData(updated);
    }

    // Mise à jour en temps réel de l'évolution du prix sur les positions Long / Short
    try {
      const longOverlays = chart.getOverlayList?.({ name: 'positionLong' }) || [];
      const shortOverlays = chart.getOverlayList?.({ name: 'positionShort' }) || [];
      const allPos = [...longOverlays, ...shortOverlays];
      if (allPos.length > 0) {
        allPos.forEach((ov) => {
          chart.overrideOverlay?.({
            id: ov.id,
            extendData: { ...(ov.extendData || {}), currentPrice: mid },
          });
        });
      }
    } catch (_) {}

    // Détection immédiate d'alertes de prix (TradingView / MT5)
    const triggered = alertsManager.checkLivePrice(mid);
    if (triggered && triggered.length > 0) {
      triggered.forEach((alert) => {
        toast.warning(
          isEnglish
            ? `🔔 ALERT: ${symbolName || symbol} reached ${alert.targetPrice}${alert.note ? ` (${alert.note})` : ''}!`
            : `🔔 ALERTE : ${symbolName || symbol} a atteint ${alert.targetPrice}${alert.note ? ` (${alert.note})` : ''} !`,
          { duration: 7000 }
        );
      });
    }
  }, [symbol, timeframe, alertsManager, isEnglish, symbolName]);

  // Clic droit sur le graphique : ouverture du menu contextuel TradingView
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    const el = containerRef.current;
    const chart = chartRef.current;
    if (!el || !chart) return;

    const rect = el.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    if (relY < 0 || relY > rect.height) return;

    // Conversion du pixel Y en prix via KLineCharts
    let clickedPrice = null;
    try {
      const coord = chart.convertFromPixel?.({ y: relY }, { paneId: 'candle_pane' });
      if (coord && typeof coord.value === 'number' && Number.isFinite(coord.value)) {
        clickedPrice = coord.value;
      }
    } catch (_) {}

    if (clickedPrice == null && lastRef.current?.close) {
      clickedPrice = lastRef.current.close;
    }

    if (clickedPrice != null) {
      const formatted = clickedPrice.toFixed(digits);
      setContextMenu({
        visible: true,
        x: Math.min(e.clientX, window.innerWidth - 220),
        y: Math.min(e.clientY, window.innerHeight - 120),
        price: clickedPrice,
        formattedPrice: formatted,
        symbol: symbolName || symbol,
      });
    }
  }, [digits, symbol, symbolName]);

  // Fermer le menu contextuel lors d'un clic ailleurs
  useEffect(() => {
    const handleDocClick = () => {
      setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, []);

  // Abonnement direct 0 ms de latence sans re-render React du parent
  useRealtimeQuote(symbol, processLivePriceTick);

  // Fallback si prop liveQuote reçue
  useEffect(() => {
    if (liveQuote) processLivePriceTick(liveQuote);
  }, [liveQuote, processLivePriceTick]);

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
    ? 'fixed inset-0 z-[60] flex flex-col gap-1 bg-background p-1 overflow-hidden'
    : 'h-full w-full flex flex-col gap-1 overflow-hidden p-0 m-0';

  return (
    <ChartErrorBoundary>
      <div className={wrapClass}>
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 flex-shrink-0 pl-24 sm:pl-28 pr-1 py-0.5" data-chart-toolbar>
          <span className="text-xs font-semibold text-primary mr-1">{symbolName || symbol}</span>
          
          {/* Sélecteur d'unité de temps en liste déroulante */}
          <TimeframeDropdown timeframe={timeframe} onSelectTimeframe={onSelectTimeframe} isEnglish={isEnglish} />

          <CandleCountdownBadge timeframe={timeframe} />

          <DrawToolsMenu chartRef={chartRef} overlayManager={overlayManager} />
          <IndicatorsMenu chartRef={chartRef} active={activeIndicators} setActive={setActiveIndicators} panesRef={panesRef} />
          <ChartAlertsMenu alertsManager={alertsManager} currentPrice={lastRef.current?.close} symbol={symbolName || symbol} isEnglish={isEnglish} />
          <ChartStyleButton onClick={() => setStyleModalOpen(true)} />
          <ChartZoomControls chartRef={chartRef} />
          <Button size="sm" variant="outline" onClick={() => setFullscreen((f) => !f)} className="h-7 px-2 ml-auto" title={isEnglish ? 'Fullscreen' : 'Plein écran'}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        <div
          className="relative flex-1 min-h-[300px] w-full rounded-none border-0 overflow-hidden transition-colors"
          style={{ backgroundColor: chartColors?.bgColor || undefined }}
          data-chart-container
        >
          <ChartStyleSettingsModal
            open={styleModalOpen}
            onClose={() => setStyleModalOpen(false)}
            styles={chartColors}
            onApplyStyles={applyStyles}
            onApplyPreset={applyPreset}
            onReset={resetDefault}
          />

          {/* Barre d'action contextuelle au clic sur un outil de dessin (Paramètres couleur/épaisseur/style & Suppression) */}
          <SelectedOverlayBar
            overlay={overlayManager.selectedOverlay}
            chartRef={chartRef}
            onDelete={overlayManager.deleteSelected}
            onDeselect={() => overlayManager.setSelectedOverlay(null)}
          />

          <div
            ref={containerRef}
            className="w-full h-full cursor-crosshair"
            style={{ width: '100%', height: '100%', minHeight: '300px' }}
            onContextMenu={handleContextMenu}
          />
          <ChartWatermark />
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

          {/* Menu contextuel TradingView au clic droit */}
          <ChartContextMenu
            menu={contextMenu}
            onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
            onAddAlert={(price) => {
              setAlertTargetPrice(price != null ? String(price) : '');
              setAlertModalOpen(true);
            }}
            isEnglish={isEnglish}
          />

          {/* Modal de création d'alerte TradingView / MT5 */}
          <CreatePriceAlertDialog
            open={alertModalOpen}
            onClose={() => setAlertModalOpen(false)}
            initialPrice={alertTargetPrice}
            symbol={symbolName || symbol}
            currentPrice={lastRef.current?.close}
            isEnglish={isEnglish}
            onCreateAlert={async (data) => {
              await alertsManager.createAlert(data);
            }}
          />
        </div>
      </div>
    </ChartErrorBoundary>
  );
}

function TimeframeDropdown({ timeframe, onSelectTimeframe, isEnglish = false }) {
  const [open, setOpen] = useState(false);
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      width="w-52"
      trigger={
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs gap-1.5 font-semibold bg-card hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          title={isEnglish ? 'Timeframe' : 'Unité de temps'}
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
            onClick={(e) => {
              e.stopPropagation();
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
