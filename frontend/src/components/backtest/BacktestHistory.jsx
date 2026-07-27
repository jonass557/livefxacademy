import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import api from '../../lib/api';
import { History, Trash2, Loader2, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

const fmtMoney = (n) => (n == null ? '—' : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 }));
const fmtPct = (n) => (n == null ? '—' : `${Number(n).toFixed(2)} %`);

/**
 * Historique des backtests de l'utilisateur : consultation des performances
 * passées et suppression. Accessible depuis le tableau de bord.
 */
export default function BacktestHistory() {
  const [items, setItems] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    api.get('/backtests')
      .then((r) => setItems(r.data))
      .catch(() => { setItems([]); toast.error("Impossible de charger l'historique"); });
  }, []);

  const remove = async (id) => {
    setDeleting(id);
    try {
      await api.delete(`/backtests/${id}`);
      setItems((h) => h.filter((b) => b.id !== id));
      toast.success('Backtest supprimé');
    } catch {
      toast.error('Suppression impossible');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Historique de backtest
        </CardTitle>
        <CardDescription>Vos 50 derniers backtests sauvegardés — performances et suppression</CardDescription>
      </CardHeader>
      <CardContent>
        {items === null ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucun backtest sauvegardé pour le moment.</p>
            <p className="text-xs">Lancez une Lecture depuis la section Backtesting pour en créer un.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((b) => {
              const profit = b.stats?.net_profit ?? 0;
              const positive = profit >= 0;
              return (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate flex items-center gap-2">
                      {b.name || `${b.symbol_name} ${b.timeframe}`}
                      <Badge variant="outline" className="text-[10px]">{b.timeframe}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString('fr-FR')} • {b.candles_count ?? '—'} bougies • {b.stats?.total_trades ?? '—'} trades • réussite {fmtPct(b.stats?.win_rate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 text-sm font-semibold ${positive ? 'text-green-500' : 'text-red-500'}`}>
                      {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {positive ? '+' : ''}{fmtMoney(profit)} $
                    </span>
                    <Button
                      variant="ghost" size="icon" onClick={() => remove(b.id)} disabled={deleting === b.id}
                      title="Supprimer ce backtest"
                    >
                      {deleting === b.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4 text-destructive" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
