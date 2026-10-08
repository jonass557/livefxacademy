import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import api from '../lib/api';
import ReplayChart from '../components/backtest/ReplayChart';
import { Dropdown } from '../components/backtest/chartShared';
import {
  Film, BarChart3, ChevronDown, CalendarRange, Coins, LineChart, Wallet,
} from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';

const toInputDate = (d) => d.toISOString().slice(0, 10);
const fmtMoney = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

const INITIAL_BALANCE = 10000; // solde initial fixe du simulateur
const LOTS = [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];

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
function PairPicker({ symbols, symbol, onSelect, isEn = false }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState(null);
  const current = symbols.find((s) => s.symbol === symbol);
  const categories = useMemo(() => {
    const out = [];
    for (const s of symbols) { const c = s.category || 'forex'; if (!out.includes(c)) out.push(c); }
    return out;
  }, [symbols]);
  const activeCat = cat || current?.category || categories[0];
  const categoryLabels = {
    forex: 'Forex',
    metal: isEn ? 'Metals' : 'Métaux',
    indice: 'Indices',
    crypto: 'Crypto',
  };
  return (
    <Dropdown
      open={open} setOpen={setOpen} width="w-72"
      trigger={<PickerButton icon={LineChart} label={isEn ? 'Pair' : 'Paire'} value={current?.name || '—'} onClick={() => setOpen((o) => !o)} />}
    >
      <div className="p-2 space-y-2">
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <Button key={c} size="sm" variant={activeCat === c ? 'default' : 'ghost'} className="h-6 px-2 text-xs" onClick={() => setCat(c)}>
              {categoryLabels[c] || c}
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
function PeriodPicker({ startDate, endDate, onChange, isEn = false }) {
  const [open, setOpen] = useState(false);
  const label = `${new Date(startDate).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')} → ${new Date(endDate).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}`;
  const setPreset = (days) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
    onChange(toInputDate(start), toInputDate(end));
  };
  return (
    <Dropdown
      open={open} setOpen={setOpen} width="w-64"
      trigger={<PickerButton icon={CalendarRange} label={isEn ? 'Period' : 'Période'} value={label} onClick={() => setOpen((o) => !o)} />}
    >
      <div className="p-2 space-y-2">
        <div className="flex flex-wrap gap-1">
          {[
            { d: 30, l: isEn ? '1 month' : '1 mois' },
            { d: 90, l: isEn ? '3 months' : '3 mois' },
            { d: 180, l: isEn ? '6 months' : '6 mois' },
            { d: 365, l: isEn ? '1 year' : '1 an' },
          ].map((p) => (
            <Button key={p.d} size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setPreset(p.d)}>
              {p.l}
            </Button>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">{isEn ? 'Start' : 'Début'}</label>
          <input
            type="date" value={startDate} max={endDate}
            onChange={(e) => onChange(e.target.value, endDate)}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
          <label className="text-xs text-muted-foreground">{isEn ? 'End' : 'Fin'}</label>
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

  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api.get('/backtests/meta').then((r) => setMeta(r.data)).catch(() => toast.error('Impossible de charger les métadonnées'));
  }, []);

  // Charge les bougies de la période délimitée (avec marge de contexte).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get('/backtests/candles', {
      params: {
        provider: form.provider, symbol: form.symbol, timeframe: form.timeframe,
        start_date: form.start_date, end_date: form.end_date,
      },
    })
      .then((r) => {
        if (!cancelled) {
          setCandles(r.data.candles || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCandles(null);
          const msg = err.response?.data?.message || 'Données indisponibles';
          setError(msg);
          toast.error(msg);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [form.provider, form.symbol, form.timeframe, form.start_date, form.end_date, reloadKey]);

  const { language } = useLanguageStore();
  const isEn = language === 'en';

  const periodBounds = useMemo(() => ({
    start: Math.floor(new Date(form.start_date).getTime() / 1000),
    end: Math.floor(new Date(form.end_date + 'T23:59:59').getTime() / 1000),
  }), [form.start_date, form.end_date]);

  return (
    <div className="h-full w-full flex-1 min-h-0 flex flex-col overflow-hidden space-y-1.5 p-0 sm:p-1">
      {/* ==================== BARRE DE CONFIGURATION ULTRA-COMPACTE (MENUS DÉROULANTS) ==================== */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border bg-card/80 px-2 py-1.5 shadow-xs shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 pr-1.5 border-r border-border/60 shrink-0">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="font-bold text-xs sm:text-sm tracking-tight">{isEn ? 'Backtesting' : 'Backtesting'}</span>
          </div>

          <PairPicker symbols={symbols} symbol={form.symbol} onSelect={(s) => set('symbol', s)} isEn={isEn} />
          <GridPicker
            icon={BarChart3} label="TF" value={form.timeframe} width="w-48"
            options={(meta?.timeframes || []).map((t) => ({ key: t.key, label: t.key, active: t.key === form.timeframe }))}
            onSelect={(t) => set('timeframe', t)}
          />
          <PeriodPicker
            startDate={form.start_date} endDate={form.end_date}
            onChange={(s, e) => setForm((f) => ({ ...f, start_date: s, end_date: e }))}
            isEn={isEn}
          />
          <GridPicker
            icon={Coins} label="Lot" value={form.position_size} width="w-48"
            options={LOTS.map((l) => ({ key: l, label: String(l), active: l === Number(form.position_size) }))}
            onSelect={(l) => set('position_size', l)}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 text-xs font-semibold tabular-nums">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground text-[11px] hidden sm:inline">{isEn ? 'Balance :' : 'Solde :'}</span>
            <span>{fmtMoney(INITIAL_BALANCE)} $</span>
          </div>

          <Button
            size="sm"
            onClick={() => setReplaySignal((n) => n + 1)}
            disabled={loading || !candles?.length}
            className="h-7.5 px-3 gap-1.5 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-xs font-semibold shadow-xs"
          >
            <Film className="h-3.5 w-3.5" /> <span>Replay</span>
          </Button>
        </div>
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
        error={error}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
};

export default Backtesting;
