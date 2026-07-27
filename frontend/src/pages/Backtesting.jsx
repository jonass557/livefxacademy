import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, AreaSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { toast } from 'sonner';
import api from '../lib/api';
import ReplayChart from '../components/backtest/ReplayChart';
import { Play, Loader2, History, Trash2, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

// ---- Helpers d'affichage ----
const fmtMoney = (n) => (n == null ? '—' : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 }));
const fmtPct = (n) => (n == null ? '—' : `${Number(n).toFixed(2)} %`);
const fmtDate = (t) => new Date(t * 1000).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const toInputDate = (d) => d.toISOString().slice(0, 10);

const CLOSE_REASONS = { sl: 'Stop Loss', tp: 'Take Profit', trailing: 'Trailing', signal: 'Signal', end: 'Fin de période' };

// Courbe d'équité (lightweight-charts v5).
function EquityChart({ points }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !points?.length) return;
    const chart = createChart(ref.current, {
      height: 320,
      layout: { background: { color: 'transparent' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: 'rgba(148,163,184,0.1)' }, horzLines: { color: 'rgba(148,163,184,0.1)' } },
      timeScale: { timeVisible: true, secondsVisible: false },
      autoSize: true,
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: '#22c55e',
      topColor: 'rgba(34,197,94,0.3)',
      bottomColor: 'rgba(34,197,94,0.02)',
      lineWidth: 2,
    });
    series.setData(points.map((p) => ({ time: p.t, value: p.equity })));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [points]);
  return <div ref={ref} className="w-full" />;
}

// Carte de statistique.
function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${accent || ''}`}>{value}</p>
    </div>
  );
}

const Backtesting = () => {
  const [meta, setMeta] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // ---- Formulaire ----
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
      direction: 'both',
      sl_pips: 50,
      tp_pips: 100,
      trailing_pips: 0,
      initial_balance: 10000,
      position_size_mode: 'lots',
      position_size: 0.1,
      spread: 1,
      commission: 0,
      leverage: 100,
      max_positions: 1,
    };
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setParam = (k, v) => setForm((f) => ({ ...f, parameters: { ...f.parameters, [k]: Number(v) } }));

  const provider = useMemo(() => meta?.providers?.find((p) => p.name === form.provider), [meta, form.provider]);
  const template = useMemo(() => meta?.templates?.find((t) => t.key === form.template), [meta, form.template]);

  useEffect(() => {
    api.get('/backtests/meta').then((r) => setMeta(r.data)).catch(() => toast.error('Impossible de charger les métadonnées'));
    loadHistory();
  }, []);

  const loadHistory = () => api.get('/backtests').then((r) => setHistory(r.data)).catch(() => {});

  // Quand on change de template, recharger ses paramètres par défaut.
  const onTemplateChange = (key) => {
    const t = meta?.templates?.find((x) => x.key === key);
    setForm((f) => ({ ...f, template: key, parameters: { ...(t?.parameters || {}) } }));
  };

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
          risk: {
            direction: form.direction,
            sl_pips: Number(form.sl_pips) || 0,
            tp_pips: Number(form.tp_pips) || 0,
            trailing_pips: Number(form.trailing_pips) || 0,
          },
        },
        config: {
          initial_balance: Number(form.initial_balance),
          position_size_mode: form.position_size_mode,
          position_size: Number(form.position_size),
          spread: Number(form.spread) || 0,
          commission: Number(form.commission) || 0,
          leverage: Number(form.leverage) || 1,
          max_positions: Number(form.max_positions) || 1,
          sl_pips: Number(form.sl_pips) || 0,
        },
      });
      setResult(data);
      loadHistory();
      toast.success(`Backtest terminé — ${data.stats.total_trades} trades sur ${data.candles_count} bougies`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du backtest');
    } finally {
      setRunning(false);
    }
  };

  const loadBacktest = async (id) => {
    try {
      const { data } = await api.get(`/backtests/${id}`);
      setResult(data); // affiche stats/trades tout de suite
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Les bougies ne sont pas stockées en base : on les re-télécharge pour le graphique/replay.
      try {
        const { data: c } = await api.get(`/backtests/${id}/candles`);
        setResult((r) => (r && r.id === data.id ? { ...r, candles: c.candles } : r));
      } catch {
        toast.error('Bougies indisponibles pour ce backtest (graphique désactivé)');
      }
    } catch { toast.error('Impossible de charger ce backtest'); }
  };

  const deleteBacktest = async (id) => {
    try {
      await api.delete(`/backtests/${id}`);
      setHistory((h) => h.filter((b) => b.id !== id));
      toast.success('Backtest supprimé');
    } catch { toast.error('Suppression impossible'); }
  };

  const stats = result?.stats;
  const profitPositive = stats && stats.net_profit >= 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Backtesting</h2>
        <p className="text-muted-foreground text-sm">Testez vos stratégies sur des données historiques réelles (Forex via Deriv).</p>
      </div>

      {/* ==================== FORMULAIRE ==================== */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Marché, période, stratégie et gestion du risque</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Marché */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label>Fournisseur</Label>
              <Select value={form.provider} onChange={(e) => set('provider', e.target.value)}>
                {(meta?.providers || []).map((p) => (
                  <option key={p.name} value={p.name} disabled={!p.available}>{p.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Paire</Label>
              <Select value={form.symbol} onChange={(e) => set('symbol', e.target.value)}>
                {(provider?.symbols || []).map((s) => (
                  <option key={s.symbol} value={s.symbol}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unité de temps</Label>
              <Select value={form.timeframe} onChange={(e) => set('timeframe', e.target.value)}>
                {(meta?.timeframes || []).map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Début</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fin</Label>
              <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>

          {/* Stratégie */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label>Stratégie</Label>
              <Select value={form.template} onChange={(e) => onTemplateChange(e.target.value)}>
                {(meta?.templates || []).filter((t) => t.key !== 'custom').map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </Select>
            </div>
            {Object.entries(template?.key === form.template ? form.parameters : {}).map(([k, v]) => (
              <div key={k} className="space-y-1.5">
                <Label className="capitalize">{k}</Label>
                <Input type="number" value={v} onChange={(e) => setParam(k, e.target.value)} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select value={form.direction} onChange={(e) => set('direction', e.target.value)}>
                <option value="both">Achat & Vente</option>
                <option value="long">Achat uniquement</option>
                <option value="short">Vente uniquement</option>
              </Select>
            </div>
          </div>

          {/* Risque + compte */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label>Stop Loss (pips)</Label>
              <Input type="number" value={form.sl_pips} onChange={(e) => set('sl_pips', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Take Profit (pips)</Label>
              <Input type="number" value={form.tp_pips} onChange={(e) => set('tp_pips', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Trailing Stop (pips)</Label>
              <Input type="number" value={form.trailing_pips} onChange={(e) => set('trailing_pips', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Solde initial ($)</Label>
              <Input type="number" value={form.initial_balance} onChange={(e) => set('initial_balance', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Levier</Label>
              <Select value={form.leverage} onChange={(e) => set('leverage', e.target.value)}>
                {[1, 10, 30, 50, 100, 200, 500].map((l) => <option key={l} value={l}>1:{l}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mode de taille</Label>
              <Select value={form.position_size_mode} onChange={(e) => set('position_size_mode', e.target.value)}>
                <option value="lots">Lots fixes</option>
                <option value="percent">% du capital (risque)</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{form.position_size_mode === 'lots' ? 'Taille (lots)' : 'Risque (%)'}</Label>
              <Input type="number" step="0.01" value={form.position_size} onChange={(e) => set('position_size', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Spread (pips)</Label>
              <Input type="number" step="0.1" value={form.spread} onChange={(e) => set('spread', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Commission ($/lot)</Label>
              <Input type="number" step="0.1" value={form.commission} onChange={(e) => set('commission', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Positions max</Label>
              <Input type="number" min="1" value={form.max_positions} onChange={(e) => set('max_positions', e.target.value)} />
            </div>
          </div>

          <Button onClick={runBacktest} disabled={running || !meta} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? 'Backtest en cours…' : 'Lancer le backtest'}
          </Button>
        </CardContent>
      </Card>

      {/* ==================== RÉSULTATS ==================== */}
      {result && stats && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Résultats — {result.symbol_name} {result.timeframe}
                  {profitPositive
                    ? <Badge className="bg-green-600 text-white border-transparent gap-1"><TrendingUp className="h-3 w-3" /> +{fmtMoney(stats.net_profit)} $</Badge>
                    : <Badge variant="destructive" className="gap-1"><TrendingDown className="h-3 w-3" /> {fmtMoney(stats.net_profit)} $</Badge>}
                </CardTitle>
                <CardDescription>
                  {result.candles_count} bougies • {stats.total_trades} trades • {fmtPct(stats.total_return_pct)} de rendement
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              <Stat label="Solde final" value={`${fmtMoney(stats.final_balance)} $`} accent={profitPositive ? 'text-green-500' : 'text-red-500'} />
              <Stat label="Profit net" value={`${fmtMoney(stats.net_profit)} $`} accent={profitPositive ? 'text-green-500' : 'text-red-500'} />
              <Stat label="Taux de réussite" value={fmtPct(stats.win_rate)} />
              <Stat label="Profit factor" value={stats.profit_factor == null ? '∞' : stats.profit_factor} />
              <Stat label="Drawdown max" value={fmtPct(stats.max_drawdown_pct)} accent="text-orange-500" />
              <Stat label="Espérance / trade" value={`${fmtMoney(stats.expectancy)} $`} />
              <Stat label="Trades gagnants" value={stats.winning_trades} accent="text-green-500" />
              <Stat label="Trades perdants" value={stats.losing_trades} accent="text-red-500" />
              <Stat label="Gain moyen" value={`${fmtMoney(stats.avg_win)} $`} />
              <Stat label="Perte moyenne" value={`${fmtMoney(stats.avg_loss)} $`} />
              <Stat label="Meilleur trade" value={`${fmtMoney(stats.biggest_win)} $`} />
              <Stat label="Pire trade" value={`${fmtMoney(stats.biggest_loss)} $`} />
            </div>

            <Tabs defaultValue="chart">
              <TabsList>
                <TabsTrigger value="chart">Graphique & Replay</TabsTrigger>
                <TabsTrigger value="equity">Courbe d'équité</TabsTrigger>
                <TabsTrigger value="trades">Trades ({result.trades?.length || 0})</TabsTrigger>
              </TabsList>
              <TabsContent value="chart">
                <ReplayChart
                  candles={result.candles}
                  trades={result.trades}
                  equityCurve={result.equity_curve}
                  symbolName={result.symbol_name}
                  timeframe={result.timeframe}
                />
              </TabsContent>
              <TabsContent value="equity">
                <EquityChart points={result.equity_curve} />
              </TabsContent>
              <TabsContent value="trades">
                <div className="max-h-96 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Sens</TableHead>
                        <TableHead>Entrée</TableHead>
                        <TableHead>Sortie</TableHead>
                        <TableHead>Prix in</TableHead>
                        <TableHead>Prix out</TableHead>
                        <TableHead>Lots</TableHead>
                        <TableHead>Pips</TableHead>
                        <TableHead>Profit ($)</TableHead>
                        <TableHead>Clôture</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(result.trades || []).map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>
                            <Badge variant={t.side === 'buy' ? 'default' : 'secondary'}>{t.side === 'buy' ? 'Achat' : 'Vente'}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(t.entry_time)}</TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(t.exit_time)}</TableCell>
                          <TableCell>{t.entry_price?.toFixed(5)}</TableCell>
                          <TableCell>{t.exit_price?.toFixed(5)}</TableCell>
                          <TableCell>{t.size}</TableCell>
                          <TableCell className={t.pips >= 0 ? 'text-green-500' : 'text-red-500'}>{t.pips?.toFixed(1)}</TableCell>
                          <TableCell className={t.profit >= 0 ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>{fmtMoney(t.profit)}</TableCell>
                          <TableCell><span className="text-xs text-muted-foreground">{CLOSE_REASONS[t.close_reason] || t.close_reason}</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* ==================== HISTORIQUE ==================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Historique</CardTitle>
          <CardDescription>Vos 50 derniers backtests sauvegardés</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun backtest sauvegardé pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {history.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <button className="text-left flex-1 min-w-0" onClick={() => loadBacktest(b.id)}>
                    <p className="font-medium text-sm truncate">{b.name || `${b.symbol_name} ${b.timeframe}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString('fr-FR')} • {b.stats?.total_trades ?? '—'} trades
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${(b.stats?.net_profit ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(b.stats?.net_profit ?? 0) >= 0 ? '+' : ''}{fmtMoney(b.stats?.net_profit)} $
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => deleteBacktest(b.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Backtesting;
