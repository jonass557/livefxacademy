import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { init, dispose } from 'klinecharts';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import './chart-landscape.css';
import {
  CHART_STYLES, ensureCustomOverlaysAndIndicators, detectPriceDigits,
  DrawToolsMenu, IndicatorsMenu, ChartWatermark, useFullscreen,
  configureMT4Chart, ChartZoomControls, buildKLineStyles,
  useChartStyles, ChartStyleButton, ChartStyleSettingsModal,
  useChartOverlayManager, SelectedOverlayBar, CandleCountdownBadge,
  ChartErrorBoundary, Dropdown,
} from './chartShared';
import {
  Play, Pause, RotateCcw, SkipForward, SkipBack, Film, Eye, Loader2,
  Maximize2, Minimize2, ArrowUpCircle, ArrowDownCircle, XCircle, Scissors,
  Trash2, Plus, Minus, Tag, Check, ChevronDown, ChevronUp, AlertCircle,
  PlusCircle, Zap,
} from 'lucide-react';

const REPLAY_SPEEDS = [
  { key: -3, label: '×-3', dir: -1, delay: 180 },
  { key: -2, label: '×-2', dir: -1, delay: 450 },
  { key: -1, label: '×-1', dir: -1, delay: 1000 },
  { key: 1,  label: '×+1', dir: 1,  delay: 1000 },
  { key: 2,  label: '×+2', dir: 1,  delay: 450 },
  { key: 3,  label: '×+3', dir: 1,  delay: 180 },
];

const ORDER_TYPES = [
  { key: 'market', label: 'Au Marché' },
  { key: 'buy_limit', label: 'Buy Limit' },
  { key: 'sell_limit', label: 'Sell Limit' },
  { key: 'buy_stop', label: 'Buy Stop' },
  { key: 'sell_stop', label: 'Sell Stop' },
];

const PIP_VALUE_PER_LOT = 10; // $ par pip et par lot standard (1.00 lot)

const fmtDateLong = (t) =>
  new Date(t * 1000).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const fmt$ = (n) => `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)} $`;

export default function ReplayChart({
  candles, symbolName, timeframe, periodBounds,
  pip = 0.0001, lot = 0.1, initialBalance = 10000,
  loading = false, replaySignal = 0, error = null, onRetry = null,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const timerRef = useRef(null);
  const indexRef = useRef(0);
  const cutIndexRef = useRef(null);
  const isCuttingRef = useRef(false);
  const hoveredCandleRef = useRef(null);

  const positionRef = useRef(null);         // { id, side, entryPrice, entryTime, lot, sl, tp }
  const pendingOrdersRef = useRef([]);     // Array<{ id, type, price, lot, sl, tp, createdAtTime }>
  const balanceRef = useRef(initialBalance);
  const indicatorPanesRef = useRef({});

  const [mode, setMode] = useState('full');       // 'full' | 'replay'
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);          // default ×+1
  const [index, setIndex] = useState(0);
  const [cutIndex, setCutIndex] = useState(null);
  const [isCutting, setIsCutting] = useState(false);

  // Positions et Ordres
  const [position, setPosition] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [balance, setBalance] = useState(initialBalance);
  const [closedTrades, setClosedTrades] = useState(0);

  // Formulaire de prise d'ordre
  const [orderType, setOrderType] = useState('market');
  const [orderLot, setOrderLot] = useState(lot || 0.1);
  const [orderPrice, setOrderPrice] = useState('');
  const [orderSl, setOrderSl] = useState('');
  const [orderTp, setOrderTp] = useState('');
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [speedDropdownOpen, setSpeedDropdownOpen] = useState(false);
  const [pendingDropdownOpen, setPendingDropdownOpen] = useState(false);

  const [activeIndicators, setActiveIndicators] = useState({});
  const [fullscreen, setFullscreen] = useFullscreen();

  const {
    styles: chartColors,
    applyStyles,
    applyPreset,
    resetDefault,
    open: styleModalOpen,
    setOpen: setStyleModalOpen,
  } = useChartStyles(chartRef);

  const overlayManager = useChartOverlayManager(chartRef, containerRef);

  const klineData = useMemo(
    () => (candles || []).map((c) => ({
      timestamp: c.time * 1000,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      time: c.time,
    })),
    [candles]
  );
  const priceDigits = useMemo(() => detectPriceDigits(candles), [candles]);

  // Synchronisation lot initial prop
  useEffect(() => {
    if (lot && Number(lot) > 0) {
      setOrderLot(Number(lot));
    }
  }, [lot]);

  // Bornes de période
  const { startIdx, endIdx } = useMemo(() => {
    let s = 0, e = (candles?.length || 1) - 1;
    if (candles?.length && periodBounds) {
      s = candles.findIndex((c) => c.time >= periodBounds.start);
      if (s < 0) s = 0;
      for (let i = candles.length - 1; i >= 0; i--) {
        if (candles[i].time <= periodBounds.end) { e = i; break; }
      }
      if (e < s) e = candles.length - 1;
    }
    return { startIdx: s, endIdx: e };
  }, [candles, periodBounds]);

  // Synchronisation des Overlays de Niveaux d'Ordre (Entrée Bleu, SL Rouge, TP Vert)
  const syncTradingOverlays = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      chart.removeOverlay({ groupId: 'order_levels' });

      // 1. Position active
      const pos = positionRef.current;
      if (pos) {
        chart.createOverlay({
          name: 'backtestEntryLine',
          groupId: 'order_levels',
          lock: true,
          points: [{ value: pos.entryPrice }],
          extendData: { digits: priceDigits },
        });
        if (pos.sl != null && !isNaN(pos.sl) && pos.sl > 0) {
          chart.createOverlay({
            name: 'backtestSlLine',
            groupId: 'order_levels',
            lock: true,
            points: [{ value: pos.sl }],
            extendData: { digits: priceDigits },
          });
        }
        if (pos.tp != null && !isNaN(pos.tp) && pos.tp > 0) {
          chart.createOverlay({
            name: 'backtestTpLine',
            groupId: 'order_levels',
            lock: true,
            points: [{ value: pos.tp }],
            extendData: { digits: priceDigits },
          });
        }
      }

      // 2. Ordres en attente
      const pOrders = pendingOrdersRef.current || [];
      for (const ord of pOrders) {
        chart.createOverlay({
          name: 'backtestEntryLine',
          groupId: 'order_levels',
          lock: true,
          points: [{ value: ord.price }],
          extendData: { digits: priceDigits },
        });
        if (ord.sl != null && !isNaN(ord.sl) && ord.sl > 0) {
          chart.createOverlay({
            name: 'backtestSlLine',
            groupId: 'order_levels',
            lock: true,
            points: [{ value: ord.sl }],
            extendData: { digits: priceDigits },
          });
        }
        if (ord.tp != null && !isNaN(ord.tp) && ord.tp > 0) {
          chart.createOverlay({
            name: 'backtestTpLine',
            groupId: 'order_levels',
            lock: true,
            points: [{ value: ord.tp }],
            extendData: { digits: priceDigits },
          });
        }
      }
    } catch (err) {
      console.warn('syncTradingOverlays error:', err);
    }
  }, [priceDigits]);

  // Calcul du profit flottant ou réalisé
  const profitOf = useCallback((pos, price) => {
    if (!pos || price == null) return 0;
    const diff = (price - pos.entryPrice) * (pos.side === 'buy' ? 1 : -1);
    return (diff / pip) * PIP_VALUE_PER_LOT * (pos.lot || 0.1);
  }, [pip]);

  const annotate = useCallback((text, time, price, color) => {
    chartRef.current?.createOverlay({
      name: 'simpleAnnotation', groupId: 'trades', lock: true,
      points: [{ timestamp: time * 1000, value: price }],
      extendData: text, styles: { text: { color } },
    });
  }, []);

  // Délimitation verticale de la période
  const drawPeriodBounds = useCallback(() => {
    const chart = chartRef.current;
    if (!chart || !periodBounds || !candles?.length) return;
    try {
      chart.removeOverlay({ groupId: 'bounds' });
      const first = candles[0].time, lastT = candles[candles.length - 1].time;
      for (const [key, t] of [['start', periodBounds.start], ['end', periodBounds.end]]) {
        if (t < first || t > lastT) continue;
        chart.createOverlay({
          name: 'verticalStraightLine', groupId: 'bounds', lock: true,
          points: [{ timestamp: t * 1000 }],
          styles: { line: { color: key === 'start' ? '#3b82f6' : '#a855f7', size: 1, style: 'dashed' } },
        });
      }
    } catch (_) {}
  }, [periodBounds, candles]);

  // Traitement à chaque nouvelle bougie : exécution ordres limites + SL/TP
  const processCandleTick = useCallback((candle) => {
    if (!candle) return;
    const cLow = candle.low;
    const cHigh = candle.high;
    const cTime = candle.time || (candle.timestamp / 1000);

    // 1. Déclenchement des ordres en attente (Pending Orders)
    const currentOrders = [...pendingOrdersRef.current];
    let triggeredAny = false;

    for (let i = currentOrders.length - 1; i >= 0; i--) {
      const ord = currentOrders[i];
      let triggered = false;

      if (ord.type === 'buy_limit' && cLow <= ord.price) triggered = true;
      else if (ord.type === 'sell_limit' && cHigh >= ord.price) triggered = true;
      else if (ord.type === 'buy_stop' && cHigh >= ord.price) triggered = true;
      else if (ord.type === 'sell_stop' && cLow <= ord.price) triggered = true;

      if (triggered) {
        if (!positionRef.current) {
          const side = ord.type.includes('buy') ? 'buy' : 'sell';
          const newPos = {
            id: Date.now(),
            side,
            entryPrice: ord.price,
            entryTime: cTime,
            lot: ord.lot,
            sl: ord.sl,
            tp: ord.tp,
          };
          positionRef.current = newPos;
          setPosition(newPos);
          annotate(
            `⚡ ${ord.type.replace('_', ' ').toUpperCase()} @ ${ord.price.toFixed(priceDigits)}`,
            cTime,
            ord.price,
            side === 'buy' ? '#22c55e' : '#ef4444'
          );
          toast.success(`⚡ Ordre ${ord.type.replace('_', ' ').toUpperCase()} exécuté à ${ord.price.toFixed(priceDigits)}`);
          currentOrders.splice(i, 1);
          triggeredAny = true;
        }
      }
    }

    if (triggeredAny) {
      pendingOrdersRef.current = currentOrders;
      setPendingOrders(currentOrders);
    }

    // 2. Détection du Stop Loss et Take Profit sur la position active
    const pos = positionRef.current;
    if (pos) {
      let closed = false;
      let exitPrice = 0;
      let isSl = false;
      let isTp = false;

      if (pos.side === 'buy') {
        if (pos.sl != null && !isNaN(pos.sl) && pos.sl > 0 && cLow <= pos.sl) {
          closed = true;
          exitPrice = pos.sl;
          isSl = true;
        } else if (pos.tp != null && !isNaN(pos.tp) && pos.tp > 0 && cHigh >= pos.tp) {
          closed = true;
          exitPrice = pos.tp;
          isTp = true;
        }
      } else {
        // sell
        if (pos.sl != null && !isNaN(pos.sl) && pos.sl > 0 && cHigh >= pos.sl) {
          closed = true;
          exitPrice = pos.sl;
          isSl = true;
        } else if (pos.tp != null && !isNaN(pos.tp) && pos.tp > 0 && cLow <= pos.tp) {
          closed = true;
          exitPrice = pos.tp;
          isTp = true;
        }
      }

      if (closed) {
        const profit = profitOf(pos, exitPrice);
        balanceRef.current += profit;
        setBalance(balanceRef.current);
        positionRef.current = null;
        setPosition(null);
        setClosedTrades((n) => n + 1);

        annotate(
          isTp ? `🎯 TP ${fmt$(profit)}` : `🛑 SL ${fmt$(profit)}`,
          cTime,
          exitPrice,
          profit >= 0 ? '#22c55e' : '#ef4444'
        );

        if (isTp) {
          toast.success(`🎯 Take Profit touché à ${exitPrice.toFixed(priceDigits)} : ${fmt$(profit)}`);
        } else {
          toast.error(`🛑 Stop Loss touché à ${exitPrice.toFixed(priceDigits)} : ${fmt$(profit)}`);
        }
      }
    }

    syncTradingOverlays();
  }, [annotate, priceDigits, profitOf, syncTradingOverlays]);

  // Exécution de la coupe à une bougie donnée
  const executeCutAtCandle = useCallback((targetCandle) => {
    const chart = chartRef.current;
    if (!chart || !targetCandle || !klineData.length) return;

    const targetTimestamp = targetCandle.timestamp || (targetCandle.time * 1000);
    const targetIdx = klineData.findIndex((c) => c.timestamp === targetTimestamp);
    if (targetIdx < 0) return;

    // Troncature du graphique
    chart.applyNewData(klineData.slice(0, targetIdx + 1));
    cutIndexRef.current = targetIdx;
    setCutIndex(targetIdx);
    indexRef.current = targetIdx;
    setIndex(targetIdx);

    // Suppression preview et dessin marqueur fixe de coupure
    chart.removeOverlay({ groupId: 'cut_preview' });
    chart.removeOverlay({ groupId: 'cut_marker' });
    chart.createOverlay({
      name: 'backtestCutLine',
      groupId: 'cut_marker',
      lock: true,
      points: [{ timestamp: targetTimestamp }],
    });

    isCuttingRef.current = false;
    setIsCutting(false);
    setMode('replay');
    setPlaying(false);

    drawPeriodBounds();
    syncTradingOverlays();

    toast.success(
      `✂️ Graphique coupé au ${fmtDateLong(targetTimestamp / 1000)}. Vous pouvez faire votre analyse, puis lancer le Replay.`
    );
  }, [drawPeriodBounds, klineData, syncTradingOverlays]);

  // Initialisation du graphique KLineCharts
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !klineData.length) return;
    ensureCustomOverlaysAndIndicators();
    const chart = init(el);
    chartRef.current = chart;
    chart.setStyles(buildKLineStyles(chartColors));
    const unbindMT4 = configureMT4Chart(chart);
    chart.setPriceVolumePrecision?.(priceDigits, 0);
    chart.applyNewData(klineData);
    drawPeriodBounds();

    indexRef.current = klineData.length - 1;
    setIndex(klineData.length - 1);
    setMode('full');
    setPlaying(false);
    setCutIndex(null);
    cutIndexRef.current = null;
    setIsCutting(false);
    isCuttingRef.current = false;

    setActiveIndicators({});
    indicatorPanesRef.current = {};

    // Écouteur pour la prévisualisation de la ligne de coupe verticale mobile
    const crosshairUnsub = chart.subscribeAction('onCrosshairChange', (data) => {
      if (!isCuttingRef.current) return;
      if (data?.kLineData?.timestamp) {
        hoveredCandleRef.current = data.kLineData;
        chart.removeOverlay({ groupId: 'cut_preview' });
        chart.createOverlay({
          name: 'verticalStraightLine',
          groupId: 'cut_preview',
          lock: true,
          points: [{ timestamp: data.kLineData.timestamp }],
          styles: { line: { color: '#f59e0b', size: 1.5, style: 'dashed', dashedValue: [5, 4] } },
        });
      }
    });

    // Écouteur pour le clic sur une bougie pour exécuter la coupe
    const candleClickUnsub = chart.subscribeAction('onCandleBarClick', (data) => {
      if (isCuttingRef.current) {
        const clicked = data?.data || hoveredCandleRef.current;
        if (clicked) {
          executeCutAtCandle(clicked);
        }
      }
    });

    return () => {
      unbindMT4?.();
      try {
        crosshairUnsub?.();
        candleClickUnsub?.();
      } catch (_) {}
      clearInterval(timerRef.current);
      dispose(el);
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klineData]);

  // Clic direct sur le conteneur pour assurer la coupe même si le clic n'atteint pas le corps de la bougie
  const handleContainerClick = () => {
    if (isCuttingRef.current && hoveredCandleRef.current) {
      executeCutAtCandle(hoveredCandleRef.current);
    }
  };

  // Redimensionnement
  useEffect(() => {
    const resize = () => chartRef.current?.resize();
    const timer = setTimeout(resize, 60);
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
    };
  }, [fullscreen, activeIndicators]);

  // Basculer l'outil Coupe
  const toggleCut = () => {
    if (isCutting) {
      setIsCutting(false);
      isCuttingRef.current = false;
      chartRef.current?.removeOverlay({ groupId: 'cut_preview' });
      toast.info('Mode Coupe désactivé');
    } else {
      setIsCutting(true);
      isCuttingRef.current = true;
      setPlaying(false);
      toast.info('✂️ Mode Coupe activé : survolez et cliquez sur la bougie souhaitée pour couper le graphique.');
    }
  };

  // Revenir au graphique complet
  const resetToFull = () => {
    const chart = chartRef.current;
    if (!chart) return;
    setPlaying(false);
    clearInterval(timerRef.current);
    setIsCutting(false);
    isCuttingRef.current = false;
    setCutIndex(null);
    cutIndexRef.current = null;

    chart.removeOverlay({ groupId: 'cut_preview' });
    chart.removeOverlay({ groupId: 'cut_marker' });

    chart.applyNewData(klineData);
    drawPeriodBounds();
    indexRef.current = klineData.length - 1;
    setIndex(klineData.length - 1);
    setMode('full');
    syncTradingOverlays();
    toast.info('Affichage complet restauré');
  };

  // Entrer en replay classique depuis la date de début
  const enterReplay = () => {
    const chart = chartRef.current;
    if (!chart || !klineData.length) return;
    const from = Math.max(startIdx, 0);
    chart.applyNewData(klineData.slice(0, from + 1));
    drawPeriodBounds();
    indexRef.current = from;
    setIndex(from);
    setCutIndex(from);
    cutIndexRef.current = from;
    setMode('replay');
    setPlaying(true);
  };

  // Déclencheur Replay externe
  useEffect(() => {
    if (replaySignal > 0 && klineData.length) enterReplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replaySignal]);

  // Boucle de lecture Replay (avancer / reculer selon vitesse choisie)
  useEffect(() => {
    if (!playing) return;
    const currentSpeedObj = REPLAY_SPEEDS.find((s) => s.key === speed) || REPLAY_SPEEDS[3];
    const delay = currentSpeedObj.delay;
    const dir = currentSpeedObj.dir;

    timerRef.current = setInterval(() => {
      const next = indexRef.current + dir;

      if (dir > 0) {
        // Avance dans le futur
        if (next > endIdx) {
          setPlaying(false);
          toast.info('Fin de la période de replay atteinte');
          return;
        }
        indexRef.current = next;
        chartRef.current?.updateData(klineData[next]);
        setIndex(next);
        processCandleTick(klineData[next]);
      } else {
        // Rembobinage dans le passé
        const minLimit = 0;
        if (next < minLimit) {
          setPlaying(false);
          toast.info('Début de l\'historique atteint');
          return;
        }
        indexRef.current = next;
        chartRef.current?.applyNewData(klineData.slice(0, next + 1));
        setIndex(next);
        drawPeriodBounds();
        syncTradingOverlays();
      }
    }, delay);

    return () => clearInterval(timerRef.current);
  }, [playing, speed, klineData, endIdx, drawPeriodBounds, processCandleTick, syncTradingOverlays]);

  // Avance pas à pas (1 bougie)
  const stepForward = () => {
    const next = indexRef.current + 1;
    if (next > endIdx) {
      toast.info('Fin de période atteinte');
      return;
    }
    indexRef.current = next;
    chartRef.current?.updateData(klineData[next]);
    setIndex(next);
    processCandleTick(klineData[next]);
  };

  // Recul pas à pas (1 bougie)
  const stepBackward = () => {
    const next = indexRef.current - 1;
    if (next < 0) {
      toast.info('Début atteint');
      return;
    }
    indexRef.current = next;
    chartRef.current?.applyNewData(klineData.slice(0, next + 1));
    setIndex(next);
    drawPeriodBounds();
    syncTradingOverlays();
  };

  // Recommencer le replay depuis la coupe ou le début
  const resetReplay = () => {
    const chart = chartRef.current;
    if (!chart || !klineData.length) return;
    setPlaying(false);
    clearInterval(timerRef.current);

    const from = cutIndexRef.current != null ? cutIndexRef.current : Math.max(startIdx, 0);
    chart.applyNewData(klineData.slice(0, from + 1));
    drawPeriodBounds();
    indexRef.current = from;
    setIndex(from);
    toast.info('Replay réinitialisé au point de départ');
  };

  // Ouvrir un trade au marché (Buy ou Sell avec SL & TP)
  const handleOpenMarket = (side) => {
    if (positionRef.current) {
      toast.error('Une position est déjà ouverte. Clôturez-la avant d\'en ouvrir une nouvelle.');
      return;
    }
    const cur = klineData[indexRef.current];
    if (!cur) return;

    const entryPrice = cur.close;
    const parsedLot = Number(orderLot) > 0 ? Number(orderLot) : (lot || 0.1);
    const parsedSl = orderSl !== '' ? parseFloat(orderSl) : null;
    const parsedTp = orderTp !== '' ? parseFloat(orderTp) : null;

    if (parsedSl != null && !isNaN(parsedSl)) {
      if (side === 'buy' && parsedSl >= entryPrice) {
        toast.error('Pour un Buy, le Stop Loss doit être inférieur au prix d\'entrée.');
        return;
      }
      if (side === 'sell' && parsedSl <= entryPrice) {
        toast.error('Pour un Sell, le Stop Loss doit être supérieur au prix d\'entrée.');
        return;
      }
    }
    if (parsedTp != null && !isNaN(parsedTp)) {
      if (side === 'buy' && parsedTp <= entryPrice) {
        toast.error('Pour un Buy, le Take Profit doit être supérieur au prix d\'entrée.');
        return;
      }
      if (side === 'sell' && parsedTp >= entryPrice) {
        toast.error('Pour un Sell, le Take Profit doit être inférieur au prix d\'entrée.');
        return;
      }
    }

    const newPos = {
      id: Date.now(),
      side,
      entryPrice,
      entryTime: cur.time || (cur.timestamp / 1000),
      lot: parsedLot,
      sl: parsedSl,
      tp: parsedTp,
    };

    positionRef.current = newPos;
    setPosition(newPos);
    annotate(
      side === 'buy' ? `▲ Buy ${parsedLot}` : `▼ Sell ${parsedLot}`,
      cur.time || (cur.timestamp / 1000),
      entryPrice,
      side === 'buy' ? '#22c55e' : '#ef4444'
    );
    syncTradingOverlays();
    toast.success(`Position ${side.toUpperCase()} ouverte à ${entryPrice.toFixed(priceDigits)}`);
  };

  // Placer un ordre en attente (Buy Limit, Sell Limit, Buy Stop, Sell Stop avec SL & TP)
  const handlePlacePendingOrder = () => {
    if (!orderPrice || isNaN(parseFloat(orderPrice))) {
      toast.error('Veuillez spécifier un prix valide pour l\'ordre en attente.');
      return;
    }
    const price = parseFloat(orderPrice);
    const parsedLot = Number(orderLot) > 0 ? Number(orderLot) : (lot || 0.1);
    const parsedSl = orderSl !== '' ? parseFloat(orderSl) : null;
    const parsedTp = orderTp !== '' ? parseFloat(orderTp) : null;

    const cur = klineData[indexRef.current];
    const newOrder = {
      id: Date.now(),
      type: orderType,
      price,
      lot: parsedLot,
      sl: parsedSl,
      tp: parsedTp,
      createdAtTime: cur?.time || Date.now() / 1000,
    };

    const nextPending = [...pendingOrdersRef.current, newOrder];
    pendingOrdersRef.current = nextPending;
    setPendingOrders(nextPending);
    syncTradingOverlays();
    toast.success(`Ordre ${orderType.replace('_', ' ').toUpperCase()} placé à ${price.toFixed(priceDigits)}`);
  };

  // Annuler un ordre en attente
  const handleCancelPendingOrder = (id) => {
    const nextPending = pendingOrdersRef.current.filter((o) => o.id !== id);
    pendingOrdersRef.current = nextPending;
    setPendingOrders(nextPending);
    syncTradingOverlays();
    toast.info('Ordre en attente annulé');
  };

  // Fermeture manuelle de position
  const handleClosePosition = () => {
    const pos = positionRef.current;
    if (!pos) return;
    const cur = klineData[indexRef.current];
    if (!cur) return;
    const profit = profitOf(pos, cur.close);
    balanceRef.current += profit;
    setBalance(balanceRef.current);
    positionRef.current = null;
    setPosition(null);
    setClosedTrades((n) => n + 1);

    const t = cur.time || (cur.timestamp / 1000);
    annotate(`✕ ${fmt$(profit)}`, t, cur.close, profit >= 0 ? '#22c55e' : '#ef4444');
    syncTradingOverlays();
    toast[profit >= 0 ? 'success' : 'error'](`Position fermée : ${fmt$(profit)}`);
  };

  // Réinitialiser la session de trading
  const resetSession = () => {
    positionRef.current = null;
    setPosition(null);
    pendingOrdersRef.current = [];
    setPendingOrders([]);
    balanceRef.current = initialBalance;
    setBalance(initialBalance);
    setClosedTrades(0);
    chartRef.current?.removeOverlay({ groupId: 'trades' });
    chartRef.current?.removeOverlay({ groupId: 'order_levels' });
    toast.info('Solde et trades réinitialisés');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border h-64 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement du graphique…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border h-64 text-sm text-destructive gap-3 p-4 text-center">
        <p className="font-semibold">{error}</p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }
  if (!candles?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border h-64 text-sm text-muted-foreground gap-2 p-4 text-center">
        <p className="font-medium">Aucune bougie disponible pour la période sélectionnée.</p>
        <p className="text-xs text-muted-foreground">Essayez d'élargir la période ou de changer d'unité de temps.</p>
        {onRetry && (
          <Button size="sm" variant="outline" className="mt-1" onClick={onRetry}>
            Actualiser
          </Button>
        )}
      </div>
    );
  }

  const cur = klineData[index] || klineData[klineData.length - 1];
  const floating = position && cur ? profitOf(position, cur.close) : 0;
  const equity = balance + floating;
  const spanTotal = Math.max(endIdx - startIdx, 1);
  const progressPct = Math.round(((Math.min(Math.max(index, startIdx), endIdx) - startIdx) / spanTotal) * 100);
  const digits = priceDigits;

  const wrapClass = fullscreen
    ? 'fixed inset-0 z-[60] flex flex-col gap-1.5 bg-background p-1.5 overflow-hidden'
    : 'flex-1 min-h-0 w-full flex flex-col gap-1.5 overflow-hidden';
  const chartHeight = fullscreen ? undefined : '100%';

  return (
    <ChartErrorBoundary>
      <div className={wrapClass}>
        {/* ==================== BARRE DE CONTRÔLE (TOOLBAR AVEC MENUS DÉROULANTS) ==================== */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-card p-1.5 sm:gap-2 sm:p-2 shrink-0" data-chart-toolbar data-replay-controls>
          {/* 1. Bouton CUT (Couper) */}
          <Button
            size="sm"
            variant={isCutting ? 'destructive' : cutIndex !== null ? 'secondary' : 'default'}
            onClick={toggleCut}
            className={`h-8 gap-1.5 font-semibold transition-all ${
              isCutting ? 'animate-pulse ring-2 ring-destructive' : cutIndex !== null ? 'border-amber-500/50 text-amber-500' : ''
            }`}
            title={isCutting ? 'Cliquez sur une bougie pour couper ou ré-appuyez pour annuler' : 'Activer la coupe mobile du graphique'}
          >
            <Scissors className="h-3.5 w-3.5" />
            <span className="text-xs">{isCutting ? 'Annuler' : cutIndex !== null ? 'Recouper' : 'Couper'}</span>
          </Button>

          {/* 2. Menu Déroulant VITESSE (×-3; ×-2; ×-1; ×+1; ×+2; ×+3) */}
          <Dropdown
            open={speedDropdownOpen}
            setOpen={setSpeedDropdownOpen}
            width="w-48"
            trigger={
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSpeedDropdownOpen((o) => !o)}
                className="h-8 px-2 text-xs font-bold gap-1 tabular-nums border-muted-foreground/30 hover:bg-muted"
                title="Vitesse et direction de rejeu"
              >
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>Vitesse : {REPLAY_SPEEDS.find((s) => s.key === speed)?.label || '×+1'}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            }
          >
            <div className="p-1.5 space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Vitesse de rejeu
              </div>
              <div className="grid grid-cols-2 gap-1">
                {REPLAY_SPEEDS.map((s) => {
                  const isSelected = speed === s.key;
                  const isNegative = s.dir < 0;
                  return (
                    <button
                      key={s.key}
                      onClick={() => { setSpeed(s.key); setSpeedDropdownOpen(false); }}
                      className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
                        isSelected
                          ? isNegative
                            ? 'bg-amber-600 text-white font-bold'
                            : 'bg-primary text-primary-foreground font-bold'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span>{isNegative ? '⏪ ' : '⏩ '}{s.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </Dropdown>

          {/* 3. Bouton PLAY / PAUSE */}
          <Button
            size="sm"
            variant={playing ? 'secondary' : 'default'}
            onClick={() => {
              if (!playing && mode === 'full' && cutIndex === null) {
                enterReplay();
              } else {
                setPlaying((p) => !p);
              }
            }}
            className="h-8 gap-1.5 font-bold px-3 shadow-xs"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span className="text-xs">{playing ? 'Pause' : 'Play'}</span>
          </Button>

          {/* Bougie précédente & Bougie suivante */}
          <Button size="sm" variant="outline" onClick={stepBackward} title="Reculer d'une bougie" className="px-2 h-8">
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={stepForward} title="Avancer d'une bougie" className="px-2 h-8">
            <SkipForward className="h-3.5 w-3.5" />
          </Button>

          {/* Recommencer */}
          <Button size="sm" variant="outline" onClick={resetReplay} title="Recommencer depuis le point de départ" className="px-2 h-8">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          {/* Vue complète (si coupé) */}
          {cutIndex !== null && (
            <Button size="sm" variant="ghost" onClick={resetToFull} className="gap-1 text-xs h-8 px-2">
              <Eye className="h-3.5 w-3.5" /> <span className="hidden md:inline">Vue complète</span>
            </Button>
          )}

          {/* 4. Menu Déroulant ORDRE / TRADE */}
          <Dropdown
            open={orderDropdownOpen}
            setOpen={setOrderDropdownOpen}
            width="w-80 sm:w-96"
            trigger={
              <Button
                size="sm"
                onClick={() => setOrderDropdownOpen((o) => !o)}
                className="h-8 gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-3 shadow-xs"
                title="Placer un ordre Buy / Sell / Ordre Limite ou Stop"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="text-xs">Ordre</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            }
          >
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Nouveau Trade ({symbolName || 'Position'})
                </span>
                <span className="text-xs font-mono font-bold text-primary">
                  {cur?.close ? cur.close.toFixed(digits) : '—'}
                </span>
              </div>

              {/* Choix du type d'ordre */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Type d'ordre
                </label>
                <div className="flex flex-wrap gap-1">
                  {ORDER_TYPES.map((t) => (
                    <Button
                      key={t.key}
                      size="sm"
                      variant={orderType === t.key ? 'default' : 'outline'}
                      className={`h-7 px-2 text-xs font-medium ${orderType === t.key ? 'shadow-xs' : ''}`}
                      onClick={() => {
                        setOrderType(t.key);
                        if (t.key !== 'market' && !orderPrice && cur) {
                          setOrderPrice(cur.close.toFixed(digits));
                        }
                      }}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Champ Prix si ordre en attente */}
              {orderType !== 'market' && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Prix de déclenchement
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    placeholder={cur ? cur.close.toFixed(digits) : 'Prix'}
                    className="w-full h-8 rounded-md border bg-background px-2.5 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {/* Lot, SL et TP en grille 3 colonnes */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Volume (Lot)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={orderLot}
                    onChange={(e) => setOrderLot(e.target.value)}
                    className="w-full h-8 rounded-md border bg-background px-2 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-red-500 block mb-1">
                    Stop Loss (SL)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={orderSl}
                      onChange={(e) => setOrderSl(e.target.value)}
                      placeholder="Prix SL"
                      className="w-full h-8 rounded-md border border-red-500/40 bg-background px-2 pr-5 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    {orderSl && (
                      <button
                        onClick={() => setOrderSl('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[11px]"
                        title="Effacer SL"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-green-500 block mb-1">
                    Take Profit (TP)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={orderTp}
                      onChange={(e) => setOrderTp(e.target.value)}
                      placeholder="Prix TP"
                      className="w-full h-8 rounded-md border border-green-500/40 bg-background px-2 pr-5 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    {orderTp && (
                      <button
                        onClick={() => setOrderTp('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[11px]"
                        title="Effacer TP"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Boutons d'Action */}
              <div className="pt-1">
                {orderType === 'market' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="h-9 gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold"
                      onClick={() => {
                        handleOpenMarket('buy');
                        setOrderDropdownOpen(false);
                      }}
                      disabled={!!position}
                    >
                      <ArrowUpCircle className="h-4 w-4" /> Buy {cur ? cur.close.toFixed(digits) : ''}
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold"
                      onClick={() => {
                        handleOpenMarket('sell');
                        setOrderDropdownOpen(false);
                      }}
                      disabled={!!position}
                    >
                      <ArrowDownCircle className="h-4 w-4" /> Sell {cur ? cur.close.toFixed(digits) : ''}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className={`w-full h-9 font-bold ${
                      orderType.includes('buy')
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                    onClick={() => {
                      handlePlacePendingOrder();
                      setOrderDropdownOpen(false);
                    }}
                  >
                    Placer {orderType.replace('_', ' ').toUpperCase()}
                  </Button>
                )}
              </div>
            </div>
          </Dropdown>

          {/* 5. Menu Déroulant Ordres en Attente (si existants) */}
          {pendingOrders.length > 0 && (
            <Dropdown
              open={pendingDropdownOpen}
              setOpen={setPendingDropdownOpen}
              width="w-72"
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPendingDropdownOpen((o) => !o)}
                  className="h-8 gap-1 border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-semibold px-2"
                >
                  <span>Attente ({pendingOrders.length})</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              }
            >
              <div className="p-2 space-y-1.5 max-h-60 overflow-y-auto">
                <div className="text-[11px] font-bold text-muted-foreground uppercase px-1">Ordres en attente</div>
                {pendingOrders.map((ord) => (
                  <div key={ord.id} className="flex items-center justify-between gap-2 rounded border bg-muted/40 p-1.5 text-xs font-mono">
                    <div>
                      <b className="text-primary">{ord.type.replace('_', ' ').toUpperCase()}</b> {ord.lot} @ {ord.price.toFixed(digits)}
                      {(ord.sl || ord.tp) && (
                        <div className="text-[10px] text-muted-foreground">
                          {ord.sl && <span className="text-red-500 mr-1.5">SL {Number(ord.sl).toFixed(digits)}</span>}
                          {ord.tp && <span className="text-green-500">TP {Number(ord.tp).toFixed(digits)}</span>}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleCancelPendingOrder(ord.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      title="Annuler"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </Dropdown>
          )}

          {/* Résumé Solde, Équité, Trades */}
          <div className="flex items-center gap-2 text-xs font-mono ml-auto">
            <span className="hidden xl:inline text-muted-foreground">
              📅 {cur?.time ? fmtDateLong(cur.time) : '—'}
            </span>
            <span className="border-l pl-2 border-border/50 hidden sm:inline">
              Solde: <b className="text-foreground">{balance.toFixed(2)} $</b>
            </span>
            <span className="border-l pl-2 border-border/50">
              Équité: <b className={equity >= initialBalance ? 'text-green-500' : 'text-red-500'}>{equity.toFixed(2)} $</b>
            </span>
          </div>

          {/* Contrôles du graphique */}
          <ChartZoomControls chartRef={chartRef} />
          <DrawToolsMenu chartRef={chartRef} overlayManager={overlayManager} />
          <IndicatorsMenu chartRef={chartRef} active={activeIndicators} setActive={setActiveIndicators} panesRef={indicatorPanesRef} />
          <ChartStyleButton onClick={() => setStyleModalOpen(true)} />
          <Button size="sm" variant="outline" onClick={() => setFullscreen((f) => !f)} title={fullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'} className="px-2 h-8">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Message d'aide si Coupe activée */}
        {isCutting && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/15 border border-amber-500/40 px-3 py-1.5 text-xs text-amber-500 shrink-0 animate-fadeIn">
            <Scissors className="h-4 w-4 shrink-0" />
            <span>Déplacez le curseur sur le graphique et cliquez sur la bougie où vous voulez couper l'historique pour commencer l'analyse.</span>
          </div>
        )}

        {/* Barre ultra-fine de Position active (si position ouverte) */}
        {position && (
          <div className="flex items-center justify-between gap-2 rounded-md bg-muted/80 px-2.5 py-1 border border-primary/20 text-xs shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto min-w-0">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${position.side === 'buy' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                {position.side} {position.lot}
              </span>
              <span className="font-mono shrink-0">Entrée : <b className="text-blue-500">{position.entryPrice.toFixed(digits)}</b></span>
              {position.sl && <span className="font-mono shrink-0">SL : <b className="text-red-500">{Number(position.sl).toFixed(digits)}</b></span>}
              {position.tp && <span className="font-mono shrink-0">TP : <b className="text-green-500">{Number(position.tp).toFixed(digits)}</b></span>}
              <span className="font-semibold font-mono shrink-0">
                P&L : <b className={floating >= 0 ? 'text-green-500' : 'text-red-500'}>{fmt$(floating)}</b>
              </span>
            </div>
            <Button size="sm" variant="destructive" onClick={handleClosePosition} className="h-6 px-2 text-[11px] gap-1 shrink-0 ml-auto">
              <XCircle className="h-3 w-3" /> Fermer
            </Button>
          </div>
        )}

        {/* Barre de progression temporelle ultra-fine (Slider) */}
        <div className="w-full px-1 py-0.5 flex items-center gap-2 shrink-0">
          <input
            type="range"
            min={startIdx}
            max={endIdx}
            value={Math.min(Math.max(index, startIdx), endIdx)}
            onChange={(e) => {
              const i = Number(e.target.value);
              const chart = chartRef.current;
              if (!chart) return;
              chart.applyNewData(klineData.slice(0, i + 1));
              drawPeriodBounds();
              indexRef.current = i;
              setIndex(i);
              syncTradingOverlays();
            }}
            className="w-full h-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary hover:h-1.5 transition-all"
            title="Curseur temporel de replay"
          />
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 font-mono">
            {progressPct}%
          </span>
        </div>

        {/* ==================== CONTENEUR DU GRAPHIQUE ==================== */}
        <div
          className={`relative flex-1 min-h-[480px] sm:min-h-[600px] w-full rounded-none border-0 overflow-hidden transition-colors ${
            isCutting ? 'cursor-crosshair' : ''
          }`}
          style={{ height: chartHeight, backgroundColor: chartColors?.bgColor || undefined }}
          data-chart-container
          onClick={handleContainerClick}
        >
          <ChartStyleSettingsModal
            open={styleModalOpen}
            onClose={() => setStyleModalOpen(false)}
            styles={chartColors}
            onApplyStyles={applyStyles}
            onApplyPreset={applyPreset}
            onReset={resetDefault}
          />

          <SelectedOverlayBar
            overlay={overlayManager.selectedOverlay}
            chartRef={chartRef}
            onDelete={overlayManager.deleteSelected}
            onDeselect={() => overlayManager.setSelectedOverlay(null)}
          />

          {/* En-tête flottant du graphique */}
          <div className="pointer-events-none absolute left-1 top-1 z-20 flex items-center gap-2 rounded-md bg-background/90 backdrop-blur-sm border px-2 py-1 shadow-sm sm:left-2 sm:top-2">
            <div>
              <p className="text-[10px] font-semibold text-primary sm:text-xs leading-none mb-0.5">
                {symbolName} <span className="text-foreground">{timeframe}</span>
              </p>
              {cur && typeof cur.close === 'number' && typeof cur.open === 'number' && (
                <p className="text-[9px] tabular-nums text-muted-foreground sm:text-[11px] leading-tight">
                  O {cur.open.toFixed(digits)} H {(cur.high ?? cur.open).toFixed(digits)} L {(cur.low ?? cur.close).toFixed(digits)}{' '}
                  <span className={cur.close >= cur.open ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                    C {cur.close.toFixed(digits)}
                  </span>
                </p>
              )}
            </div>
            <div className="h-6 w-px bg-border mx-0.5 hidden xs:block" />
            <CandleCountdownBadge timeframe={timeframe} referenceTime={cur?.time ? cur.time * 1000 : null} />
          </div>

          <div ref={containerRef} className="w-full h-full" />
          <ChartWatermark />
        </div>
      </div>
    </ChartErrorBoundary>
  );
}
