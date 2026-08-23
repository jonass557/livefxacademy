// Panneaux Positions ouvertes, Ordres en attente et Historique.
import React, { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { fmt } from '../../lib/demoApi';

export function PositionsPanel({ positions, quotes, onClose, onUpdate }) {
  if (!positions.length) return <Empty text="Aucune position ouverte." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground text-[10px] uppercase">
          <tr className="border-b">
            <Th>Symbole</Th><Th>Sens</Th><Th>Vol</Th><Th>Entrée</Th><Th>Actuel</Th><Th>SL</Th><Th>TP</Th><Th>P&L</Th><Th></Th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const q = quotes[p.symbol];
            const cur = q ? (p.side === 'BUY' ? q.bid : q.ask) : p.current_price;
            return (
              <tr key={p.id} className="border-b border-border/50">
                <Td className="font-medium">{p.symbol}</Td>
                <Td><span className={p.side === 'BUY' ? 'text-emerald-500' : 'text-red-500'}>{p.side}</span></Td>
                <Td>{p.volume}</Td>
                <Td className="tabular-nums">{fmt(p.entry_price, 5)}</Td>
                <Td className="tabular-nums">{fmt(cur, 5)}</Td>
                <Td className="tabular-nums">{p.stop_loss ? fmt(p.stop_loss, 5) : '—'}</Td>
                <Td className="tabular-nums">{p.take_profit ? fmt(p.take_profit, 5) : '—'}</Td>
                <Td className={`tabular-nums font-semibold ${p.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmt(p.profit)}</Td>
                <Td>
                  <div className="flex gap-1">
                    <button title="Modifier SL/TP" onClick={() => onUpdate(p)}><Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" /></button>
                    <button title="Fermer" onClick={() => onClose(p)}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /></button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OrdersPanel({ orders, onCancel }) {
  if (!orders.length) return <Empty text="Aucun ordre en attente." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground text-[10px] uppercase">
          <tr className="border-b"><Th>Symbole</Th><Th>Type</Th><Th>Vol</Th><Th>Prix</Th><Th>SL</Th><Th>TP</Th><Th></Th></tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-border/50">
              <Td className="font-medium">{o.symbol}</Td>
              <Td>{o.type.replace('_', ' ')}</Td>
              <Td>{o.volume}</Td>
              <Td className="tabular-nums">{fmt(o.entry_price, 5)}</Td>
              <Td className="tabular-nums">{o.stop_loss ? fmt(o.stop_loss, 5) : '—'}</Td>
              <Td className="tabular-nums">{o.take_profit ? fmt(o.take_profit, 5) : '—'}</Td>
              <Td><button title="Annuler" onClick={() => onCancel(o)}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /></button></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HistoryPanel({ trades }) {
  if (!trades.length) return <Empty text="Aucun trade clôturé." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground text-[10px] uppercase">
          <tr className="border-b"><Th>Symbole</Th><Th>Sens</Th><Th>Vol</Th><Th>Entrée</Th><Th>Sortie</Th><Th>Motif</Th><Th>P&L</Th></tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id} className="border-b border-border/50">
              <Td className="font-medium">{t.symbol}</Td>
              <Td><span className={t.side === 'BUY' ? 'text-emerald-500' : 'text-red-500'}>{t.side}</span></Td>
              <Td>{t.volume}</Td>
              <Td className="tabular-nums">{fmt(t.entry_price, 5)}</Td>
              <Td className="tabular-nums">{fmt(t.exit_price, 5)}</Td>
              <Td className="text-[10px]">{t.close_reason}</Td>
              <Td className={`tabular-nums font-semibold ${t.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmt(t.profit)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Th = ({ children }) => <th className="text-left py-1.5 px-2 font-medium">{children}</th>;
const Td = ({ children, className = '' }) => <td className={`py-1.5 px-2 ${className}`}>{children}</td>;
const Empty = ({ text }) => <p className="p-4 text-center text-xs text-muted-foreground">{text}</p>;

// Petite modale de fermeture partielle / édition SL-TP.
export function CloseDialog({ position, onConfirm, onCancel }) {
  const [volume, setVolume] = useState(String(position.volume));
  return (
    <Modal title={`Fermer ${position.symbol}`} onCancel={onCancel}>
      <label className="text-[10px] uppercase text-muted-foreground">Volume à fermer (max {position.volume})</label>
      <input value={volume} onChange={(e) => setVolume(e.target.value)} type="number" step="0.01" max={position.volume}
        className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" />
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="flex-1 py-1.5 text-sm rounded border">Annuler</button>
        <button onClick={() => onConfirm(Number(volume))} className="flex-1 py-1.5 text-sm rounded bg-primary text-primary-foreground">Fermer</button>
      </div>
    </Modal>
  );
}

export function EditStopsDialog({ position, onConfirm, onCancel }) {
  const [sl, setSl] = useState(position.stop_loss ?? '');
  const [tp, setTp] = useState(position.take_profit ?? '');
  return (
    <Modal title={`Modifier ${position.symbol}`} onCancel={onCancel}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Stop Loss</label>
          <input value={sl} onChange={(e) => setSl(e.target.value)} type="number" step="0.00001" placeholder="—" className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Take Profit</label>
          <input value={tp} onChange={(e) => setTp(e.target.value)} type="number" step="0.00001" placeholder="—" className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="flex-1 py-1.5 text-sm rounded border">Annuler</button>
        <button onClick={() => onConfirm({ stop_loss: sl === '' ? null : Number(sl), take_profit: tp === '' ? null : Number(tp) })}
          className="flex-1 py-1.5 text-sm rounded bg-primary text-primary-foreground">Enregistrer</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onCancel }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-xs rounded-xl border bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onCancel}><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
