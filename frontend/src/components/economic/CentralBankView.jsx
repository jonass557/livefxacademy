// Résumés IA des banques centrales (feature 5).
// Sélection d'une banque → POST /api/economics/central-bank → ton dovish/hawkish,
// conséquences, actifs concernés, synthèse débutants. Contexte facultatif saisi
// par l'utilisateur (ex: dernier communiqué).

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, Sparkles, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { CentralBankAnalysis } from './shared';

const BANKS = [
  { id: 'Fed', label: 'Fed', desc: 'Réserve fédérale (USD)', flag: '🇺🇸' },
  { id: 'BCE', label: 'BCE', desc: 'Banque centrale européenne (EUR)', flag: '🇪🇺' },
  { id: 'BoE', label: 'BoE', desc: "Banque d'Angleterre (GBP)", flag: '🇬🇧' },
  { id: 'BoJ', label: 'BoJ', desc: 'Banque du Japon (JPY)', flag: '🇯🇵' },
  { id: 'BoC', label: 'BoC', desc: 'Banque du Canada (CAD)', flag: '🇨🇦' },
  { id: 'BNS', label: 'BNS', desc: 'Banque nationale suisse (CHF)', flag: '🇨🇭' },
  { id: 'RBA', label: 'RBA', desc: "Banque de réserve d'Australie (AUD)", flag: '🇦🇺' },
  { id: 'RBNZ', label: 'RBNZ', desc: 'Banque de réserve de N.-Zélande (NZD)', flag: '🇳🇿' },
];

export default function CentralBankView({ aiEnabled = true }) {
  const [selected, setSelected] = useState(null);
  const [context, setContext] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async (bank) => {
    if (!aiEnabled) {
      toast.error("L'analyse IA n'est pas activée sur le serveur.");
      return;
    }
    setSelected(bank);
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post('/economics/central-bank', { bank: bank.id, context: context.trim() });
      setResult(data.analysis);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'analyse de la banque centrale.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {BANKS.map((b) => (
          <button
            key={b.id}
            onClick={() => analyze(b)}
            className={`text-left rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${
              selected?.id === b.id ? 'border-primary ring-1 ring-primary/40 bg-primary/5' : 'bg-card hover:border-primary/40'
            }`}
          >
            <div className="text-2xl mb-1">{b.flag}</div>
            <div className="font-bold">{b.label}</div>
            <div className="text-xs text-muted-foreground">{b.desc}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" /> Contexte (facultatif)
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Collez ici le dernier communiqué / la décision de taux si vous en avez un, pour une analyse plus précise…"
            className="w-full border rounded-md px-3 py-2 bg-background min-h-[70px] text-sm"
          />
          {selected && (
            <Button onClick={() => analyze(selected)} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Analyse en cours…' : `Analyser ${selected.label}`}
            </Button>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Analyse de {selected?.label} en cours…
        </div>
      )}

      {result && !loading && (
        <Card>
          <CardContent className="p-4 md:p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">{selected?.flag}</span> {selected?.desc}
            </h3>
            <CentralBankAnalysis data={result} />
          </CardContent>
        </Card>
      )}

      {!selected && !loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Landmark className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Sélectionnez une banque centrale pour obtenir un résumé pédagogique de sa politique monétaire.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
