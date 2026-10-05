import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import api, { API_URL } from '../../lib/api';
import { registerOverlay, registerIndicator, IndicatorSeries } from 'klinecharts';

const assetUrl = (url) => url ? (url.startsWith('http') ? url : `${API_URL}${url}`) : '';
import { Button } from '../ui/button';
import {
  Slash, PenLine, MoveUpRight, Minus, SeparatorVertical, Tag,
  Equal, AlignJustify, Square, Type, Eraser, ChevronDown, Pencil, FunctionSquare,
  ArrowRight, ArrowUpRight, MapPin, ArrowUp, ArrowDown, TrendingUp, TrendingDown,
  Paintbrush, Waves, GitCommit, Grid, Palette, RotateCcw, Settings, X, Check,
  Trash2, Clock, Route,
} from 'lucide-react';

// ---- Constantes et Thèmes (façon MT4 / MT5 & TradingView) ----

export const CHART_STYLE_STORAGE_KEY = 'livefx_chart_custom_styles_v2';

export const DEFAULT_CHART_PRESETS = {
  tradingview_dark: {
    id: 'tradingview_dark',
    name: 'TradingView Sombre (Défaut)',
    upColor: '#22c55e',
    downColor: '#ef4444',
    upBorderColor: '#22c55e',
    downBorderColor: '#ef4444',
    upWickColor: '#22c55e',
    downWickColor: '#ef4444',
    bgColor: '#111827',
    gridColor: 'rgba(148,163,184,0.1)',
    crosshairColor: '#6b7280',
    textColor: '#9ca3af',
  },
  tradingview_light: {
    id: 'tradingview_light',
    name: 'TradingView Clair',
    upColor: '#089981',
    downColor: '#f23645',
    upBorderColor: '#089981',
    downBorderColor: '#f23645',
    upWickColor: '#089981',
    downWickColor: '#f23645',
    bgColor: '#ffffff',
    gridColor: 'rgba(0,0,0,0.08)',
    crosshairColor: '#9ca3af',
    textColor: '#374151',
  },
  mt5_classic: {
    id: 'mt5_classic',
    name: 'MetaTrader 5 / 4 (Vert sur Noir)',
    upColor: '#00ff00',
    downColor: '#000000',
    upBorderColor: '#00ff00',
    downBorderColor: '#00ff00',
    upWickColor: '#00ff00',
    downWickColor: '#00ff00',
    bgColor: '#000000',
    gridColor: 'rgba(0,180,0,0.2)',
    crosshairColor: '#00ff00',
    textColor: '#00ff00',
  },
  mt5_color: {
    id: 'mt5_color',
    name: 'MetaTrader Vert & Rouge (Fond Noir)',
    upColor: '#00ff00',
    downColor: '#ff0000',
    upBorderColor: '#00ff00',
    downBorderColor: '#ff0000',
    upWickColor: '#00ff00',
    downWickColor: '#ff0000',
    bgColor: '#000000',
    gridColor: 'rgba(255,255,255,0.1)',
    crosshairColor: '#ffffff',
    textColor: '#cccccc',
  },
  monochrome: {
    id: 'monochrome',
    name: 'Noir & Blanc / Monochrome',
    upColor: '#ffffff',
    downColor: '#000000',
    upBorderColor: '#ffffff',
    downBorderColor: '#ffffff',
    upWickColor: '#ffffff',
    downWickColor: '#ffffff',
    bgColor: '#18181b',
    gridColor: 'rgba(255,255,255,0.08)',
    crosshairColor: '#a1a1aa',
    textColor: '#a1a1aa',
  },
  blue_orange: {
    id: 'blue_orange',
    name: 'Bleu & Orange (Moderne)',
    upColor: '#3b82f6',
    downColor: '#f97316',
    upBorderColor: '#3b82f6',
    downBorderColor: '#f97316',
    upWickColor: '#3b82f6',
    downWickColor: '#f97316',
    bgColor: '#0b0f19',
    gridColor: 'rgba(59,130,246,0.12)',
    crosshairColor: '#60a5fa',
    textColor: '#93c5fd',
  },
};

export function getStoredChartStyles() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CHART_STYLE_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CHART_PRESETS.tradingview_dark, ...parsed };
    }
  } catch (_) {}
  return { ...DEFAULT_CHART_PRESETS.tradingview_dark };
}

export function saveStoredChartStyles(styles) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CHART_STYLE_STORAGE_KEY, JSON.stringify(styles));
    }
  } catch (_) {}
}

export function hexToRgba(color, alpha = 0.2) {
  if (!color) return `rgba(59, 130, 246, ${alpha})`;
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/, `${alpha})`);
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export function buildKLineStyles(settings = {}) {
  const s = { ...DEFAULT_CHART_PRESETS.tradingview_dark, ...settings };
  return {
    grid: {
      horizontal: { color: s.gridColor || 'rgba(148,163,184,0.1)' },
      vertical: { color: s.gridColor || 'rgba(148,163,184,0.1)' },
    },
    candle: {
      type: 'candle_solid',
      bar: {
        upColor: s.upColor,
        downColor: s.downColor,
        noChangeColor: s.upColor,
        upBorderColor: s.upBorderColor,
        downBorderColor: s.downBorderColor,
        noChangeBorderColor: s.upBorderColor,
        upWickColor: s.upWickColor,
        downWickColor: s.downWickColor,
        noChangeWickColor: s.upWickColor,
      },
      priceMark: {
        last: {
          upColor: s.upColor,
          downColor: s.downColor,
          noChangeColor: s.upColor,
        },
      },
      tooltip: { showRule: 'none' },
    },
    xAxis: {
      axisLine: { color: s.gridColor || 'rgba(148,163,184,0.3)' },
      tickText: { color: s.textColor || '#9ca3af' },
    },
    yAxis: {
      size: 72,
      inside: false,
      axisLine: { color: s.gridColor || 'rgba(148,163,184,0.3)' },
      tickText: { color: s.textColor || '#9ca3af' },
    },
    crosshair: {
      horizontal: { line: { color: s.crosshairColor || '#6b7280' }, text: { backgroundColor: '#374151', color: '#ffffff' } },
      vertical: { line: { color: s.crosshairColor || '#6b7280' }, text: { backgroundColor: '#374151', color: '#ffffff' } },
    },
    overlay: {
      point: {
        color: '#2563eb',
        borderColor: '#ffffff',
        borderSize: 1.5,
        radius: 4,
        activeColor: '#ef4444',
        activeBorderColor: '#ffffff',
        activeBorderSize: 2,
        activeRadius: 5.5,
      },
      line: {
        style: 'solid',
        smooth: false,
        color: '#3b82f6',
        size: 2.5,
        dashedValue: [2, 2],
      },
      rect: {
        style: 'stroke_fill',
        color: 'rgba(59, 130, 246, 0.18)',
        borderColor: '#3b82f6',
        borderSize: 2,
        borderRadius: 0,
      },
      polygon: {
        style: 'stroke_fill',
        color: 'rgba(59, 130, 246, 0.18)',
        borderColor: '#3b82f6',
        borderSize: 2,
      },
      circle: {
        style: 'stroke_fill',
        color: 'rgba(59, 130, 246, 0.18)',
        borderColor: '#3b82f6',
        borderSize: 2,
      },
      arc: {
        style: 'stroke',
        color: '#3b82f6',
        size: 2.5,
      },
      text: {
        color: '#ffffff',
        size: 13,
        family: 'sans-serif',
        weight: 'bold',
        paddingLeft: 6,
        paddingRight: 6,
        paddingTop: 4,
        paddingBottom: 4,
        borderStyle: 'solid',
        borderSize: 1.5,
        borderColor: '#3b82f6',
        borderRadius: 4,
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
      },
    },
  };
}

export const CHART_STYLES = buildKLineStyles(getStoredChartStyles());

// Outils de dessin natifs & personnalisés KLineCharts (façon TradingView & MT5)
export const DRAW_TOOLS = [
  // Lignes & Canaux
  { name: 'segment', label: 'Ligne de tendance', Icon: Slash, group: 'Lignes' },
  { name: 'path', label: 'Trajectoire / Path (TradingView)', Icon: Route, group: 'Lignes' },
  { name: 'horizontalRayLine', label: 'Demi-droite horizontale', Icon: ArrowRight, group: 'Lignes' },
  { name: 'rayLine', label: 'Demi-droite orientée', Icon: MoveUpRight, group: 'Lignes' },
  { name: 'horizontalStraightLine', label: 'Ligne horizontale', Icon: Minus, group: 'Lignes' },
  { name: 'verticalStraightLine', label: 'Ligne verticale', Icon: SeparatorVertical, group: 'Lignes' },
  { name: 'priceLine', label: 'Ligne de prix', Icon: Tag, group: 'Lignes' },
  { name: 'parallelStraightLine', label: 'Canal parallèle', Icon: Equal, group: 'Lignes' },
  // Formes & Gann
  { name: 'rect', label: 'Rectangle / Zone', Icon: Square, group: 'Formes' },
  { name: 'fibonacciLine', label: 'Retracement Fibonacci', Icon: AlignJustify, group: 'Formes' },
  { name: 'gannBox', label: 'Boîte de Gann', Icon: Grid, group: 'Formes' },
  // Positions & Risk-Reward
  { name: 'positionLong', label: 'Position Long (Achat / R:R)', Icon: TrendingUp, group: 'Positions' },
  { name: 'positionShort', label: 'Position Short (Vente / R:R)', Icon: TrendingDown, group: 'Positions' },
  // Flèches & Signaux
  { name: 'arrow', label: 'Flèche', Icon: ArrowUpRight, group: 'Flèches' },
  { name: 'arrowMarker', label: 'Marqueur flèche', Icon: MapPin, group: 'Flèches' },
  { name: 'arrowUp', label: 'Flèche signal haut (▲)', Icon: ArrowUp, group: 'Flèches' },
  { name: 'arrowDown', label: 'Flèche signal bas (▼)', Icon: ArrowDown, group: 'Flèches' },
  // Elliott & Tracés
  { name: 'elliottImpulse', label: "Vague d'Elliott (1-2-3-4-5)", Icon: Waves, group: 'Elliott & Dessin' },
  { name: 'elliottCorrection', label: "Vague d'Elliott (A-B-C)", Icon: GitCommit, group: 'Elliott & Dessin' },
  { name: 'brush', label: 'Pinceau (main levée)', Icon: Paintbrush, group: 'Elliott & Dessin' },
  { name: 'text', label: 'Texte / Annotation', Icon: Type, group: 'Elliott & Dessin' },
];

// Indicateurs intégrés et personnalisés
export const MAIN_INDICATORS = ['MA', 'EMA', 'BOLL', 'ICT_KZ'];
export const SUB_INDICATORS = ['RSI', 'MACD', 'KDJ'];

export const INDICATOR_LABELS = {
  MA: 'Moyenne Mobile (MA)',
  EMA: 'Moyenne Exponentielle (EMA)',
  BOLL: 'Bandes de Bollinger (BOLL)',
  ICT_KZ: 'ICT Kill Zones (Sessions)',
  RSI: 'RSI (Relative Strength)',
  MACD: 'MACD',
  KDJ: 'Oscillateur KDJ',
};

// Enregistrement unique de tous les overlays personnalisés et de l'indicateur ICT Kill Zones
let customOverlaysRegistered = false;
export function ensureCustomOverlaysAndIndicators() {
  if (customOverlaysRegistered) return;
  try {
  // 0. Segment / Ligne de tendance personnalisée avec large zone de capture tactile pour mobile
  registerOverlay({
    name: 'segment',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (!coordinates || coordinates.length < 2) return [];
      const [p1, p2] = coordinates;
      const lineColor = overlay?.styles?.line?.color || '#3b82f6';
      const lineSize = overlay?.styles?.line?.size || 2;
      const lineStyle = overlay?.styles?.line?.style || 'solid';
      const dashedValue = overlay?.styles?.line?.dashedValue || (lineStyle === 'dashed' ? [6, 4] : undefined);

      const figures = [
        {
          type: 'line',
          attrs: { coordinates: [p1, p2] },
          styles: {
            color: lineColor,
            size: lineSize,
            style: lineStyle,
            dashedValue,
          },
        },
      ];

      // Couloir tactile invisible élargi (28px de large) pour attraper/sélectionner très facilement la ligne au doigt
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const ux = (-dy / len) * 14;
        const uy = (dx / len) * 14;
        figures.push({
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: p1.x + ux, y: p1.y + uy },
              { x: p2.x + ux, y: p2.y + uy },
              { x: p2.x - ux, y: p2.y - uy },
              { x: p1.x - ux, y: p1.y - uy },
            ],
          },
          styles: { style: 'fill', color: 'rgba(0,0,0,0)' },
        });
      }

      // Cibles tactiles invisibles élargies sur les deux extrémités
      figures.push(
        { type: 'circle', attrs: { x: p1.x, y: p1.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: p2.x, y: p2.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } }
      );

      return figures;
    },
  });

  // 1. Trajectoire / Path façon TradingView (multi-segments consécutifs avec flèche de fin)
  registerOverlay({
    name: 'path',
    totalStep: 30,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (!coordinates || coordinates.length < 1) return [];
      const lineColor = overlay?.styles?.line?.color || '#3b82f6';
      const lineSize = overlay?.styles?.line?.size || 2.5;
      const lineStyle = overlay?.styles?.line?.style || 'solid';
      const dashedValue = overlay?.styles?.line?.dashedValue || (lineStyle === 'dashed' ? [6, 4] : undefined);

      const figures = [
        {
          type: 'line',
          attrs: { coordinates },
          styles: {
            color: lineColor,
            size: lineSize,
            style: lineStyle,
            dashedValue,
          },
        },
      ];

      // Couloirs tactiles invisibles élargis pour manipuler chaque segment au doigt
      for (let i = 1; i < coordinates.length; i++) {
        const pA = coordinates[i - 1];
        const pB = coordinates[i];
        const dx = pB.x - pA.x;
        const dy = pB.y - pA.y;
        const len = Math.hypot(dx, dy);
        if (len > 0) {
          const ux = (-dy / len) * 14;
          const uy = (dx / len) * 14;
          figures.push({
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: pA.x + ux, y: pA.y + uy },
                { x: pB.x + ux, y: pB.y + uy },
                { x: pB.x - ux, y: pB.y - uy },
                { x: pA.x - ux, y: pA.y - uy },
              ],
            },
            styles: { style: 'fill', color: 'rgba(0,0,0,0)' },
          });
        }
      }

      // Cibles tactiles invisibles sur chaque sommet
      coordinates.forEach((pt) => {
        figures.push({
          type: 'circle',
          attrs: { x: pt.x, y: pt.y, r: 18 },
          styles: { style: 'fill', color: 'rgba(0,0,0,0)' },
        });
      });

      // Flèche terminale orientée
      if (coordinates.length >= 2) {
        const p1 = coordinates[coordinates.length - 2];
        const p2 = coordinates[coordinates.length - 1];
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const headLen = Math.max(12, lineSize * 4.5);
        const w1 = {
          x: p2.x - headLen * Math.cos(angle - Math.PI / 6),
          y: p2.y - headLen * Math.sin(angle - Math.PI / 6),
        };
        const w2 = {
          x: p2.x - headLen * Math.cos(angle + Math.PI / 6),
          y: p2.y - headLen * Math.sin(angle + Math.PI / 6),
        };
        figures.push({
          type: 'polygon',
          attrs: { coordinates: [p2, w1, w2] },
          styles: {
            style: 'fill',
            color: lineColor,
          },
        });
      }

      return figures;
    },
  });

  // 2. Rectangle / Zone avec couleur dynamique en direct & saisie tactile facilitée
  registerOverlay({
    name: 'rect',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (!coordinates || coordinates.length < 2) return [];
      const [a, b] = coordinates;
      const strokeColor = overlay?.styles?.polygon?.borderColor || overlay?.styles?.rect?.borderColor || overlay?.styles?.line?.color || '#3b82f6';
      const strokeSize = overlay?.styles?.polygon?.borderSize || overlay?.styles?.rect?.borderSize || overlay?.styles?.line?.size || 1.5;
      const strokeStyle = overlay?.styles?.polygon?.borderStyle || overlay?.styles?.rect?.borderStyle || overlay?.styles?.line?.style || 'solid';
      const dashedValue = overlay?.styles?.polygon?.borderDashedValue || overlay?.styles?.rect?.borderDashedValue || (strokeStyle === 'dashed' ? [6, 4] : undefined);
      const fillColor = overlay?.styles?.polygon?.color || overlay?.styles?.rect?.color || hexToRgba(strokeColor, 0.18);

      const figures = [
        {
          type: 'polygon',
          attrs: { coordinates: [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }] },
          styles: {
            style: 'stroke_fill',
            color: fillColor,
            borderColor: strokeColor,
            borderSize: strokeSize,
            borderStyle: strokeStyle,
            borderDashedValue: dashedValue,
          },
        },
      ];

      // Cibles tactiles invisibles sur les coins pour étirer le rectangle au doigt sur mobile
      figures.push(
        { type: 'circle', attrs: { x: a.x, y: a.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: b.x, y: a.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: b.x, y: b.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: a.x, y: b.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } }
      );

      return figures;
    },
  });

  // 3. Texte / Annotation
  registerOverlay({
    name: 'text',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (!coordinates || coordinates.length < 1) return [];
      const text = typeof overlay.extendData === 'string' ? overlay.extendData : (overlay.extendData?.text || 'Note');
      const borderColor = overlay?.styles?.text?.borderColor || overlay?.styles?.line?.color || '#3b82f6';
      return [{
        type: 'text',
        attrs: { x: coordinates[0].x, y: coordinates[0].y - 8, text, align: 'left', baseline: 'bottom' },
        styles: {
          color: '#ffffff',
          size: 13,
          family: 'sans-serif',
          weight: 'bold',
          paddingLeft: 6,
          paddingRight: 6,
          paddingTop: 3,
          paddingBottom: 3,
          backgroundColor: 'rgba(31, 41, 55, 0.85)',
          borderColor: borderColor,
          borderSize: 1,
          borderRadius: 4,
        },
      }];
    },
  });

  // 4. Arrow (Flèche orientée)
  registerOverlay({
    name: 'arrow',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (!coordinates || coordinates.length < 2) return [];
      const [p1, p2] = coordinates;
      const color = overlay?.styles?.line?.color || '#3b82f6';
      const size = overlay?.styles?.line?.size || 2;
      const lineStyle = overlay?.styles?.line?.style || 'solid';
      const dashedValue = overlay?.styles?.line?.dashedValue || (lineStyle === 'dashed' ? [6, 4] : undefined);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const headLen = Math.max(14, size * 5);
      const w1 = { x: p2.x - headLen * Math.cos(angle - Math.PI / 6), y: p2.y - headLen * Math.sin(angle - Math.PI / 6) };
      const w2 = { x: p2.x - headLen * Math.cos(angle + Math.PI / 6), y: p2.y - headLen * Math.sin(angle + Math.PI / 6) };
      return [
        { type: 'line', attrs: { coordinates: [p1, p2] }, styles: { size, color, style: lineStyle, dashedValue } },
        { type: 'polygon', attrs: { coordinates: [p2, w1, w2] }, styles: { style: 'fill', color } },
        { type: 'circle', attrs: { x: p1.x, y: p1.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: p2.x, y: p2.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
      ];
    },
  });

  // 5. Arrow Marker (Marqueur flèche)
  registerOverlay({
    name: 'arrowMarker',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (!coordinates || coordinates.length < 1) return [];
      const p = coordinates[0];
      const color = overlay?.styles?.line?.color || '#3b82f6';
      return [
        { type: 'circle', attrs: { x: p.x, y: p.y - 20, r: 8 }, styles: { style: 'fill', color } },
        { type: 'line', attrs: { coordinates: [{ x: p.x, y: p.y - 12 }, { x: p.x, y: p.y - 2 }] }, styles: { size: 2, color } },
        { type: 'polygon', attrs: { coordinates: [{ x: p.x, y: p.y }, { x: p.x - 5, y: p.y - 6 }, { x: p.x + 5, y: p.y - 6 }] }, styles: { style: 'fill', color } },
      ];
    },
  });

  // 6. Arrow Up (Signal Haussier ▲)
  registerOverlay({
    name: 'arrowUp',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (!coordinates || coordinates.length < 1) return [];
      const p = coordinates[0];
      const color = overlay?.styles?.line?.color || overlay?.styles?.polygon?.borderColor || '#22c55e';
      return [
        { type: 'polygon', attrs: { coordinates: [{ x: p.x, y: p.y - 16 }, { x: p.x - 8, y: p.y }, { x: p.x + 8, y: p.y }] }, styles: { style: 'fill', color } },
        { type: 'circle', attrs: { x: p.x, y: p.y - 8, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
      ];
    },
  });

  // 7. Arrow Down (Signal Baissier ▼)
  registerOverlay({
    name: 'arrowDown',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (!coordinates || coordinates.length < 1) return [];
      const p = coordinates[0];
      const color = overlay?.styles?.line?.color || overlay?.styles?.polygon?.borderColor || '#ef4444';
      return [
        { type: 'polygon', attrs: { coordinates: [{ x: p.x, y: p.y + 16 }, { x: p.x - 8, y: p.y }, { x: p.x + 8, y: p.y }] }, styles: { style: 'fill', color } },
        { type: 'circle', attrs: { x: p.x, y: p.y + 8, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
      ];
    },
  });

  // 7. Position Long (Risk / Reward TradingView)
  registerOverlay({
    name: 'positionLong',
    totalStep: 4,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay, precision }) => {
      if (coordinates.length < 2) return [];
      const pEntry = coordinates[0];
      const pTp = coordinates[1];
      const pSl = coordinates[2] || { x: pTp.x, y: pEntry.y + (pEntry.y - pTp.y) * 0.5 };
      const left = Math.min(pEntry.x, pTp.x, pSl.x);
      const right = Math.max(pEntry.x + 130, pTp.x, pSl.x);

      const entryPrice = overlay.points[0]?.value || 0;
      const tpPrice = overlay.points[1]?.value || 0;
      const slPrice = overlay.points[2]?.value || (entryPrice - Math.abs(tpPrice - entryPrice) * 0.5);
      const risk = Math.abs(entryPrice - slPrice);
      const reward = Math.abs(tpPrice - entryPrice);
      const rr = risk > 0 ? (reward / risk).toFixed(2) : '—';
      const dec = precision?.price || 4;

      return [
        {
          type: 'polygon',
          attrs: { coordinates: [{ x: left, y: pEntry.y }, { x: right, y: pEntry.y }, { x: right, y: pTp.y }, { x: left, y: pTp.y }] },
          styles: { style: 'stroke_fill', color: 'rgba(34, 197, 94, 0.2)', borderColor: '#22c55e', borderSize: 1 },
        },
        {
          type: 'polygon',
          attrs: { coordinates: [{ x: left, y: pEntry.y }, { x: right, y: pEntry.y }, { x: right, y: pSl.y }, { x: left, y: pSl.y }] },
          styles: { style: 'stroke_fill', color: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', borderSize: 1 },
        },
        {
          type: 'line',
          attrs: { coordinates: [{ x: left, y: pEntry.y }, { x: right, y: pEntry.y }] },
          styles: { size: 1.5, color: '#3b82f6' },
        },
        {
          type: 'text',
          attrs: { x: left + 6, y: pTp.y + 14, text: `TP : ${tpPrice.toFixed(dec)} | R:R ${rr}` },
          styles: { color: '#22c55e', size: 11, weight: 'bold' },
        },
        {
          type: 'text',
          attrs: { x: left + 6, y: pSl.y - 6, text: `SL : ${slPrice.toFixed(dec)}` },
          styles: { color: '#ef4444', size: 11, weight: 'bold' },
        },
        {
          type: 'text',
          attrs: { x: left + 6, y: pEntry.y - 4, text: `Entrée : ${entryPrice.toFixed(dec)}` },
          styles: { color: '#93c5fd', size: 11 },
        },
        { type: 'circle', attrs: { x: pEntry.x, y: pEntry.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: pTp.x, y: pTp.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: pSl.x, y: pSl.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
      ];
    },
  });

  // 8. Position Short (Risk / Reward TradingView)
  registerOverlay({
    name: 'positionShort',
    totalStep: 4,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay, precision }) => {
      if (coordinates.length < 2) return [];
      const pEntry = coordinates[0];
      const pTp = coordinates[1];
      const pSl = coordinates[2] || { x: pTp.x, y: pEntry.y - (pTp.y - pEntry.y) * 0.5 };
      const left = Math.min(pEntry.x, pTp.x, pSl.x);
      const right = Math.max(pEntry.x + 130, pTp.x, pSl.x);

      const entryPrice = overlay.points[0]?.value || 0;
      const tpPrice = overlay.points[1]?.value || 0;
      const slPrice = overlay.points[2]?.value || (entryPrice + Math.abs(entryPrice - tpPrice) * 0.5);
      const risk = Math.abs(slPrice - entryPrice);
      const reward = Math.abs(entryPrice - tpPrice);
      const rr = risk > 0 ? (reward / risk).toFixed(2) : '—';
      const dec = precision?.price || 4;

      return [
        {
          type: 'polygon',
          attrs: { coordinates: [{ x: left, y: pEntry.y }, { x: right, y: pEntry.y }, { x: right, y: pTp.y }, { x: left, y: pTp.y }] },
          styles: { style: 'stroke_fill', color: 'rgba(34, 197, 94, 0.2)', borderColor: '#22c55e', borderSize: 1 },
        },
        {
          type: 'polygon',
          attrs: { coordinates: [{ x: left, y: pEntry.y }, { x: right, y: pEntry.y }, { x: right, y: pSl.y }, { x: left, y: pSl.y }] },
          styles: { style: 'stroke_fill', color: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', borderSize: 1 },
        },
        {
          type: 'line',
          attrs: { coordinates: [{ x: left, y: pEntry.y }, { x: right, y: pEntry.y }] },
          styles: { size: 1.5, color: '#3b82f6' },
        },
        {
          type: 'text',
          attrs: { x: left + 6, y: pTp.y - 6, text: `TP : ${tpPrice.toFixed(dec)} | R:R ${rr}` },
          styles: { color: '#22c55e', size: 11, weight: 'bold' },
        },
        {
          type: 'text',
          attrs: { x: left + 6, y: pSl.y + 14, text: `SL : ${slPrice.toFixed(dec)}` },
          styles: { color: '#ef4444', size: 11, weight: 'bold' },
        },
        {
          type: 'text',
          attrs: { x: left + 6, y: pEntry.y - 4, text: `Entrée : ${entryPrice.toFixed(dec)}` },
          styles: { color: '#93c5fd', size: 11 },
        },
        { type: 'circle', attrs: { x: pEntry.x, y: pEntry.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: pTp.x, y: pTp.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: pSl.x, y: pSl.y, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
      ];
    },
  });

  // 9. Brush (Pinceau tracé libre)
  registerOverlay({
    name: 'brush',
    totalStep: 2,
    performEventMoveForDrawing: ({ points, performPoint }) => {
      points.push(performPoint);
    },
    createPointFigures: ({ coordinates, overlay }) => {
      const color = overlay?.styles?.line?.color || '#f59e0b';
      const size = overlay?.styles?.line?.size || 2.5;
      return [{
        type: 'line',
        attrs: { coordinates },
        styles: { size, color },
      }];
    },
  });

  // 10. Elliott Impulse Wave (1-2-3-4-5)
  registerOverlay({
    name: 'elliottImpulse',
    totalStep: 7,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length < 2) return [];
      const labels = ['(0)', '(1)', '(2)', '(3)', '(4)', '(5)'];
      const lineColor = overlay?.styles?.line?.color || '#eab308';
      const figures = [
        { type: 'line', attrs: { coordinates }, styles: { size: 2, color: lineColor } },
      ];
      coordinates.forEach((pt, idx) => {
        figures.push({
          type: 'text',
          attrs: { x: pt.x, y: pt.y - 12, text: labels[idx] || `(${idx})`, align: 'center', baseline: 'middle' },
          styles: { color: '#000000', size: 11, weight: 'bold', backgroundColor: lineColor, borderRadius: 8, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2 },
        });
        figures.push({
          type: 'circle',
          attrs: { x: pt.x, y: pt.y, r: 18 },
          styles: { style: 'fill', color: 'rgba(0,0,0,0)' },
        });
      });
      return figures;
    },
  });

  // 11. Elliott Correction Wave (A-B-C)
  registerOverlay({
    name: 'elliottCorrection',
    totalStep: 5,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length < 2) return [];
      const labels = ['(0)', '(A)', '(B)', '(C)'];
      const lineColor = overlay?.styles?.line?.color || '#ec4899';
      const figures = [
        { type: 'line', attrs: { coordinates }, styles: { size: 2, color: lineColor } },
      ];
      coordinates.forEach((pt, idx) => {
        figures.push({
          type: 'text',
          attrs: { x: pt.x, y: pt.y - 12, text: labels[idx] || `(${idx})`, align: 'center', baseline: 'middle' },
          styles: { color: '#ffffff', size: 11, weight: 'bold', backgroundColor: lineColor, borderRadius: 8, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2 },
        });
        figures.push({
          type: 'circle',
          attrs: { x: pt.x, y: pt.y, r: 18 },
          styles: { style: 'fill', color: 'rgba(0,0,0,0)' },
        });
      });
      return figures;
    },
  });

  // 12. Boîte de Gann
  registerOverlay({
    name: 'gannBox',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length < 2) return [];
      const [a, b] = coordinates;
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      const dx = maxX - minX;
      const dy = maxY - minY;

      const strokeColor = overlay?.styles?.polygon?.borderColor || overlay?.styles?.rect?.borderColor || overlay?.styles?.line?.color || '#10b981';
      const strokeSize = overlay?.styles?.polygon?.borderSize || overlay?.styles?.rect?.borderSize || overlay?.styles?.line?.size || 1.5;
      const strokeStyle = overlay?.styles?.polygon?.borderStyle || overlay?.styles?.rect?.borderStyle || overlay?.styles?.line?.style || 'solid';
      const dashedValue = overlay?.styles?.polygon?.borderDashedValue || overlay?.styles?.rect?.borderDashedValue || (strokeStyle === 'dashed' ? [6, 4] : undefined);
      const fillColor = overlay?.styles?.polygon?.color || overlay?.styles?.rect?.color || hexToRgba(strokeColor, 0.08);

      const ratios = [0.25, 0.382, 0.5, 0.618, 0.75];
      const figures = [
        {
          type: 'polygon',
          attrs: { coordinates: [{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }] },
          styles: { style: 'stroke_fill', color: fillColor, borderColor: strokeColor, borderSize: strokeSize, borderStyle: strokeStyle, borderDashedValue: dashedValue },
        },
        { type: 'line', attrs: { coordinates: [{ x: minX, y: minY }, { x: maxX, y: maxY }] }, styles: { size: strokeSize, color: strokeColor } },
        { type: 'line', attrs: { coordinates: [{ x: minX, y: maxY }, { x: maxX, y: minY }] }, styles: { size: strokeSize, color: strokeColor } },
      ];

      ratios.forEach((r) => {
        const y = minY + dy * r;
        figures.push({
          type: 'line',
          attrs: { coordinates: [{ x: minX, y }, { x: maxX, y }] },
          styles: { size: 1, color: strokeColor, style: 'dashed', dashedValue: [4, 4] },
        });
        figures.push({
          type: 'text',
          attrs: { x: minX + 4, y: y - 2, text: r.toString() },
          styles: { color: strokeColor, size: 10 },
        });
      });

      ratios.forEach((r) => {
        const x = minX + dx * r;
        figures.push({
          type: 'line',
          attrs: { coordinates: [{ x, y: minY }, { x, y: maxY }] },
          styles: { size: 1, color: strokeColor, style: 'dashed', dashedValue: [4, 4] },
        });
      });

      figures.push(
        { type: 'circle', attrs: { x: minX, y: minY, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: maxX, y: minY, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: maxX, y: maxY, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } },
        { type: 'circle', attrs: { x: minX, y: maxY, r: 18 }, styles: { style: 'fill', color: 'rgba(0,0,0,0)' } }
      );

      return figures;
    },
  });

  // 13. Indicateur ICT Kill Zones (Asie, Londres Open, New York Open, Londres Close)
  registerIndicator({
    name: 'ICT_KZ',
    shortName: 'ICT KZ',
    series: IndicatorSeries.Price,
    calc: () => [],
    draw: ({ ctx, kLineDataList, visibleRange, xAxis, yAxis }) => {
      if (!ctx || !kLineDataList || kLineDataList.length === 0) return false;
      const { from, to } = visibleRange;
      const start = Math.max(0, from - 20);
      const end = Math.min(kLineDataList.length - 1, to + 20);

      const SESSIONS = [
        { name: 'Asia KZ', startH: 0, endH: 6, color: 'rgba(147, 51, 234, 0.12)', border: '#9333ea' },
        { name: 'London Open KZ', startH: 7, endH: 10, color: 'rgba(16, 185, 129, 0.14)', border: '#10b981' },
        { name: 'NY Open KZ', startH: 12, endH: 15, color: 'rgba(239, 68, 68, 0.14)', border: '#ef4444' },
        { name: 'London Close KZ', startH: 15, endH: 17, color: 'rgba(245, 158, 11, 0.14)', border: '#f59e0b' },
      ];

      function getSession(timestamp) {
        const d = new Date(timestamp);
        const h = d.getUTCHours() + d.getUTCMinutes() / 60;
        return SESSIONS.find((s) => h >= s.startH && h < s.endH) || null;
      }

      ctx.save();
      let currentSession = null;
      let sessionStartIdx = -1;
      let sessionHigh = -Infinity;
      let sessionLow = Infinity;

      for (let i = start; i <= end + 1; i++) {
        const bar = kLineDataList[i];
        const t = bar ? (bar.timestamp || bar.time * 1000) : 0;
        const sess = bar ? getSession(t) : null;

        if (currentSession && (!sess || sess.name !== currentSession.name)) {
          const x1 = xAxis.convertToPixel(sessionStartIdx);
          const x2 = xAxis.convertToPixel(i - 1);
          const yTop = yAxis.convertToPixel(sessionHigh);
          const yBot = yAxis.convertToPixel(sessionLow);

          const left = Math.min(x1, x2) - 4;
          const width = Math.max(8, Math.abs(x2 - x1) + 8);
          const top = Math.min(yTop, yBot);
          const height = Math.max(6, Math.abs(yBot - yTop));

          ctx.fillStyle = currentSession.color;
          ctx.fillRect(left, top, width, height);

          ctx.strokeStyle = currentSession.border;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(left, top, width, height);
          ctx.setLineDash([]);

          ctx.fillStyle = currentSession.border;
          ctx.font = '10px sans-serif';
          ctx.fillText(currentSession.name, left + 4, top - 3);

          currentSession = null;
        }

        if (sess) {
          if (!currentSession) {
            currentSession = sess;
            sessionStartIdx = i;
            sessionHigh = bar.high;
            sessionLow = bar.low;
          } else {
            sessionHigh = Math.max(sessionHigh, bar.high);
            sessionLow = Math.min(sessionLow, bar.low);
          }
        }
      }

      ctx.restore();
      return false;
    },
  });

  // 14. Ligne d'Entrée Backtest (Bleu sur le graphique & Badge bleu sans texte sur l'axe Y)
  registerOverlay({
    name: 'backtestEntryLine',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, bounding }) => {
      if (!coordinates.length) return [];
      const y = coordinates[0].y;
      return [
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: 0, y },
              { x: bounding.width, y }
            ]
          },
          styles: {
            style: 'dashed',
            color: '#2563eb',
            size: 1.5,
            dashedValue: [6, 4]
          },
          ignoreEvent: true
        }
      ];
    },
    createYAxisFigures: ({ overlay, coordinates, bounding, precision }) => {
      if (!coordinates.length || !overlay.points?.length) return [];
      const priceVal = overlay.points[0]?.value;
      if (priceVal == null || isNaN(priceVal)) return [];
      const digits = overlay.extendData?.digits ?? precision?.price ?? 4;
      const text = Number(priceVal).toFixed(digits);
      const y = coordinates[0].y;
      const w = bounding.width || 72;
      const h = 18;
      return [
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: 0, y: y - h / 2 },
              { x: w, y: y - h / 2 },
              { x: w, y: y + h / 2 },
              { x: 0, y: y + h / 2 }
            ]
          },
          styles: {
            style: 'fill',
            color: '#2563eb'
          },
          ignoreEvent: true
        },
        {
          type: 'text',
          attrs: {
            x: w / 2,
            y,
            text,
            align: 'center',
            baseline: 'middle'
          },
          styles: {
            color: '#ffffff',
            size: 11,
            weight: 'bold',
            family: 'sans-serif'
          },
          ignoreEvent: true
        }
      ];
    }
  });

  // 15. Ligne de Stop Loss Backtest (Rouge sur le graphique & Badge rouge sans texte sur l'axe Y)
  registerOverlay({
    name: 'backtestSlLine',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, bounding }) => {
      if (!coordinates.length) return [];
      const y = coordinates[0].y;
      return [
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: 0, y },
              { x: bounding.width, y }
            ]
          },
          styles: {
            style: 'dashed',
            color: '#ef4444',
            size: 1.5,
            dashedValue: [6, 4]
          },
          ignoreEvent: true
        }
      ];
    },
    createYAxisFigures: ({ overlay, coordinates, bounding, precision }) => {
      if (!coordinates.length || !overlay.points?.length) return [];
      const priceVal = overlay.points[0]?.value;
      if (priceVal == null || isNaN(priceVal)) return [];
      const digits = overlay.extendData?.digits ?? precision?.price ?? 4;
      const text = Number(priceVal).toFixed(digits);
      const y = coordinates[0].y;
      const w = bounding.width || 72;
      const h = 18;
      return [
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: 0, y: y - h / 2 },
              { x: w, y: y - h / 2 },
              { x: w, y: y + h / 2 },
              { x: 0, y: y + h / 2 }
            ]
          },
          styles: {
            style: 'fill',
            color: '#ef4444'
          },
          ignoreEvent: true
        },
        {
          type: 'text',
          attrs: {
            x: w / 2,
            y,
            text,
            align: 'center',
            baseline: 'middle'
          },
          styles: {
            color: '#ffffff',
            size: 11,
            weight: 'bold',
            family: 'sans-serif'
          },
          ignoreEvent: true
        }
      ];
    }
  });

  // 16. Ligne de Take Profit Backtest (Vert sur le graphique & Badge vert sans texte sur l'axe Y)
  registerOverlay({
    name: 'backtestTpLine',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, bounding }) => {
      if (!coordinates.length) return [];
      const y = coordinates[0].y;
      return [
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: 0, y },
              { x: bounding.width, y }
            ]
          },
          styles: {
            style: 'dashed',
            color: '#16a34a',
            size: 1.5,
            dashedValue: [6, 4]
          },
          ignoreEvent: true
        }
      ];
    },
    createYAxisFigures: ({ overlay, coordinates, bounding, precision }) => {
      if (!coordinates.length || !overlay.points?.length) return [];
      const priceVal = overlay.points[0]?.value;
      if (priceVal == null || isNaN(priceVal)) return [];
      const digits = overlay.extendData?.digits ?? precision?.price ?? 4;
      const text = Number(priceVal).toFixed(digits);
      const y = coordinates[0].y;
      const w = bounding.width || 72;
      const h = 18;
      return [
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: 0, y: y - h / 2 },
              { x: w, y: y - h / 2 },
              { x: w, y: y + h / 2 },
              { x: 0, y: y + h / 2 }
            ]
          },
          styles: {
            style: 'fill',
            color: '#16a34a'
          },
          ignoreEvent: true
        },
        {
          type: 'text',
          attrs: {
            x: w / 2,
            y,
            text,
            align: 'center',
            baseline: 'middle'
          },
          styles: {
            color: '#ffffff',
            size: 11,
            weight: 'bold',
            family: 'sans-serif'
          },
          ignoreEvent: true
        }
      ];
    }
  });

  // 17. Ligne de Coupure Backtest (Orange/Ambre verticale avec tag ciseaux)
  registerOverlay({
    name: 'backtestCutLine',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    createPointFigures: ({ coordinates, bounding }) => {
      if (!coordinates.length) return [];
      const x = coordinates[0].x;
      return [
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x, y: 0 },
              { x, y: bounding.height }
            ]
          },
          styles: {
            style: 'dashed',
            color: '#f59e0b',
            size: 2,
            dashedValue: [6, 4]
          },
          ignoreEvent: true
        },
        {
          type: 'text',
          attrs: {
            x: x + 6,
            y: 24,
            text: '✂️ Coupure',
            align: 'left',
            baseline: 'top'
          },
          styles: {
            color: '#ffffff',
            backgroundColor: 'rgba(217, 119, 6, 0.95)',
            size: 11,
            weight: 'bold',
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 3,
            paddingBottom: 3,
            borderRadius: 4
          },
          ignoreEvent: true
        }
      ];
    },
    createXAxisFigures: ({ coordinates, bounding }) => {
      if (!coordinates.length) return [];
      const x = coordinates[0].x;
      const w = 32;
      return [
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: x - w / 2, y: 0 },
              { x: x + w / 2, y: 0 },
              { x: x + w / 2, y: bounding.height },
              { x: x - w / 2, y: bounding.height }
            ]
          },
          styles: {
            style: 'fill',
            color: '#d97706'
          },
          ignoreEvent: true
        },
        {
          type: 'text',
          attrs: {
            x,
            y: bounding.height / 2,
            text: '✂️ CUT',
            align: 'center',
            baseline: 'middle'
          },
          styles: {
            color: '#ffffff',
            size: 10,
            weight: 'bold'
          },
          ignoreEvent: true
        }
      ];
    }
  });

    customOverlaysRegistered = true;
  } catch (err) {
    console.warn('Erreur lors de l\'enregistrement des indicateurs/overlays personnalisés:', err);
  }
}

// Rétrocompatibilité
export const ensureRectOverlay = ensureCustomOverlaysAndIndicators;

// Précision des prix déduite des données (5 décimales EUR/USD, 3 pour JPY…) avec protection null-safe.
export function detectPriceDigits(candles) {
  let d = 2;
  for (const c of (candles || []).slice(0, 50)) {
    if (!c || c.close == null) continue;
    const s = String(c.close);
    const i = s.indexOf('.');
    if (i >= 0) d = Math.max(d, s.length - i - 1);
  }
  return Math.min(Math.max(d, 0), 8);
}

// Plein écran : Échap pour sortir, scroll du body bloqué pendant l'affichage.
export function useFullscreen() {
  const [fullscreen, setFullscreen] = React.useState(false);
  React.useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [fullscreen]);
  return [fullscreen, setFullscreen];
}

// Hook de gestion des couleurs du graphique persistant
export function useChartStyles(chartRef) {
  const [styles, setStyles] = useState(() => getStoredChartStyles());
  const [open, setOpen] = useState(false);

  const applyStyles = (newStyles) => {
    setStyles(newStyles);
    saveStoredChartStyles(newStyles);
    if (chartRef.current) {
      try {
        chartRef.current.setStyles(buildKLineStyles(newStyles));
      } catch (e) {
        console.warn('Erreur setStyles:', e);
      }
    }
  };

  const applyPreset = (presetKey) => {
    const preset = DEFAULT_CHART_PRESETS[presetKey];
    if (preset) {
      applyStyles({ ...preset });
    }
  };

  const resetDefault = () => {
    applyStyles({ ...DEFAULT_CHART_PRESETS.tradingview_dark });
  };

  return {
    styles,
    setStyles,
    applyStyles,
    applyPreset,
    resetDefault,
    open,
    setOpen,
  };
}

// Modal de personnalisation graphique façon MT5 / TradingView
export function ChartStyleSettingsModal({ open, onClose, styles, onApplyStyles, onApplyPreset, onReset }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
      <div className="relative w-full max-w-lg rounded-xl border bg-card p-5 text-card-foreground shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-base">Personnaliser le Graphique</h3>
              <p className="text-xs text-muted-foreground">Styles MT4 / MT5 / TradingView</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Présets rapides */}
        <div className="space-y-2 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thèmes pré-configurés</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(DEFAULT_CHART_PRESETS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => onApplyPreset(key)}
                className="flex flex-col items-start gap-1 p-2 rounded-lg border text-left hover:border-primary/50 transition-colors bg-muted/40"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: p.upColor }} />
                  <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: p.downColor }} />
                  <span className="h-3 w-3 rounded-sm border ml-auto" style={{ backgroundColor: p.bgColor }} />
                </div>
                <span className="text-xs font-medium truncate w-full">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Détail des couleurs */}
        <div className="space-y-3 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Couleurs personnalisées</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Bougies Haussières */}
            <div className="p-2.5 rounded-lg border bg-muted/20 space-y-2">
              <span className="font-semibold text-green-500 flex items-center gap-1">
                ▲ Bougies Haussières (Achat)
              </span>
              <div className="flex items-center justify-between">
                <span>Corps</span>
                <input
                  type="color"
                  value={styles.upColor}
                  onChange={(e) => onApplyStyles({ ...styles, upColor: e.target.value })}
                  className="h-6 w-9 rounded cursor-pointer border bg-transparent"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Bordure</span>
                <input
                  type="color"
                  value={styles.upBorderColor}
                  onChange={(e) => onApplyStyles({ ...styles, upBorderColor: e.target.value })}
                  className="h-6 w-9 rounded cursor-pointer border bg-transparent"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Mèches</span>
                <input
                  type="color"
                  value={styles.upWickColor}
                  onChange={(e) => onApplyStyles({ ...styles, upWickColor: e.target.value })}
                  className="h-6 w-9 rounded cursor-pointer border bg-transparent"
                />
              </div>
            </div>

            {/* Bougies Baissières */}
            <div className="p-2.5 rounded-lg border bg-muted/20 space-y-2">
              <span className="font-semibold text-red-500 flex items-center gap-1">
                ▼ Bougies Baissières (Vente)
              </span>
              <div className="flex items-center justify-between">
                <span>Corps</span>
                <input
                  type="color"
                  value={styles.downColor}
                  onChange={(e) => onApplyStyles({ ...styles, downColor: e.target.value })}
                  className="h-6 w-9 rounded cursor-pointer border bg-transparent"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Bordure</span>
                <input
                  type="color"
                  value={styles.downBorderColor}
                  onChange={(e) => onApplyStyles({ ...styles, downBorderColor: e.target.value })}
                  className="h-6 w-9 rounded cursor-pointer border bg-transparent"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Mèches</span>
                <input
                  type="color"
                  value={styles.downWickColor}
                  onChange={(e) => onApplyStyles({ ...styles, downWickColor: e.target.value })}
                  className="h-6 w-9 rounded cursor-pointer border bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Fond & Grille */}
          <div className="p-2.5 rounded-lg border bg-muted/20 space-y-2 text-xs">
            <span className="font-semibold text-primary">Graphique & Environnement</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                <span>Arrière-plan</span>
                <input
                  type="color"
                  value={styles.bgColor}
                  onChange={(e) => onApplyStyles({ ...styles, bgColor: e.target.value })}
                  className="h-6 w-full rounded cursor-pointer border bg-transparent"
                />
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                <span>Réticule</span>
                <input
                  type="color"
                  value={styles.crosshairColor}
                  onChange={(e) => onApplyStyles({ ...styles, crosshairColor: e.target.value })}
                  className="h-6 w-full rounded cursor-pointer border bg-transparent"
                />
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                <span>Textes / Axes</span>
                <input
                  type="color"
                  value={styles.textColor}
                  onChange={(e) => onApplyStyles({ ...styles, textColor: e.target.value })}
                  className="h-6 w-full rounded cursor-pointer border bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-between border-t pt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
          </Button>
          <Button size="sm" onClick={onClose} className="text-xs gap-1">
            <Check className="h-3.5 w-3.5" /> Enregistrer & Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChartStyleButton({ onClick, className = '' }) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={`h-7 px-2 text-xs gap-1 ${className}`}
      onClick={onClick}
      title="Personnaliser les couleurs du graphique (MT5 / TradingView)"
    >
      <Palette className="h-3.5 w-3.5 text-primary" />
      <span className="hidden xs:inline">Couleurs</span>
    </Button>
  );
}

// Menu déroulant générique robuste (tactile, mobile, PC) avec fermeture au clic extérieur.
export function Dropdown({ trigger, open, setOpen, children, align = 'left', width = 'w-56' }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open, setOpen]);

  return (
    <div ref={ref} className="relative inline-block" data-chart-dropdown-wrapper>
      <div onClick={(e) => e.stopPropagation()}>{trigger}</div>
      {open && (
        <div
          data-chart-dropdown
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute top-full mt-1.5 z-[80] max-w-[calc(100vw-1rem)] max-h-[82vh] overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-2xl ${width} ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Composant ErrorBoundary pour isoler les graphiques et éviter l'écran blanc
export class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chart crashed:', error, errorInfo);
  }

  handleReset = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CHART_STYLE_STORAGE_KEY);
      }
    } catch (_) {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border bg-card/90 max-w-lg mx-auto my-12 space-y-4 shadow-lg">
          <div className="p-3 rounded-full bg-destructive/10 text-destructive">
            <RotateCcw className="h-8 w-8 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Affichage du graphique indisponible</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Un problème de rendu graphique ou de données en cache est survenu. Cliquez ci-dessous pour recharger ou réinitialiser.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button size="sm" onClick={() => this.setState({ hasError: false, error: null })}>
              Réessayer
            </Button>
            <Button size="sm" variant="outline" onClick={this.handleReset}>
              Réinitialiser le graphique & vider le cache
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Obtenir le libellé en français d'un outil de dessin
export function getToolLabel(name) {
  const tool = DRAW_TOOLS.find((t) => t.name === name);
  if (tool) return tool.label;
  if (name === 'path') return 'Trajectoire / Path';
  if (name === 'segment') return 'Ligne de tendance';
  if (name === 'rect') return 'Rectangle / Zone';
  if (name === 'text') return 'Annotation texte';
  if (name === 'priceLine') return 'Ligne de prix';
  if (name === 'rayLine') return 'Demi-droite';
  if (name === 'horizontalStraightLine') return 'Ligne horizontale';
  if (name === 'verticalStraightLine') return 'Ligne verticale';
  if (name === 'fibonacciLine') return 'Retracement Fibonacci';
  if (name === 'gannBox') return 'Boîte de Gann';
  if (name === 'brush') return 'Pinceau';
  if (name === 'positionLong') return 'Position Long (Achat)';
  if (name === 'positionShort') return 'Position Short (Vente)';
  return name || 'Dessin';
}

// Hook de gestion des tracés et outils graphiques :
// - Sélection au clic
// - Suppression via bouton flottant, touche Suppr / Backspace, ou double-clic
// - Manipulation fluide des poignées agrandies
// - Blocage du scroll lors de la manipulation pour éviter le conflit tactile sur mobile
// - Étirement immédiat au premier point (tactile et souris)
export function useChartOverlayManager(chartRef, containerRef) {
  const [selectedOverlay, setSelectedOverlay] = useState(null);
  const drawingOverlayIdRef = useRef(null);
  const touchDragInfoRef = useRef(null);

  const deleteOverlay = useCallback((target) => {
    const chart = chartRef?.current;
    if (!chart) return;
    const id = typeof target === 'string' ? target : target?.id;
    if (id) {
      try {
        chart.removeOverlay({ id });
      } catch (_) {
        try {
          chart.removeOverlay(id);
        } catch (_) {}
      }
    }
    setSelectedOverlay((curr) => (curr?.id === id ? null : curr));
  }, [chartRef]);

  const deleteSelected = useCallback(() => {
    if (selectedOverlay) {
      deleteOverlay(selectedOverlay);
      setSelectedOverlay(null);
    }
  }, [selectedOverlay, deleteOverlay]);

  const deleteAllDrawings = useCallback(() => {
    const chart = chartRef?.current;
    if (!chart) return;
    try {
      chart.removeOverlay({ groupId: 'draw' });
    } catch (_) {}
    setSelectedOverlay(null);
  }, [chartRef]);

  // Désactive le scroll du graphique lorsqu'un outil est sélectionné pour permettre
  // à l'utilisateur de déplacer ou étirer facilement l'outil au doigt sans conflit de pan
  useEffect(() => {
    const chart = chartRef?.current;
    if (!chart) return;
    try {
      if (selectedOverlay) {
        chart.setScrollEnabled?.(false);
      } else {
        chart.setScrollEnabled?.(true);
      }
    } catch (_) {}
    return () => {
      try {
        chart?.setScrollEnabled?.(true);
      } catch (_) {}
    };
  }, [selectedOverlay, chartRef]);

  // Raccourci clavier Suppr / Backspace pour supprimer l'outil actif, ou Echap/Entrée pour finaliser le tracé
  useEffect(() => {
    if (!selectedOverlay) return;
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === 'Escape' || e.key === 'Enter') {
        if (selectedOverlay?.isDrawing?.()) {
          selectedOverlay.forceComplete?.();
        } else {
          setSelectedOverlay(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOverlay, deleteSelected]);

  // Création enrichie avec liaison automatique des événements de clic, sélection et finalisation
  const createDrawing = useCallback((name, extra = {}) => {
    const chart = chartRef?.current;
    if (!chart) return null;

    const overlayConfig = {
      name,
      groupId: 'draw',
      ...extra,
      onSelected: ({ overlay }) => {
        setSelectedOverlay(overlay);
        return true;
      },
      onDeselected: () => {
        setSelectedOverlay(null);
        return true;
      },
      onClick: ({ overlay }) => {
        setSelectedOverlay(overlay);
        return true;
      },
      onDoubleClick: ({ overlay }) => {
        if (overlay?.isDrawing?.()) {
          overlay.forceComplete?.();
          return true;
        }
        deleteOverlay(overlay);
        return true;
      },
      onRightClick: ({ overlay }) => {
        if (overlay?.isDrawing?.()) {
          overlay.forceComplete?.();
          return true;
        }
        deleteOverlay(overlay);
        return true;
      },
    };

    const id = chart.createOverlay(overlayConfig);
    if (id) {
      drawingOverlayIdRef.current = id;
      try {
        chart.setScrollEnabled?.(false);
      } catch (_) {}
      const created = chart.getOverlayById?.(id);
      if (created) setSelectedOverlay(created);
    }
    return id;
  }, [chartRef, deleteOverlay]);

  // Gestion du positionnement et étirement immédiat au doigt (mobile) ou à la souris :
  // Dès le premier contact, l'utilisateur étire directement l'outil sans devoir faire 2 clics séparés.
  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    const handleStart = (clientX, clientY) => {
      const chart = chartRef?.current;
      if (!chart || !drawingOverlayIdRef.current) return;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const pt1 = chart.convertFromPixel?.({ x, y });
      if (!pt1 || pt1.value == null) return;

      touchDragInfoRef.current = {
        startX: clientX,
        startY: clientY,
        x,
        y,
        pt1,
        hasDragged: false,
        overlayId: drawingOverlayIdRef.current,
      };
    };

    const handleMove = (clientX, clientY, preventDef) => {
      const chart = chartRef?.current;
      const info = touchDragInfoRef.current;
      if (!chart || !info) return;

      const dist = Math.hypot(clientX - info.startX, clientY - info.startY);
      if (dist > 6) {
        info.hasDragged = true;
        preventDef?.();
        const rect = container.getBoundingClientRect();
        const curX = clientX - rect.left;
        const curY = clientY - rect.top;
        const pt2 = chart.convertFromPixel?.({ x: curX, y: curY });
        if (pt2 && pt2.value != null) {
          try {
            chart.overrideOverlay?.({
              id: info.overlayId,
              points: [info.pt1, pt2],
            });
            chart.adjustPaneViewport?.(false, true, true, true, true);
          } catch (_) {}
        }
      }
    };

    const handleEnd = (clientX, clientY) => {
      const chart = chartRef?.current;
      const info = touchDragInfoRef.current;
      if (!chart || !info) return;

      if (info.hasDragged) {
        const rect = container.getBoundingClientRect();
        const endX = clientX != null ? clientX - rect.left : info.x;
        const endY = clientY != null ? clientY - rect.top : info.y;
        const pt2 = chart.convertFromPixel?.({ x: endX, y: endY }) || info.pt1;
        try {
          const overlay = chart.getOverlayById?.(info.overlayId);
          if (overlay) {
            chart.overrideOverlay?.({
              id: info.overlayId,
              points: [info.pt1, pt2],
            });
            overlay.forceComplete?.();
            chart._chartStore?.getOverlayStore()?.progressInstanceComplete?.();
            setSelectedOverlay(overlay);
          }
        } catch (_) {}
        drawingOverlayIdRef.current = null;
      }
      touchDragInfoRef.current = null;
    };

    // Listeners tactiles (téléphone / tablette)
    const onTouchStart = (e) => {
      if (e.touches.length === 1) handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 1) handleMove(e.touches[0].clientX, e.touches[0].clientY, () => e.preventDefault());
    };
    const onTouchEnd = (e) => {
      const t = e.changedTouches?.[0] || e.touches?.[0];
      handleEnd(t ? t.clientX : null, t ? t.clientY : null);
    };

    // Listeners souris (PC / trackpad)
    const onMouseDown = (e) => {
      if (e.button === 0) handleStart(e.clientX, e.clientY);
    };
    const onMouseMove = (e) => {
      handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = (e) => {
      if (e.button === 0) handleEnd(e.clientX, e.clientY);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [containerRef, chartRef]);

  return {
    selectedOverlay,
    setSelectedOverlay,
    deleteOverlay,
    deleteSelected,
    deleteAllDrawings,
    createDrawing,
  };
}

// Barre d'action flottante qui apparaît au clic sur un outil/dessin avec bouton Engrenage (paramètres) et Supprimer
export function SelectedOverlayBar({ overlay, onDelete, onDeselect, chartRef, onUpdateStyle, className = '' }) {
  if (!overlay) return null;
  const label = getToolLabel(overlay.name);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Style local pour l'édition et la synchronisation immédiate (lit ligne ou polygone/rect)
  const currentLineStyle = overlay.styles?.line || {};
  const currentPolyStyle = overlay.styles?.polygon || overlay.styles?.rect || {};
  const [color, setColor] = useState(currentPolyStyle.borderColor || currentLineStyle.color || '#3b82f6');
  const [size, setSize] = useState(currentPolyStyle.borderSize || currentLineStyle.size || 2.5);
  const [dashStyle, setDashStyle] = useState(currentPolyStyle.borderStyle || currentLineStyle.style || 'solid');

  useEffect(() => {
    const sLine = overlay.styles?.line || {};
    const sPoly = overlay.styles?.polygon || overlay.styles?.rect || {};
    const c = sPoly.borderColor || sLine.color;
    if (c) setColor(c);
    const sz = sPoly.borderSize || sLine.size;
    if (sz) setSize(sz);
    const st = sPoly.borderStyle || sLine.style;
    if (st) setDashStyle(st);
    setSettingsOpen(false);
  }, [overlay.id]);

  const applyOverlayStyle = (newColor, newSize, newDashStyle) => {
    setColor(newColor);
    setSize(newSize);
    setDashStyle(newDashStyle);

    const chart = chartRef?.current;
    if (!chart || !overlay?.id) return;
    const dashedValue = newDashStyle === 'dashed' ? [6, 4] : undefined;
    const fillColor = hexToRgba(newColor, 0.18);
    try {
      chart.overrideOverlay({
        id: overlay.id,
        styles: {
          line: {
            color: newColor,
            size: newSize,
            style: newDashStyle,
            dashedValue,
          },
          polygon: {
            color: fillColor,
            borderColor: newColor,
            borderSize: newSize,
            borderStyle: newDashStyle,
            borderDashedValue: dashedValue,
          },
          rect: {
            color: fillColor,
            borderColor: newColor,
            borderSize: newSize,
            borderStyle: newDashStyle,
            borderDashedValue: dashedValue,
          },
          circle: {
            color: fillColor,
            borderColor: newColor,
            borderSize: newSize,
            borderStyle: newDashStyle,
            borderDashedValue: dashedValue,
          },
          arc: {
            color: newColor,
            size: newSize,
          },
          text: {
            color: '#ffffff',
            borderColor: newColor,
          },
        },
      });
      // Synchronisation directe des styles de l'overlay en mémoire
      if (overlay.styles) {
        overlay.styles.line = { ...(overlay.styles.line || {}), color: newColor, size: newSize, style: newDashStyle, dashedValue };
        overlay.styles.polygon = { ...(overlay.styles.polygon || {}), color: fillColor, borderColor: newColor, borderSize: newSize, borderStyle: newDashStyle, borderDashedValue: dashedValue };
        overlay.styles.rect = { ...(overlay.styles.rect || {}), color: fillColor, borderColor: newColor, borderSize: newSize, borderStyle: newDashStyle, borderDashedValue: dashedValue };
      }
      chart.adjustPaneViewport?.(false, true, true, true, true);
      onUpdateStyle?.({ color: newColor, size: newSize, style: newDashStyle });
    } catch (e) {
      console.warn('overrideOverlay error:', e);
    }
  };

  const handleFinishDrawing = () => {
    if (overlay.forceComplete) {
      overlay.forceComplete();
    }
  };

  const isDrawing = overlay.isDrawing?.();

  return (
    <div className={`pointer-events-auto absolute top-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center ${className}`}>
      {/* Barre principale */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-card/95 border border-primary/50 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-foreground max-w-[120px] sm:max-w-[200px] truncate">
            {label}
          </span>
        </div>

        {/* Pastille indiquant la couleur active */}
        <span
          className="h-3 w-3 rounded-full border border-white/40 shadow-xs shrink-0"
          style={{ backgroundColor: color }}
          title={`Couleur: ${color}`}
        />

        <div className="h-3.5 w-px bg-border mx-0.5" />

        {/* Bouton Terminer le tracé (si en cours de dessin) */}
        {isDrawing && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px] gap-1 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/10 cursor-pointer"
            onClick={handleFinishDrawing}
            title="Terminer la trajectoire (ou double-clic)"
          >
            <Check className="h-3 w-3" />
            <span>Terminer</span>
          </Button>
        )}

        {/* Bouton Engrenage : paramètres couleur, épaisseur, trait continu/discontinu */}
        <Button
          size="sm"
          variant="ghost"
          className={`h-6 w-6 p-0 hover:bg-muted cursor-pointer transition-colors ${settingsOpen ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setSettingsOpen((prev) => !prev)}
          title="Paramètres de l'outil (Couleur, Épaisseur, Trait continu / discontinu)"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>

        {/* Bouton Supprimer */}
        <Button
          size="sm"
          variant="destructive"
          className="h-6 px-2.5 text-xs gap-1 shadow-xs hover:bg-destructive/90 cursor-pointer"
          onClick={() => onDelete?.(overlay)}
          title="Supprimer cet outil (ou touche Suppr / Backspace)"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Supprimer</span>
        </Button>

        {/* Bouton Désélectionner */}
        <button
          type="button"
          onClick={onDeselect}
          className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Désélectionner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Popover Paramètres de l'outil */}
      {settingsOpen && (
        <div className="mt-1.5 p-3 rounded-xl bg-card/98 border border-border shadow-2xl backdrop-blur-md w-72 max-w-[90vw] animate-in fade-in slide-in-from-top-1 duration-150 text-xs flex flex-col gap-3">
          {/* Section 1 : Couleur */}
          <div>
            <div className="flex items-center justify-between text-muted-foreground font-semibold mb-1.5 text-[11px]">
              <span>Couleur</span>
              <span className="font-mono text-[10px] uppercase text-foreground">{color}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                '#3b82f6', // Bleu
                '#22c55e', // Vert
                '#ef4444', // Rouge
                '#f97316', // Orange
                '#eab308', // Jaune
                '#a855f7', // Violet
                '#06b6d4', // Cyan
                '#ec4899', // Rose
                '#ffffff', // Blanc
                '#64748b', // Gris
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => applyOverlayStyle(c, size, dashStyle)}
                  className={`h-5 w-5 rounded-md border transition-transform cursor-pointer hover:scale-110 ${color === c ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-110' : 'border-white/20'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              {/* Pipette / Sélecteur personnalisé */}
              <label
                className="h-5 w-5 rounded-md border border-white/20 flex items-center justify-center cursor-pointer hover:bg-muted transition-colors relative overflow-hidden"
                title="Couleur personnalisée"
              >
                <Palette className="h-3 w-3 text-muted-foreground" />
                <input
                  type="color"
                  value={color.startsWith('#') && color.length === 7 ? color : '#3b82f6'}
                  onChange={(e) => applyOverlayStyle(e.target.value, size, dashStyle)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Section 2 : Épaisseur */}
          <div>
            <div className="flex items-center justify-between text-muted-foreground font-semibold mb-1.5 text-[11px]">
              <span>Épaisseur</span>
              <span className="text-foreground">{size} px</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => applyOverlayStyle(color, w, dashStyle)}
                  className={`h-7 rounded-md border flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${size === w ? 'bg-primary/20 border-primary text-primary font-bold' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  title={`${w}px`}
                >
                  <span
                    className="w-4 rounded-full bg-current"
                    style={{ height: `${w}px` }}
                  />
                  <span className="text-[10px] leading-none">{w}px</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Section 3 : Type de trait (Continu vs Discontinu) */}
          <div>
            <div className="text-muted-foreground font-semibold mb-1.5 text-[11px]">
              Type de trait
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => applyOverlayStyle(color, size, 'solid')}
                className={`h-7 px-2 rounded-md border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${dashStyle === 'solid' ? 'bg-primary/20 border-primary text-primary font-bold' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                title="Trait continu"
              >
                <span className="w-5 h-[2px] bg-current inline-block" />
                <span className="text-[11px]">Continu</span>
              </button>
              <button
                type="button"
                onClick={() => applyOverlayStyle(color, size, 'dashed')}
                className={`h-7 px-2 rounded-md border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${dashStyle === 'dashed' ? 'bg-primary/20 border-primary text-primary font-bold' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                title="Trait discontinu"
              >
                <span className="w-5 h-[2px] border-b-2 border-dashed border-current inline-block" />
                <span className="text-[11px]">Discontinu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Menu « Outils » : tous les outils de dessin regroupés avec gestionnaire de suppression
export function DrawToolsMenu({ chartRef, overlayManager }) {
  const [open, setOpen] = React.useState(false);

  const handleSelectTool = (name) => {
    const chart = chartRef.current;
    if (!chart) return;
    const extra = {};
    if (name === 'text') {
      const txt = window.prompt("Texte de l'annotation :", "Note d'analyse");
      if (!txt) return;
      extra.extendData = txt;
    }
    if (overlayManager?.createDrawing) {
      overlayManager.createDrawing(name, extra);
    } else {
      chart.createOverlay({
        name,
        groupId: 'draw',
        ...extra,
        onSelected: ({ overlay }) => {
          overlayManager?.setSelectedOverlay?.(overlay);
          return true;
        },
        onClick: ({ overlay }) => {
          overlayManager?.setSelectedOverlay?.(overlay);
          return true;
        },
        onDoubleClick: ({ overlay }) => {
          chart.removeOverlay(overlay.id);
          overlayManager?.setSelectedOverlay?.(null);
          return true;
        },
        onRightClick: ({ overlay }) => {
          chart.removeOverlay(overlay.id);
          overlayManager?.setSelectedOverlay?.(null);
          return true;
        },
      });
    }
    setOpen(false);
  };

  // Groupes d'outils
  const groups = ['Lignes', 'Formes', 'Positions', 'Flèches', 'Elliott & Dessin'];

  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      width="w-64"
      trigger={
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setOpen((o) => !o)}>
          <Pencil className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Outils</span> <ChevronDown className="h-3 w-3" />
        </Button>
      }
    >
      <div className="p-1 max-h-80 overflow-y-auto">
        {overlayManager?.selectedOverlay && (
          <>
            <div className="p-1.5 mb-1 rounded bg-destructive/10 border border-destructive/20 flex items-center justify-between">
              <span className="text-[11px] font-medium text-destructive truncate pr-1">
                {getToolLabel(overlayManager.selectedOverlay.name)}
              </span>
              <button
                className="px-2 py-0.5 rounded bg-destructive text-destructive-foreground text-[11px] font-semibold flex items-center gap-1 hover:bg-destructive/90"
                onClick={() => {
                  overlayManager.deleteSelected();
                  setOpen(false);
                }}
              >
                <Trash2 className="h-3 w-3" /> Supprimer
              </button>
            </div>
            <div className="border-t my-1" />
          </>
        )}
        {groups.map((grp) => {
          const tools = DRAW_TOOLS.filter((t) => t.group === grp);
          if (!tools.length) return null;
          return (
            <div key={grp} className="mb-1">
              <p className="px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{grp}</p>
              {tools.map(({ name, label, Icon }) => (
                <button
                  key={name}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted text-left"
                  onClick={() => handleSelectTool(name)}
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          );
        })}
        <div className="border-t my-1" />
        <button
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-muted font-medium"
          onClick={() => {
            if (overlayManager?.deleteAllDrawings) {
              overlayManager.deleteAllDrawings();
            } else {
              chartRef.current?.removeOverlay({ groupId: 'draw' });
            }
            setOpen(false);
          }}
        >
          <Eraser className="h-3.5 w-3.5" /> Effacer tous les dessins
        </button>
      </div>
    </Dropdown>
  );
}

// ---- Gestion du compte à rebours de clôture de bougie ----

export function getTimeframeSeconds(tf) {
  if (!tf) return 60;
  const upper = String(tf).trim().toUpperCase();
  if (upper === 'M1' || upper === '1M') return 60;
  if (upper === 'M5' || upper === '5M') return 300;
  if (upper === 'M15' || upper === '15M') return 900;
  if (upper === 'M30' || upper === '30M') return 1800;
  if (upper === 'H1' || upper === '1H') return 3600;
  if (upper === 'H2' || upper === '2H') return 7200;
  if (upper === 'H4' || upper === '4H') return 14400;
  if (upper === 'H6' || upper === '6H') return 21600;
  if (upper === 'H8' || upper === '8H') return 28800;
  if (upper === 'D1' || upper === '1D') return 86400;
  if (upper === 'W1' || upper === '1W') return 604800;
  if (upper === 'MN' || upper === '1MTH' || upper === '1MO') return 2592000;
  const num = parseInt(tf, 10);
  if (!isNaN(num) && num > 0) return num * 60;
  return 3600;
}

export function calculateCandleRemaining(timeframe, referenceTime = null) {
  const nowMs = referenceTime != null
    ? (typeof referenceTime === 'number' ? (referenceTime > 1e11 ? referenceTime : referenceTime * 1000) : new Date(referenceTime).getTime())
    : Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const durSec = getTimeframeSeconds(timeframe);
  const remSec = durSec - (nowSec % durSec);
  return Math.max(0, remSec);
}

export function formatCountdown(totalSec) {
  if (totalSec == null || totalSec <= 0) return '00:00';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useCandleCountdown(timeframe, referenceTime = null) {
  const [remaining, setRemaining] = useState(() => calculateCandleRemaining(timeframe, referenceTime));

  useEffect(() => {
    setRemaining(calculateCandleRemaining(timeframe, referenceTime));
    if (referenceTime != null) return;

    const interval = setInterval(() => {
      setRemaining(calculateCandleRemaining(timeframe));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeframe, referenceTime]);

  return {
    remainingSeconds: remaining,
    formatted: formatCountdown(remaining),
  };
}

export function CandleCountdownBadge({ timeframe, referenceTime = null, className = '' }) {
  const { formatted, remainingSeconds } = useCandleCountdown(timeframe, referenceTime);
  const isUrgent = remainingSeconds <= 30;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono border bg-background/90 shadow-2xs backdrop-blur-xs select-none ${
        isUrgent ? 'border-red-500/60 text-red-500 animate-pulse' : 'border-border/80 text-foreground'
      } ${className}`}
      title={`Temps restant avant la clôture de la bougie (${timeframe})`}
    >
      <Clock className="h-3 w-3 text-primary shrink-0" />
      <span className="text-[10px] uppercase font-semibold text-muted-foreground hidden sm:inline">Clôture :</span>
      <span className="tabular-nums font-bold tracking-tight">{formatted}</span>
    </div>
  );
}

// Menu « Indicateurs » : activation/désactivation par cases cochables.
export function IndicatorsMenu({ chartRef, active, setActive, panesRef }) {
  const [open, setOpen] = React.useState(false);
  const toggle = (name) => {
    const chart = chartRef.current;
    if (!chart) return;
    const isMain = MAIN_INDICATORS.includes(name);
    setActive((prev) => {
      const on = !prev[name];
      if (on) {
        const paneId = isMain
          ? (chart.createIndicator(name, true, { id: 'candle_pane' }), 'candle_pane')
          : chart.createIndicator(name);
        panesRef.current[name] = paneId;
      } else {
        chart.removeIndicator(panesRef.current[name], name);
        delete panesRef.current[name];
      }
      return { ...prev, [name]: on };
    });
  };
  const count = Object.values(active).filter(Boolean).length;
  const Row = ({ name }) => (
    <button
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted"
      onClick={() => toggle(name)}
    >
      <span className="truncate pr-1">{INDICATOR_LABELS[name] || name}</span>
      <span className={`h-3.5 w-3.5 rounded-sm border shrink-0 ${active[name] ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`} />
    </button>
  );
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      width="w-56"
      trigger={
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setOpen((o) => !o)}>
          <FunctionSquare className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Indicateurs</span>{count ? ` (${count})` : ''} <ChevronDown className="h-3 w-3" />
        </Button>
      }
    >
      <div className="p-1">
        <p className="px-2 py-1 text-[10px] uppercase font-semibold text-muted-foreground">Sur le prix</p>
        {MAIN_INDICATORS.map((n) => <Row key={n} name={n} />)}
        <p className="px-2 py-1 text-[10px] uppercase font-semibold text-muted-foreground border-t mt-1 pt-1">Sous-graphique</p>
        {SUB_INDICATORS.map((n) => <Row key={n} name={n} />)}
      </div>
    </Dropdown>
  );
}

// Sélecteur de marché (paires par catégorie) + unité de temps, dans l'entête du graphique.
const CATEGORY_LABELS = { forex: 'Forex', metal: 'Métaux', indice: 'Indices', crypto: 'Crypto', synthetic: 'Synthétiques' };

export function MarketPicker({ symbols, timeframes, symbol, timeframe, onSelectSymbol, onSelectTimeframe }) {
  const [open, setOpen] = React.useState(false);
  const [cat, setCat] = React.useState(null);
  const current = (symbols || []).find((s) => s.symbol === symbol);
  const categories = React.useMemo(() => {
    const out = [];
    for (const s of symbols || []) {
      const c = s.category || 'forex';
      if (!out.includes(c)) out.push(c);
    }
    return out;
  }, [symbols]);
  const activeCat = cat || current?.category || categories[0];
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      width="w-72"
      trigger={
        <button
          className="pointer-events-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted/70"
          onClick={() => setOpen((o) => !o)}
          title="Changer de marché / unité de temps"
        >
          <span className="text-xs font-semibold text-primary">{current?.name || symbol}</span>
          <span className="text-xs font-semibold">{timeframe}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      }
    >
      <div className="p-2 space-y-2">
        {/* Onglets catégories */}
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <Button
              key={c} size="sm" variant={activeCat === c ? 'default' : 'ghost'}
              className="h-6 px-2 text-xs" onClick={() => setCat(c)}
            >
              {CATEGORY_LABELS[c] || c}
            </Button>
          ))}
        </div>
        {/* Paires de la catégorie */}
        <div className="max-h-52 overflow-y-auto">
          {(symbols || []).filter((s) => (s.category || 'forex') === activeCat).map((s) => (
            <button
              key={s.symbol}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted ${s.symbol === symbol ? 'bg-muted font-medium' : ''}`}
              onClick={() => { onSelectSymbol(s.symbol); setOpen(false); }}
            >
              {s.name}
              {s.symbol === symbol && <span className="text-primary text-xs">●</span>}
            </button>
          ))}
        </div>
        {/* Unités de temps */}
        <div className="border-t pt-2">
          <p className="px-1 pb-1 text-[11px] uppercase text-muted-foreground">Unité de temps</p>
          <div className="flex flex-wrap gap-1">
            {(timeframes || []).map((t) => (
              <Button
                key={t.key} size="sm" variant={timeframe === t.key ? 'default' : 'outline'}
                className="h-6 px-2 text-xs"
                onClick={() => { onSelectTimeframe(t.key); setOpen(false); }}
              >
                {t.key}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Dropdown>
  );
}

// Logo de marque fixé dans le coin inférieur gauche (au-dessus de l'axe des temps).
// Le grand filigrane central masquant les chandeliers a été retiré.
export function ChartWatermark() {
  const [logoUrl, setLogoUrl] = React.useState('/logo.png');

  React.useEffect(() => {
    let cancelled = false;
    api.get('/branding').then(({ data }) => {
      if (!cancelled && data?.chart_logo_url) setLogoUrl(assetUrl(data.chart_logo_url));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleImgError = (e) => {
    if (e.target.src !== '/logo.png') {
      e.target.src = '/logo.png';
    }
  };

  return (
    <div className="absolute bottom-20 sm:bottom-8 left-3 sm:left-4 pointer-events-none z-20 select-none opacity-95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
      <img
        src={logoUrl}
        alt="LivefxTrading"
        className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto max-w-[170px] sm:max-w-[210px] md:max-w-[250px] object-contain transition-all"
        onError={handleImgError}
      />
    </div>
  );
}

// ---- Redimensionnement vertical et horizontal fluide façon MT4 / MT5 & TradingView ----

// Étire ou compresse l'axe des prix Y avec un facteur multiplicateur
export function zoomPriceY(chart, factor = 1.15) {
  if (!chart) return;
  try {
    const pane = chart.getDrawPaneById?.('candle_pane');
    const yAxis = pane?.getAxisComponent?.();
    if (!yAxis) return;
    const range = yAxis.getRange?.();
    if (!range || !range.range) return;

    const newRange = Math.max(range.range * factor, range.range * 0.02);
    const difRange = (newRange - range.range) / 2;
    const newFrom = range.from - difRange;
    const newTo = range.to + difRange;
    const newRealFrom = yAxis.convertToRealValue(newFrom);
    const newRealTo = yAxis.convertToRealValue(newTo);

    yAxis.setRange({
      from: newFrom,
      to: newTo,
      range: newRange,
      realFrom: newRealFrom,
      realTo: newRealTo,
      realRange: newRealTo - newRealFrom,
    });
    chart.adjustPaneViewport?.(false, true, true, true);
  } catch (err) {
    console.warn('zoomPriceY error:', err);
  }
}

// Réinitialise l'axe des prix Y à l'échelle automatique
export function resetPriceY(chart) {
  if (!chart) return;
  try {
    const pane = chart.getDrawPaneById?.('candle_pane');
    const yAxis = pane?.getAxisComponent?.();
    if (!yAxis) return;
    yAxis.setAutoCalcTickFlag?.(true);
    chart.adjustPaneViewport?.(false, true, true, true);
  } catch (err) {
    console.warn('resetPriceY error:', err);
  }
}

// Attache des écouteurs Pointer / Touch / Wheel sur le conteneur de l'axe des prix Y
// pour un étirement vertical fluide, fiable et instantané sur tous les appareils (PC, mobile, tactile)
export function setupYAxisDrag(chart) {
  if (!chart) return () => {};

  let cleanupListeners = () => {};

  const initDrag = () => {
    try {
      const yAxisDom = chart.getDom?.('candle_pane', 'yAxis');
      if (!yAxisDom) return;

      yAxisDom.style.touchAction = 'none';
      yAxisDom.style.cursor = 'ns-resize';
      yAxisDom.style.userSelect = 'none';
      yAxisDom.style.webkitUserSelect = 'none';

      let isDragging = false;
      let startY = 0;
      let initialRange = null;

      const onPointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        const pane = chart.getDrawPaneById?.('candle_pane');
        const yAxis = pane?.getAxisComponent?.();
        if (!yAxis) return;

        const currentRange = yAxis.getRange?.();
        if (!currentRange || !currentRange.range) return;

        isDragging = true;
        startY = e.clientY;
        initialRange = { ...currentRange };

        // Empêche le comportement natif défectueux de KLineCharts
        e.preventDefault();
        e.stopPropagation();

        try {
          e.target?.setPointerCapture?.(e.pointerId);
        } catch (_) {}

        const onPointerMove = (ev) => {
          if (!isDragging || !initialRange) return;
          ev.preventDefault();
          ev.stopPropagation();

          const deltaY = ev.clientY - startY;
          // Glissement vers le HAUT (deltaY < 0) : agrandit les bougies verticalement (réduit le range de prix)
          // Glissement vers le BAS (deltaY > 0) : compresse les bougies verticalement (augmente le range de prix)
          const scale = Math.exp(deltaY * 0.005);
          const newRange = Math.max(initialRange.range * scale, initialRange.range * 0.02);
          const difRange = (newRange - initialRange.range) / 2;
          const newFrom = initialRange.from - difRange;
          const newTo = initialRange.to + difRange;
          const newRealFrom = yAxis.convertToRealValue(newFrom);
          const newRealTo = yAxis.convertToRealValue(newTo);

          yAxis.setRange({
            from: newFrom,
            to: newTo,
            range: newRange,
            realFrom: newRealFrom,
            realTo: newRealTo,
            realRange: newRealTo - newRealFrom,
          });
          chart.adjustPaneViewport?.(false, true, true, true);
        };

        const onPointerUp = (ev) => {
          if (!isDragging) return;
          isDragging = false;
          initialRange = null;
          ev.stopPropagation();
          try {
            ev.target?.releasePointerCapture?.(ev.pointerId);
          } catch (_) {}
          window.removeEventListener('pointermove', onPointerMove, true);
          window.removeEventListener('pointerup', onPointerUp, true);
          window.removeEventListener('pointercancel', onPointerUp, true);
        };

        window.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
        window.addEventListener('pointerup', onPointerUp, { capture: true });
        window.addEventListener('pointercancel', onPointerUp, { capture: true });
      };

      const onDblClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetPriceY(chart);
      };

      const onWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const factor = e.deltaY < 0 ? 0.90 : 1.10;
        zoomPriceY(chart, factor);
      };

      yAxisDom.addEventListener('pointerdown', onPointerDown, { passive: false });
      yAxisDom.addEventListener('dblclick', onDblClick);
      yAxisDom.addEventListener('wheel', onWheel, { passive: false });

      cleanupListeners = () => {
        yAxisDom.removeEventListener('pointerdown', onPointerDown);
        yAxisDom.removeEventListener('dblclick', onDblClick);
        yAxisDom.removeEventListener('wheel', onWheel);
      };
    } catch (err) {
      console.warn('setupYAxisDrag error:', err);
    }
  };

  const timer = setTimeout(initDrag, 50);

  return () => {
    clearTimeout(timer);
    cleanupListeners();
  };
}

// Configuration de KLineCharts pour une flexibilité et fluidité totale façon MT4 / MT5 :
// - Étirement vertical de l'axe des prix (glisser sur l'axe Y à droite pour compresser/étirer les bougies)
// - Étirement horizontal de l'axe des temps (glisser sur l'axe X)
// - Zoom/dézoom molette et pinch tactile
export function configureMT4Chart(chart) {
  if (!chart) return () => {};
  try {
    chart.setZoomEnabled?.(true);
    chart.setScrollEnabled?.(true);
    chart.setPaneOptions?.({
      id: 'candle_pane',
      axisOptions: {
        scrollZoomEnabled: true,
      },
      gap: { top: 0.12, bottom: 0.08 },
    });
    chart.setPaneOptions?.({
      id: 'x_axis',
      axisOptions: {
        scrollZoomEnabled: true,
      },
    });
  } catch (e) {
    console.warn('configureMT4Chart:', e);
  }

  return setupYAxisDrag(chart);
}

// Boutons de zoom rapide façon MT4/MT5 intégrables dans la toolbar (+, -, ↕+, ↕-, Auto)
export function ChartZoomControls({ chartRef, className = '' }) {
  const handleZoomIn = () => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      const space = chart.getBarSpace?.() || 6;
      chart.setBarSpace?.(Math.min(space + 2, 45));
    } catch (_) {
      chart.zoomAtCoordinate?.(0.25);
    }
  };

  const handleZoomOut = () => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      const space = chart.getBarSpace?.() || 6;
      chart.setBarSpace?.(Math.max(space - 2, 2));
    } catch (_) {
      chart.zoomAtCoordinate?.(-0.25);
    }
  };

  const handleStretchY = () => {
    zoomPriceY(chartRef.current, 0.85);
  };

  const handleCompressY = () => {
    zoomPriceY(chartRef.current, 1.18);
  };

  const handleReset = () => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      chart.setBarSpace?.(6);
      chart.scrollToRealTime?.();
      resetPriceY(chart);
    } catch (_) {}
  };

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-md border bg-card/90 p-0.5 shadow-sm ${className}`}>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 hover:bg-muted"
        onClick={handleZoomIn}
        title="Zoom horizontal avant (+)"
      >
        <span className="font-bold text-xs leading-none">+</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 hover:bg-muted"
        onClick={handleZoomOut}
        title="Zoom horizontal arrière (−)"
      >
        <span className="font-bold text-xs leading-none">−</span>
      </Button>
      <div className="h-3 w-[1px] bg-border mx-0.5" />
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1 text-[11px] font-semibold hover:bg-muted"
        onClick={handleStretchY}
        title="Étirer verticalement l'axe des prix (bougies plus hautes)"
      >
        ↕+
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1 text-[11px] font-semibold hover:bg-muted"
        onClick={handleCompressY}
        title="Compresser verticalement l'axe des prix (bougies plus plates)"
      >
        ↕−
      </Button>
      <div className="h-3 w-[1px] bg-border mx-0.5" />
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1.5 text-[10px] font-semibold hover:bg-muted"
        onClick={handleReset}
        title="Échelle automatique X et Y / Réinitialiser"
      >
        Auto
      </Button>
    </div>
  );
}
