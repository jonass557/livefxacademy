import React, { useEffect, useMemo, useRef, useState } from 'react';
import { init, dispose, registerOverlay } from 'klinecharts';
import { Button } from '../ui/button';
import ReplayEquityChart from './ReplayEquityChart';
import {
  Play, Pause, RotateCcw, SkipForward, Film, Eye, Loader2,
  Slash, PenLine, MoveUpRight, Minus, SeparatorVertical, Tag,
  Equal, AlignJustify, Square, Type, Eraser,
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

// Outils de dessin natifs KLineCharts (façon TradingView).
const DRAW_TOOLS = [
  { name: 'segment', label: 'Ligne de tendance', Icon: Slash },
  { name: 'straightLine', label: 'Droite infinie', Icon: PenLine },
  { name: 'rayLine', label: 'Demi-droite', Icon: MoveUpRight },
  { name: 'horizontalStraightLine', label: 'Ligne horizontale', Icon: Minus },
  { name: 'verticalStraightLine', label: 'Ligne verticale', Icon: SeparatorVertical },
  { name: 'priceLine', label: 'Ligne de prix', Icon: Tag },
  { name: 'parallelStraightLine', label: 'Canal parallèle', Icon: Equal },
  { name: 'fibonacciLine', label: 'Retracement Fibonacci', Icon: AlignJustify },
  { name: 'rect', label: 'Rectangle', Icon: Square },
  { name: 'simpleAnnotation', label: 'Texte / annotation', Icon: Type },
];

// Indicateurs intégrés KLineCharts : superposés au prix ou en sous-graphique.
const MAIN_INDICATORS = ['MA', 'EMA', 'BOLL'];
const SUB_INDICATORS = ['RSI', 'MACD', 'KDJ'];

// Thème sombre assorti au dashboard.
const CHART_STYLES = {
  grid: {
    horizontal: { color: 'rgba(148,163,184,0.1)' },
    vertical: { color: 'rgba(148,163,184,0.1)' },
  },
  candle: {
    bar: {
      upColor: '#22c55e', downColor: '#ef4444',
      upBorderColor: '#22c55e', downBorderColor: '#ef4444',
      upWickColor: '#22c55e', downWickColor: '#ef4444',
    },
    priceMark: { last: { upColor: '#22c55e', downColor: '#ef4444' } },
  },
  xAxis: { axisLine: { color: 'rgba(148,163,184,0.3)' }, tickText: { color: '#9ca3af' } },
  yAxis: { axisLine: { color: 'rgba(148,163,184,0.3)' }, tickText: { color: '#9ca3af' } },
  crosshair: {
    horizontal: { line: { color: '#6b7280' }, text: { backgroundColor: '#374151' } },
    vertical: { line: { color: '#6b7280' }, text: { backgroundColor: '#374151' } },
  },
};

// KLineCharts n'a pas de rectangle natif : on l'enregistre une fois.
let rectRegistered = false;
function ensureRectOverlay() {
  if (rectRegistered) return;
  registerOverlay({
    name: 'rect',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length < 2) return [];
      const [a, b] = coordinates;
      return [{
        type: 'polygon',
        attrs: { coordinates: [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }] },
        styles: { style: 'stroke_fill', color: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6' },
      }];
    },
  });
  rectRegistered = true;
}

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

  // ---- Données converties pour KLineCharts (timestamp en ms) ----
  const klineData = useMemo(
    () => (candles || []).map((c) => ({ timestamp: c.time * 1000, open: c.open, high: c.high, low: c.low, close: c.close })),
    [candles]
  );

  // Précision des prix déduite des données (5 décimales EUR/USD, 3 pour JPY…).
  const priceDigits = useMemo(() => {
    let d = 2;
    for (const c of (candles || []).slice(0, 50)) {
      const s = String(c.close);
      const i = s.indexOf('.');
      if (i >= 0) d = Math.max(d, s.length - i - 1);
    }
    return Math.min(d, 6);
  }, [candles]);

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

  // ---- Outils de dessin ----
  const startDrawing = (name) => chartRef.current?.createOverlay({ name, groupId: 'draw' });
  const clearDrawings = () => chartRef.current?.removeOverlay({ groupId: 'draw' });

  // ---- Indicateurs ----
  const toggleIndicator = (name) => {
    const chart = chartRef.current;
    if (!chart) return;
    const isMain = MAIN_INDICATORS.includes(name);
    setActiveIndicators((prev) => {
      const on = !prev[name];
      if (on) {
        const paneId = isMain
          ? (chart.createIndicator(name, true, { id: 'candle_pane' }), 'candle_pane')
          : chart.createIndicator(name);
        indicatorPanesRef.current[name] = paneId;
      } else {
        chart.removeIndicator(indicatorPanesRef.current[name], name);
        delete indicatorPanesRef.current[name];
      }
      return { ...prev, [name]: on };
    });
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

  return (
    <div className="space-y-3">
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
      </div>

      {/* Date courante + progression (replay) */}
      {inReplay && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold tabular-nums">
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
      <div className="flex gap-2">
        {/* Toolbar de dessin façon TradingView */}
        <div className="flex flex-col gap-1 rounded-lg border bg-card p-1 self-start">
          {DRAW_TOOLS.map(({ name, label, Icon }) => (
            <Button key={name} size="icon" variant="ghost" className="h-8 w-8" title={label} onClick={() => startDrawing(name)}>
              <Icon className="h-4 w-4" />
            </Button>
          ))}
          <div className="border-t my-1" />
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Effacer les dessins" onClick={clearDrawings}>
            <Eraser className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Boutons indicateurs */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Indicateurs :</span>
            {[...MAIN_INDICATORS, ...SUB_INDICATORS].map((name) => (
              <Button
                key={name}
                size="sm"
                variant={activeIndicators[name] ? 'default' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => toggleIndicator(name)}
              >
                {name}
              </Button>
            ))}
          </div>

          {/* Graphique chandeliers */}
          <div ref={containerRef} className="w-full rounded-lg border" style={{ height: 420 }} />
        </div>
      </div>

      {/* ==================== ÉQUITÉ SYNCHRONISÉE ==================== */}
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs text-muted-foreground mb-2">Évolution du capital {inReplay ? '(synchronisée avec le replay)' : ''}</p>
        <ReplayEquityChart points={equityCurve} currentTime={inReplay ? currentTime : null} />
      </div>
    </div>
  );
}
