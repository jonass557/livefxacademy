// Couche IA « annonces économiques » : appelle l'API Claude via le SDK officiel
// pour produire des analyses fondamentales structurées et répondre au chatbot.
//
// - Modèle : `claude-opus-4-8` (surchargé par ANTHROPIC_MODEL).
// - Clé : ANTHROPIC_API_KEY (à définir dans les variables d'environnement du
//   backend). Si absente, le module renvoie `configured=false` et les
//   contrôleurs répondent proprement sans planter.
// - Sorties structurées via `output_config.format` (json_schema) : Claude est
//   contraint de répondre selon le schéma, donc `JSON.parse` est sûr.

const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

let client = null;
function getClient() {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

function isConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// --- Schémas de sortie structurée -----------------------------------------

// Un actif impacté avec direction attendue et score de confiance (0-100).
const ASSET_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', description: "Nom de l'actif (ex: EUR/USD, Or, Nasdaq, BTC)" },
    category: {
      type: 'string',
      enum: ['devise', 'matiere_premiere', 'indice', 'crypto', 'action', 'obligation'],
    },
    direction: { type: 'string', enum: ['hausse', 'baisse', 'neutre'] },
    confidence: { type: 'integer', description: 'Confiance en %, 0 à 100' },
    rationale: { type: 'string', description: 'Justification courte (1 phrase)' },
  },
  required: ['name', 'category', 'direction', 'confidence', 'rationale'],
};

const SCENARIO_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['haussier', 'baissier', 'neutre'] },
    condition: { type: 'string', description: 'Ce qui déclenche ce scénario' },
    consequence: { type: 'string', description: 'Réaction attendue du marché' },
    confidence: { type: 'integer', description: 'Probabilité estimée en %' },
  },
  required: ['type', 'condition', 'consequence', 'confidence'],
};

// Analyse fondamentale complète (features 2 & 3).
const FUNDAMENTAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', description: "Résumé pédagogique de l'événement" },
    importance: { type: 'string', description: "Pourquoi cet événement compte pour les marchés" },
    importance_level: { type: 'string', enum: ['faible', 'moyen', 'eleve'] },
    expected_volatility: { type: 'string', enum: ['faible', 'moyenne', 'elevee'] },
    affected_assets: { type: 'array', items: ASSET_ITEM },
    scenarios: { type: 'array', items: SCENARIO_ITEM },
    watch_points: {
      type: 'array',
      items: { type: 'string' },
      description: 'Points de vigilance / à surveiller',
    },
    beginner_summary: { type: 'string', description: 'Explication très simple pour débutant' },
  },
  required: [
    'summary', 'importance', 'importance_level', 'expected_volatility',
    'affected_assets', 'scenarios', 'watch_points', 'beginner_summary',
  ],
};

// Analyse après publication (feature 4) : comparaison previous/forecast/actual.
const POST_RELEASE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    comparison: { type: 'string', description: 'Comparaison previous vs forecast vs actual' },
    surprise: { type: 'string', enum: ['meilleur_que_prevu', 'pire_que_prevu', 'conforme'] },
    market_reaction: { type: 'string', description: 'Pourquoi le marché monte/baisse' },
    affected_assets: { type: 'array', items: ASSET_ITEM },
    immediate_effect: { type: 'string', description: 'Effet immédiat (minutes/heures)' },
    progressive_effect: { type: 'string', description: 'Effet progressif (jours/semaines)' },
    beginner_summary: { type: 'string', description: 'Explication simple pour débutant' },
  },
  required: [
    'comparison', 'surprise', 'market_reaction', 'affected_assets',
    'immediate_effect', 'progressive_effect', 'beginner_summary',
  ],
};

// Résumé banque centrale (feature 5).
const CENTRAL_BANK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', description: 'Résumé de la décision / communication' },
    tone: { type: 'string', enum: ['dovish', 'hawkish', 'neutre'] },
    tone_explanation: { type: 'string', description: 'Pourquoi ce ton' },
    consequences: { type: 'string', description: 'Conséquences pour les marchés' },
    affected_assets: { type: 'array', items: ASSET_ITEM },
    beginner_summary: { type: 'string', description: 'Synthèse pour débutants' },
  },
  required: ['summary', 'tone', 'tone_explanation', 'consequences', 'affected_assets', 'beginner_summary'],
};

// --- Appel générique ------------------------------------------------------

// Appelle Claude avec une sortie structurée. Renvoie l'objet validé.
async function callStructured({ system, prompt, schema }) {
  const c = getClient();
  if (!c) throw new Error('ANTHROPIC_API_KEY non configurée');

  const res = await c.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema } },
  });

  const textBlock = res.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('Réponse IA vide');
  return JSON.parse(textBlock.text);
}

const BASE_SYSTEM =
  "Tu es un analyste macroéconomique expert et pédagogue pour une académie de trading francophone (LiveFx Academy). " +
  "Tu expliques les annonces économiques de façon claire, structurée et accessible aux débutants comme aux traders confirmés. " +
  "Tu restes factuel, prudent, et rappelles que ce ne sont pas des conseils financiers. Réponds toujours en français.";

// Décrit un événement pour le prompt.
function describeEvent(ev, extra = {}) {
  const lines = [
    `Événement : ${ev.title}`,
    `Devise/Pays : ${ev.currency}`,
    `Date : ${ev.date}`,
    `Importance : ${ev.impact}`,
    ev.previous ? `Valeur précédente (previous) : ${ev.previous}` : null,
    ev.forecast ? `Prévision (forecast) : ${ev.forecast}` : null,
    (extra.actual || ev.actual) ? `Valeur publiée (actual) : ${extra.actual || ev.actual}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

// Feature 2 : analyse fondamentale générale d'un événement.
async function analyzeFundamental(ev) {
  const prompt =
    `Analyse cet événement économique de façon fondamentale et pédagogique.\n\n${describeEvent(ev)}\n\n` +
    `Explique son importance, la volatilité attendue, les actifs concernés (devises, matières premières, indices, cryptos) ` +
    `avec pour chacun une direction attendue et un score de confiance en %, ainsi que des scénarios haussier/baissier/neutre.`;
  return callStructured({ system: BASE_SYSTEM, prompt, schema: FUNDAMENTAL_SCHEMA });
}

// Feature 3 : analyse AVANT publication (attentes, consensus, scénarios).
async function analyzePreRelease(ev) {
  const prompt =
    `Nous sommes AVANT la publication de cet événement. Analyse les attentes du marché.\n\n${describeEvent(ev)}\n\n` +
    `Détaille le consensus, les scénarios si le résultat est meilleur ou pire que prévu, les conséquences, ` +
    `les actifs les plus réactifs et la volatilité attendue.`;
  return callStructured({ system: BASE_SYSTEM, prompt, schema: FUNDAMENTAL_SCHEMA });
}

// Feature 4 : analyse APRÈS publication (nécessite `actual`).
async function analyzePostRelease(ev, actual) {
  const prompt =
    `L'événement vient d'être publié. Analyse la réaction du marché.\n\n${describeEvent(ev, { actual })}\n\n` +
    `Compare previous / forecast / actual, explique pourquoi le marché réagit ainsi, ` +
    `quels actifs sont impactés (avec direction et confiance), l'effet immédiat et l'effet progressif.`;
  return callStructured({ system: BASE_SYSTEM, prompt, schema: POST_RELEASE_SCHEMA });
}

// Feature 5 : résumé banque centrale.
async function analyzeCentralBank(bankName, context = '') {
  const prompt =
    `Résume la dernière communication / décision de politique monétaire de la banque centrale : ${bankName}.\n` +
    (context ? `Contexte fourni : ${context}\n` : '') +
    `Indique le ton (dovish/hawkish/neutre) et pourquoi, les conséquences pour les marchés, ` +
    `les actifs concernés (avec direction et confiance) et une synthèse pour débutants.`;
  return callStructured({ system: BASE_SYSTEM, prompt, schema: CENTRAL_BANK_SCHEMA });
}

// Feature 6 : chatbot pédagogique (réponse texte libre, pas de schéma).
async function chat(question, calendarContext = '') {
  const c = getClient();
  if (!c) throw new Error('ANTHROPIC_API_KEY non configurée');

  const system =
    BASE_SYSTEM +
    " Tu réponds aux questions des étudiants sur les annonces économiques, les indicateurs (NFP, CPI, PPI, PMI...), " +
    "les banques centrales et l'impact sur les devises et marchés. Sois clair, concis et pédagogique.";

  const prompt = calendarContext
    ? `Contexte — calendrier économique de la semaine :\n${calendarContext}\n\nQuestion de l'étudiant : ${question}`
    : question;

  const res = await c.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  const textBlock = res.content.find((b) => b.type === 'text');
  return textBlock ? textBlock.text : '';
}

module.exports = {
  isConfigured,
  MODEL,
  analyzeFundamental,
  analyzePreRelease,
  analyzePostRelease,
  analyzeCentralBank,
  chat,
};
