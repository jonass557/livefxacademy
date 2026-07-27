import React from 'react';
import { registerOverlay } from 'klinecharts';
import { Button } from '../ui/button';
import {
  Slash, PenLine, MoveUpRight, Minus, SeparatorVertical, Tag,
  Equal, AlignJustify, Square, Type, Eraser,
} from 'lucide-react';

// ---- Constantes partagées entre le graphique live et le replay ----

// Outils de dessin natifs KLineCharts (façon TradingView).
export const DRAW_TOOLS = [
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
export const MAIN_INDICATORS = ['MA', 'EMA', 'BOLL'];
export const SUB_INDICATORS = ['RSI', 'MACD', 'KDJ'];

// Thème sombre assorti au dashboard.
export const CHART_STYLES = {
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
export function ensureRectOverlay() {
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

// Précision des prix déduite des données (5 décimales EUR/USD, 3 pour JPY…).
export function detectPriceDigits(candles) {
  let d = 2;
  for (const c of (candles || []).slice(0, 50)) {
    const s = String(c.close);
    const i = s.indexOf('.');
    if (i >= 0) d = Math.max(d, s.length - i - 1);
  }
  return Math.min(d, 6);
}

// Plein écran : Échap pour sortir, scroll du body bloqué pendant l'affichage.
export function useFullscreen() {
  const [fullscreen, setFullscreen] = React.useState(false);
  React.useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [fullscreen]);
  return [fullscreen, setFullscreen];
}

// Toolbar verticale d'outils de dessin (colonne gauche, façon TradingView).
export function DrawingToolbar({ chartRef }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-1 self-start">
      {DRAW_TOOLS.map(({ name, label, Icon }) => (
        <Button
          key={name} size="icon" variant="ghost" className="h-8 w-8" title={label}
          onClick={() => chartRef.current?.createOverlay({ name, groupId: 'draw' })}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
      <div className="border-t my-1" />
      <Button
        size="icon" variant="ghost" className="h-8 w-8" title="Effacer les dessins"
        onClick={() => chartRef.current?.removeOverlay({ groupId: 'draw' })}
      >
        <Eraser className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

// Rangée de boutons d'activation des indicateurs.
export function IndicatorButtons({ chartRef, active, setActive, panesRef }) {
  const toggle = (name) => {
    const chart = chartRef.current;
    if (!chart) return;
    const isMain = MAIN_INDICATORS.includes(name);
    setActive((prev) => {
      const on = !prev[name];
      if (on) {
        const paneId = isMain
          ? (chart.createIndicator(name, true, { id: 'candle_pane' }), 'candle_pane')
          : chart.createIndicator(name);
        panesRef.current[name] = paneId;
      } else {
        chart.removeIndicator(panesRef.current[name], name);
        delete panesRef.current[name];
      }
      return { ...prev, [name]: on };
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">Indicateurs :</span>
      {[...MAIN_INDICATORS, ...SUB_INDICATORS].map((name) => (
        <Button
          key={name} size="sm" variant={active[name] ? 'default' : 'outline'}
          className="h-7 px-2 text-xs" onClick={() => toggle(name)}
        >
          {name}
        </Button>
      ))}
    </div>
  );
}
