// Watchlist : catégories, recherche, favoris, Bid/Ask/Spread/variation en temps réel.
import React, { useMemo, useState } from 'react';
import { Star, Search } from 'lucide-react';
import { DEMO_CATEGORIES, fmt } from '../../lib/demoApi';

export default function Watchlist({
  instruments, quotes, refs, selected, onSelect, favorites, onToggleFav, cat, onCat,
}) {
  const [q, setQ] = useState('');
  const [favOnly, setFavOnly] = useState(false);

  const rows = useMemo(() => {
    let list = instruments.filter((i) => i.category === cat);
    if (favOnly) list = list.filter((i) => favorites.includes(i.symbol));
    if (q) list = list.filter((i) => i.symbol.toLowerCase().includes(q.toLowerCase()) || i.name.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [instruments, cat, q, favOnly, favorites]);

  return (
    <div className="flex flex-col h-full border rounded-xl overflow-hidden bg-card/40">
      <div className="p-2 border-b space-y-2">
        <div className="flex items-center gap-1 rounded-md border px-2 bg-background">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="w-full bg-transparent py-1 text-xs outline-none" />
          <button onClick={() => setFavOnly((v) => !v)} title="Favoris seulement">
            <Star className={`h-3.5 w-3.5 ${favOnly ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
          </button>
        </div>
        <div className="flex flex-wrap gap-0.5">
          {DEMO_CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => onCat(c.key)}
              className={`px-1.5 py-0.5 text-[10px] rounded border ${cat === c.key ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 && <p className="p-3 text-xs text-muted-foreground">Aucun instrument.</p>}
        {rows.map((i) => {
          const qt = quotes[i.symbol];
          const ref = refs[i.symbol];
          const chg = qt && ref ? ((qt.mid - ref) / ref) * 100 : null;
          const isFav = favorites.includes(i.symbol);
          return (
            <div key={i.symbol}
              onClick={() => onSelect(i.symbol)}
              className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer border-b border-border/50 hover:bg-accent/50 ${selected === i.symbol ? 'bg-accent' : ''}`}>
              <button onClick={(e) => { e.stopPropagation(); onToggleFav(i.symbol, isFav); }}>
                <Star className={`h-3 w-3 ${isFav ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{i.symbol}</p>
                <p className="text-[10px] text-muted-foreground truncate">{i.name}</p>
              </div>
              <div className="text-right tabular-nums">
                <p className="text-[11px]">
                  <span className="text-red-500">{qt ? fmt(qt.bid, i.digits) : '—'}</span>
                  {' / '}
                  <span className="text-emerald-500">{qt ? fmt(qt.ask, i.digits) : '—'}</span>
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {qt ? `sprd ${fmt((qt.ask - qt.bid) / (i.pip_size || 1), 1)}` : `${i.spread_pips}p`}
                  {chg != null && <span className={`ml-1 ${chg >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{chg >= 0 ? '+' : ''}{fmt(chg, 2)}%</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
