// Modale d'analyse IA d'un événement économique.
// Onglets : Avant publication (pre) · Analyse fondamentale (fundamental) ·
// Après publication (post). Chaque analyse est demandée à la volée au backend
// (POST /api/economics/analyze) et mise en cache côté serveur.

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Sparkles, Clock, BookOpen, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { Pill, IMPACT_STYLE, IMPACT_LABEL, FundamentalAnalysis, PostReleaseAnalysis } from './shared';

const TABS = [
  { id: 'pre', label: 'Avant', icon: Clock },
  { id: 'fundamental', label: 'Fondamentale', icon: BookOpen },
  { id: 'post', label: 'Après', icon: CheckCircle2 },
];

export default function EventAnalysisModal({ event, open, onOpenChange, aiEnabled = true }) {
  const [tab, setTab] = useState('fundamental');
  // Cache local des résultats par type déjà chargé pour cet événement.
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [actual, setActual] = useState('');

  if (!event) return null;

  const runAnalysis = async (type) => {
    if (!aiEnabled) {
      toast.error("L'analyse IA n'est pas activée sur le serveur.");
      return;
    }
    if (type === 'post' && !actual.trim() && !event.actual) {
      toast.error('Saisissez la valeur publiée (actual) pour analyser la réaction.');
      return;
    }
    setLoading(true);
    try {
      const body = { event_id: event.id, type };
      if (type === 'post') body.actual = actual.trim() || event.actual;
      const { data } = await api.post('/economics/analyze', body);
      setResults((prev) => ({ ...prev, [type]: data.analysis }));
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'analyse IA.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const eventDate = new Date(event.date);

  const renderTabBody = (type) => {
    const result = results[type];
    return (
      <div className="space-y-4">
        {type === 'post' && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end rounded-lg border bg-muted/30 p-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Valeur publiée (actual)
              </label>
              <Input
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                placeholder={event.actual || 'Ex: 3.2%, 250K...'}
              />
            </div>
          </div>
        )}

        {!result ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground max-w-sm">
              {type === 'pre' && 'Analyse des attentes du marché avant la publication : consensus, scénarios et volatilité attendue.'}
              {type === 'fundamental' && 'Analyse fondamentale complète : importance, actifs concernés et scénarios haussier/baissier/neutre.'}
              {type === 'post' && 'Analyse de la réaction du marché après publication (comparaison prévu / publié).'}
            </p>
            <Button onClick={() => runAnalysis(type)} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Analyse en cours…' : "Lancer l'analyse IA"}
            </Button>
          </div>
        ) : (
          <>
            {type === 'post' ? <PostReleaseAnalysis data={result} /> : <FundamentalAnalysis data={result} />}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => runAnalysis(type)} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Régénérer
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div className="flex items-start gap-2 flex-wrap pr-6">
            <Pill className="bg-primary/10 text-primary border-primary/20">{event.currency}</Pill>
            <Pill className={IMPACT_STYLE[event.impact] || ''}>{IMPACT_LABEL[event.impact] || event.impact}</Pill>
          </div>
          <DialogTitle className="mt-2">{event.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {eventDate.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Précédent : <strong className="text-foreground">{event.previous || '—'}</strong></span>
            <span>Prévision : <strong className="text-foreground">{event.forecast || '—'}</strong></span>
            <span>Publié : <strong className="text-foreground">{event.actual || '—'}</strong></span>
          </div>
        </DialogHeader>

        {!aiEnabled && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700">
            L'analyse IA n'est pas disponible : la clé <code>ANTHROPIC_API_KEY</code> n'est pas configurée sur le serveur.
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="w-full">
            {TABS.map((tt) => {
              const Icon = tt.icon;
              return (
                <TabsTrigger key={tt.id} value={tt.id} className="flex-1 gap-1.5">
                  <Icon className="h-4 w-4" /> {tt.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {TABS.map((tt) => (
            <TabsContent key={tt.id} value={tt.id}>{renderTabBody(tt.id)}</TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
