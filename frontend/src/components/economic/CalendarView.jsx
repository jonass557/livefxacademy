// Calendrier économique filtrable (feature 1).
// Récupère /api/economics/calendar et regroupe les événements par jour.
// Filtres : période (lastweek/thisweek/nextweek), devise, importance, recherche.
// Cliquer un événement ouvre la modale d'analyse IA.

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  CalendarDays, Search, Loader2, RefreshCw, Filter, Sparkles, ChevronRight,
} from 'lucide-react';
import api from '../../lib/api';
import { Pill, IMPACT_STYLE, IMPACT_LABEL } from './shared';
import EventAnalysisModal from './EventAnalysisModal';

const RANGES = [
  { id: 'thisweek', label: 'Cette semaine' },
  { id: 'nextweek', label: 'Semaine prochaine' },
  { id: 'lastweek', label: 'Semaine dernière' },
  { id: 'all', label: 'Tout' },
];
const IMPACTS = ['High', 'Medium', 'Low'];

// Clé de jour (ex: "lundi 12 août") pour regrouper.
const dayKey = (iso) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export default function CalendarView({ aiEnabled = true }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('thisweek');
  const [currency, setCurrency] = useState('');
  const [impact, setImpact] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [currencies, setCurrencies] = useState([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { range };
      if (currency) params.currency = currency;
      if (impact) params.impact = impact;
      const { data } = await api.get('/economics/calendar', { params });
      setEvents(data.events || []);
      // Alimente la liste des devises depuis les données si vide.
      setCurrencies((prev) => {
        if (prev.length) return prev;
        return [...new Set((data.events || []).map((e) => e.currency).filter(Boolean))].sort();
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger le calendrier économique.');
    } finally {
      setLoading(false);
    }
  };

  // Recharge quand la période/devise/importance changent (filtres serveur).
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, currency, impact]);

  // Recherche texte côté client.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => e.title.toLowerCase().includes(q) || (e.currency || '').toLowerCase().includes(q));
  }, [events, query]);

  // Regroupe par jour en conservant l'ordre chronologique.
  const groups = useMemo(() => {
    const map = new Map();
    for (const ev of filtered) {
      const k = dayKey(ev.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Barre de filtres */}
      <Card>
        <CardContent className="p-3 md:p-4 space-y-3">
          {/* Périodes */}
          <div className="flex flex-wrap gap-2">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === r.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                }`}
              >
                {r.label}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={load} className="gap-1.5 ml-auto" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
          </div>

          {/* Devise / importance / recherche */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border rounded-md px-2 py-2 bg-background text-sm"
              >
                <option value="">Toutes devises</option>
                {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                className="w-full border rounded-md px-2 py-2 bg-background text-sm"
              >
                <option value="">Toute importance</option>
                {IMPACTS.map((i) => <option key={i} value={i}>{IMPACT_LABEL[i]}</option>)}
              </select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher (NFP, CPI, USD…)"
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenu */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Chargement du calendrier…
        </div>
      ) : error ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{error}</CardContent></Card>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Aucun événement pour ces critères.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map(([day, dayEvents]) => (
            <div key={day}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2 capitalize">
                <CalendarDays className="h-4 w-4" /> {day}
                <span className="text-xs font-normal">({dayEvents.length})</span>
              </h3>
              <div className="space-y-2">
                {dayEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setSelected(ev)}
                    className="w-full text-left group flex items-center gap-3 rounded-lg border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="w-14 flex-shrink-0 text-sm font-semibold tabular-nums">
                      {new Date(ev.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <Pill className="bg-primary/10 text-primary border-primary/20 flex-shrink-0">{ev.currency}</Pill>
                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                      ev.impact === 'High' ? 'bg-red-500' : ev.impact === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} title={IMPACT_LABEL[ev.impact]} />
                    <span className="flex-1 text-sm font-medium truncate">{ev.title}</span>
                    <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                      <span>préc. <strong className="text-foreground">{ev.previous || '—'}</strong></span>
                      <span>prév. <strong className="text-foreground">{ev.forecast || '—'}</strong></span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Sparkles className="h-3.5 w-3.5" /> Analyser <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EventAnalysisModal
        event={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        aiEnabled={aiEnabled}
      />
    </div>
  );
}
