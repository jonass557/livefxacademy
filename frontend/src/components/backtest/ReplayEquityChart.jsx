import React, { useEffect, useRef } from 'react';
import { createChart, AreaSeries } from 'lightweight-charts';

/**
 * Courbe d'équité (lightweight-charts v5) synchronisable avec le replay :
 * - currentTime == null → courbe complète (vue normale)
 * - currentTime fourni  → seuls les points dont t <= currentTime sont affichés,
 *   mis à jour incrémentalement au fil du replay.
 */
export default function ReplayEquityChart({ points, currentTime }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const ptrRef = useRef(0); // nombre de points déjà poussés en mode replay

  // Création / destruction du graphique.
  useEffect(() => {
    if (!ref.current || !points?.length) return;
    const chart = createChart(ref.current, {
      height: 180,
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
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [points]);

  // Synchronisation avec le temps courant du replay.
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !points?.length) return;

    if (currentTime == null) {
      // Vue complète.
      series.setData(points.map((p) => ({ time: p.t, value: p.equity })));
      chart.timeScale().fitContent();
      ptrRef.current = points.length;
      return;
    }

    // Combien de points sont visibles à ce temps ?
    let n = ptrRef.current;
    if (n > 0 && points[n - 1]?.t > currentTime) n = 0; // retour en arrière (seek/restart)
    if (n === 0) {
      const visible = [];
      while (n < points.length && points[n].t <= currentTime) { visible.push({ time: points[n].t, value: points[n].equity }); n++; }
      series.setData(visible);
      chart.timeScale().fitContent();
    } else {
      // Avance incrémentale : pousser les nouveaux points.
      while (n < points.length && points[n].t <= currentTime) {
        series.update({ time: points[n].t, value: points[n].equity });
        n++;
      }
    }
    ptrRef.current = n;
  }, [points, currentTime]);

  return <div ref={ref} className="w-full" />;
}
