import React from 'react';
import api, { API_URL } from '../../lib/api';
import { registerOverlay } from 'klinecharts';

const assetUrl = (url) => url ? (url.startsWith('http') ? url : `${API_URL}${url}`) : '';
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
    // Le tooltip OHLC intégré se superposait à notre badge symbole/OHLC :
    // désactivé (nos valeurs sont affichées dans l'entête du graphique).
    tooltip: { showRule: 'none' },
  },
  xAxis: { axisLine: { color: 'rgba(148,163,184,0.3)' }, tickText: { color: '#9ca3af' } },
  yAxis: { size: 72, inside: false, axisLine: { color: 'rgba(148,163,184,0.3)' }, tickText: { color: '#9ca3af' } },
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
// `max-w` empêche le panneau de dépasser l'écran sur téléphone.
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
        <div className={`absolute top-full mt-1 z-30 max-w-[calc(100vw-1.5rem)] rounded-lg border bg-popover text-popover-foreground shadow-lg ${width} ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

// Menu « Outils » : outils de dessin regroupés (remplace la toolbar latérale).
// Sur mobile le bouton et le label sont compactés.
export function DrawToolsMenu({ chartRef }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      trigger={
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setOpen((o) => !o)}>
          <Pencil className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Outils</span> <ChevronDown className="h-3 w-3" />
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
// Sur mobile le bouton et le label sont compactés.
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
          <FunctionSquare className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Indicateurs</span>{count ? ` (${count})` : ''} <ChevronDown className="h-3 w-3" />
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

// Logo de marque fixé dans le coin inférieur gauche (au-dessus de l'axe des temps).
// Le grand filigrane central masquant les chandeliers a été retiré.
export function ChartWatermark() {
  const [logoUrl, setLogoUrl] = React.useState('/logo.png');

  React.useEffect(() => {
    let cancelled = false;
    api.get('/branding').then(({ data }) => {
      if (!cancelled && data?.chart_logo_url) setLogoUrl(assetUrl(data.chart_logo_url));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleImgError = (e) => {
    if (e.target.src !== '/logo.png') {
      e.target.src = '/logo.png';
    }
  };

  return (
    <div className="absolute bottom-6 left-3 pointer-events-none z-20 select-none opacity-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
      <img
        src={logoUrl}
        alt="LivefxTrading"
        className="h-7 sm:h-8 md:h-9 w-auto max-w-[120px] sm:max-w-[140px] object-contain"
        onError={handleImgError}
      />
    </div>
  );
}

// ---- Redimensionnement vertical et horizontal fluide façon MT4 / MT5 & TradingView ----

// Étire ou compresse l'axe des prix Y avec un facteur multiplicateur
export function zoomPriceY(chart, factor = 1.15) {
  if (!chart) return;
  try {
    const pane = chart.getDrawPaneById?.('candle_pane');
    const yAxis = pane?.getAxisComponent?.();
    if (!yAxis) return;
    const range = yAxis.getRange?.();
    if (!range || !range.range) return;

    const newRange = Math.max(range.range * factor, range.range * 0.02);
    const difRange = (newRange - range.range) / 2;
    const newFrom = range.from - difRange;
    const newTo = range.to + difRange;
    const newRealFrom = yAxis.convertToRealValue(newFrom);
    const newRealTo = yAxis.convertToRealValue(newTo);

    yAxis.setRange({
      from: newFrom,
      to: newTo,
      range: newRange,
      realFrom: newRealFrom,
      realTo: newRealTo,
      realRange: newRealTo - newRealFrom,
    });
    chart.adjustPaneViewport?.(false, true, true, true);
  } catch (err) {
    console.warn('zoomPriceY error:', err);
  }
}

// Réinitialise l'axe des prix Y à l'échelle automatique
export function resetPriceY(chart) {
  if (!chart) return;
  try {
    const pane = chart.getDrawPaneById?.('candle_pane');
    const yAxis = pane?.getAxisComponent?.();
    if (!yAxis) return;
    yAxis.setAutoCalcTickFlag?.(true);
    chart.adjustPaneViewport?.(false, true, true, true);
  } catch (err) {
    console.warn('resetPriceY error:', err);
  }
}

// Attache des écouteurs Pointer / Touch / Wheel sur le conteneur de l'axe des prix Y
// pour un étirement vertical fluide, fiable et instantané sur tous les appareils (PC, mobile, tactile)
export function setupYAxisDrag(chart) {
  if (!chart) return () => {};

  let cleanupListeners = () => {};

  const initDrag = () => {
    try {
      const yAxisDom = chart.getDom?.('candle_pane', 'yAxis');
      if (!yAxisDom) return;

      yAxisDom.style.touchAction = 'none';
      yAxisDom.style.cursor = 'ns-resize';
      yAxisDom.style.userSelect = 'none';
      yAxisDom.style.webkitUserSelect = 'none';

      let isDragging = false;
      let startY = 0;
      let initialRange = null;

      const onPointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        const pane = chart.getDrawPaneById?.('candle_pane');
        const yAxis = pane?.getAxisComponent?.();
        if (!yAxis) return;

        const currentRange = yAxis.getRange?.();
        if (!currentRange || !currentRange.range) return;

        isDragging = true;
        startY = e.clientY;
        initialRange = { ...currentRange };

        // Empêche le comportement natif défectueux de KLineCharts
        e.preventDefault();
        e.stopPropagation();

        try {
          e.target?.setPointerCapture?.(e.pointerId);
        } catch (_) {}

        const onPointerMove = (ev) => {
          if (!isDragging || !initialRange) return;
          ev.preventDefault();
          ev.stopPropagation();

          const deltaY = ev.clientY - startY;
          // Glissement vers le HAUT (deltaY < 0) : agrandit les bougies verticalement (réduit le range de prix)
          // Glissement vers le BAS (deltaY > 0) : compresse les bougies verticalement (augmente le range de prix)
          const scale = Math.exp(deltaY * 0.005);
          const newRange = Math.max(initialRange.range * scale, initialRange.range * 0.02);
          const difRange = (newRange - initialRange.range) / 2;
          const newFrom = initialRange.from - difRange;
          const newTo = initialRange.to + difRange;
          const newRealFrom = yAxis.convertToRealValue(newFrom);
          const newRealTo = yAxis.convertToRealValue(newTo);

          yAxis.setRange({
            from: newFrom,
            to: newTo,
            range: newRange,
            realFrom: newRealFrom,
            realTo: newRealTo,
            realRange: newRealTo - newRealFrom,
          });
          chart.adjustPaneViewport?.(false, true, true, true);
        };

        const onPointerUp = (ev) => {
          if (!isDragging) return;
          isDragging = false;
          initialRange = null;
          ev.stopPropagation();
          try {
            ev.target?.releasePointerCapture?.(ev.pointerId);
          } catch (_) {}
          window.removeEventListener('pointermove', onPointerMove, true);
          window.removeEventListener('pointerup', onPointerUp, true);
          window.removeEventListener('pointercancel', onPointerUp, true);
        };

        window.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
        window.addEventListener('pointerup', onPointerUp, { capture: true });
        window.addEventListener('pointercancel', onPointerUp, { capture: true });
      };

      const onDblClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetPriceY(chart);
      };

      const onWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const factor = e.deltaY < 0 ? 0.90 : 1.10;
        zoomPriceY(chart, factor);
      };

      yAxisDom.addEventListener('pointerdown', onPointerDown, { passive: false });
      yAxisDom.addEventListener('dblclick', onDblClick);
      yAxisDom.addEventListener('wheel', onWheel, { passive: false });

      cleanupListeners = () => {
        yAxisDom.removeEventListener('pointerdown', onPointerDown);
        yAxisDom.removeEventListener('dblclick', onDblClick);
        yAxisDom.removeEventListener('wheel', onWheel);
      };
    } catch (err) {
      console.warn('setupYAxisDrag error:', err);
    }
  };

  const timer = setTimeout(initDrag, 50);

  return () => {
    clearTimeout(timer);
    cleanupListeners();
  };
}

// Configuration de KLineCharts pour une flexibilité et fluidité totale façon MT4 / MT5 :
// - Étirement vertical de l'axe des prix (glisser sur l'axe Y à droite pour compresser/étirer les bougies)
// - Étirement horizontal de l'axe des temps (glisser sur l'axe X)
// - Zoom/dézoom molette et pinch tactile
export function configureMT4Chart(chart) {
  if (!chart) return () => {};
  try {
    chart.setZoomEnabled?.(true);
    chart.setScrollEnabled?.(true);
    chart.setPaneOptions?.({
      id: 'candle_pane',
      axisOptions: {
        scrollZoomEnabled: true,
      },
      gap: { top: 0.12, bottom: 0.08 },
    });
    chart.setPaneOptions?.({
      id: 'x_axis',
      axisOptions: {
        scrollZoomEnabled: true,
      },
    });
  } catch (e) {
    console.warn('configureMT4Chart:', e);
  }

  return setupYAxisDrag(chart);
}

// Boutons de zoom rapide façon MT4/MT5 intégrables dans la toolbar (+, -, ↕+, ↕-, Auto)
export function ChartZoomControls({ chartRef, className = '' }) {
  const handleZoomIn = () => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      const space = chart.getBarSpace?.() || 6;
      chart.setBarSpace?.(Math.min(space + 2, 45));
    } catch (_) {
      chart.zoomAtCoordinate?.(0.25);
    }
  };

  const handleZoomOut = () => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      const space = chart.getBarSpace?.() || 6;
      chart.setBarSpace?.(Math.max(space - 2, 2));
    } catch (_) {
      chart.zoomAtCoordinate?.(-0.25);
    }
  };

  const handleStretchY = () => {
    zoomPriceY(chartRef.current, 0.85);
  };

  const handleCompressY = () => {
    zoomPriceY(chartRef.current, 1.18);
  };

  const handleReset = () => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      chart.setBarSpace?.(6);
      chart.scrollToRealTime?.();
      resetPriceY(chart);
    } catch (_) {}
  };

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-md border bg-card/90 p-0.5 shadow-sm ${className}`}>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 hover:bg-muted"
        onClick={handleZoomIn}
        title="Zoom horizontal avant (+)"
      >
        <span className="font-bold text-xs leading-none">+</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 hover:bg-muted"
        onClick={handleZoomOut}
        title="Zoom horizontal arrière (−)"
      >
        <span className="font-bold text-xs leading-none">−</span>
      </Button>
      <div className="h-3 w-[1px] bg-border mx-0.5" />
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1 text-[11px] font-semibold hover:bg-muted"
        onClick={handleStretchY}
        title="Étirer verticalement l'axe des prix (bougies plus hautes)"
      >
        ↕+
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1 text-[11px] font-semibold hover:bg-muted"
        onClick={handleCompressY}
        title="Compresser verticalement l'axe des prix (bougies plus plates)"
      >
        ↕−
      </Button>
      <div className="h-3 w-[1px] bg-border mx-0.5" />
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1.5 text-[10px] font-semibold hover:bg-muted"
        onClick={handleReset}
        title="Échelle automatique X et Y / Réinitialiser"
      >
        Auto
      </Button>
    </div>
  );
}
