import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import api from '../lib/api';
import ReplayChart from '../components/backtest/ReplayChart';
import { Dropdown } from '../components/backtest/chartShared';
import {
  Film, BarChart3, ChevronDown, CalendarRange, Coins, LineChart, Wallet,
} from 'lucide-react';

const toInputDate = (d) => d.toISOString().slice(0, 10);
const fmtMoney = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

const INITIAL_BALANCE = 10000; // solde initial fixe du simulateur
const LOTS = [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];
const CATEGORY_LABELS = { forex: 'Forex', metal: 'Métaux', indice: 'Indices', crypto: 'Crypto' };

// Bouton de la barre de réglages (libellé + valeur + chevron).
// Sur mobile il occupe toute la largeur de sa cellule de grille ; la valeur est
// tronquée pour que les périodes longues ne débordent pas de l'écran.
function PickerButton({ icon: Icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-1.5 rounded-lg border bg-card px-2.5 py-2 text-sm hover:bg-muted transition-colors sm:w-auto sm:py-1.5"
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" />}
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate text-left font-semibold sm:flex-none">{value}</span>
      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
    </button>
  );
}

// Sélecteur de paire par catégorie (Forex, Métaux, Indices, Crypto).
function PairPicker({ symbols, symbol, onSelect }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState(null);
  const current = symbols.find((s) => s.symbol === symbol);
  const categories = useMemo(() => {
    const out = [];
    for (const s of symbols) { const c = s.category || 'forex'; if (!out.includes(c)) out.push(c); }
    return out;
  }, [symbols]);
  const activeCat = cat || current?.category || categories[0];
  return (
    <Dropdown
      open={open} setOpen={setOpen} width="w-72"
      trigger={<PickerButton icon={LineChart} label="Paire" value={current?.name || '—'} onClick={() => setOpen((o) => !o)} />}
    >
      <div className="p-2 space-y-2">
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <Button key={c} size="sm" variant={activeCat === c ? 'default' : 'ghost'} className="h-6 px-2 text-xs" onClick={() => setCat(c)}>
              {CATEGORY_LABELS[c] || c}
            </Button>
          ))}
        </div>
        <div className="max-h-52 overflow-y-auto">
          {symbols.filter((s) => (s.category || 'forex') === activeCat).map((s) => (
            <button
              key={s.symbol}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted ${s.symbol === symbol ? 'bg-muted font-medium' : ''}`}
              onClick={() => { onSelect(s.symbol); setOpen(false); }}
            >
              {s.name}
              {s.symbol === symbol && <span className="text-primary text-xs">●</span>}
            </button>
          ))}
        </div>
      </div>
    </Dropdown>
  );
}

// Sélecteur générique en grille (timeframes, lots…).
function GridPicker({ icon, label, value, options, onSelect, width = 'w-56' }) {
  const [open, setOpen] = useState(false);
  return (
    <Dropdown
      open={open} setOpen={setOpen} width={width}
      trigger={<PickerButton icon={icon} label={label} value={value} onClick={() => setOpen((o) => !o)} />}
    >
      <div className="p-2 flex flex-wrap gap-1">
        {options.map((o) => (
          <Button
            key={o.key} size="sm" variant={o.active ? 'default' : 'outline'} className="h-7 px-2.5 text-xs"
            onClick={() => { onSelect(o.key); setOpen(false); }}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </Dropdown>
  );
}

// Sélecteur de période (dates de début et de fin, délimitées sur le graphique).
function PeriodPicker({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false);
  const label = `${new Date(startDate).toLocaleDateString('fr-FR')} → ${new Date(endDate).toLocaleDateString('fr-FR')}`;
  const setPreset = (days) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
    onChange(toInputDate(start), toInputDate(end));
  };
  return (
    <Dropdown
      open={open} setOpen={setOpen} width="w-64"
      trigger={<PickerButton icon={CalendarRange} label="Période" value={label} onClick={() => setOpen((o) => !o)} />}
    >
      <div className="p-2 space-y-2">
        <div className="flex flex-wrap gap-1">
          {[{ d: 30, l: '1 mois' }, { d: 90, l: '3 mois' }, { d: 180, l: '6 mois' }, { d: 365, l: '1 an' }].map((p) => (
            <Button key={p.d} size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setPreset(p.d)}>
              {p.l}
            </Button>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Début</label>
          <input
            type="date" value={startDate} max={endDate}
            onChange={(e) => onChange(e.target.value, endDate)}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
          <label className="text-xs text-muted-foreground">Fin</label>
          <input
            type="date" value={endDate} min={startDate} max={toInputDate(new Date())}
            onChange={(e) => onChange(startDate, e.target.value)}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
      </div>
    </Dropdown>
  );
}

/**
 * Studio de backtesting manuel : le trader choisit la paire (par catégorie),
 * le timeframe, la période (délimitée sur le graphique) et le lot, puis
 * clique sur Replay. Le graphique rejoue la période bougie par bougie — de
 * la date de début à la date de fin — et le trader prend LUI-MÊME ses
 * positions Buy/Sell pour vérifier sa stratégie. Aucune position automatique.
 * Solde initial : 10 000 $.
 */
const Backtesting = () => {
  const [meta, setMeta] = useState(null);
  const [candles, setCandles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replaySignal, setReplaySignal] = useState(0); // incrémenté à chaque clic sur Replay

  const [form, setForm] = useState(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 90 * 24 * 3600 * 1000);
    return {
      provider: 'deriv',
      symbol: 'frxEURUSD',
      timeframe: 'H1',
      start_date: toInputDate(start),
      end_date: toInputDate(end),
      position_size: 0.1,
    };
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const provider = useMemo(() => meta?.providers?.find((p) => p.name === form.provider), [meta, form.provider]);
  const symbols = provider?.symbols || [];
  const currentSymbol = symbols.find((s) => s.symbol === form.symbol);

  useEffect(() => {
    api.get('/backtests/meta').then((r) => setMeta(r.data)).catch(() => toast.error('Impossible de charger les métadonnées'));
  }, []);

  // Charge les bougies de la période délimitée (avec marge de contexte).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/backtests/candles', {
      params: {
        provider: form.provider, symbol: form.symbol, timeframe: form.timeframe,
        start_date: form.start_date, end_date: form.end_date,
      },
    })
      .then((r) => { if (!cancelled) setCandles(r.data.candles); })
      .catch((err) => {
        if (!cancelled) { setCandles(null); toast.error(err.response?.data?.message || 'Données indisponibles'); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [form.provider, form.symbol, form.timeframe, form.start_date, form.end_date]);

  const periodBounds = useMemo(() => ({
    start: Math.floor(new Date(form.start_date).getTime() / 1000),
    end: Math.floor(new Date(form.end_date + 'T23:59:59').getTime() / 1000),
  }), [form.start_date, form.end_date]);

  return (
    <div className="space-y-3">
      {/* ==================== EN-TÊTE ==================== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 sm:text-2xl">
            <BarChart3 className="h-5 w-5 text-primary sm:h-6 sm:w-6" /> Backtesting
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Délimitez la période, choisissez la paire, le timeframe et le lot, puis cliquez sur Replay et prenez vos positions Buy/Sell.
          </p>
        </div>
        {/* Solde initial bien visible */}
        <div className="flex items-center gap-2 rounded-xl border bg-gradient-to-r from-primary/10 to-purple-500/10 px-3 py-1.5 sm:px-4 sm:py-2">
          <Wallet className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          <div className="leading-tight">
            <p className="text-[10px] uppercase text-muted-foreground sm:text-[11px]">Solde initial</p>
            <p className="text-base font-bold tabular-nums sm:text-lg">{fmtMoney(INITIAL_BALANCE)} $</p>
          </div>
        </div>
      </div>

      {/* ==================== BARRE DE RÉGLAGES ==================== */}
      {/* Mobile : grille 2 colonnes (la période prend toute la largeur) ;
          à partir de sm on retrouve la barre sur une seule ligne. */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border bg-card/60 p-2 sm:flex sm:flex-wrap sm:items-center">
        <PairPicker symbols={symbols} symbol={form.symbol} onSelect={(s) => set('symbol', s)} />
        <GridPicker
          icon={BarChart3} label="TF" value={form.timeframe} width="w-52"
          options={(meta?.timeframes || []).map((t) => ({ key: t.key, label: t.key, active: t.key === form.timeframe }))}
          onSelect={(t) => set('timeframe', t)}
        />
        <div className="col-span-2 sm:col-auto">
          <PeriodPicker
            startDate={form.start_date} endDate={form.end_date}
            onChange={(s, e) => setForm((f) => ({ ...f, start_date: s, end_date: e }))}
          />
        </div>
        <GridPicker
          icon={Coins} label="Lot" value={form.position_size} width="w-52"
          options={LOTS.map((l) => ({ key: l, label: String(l), active: l === Number(form.position_size) }))}
          onSelect={(l) => set('position_size', l)}
        />
        <Button
          onClick={() => setReplaySignal((n) => n + 1)}
          disabled={loading || !candles?.length}
          className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 sm:ml-auto"
        >
          <Film className="h-4 w-4" /> Replay
        </Button>
      </div>

      {/* ==================== GRAPHIQUE / REPLAY MANUEL ==================== */}
      <ReplayChart
        candles={candles}
        symbolName={currentSymbol?.name}
        timeframe={form.timeframe}
        periodBounds={periodBounds}
        pip={currentSymbol?.pip || 0.0001}
        lot={Number(form.position_size)}
        initialBalance={INITIAL_BALANCE}
        loading={loading}
        replaySignal={replaySignal}
      />
    </div>
  );
};

export default Backtesting;
