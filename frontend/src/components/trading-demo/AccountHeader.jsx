import React from 'react';
import { fmt } from '../../lib/demoApi';
import useLanguageStore from '../../store/languageStore';

function Metric({ label, value, accent }) {
  return (
    <div className="flex flex-col px-3 py-1.5 min-w-[92px]">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${accent || ''}`}>{value}</span>
    </div>
  );
}

export default function AccountHeader({ account, connected }) {
  const { language } = useLanguageStore();
  const isEn = language === 'en';
  const a = account || {};
  const pnl = a.floating_pnl || 0;
  const pnlColor = pnl > 0 ? 'text-emerald-500' : pnl < 0 ? 'text-red-500' : '';
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-card/60 divide-x">
      <Metric label="Balance" value={`${fmt(a.balance)} ${a.currency || 'USD'}`} />
      <Metric label="Equity" value={fmt(a.equity)} />
      <Metric label={isEn ? "Used Margin" : "Marge util."} value={fmt(a.used_margin)} />
      <Metric label={isEn ? "Free Margin" : "Marge libre"} value={fmt(a.free_margin)} />
      <Metric label={isEn ? "Floating P&L" : "P&L flottant"} value={fmt(pnl)} accent={pnlColor} />
      <Metric label={isEn ? "Margin Level" : "Niveau marge"} value={a.margin_level == null ? '—' : `${fmt(a.margin_level)}%`} />
      <div className="ml-auto flex items-center gap-1 px-3">
        <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <span className="text-[10px] text-muted-foreground">{connected ? (isEn ? 'Real-time' : 'Temps réel') : (isEn ? 'Reconnecting…' : 'Reconnexion…')}</span>
      </div>
    </div>
  );
}
