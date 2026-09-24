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
const TABS = [
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
  const [activeTab, setActiveTab] = useState('chart');
  const [closeTarget, setCloseTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const refsBaseline = useRef({}); // symbol -> premier mid vu (pour la variation %)

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
  useEffect(() => { if (activeTab === 'history') loadHistory(); }, [activeTab]);

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
      selected={selected} onSelect={(s) => { setSelected(s); setActiveTab('chart'); }}
      favorites={favorites} onToggleFav={toggleFav} cat={cat} onCat={setCat} />
  );
  const chartEl = (
    <DemoChart symbol={selected} symbolName={selectedInstrument?.name} timeframe={timeframe}
      onSelectTimeframe={setTimeframe} liveQuote={selectedQuote} />
  );
  const ticketEl = (
    <OrderTicket instrument={selectedInstrument} quote={selectedQuote} onMarket={onMarket} onPending={onPending} busy={busy} />
  );

  const isChartView = activeTab === 'chart';

  return (
    <div className={`w-full ${isChartView ? 'h-screen max-h-screen flex flex-col overflow-hidden bg-background' : 'space-y-4 p-3 sm:p-5 max-w-7xl mx-auto pb-20'}`}>
      {/* Barre de navigation des onglets */}
      <div className={`flex items-center justify-between gap-2 border-b bg-card/75 backdrop-blur px-2 sm:px-4 py-2 ${isChartView ? 'flex-shrink-0 pl-28 sm:pl-32' : ''}`}>
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
          {TABS.map(({ key, label, Icon }) => {
            const count = key === 'positions' ? positions.length : key === 'orders' ? orders.length : null;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                {count != null && count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/15 text-primary'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${connected ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="hidden sm:inline">{connected ? 'En direct' : 'Connexion...'}</span>
          </span>
          {isChartView && (
            <button
              onClick={() => setActiveTab('trade')}
              className="hidden sm:flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Trader
            </button>
          )}
        </div>
      </div>

      {/* AccountHeader (Balance, Equity, Marge...) : VISIBLE UNIQUEMENT SUR trade, positions, orders, history */}
      {['trade', 'positions', 'orders', 'history'].includes(activeTab) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg md:text-xl font-extrabold flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" /> Compte Démo
            </h1>
            <button
              onClick={resetAccount}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border bg-card hover:bg-accent transition-colors font-medium"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Réinitialiser le compte
            </button>
          </div>
          <AccountHeader account={account} connected={connected} />
        </div>
      )}

      {/* Contenu principal */}
      {isChartView && (
        <div className="flex-1 min-h-0 w-full p-1 sm:p-2 overflow-hidden">
          {chartEl}
        </div>
      )}

      {activeTab === 'trade' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">{ticketEl}</div>
          <div className="lg:col-span-2 space-y-4">
            <div className="h-[460px] rounded-xl border overflow-hidden bg-card">
              {chartEl}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="border rounded-xl bg-card/40 p-2 sm:p-4">
          <PositionsPanel positions={positions} quotes={quotes} onClose={setCloseTarget} onUpdate={setEditTarget} />
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="border rounded-xl bg-card/40 p-2 sm:p-4">
          <OrdersPanel orders={orders} onCancel={cancelOrder} />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="border rounded-xl bg-card/40 p-2 sm:p-4">
          <HistoryPanel trades={trades} />
        </div>
      )}

      {activeTab === 'watchlist' && (
        <div className="max-w-3xl mx-auto h-[75vh]">
          {watchlistEl}
        </div>
      )}

      {/* Navigation mobile fixe au bas */}
      <div className="fixed bottom-0 inset-x-0 z-40 flex justify-around border-t bg-background/95 backdrop-blur py-1.5 lg:hidden">
        {TABS.map(({ key, label, Icon }) => {
          const count = key === 'positions' ? positions.length : key === 'orders' ? orders.length : null;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors ${
                activeTab === key ? 'text-primary font-bold' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {count != null && count > 0 && (
                <span className="absolute top-0 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {closeTarget && <CloseDialog position={closeTarget} onConfirm={doClose} onCancel={() => setCloseTarget(null)} />}
      {editTarget && <EditStopsDialog position={editTarget} onConfirm={doEdit} onCancel={() => setEditTarget(null)} />}
    </div>
  );
}
