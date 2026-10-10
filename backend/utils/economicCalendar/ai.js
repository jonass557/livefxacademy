// Couche IA « annonces économiques » :
// Supporte Google Gemini (recommandé, configuré via l'admin ou process.env.GEMINI_API_KEY)
// avec fallback transparent sur Anthropic Claude (process.env.ANTHROPIC_API_KEY).
//
// - Détection intelligente de la langue de l'utilisateur (français ou anglais).
// - Analyses fondamentales structurées, pré/post publication et banques centrales.
// - Chatbot conversationnel pédagogique en temps réel.

const Anthropic = require('@anthropic-ai/sdk');
const { BrandingSettings } = require('../../models');

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

let anthropicClient = null;
function getAnthropicClient() {
  if (anthropicClient) return anthropicClient;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

// Récupère dynamiquement la clé Gemini (priorité à la base de données BrandingSettings, puis process.env)
async function getGeminiApiKey() {
  try {
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    if (branding?.gemini_api_key && branding.gemini_api_key.trim()) {
      return branding.gemini_api_key.trim();
    }
  } catch (_) {}
  return (process.env.GEMINI_API_KEY || '').trim();
}

async function isConfigured() {
  const geminiKey = await getGeminiApiKey();
  return !!(geminiKey || process.env.ANTHROPIC_API_KEY);
}

// --- Appel direct Gemini REST API ---
async function callGemini({ system, prompt, jsonMode = false }) {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: system ? { parts: [{ text: system }] } : undefined,
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2500,
      responseMimeType: jsonMode ? 'application/json' : 'text/plain',
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[Gemini API Error]', response.status, errText);
    throw new Error(`Erreur Gemini API (${response.status}) : ${errText.slice(0, 150)}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Réponse vide retournée par Gemini');

  if (jsonMode) {
    // Nettoyer les backticks markdown au cas où
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(clean);
  }
  return text;
}

// --- Schémas de sortie structurée ---
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

// --- Appel générique structuré (Gemini en priorité, Claude en fallback) ---
async function callStructured({ system, prompt, schema }) {
  const geminiKey = await getGeminiApiKey();

  if (geminiKey) {
    try {
      const fullPrompt = `${prompt}\n\nIMPORTANT: Réponds OBLIGATOIREMENT sous la forme d'un objet JSON strict respectant la structure suivante :\n${JSON.stringify(schema, null, 2)}`;
      return await callGemini({ system, prompt: fullPrompt, jsonMode: true });
    } catch (err) {
      console.warn('[AI] Gemini structured call failed, falling back to Anthropic if available:', err.message);
      if (!process.env.ANTHROPIC_API_KEY) throw err;
    }
  }

  const c = getAnthropicClient();
  if (!c) throw new Error("Aucune clé API IA (Google Gemini ou Anthropic Claude) n'est configurée");

  const res = await c.messages.create({
    model: CLAUDE_MODEL,
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
  "Tu es un analyste macroéconomique expert et pédagogue pour l'académie de trading LivefxTrading. " +
  "Tu expliques les annonces économiques de façon claire, structurée et accessible aux débutants comme aux traders confirmés. " +
  "Tu restes factuel, prudent, et rappelles que ce ne sont pas des conseils financiers.";

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
  return callStructured({ system: `${BASE_SYSTEM} Réponds en français.`, prompt, schema: FUNDAMENTAL_SCHEMA });
}

// Feature 3 : analyse AVANT publication (attentes, consensus, scénarios).
async function analyzePreRelease(ev) {
  const prompt =
    `Nous sommes AVANT la publication de cet événement. Analyse les attentes du marché.\n\n${describeEvent(ev)}\n\n` +
    `Détaille le consensus, les scénarios si le résultat est meilleur ou pire que prévu, les conséquences, ` +
    `les actifs les plus réactifs et la volatilité attendue.`;
  return callStructured({ system: `${BASE_SYSTEM} Réponds en français.`, prompt, schema: FUNDAMENTAL_SCHEMA });
}

// Feature 4 : analyse APRÈS publication (nécessite actual).
async function analyzePostRelease(ev, actual) {
  const prompt =
    `L'événement vient d'être publié. Analyse la réaction du marché.\n\n${describeEvent(ev, { actual })}\n\n` +
    `Compare previous / forecast / actual, explique pourquoi le marché réagit ainsi, ` +
    `quels actifs sont impactés (avec direction et confiance), l'effet immédiat et l'effet progressif.`;
  return callStructured({ system: `${BASE_SYSTEM} Réponds en français.`, prompt, schema: POST_RELEASE_SCHEMA });
}

// Feature 5 : résumé banque centrale.
async function analyzeCentralBank(bankName, context = '') {
  const prompt =
    `Résume la dernière communication / décision de politique monétaire de la banque centrale : ${bankName}.\n` +
    (context ? `Contexte fourni : ${context}\n` : '') +
    `Indique le ton (dovish/hawkish/neutre) et pourquoi, les conséquences pour les marchés, ` +
    `les actifs concernés (avec direction et confiance) et une synthèse pour débutants.`;
  return callStructured({ system: `${BASE_SYSTEM} Réponds en français.`, prompt, schema: CENTRAL_BANK_SCHEMA });
}

// Feature 6 : chatbot pédagogique intelligent et bilingue.
// Détecte la langue de la question et répond précisément dans cette même langue.
async function chat(question, calendarContext = '') {
  const geminiKey = await getGeminiApiKey();

  // Détection de la langue de la question
  const isEnglishQuestion = /^(what|how|why|when|is|can|explain|tell|which|who|where|should|does|do)\b/i.test(question.trim()) ||
    /\b(the|is|in|on|with|trading|market|rate|dollar|currency)\b/i.test(question.trim());

  const languageInstruction = isEnglishQuestion
    ? "IMPORTANT: The user asked in ENGLISH. You MUST respond fluently and completely in ENGLISH."
    : "IMPORTANT: Réponds couramment et entièrement en FRANÇAIS.";

  const system =
    `${BASE_SYSTEM} ` +
    "Tu es l'assistant macroéconomique et formateur de trading pour les étudiants de la plateforme Livefx Academy. " +
    "Tu réponds avec précision, clarté et pédagogie sur les annonces économiques, les indicateurs (NFP, CPI, PPI, PMI, FOMC, PIB...), " +
    "les taux directeurs des banques centrales et leur impact réel sur les paires de devises, indices boursiers, or et cryptos. " +
    `${languageInstruction}`;

  const prompt = calendarContext
    ? `Economic Calendar Context:\n${calendarContext}\n\nStudent question:\n${question}`
    : question;

  if (geminiKey) {
    try {
      return await callGemini({ system, prompt, jsonMode: false });
    } catch (err) {
      console.warn('[AI Chat] Gemini call failed, trying Anthropic fallback:', err.message);
      if (!process.env.ANTHROPIC_API_KEY) throw err;
    }
  }

  const c = getAnthropicClient();
  if (!c) {
    throw new Error("L'assistant IA n'est pas encore activé. Veuillez configurer la clé API Gemini dans l'administration.");
  }

  const res = await c.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  const textBlock = res.content.find((b) => b.type === 'text');
  return textBlock ? textBlock.text : '';
}

module.exports = {
  isConfigured,
  getGeminiApiKey,
  analyzeFundamental,
  analyzePreRelease,
  analyzePostRelease,
  analyzeCentralBank,
  chat,
};
