// Composants et helpers partagés du module « Annonces économiques ».
// Rendu des analyses IA structurées (actifs impactés, scénarios, badges).

import React from 'react';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Gauge,
  Coins, LineChart, Bitcoin, Building2, Landmark, CircleDollarSign,
} from 'lucide-react';

// --- Couleurs / libellés ----------------------------------------------------

// Couleur de pastille selon l'importance Forex Factory.
export const IMPACT_STYLE = {
  High: 'bg-red-500/15 text-red-600 border-red-500/30',
  Medium: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  Low: 'bg-green-500/15 text-green-600 border-green-500/30',
  Holiday: 'bg-muted text-muted-foreground border-border',
};
export const IMPACT_LABEL = { High: 'Élevé', Medium: 'Moyen', Low: 'Faible', Holiday: 'Férié' };

// Niveaux « faible/moyen/eleve » renvoyés par l'IA.
export const LEVEL_STYLE = {
  eleve: 'bg-red-500/15 text-red-600 border-red-500/30',
  elevee: 'bg-red-500/15 text-red-600 border-red-500/30',
  moyen: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  moyenne: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  faible: 'bg-green-500/15 text-green-600 border-green-500/30',
};

// Ton banque centrale.
export const TONE_STYLE = {
  hawkish: 'bg-red-500/15 text-red-600 border-red-500/30',
  dovish: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  neutre: 'bg-muted text-muted-foreground border-border',
};
export const TONE_LABEL = {
  hawkish: '🦅 Hawkish (restrictif)',
  dovish: '🕊️ Dovish (accommodant)',
  neutre: '⚖️ Neutre',
};

export const SURPRISE_STYLE = {
  meilleur_que_prevu: 'bg-green-500/15 text-green-600 border-green-500/30',
  pire_que_prevu: 'bg-red-500/15 text-red-600 border-red-500/30',
  conforme: 'bg-muted text-muted-foreground border-border',
};
export const SURPRISE_LABEL = {
  meilleur_que_prevu: '📈 Meilleur que prévu',
  pire_que_prevu: '📉 Pire que prévu',
  conforme: '➖ Conforme aux attentes',
};

const CATEGORY_ICON = {
  devise: CircleDollarSign,
  matiere_premiere: Coins,
  indice: LineChart,
  crypto: Bitcoin,
  action: Building2,
  obligation: Landmark,
};

// --- Petits composants ------------------------------------------------------

// Pastille générique bordée.
export function Pill({ className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

// Flèche directionnelle colorée (hausse/baisse/neutre).
export function DirectionArrow({ direction }) {
  if (direction === 'hausse') return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (direction === 'baisse') return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

// Barre de confiance 0-100 %.
export function ConfidenceBar({ value = 0 }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const color = v >= 66 ? 'bg-green-500' : v >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-9 text-right">{v}%</span>
    </div>
  );
}

// Tableau des actifs impactés avec direction et confiance.
export function AssetTable({ assets = [] }) {
  if (!assets.length) return null;
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Actif</th>
            <th className="px-3 py-2 text-left font-medium">Sens</th>
            <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Confiance</th>
            <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Pourquoi</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a, i) => {
            const Icon = CATEGORY_ICON[a.category] || CircleDollarSign;
            return (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                    {a.name}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <DirectionArrow direction={a.direction} />
                    <span className="capitalize">{a.direction}</span>
                  </div>
                </td>
                <td className="px-3 py-2 hidden sm:table-cell"><ConfidenceBar value={a.confidence} /></td>
                <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">{a.rationale}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Liste des scénarios (haussier / baissier / neutre).
export function ScenarioList({ scenarios = [] }) {
  if (!scenarios.length) return null;
  const style = {
    haussier: 'border-green-500/30 bg-green-500/5',
    baissier: 'border-red-500/30 bg-red-500/5',
    neutre: 'border-border bg-muted/30',
  };
  const label = { haussier: '🟢 Scénario haussier', baissier: '🔴 Scénario baissier', neutre: '⚪ Scénario neutre' };
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {scenarios.map((s, i) => (
        <div key={i} className={`rounded-lg border p-3 ${style[s.type] || style.neutre}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">{label[s.type] || s.type}</span>
            <span className="text-xs text-muted-foreground">{s.confidence}%</span>
          </div>
          <p className="text-xs text-muted-foreground mb-1"><strong>Si :</strong> {s.condition}</p>
          <p className="text-xs"><strong>Alors :</strong> {s.consequence}</p>
        </div>
      ))}
    </div>
  );
}

// Encadré « pour débutant ».
export function BeginnerBox({ text }) {
  if (!text) return null;
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-xs font-semibold text-primary mb-1">💡 Explication simple (débutant)</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}

// Titre de section interne.
function Block({ icon: Icon, title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
        {Icon && <Icon className="h-4 w-4 text-primary" />}{title}
      </h4>
      {children}
    </div>
  );
}

// --- Rendu d'une analyse complète ------------------------------------------

// Rend une analyse fondamentale ou « avant publication » (même schéma).
export function FundamentalAnalysis({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {data.importance_level && (
          <Pill className={LEVEL_STYLE[data.importance_level] || ''}>
            <AlertTriangle className="h-3 w-3" /> Importance : {data.importance_level}
          </Pill>
        )}
        {data.expected_volatility && (
          <Pill className={LEVEL_STYLE[data.expected_volatility] || ''}>
            <Gauge className="h-3 w-3" /> Volatilité : {data.expected_volatility}
          </Pill>
        )}
      </div>

      {data.summary && <Block title="Résumé"><p className="text-sm text-muted-foreground">{data.summary}</p></Block>}
      {data.importance && <Block title="Pourquoi c'est important"><p className="text-sm text-muted-foreground">{data.importance}</p></Block>}

      {data.affected_assets?.length > 0 && (
        <Block icon={TrendingUp} title="Actifs concernés"><AssetTable assets={data.affected_assets} /></Block>
      )}
      {data.scenarios?.length > 0 && (
        <Block title="Scénarios"><ScenarioList scenarios={data.scenarios} /></Block>
      )}
      {data.watch_points?.length > 0 && (
        <Block icon={AlertTriangle} title="Points de vigilance">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {data.watch_points.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </Block>
      )}
      <BeginnerBox text={data.beginner_summary} />
    </div>
  );
}

// Rend une analyse « après publication ».
export function PostReleaseAnalysis({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-5">
      {data.surprise && (
        <Pill className={SURPRISE_STYLE[data.surprise] || ''}>{SURPRISE_LABEL[data.surprise] || data.surprise}</Pill>
      )}
      {data.comparison && <Block title="Comparaison prévu / publié"><p className="text-sm text-muted-foreground">{data.comparison}</p></Block>}
      {data.market_reaction && <Block title="Réaction du marché"><p className="text-sm text-muted-foreground">{data.market_reaction}</p></Block>}
      {data.affected_assets?.length > 0 && (
        <Block icon={TrendingUp} title="Actifs impactés"><AssetTable assets={data.affected_assets} /></Block>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.immediate_effect && (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-semibold text-primary mb-1">⚡ Effet immédiat</p>
            <p className="text-sm text-muted-foreground">{data.immediate_effect}</p>
          </div>
        )}
        {data.progressive_effect && (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-semibold text-primary mb-1">📅 Effet progressif</p>
            <p className="text-sm text-muted-foreground">{data.progressive_effect}</p>
          </div>
        )}
      </div>
      <BeginnerBox text={data.beginner_summary} />
    </div>
  );
}

// Rend un résumé de banque centrale.
export function CentralBankAnalysis({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-5">
      {data.tone && <Pill className={TONE_STYLE[data.tone] || ''}>{TONE_LABEL[data.tone] || data.tone}</Pill>}
      {data.summary && <Block title="Résumé"><p className="text-sm text-muted-foreground">{data.summary}</p></Block>}
      {data.tone_explanation && <Block title="Pourquoi ce ton"><p className="text-sm text-muted-foreground">{data.tone_explanation}</p></Block>}
      {data.consequences && <Block title="Conséquences pour les marchés"><p className="text-sm text-muted-foreground">{data.consequences}</p></Block>}
      {data.affected_assets?.length > 0 && (
        <Block icon={TrendingUp} title="Actifs concernés"><AssetTable assets={data.affected_assets} /></Block>
      )}
      <BeginnerBox text={data.beginner_summary} />
    </div>
  );
}
