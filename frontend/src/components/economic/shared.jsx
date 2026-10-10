// Composants et helpers partagés du module « Annonces économiques ».
// Rendu des analyses IA structurées (actifs impactés, scénarios, badges).

import React from 'react';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Gauge,
  Coins, LineChart, Bitcoin, Building2, Landmark, CircleDollarSign,
} from 'lucide-react';
import { useLanguageStore } from '../../store/languageStore';

// --- Couleurs / libellés ----------------------------------------------------

// Couleur de pastille selon l'importance Forex Factory.
export const IMPACT_STYLE = {
  High: 'bg-red-500/15 text-red-600 border-red-500/30',
  Medium: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  Low: 'bg-green-500/15 text-green-600 border-green-500/30',
  Holiday: 'bg-muted text-muted-foreground border-border',
};
export const IMPACT_LABEL = { High: 'Élevé', Medium: 'Moyen', Low: 'Faible', Holiday: 'Férié' };
export const IMPACT_LABEL_EN = { High: 'High', Medium: 'Medium', Low: 'Low', Holiday: 'Holiday' };

// Niveaux « faible/moyen/eleve » renvoyés par l'IA.
export const LEVEL_STYLE = {
  eleve: 'bg-red-500/15 text-red-600 border-red-500/30',
  elevee: 'bg-red-500/15 text-red-600 border-red-500/30',
  moyen: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  moyenne: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  faible: 'bg-green-500/15 text-green-600 border-green-500/30',
};
export const LEVEL_LABEL_EN = {
  eleve: 'High',
  elevee: 'High',
  moyen: 'Medium',
  moyenne: 'Medium',
  faible: 'Low',
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
export const TONE_LABEL_EN = {
  hawkish: '🦅 Hawkish (tightening)',
  dovish: '🕊️ Dovish (accommodative)',
  neutre: '⚖️ Neutral',
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
export const SURPRISE_LABEL_EN = {
  meilleur_que_prevu: '📈 Better than expected',
  pire_que_prevu: '📉 Worse than expected',
  conforme: '➖ In line with expectations',
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
  const { language } = useLanguageStore();
  const isEn = language === 'en';
  if (!assets.length) return null;
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{isEn ? 'Asset' : 'Actif'}</th>
            <th className="px-3 py-2 text-left font-medium">{isEn ? 'Direction' : 'Sens'}</th>
            <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">{isEn ? 'Confidence' : 'Confiance'}</th>
            <th className="px-3 py-2 text-left font-medium hidden md:table-cell">{isEn ? 'Rationale' : 'Pourquoi'}</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a, i) => {
            const Icon = CATEGORY_ICON[a.category] || CircleDollarSign;
            const dirLabel = isEn
              ? (a.direction === 'hausse' ? 'Bullish / Up' : a.direction === 'baisse' ? 'Bearish / Down' : 'Neutral')
              : a.direction;
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
                    <span className="capitalize">{dirLabel}</span>
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

// Bloc de données d'annonce (date, pays, type, valeurs, source) — pour EventAnalysisModal.
export function EventDataBlock({ event }) {
  const { language } = useLanguageStore();
  const isEn = language === 'en';
  if (!event) return null;
  const eventDate = new Date(event.date);
  const hasActual = event.actual != null && event.actual !== '';
  const hasForecast = event.forecast != null && event.forecast !== '';

  let actualColor = '';
  if (hasActual && hasForecast) {
    const act = parseFloat(String(event.actual).replace(/[^0-9.-]/g, ''));
    const fore = parseFloat(String(event.forecast).replace(/[^0-9.-]/g, ''));
    if (!isNaN(act) && !isNaN(fore)) {
      actualColor = act > fore ? 'text-green-600 font-semibold' : act < fore ? 'text-red-600 font-semibold' : 'font-semibold';
    }
  }

  const impactTxt = isEn ? (IMPACT_LABEL_EN[event.impact] || event.impact) : (IMPACT_LABEL[event.impact] || event.impact);

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
      <h4 className="font-semibold text-foreground/90">{isEn ? '📋 Economic Release Data' : "📋 Données de l'annonce"}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
        <div>
          <span className="text-muted-foreground">{isEn ? '🗓️ Date & Time' : '🗓️ Date & heure'}</span>
          <p className="font-medium">{eventDate.toLocaleString(isEn ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
        {event.flag && event.country_name && (
          <div>
            <span className="text-muted-foreground">{isEn ? '🌐 Country' : '🇺🇸 Pays'}</span>
            <p className="font-medium">{event.flag} {event.country_name}</p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">{isEn ? '💱 Currency' : '💱 Devise'}</span>
          <p className="font-medium">{event.currency}</p>
        </div>
        {event.event_type && event.event_type !== 'other' && (
          <div>
            <span className="text-muted-foreground">{isEn ? '📌 Category' : '📌 Type'}</span>
            <p className="font-medium capitalize">{event.event_type.replace('_', ' ')}</p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">{isEn ? '🔴 Impact' : '🔴 Importance'}</span>
          <p className="font-medium">{impactTxt}</p>
        </div>
        <div>
          <span className="text-muted-foreground">{isEn ? '📊 Previous' : '📊 Précédent'}</span>
          <p className="font-medium">{event.previous || '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">{isEn ? '🔮 Forecast' : '🔮 Prévision'}</span>
          <p className="font-medium">{event.forecast || '—'}</p>
        </div>
        {hasActual && (
          <div>
            <span className="text-muted-foreground">{isEn ? '✅ Actual' : '✅ Publié'}</span>
            <p className={actualColor || 'font-medium'}>{event.actual}</p>
          </div>
        )}
        {event.revised && (
          <div>
            <span className="text-muted-foreground">{isEn ? '🔄 Revised' : '🔄 Révisé'}</span>
            <p className="font-medium">{event.revised}</p>
          </div>
        )}
      </div>
      {event.source_name && (
        <div className="pt-2 border-t">
          <span className="text-muted-foreground text-xs">{isEn ? '🏛️ Official Source: ' : '🏛️ Source officielle : '}</span>
          {event.source_url ? (
            <a href={event.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
              {event.source_name}
            </a>
          ) : (
            <span className="text-xs">{event.source_name}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Liste des scénarios (haussier / baissier / neutre).
export function ScenarioList({ scenarios = [] }) {
  const { language } = useLanguageStore();
  const isEn = language === 'en';
  if (!scenarios.length) return null;
  const style = {
    haussier: 'border-green-500/30 bg-green-500/5',
    baissier: 'border-red-500/30 bg-red-500/5',
    neutre: 'border-border bg-muted/30',
  };
  const labelFr = { haussier: '🟢 Scénario haussier', baissier: '🔴 Scénario baissier', neutre: '⚪ Scénario neutre' };
  const labelEn = { haussier: '🟢 Bullish Scenario', baissier: '🔴 Bearish Scenario', neutre: '⚪ Neutral Scenario' };
  const label = isEn ? labelEn : labelFr;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {scenarios.map((s, i) => (
        <div key={i} className={`rounded-lg border p-3 ${style[s.type] || style.neutre}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">{label[s.type] || s.type}</span>
            <span className="text-xs text-muted-foreground">{s.confidence}%</span>
          </div>
          <p className="text-xs text-muted-foreground mb-1"><strong>{isEn ? 'If:' : 'Si :'}</strong> {s.condition}</p>
          <p className="text-xs"><strong>{isEn ? 'Then:' : 'Alors :'}</strong> {s.consequence}</p>
        </div>
      ))}
    </div>
  );
}

// Encadré « pour débutant ».
export function BeginnerBox({ text }) {
  const { language } = useLanguageStore();
  const isEn = language === 'en';
  if (!text) return null;
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-xs font-semibold text-primary mb-1">
        {isEn ? '💡 Simple Explanation (Beginner Friendly)' : '💡 Explication simple (débutant)'}
      </p>
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
  const { language } = useLanguageStore();
  const isEn = language === 'en';
  if (!data) return null;

  const impLevel = isEn ? (LEVEL_LABEL_EN[data.importance_level] || data.importance_level) : data.importance_level;
  const volLevel = isEn ? (LEVEL_LABEL_EN[data.expected_volatility] || data.expected_volatility) : data.expected_volatility;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {data.importance_level && (
          <Pill className={LEVEL_STYLE[data.importance_level] || ''}>
            <AlertTriangle className="h-3 w-3" /> {isEn ? 'Importance' : 'Importance'} : {impLevel}
          </Pill>
        )}
        {data.expected_volatility && (
          <Pill className={LEVEL_STYLE[data.expected_volatility] || ''}>
            <Gauge className="h-3 w-3" /> {isEn ? 'Volatility' : 'Volatilité'} : {volLevel}
          </Pill>
        )}
      </div>

      {data.summary && <Block title={isEn ? 'Summary' : 'Résumé'}><p className="text-sm text-muted-foreground">{data.summary}</p></Block>}
      {data.importance && <Block title={isEn ? 'Why it matters' : "Pourquoi c'est important"}><p className="text-sm text-muted-foreground">{data.importance}</p></Block>}

      {data.affected_assets?.length > 0 && (
        <Block icon={TrendingUp} title={isEn ? 'Affected Assets' : 'Actifs concernés'}><AssetTable assets={data.affected_assets} /></Block>
      )}
      {data.scenarios?.length > 0 && (
        <Block title={isEn ? 'Scenarios' : 'Scénarios'}><ScenarioList scenarios={data.scenarios} /></Block>
      )}
      {data.watch_points?.length > 0 && (
        <Block icon={AlertTriangle} title={isEn ? 'Key Watchpoints' : 'Points de vigilance'}>
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
  const { language } = useLanguageStore();
  const isEn = language === 'en';
  if (!data) return null;

  const surpriseLabel = isEn ? (SURPRISE_LABEL_EN[data.surprise] || data.surprise) : (SURPRISE_LABEL[data.surprise] || data.surprise);

  return (
    <div className="space-y-5">
      {data.surprise && (
        <Pill className={SURPRISE_STYLE[data.surprise] || ''}>{surpriseLabel}</Pill>
      )}
      {data.comparison && <Block title={isEn ? 'Forecast vs Actual Comparison' : 'Comparaison prévu / publié'}><p className="text-sm text-muted-foreground">{data.comparison}</p></Block>}
      {data.market_reaction && <Block title={isEn ? 'Market Reaction' : 'Réaction du marché'}><p className="text-sm text-muted-foreground">{data.market_reaction}</p></Block>}
      {data.affected_assets?.length > 0 && (
        <Block icon={TrendingUp} title={isEn ? 'Impacted Assets' : 'Actifs impactés'}><AssetTable assets={data.affected_assets} /></Block>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.immediate_effect && (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-semibold text-primary mb-1">⚡ {isEn ? 'Immediate Effect' : 'Effet immédiat'}</p>
            <p className="text-sm text-muted-foreground">{data.immediate_effect}</p>
          </div>
        )}
        {data.progressive_effect && (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-semibold text-primary mb-1">📅 {isEn ? 'Progressive Effect' : 'Effet progressif'}</p>
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
  const { language } = useLanguageStore();
  const isEn = language === 'en';
  if (!data) return null;

  const toneLabel = isEn ? (TONE_LABEL_EN[data.tone] || data.tone) : (TONE_LABEL[data.tone] || data.tone);

  return (
    <div className="space-y-5">
      {data.tone && <Pill className={TONE_STYLE[data.tone] || ''}>{toneLabel}</Pill>}
      {data.summary && <Block title={isEn ? 'Summary' : 'Résumé'}><p className="text-sm text-muted-foreground">{data.summary}</p></Block>}
      {data.tone_explanation && <Block title={isEn ? 'Policy Tone Rationale' : 'Pourquoi ce ton'}><p className="text-sm text-muted-foreground">{data.tone_explanation}</p></Block>}
      {data.consequences && <Block title={isEn ? 'Market Consequences' : 'Conséquences pour les marchés'}><p className="text-sm text-muted-foreground">{data.consequences}</p></Block>}
      {data.affected_assets?.length > 0 && (
        <Block icon={TrendingUp} title={isEn ? 'Affected Assets' : 'Actifs concernés'}><AssetTable assets={data.affected_assets} /></Block>
      )}
      <BeginnerBox text={data.beginner_summary} />
    </div>
  );
}
