import React from 'react';
import { registerOverlay } from 'klinecharts';
import { Button } from '../ui/button';
import {
  Slash, PenLine, MoveUpRight, Minus, SeparatorVertical, Tag,
  Equal, AlignJustify, Square, Type, Eraser, ChevronDown, Pencil, FunctionSquare,
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

// Menu déroulant générique avec fermeture au clic extérieur.
export function Dropdown({ trigger, open, setOpen, children, align = 'left', width = 'w-56' }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, setOpen]);
  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div className={`absolute top-full mt-1 z-30 rounded-lg border bg-popover text-popover-foreground shadow-lg ${width} ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

// Menu « Outils » : outils de dessin regroupés (remplace la toolbar latérale).
export function DrawToolsMenu({ chartRef }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      trigger={
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setOpen((o) => !o)}>
          <Pencil className="h-3.5 w-3.5" /> Outils <ChevronDown className="h-3 w-3" />
        </Button>
      }
    >
      <div className="p-1 max-h-72 overflow-y-auto">
        {DRAW_TOOLS.map(({ name, label, Icon }) => (
          <button
            key={name}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            onClick={() => { chartRef.current?.createOverlay({ name, groupId: 'draw' }); setOpen(false); }}
          >
            <Icon className="h-4 w-4 text-muted-foreground" /> {label}
          </button>
        ))}
        <div className="border-t my-1" />
        <button
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-muted"
          onClick={() => { chartRef.current?.removeOverlay({ groupId: 'draw' }); setOpen(false); }}
        >
          <Eraser className="h-4 w-4" /> Effacer les dessins
        </button>
      </div>
    </Dropdown>
  );
}

// Menu « Indicateurs » : activation/désactivation par cases cochables.
export function IndicatorsMenu({ chartRef, active, setActive, panesRef }) {
  const [open, setOpen] = React.useState(false);
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
  const count = Object.values(active).filter(Boolean).length;
  const Row = ({ name }) => (
    <button
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
      onClick={() => toggle(name)}
    >
      <span>{name}</span>
      <span className={`h-3.5 w-3.5 rounded-sm border ${active[name] ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`} />
    </button>
  );
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      width="w-44"
      trigger={
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setOpen((o) => !o)}>
          <FunctionSquare className="h-3.5 w-3.5" /> Indicateurs{count ? ` (${count})` : ''} <ChevronDown className="h-3 w-3" />
        </Button>
      }
    >
      <div className="p-1">
        <p className="px-2 py-1 text-[11px] uppercase text-muted-foreground">Sur le prix</p>
        {MAIN_INDICATORS.map((n) => <Row key={n} name={n} />)}
        <p className="px-2 py-1 text-[11px] uppercase text-muted-foreground">Sous-graphique</p>
        {SUB_INDICATORS.map((n) => <Row key={n} name={n} />)}
      </div>
    </Dropdown>
  );
}

// Sélecteur de marché (paires par catégorie) + unité de temps, dans l'entête du graphique.
const CATEGORY_LABELS = { forex: 'Forex', metal: 'Métaux', indice: 'Indices', crypto: 'Crypto' };

export function MarketPicker({ symbols, timeframes, symbol, timeframe, onSelectSymbol, onSelectTimeframe }) {
  const [open, setOpen] = React.useState(false);
  const [cat, setCat] = React.useState(null);
  const current = (symbols || []).find((s) => s.symbol === symbol);
  const categories = React.useMemo(() => {
    const out = [];
    for (const s of symbols || []) {
      const c = s.category || 'forex';
      if (!out.includes(c)) out.push(c);
    }
    return out;
  }, [symbols]);
  const activeCat = cat || current?.category || categories[0];
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      width="w-72"
      trigger={
        <button
          className="pointer-events-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted/70"
          onClick={() => setOpen((o) => !o)}
          title="Changer de marché / unité de temps"
        >
          <span className="text-xs font-semibold text-primary">{current?.name || symbol}</span>
          <span className="text-xs font-semibold">{timeframe}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      }
    >
      <div className="p-2 space-y-2">
        {/* Onglets catégories */}
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <Button
              key={c} size="sm" variant={activeCat === c ? 'default' : 'ghost'}
              className="h-6 px-2 text-xs" onClick={() => setCat(c)}
            >
              {CATEGORY_LABELS[c] || c}
            </Button>
          ))}
        </div>
        {/* Paires de la catégorie */}
        <div className="max-h-52 overflow-y-auto">
          {(symbols || []).filter((s) => (s.category || 'forex') === activeCat).map((s) => (
            <button
              key={s.symbol}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted ${s.symbol === symbol ? 'bg-muted font-medium' : ''}`}
              onClick={() => { onSelectSymbol(s.symbol); setOpen(false); }}
            >
              {s.name}
              {s.symbol === symbol && <span className="text-primary text-xs">●</span>}
            </button>
          ))}
        </div>
        {/* Unités de temps */}
        <div className="border-t pt-2">
          <p className="px-1 pb-1 text-[11px] uppercase text-muted-foreground">Unité de temps</p>
          <div className="flex flex-wrap gap-1">
            {(timeframes || []).map((t) => (
              <Button
                key={t.key} size="sm" variant={timeframe === t.key ? 'default' : 'outline'}
                className="h-6 px-2 text-xs"
                onClick={() => { onSelectTimeframe(t.key); setOpen(false); }}
              >
                {t.key}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Dropdown>
  );
}
