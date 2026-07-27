import React, { useEffect, useMemo, useRef, useState } from 'react';
import { init, dispose } from 'klinecharts';
import { Button } from '../ui/button';
import ReplayEquityChart from './ReplayEquityChart';
import {
  CHART_STYLES, ensureRectOverlay, detectPriceDigits,
  DrawingToolbar, IndicatorButtons, useFullscreen,
} from './chartShared';
import {
  Play, Pause, RotateCcw, SkipForward, Film, Eye, Loader2,
  Maximize2, Minimize2, ChevronDown, ChevronUp,
} from 'lucide-react';

// ---- Constantes ----
const INITIAL_CONTEXT = 30;   // bougies affichées au démarrage du replay
const MAX_MARKERS = 400;      // nombre max de trades annotés sur le graphique

const SPEEDS = [
  { key: 1, label: 'x1', delay: 1000 },
  { key: 2, label: 'x2', delay: 500 },
  { key: 5, label: 'x5', delay: 200 },
  { key: 10, label: 'x10', delay: 100 },
  { key: 25, label: 'x25', delay: 40 },
];

const fmtDateLong = (t) =>
  new Date(t * 1000).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Graphique en chandeliers japonais avec mode Replay façon TradingView :
 * lecture bougie par bougie à vitesse réglable, date courante affichée,
 * marqueurs de trades au fil de l'eau, outils de dessin et indicateurs,
 * courbe d'équité synchronisée en dessous.
 */
export default function ReplayChart({ candles, trades, equityCurve, symbolName, timeframe }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const timerRef = useRef(null);
  const indexRef = useRef(0);
  const entryPtrRef = useRef(0);
  const exitPtrRef = useRef(0);
  const indicatorPanesRef = useRef({});

  const [mode, setMode] = useState('full');       // 'full' | 'replay'
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [index, setIndex] = useState(0);          // index de la bougie courante
  const [activeIndicators, setActiveIndicators] = useState({});
  const [fullscreen, setFullscreen] = useFullscreen();
  const [showPanels, setShowPanels] = useState(false); // équité/outils replié en plein écran

  // ---- Données converties pour KLineCharts (timestamp en ms) ----
  const klineData = useMemo(
    () => (candles || []).map((c) => ({ timestamp: c.time * 1000, open: c.open, high: c.high, low: c.low, close: c.close })),
    [candles]
  );

  // Précision des prix déduite des données.
  const priceDigits = useMemo(() => detectPriceDigits(candles), [candles]);

  // Trades triés par temps d'entrée / de sortie pour l'ajout progressif des marqueurs.
  const entryEvents = useMemo(
    () => (trades || []).slice(0, MAX_MARKERS).map((t) => ({ time: t.entry_time, trade: t })).sort((a, b) => a.time - b.time),
    [trades]
  );
  const exitEvents = useMemo(
    () => (trades || []).slice(0, MAX_MARKERS).map((t) => ({ time: t.exit_time, trade: t })).sort((a, b) => a.time - b.time),
    [trades]
  );

  const addMarker = (chart, kind, trade) => {
    const isBuy = trade.side === 'buy';
    const text = kind === 'entry'
      ? (isBuy ? '▲ Achat' : '▼ Vente')
      : `✕ ${trade.profit >= 0 ? '+' : ''}${Math.round(trade.profit)}$`;
    chart.createOverlay({
      name: 'simpleAnnotation',
      groupId: 'trades',
      lock: true,
      points: [{
        timestamp: (kind === 'entry' ? trade.entry_time : trade.exit_time) * 1000,
        value: kind === 'entry' ? trade.entry_price : trade.exit_price,
      }],
      extendData: text,
      styles: {
        text: { color: kind === 'entry' ? (isBuy ? '#22c55e' : '#ef4444') : (trade.profit >= 0 ? '#22c55e' : '#ef4444') },
      },
    });
  };

  // Ajoute les marqueurs des trades devenus visibles jusqu'à `time`.
  const advanceMarkers = (time) => {
    const chart = chartRef.current;
    if (!chart) return;
    while (entryPtrRef.current < entryEvents.length && entryEvents[entryPtrRef.current].time <= time) {
      addMarker(chart, 'entry', entryEvents[entryPtrRef.current].trade);
      entryPtrRef.current++;
    }
    while (exitPtrRef.current < exitEvents.length && exitEvents[exitPtrRef.current].time <= time) {
      addMarker(chart, 'exit', exitEvents[exitPtrRef.current].trade);
      exitPtrRef.current++;
    }
  };

  const resetMarkers = () => {
    chartRef.current?.removeOverlay({ groupId: 'trades' });
    entryPtrRef.current = 0;
    exitPtrRef.current = 0;
  };

  // ---- Initialisation du graphique ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !klineData.length) return;
    ensureRectOverlay();
    const chart = init(el);
    chartRef.current = chart;
    chart.setStyles(CHART_STYLES);
    chart.setPriceVolumePrecision?.(priceDigits, 0);
    chart.applyNewData(klineData);
    resetMarkers();
    advanceMarkers(Infinity); // vue complète : tous les marqueurs
    indexRef.current = klineData.length - 1;
    setIndex(klineData.length - 1);
    setMode('full');
    setPlaying(false);
    setActiveIndicators({});
    indicatorPanesRef.current = {};
    return () => {
      clearInterval(timerRef.current);
      dispose(el);
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klineData]);

  // Recalcule la taille du canvas quand le conteneur change (plein écran, panneaux).
  useEffect(() => {
    const t = setTimeout(() => chartRef.current?.resize(), 60);
    return () => clearTimeout(t);
  }, [fullscreen, showPanels, activeIndicators]);

  // ---- Boucle du replay ----
  useEffect(() => {
    if (!playing) return;
    const delay = SPEEDS.find((s) => s.key === speed)?.delay ?? 200;
    timerRef.current = setInterval(() => {
      const next = indexRef.current + 1;
      if (next >= klineData.length) {
        setPlaying(false);
        return;
      }
      indexRef.current = next;
      chartRef.current?.updateData(klineData[next]);
      advanceMarkers(candles[next].time);
      setIndex(next);
    }, delay);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, klineData]);

  // ---- Contrôles ----
  const enterReplay = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const start = Math.min(INITIAL_CONTEXT, klineData.length) - 1;
    chart.applyNewData(klineData.slice(0, start + 1));
    resetMarkers();
    advanceMarkers(candles[start].time);
    indexRef.current = start;
    setIndex(start);
    setMode('replay');
    setPlaying(true);
  };

  const exitReplay = () => {
    setPlaying(false);
    clearInterval(timerRef.current);
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyNewData(klineData);
    resetMarkers();
    advanceMarkers(Infinity);
    indexRef.current = klineData.length - 1;
    setIndex(klineData.length - 1);
    setMode('full');
  };

  const restartReplay = () => {
    setPlaying(false);
    clearInterval(timerRef.current);
    enterReplay();
  };

  const stepForward = () => {
    const next = indexRef.current + 1;
    if (next >= klineData.length) return;
    indexRef.current = next;
    chartRef.current?.updateData(klineData[next]);
    advanceMarkers(candles[next].time);
    setIndex(next);
  };

  const seek = (i) => {
    const chart = chartRef.current;
    if (!chart) return;
    i = Math.max(0, Math.min(Number(i), klineData.length - 1));
    chart.applyNewData(klineData.slice(0, i + 1));
    resetMarkers();
    advanceMarkers(candles[i].time);
    indexRef.current = i;
    setIndex(i);
  };

  if (!candles?.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des bougies…
      </div>
    );
  }

  const currentTime = candles[index]?.time;
  const inReplay = mode === 'replay';
  const progressPct = klineData.length > 1 ? Math.round((index / (klineData.length - 1)) * 100) : 100;
  const cur = candles[index];
  const digits = priceDigits;

  // Plein écran : occupe tout l'écran comme MT5 mobile ; sinon grande hauteur responsive.
  const wrapClass = fullscreen
    ? 'fixed inset-0 z-50 flex flex-col gap-1.5 bg-background p-1.5 overflow-hidden'
    : 'space-y-3';
  const chartHeight = fullscreen ? undefined : 'clamp(420px, 62vh, 760px)';

  return (
    <div className={wrapClass}>
      {/* ==================== BARRE DE CONTRÔLE REPLAY ==================== */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        {!inReplay ? (
          <Button size="sm" onClick={enterReplay} className="gap-1.5">
            <Film className="h-4 w-4" /> Replay
          </Button>
        ) : (
          <>
            <Button size="sm" variant={playing ? 'secondary' : 'default'} onClick={() => setPlaying((p) => !p)} className="gap-1.5">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? 'Pause' : 'Lecture'}
            </Button>
            <Button size="sm" variant="outline" onClick={stepForward} title="Bougie suivante">
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={restartReplay} title="Recommencer">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 ml-1">
              {SPEEDS.map((s) => (
                <Button
                  key={s.key}
                  size="sm"
                  variant={speed === s.key ? 'default' : 'ghost'}
                  className="px-2 h-7 text-xs"
                  onClick={() => setSpeed(s.key)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
            <Button size="sm" variant="ghost" onClick={exitReplay} className="gap-1.5 ml-auto">
              <Eye className="h-4 w-4" /> Vue complète
            </Button>
          </>
        )}
        {!inReplay && (
          <span className="text-xs text-muted-foreground ml-auto">
            {symbolName} • {timeframe} • {candles.length} bougies
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFullscreen((f) => !f)}
          className="gap-1.5"
          title={fullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Date courante + progression (replay) */}
      {inReplay && (
        <div className={`rounded-lg border bg-card ${fullscreen ? 'px-2 py-1 space-y-1' : 'p-3 space-y-2'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`font-semibold tabular-nums ${fullscreen ? 'text-sm' : 'text-base'}`}>
              📅 {currentTime ? fmtDateLong(currentTime) : '—'}
            </p>
            <span className="text-xs text-muted-foreground tabular-nums">
              Bougie {index + 1} / {klineData.length} ({progressPct} %)
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={klineData.length - 1}
            value={index}
            onChange={(e) => seek(e.target.value)}
            className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
        </div>
      )}

      {/* ==================== GRAPHIQUE + OUTILS ==================== */}
      <div className={`flex gap-1.5 ${fullscreen ? 'flex-1 min-h-0' : ''}`}>
        {/* Toolbar de dessin façon TradingView */}
        <DrawingToolbar chartRef={chartRef} />

        <div className={`flex-1 min-w-0 flex flex-col gap-1.5 ${fullscreen ? 'min-h-0' : ''}`}>
          {/* Boutons indicateurs */}
          <IndicatorButtons
            chartRef={chartRef}
            active={activeIndicators}
            setActive={setActiveIndicators}
            panesRef={indicatorPanesRef}
          />

          {/* Graphique chandeliers + entête OHLC en surimpression (façon MT5) */}
          <div className={`relative w-full rounded-lg border overflow-hidden ${fullscreen ? 'flex-1 min-h-0' : ''}`} style={{ height: chartHeight }}>
            <div className="pointer-events-none absolute left-2 top-1.5 z-10 leading-tight">
              <p className="text-xs font-semibold text-primary">
                {symbolName} <span className="text-foreground">{timeframe}</span>
              </p>
              {cur && (
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  O {cur.open.toFixed(digits)} H {cur.high.toFixed(digits)} L {cur.low.toFixed(digits)}{' '}
                  <span className={cur.close >= cur.open ? 'text-emerald-500' : 'text-red-500'}>
                    C {cur.close.toFixed(digits)}
                  </span>
                </p>
              )}
            </div>
            <div ref={containerRef} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* ==================== ÉQUITÉ SYNCHRONISÉE ==================== */}
      {fullscreen ? (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowPanels((s) => !s)}
            className="h-6 gap-1 self-center text-xs text-muted-foreground"
          >
            {showPanels ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            Capital
          </Button>
          {showPanels && (
            <div className="rounded-lg border bg-card p-2">
              <ReplayEquityChart points={equityCurve} currentTime={inReplay ? currentTime : null} />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground mb-2">Évolution du capital {inReplay ? '(synchronisée avec le replay)' : ''}</p>
          <ReplayEquityChart points={equityCurve} currentTime={inReplay ? currentTime : null} />
        </div>
      )}
    </div>
  );
}
