import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import api from '../lib/api';
import ReplayChart from '../components/backtest/ReplayChart';
import { Dropdown } from '../components/backtest/chartShared';
import {
  Play, Loader2, BarChart3, ChevronDown, CalendarRange, Coins, LineChart,
  TrendingUp, TrendingDown, X,
} from 'lucide-react';

// ---- Helpers d'affichage ----
export const fmtMoney = (n) => (n == null ? '—' : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 }));
export const fmtPct = (n) => (n == null ? '—' : `${Number(n).toFixed(2)} %`);
export const fmtDate = (t) => new Date(t * 1000).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const toInputDate = (d) => d.toISOString().slice(0, 10);

export const CLOSE_REASONS = { sl: 'Stop Loss', tp: 'Take Profit', trailing: 'Trailing', signal: 'Signal', end: 'Fin de période' };

const INITIAL_BALANCE = 10000; // solde fixe demandé
const LOTS = [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];
const CATEGORY_LABELS = { forex: 'Forex', metal: 'Métaux', indice: 'Indices', crypto: 'Crypto' };

// Bouton de la barre de réglages (libellé + valeur + chevron).
function PickerButton({ icon: Icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-sm hover:bg-muted transition-colors"
    >
      {Icon && <Icon className="h-4 w-4 text-primary" />}
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
      <ChevronDown className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}

// Sélecteur de paire par catégorie.
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

// Sélecteur générique en grille (timeframes, lots, stratégies…).
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

// Sélecteur de période (dates de début et de fin).
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
 * Studio de backtesting unifié : une barre de réglages en haut (paire par
 * catégorie, timeframe, période délimitée sur le graphique, lot, stratégie),
 * le graphique en vue d'ensemble dessous, et le bouton Lecture qui lance le
 * backtest puis le replay. Solde fixe : 10 000 $.
 */
const Backtesting = () => {
  const [meta, setMeta] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);       // bougies de l'aperçu (période délimitée)
  const [previewLoading, setPreviewLoading] = useState(false);

  const [form, setForm] = useState(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 90 * 24 * 3600 * 1000);
    return {
      provider: 'deriv',
      symbol: 'frxEURUSD',
      timeframe: 'H1',
      start_date: toInputDate(start),
      end_date: toInputDate(end),
      template: 'ema_cross',
      parameters: { fast: 9, slow: 21 },
      position_size: 0.1,
    };
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const provider = useMemo(() => meta?.providers?.find((p) => p.name === form.provider), [meta, form.provider]);
  const symbols = provider?.symbols || [];
  const symbolName = symbols.find((s) => s.symbol === form.symbol)?.name;
  const template = useMemo(() => meta?.templates?.find((t) => t.key === form.template), [meta, form.template]);

  useEffect(() => {
    api.get('/backtests/meta').then((r) => setMeta(r.data)).catch(() => toast.error('Impossible de charger les métadonnées'));
  }, []);

  // ---- Aperçu : charge les bougies de la période délimitée (avant Lecture) ----
  useEffect(() => {
    if (result) return; // un backtest est affiché, pas d'aperçu
    let cancelled = false;
    setPreviewLoading(true);
    api.get('/backtests/candles', {
      params: {
        provider: form.provider, symbol: form.symbol, timeframe: form.timeframe,
        start_date: form.start_date, end_date: form.end_date,
      },
    })
      .then((r) => { if (!cancelled) setPreview(r.data.candles); })
      .catch(() => { if (!cancelled) setPreview(null); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.provider, form.symbol, form.timeframe, form.start_date, form.end_date, result]);

  const onTemplateChange = (key) => {
    const t = meta?.templates?.find((x) => x.key === key);
    setForm((f) => ({ ...f, template: key, parameters: { ...(t?.parameters || {}) } }));
  };

  // ---- Lecture : lance le backtest puis affiche le replay ----
  const runBacktest = async () => {
    setRunning(true);
    try {
      const { data } = await api.post('/backtests/run', {
        provider: form.provider,
        symbol: form.symbol,
        timeframe: form.timeframe,
        start_date: form.start_date,
        end_date: form.end_date,
        strategy: {
          template: form.template,
          parameters: form.parameters,
          risk: { direction: 'both', sl_pips: 50, tp_pips: 100, trailing_pips: 0 },
        },
        config: {
          initial_balance: INITIAL_BALANCE,
          position_size_mode: 'lots',
          position_size: Number(form.position_size),
          spread: 1, commission: 0, leverage: 100, max_positions: 1, sl_pips: 50,
        },
      });
      setResult(data);
      toast.success(`Backtest terminé — ${data.stats.total_trades} trades sur ${data.candles_count} bougies`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du backtest');
    } finally {
      setRunning(false);
    }
  };

  const closeResult = () => setResult(null);

  const stats = result?.stats;
  const profitPositive = stats && stats.net_profit >= 0;
  const periodBounds = useMemo(() => ({
    start: Math.floor(new Date(form.start_date).getTime() / 1000),
    end: Math.floor(new Date(form.end_date).getTime() / 1000),
  }), [form.start_date, form.end_date]);

  return (
    <div className="space-y-3">
      {/* ==================== EN-TÊTE ==================== */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Backtesting
          </h2>
          <p className="text-muted-foreground text-sm">
            Délimitez la période, choisissez la paire, le timeframe et le lot, puis cliquez sur Lecture. Solde : {fmtMoney(INITIAL_BALANCE)} $.
          </p>
        </div>
        {result && (
          <Button variant="outline" size="sm" onClick={closeResult} className="gap-1.5">
            <X className="h-4 w-4" /> Fermer le backtest
          </Button>
        )}
      </div>

      {/* ==================== BARRE DE RÉGLAGES ==================== */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/60 p-2">
        <PairPicker symbols={symbols} symbol={form.symbol} onSelect={(s) => { set('symbol', s); setResult(null); }} />
        <GridPicker
          icon={BarChart3} label="TF" value={form.timeframe} width="w-52"
          options={(meta?.timeframes || []).map((t) => ({ key: t.key, label: t.key, active: t.key === form.timeframe }))}
          onSelect={(t) => { set('timeframe', t); setResult(null); }}
        />
        <PeriodPicker
          startDate={form.start_date} endDate={form.end_date}
          onChange={(s, e) => { setForm((f) => ({ ...f, start_date: s, end_date: e })); setResult(null); }}
        />
        <GridPicker
          icon={Coins} label="Lot" value={form.position_size} width="w-52"
          options={LOTS.map((l) => ({ key: l, label: String(l), active: l === Number(form.position_size) }))}
          onSelect={(l) => set('position_size', l)}
        />
        <GridPicker
          icon={LineChart} label="Stratégie" value={template?.label?.split(' ')[0] || form.template} width="w-64"
          options={(meta?.templates || []).filter((t) => t.key !== 'custom').map((t) => ({ key: t.key, label: t.label, active: t.key === form.template }))}
          onSelect={onTemplateChange}
        />
        <Button onClick={runBacktest} disabled={running || !meta} className="gap-2 ml-auto bg-gradient-to-r from-primary to-purple-500 hover:opacity-90">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Analyse en cours…' : 'Lecture'}
        </Button>
      </div>

      {/* ==================== STATS (après un run) ==================== */}
      {result && stats && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/60 p-2 text-sm">
          {profitPositive
            ? <Badge className="bg-green-600 text-white border-transparent gap-1"><TrendingUp className="h-3 w-3" /> +{fmtMoney(stats.net_profit)} $</Badge>
            : <Badge variant="destructive" className="gap-1"><TrendingDown className="h-3 w-3" /> {fmtMoney(stats.net_profit)} $</Badge>}
          <span className="text-muted-foreground">Solde final <b className="text-foreground">{fmtMoney(stats.final_balance)} $</b></span>
          <span className="text-muted-foreground">Trades <b className="text-foreground">{stats.total_trades}</b></span>
          <span className="text-muted-foreground">Réussite <b className="text-foreground">{fmtPct(stats.win_rate)}</b></span>
          <span className="text-muted-foreground">Drawdown <b className="text-orange-500">{fmtPct(stats.max_drawdown_pct)}</b></span>
          <span className="text-muted-foreground">Rendement <b className={profitPositive ? 'text-green-500' : 'text-red-500'}>{fmtPct(stats.total_return_pct)}</b></span>
        </div>
      )}

      {/* ==================== VUE D'ENSEMBLE / REPLAY ==================== */}
      <ReplayChart
        candles={result ? result.candles : preview}
        trades={result?.trades || []}
        equityCurve={result?.equity_curve || []}
        symbolName={result ? result.symbol_name : symbolName}
        timeframe={result ? result.timeframe : form.timeframe}
        periodBounds={periodBounds}
        loading={previewLoading && !result}
        isPreview={!result}
      />
    </div>
  );
};

export default Backtesting;
