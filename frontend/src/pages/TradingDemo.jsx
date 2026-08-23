// Terminal Trading Demo — page conteneur. Assemble l'en-tête compte, la watchlist,
// le graphique, le ticket d'ordre et les panneaux positions/ordres/historique.
// Cotations temps réel via WebSocket ; métriques rafraîchies périodiquement (serveur
// = source de vérité). Responsive : disposition bureau + navigation mobile.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, ShoppingCart, List, Clock, History as HistoryIcon, Star, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { demoApi, DEMO_CATEGORIES } from '../lib/demoApi';
import { useMarketSocket } from '../hooks/useMarketSocket';
import AccountHeader from '../components/trading-demo/AccountHeader';
import Watchlist from '../components/trading-demo/Watchlist';
import DemoChart from '../components/trading-demo/DemoChart';
import OrderTicket from '../components/trading-demo/OrderTicket';
import { PositionsPanel, OrdersPanel, HistoryPanel, CloseDialog, EditStopsDialog } from '../components/trading-demo/Panels';

const REFRESH_MS = 3500;
const MOBILE_TABS = [
  { key: 'chart', label: 'Graphique', Icon: LineChart },
  { key: 'trade', label: 'Trader', Icon: ShoppingCart },
  { key: 'positions', label: 'Positions', Icon: List },
  { key: 'orders', label: 'Ordres', Icon: Clock },
  { key: 'history', label: 'Historique', Icon: HistoryIcon },
  { key: 'watchlist', label: 'Marchés', Icon: Star },
];

export default function TradingDemo() {
  const [account, setAccount] = useState(null);
  const [instruments, setInstruments] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);

  const [cat, setCat] = useState('FOREX');
  const [selected, setSelected] = useState('EURUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [busy, setBusy] = useState(false);
  const [panelTab, setPanelTab] = useState('positions'); // positions|orders|history (bureau)
  const [mobileTab, setMobileTab] = useState('chart');
  const [isDesktop, setIsDesktop] = useState(true);
  const [closeTarget, setCloseTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const refsBaseline = useRef({}); // symbol -> premier mid vu (pour la variation %)

  // Détection bureau/mobile.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setIsDesktop(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Symboles à suivre en temps réel : catégorie courante + favoris + sélection.
  const visibleSymbols = useMemo(() => {
    const catSyms = instruments.filter((i) => i.category === cat).map((i) => i.symbol);
    return Array.from(new Set([...catSyms, ...favorites, selected].filter(Boolean)));
  }, [instruments, cat, favorites, selected]);

  const { quotes, connected } = useMarketSocket(visibleSymbols);

  // Mémorise la 1re cotation vue par symbole (baseline variation %).
  useEffect(() => {
    for (const [sym, q] of Object.entries(quotes)) {
      if (refsBaseline.current[sym] == null && q?.mid > 0) refsBaseline.current[sym] = q.mid;
    }
  }, [quotes]);

  const selectedInstrument = useMemo(() => instruments.find((i) => i.symbol === selected) || null, [instruments, selected]);
  const selectedQuote = quotes[selected] || null;

  // Chargements initiaux.
  const loadStatic = async () => {
    try {
      const [inst, wl] = await Promise.all([demoApi.instruments(), demoApi.watchlist()]);
      setInstruments(inst.instruments || []);
      setFavorites(wl.symbols || []);
    } catch (e) { toast.error('Chargement des marchés impossible'); }
  };
  const refresh = async () => {
    try {
      const [acc, pos, ord] = await Promise.all([demoApi.getAccount(), demoApi.positions(), demoApi.orders()]);
      setAccount(acc.account); setPositions(pos.positions || []); setOrders(ord.orders || []);
    } catch (e) { /* silencieux (poll) */ }
  };
  const loadHistory = async () => {
    try { const h = await demoApi.history(); setTrades(h.trades || []); } catch (e) { /* noop */ }
  };

  useEffect(() => { loadStatic(); refresh(); }, []);
  useEffect(() => { const t = setInterval(refresh, REFRESH_MS); return () => clearInterval(t); }, []);
  useEffect(() => { if (panelTab === 'history' || mobileTab === 'history') loadHistory(); }, [panelTab, mobileTab]);

  // Actions.
  const onMarket = async (body) => { setBusy(true); try { const r = await demoApi.openMarket(body); setAccount(r.account); await refresh(); } finally { setBusy(false); } };
  const onPending = async (body) => { setBusy(true); try { await demoApi.createPending(body); await refresh(); } finally { setBusy(false); } };
  const doClose = async (vol) => { try { await demoApi.closePosition(closeTarget.id, vol); toast.success('Position fermée'); setCloseTarget(null); await refresh(); await loadHistory(); } catch (e) { toast.error(e.response?.data?.message || 'Échec'); } };
  const doEdit = async (body) => { try { await demoApi.updatePosition(editTarget.id, body); toast.success('SL/TP mis à jour'); setEditTarget(null); await refresh(); } catch (e) { toast.error(e.response?.data?.message || 'Échec'); } };
  const cancelOrder = async (o) => { try { await demoApi.cancelPending(o.id); toast.success('Ordre annulé'); await refresh(); } catch (e) { toast.error('Échec'); } };
  const toggleFav = async (symbol, isFav) => {
    try { const r = await demoApi.updateWatchlist(symbol, isFav ? 'remove' : 'add'); setFavorites(r.symbols || []); } catch (e) { toast.error('Échec favori'); }
  };
  const resetAccount = async () => { try { const r = await demoApi.reset(); setAccount(r.account); await refresh(); await loadHistory(); toast.success('Compte démo réinitialisé'); } catch (e) { toast.error('Échec'); } };

  const watchlistEl = (
    <Watchlist instruments={instruments} quotes={quotes} refs={refsBaseline.current}
      selected={selected} onSelect={(s) => { setSelected(s); if (!isDesktop) setMobileTab('chart'); }}
      favorites={favorites} onToggleFav={toggleFav} cat={cat} onCat={setCat} />
  );
  const chartEl = (
    <DemoChart symbol={selected} symbolName={selectedInstrument?.name} timeframe={timeframe}
      onSelectTimeframe={setTimeframe} liveQuote={selectedQuote} />
  );
  const ticketEl = (
    <OrderTicket instrument={selectedInstrument} quote={selectedQuote} onMarket={onMarket} onPending={onPending} busy={busy} />
  );
  const panelsEl = (
    <div className="border rounded-xl bg-card/40">
      <div className="flex items-center gap-1 border-b p-1.5">
        {[['positions', `Positions (${positions.length})`], ['orders', `Ordres (${orders.length})`], ['history', 'Historique']].map(([k, l]) => (
          <button key={k} onClick={() => setPanelTab(k)} className={`px-2 py-1 text-xs rounded ${panelTab === k ? 'bg-accent font-medium' : ''}`}>{l}</button>
        ))}
      </div>
      {panelTab === 'positions' && <PositionsPanel positions={positions} quotes={quotes} onClose={setCloseTarget} onUpdate={setEditTarget} />}
      {panelTab === 'orders' && <OrdersPanel orders={orders} onCancel={cancelOrder} />}
      {panelTab === 'history' && <HistoryPanel trades={trades} />}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg md:text-xl font-extrabold flex items-center gap-2"><LineChart className="h-5 w-5 text-primary" /> Trading Demo</h1>
        <button onClick={resetAccount} className="flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-accent">
          <RefreshCw className="h-3 w-3" /> Réinitialiser
        </button>
      </div>
      <AccountHeader account={account} connected={connected} />

      {/* Bureau : grille 3 colonnes + panneaux dessous. Mobile : une section à la fois. */}
      {isDesktop ? (
        <>
          <div className="grid grid-cols-[260px_1fr_300px] gap-3 items-start">
            <div className="h-[62vh]">{watchlistEl}</div>
            <div>{chartEl}</div>
            <div>{ticketEl}</div>
          </div>
          {panelsEl}
        </>
      ) : (
        <>
          <div className="min-h-[60vh] pb-16">
            {mobileTab === 'chart' && chartEl}
            {mobileTab === 'trade' && ticketEl}
            {mobileTab === 'positions' && <div className="border rounded-xl bg-card/40"><PositionsPanel positions={positions} quotes={quotes} onClose={setCloseTarget} onUpdate={setEditTarget} /></div>}
            {mobileTab === 'orders' && <div className="border rounded-xl bg-card/40"><OrdersPanel orders={orders} onCancel={cancelOrder} /></div>}
            {mobileTab === 'history' && <div className="border rounded-xl bg-card/40"><HistoryPanel trades={trades} /></div>}
            {mobileTab === 'watchlist' && <div className="h-[62vh]">{watchlistEl}</div>}
          </div>
          {/* Navigation mobile fixe */}
          <div className="fixed bottom-0 inset-x-0 z-50 flex justify-around border-t bg-background/95 backdrop-blur py-1 lg:hidden">
            {MOBILE_TABS.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setMobileTab(key)} className={`flex flex-col items-center gap-0.5 px-1 py-1 text-[9px] ${mobileTab === key ? 'text-primary' : 'text-muted-foreground'}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </>
      )}

      {closeTarget && <CloseDialog position={closeTarget} onConfirm={doClose} onCancel={() => setCloseTarget(null)} />}
      {editTarget && <EditStopsDialog position={editTarget} onConfirm={doEdit} onCancel={() => setEditTarget(null)} />}
    </div>
  );
}
