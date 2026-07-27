import React, { useEffect, useMemo, useRef, useState } from 'react';
import { init, dispose } from 'klinecharts';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import {
  CHART_STYLES, ensureRectOverlay, detectPriceDigits,
  DrawToolsMenu, IndicatorsMenu, useFullscreen,
} from './chartShared';
import {
  Play, Pause, RotateCcw, SkipForward, Film, Eye, Loader2,
  Maximize2, Minimize2, ArrowUpCircle, ArrowDownCircle, XCircle,
} from 'lucide-react';

const SPEEDS = [
  { key: 1, label: 'x1', delay: 1000 },
  { key: 2, label: 'x2', delay: 500 },
  { key: 5, label: 'x5', delay: 200 },
  { key: 10, label: 'x10', delay: 100 },
  { key: 25, label: 'x25', delay: 40 },
];

const PIP_VALUE_PER_LOT = 10; // $ par pip et par lot (standard)

const fmtDateLong = (t) =>
  new Date(t * 1000).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const fmt$ = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)} $`;

/**
 * Simulateur de replay manuel : le graphique rejoue la période délimitée
 * bougie par bougie (de la date de début à la date de fin, arrêt automatique)
 * et le trader prend lui-même ses positions Buy/Sell pour tester sa stratégie.
 * Aucune position n'est prise automatiquement.
 */
export default function ReplayChart({
  candles, symbolName, timeframe, periodBounds,
  pip = 0.0001, lot = 0.1, initialBalance = 10000,
  loading = false, replaySignal = 0,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const timerRef = useRef(null);
  const indexRef = useRef(0);
  const positionRef = useRef(null);   // { side, entryPrice, entryTime }
  const balanceRef = useRef(initialBalance);
  const indicatorPanesRef = useRef({});

  const [mode, setMode] = useState('full');       // 'full' | 'replay'
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [index, setIndex] = useState(0);
  const [activeIndicators, setActiveIndicators] = useState({});
  const [fullscreen, setFullscreen] = useFullscreen();
  const [position, setPosition] = useState(null);
  const [balance, setBalance] = useState(initialBalance);
  const [closedTrades, setClosedTrades] = useState(0);

  const klineData = useMemo(
    () => (candles || []).map((c) => ({ timestamp: c.time * 1000, open: c.open, high: c.high, low: c.low, close: c.close })),
    [candles]
  );
  const priceDigits = useMemo(() => detectPriceDigits(candles), [candles]);

  // Bornes du replay : premier / dernier index dans la période délimitée.
  const { startIdx, endIdx } = useMemo(() => {
    let s = 0, e = (candles?.length || 1) - 1;
    if (candles?.length && periodBounds) {
      s = candles.findIndex((c) => c.time >= periodBounds.start);
      if (s < 0) s = 0;
      for (let i = candles.length - 1; i >= 0; i--) {
        if (candles[i].time <= periodBounds.end) { e = i; break; }
      }
      if (e < s) e = candles.length - 1;
    }
    return { startIdx: s, endIdx: e };
  }, [candles, periodBounds]);

  // ---- Trading manuel ----
  const profitOf = (pos, price) => {
    const diff = (price - pos.entryPrice) * (pos.side === 'buy' ? 1 : -1);
    return (diff / pip) * PIP_VALUE_PER_LOT * lot;
  };

  const annotate = (text, time, price, color) => {
    chartRef.current?.createOverlay({
      name: 'simpleAnnotation', groupId: 'trades', lock: true,
      points: [{ timestamp: time * 1000, value: price }],
      extendData: text, styles: { text: { color } },
    });
  };

  const openPosition = (side) => {
    if (positionRef.current) return;
    const c = candles[indexRef.current];
    if (!c) return;
    const pos = { side, entryPrice: c.close, entryTime: c.time };
    positionRef.current = pos;
    setPosition(pos);
    annotate(side === 'buy' ? `▲ Buy ${lot}` : `▼ Sell ${lot}`, c.time, c.close, side === 'buy' ? '#22c55e' : '#ef4444');
    chartRef.current?.createOverlay({
      name: 'priceLine', groupId: 'position', lock: true,
      points: [{ timestamp: c.time * 1000, value: c.close }],
      styles: { line: { color: side === 'buy' ? '#22c55e' : '#ef4444', style: 'dashed', size: 1 } },
    });
  };

  const closePosition = (price, time) => {
    const pos = positionRef.current;
    if (!pos) return;
    const profit = profitOf(pos, price);
    balanceRef.current += profit;
    setBalance(balanceRef.current);
    positionRef.current = null;
    setPosition(null);
    setClosedTrades((n) => n + 1);
    chartRef.current?.removeOverlay({ groupId: 'position' });
    annotate(`✕ ${fmt$(profit)}`, time, price, profit >= 0 ? '#22c55e' : '#ef4444');
    toast[profit >= 0 ? 'success' : 'error'](`Position fermée : ${fmt$(profit)}`);
  };

  const resetSession = () => {
    positionRef.current = null;
    setPosition(null);
    balanceRef.current = initialBalance;
    setBalance(initialBalance);
    setClosedTrades(0);
    chartRef.current?.removeOverlay({ groupId: 'trades' });
    chartRef.current?.removeOverlay({ groupId: 'position' });
  };

  // Lignes verticales délimitant la période (début bleu, fin violet).
  const drawPeriodBounds = () => {
    const chart = chartRef.current;
    if (!chart || !periodBounds || !candles?.length) return;
    chart.removeOverlay({ groupId: 'bounds' });
    const first = candles[0].time, lastT = candles[candles.length - 1].time;
    for (const [key, t] of [['start', periodBounds.start], ['end', periodBounds.end]]) {
      if (t < first || t > lastT) continue;
      chart.createOverlay({
        name: 'verticalStraightLine', groupId: 'bounds', lock: true,
        points: [{ timestamp: t * 1000 }],
        styles: { line: { color: key === 'start' ? '#3b82f6' : '#a855f7', size: 1, style: 'dashed' } },
      });
    }
  };

  // ---- Initialisation ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !klineData.length) return;
    ensureRectOverlay();
    const chart = init(el);
    chartRef.current = chart;
    chart.setStyles(CHART_STYLES);
    chart.setPriceVolumePrecision?.(priceDigits, 0);
    chart.applyNewData(klineData);
    drawPeriodBounds();
    indexRef.current = klineData.length - 1;
    setIndex(klineData.length - 1);
    setMode('full');
    setPlaying(false);
    setActiveIndicators({});
    indicatorPanesRef.current = {};
    resetSession();
    return () => {
      clearInterval(timerRef.current);
      dispose(el);
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klineData]);

  useEffect(() => {
    const t = setTimeout(() => chartRef.current?.resize(), 60);
    return () => clearTimeout(t);
  }, [fullscreen, activeIndicators]);

  // ---- Démarrage du replay : exactement à la date de début ----
  const enterReplay = () => {
    const chart = chartRef.current;
    if (!chart || !klineData.length) return;
    resetSession();
    const from = Math.max(startIdx, 0);
    // Contexte : les bougies de marge avant la date de début.
    chart.applyNewData(klineData.slice(0, from + 1));
    drawPeriodBounds();
    indexRef.current = from;
    setIndex(from);
    setMode('replay');
    setPlaying(true);
  };

  // Déclenchement externe (bouton Replay de la barre de réglages).
  useEffect(() => {
    if (replaySignal > 0 && klineData.length) enterReplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replaySignal]);

  const exitReplay = () => {
    setPlaying(false);
    clearInterval(timerRef.current);
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyNewData(klineData);
    drawPeriodBounds();
    indexRef.current = klineData.length - 1;
    setIndex(klineData.length - 1);
    setMode('full');
  };

  const stepForward = () => {
    const next = indexRef.current + 1;
    if (next > endIdx) return;
    indexRef.current = next;
    chartRef.current?.updateData(klineData[next]);
    setIndex(next);
  };

  // ---- Boucle : arrêt automatique à la date de fin ----
  useEffect(() => {
    if (!playing) return;
    const delay = SPEEDS.find((s) => s.key === speed)?.delay ?? 200;
    timerRef.current = setInterval(() => {
      const next = indexRef.current + 1;
      if (next > endIdx) {
        setPlaying(false);
        // Fin de période : fermeture automatique de la position restante.
        if (positionRef.current) {
          const last = candles[endIdx];
          closePosition(last.close, last.time);
        }
        toast.info('Fin de la période de replay');
        return;
      }
      indexRef.current = next;
      chartRef.current?.updateData(klineData[next]);
      setIndex(next);
    }, delay);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, klineData, endIdx]);

  const seek = (i) => {
    const chart = chartRef.current;
    if (!chart) return;
    i = Math.max(startIdx, Math.min(Number(i), endIdx));
    chart.applyNewData(klineData.slice(0, i + 1));
    drawPeriodBounds();
    indexRef.current = i;
    setIndex(i);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border h-64 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement du graphique…
      </div>
    );
  }
  if (!candles?.length) {
    return (
      <div className="flex items-center justify-center rounded-xl border h-64 text-sm text-muted-foreground">
        Aucune donnée pour cette période.
      </div>
    );
  }

  const cur = candles[index];
  const inReplay = mode === 'replay';
  const floating = position && cur ? profitOf(position, cur.close) : 0;
  const equity = balance + floating;
  const spanTotal = Math.max(endIdx - startIdx, 1);
  const progressPct = Math.round(((Math.min(Math.max(index, startIdx), endIdx) - startIdx) / spanTotal) * 100);
  const digits = priceDigits;

  const wrapClass = fullscreen
    ? 'fixed inset-0 z-50 flex flex-col gap-1.5 bg-background p-1.5 overflow-hidden'
    : 'space-y-3';
  const chartHeight = fullscreen ? undefined : 'clamp(420px, 62vh, 760px)';

  return (
    <div className={wrapClass}>
      {/* ==================== BARRE DE CONTRÔLE ==================== */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        {!inReplay ? (
          <>
            <Button size="sm" onClick={enterReplay} className="gap-1.5">
              <Film className="h-4 w-4" /> Replay
            </Button>
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="inline-block h-2.5 w-0.5 bg-blue-500" /> début
              <span className="inline-block h-2.5 w-0.5 bg-purple-500" /> fin
              <span className="hidden sm:inline">— le replay démarre à la date de début et s'arrête à la date de fin.</span>
            </span>
          </>
        ) : (
          <>
            <Button size="sm" variant={playing ? 'secondary' : 'default'} onClick={() => setPlaying((p) => !p)} className="gap-1.5">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? 'Pause' : 'Reprendre'}
            </Button>
            <Button size="sm" variant="outline" onClick={stepForward} title="Bougie suivante">
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={enterReplay} title="Recommencer (remet le solde à zéro)">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 ml-1">
              {SPEEDS.map((s) => (
                <Button key={s.key} size="sm" variant={speed === s.key ? 'default' : 'ghost'} className="px-2 h-7 text-xs" onClick={() => setSpeed(s.key)}>
                  {s.label}
                </Button>
              ))}
            </div>
            <Button size="sm" variant="ghost" onClick={exitReplay} className="gap-1.5">
              <Eye className="h-4 w-4" /> Vue complète
            </Button>
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto hidden md:inline">
          {symbolName} • {timeframe}
        </span>
        <DrawToolsMenu chartRef={chartRef} />
        <IndicatorsMenu chartRef={chartRef} active={activeIndicators} setActive={setActiveIndicators} panesRef={indicatorPanesRef} />
        <Button size="sm" variant="outline" onClick={() => setFullscreen((f) => !f)} title={fullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}>
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* ==================== TRADING MANUEL + DATE (replay) ==================== */}
      {inReplay && (
        <div className={`rounded-lg border bg-card ${fullscreen ? 'px-2 py-1 space-y-1' : 'p-3 space-y-2'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-semibold tabular-nums ${fullscreen ? 'text-sm' : 'text-base'}`}>
              📅 {cur ? fmtDateLong(cur.time) : '—'}
            </p>
            <span className="text-xs text-muted-foreground tabular-nums">({progressPct} %)</span>
            <div className="flex items-center gap-2 ml-auto">
              {!position ? (
                <>
                  <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => openPosition('buy')}>
                    <ArrowUpCircle className="h-4 w-4" /> Buy
                  </Button>
                  <Button size="sm" className="gap-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => openPosition('sell')}>
                    <ArrowDownCircle className="h-4 w-4" /> Sell
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => cur && closePosition(cur.close, cur.time)}>
                  <XCircle className="h-4 w-4" />
                  Fermer {position.side === 'buy' ? 'Buy' : 'Sell'}
                  <span className={floating >= 0 ? 'text-green-500 font-semibold' : 'text-red-500 font-semibold'}>{fmt$(floating)}</span>
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Solde <b className="text-foreground tabular-nums">{balance.toFixed(2)} $</b></span>
            <span>Équité <b className={`tabular-nums ${equity >= initialBalance ? 'text-green-500' : 'text-red-500'}`}>{equity.toFixed(2)} $</b></span>
            {position && <span>Position <b className={position.side === 'buy' ? 'text-green-500' : 'text-red-500'}>{position.side.toUpperCase()} {lot}</b> @ {position.entryPrice.toFixed(digits)}</span>}
            <span>Trades fermés <b className="text-foreground">{closedTrades}</b></span>
          </div>
          <input
            type="range" min={startIdx} max={endIdx} value={Math.min(Math.max(index, startIdx), endIdx)}
            onChange={(e) => seek(e.target.value)}
            className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
        </div>
      )}

      {/* ==================== GRAPHIQUE ==================== */}
      <div className={`relative w-full rounded-lg border overflow-hidden ${fullscreen ? 'flex-1 min-h-0' : ''}`} style={{ height: chartHeight }}>
        <div className="pointer-events-none absolute left-2 top-2 z-10 leading-tight rounded-md bg-background/85 backdrop-blur-sm border px-2 py-1 shadow-sm">
          <p className="text-xs font-semibold text-primary">
            {symbolName} <span className="text-foreground">{timeframe}</span>
          </p>
          {cur && (
            <p className="text-[11px] tabular-nums text-muted-foreground">
              O {cur.open.toFixed(digits)} H {cur.high.toFixed(digits)} L {cur.low.toFixed(digits)}{' '}
              <span className={cur.close >= cur.open ? 'text-emerald-500' : 'text-red-500'}>C {cur.close.toFixed(digits)}</span>
            </p>
          )}
        </div>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
