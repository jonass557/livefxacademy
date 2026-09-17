// Enrichissement des événements économiques — sans API externe, toujours actif.
// Dérive : devise → pays + drapeau, titre → type d'événement, type → source officielle.

// Mapping devise → pays + code ISO alpha-2 (pour le drapeau emoji ou l'API Flagcdn).
const CURRENCY_TO_COUNTRY = {
  USD: { name: 'États-Unis', code: 'US' },
  EUR: { name: 'Zone euro', code: 'EU' },
  GBP: { name: 'Royaume-Uni', code: 'GB' },
  JPY: { name: 'Japon', code: 'JP' },
  CHF: { name: 'Suisse', code: 'CH' },
  CAD: { name: 'Canada', code: 'CA' },
  AUD: { name: 'Australie', code: 'AU' },
  NZD: { name: 'Nouvelle-Zélande', code: 'NZ' },
  CNY: { name: 'Chine', code: 'CN' },
  INR: { name: 'Inde', code: 'IN' },
  BRL: { name: 'Brésil', code: 'BR' },
  ZAR: { name: 'Afrique du Sud', code: 'ZA' },
  MXN: { name: 'Mexique', code: 'MX' },
  SGD: { name: 'Singapour', code: 'SG' },
  HKD: { name: 'Hong Kong', code: 'HK' },
  NOK: { name: 'Norvège', code: 'NO' },
  SEK: { name: 'Suède', code: 'SE' },
  DKK: { name: 'Danemark', code: 'DK' },
  PLN: { name: 'Pologne', code: 'PL' },
  TRY: { name: 'Turquie', code: 'TR' },
  KRW: { name: 'Corée du Sud', code: 'KR' },
};

// Détection du type d'événement depuis le titre (mots-clés).
const EVENT_PATTERNS = [
  // Emploi
  { type: 'employment', keywords: ['nfp', 'payroll', 'emploi', 'unemployment', 'chômage', 'jobless', 'job', 'adp'] },
  // Inflation
  { type: 'inflation', keywords: ['cpi', 'ppi', 'inflation', 'price', 'prix', 'pce'] },
  // Taux d'intérêt / politique monétaire
  { type: 'interest_rate', keywords: ['rate', 'taux', 'fomc', 'fed', 'bce', 'ecb', 'boe', 'boj', 'rba', 'rbnz', 'bnc', 'monetary'] },
  // Croissance / PIB
  { type: 'growth', keywords: ['gdp', 'pib', 'growth', 'croissance'] },
  // Commerce / balance
  { type: 'trade', keywords: ['trade', 'commerce', 'balance', 'export', 'import'] },
  // Ventes / consommation
  { type: 'retail', keywords: ['retail', 'sales', 'vente', 'consumer', 'consommation'] },
  // Production / industrie
  { type: 'production', keywords: ['industrial', 'production', 'manufacturing', 'pmi', 'ism'] },
  // Construction / logement
  { type: 'housing', keywords: ['housing', 'logement', 'building', 'construction', 'starts'] },
  // Confiance / sentiment
  { type: 'sentiment', keywords: ['confidence', 'confiance', 'sentiment', 'index', 'survey'] },
];

// Sources officielles par type d'événement (principales, US/EUR/UK/JP).
const EVENT_SOURCES = {
  employment: {
    name: 'Bureau of Labor Statistics (US)',
    url: 'https://www.bls.gov/news.release/empsit.toc.htm',
  },
  inflation: {
    name: 'Bureau of Labor Statistics (US)',
    url: 'https://www.bls.gov/news.release/cpi.toc.htm',
  },
  interest_rate: {
    name: 'Federal Reserve (US)',
    url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
  },
  growth: {
    name: 'Bureau of Economic Analysis (US)',
    url: 'https://www.bea.gov/news/schedule',
  },
  trade: {
    name: 'Census Bureau (US)',
    url: 'https://www.census.gov/foreign-trade/Press-Release/current_press_release/index.html',
  },
  retail: {
    name: 'Census Bureau (US)',
    url: 'https://www.census.gov/retail/index.html',
  },
  production: {
    name: 'Federal Reserve (US)',
    url: 'https://www.federalreserve.gov/releases/g17/',
  },
  housing: {
    name: 'Census Bureau (US)',
    url: 'https://www.census.gov/construction/nrc/index.html',
  },
  sentiment: {
    name: 'University of Michigan',
    url: 'http://www.sca.isr.umich.edu/',
  },
};

// Drapeau emoji depuis le code pays ISO alpha-2.
function flagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '';
  const code = countryCode.toUpperCase();
  // Emojis drapeaux = code région (U+1F1E6-U+1F1FF) : A=🇦, B=🇧…
  // Formule : 0x1F1E6 + ('A'.charCodeAt(0) = 65) → A = U+1F1E6.
  const offset = 0x1F1E6 - 65;
  return String.fromCodePoint(code.charCodeAt(0) + offset, code.charCodeAt(1) + offset);
}

function detectEventType(title) {
  const lower = title.toLowerCase();
  for (const { type, keywords } of EVENT_PATTERNS) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return 'other';
}

function enrichEvent(event) {
  // Pays et drapeau depuis la devise.
  const country = CURRENCY_TO_COUNTRY[event.currency];
  if (country && !event.country_name) {
    event.country_name = country.name;
    event.country_code = country.code;
    event.flag = flagEmoji(country.code);
  }

  // Type d'événement depuis le titre.
  if (!event.event_type) {
    event.event_type = detectEventType(event.title);
  }

  // Source officielle depuis le type.
  if (!event.source_name && event.event_type) {
    const src = EVENT_SOURCES[event.event_type];
    if (src) {
      event.source_name = src.name;
      event.source_url = src.url;
    }
  }

  return event;
}

module.exports = { enrichEvent, CURRENCY_TO_COUNTRY, EVENT_PATTERNS, EVENT_SOURCES };
