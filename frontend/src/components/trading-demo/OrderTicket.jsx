// Ticket d'ordre : marché (BUY/SELL) et en attente (BUY/SELL LIMIT/STOP).
// Lots prédéfinis + saisie libre, SL/TP optionnels. Exécution/validation côté serveur.
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { fmt } from '../../lib/demoApi';

const LOTS = [0.01, 0.02, 0.05, 0.10, 0.50, 1.00, 2.00, 5.00, 10.00];
const PENDING_TYPES = ['BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP'];

export default function OrderTicket({ instrument, quote, onMarket, onPending, busy }) {
  const [mode, setMode] = useState('market'); // 'market' | 'pending'
  const [volume, setVolume] = useState('0.01');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [ptype, setPtype] = useState('BUY_LIMIT');
  const [price, setPrice] = useState('');

  const d = instrument?.digits ?? 5;
  const parseNum = (v) => (v === '' || v == null ? null : Number(v));

  const submitMarket = async (side) => {
    const v = Number(volume);
    if (!(v > 0)) return toast.error('Volume invalide');
    try {
      await onMarket({ symbol: instrument.symbol, side, volume: v, stop_loss: parseNum(sl), take_profit: parseNum(tp) });
      toast.success(`${side} ${v} ${instrument.symbol} exécuté`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Échec de l'ordre");
    }
  };

  const submitPending = async () => {
    const v = Number(volume);
    const p = Number(price);
    if (!(v > 0)) return toast.error('Volume invalide');
    if (!(p > 0)) return toast.error("Prix d'entrée requis");
    try {
      await onPending({ symbol: instrument.symbol, type: ptype, volume: v, entry_price: p, stop_loss: parseNum(sl), take_profit: parseNum(tp) });
      toast.success(`Ordre ${ptype.replace('_', ' ')} placé`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Échec de l'ordre en attente");
    }
  };

  if (!instrument) return <div className="p-3 text-xs text-muted-foreground">Sélectionnez un instrument.</div>;

  return (
    <div className="border rounded-xl p-3 space-y-3 bg-card/40">
      {/* Cotation live */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{instrument.symbol}</span>
        <span className="tabular-nums">
          <span className="text-red-500">{quote ? fmt(quote.bid, d) : '—'}</span>
          {' / '}
          <span className="text-emerald-500">{quote ? fmt(quote.ask, d) : '—'}</span>
        </span>
      </div>

      {/* Mode */}
      <div className="flex gap-1">
        <button onClick={() => setMode('market')} className={`flex-1 py-1 text-xs rounded border ${mode === 'market' ? 'bg-primary text-primary-foreground border-primary' : ''}`}>Marché</button>
        <button onClick={() => setMode('pending')} className={`flex-1 py-1 text-xs rounded border ${mode === 'pending' ? 'bg-primary text-primary-foreground border-primary' : ''}`}>En attente</button>
      </div>

      {/* Volume */}
      <div>
        <label className="text-[10px] uppercase text-muted-foreground">Volume (lots)</label>
        <div className="flex flex-wrap gap-0.5 mt-1">
          {LOTS.map((l) => (
            <button key={l} onClick={() => setVolume(String(l))}
              className={`px-1.5 py-0.5 text-[10px] rounded border ${Number(volume) === l ? 'bg-accent border-primary' : ''}`}>
              {l.toFixed(2)}
            </button>
          ))}
        </div>
        <input value={volume} onChange={(e) => setVolume(e.target.value)} type="number" step={instrument.volume_step} min={instrument.min_volume}
          className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs" />
        <p className="text-[9px] text-muted-foreground mt-0.5">min {instrument.min_volume} · pas {instrument.volume_step} · max {instrument.max_volume}</p>
      </div>

      {/* Type + prix pour pending */}
      {mode === 'pending' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Type</label>
            <select value={ptype} onChange={(e) => setPtype(e.target.value)} className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs">
              {PENDING_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Prix d'entrée</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step={instrument.pip_size}
              className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs" />
          </div>
        </div>
      )}

      {/* SL / TP */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Stop Loss</label>
          <input value={sl} onChange={(e) => setSl(e.target.value)} type="number" step={instrument.pip_size} placeholder="—"
            className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs" />
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Take Profit</label>
          <input value={tp} onChange={(e) => setTp(e.target.value)} type="number" step={instrument.pip_size} placeholder="—"
            className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs" />
        </div>
      </div>

      {/* Actions */}
      {mode === 'market' ? (
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={busy} onClick={() => submitMarket('SELL')} className="bg-red-500 hover:bg-red-600 text-white">SELL</Button>
          <Button disabled={busy} onClick={() => submitMarket('BUY')} className="bg-emerald-500 hover:bg-emerald-600 text-white">BUY</Button>
        </div>
      ) : (
        <Button disabled={busy} onClick={submitPending} className="w-full">Placer l'ordre</Button>
      )}
    </div>
  );
}
