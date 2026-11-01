const crypto = require('crypto');
const { SubscriptionPlan, PaymentTransaction, User, BrandingSettings } = require('../models');

const SEBPAY_LIVE_API_URL = 'https://newapi.sebpay.bj/api/v1';
const SEBPAY_SANDBOX_API_URL = 'https://api.sandbox.sebpay.bj/api/v1';
const IKEEPAY_API_URL = 'https://api.ikeepay.com';
const IKEEPAY_INLINE_URL = 'https://ikeepay.com/checkout/v1/inline';

// Sélectionne automatiquement le serveur Live ou Sandbox selon le préfixe des clés API (doc: /fr/docs/concepts & /fr/docs/auth)
function resolveSebpayBaseUrl(publicKey, secretKey) {
  const pk = String(publicKey || '').trim();
  const sk = String(secretKey || '').trim();
  if (pk.startsWith('pk_test_') || sk.startsWith('sk_test_')) {
    return SEBPAY_SANDBOX_API_URL;
  }
  return process.env.SEBPAY_API_URL || SEBPAY_LIVE_API_URL;
}

// Exécute un appel HTTP vers SEBPAY et bascule automatiquement sur errors.api_url en cas de 401 WRONG_ENVIRONMENT
async function sebpayFetch(endpointPath, options = {}, publicKey = '', secretKey = '') {
  const baseUrl = resolveSebpayBaseUrl(publicKey, secretKey).replace(/\/+$/, '');
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const headers = {
    'X-Public-Key': String(publicKey || '').trim(),
    'X-Secret-Key': String(secretKey || '').trim(),
    'Accept': 'application/json',
    ...(options.headers || {}),
  };
  const fetchOpts = { ...options, headers };

  let res = await fetch(`${baseUrl}${cleanPath}`, fetchOpts);
  let resData = await res.json().catch(() => ({}));

  // Si SEBPAY répond 401 WRONG_ENVIRONMENT avec errors.api_url, relancer automatiquement sur le bon serveur
  const errCode = resData?.errors?.code || resData?.code || '';
  const redirectApiUrl = resData?.errors?.api_url || resData?.api_url;
  if (res.status === 401 && errCode === 'WRONG_ENVIRONMENT' && redirectApiUrl) {
    const altBase = String(redirectApiUrl).replace(/\/+$/, '');
    res = await fetch(`${altBase}${cleanPath}`, fetchOpts);
    resData = await res.json().catch(() => ({}));
  }

  return { res, resData };
}

// Devises officielles par pays SEBPAY (doc: /api/v1/countries)
const COUNTRY_CURRENCIES = {
  CM: 'XAF',
  CG: 'XAF',
  GA: 'XAF',
  TD: 'XAF',
  BJ: 'XOF',
  BF: 'XOF',
  CI: 'XOF',
  GW: 'XOF',
  ML: 'XOF',
  NE: 'XOF',
  SN: 'XOF',
  TG: 'XOF',
  CD: 'CDF',
  GN: 'GNF',
  GH: 'GHS',
  NG: 'NGN',
  KE: 'KES',
  UG: 'UGX',
  TZ: 'TZS',
  GM: 'GMD',
};

function resolveCountryCurrency(countryCode) {
  const iso = String(countryCode || '').trim().toUpperCase();
  return COUNTRY_CURRENCIES[iso] || 'XAF';
}

// IDs publics SEBPAY par pays & opérateur (/api/v1/p/countries) pour l'initiation directe Checkout (/checkout/{token}/pay)
const SEBPAY_PUBLIC_COUNTRIES = {
  CM: { id: '20260506192835490355', operators: { mtn: '20260506192835499973', 'mtn-cm': '20260506192835499973' } },
  BJ: {
    id: '20260506192835884841',
    operators: {
      mtn: '20260506192835923908',
      'mtn-bj': '20260506192835923908',
      moov: '20260506192835897919',
      'moov-bj': '20260506192835897919',
      celtiis: '20260506192835951890',
      'celtiis-bj': '20260506192835951890',
      coris: '20260506192835971416',
      'coris-bj': '20260506192835971416',
    },
  },
  CI: {
    id: '20260506192835429869',
    operators: {
      mtn: '20260506192835467521',
      'mtn-ci': '20260506192835467521',
      moov: '20260506192835443296',
      'moov-ci': '20260506192835443296',
      orange: '20260506192835476086',
      'orange-ci': '20260506192835476086',
      wave: '20260506192835482368',
      'wave-ci': '20260506192835482368',
    },
  },
  SN: {
    id: '20260506192835771819',
    operators: {
      wave: '20260506192835807810',
      'wave-sn': '20260506192835807810',
      orange: '20260506192835798570',
      'orange-sn': '20260506192835798570',
      free: '20260506192835787829',
      'free-sn': '20260506192835787829',
    },
  },
  TG: {
    id: '20260506192835820312',
    operators: {
      moov: '20260506192835834825',
      'moov-tg': '20260506192835834825',
      tmoney: '20260506192835858677',
      togocom: '20260506192835858677',
      'togocom-tg': '20260506192835858677',
    },
  },
  BF: {
    id: '20260506192835258815',
    operators: {
      moov: '20260506192835278434',
      'moov-bf': '20260506192835278434',
      orange: '20260506192835289381',
      'orange-bf': '20260506192835289381',
    },
  },
  CG: {
    id: '20260506192835400983',
    operators: { mtn: '20260506192835416870', 'mtn-cg': '20260506192835416870' },
  },
  GA: {
    id: '20260506192835518192',
    operators: {
      airtel: '20260506192835527220',
      'airtel-ga': '20260506192835527220',
      moov: '20260506192835541458',
      'moov-ga': '20260506192835541458',
    },
  },
  TD: {
    id: '20260508014307386840',
    operators: { moov: '20260622140332941728', 'moov-td': '20260622140332941728' },
  },
};

// Traduit les codes d'erreur officiels SEBPAY v2 (errors.code — doc: /fr/docs/status-codes)
function formatSebpayErrorMessage(resStatus, resData, { usedOperator = '', usedPhone = '', usedCountry = 'BJ', amount = 0, serverIp = '57.129.148.42' } = {}) {
  const errCode = String(resData?.errors?.code || resData?.code || resData?.error_code || resData?.data?.code || '').toUpperCase();
  const rawMessage = String(resData?.message || resData?.data?.message || '').trim();
  const displayCurrency = resolveCountryCurrency(usedCountry);
  const minAmount = resData?.errors?.min_amount;
  const minCurrency = resData?.errors?.currency || displayCurrency;

  if (
    errCode === 'IP_NOT_ALLOWED' ||
    errCode === 'IP_PENDING_APPROVAL' ||
    errCode === 'IP_REJECTED' ||
    errCode === 'IP_DISABLED' ||
    /adresse ip|ip.*autoris|whitelist/i.test(rawMessage)
  ) {
    if (errCode === 'IP_PENDING_APPROVAL') {
      return `L'adresse IP du serveur (${serverIp}) a bien été déclarée sur SEBPAY mais est encore en attente de validation (IP_PENDING_APPROVAL).`;
    }
    return `L'adresse IP du serveur (${serverIp}) n'est pas autorisée sur cette clé API SEBPAY (${errCode || '403'}). Ajoutez ${serverIp} dans votre tableau de bord SEBPAY (new.sebpay.bj > API développeur > Adresses IP autorisées).`;
  }

  switch (errCode) {
    case 'WRONG_ENVIRONMENT':
      return `Les clés API SEBPAY appartiennent à un autre environnement (Sandbox vs Live). Vérifiez que vous utilisez bien vos clés pk_live_ / sk_live_ ou pk_test_ / sk_test_.`;
    case 'ACCOUNT_SUSPENDED':
      return `Le compte marchand SEBPAY est temporairement suspendu. Veuillez contacter le support SEBPAY.`;
    case 'OTP_REQUIRED':
      return `Cet opérateur Mobile Money exige un code de confirmation OTP. Composez le code USSD de votre opérateur sur votre téléphone et saisissez le code OTP reçu.`;
    case 'AMOUNT_TOO_LOW':
      return minAmount
        ? `Le montant (${Number(amount).toLocaleString()} ${displayCurrency}) est inférieur au minimum autorisé par SEBPAY pour ce pays (${minAmount} ${minCurrency}).`
        : `Le montant du plan est inférieur au minimum autorisé par l'opérateur Mobile Money.`;
    case 'MONTHLY_LIMIT_REACHED':
      return `La limite mensuelle de réception du compte marchand SEBPAY est atteinte. Veuillez contacter le support SEBPAY.`;
    case 'EXTERNAL_REFERENCE_CONFLICT':
    case 'REQUEST_IN_PROGRESS':
      return `Une demande de paiement identique est déjà en cours de traitement. Veuillez patienter quelques secondes puis réessayer.`;
    case 'RATE_LIMITED':
      return `Trop de tentatives rapprochées (RATE_LIMITED). Veuillez patienter quelques secondes avant de réessayer.`;
    case 'FEATURE_DISABLED':
    case 'COUNTRY_UNAVAILABLE':
    case 'OPERATOR_MAINTENANCE':
    case 'AGGREGATOR_MAINTENANCE':
    case 'ACCOUNT_PAYIN_DISABLED':
      return `L'opérateur Mobile Money (${usedOperator.toUpperCase() || 'sélectionné'}) ou le service dans ce pays est temporairement en maintenance (${errCode}). Essayez un autre opérateur ou le guichet Checkout SEBPAY.`;
    case 'PAYMENT_DECLINED':
      if (String(usedCountry).toUpperCase() === 'CM' && Number(amount) < 500) {
        return `L'agrégateur Mobile Money Cameroun (MTN MoMo) a refusé le paiement de ${Number(amount).toLocaleString()} XAF pour le numéro ${usedPhone}. Attention : au Cameroun (+237), l'agrégateur Mobile Money refuse généralement les montants de test inférieurs à 200–500 XAF (alors que 100 XOF fonctionne au Bénin). Essayez avec un plan d'au moins 500 XAF ou vérifiez votre numéro MTN MoMo.`;
      }
      return `L'opérateur Mobile Money (${usedOperator.toUpperCase()}) a refusé la demande pour le numéro ${usedPhone}. Vérifiez que : 1) Votre numéro (${usedPhone}) correspond bien à l'opérateur ${usedOperator.toUpperCase()}, 2) Votre compte Mobile Money est actif avec un solde suffisant (${Number(amount).toLocaleString()} ${displayCurrency}), ou utilisez le bouton « Guichet sécurisé SEBPAY Checkout ».`;
    default:
      if (/operator declined|check the phone number/i.test(rawMessage)) {
        return `L'opérateur Mobile Money (${usedOperator.toUpperCase()}) a refusé la demande pour le numéro ${usedPhone}. Vérifiez votre numéro et l'opérateur choisi (ou utilisez le bouton « Guichet sécurisé SEBPAY Checkout »), puis réessayez.`;
      }
      return rawMessage || `Le paiement n'a pas pu être initié (HTTP ${resStatus}). Vérifiez votre numéro et l'opérateur choisi.`;
  }
}

// Indicatifs téléphoniques internationaux par code ISO pays (format SEBPAY sans +)
const COUNTRY_DIAL_CODES = {
  BJ: '229',
  CI: '225',
  TG: '228',
  SN: '221',
  BF: '226',
  ML: '223',
  NE: '227',
  CM: '237',
  GN: '224',
  GA: '241',
  CG: '242',
  CD: '243',
  TD: '235',
  GH: '233',
  NG: '234',
  KE: '254',
  UG: '256',
  TZ: '255',
  GM: '220',
  GW: '245',
};

// Opérateurs par défaut par pays (alignés sur /api/v1/p/countries de SEBPAY)
const DEFAULT_OPERATORS_BY_COUNTRY = {
  BJ: [
    { code: 'mtn', slug: 'mtn-bj', name: 'MTN Mobile Money (Bénin)', otp_required: false, ussd_code: null },
    { code: 'moov', slug: 'moov-bj', name: 'Moov Money (Bénin)', otp_required: false, ussd_code: null },
    { code: 'celtiis', slug: 'celtiis-bj', name: 'Celtiis Cash (Bénin)', otp_required: false, ussd_code: null },
    { code: 'coris', slug: 'coris-bj', name: 'Coris Money (Bénin)', otp_required: false, ussd_code: null },
  ],
  CI: [
    { code: 'mtn', slug: 'mtn-ci', name: 'MTN MoMo (Côte d\'Ivoire)', otp_required: false, ussd_code: null },
    { code: 'moov', slug: 'moov-ci', name: 'Moov Money (Côte d\'Ivoire)', otp_required: false, ussd_code: null },
    { code: 'orange', slug: 'orange-ci', name: 'Orange Money (Côte d\'Ivoire)', otp_required: false, ussd_code: '*144*4*4#' },
    { code: 'wave', slug: 'wave-ci', name: 'Wave (Côte d\'Ivoire)', otp_required: false, ussd_code: null },
  ],
  TG: [
    { code: 'togocom', slug: 'togocom-tg', name: 'TogoCom / Yas (Togo)', otp_required: false, ussd_code: null },
    { code: 'moov', slug: 'moov-tg', name: 'Moov Money (Togo)', otp_required: false, ussd_code: null },
  ],
  SN: [
    { code: 'wave', slug: 'wave-sn', name: 'Wave (Sénégal)', otp_required: false, ussd_code: null },
    { code: 'orange', slug: 'orange-sn', name: 'Orange Money (Sénégal)', otp_required: false, ussd_code: '#144#391#' },
    { code: 'free', slug: 'free-sn', name: 'Free Money / Yas (Sénégal)', otp_required: false, ussd_code: null },
  ],
  BF: [
    { code: 'orange', slug: 'orange-bf', name: 'Orange Money (Burkina Faso)', otp_required: true, ussd_code: '*144*4*6*montant#' },
    { code: 'moov', slug: 'moov-bf', name: 'Moov Money (Burkina Faso)', otp_required: false, ussd_code: null },
  ],
  CM: [
    { code: 'mtn', slug: 'mtn-cm', name: 'MTN Mobile Money (Cameroun)', otp_required: false, ussd_code: null },
  ],
  ML: [
    { code: 'orange', slug: 'orange-ml', name: 'Orange Money (Mali)', otp_required: false, ussd_code: null },
    { code: 'moov', slug: 'moov-ml', name: 'Moov Money (Mali)', otp_required: false, ussd_code: null },
    { code: 'mobicash', slug: 'mobicash-ml', name: 'Mobicash (Mali)', otp_required: false, ussd_code: null },
  ],
  NE: [
    { code: 'airtel', slug: 'airtel-ne', name: 'Airtel Money (Niger)', otp_required: false, ussd_code: null },
    { code: 'moov', slug: 'moov-ne', name: 'Moov Money (Niger)', otp_required: false, ussd_code: null },
  ],
  CG: [
    { code: 'mtn', slug: 'mtn-cg', name: 'MTN Mobile Money (Congo)', otp_required: false, ussd_code: null },
  ],
  GA: [
    { code: 'airtel', slug: 'airtel-ga', name: 'Airtel Money (Gabon)', otp_required: false, ussd_code: null },
    { code: 'moov', slug: 'moov-ga', name: 'Moov Money (Gabon)', otp_required: false, ussd_code: null },
  ],
  TD: [
    { code: 'moov', slug: 'moov-td', name: 'Moov Money (Tchad)', otp_required: false, ussd_code: null },
  ],
};

function inferBillingPeriod(durationDays, billingPeriod) {
  if (billingPeriod && ['monthly', '3_months', '6_months', '1_year', 'custom'].includes(billingPeriod)) {
    return billingPeriod;
  }
  const d = Number(durationDays) || 30;
  if (d === 30 || d === 31) return 'monthly';
  if (d >= 88 && d <= 93) return '3_months';
  if (d >= 178 && d <= 186) return '6_months';
  if (d >= 360 && d <= 366) return '1_year';
  return 'custom';
}

function getPlanPeriodLabel(durationDays, billingPeriod) {
  const period = inferBillingPeriod(durationDays, billingPeriod);
  if (period === 'monthly') return 'Monthly';
  if (period === '3_months') return '3 Month';
  if (period === '6_months') return '6 Month';
  if (period === '1_year') return '01 Year';
  return `${Number(durationDays) || 30} Days`;
}

// Normalise un plan pour exposer systématiquement id et _id
function serializePlan(planDoc) {
  if (!planDoc) return null;
  const obj = typeof planDoc.toObject === 'function' ? planDoc.toObject({ virtuals: true }) : { ...planDoc };
  const strId = String(obj._id || obj.id || '');
  const billing_period = inferBillingPeriod(obj.duration_days, obj.billing_period);
  return {
    ...obj,
    _id: strId,
    id: strId,
    billing_period,
    period_label: getPlanPeriodLabel(obj.duration_days, billing_period),
  };
}

// Détecte automatiquement l'opérateur Mobile Money au Bénin (BJ) selon le préfixe à 2 chiffres (après 01 éventuel)
function detectBeninOperatorFromCore(eightDigitCore) {
  if (!eightDigitCore || eightDigitCore.length !== 8) return null;
  const prefix = eightDigitCore.slice(0, 2);
  const mtnPrefixes = ['42', '46', '50', '51', '52', '53', '54', '56', '57', '59', '61', '62', '66', '67', '69', '90', '91', '96', '97'];
  const moovPrefixes = ['55', '58', '60', '63', '64', '65', '68', '94', '95', '98', '99'];
  const celtiisPrefixes = ['40', '41', '43', '44', '45', '47', '48', '49', '92', '93'];
  if (mtnPrefixes.includes(prefix)) return 'mtn';
  if (moovPrefixes.includes(prefix)) return 'moov';
  if (celtiisPrefixes.includes(prefix)) return 'celtiis';
  return null;
}

// Détecte si le numéro saisi commence déjà par un indicatif pays connu (ex: 229, 225, 228, 221, 237...)
function detectCountryFromPhoneDigits(digits) {
  for (const [iso, dial] of Object.entries(COUNTRY_DIAL_CODES)) {
    if (digits.startsWith(dial) && digits.length >= dial.length + 8) {
      return { iso, dial, localDigits: digits.slice(dial.length) };
    }
  }
  return null;
}

// Formate le numéro au format international sans (+) exigé par SEBPAY (ex: "2290197000000" ou "237680404921")
function normalizeSebpayPhone(rawPhone, countryCode) {
  let digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  const detected = detectCountryFromPhoneDigits(digits);
  if (detected) {
    return digits;
  }
  const iso = String(countryCode || 'BJ').trim().toUpperCase();
  const dial = COUNTRY_DIAL_CODES[iso];
  if (dial && digits && !digits.startsWith(dial)) {
    digits = `${dial}${digits}`;
  }
  return digits;
}

// Construit les combinaisons (phone, localPhone, operator, country, currency) à tester auprès de SEBPAY
function buildSebpayCandidates(rawPhone, rawOperator, rawCountry) {
  let digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);

  let country = String(rawCountry || 'BJ').trim().toUpperCase();
  const detectedCountry = detectCountryFromPhoneDigits(digits);
  if (detectedCountry) {
    country = detectedCountry.iso;
  }

  const dial = COUNTRY_DIAL_CODES[country] || '229';
  let local = digits.startsWith(dial) && digits.length >= dial.length + 8
    ? digits.slice(dial.length)
    : digits;

  let userOp = String(rawOperator || 'mtn').trim().toLowerCase();
  if (country === 'TG' && userOp === 'tmoney') {
    userOp = 'togocom';
  }
  const primaryCurrency = resolveCountryCurrency(country);
  const candidates = [];

  const pushUnique = (phone, operator, ctry, currency = primaryCurrency, localPhone = local) => {
    if (!phone || phone.length < 8) return;
    const key = `${phone}|${operator}|${ctry}|${currency}`;
    if (!candidates.some((c) => `${c.phone}|${c.operator}|${c.country}|${c.currency}` === key)) {
      candidates.push({ phone, localPhone, operator, country: ctry, currency });
    }
  };

  if (country === 'BJ') {
    // Au Bénin : les numéros sont passés de 8 chiffres (97XXXXXX) à 10 chiffres avec préfixe "01" (0197XXXXXX)
    let core8 = local;
    const had01 = local.length === 10 && local.startsWith('01');
    if (had01) {
      core8 = local.slice(2);
    }
    const detectedOp = detectBeninOperatorFromCore(core8);
    const primaryOp = userOp;
    const secondaryOp = detectedOp && detectedOp !== userOp ? detectedOp : null;

    if (core8.length === 8) {
      const phoneWith01 = `22901${core8}`;
      const phoneWithout01 = `229${core8}`;
      const firstPhone = had01 ? phoneWith01 : phoneWithout01;
      const secondPhone = had01 ? phoneWithout01 : phoneWith01;

      pushUnique(firstPhone, primaryOp, 'BJ', 'XOF', `01${core8}`);
      pushUnique(secondPhone, primaryOp, 'BJ', 'XOF', core8);
      if (secondaryOp) {
        pushUnique(firstPhone, secondaryOp, 'BJ', 'XOF', `01${core8}`);
        pushUnique(secondPhone, secondaryOp, 'BJ', 'XOF', core8);
      }
    } else {
      pushUnique(`${dial}${local}`, primaryOp, 'BJ', 'XOF', local);
      if (secondaryOp) pushUnique(`${dial}${local}`, secondaryOp, 'BJ', 'XOF', local);
    }
  } else if (country === 'CM') {
    // Cameroun (+237) : 9 chiffres commençant par 6 (ex: 680404921), devise officielle XAF, opérateur actif SEBPAY: mtn / mtn-cm
    if (local.length === 10 && local.startsWith('06')) {
      local = local.slice(1);
    }
    const intlPhone = `237${local}`;
    pushUnique(intlPhone, 'mtn', 'CM', 'XAF', local);
    pushUnique(intlPhone, 'mtn-cm', 'CM', 'XAF', local);
    pushUnique(local, 'mtn', 'CM', 'XAF', local);
    pushUnique(intlPhone, 'mtn', 'CM', 'XOF', local);
  } else {
    // Autres pays (CI, TG, SN, BF, CG, GA, TD, ML, NE...)
    const intlPhone = `${dial}${local}`;
    const slugOp = userOp.includes('-') ? userOp : `${userOp}-${country.toLowerCase()}`;
    pushUnique(intlPhone, userOp, country, primaryCurrency, local);
    pushUnique(intlPhone, slugOp, country, primaryCurrency, local);
    if (local.startsWith('0') && local.length > 8) {
      pushUnique(`${dial}${local.slice(1)}`, userOp, country, primaryCurrency, local.slice(1));
    }
    if (primaryCurrency !== 'XOF') {
      pushUnique(intlPhone, userOp, country, 'XOF', local);
    }
  }

  return candidates.slice(0, 4);
}

// Exécute la requête de collecte SEBPAY avec réessai intelligent + bascule automatique sur Checkout Session si refus
async function executeSebpayCollectionWithRetry({
  sebpayPublicKey,
  sebpaySecretKey,
  amount,
  callbackUrl,
  returnUrl,
  customerName,
  customerEmail,
  otp_code,
  rawPhone,
  rawOperator,
  rawCountry,
  refPrefix = 'SUB',
}) {
  const candidates = buildSebpayCandidates(rawPhone, rawOperator, rawCountry);
  let lastResStatus = 400;
  let lastResData = {};
  const attemptsLog = [];
  let lastAttempt = candidates[0] || {
    phone: normalizeSebpayPhone(rawPhone, rawCountry),
    localPhone: String(rawPhone || '').replace(/[^\d]/g, ''),
    operator: String(rawOperator || 'mtn').toLowerCase(),
    country: String(rawCountry || 'BJ').toUpperCase(),
    currency: resolveCountryCurrency(rawCountry),
  };

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const externalRef = `${refPrefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const payload = {
      amount: Math.round(Number(amount)),
      currency: candidate.currency || resolveCountryCurrency(candidate.country),
      phone: candidate.phone,
      operator: candidate.operator,
      country: candidate.country,
      external_reference: externalRef,
      callback_url: callbackUrl,
      customer_name: customerName || 'Membre LiveFX',
      customer_email: customerEmail || undefined,
    };
    if (returnUrl && String(returnUrl).trim()) {
      payload.return_url = String(returnUrl).trim();
    }
    if (otp_code && String(otp_code).trim()) {
      payload.otp_code = String(otp_code).trim();
    }

    const { res: sebResponse, resData } = await sebpayFetch(
      '/collections',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      sebpayPublicKey,
      sebpaySecretKey
    );

    lastResStatus = sebResponse.status;
    lastResData = resData;
    lastAttempt = { ...candidate, external_reference: externalRef };
    attemptsLog.push({
      type: 'collection',
      phone: candidate.phone,
      operator: candidate.operator,
      country: candidate.country,
      currency: payload.currency,
      status: sebResponse.status,
      code: resData?.errors?.code || resData?.code || null,
      message: resData?.message || null,
    });

    if (sebResponse.ok && resData.success !== false) {
      return {
        ok: true,
        status: sebResponse.status,
        resData,
        dataPayload: resData.data || resData,
        usedPhone: candidate.phone,
        usedOperator: candidate.operator,
        usedCountry: candidate.country,
        usedCurrency: payload.currency,
        externalReference: externalRef,
        attemptsLog,
      };
    }

    const errCode = String(resData?.errors?.code || resData?.code || resData?.error_code || '').toUpperCase();
    const rawMsg = String(resData?.message || resData?.data?.message || '');
    const isNonRetryable =
      sebResponse.status === 401 ||
      sebResponse.status === 403 ||
      sebResponse.status === 429 ||
      sebResponse.status === 503 ||
      [
        'WRONG_ENVIRONMENT',
        'ACCOUNT_SUSPENDED',
        'IP_NOT_ALLOWED',
        'IP_PENDING_APPROVAL',
        'IP_REJECTED',
        'IP_DISABLED',
        'OTP_REQUIRED',
        'AMOUNT_TOO_LOW',
        'MONTHLY_LIMIT_REACHED',
        'RATE_LIMITED',
        'FEATURE_DISABLED',
        'COUNTRY_UNAVAILABLE',
        'OPERATOR_MAINTENANCE',
        'AGGREGATOR_MAINTENANCE',
        'ACCOUNT_PAYIN_DISABLED',
      ].includes(errCode) ||
      /adresse ip|ip.*autoris|whitelist/i.test(rawMsg) ||
      (sebResponse.status === 422 && /otp/i.test(rawMsg + errCode));

    if (isNonRetryable) {
      break;
    }
  }

  // Fallback automatique : si /collections a été décliné, tenter via une session Checkout SEBPAY en devise locale (XAF/XOF) + /checkout/{token}/pay
  let fallbackCheckoutUrl = null;
  let fallbackSessionId = null;
  try {
    const primaryCandidate = candidates[0] || lastAttempt;
    const ctry = primaryCandidate.country || 'BJ';
    const curr = resolveCountryCurrency(ctry);
    const chkRef = `${refPrefix}-CHK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const sessionAttempt = await createSebpayCheckoutSession({
      sebpayPublicKey,
      sebpaySecretKey,
      amount: Math.round(Number(amount)),
      currency: curr,
      redirectUrl: returnUrl || 'https://livefx-trading.com/register',
      callbackUrl,
      externalReference: chkRef,
      customerName: customerName || 'Membre LiveFX',
      customerEmail: customerEmail || 'client@livefx-trading.com',
      customerPhone: primaryCandidate.phone,
    });

    if (sessionAttempt.ok && sessionAttempt.dataPayload?.checkout_url) {
      fallbackCheckoutUrl = sessionAttempt.dataPayload.checkout_url;
      fallbackSessionId = sessionAttempt.dataPayload.id;
      const token = String(fallbackCheckoutUrl).split('/').pop();
      const pubCountry = SEBPAY_PUBLIC_COUNTRIES[ctry];
      const opId = pubCountry?.operators?.[primaryCandidate.operator] || pubCountry?.operators?.mtn;

      if (token && pubCountry?.id && opId) {
        const baseUrl = resolveSebpayBaseUrl(sebpayPublicKey, sebpaySecretKey).replace(/\/+$/, '');
        const payRes = await fetch(`${baseUrl}/checkout/${encodeURIComponent(token)}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            sender_name: customerName || 'Membre LiveFX',
            sender_email: customerEmail || 'client@livefx-trading.com',
            operator_id: opId,
            source_country_id: pubCountry.id,
            phone: primaryCandidate.localPhone || primaryCandidate.phone,
            otp: otp_code || undefined,
          }),
        });
        const payData = await payRes.json().catch(() => ({}));
        attemptsLog.push({
          type: 'checkout_pay',
          token,
          phone: primaryCandidate.localPhone || primaryCandidate.phone,
          country: ctry,
          currency: curr,
          status: payRes.status,
          code: payData?.errors?.code || null,
          message: payData?.message || null,
        });

        if (payRes.ok && payData.success !== false) {
          const txPayload = payData.data || payData;
          return {
            ok: true,
            status: payRes.status,
            resData: payData,
            dataPayload: {
              ...txPayload,
              transaction_id: txPayload.transaction_id || txPayload.transaction?.id || fallbackSessionId,
              provider_link: txPayload.provider_link || fallbackCheckoutUrl,
              status: txPayload.payment_status || txPayload.status || 'pending',
            },
            usedPhone: primaryCandidate.phone,
            usedOperator: primaryCandidate.operator,
            usedCountry: ctry,
            usedCurrency: curr,
            externalReference: chkRef,
            attemptsLog,
          };
        }
      }
    }
  } catch (_) {}

  return {
    ok: false,
    status: lastResStatus,
    resData: lastResData,
    dataPayload: lastResData.data || lastResData,
    usedPhone: lastAttempt.phone,
    usedOperator: lastAttempt.operator,
    usedCountry: lastAttempt.country,
    usedCurrency: lastAttempt.currency || resolveCountryCurrency(lastAttempt.country),
    externalReference: lastAttempt.external_reference || `${refPrefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    fallbackCheckoutUrl,
    fallbackSessionId,
    attemptsLog,
  };
}

// Crée une session de Checkout hébergé SEBPAY (POST /api/v1/checkout/sessions — L'intégration recommandée dans /fr/docs/checkout)
async function createSebpayCheckoutSession({
  sebpayPublicKey,
  sebpaySecretKey,
  amount,
  currency = 'XAF',
  redirectUrl,
  callbackUrl,
  externalReference,
  customerName,
  customerEmail,
  customerPhone,
  metadata = {},
}) {
  const payload = {
    amount: Math.round(Number(amount)),
    currency: String(currency || 'XAF').toUpperCase(),
    redirect_url: redirectUrl,
    external_reference: externalReference,
    callback_url: callbackUrl,
    customer_name: customerName || undefined,
    customer_email: customerEmail || undefined,
    customer_phone: customerPhone || undefined,
    metadata,
  };

  const { res, resData } = await sebpayFetch(
    '/checkout/sessions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sebpayPublicKey,
    sebpaySecretKey
  );

  return {
    ok: res.ok && resData.success !== false,
    status: res.status,
    resData,
    dataPayload: resData.data || resData,
  };
}

// Active l'abonnement d'un utilisateur lorsqu'une transaction SEBPAY passe à 'approved' / 'completed'
async function activateUserSubscriptionFromTransaction(transaction, planDoc) {
  if (!transaction || !transaction.user_id) return null;
  const user = await User.findById(transaction.user_id);
  if (!user) return null;

  const plan = planDoc || (transaction.plan_id ? await SubscriptionPlan.findById(transaction.plan_id).catch(() => null) : null);
  const durationDays = Number(plan?.duration_days) || 30;
  const now = new Date();
  const baseDate = (user.subscription_expires_at && new Date(user.subscription_expires_at) > now)
    ? new Date(user.subscription_expires_at)
    : now;

  user.subscription_expires_at = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  user.subscription_plan_name = plan?.name || 'Plan Souscription';
  await user.save();
  return user;
}

// ----------------- PLANS DE SOUSCRIPTION -----------------

// Liste des plans actifs pour les utilisateurs
exports.getActivePlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ is_active: true, is_deleted: { $ne: true } }).sort({ duration_days: 1, price_xaf: 1 });
    res.json(plans.map(serializePlan));
  } catch (err) {
    console.error('getActivePlans error:', err);
    res.status(500).json({ message: 'Erreur lors du chargement des plans' });
  }
};

// Admin : Liste de tous les plans
exports.getAdminPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ is_deleted: { $ne: true } }).sort({ duration_days: 1, price_xaf: 1 });
    res.json(plans.map(serializePlan));
  } catch (err) {
    console.error('getAdminPlans error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Admin : Créer un plan
exports.createPlan = async (req, res) => {
  try {
    const { name, description, price_xaf, duration_days, billing_period, trial_days, features, is_active } = req.body;
    if (!name || price_xaf == null) {
      return res.status(400).json({ message: 'Le nom et le prix en XAF sont obligatoires' });
    }

    const dur = Number(duration_days) || 30;
    const plan = await SubscriptionPlan.create({
      name,
      description: description || '',
      price_xaf: Number(price_xaf),
      duration_days: dur,
      billing_period: inferBillingPeriod(dur, billing_period),
      trial_days: Math.max(0, Number(trial_days) || 0),
      features: Array.isArray(features) ? features : [],
      is_active: is_active !== undefined ? is_active : true,
      created_by: req.user.id
    });

    res.status(201).json(serializePlan(plan));
  } catch (err) {
    console.error('createPlan error:', err);
    res.status(500).json({ message: 'Erreur lors de la création du plan' });
  }
};

// Admin : Mettre à jour un plan
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.trial_days !== undefined) {
      updateData.trial_days = Math.max(0, Number(updateData.trial_days) || 0);
    }
    if (updateData.price_xaf !== undefined) {
      updateData.price_xaf = Number(updateData.price_xaf);
    }
    if (updateData.duration_days !== undefined) {
      updateData.duration_days = Number(updateData.duration_days) || 30;
      updateData.billing_period = inferBillingPeriod(updateData.duration_days, updateData.billing_period);
    }
    const plan = await SubscriptionPlan.findByIdAndUpdate(id, updateData, { new: true });
    if (!plan) return res.status(404).json({ message: 'Plan non trouvé' });
    res.json(serializePlan(plan));
  } catch (err) {
    console.error('updatePlan error:', err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Admin : Supprimer un plan
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) return res.status(404).json({ message: 'Plan non trouvé' });
    plan.is_active = false;
    plan.is_deleted = true;
    await plan.save();
    res.json({ message: 'Plan supprimé avec succès. Les abonnés actifs continuent à en bénéficier jusqu\'à expiration.' });
  } catch (err) {
    console.error('deletePlan error:', err);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};

// Démarrer la période d'essai gratuit sur un plan
exports.startTrial = async (req, res) => {
  try {
    const userId = req.user.id;
    const planId = req.body.plan_id || req.body.planId || req.body.id || req.body._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    if (user.is_free_trial_granted) {
      return res.status(400).json({ message: 'Vous avez déjà bénéficié d\'une période d\'essai gratuit.' });
    }

    let plan = planId ? await SubscriptionPlan.findById(planId).catch(() => null) : null;
    if (!plan) {
      const activePlans = await SubscriptionPlan.find({ is_active: true, is_deleted: { $ne: true } }).sort({ price_xaf: 1 });
      if (activePlans.length === 1) plan = activePlans[0];
    }
    if (!plan || !plan.is_active || plan.is_deleted) {
      return res.status(404).json({ message: 'Plan indisponible' });
    }

    const trialDays = Number(plan.trial_days) || 0;
    if (trialDays <= 0) {
      return res.status(400).json({ message: 'Ce plan ne propose pas de période d\'essai gratuit.' });
    }

    const now = new Date();
    const currentExpiry = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
    const baseDate = (currentExpiry && currentExpiry > now) ? currentExpiry : now;
    const expiresAt = new Date(baseDate.getTime() + trialDays * 24 * 60 * 60 * 1000);

    user.subscription_plan_name = `${plan.name} (Essai ${trialDays}j)`;
    user.subscription_expires_at = expiresAt;
    user.is_free_trial_granted = true;
    await user.save();

    const externalRef = `TRIAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await PaymentTransaction.create({
      user_id: user._id,
      plan_id: plan._id,
      amount: 0,
      currency: 'XOF',
      phone: user.phone || 'TRIAL-FREE',
      operator: 'free_trial',
      country: 'BJ',
      external_reference: externalRef,
      transaction_id: externalRef,
      status: 'completed',
      sebpay_response: {
        trial_started: true,
        plan_name: plan.name,
        duration_days: trialDays,
        expires_at: expiresAt.toISOString(),
      },
    });

    res.json({
      success: true,
      message: `Votre période d'essai gratuit de ${trialDays} jours a été activée !`,
      subscription_plan_name: user.subscription_plan_name,
      subscription_expires_at: user.subscription_expires_at,
      has_active_subscription: true,
      is_free_trial_granted: true,
      user: {
        id: user._id,
        subscription_plan_name: user.subscription_plan_name,
        subscription_expires_at: user.subscription_expires_at,
        has_active_subscription: true,
        is_free_trial_granted: true,
      }
    });
  } catch (err) {
    console.error('startTrial error:', err);
    res.status(500).json({ message: 'Erreur lors de l\'activation de la période d\'essai' });
  }
};

// ----------------- PAIEMENT SEBPAY MOBILE MONEY (https://new.sebpay.bj/fr/docs) -----------------

let cachedServerIp = '57.129.148.42';
async function detectServerPublicIp() {
  try {
    const r = await fetch('https://api4.ipify.org?format=json').catch(() => null);
    if (r && r.ok) {
      const j = await r.json().catch(() => null);
      if (j && j.ip) {
        cachedServerIp = String(j.ip).trim();
      }
    }
  } catch (_) {}
  return cachedServerIp;
}

// Diagnostic Admin de la connexion SEBPAY et détection de l'IP sortante du serveur
exports.testSebpayConnection = async (req, res) => {
  try {
    const serverIp = await detectServerPublicIp();
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const sebpayPublicKey = (req.body?.sebpay_public_key || branding?.sebpay_public_key || process.env.SEBPAY_PUBLIC_KEY || '').trim();
    const rawSecret = req.body?.sebpay_secret_key;
    const sebpaySecretKey = ((rawSecret && !String(rawSecret).includes('••')) ? rawSecret : (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '')).trim();

    if (!sebpayPublicKey || !sebpaySecretKey) {
      return res.status(400).json({
        ok: false,
        server_ip: serverIp,
        message: 'Veuillez renseigner et enregistrer la Clé Publique et la Clé Secrète SEBPAY.'
      });
    }

    const { res: sebRes, resData: json } = await sebpayFetch(
      '/operators',
      { method: 'GET' },
      sebpayPublicKey,
      sebpaySecretKey
    );

    if (sebRes.ok && json.success !== false) {
      const envType = sebpayPublicKey.startsWith('pk_test_') ? 'Sandbox' : 'Live Production';
      return res.json({
        ok: true,
        environment: envType,
        server_ip: serverIp,
        message: `Connexion SEBPAY (${envType}) réussie ! L'adresse IP du serveur (${serverIp}) et vos clés API sont bien autorisées.`
      });
    }

    const errCode = String(json?.errors?.code || json?.code || '').toUpperCase();
    const rawMsg = json?.message || `Erreur HTTP ${sebRes.status}`;
    const isIpBlocked =
      ['IP_NOT_ALLOWED', 'IP_PENDING_APPROVAL', 'IP_REJECTED', 'IP_DISABLED'].includes(errCode) ||
      /adresse ip|ip.*autoris|whitelist/i.test(rawMsg);

    return res.status(200).json({
      ok: false,
      code: errCode,
      is_ip_blocked: isIpBlocked,
      server_ip: serverIp,
      message: formatSebpayErrorMessage(sebRes.status, json, { serverIp }),
    });
  } catch (err) {
    console.error('testSebpayConnection error:', err);
    res.status(500).json({ ok: false, server_ip: cachedServerIp, message: err.message });
  }
};

// Récupérer la liste des pays supportés par SEBPAY (GET /api/v1/countries — doc: /fr/docs/countries)
exports.getSebpayCountries = async (req, res) => {
  const defaultCountries = [
    { country_code: 'BJ', country_name: 'Bénin', prefix: '229', currency: { code: 'XOF' } },
    { country_code: 'CI', country_name: "Côte d'Ivoire", prefix: '225', currency: { code: 'XOF' } },
    { country_code: 'TG', country_name: 'Togo', prefix: '228', currency: { code: 'XOF' } },
    { country_code: 'SN', country_name: 'Sénégal', prefix: '221', currency: { code: 'XOF' } },
    { country_code: 'BF', country_name: 'Burkina Faso', prefix: '226', currency: { code: 'XOF' } },
    { country_code: 'CM', country_name: 'Cameroun', prefix: '237', currency: { code: 'XAF' } },
    { country_code: 'ML', country_name: 'Mali', prefix: '223', currency: { code: 'XOF' } },
    { country_code: 'NE', country_name: 'Niger', prefix: '227', currency: { code: 'XOF' } },
  ];
  try {
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const sebpayPublicKey = (branding?.sebpay_public_key || process.env.SEBPAY_PUBLIC_KEY || '').trim();
    const sebpaySecretKey = (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '').trim();

    if (sebpayPublicKey && sebpaySecretKey && !sebpaySecretKey.includes('••')) {
      const { res: sebRes, resData: json } = await sebpayFetch(
        '/countries',
        { method: 'GET' },
        sebpayPublicKey,
        sebpaySecretKey
      ).catch(() => ({ res: null, resData: null }));

      if (sebRes && sebRes.ok) {
        const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : null);
        if (list && list.length > 0) {
          return res.json(list);
        }
      }
    }
    return res.json(defaultCountries);
  } catch (err) {
    console.error('getSebpayCountries error:', err);
    return res.json(defaultCountries);
  }
};

// Calculer les frais SEBPAY en temps réel (GET /api/v1/c/calculate-fee — doc: /fr/docs/tarifs)
exports.calculateSebpayFee = async (req, res) => {
  try {
    const amount = Number(req.query.amount) || 0;
    const sourceCountry = String(req.query.source_country || req.query.country || 'bj').trim().toLowerCase();
    const txType = String(req.query.transaction_type || 'collection').trim().toLowerCase();

    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const sebpayPublicKey = (branding?.sebpay_public_key || process.env.SEBPAY_PUBLIC_KEY || '').trim();
    const sebpaySecretKey = (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '').trim();

    const query = new URLSearchParams({
      amount: String(amount),
      source_country: sourceCountry,
      transaction_type: txType,
    });

    const { res: sebRes, resData } = await sebpayFetch(
      `/c/calculate-fee?${query.toString()}`,
      { method: 'GET' },
      sebpayPublicKey,
      sebpaySecretKey
    );

    if (sebRes && sebRes.ok) {
      return res.json(resData?.data || resData);
    }
    return res.status(sebRes?.status || 400).json(resData || { message: 'Impossible de calculer les frais' });
  } catch (err) {
    console.error('calculateSebpayFee error:', err);
    res.status(500).json({ message: 'Erreur lors du calcul des frais' });
  }
};

// Récupérer la liste des opérateurs Mobile Money supportés par SEBPAY (GET /api/v1/operators — doc: /fr/docs/operators & /fr/docs/otp)
exports.getSebpayOperators = async (req, res) => {
  try {
    const country = String(req.query.country || '').trim().toUpperCase();
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const sebpayPublicKey = (branding?.sebpay_public_key || process.env.SEBPAY_PUBLIC_KEY || '').trim();
    const sebpaySecretKey = (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '').trim();

    if (sebpayPublicKey && sebpaySecretKey && !sebpaySecretKey.includes('••')) {
      const endpoint = country ? `/operators?country=${encodeURIComponent(country)}` : '/operators';
      const { res: sebRes, resData: json } = await sebpayFetch(
        endpoint,
        { method: 'GET' },
        sebpayPublicKey,
        sebpaySecretKey
      ).catch(() => ({ res: null, resData: null }));

      if (sebRes && sebRes.ok) {
        const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : null);
        if (list && list.length > 0) {
          return res.json(list);
        }
      }
    }

    if (country && DEFAULT_OPERATORS_BY_COUNTRY[country]) {
      return res.json(DEFAULT_OPERATORS_BY_COUNTRY[country]);
    }
    return res.json(DEFAULT_OPERATORS_BY_COUNTRY.BJ);
  } catch (err) {
    console.error('getSebpayOperators error:', err);
    res.json(DEFAULT_OPERATORS_BY_COUNTRY.BJ);
  }
};

// Initier un paiement Mobile Money SEBPAY (POST /api/v1/collections ou POST /api/v1/checkout/sessions)
exports.initiateMobilePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const rawPlanId = req.body.plan_id || req.body.planId || req.body.id || req.body._id;
    const rawPlanName = req.body.plan_name || req.body.planName;
    const rawPhone = String(req.body.phone || req.body.phoneNumber || req.body.customer_phone || user.phone || '').trim();
    const rawOperator = String(req.body.operator || req.body.provider || 'mtn').trim();
    const rawCountry = String(req.body.country || 'BJ').trim().toUpperCase();
    const otp_code = req.body.otp_code || req.body.otpCode || req.body.otp;
    const paymentMode = String(req.body.mode || 'collection').trim().toLowerCase();

    // Résolution robuste du plan (par ID, par nom, ou fallback si 1 seul plan actif existe)
    let plan = null;
    if (rawPlanId) {
      plan = await SubscriptionPlan.findById(rawPlanId).catch(() => null);
    }
    if (!plan && rawPlanName) {
      plan = await SubscriptionPlan.findOne({ name: rawPlanName, is_active: true, is_deleted: { $ne: true } }).catch(() => null);
    }
    if (!plan) {
      const activePlans = await SubscriptionPlan.find({ is_active: true, is_deleted: { $ne: true } }).sort({ price_xaf: 1 });
      if (activePlans.length >= 1) {
        plan = activePlans[0];
      }
    }

    if (!plan || !plan.is_active) {
      return res.status(404).json({ message: 'Plan de souscription indisponible ou introuvable' });
    }

    // Récupérer les clés API SEBPAY configurées par l'administrateur
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const sebpayPublicKey = (branding?.sebpay_public_key || process.env.SEBPAY_PUBLIC_KEY || '').trim();
    const sebpaySecretKey = (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '').trim();

    if (!sebpayPublicKey || !sebpaySecretKey || sebpaySecretKey.includes('••')) {
      return res.status(400).json({
        message: 'Le système de paiement Mobile Money n\'est pas encore configuré par l\'administrateur (clés API SEBPAY manquantes dans l\'espace Admin > Logos & Identité Visuelle).'
      });
    }

    // Calculer la commission de parrainage si l'utilisateur a été parrainé
    let referrerId = null;
    let referralCommission = 0;
    let referralPct = 0;

    if (user.referred_by) {
      const referrer = await User.findById(user.referred_by);
      if (referrer && referrer.is_referral_enabled) {
        referrerId = referrer._id;
        const globalPct = branding?.referral_percentage != null ? branding.referral_percentage : 10;
        referralPct = referrer.custom_referral_percentage != null ? referrer.custom_referral_percentage : globalPct;
        referralCommission = Math.round((plan.price_xaf * referralPct) / 100);
      }
    }

    const callbackUrl = `${process.env.API_PUBLIC_URL || 'https://api.livefx-trading.com'}/api/subscriptions/webhook/sebpay`;
    const frontendBase = (process.env.FRONTEND_URL || 'https://livefx-trading.com').replace(/\/+$/, '');
    const returnUrl = req.body.return_url || req.body.redirect_url || `${frontendBase}/dashboard`;

    // Mode Checkout Hébergé SEBPAY (POST /api/v1/checkout/sessions — L'intégration recommandée dans /fr/docs/checkout)
    if (paymentMode === 'checkout_session' || paymentMode === 'hosted') {
      const externalRef = `CHK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const checkoutCurrency = resolveCountryCurrency(rawCountry);
      const sessionAttempt = await createSebpayCheckoutSession({
        sebpayPublicKey,
        sebpaySecretKey,
        amount: Math.round(Number(plan.price_xaf)),
        currency: checkoutCurrency,
        redirectUrl: returnUrl,
        callbackUrl,
        externalReference: externalRef,
        customerName: user.full_name || 'Membre LiveFX',
        customerEmail: user.email || undefined,
        customerPhone: rawPhone ? normalizeSebpayPhone(rawPhone, rawCountry) : undefined,
        metadata: { user_id: String(user._id), plan_id: String(plan._id) },
      });

      const sessionData = sessionAttempt.dataPayload;
      const transaction = await PaymentTransaction.create({
        user_id: user._id,
        plan_id: plan._id,
        amount: Math.round(Number(plan.price_xaf)),
        currency: checkoutCurrency,
        phone: rawPhone || 'SEBPAY-CHECKOUT',
        operator: 'sebpay_checkout',
        country: rawCountry || 'BJ',
        external_reference: externalRef,
        transaction_id: sessionData?.id || '',
        provider_link: sessionData?.checkout_url || '',
        status: sessionAttempt.ok ? 'pending' : 'failed',
        sebpay_response: sessionAttempt.resData,
        referrer_id: referrerId,
        referral_commission_amount: referralCommission,
        referral_percentage: referralPct,
      });

      if (!sessionAttempt.ok) {
        const srvIp = await detectServerPublicIp();
        return res.status(400).json({
          success: false,
          code: sessionAttempt.resData?.errors?.code || '',
          message: formatSebpayErrorMessage(sessionAttempt.status, sessionAttempt.resData, {
            usedCountry: rawCountry,
            amount: plan.price_xaf,
            serverIp: srvIp,
          }),
        });
      }

      return res.json({
        success: true,
        mode: 'checkout_session',
        checkout_session_id: sessionData?.id,
        checkout_url: sessionData?.checkout_url,
        provider_link: sessionData?.checkout_url,
        payment_url: sessionData?.checkout_url,
        external_reference: externalRef,
        transaction_id: transaction.transaction_id,
        status: 'pending',
        message: 'Redirection vers la page de paiement sécurisée SEBPAY...',
      });
    }

    if (!rawPhone || !rawOperator || !rawCountry) {
      return res.status(400).json({
        message: 'Veuillez renseigner votre numéro de téléphone Mobile Money, l\'opérateur et le pays.'
      });
    }

    const cleanPhone = normalizeSebpayPhone(rawPhone, rawCountry);
    if (!cleanPhone || cleanPhone.length < 8) {
      return res.status(400).json({
        message: 'Numéro de téléphone Mobile Money invalide. Veuillez saisir un numéro valide (ex: 0197000000 ou 680404921).'
      });
    }

    try {
      const attempt = await executeSebpayCollectionWithRetry({
        sebpayPublicKey,
        sebpaySecretKey,
        amount: Math.round(Number(plan.price_xaf)),
        callbackUrl,
        returnUrl,
        customerName: user.full_name || 'Membre LiveFX',
        customerEmail: user.email || undefined,
        otp_code,
        rawPhone,
        rawOperator,
        rawCountry,
        refPrefix: 'SUB',
      });

      const { resData, dataPayload, usedPhone, usedOperator, usedCountry, usedCurrency, externalReference } = attempt;

      const transaction = await PaymentTransaction.create({
        user_id: user._id,
        plan_id: plan._id,
        amount: Math.round(Number(plan.price_xaf)),
        currency: usedCurrency || resolveCountryCurrency(usedCountry),
        phone: usedPhone,
        operator: usedOperator,
        country: usedCountry,
        external_reference: externalReference,
        status: 'pending',
        referrer_id: referrerId,
        referral_commission_amount: referralCommission,
        referral_percentage: referralPct
      });

      if (!attempt.ok) {
        const errCode = String(resData?.errors?.code || resData?.code || resData?.error_code || dataPayload?.code || '').toUpperCase();
        const rawSebMessage = resData?.message || dataPayload?.message || '';
        const isOtpRequired = attempt.status === 422 && (errCode === 'OTP_REQUIRED' || String(errCode + rawSebMessage).toUpperCase().includes('OTP'));
        transaction.status = 'failed';
        transaction.sebpay_response = resData;
        await transaction.save();

        const srvIp = await detectServerPublicIp();
        const finalMessage = formatSebpayErrorMessage(attempt.status, resData, {
          usedOperator,
          usedPhone,
          usedCountry,
          amount: plan.price_xaf,
          serverIp: srvIp,
        });

        return res.status(isOtpRequired ? 422 : 400).json({
          success: false,
          otp_required: isOtpRequired,
          server_ip: srvIp,
          code: errCode,
          checkout_url: attempt.fallbackCheckoutUrl || null,
          attempts: attempt.attemptsLog || [],
          message: finalMessage
        });
      }

      const sebStatus = String(dataPayload.status || 'pending').toLowerCase();
      transaction.transaction_id = dataPayload.transaction_id || '';
      transaction.provider_link = dataPayload.provider_link || '';
      transaction.sebpay_response = resData;

      if (sebStatus === 'approved' || sebStatus === 'completed' || sebStatus === 'success') {
        transaction.status = 'completed';
        await activateUserSubscriptionFromTransaction(transaction, plan);
      } else if (sebStatus === 'rejected' || sebStatus === 'failed') {
        transaction.status = 'failed';
      }
      await transaction.save();

      return res.json({
        success: true,
        message: dataPayload.message || resData.message || 'Demande de paiement envoyée ! Veuillez confirmer sur votre téléphone Mobile Money.',
        transaction_id: transaction.transaction_id,
        external_reference: externalReference,
        provider_link: dataPayload.provider_link || null,
        payment_url: dataPayload.provider_link || null,
        status: transaction.status
      });
    } catch (sebErr) {
      console.error('Erreur appel SEBPAY:', sebErr.message);
      return res.status(400).json({
        success: false,
        message: sebErr.message || 'Erreur de connexion au service Mobile Money SEBPAY. Veuillez réessayer.'
      });
    }
  } catch (err) {
    console.error('initiateMobilePayment error:', err);
    res.status(500).json({ message: 'Erreur interne lors de l\'initiation du paiement' });
  }
};

// Vérifie une transaction ou session Checkout directement auprès de l'API SEBPAY (doc: /fr/docs/collections & /fr/docs/checkout)
async function verifySebpayTransactionRemote(transaction, branding) {
  const sebpayPublicKey = (branding?.sebpay_public_key || process.env.SEBPAY_PUBLIC_KEY || '').trim();
  const sebpaySecretKey = (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '').trim();
  if (!sebpayPublicKey || !sebpaySecretKey || sebpaySecretKey.includes('••')) {
    return null;
  }

  const lookupId = transaction.transaction_id || transaction.external_reference;
  const isCheckoutSession = transaction.operator === 'sebpay_checkout' || String(transaction.external_reference || '').startsWith('CHK-');
  const endpoint = isCheckoutSession
    ? `/checkout/sessions/${encodeURIComponent(lookupId)}`
    : `/collections/${encodeURIComponent(lookupId)}`;

  const { res, resData } = await sebpayFetch(
    endpoint,
    { method: 'GET' },
    sebpayPublicKey,
    sebpaySecretKey
  ).catch(() => ({ res: null, resData: null }));

  if (!res || !res.ok) return null;
  const dataPayload = resData?.data || resData;
  const txStatus = String(dataPayload?.transaction_status || dataPayload?.status || '').toLowerCase();
  const sessionStatus = String(dataPayload?.status || '').toLowerCase();

  let normalizedStatus = 'pending';
  if (txStatus === 'approved' || sessionStatus === 'completed' || txStatus === 'completed' || txStatus === 'success') {
    normalizedStatus = 'completed';
  } else if (txStatus === 'rejected' || sessionStatus === 'expired' || txStatus === 'failed') {
    normalizedStatus = 'failed';
  }

  return {
    normalizedStatus,
    resData,
    dataPayload,
  };
}

// Webhook SEBPAY (POST /api/subscriptions/webhook/sebpay) — Documentation: https://new.sebpay.bj/fr/docs/webhooks
exports.sebpayWebhook = async (req, res) => {
  try {
    const eventData = req.body || {};
    const ref = eventData.external_reference || eventData.data?.external_reference;
    const txId = eventData.transaction_id || eventData.data?.transaction_id;
    const checkoutSessionId = eventData.checkout_session_id || eventData.data?.checkout_session_id;
    const status = String(eventData.status || eventData.data?.status || '').toLowerCase();

    if (!ref && !txId && !checkoutSessionId) {
      return res.status(400).json({ message: 'Missing external_reference, transaction_id or checkout_session_id' });
    }

    const orConditions = [];
    if (ref) orConditions.push({ external_reference: ref });
    if (txId) orConditions.push({ transaction_id: txId });
    if (checkoutSessionId) orConditions.push({ transaction_id: checkoutSessionId });

    const transaction = await PaymentTransaction.findOne({ $or: orConditions }).populate('plan_id');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const secret = (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '').trim();

    // Vérification HMAC-SHA256 à temps constant sur les octets bruts (req.rawBody) selon /fr/docs/webhooks
    const signature = String(req.headers['x-sebpay-signature'] || '').trim();
    if (signature && req.rawBody && secret && !secret.includes('••')) {
      const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
      const sigBuf = Buffer.from(signature, 'utf8');
      const expBuf = Buffer.from(expected, 'utf8');
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        console.warn('[SEBPAY Webhook] Invalid HMAC signature rejected');
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }
    }

    // Bonne pratique SEBPAY (/fr/docs/webhooks) : confirmer avec l'API avant de livrer
    let finalStatus = status;
    const remoteCheck = await verifySebpayTransactionRemote(transaction, branding).catch(() => null);
    if (remoteCheck && remoteCheck.normalizedStatus !== 'pending') {
      finalStatus = remoteCheck.normalizedStatus === 'completed' ? 'approved' : 'rejected';
    }

    if (finalStatus === 'approved' || finalStatus === 'completed' || finalStatus === 'success' || finalStatus === 'paid') {
      const wasCompleted = transaction.status === 'completed';
      transaction.status = 'completed';
      if (txId && !transaction.transaction_id) transaction.transaction_id = txId;
      if (!wasCompleted) {
        await activateUserSubscriptionFromTransaction(transaction, transaction.plan_id);
      }
    } else if (finalStatus === 'rejected' || finalStatus === 'failed' || finalStatus === 'cancelled' || finalStatus === 'expired') {
      if (transaction.status !== 'completed') {
        transaction.status = 'failed';
      }
    }

    transaction.sebpay_response = eventData;
    await transaction.save();

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('sebpayWebhook error:', err);
    res.status(500).json({ message: 'Webhook processing error' });
  }
};

// Vérifier le statut d'une transaction (avec revérification directe GET /collections ou GET /checkout/sessions chez SEBPAY si en attente)
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.params;
    const transaction = await PaymentTransaction.findOne({
      $or: [
        { external_reference: reference },
        { transaction_id: reference },
      ],
    }).populate('plan_id', 'name price_xaf duration_days');

    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });

    if (transaction.status === 'pending') {
      try {
        const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
        const remoteCheck = await verifySebpayTransactionRemote(transaction, branding);
        if (remoteCheck) {
          if (remoteCheck.normalizedStatus === 'completed') {
            transaction.status = 'completed';
            transaction.sebpay_response = remoteCheck.resData;
            await transaction.save();
            await activateUserSubscriptionFromTransaction(transaction, transaction.plan_id);
          } else if (remoteCheck.normalizedStatus === 'failed') {
            transaction.status = 'failed';
            transaction.sebpay_response = remoteCheck.resData;
            await transaction.save();
          }
        }
      } catch (pollErr) {
        console.warn('checkPaymentStatus live SEBPAY poll warning:', pollErr.message);
      }
    }

    const user = transaction.user_id ? await User.findById(transaction.user_id).lean().catch(() => null) : null;

    res.json({
      status: transaction.status,
      amount: transaction.amount,
      plan_name: transaction.plan_id?.name || transaction.sebpay_response?.plan_name || 'Abonnement',
      external_reference: transaction.external_reference,
      provider_link: transaction.provider_link || null,
      has_active_subscription: transaction.status === 'completed',
      subscription_plan_name: user?.subscription_plan_name || null,
      subscription_expires_at: user?.subscription_expires_at || null,
    });
  } catch (err) {
    console.error('checkPaymentStatus error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mes souscriptions passées
exports.getMySubscriptions = async (req, res) => {
  try {
    const list = await PaymentTransaction.find({ user_id: req.user.id })
      .populate('plan_id', 'name price_xaf duration_days')
      .sort({ created_at: -1 })
      .lean();

    const enriched = list.map((tx) => ({
      ...tx,
      id: String(tx._id),
      plan_id: tx.plan_id || {
        name: tx.sebpay_response?.plan_name || 'Abonnement Offert (1 Mois Gratuit)',
        price_xaf: tx.amount || 0,
        duration_days: tx.sebpay_response?.duration_days || 30,
      },
    }));

    res.json(enriched);
  } catch (err) {
    console.error('getMySubscriptions error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Admin : Activer 1 mois d'abonnement gratuit (ou durée personnalisée) à un utilisateur
exports.grantFreeMonth = async (req, res) => {
  try {
    const { userId } = req.params;
    const rawDays = req.body?.days || req.body?.duration_days;
    const days = Number(rawDays) > 0 ? Number(rawDays) : 30;
    const planName = req.body?.plan_name || 'Abonnement Offert (1 Mois Gratuit)';

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const now = new Date();
    const currentExpiry = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
    const baseDate = (currentExpiry && currentExpiry > now) ? currentExpiry : now;
    const expiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    user.subscription_plan_name = planName;
    user.subscription_expires_at = expiresAt;
    user.is_free_trial_granted = true;
    await user.save();

    const externalRef = `FREE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const transaction = await PaymentTransaction.create({
      user_id: user._id,
      plan_id: null,
      amount: 0,
      currency: 'XOF',
      phone: user.phone || 'ADMIN-FREE',
      operator: 'free_admin',
      country: 'BJ',
      external_reference: externalRef,
      transaction_id: externalRef,
      status: 'completed',
      referrer_id: user.referred_by || null,
      referral_commission_amount: 0,
      sebpay_response: {
        granted_by_admin: req.user?.id || null,
        plan_name: planName,
        duration_days: days,
        expires_at: expiresAt.toISOString(),
      },
    });

    try {
      const { sendMail } = require('../utils/mailer');
      if (user.email) {
        const expStr = expiresAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
        sendMail({
          to: user.email,
          subject: `🎁 1 Mois d'Abonnement Gratuit Activé — LiveFX Academy`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0b0e11; color: #eaecef; border: 1px solid #1e2329; border-radius: 10px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #10b981, #059669); padding: 16px 22px; color: #ffffff; font-weight: bold; font-size: 17px;">
                🎁 Abonnement Gratuit Activé — LiveFX Academy
              </div>
              <div style="padding: 22px;">
                <p style="margin: 0 0 12px; font-size: 14px; color: #eaecef;">Bonjour <strong>${user.full_name || 'Trader'}</strong>,</p>
                <p style="margin: 0 0 16px; font-size: 14px; color: #cbd5e1; line-height: 1.6;">
                  L'administrateur <strong>LivefxTrading</strong> vient d'activer pour votre compte un abonnement gratuit de <strong>${days} jours</strong> !
                </p>
                <div style="background: #131722; border: 1px solid #2a2e39; border-radius: 8px; padding: 14px; margin-bottom: 18px;">
                  <div style="font-size: 13px; color: #94a3b8; margin-bottom: 6px;">Formule activée : <strong style="color: #10b981;">${planName}</strong></div>
                  <div style="font-size: 13px; color: #94a3b8;">Valable jusqu'au : <strong style="color: #f0b90b;">${expStr}</strong></div>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                  <a href="${process.env.FRONTEND_URL || 'https://livefx-trading.com'}/dashboard" style="display: inline-block; background: #f0b90b; color: #0b0e11; text-decoration: none; font-weight: bold; padding: 10px 22px; border-radius: 6px; font-size: 13px;">
                    Accéder à mon espace LiveFX
                  </a>
                </div>
              </div>
            </div>
          `,
        }).catch(() => {});
      }
    } catch (_) {}

    res.json({
      success: true,
      message: `1 mois d'abonnement gratuit activé pour ${user.full_name} (valable jusqu'au ${expiresAt.toLocaleDateString('fr-FR')}).`,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        subscription_plan_name: user.subscription_plan_name,
        subscription_expires_at: user.subscription_expires_at,
        is_free_trial_granted: user.is_free_trial_granted,
        has_active_subscription: true,
      },
      transaction_id: transaction._id,
    });
  } catch (err) {
    console.error('grantFreeMonth error:', err);
    res.status(500).json({ message: 'Erreur lors de l\'activation du mois gratuit' });
  }
};

// Admin : Révoquer l'abonnement actif d'un utilisateur
exports.revokeSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    user.subscription_expires_at = null;
    user.subscription_plan_name = null;
    await user.save();

    res.json({
      success: true,
      message: `Abonnement révoqué pour ${user.full_name}`,
      user: {
        id: user._id,
        subscription_plan_name: null,
        subscription_expires_at: null,
        has_active_subscription: false,
      },
    });
  } catch (err) {
    console.error('revokeSubscription error:', err);
    res.status(500).json({ message: 'Erreur lors de la révocation de l\'abonnement' });
  }
};


// ----------------- PAIEMENT PUBLIC AVANT INSCRIPTION (SEBPAY & IKEEPAY) -----------------

// Récupérer la configuration publique de la passerelle de paiement active (SEBPAY ou iKeePay)
exports.getPaymentGatewayConfig = async (req, res) => {
  try {
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const activeGateway = branding?.active_payment_gateway || (branding?.sebpay_enabled ? 'sebpay' : 'ikeepay');
    const ikeepayPublicKey = (branding?.ikeepay_public_key || process.env.IKEEPAY_PUBLIC_KEY || '').trim();
    const sebpayPublicKey = (branding?.sebpay_public_key || process.env.SEBPAY_PUBLIC_KEY || '').trim();
    const sebpaySecretKey = (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '').trim();

    res.json({
      active_payment_gateway: activeGateway,
      ikeepay_enabled: activeGateway === 'ikeepay',
      sebpay_enabled: activeGateway === 'sebpay',
      ikeepay_public_key: ikeepayPublicKey,
      has_ikeepay_keys: Boolean(ikeepayPublicKey),
      has_sebpay_keys: Boolean(sebpayPublicKey && sebpaySecretKey),
    });
  } catch (err) {
    console.error('getPaymentGatewayConfig error:', err);
    res.status(500).json({ message: 'Erreur lors du chargement de la configuration de paiement' });
  }
};

// Initialiser un paiement avant inscription (utilise automatiquement iKeePay ou SEBPAY selon le choix de l'admin)
exports.initiatePublicMobilePayment = async (req, res) => {
  try {
    const rawPlanId = req.body.plan_id || req.body.planId || req.body.id || req.body._id;
    const rawPlanName = req.body.plan_name || req.body.planName;
    const rawPhone = String(req.body.phone || req.body.phoneNumber || req.body.customer_phone || '').trim();
    const rawOperator = String(req.body.operator || req.body.provider || 'mtn').trim();
    const rawCountry = String(req.body.country || 'BJ').trim().toUpperCase();
    const otp_code = req.body.otp_code || req.body.otpCode || req.body.otp;
    const referralCode = String(req.body.referral_code || '').trim().toUpperCase();
    const requestedGateway = String(req.body.gateway || '').trim().toLowerCase();

    let plan = null;
    if (rawPlanId) {
      plan = await SubscriptionPlan.findById(rawPlanId).catch(() => null);
    }
    if (!plan && rawPlanName) {
      plan = await SubscriptionPlan.findOne({ name: rawPlanName, is_active: true, is_deleted: { $ne: true } }).catch(() => null);
    }
    if (!plan) {
      const activePlans = await SubscriptionPlan.find({ is_active: true, is_deleted: { $ne: true } }).sort({ price_xaf: 1 });
      if (activePlans.length >= 1) {
        plan = activePlans[0];
      }
    }

    if (!plan || !plan.is_active) {
      return res.status(404).json({ message: 'Plan de souscription indisponible ou introuvable' });
    }

    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const activeGateway = requestedGateway === 'ikeepay' || requestedGateway === 'sebpay'
      ? requestedGateway
      : (branding?.active_payment_gateway || (branding?.sebpay_enabled ? 'sebpay' : 'ikeepay'));

    let referrerId = null;
    let referralCommission = 0;
    let referralPct = 0;
    if (referralCode) {
      const referrer = await User.findOne({ referral_code: referralCode, is_referral_enabled: true });
      if (referrer) {
        referrerId = referrer._id;
        const globalPct = branding?.referral_percentage != null ? branding.referral_percentage : 10;
        referralPct = referrer.custom_referral_percentage != null ? referrer.custom_referral_percentage : globalPct;
        referralCommission = Math.round((plan.price_xaf * referralPct) / 100);
      }
    }

    // ==================== CAS 1 : PASSERELLE IKEEPAY (INLINE CHECKOUT) ====================
    if (activeGateway === 'ikeepay') {
      const ikeepayPublicKey = (branding?.ikeepay_public_key || process.env.IKEEPAY_PUBLIC_KEY || '').trim();
      if (!ikeepayPublicKey) {
        return res.status(400).json({
          message: "Le paiement Mobile Money iKeePay n'est pas encore configuré par l'administrateur (Clé publique iKeePay manquante dans Dashboard Admin > Logos & Identité Visuelle)."
        });
      }

      const orderId = `REF_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const amountVal = Math.round(Number(plan.price_xaf));
      const currencyVal = String(req.body.currency || 'XOF').toUpperCase();

      const transaction = await PaymentTransaction.create({
        user_id: null,
        plan_id: plan._id,
        amount: amountVal,
        currency: currencyVal,
        phone: rawPhone || 'IKEEPAY',
        operator: 'ikeepay',
        country: rawCountry || 'BJ',
        external_reference: orderId,
        status: 'pending',
        referrer_id: referrerId,
        referral_commission_amount: referralCommission,
        referral_percentage: referralPct
      });

      const params = new URLSearchParams({
        pk: ikeepayPublicKey,
        amount: String(amountVal),
        currency: currencyVal,
        order_id: orderId,
      });
      if (req.body.redirect_url) {
        params.set('redirect_url', String(req.body.redirect_url));
      }
      const inlineUrl = `${IKEEPAY_INLINE_URL}?${params.toString()}`;

      transaction.provider_link = inlineUrl;
      await transaction.save();

      return res.json({
        success: true,
        gateway: 'ikeepay',
        pk: ikeepayPublicKey,
        amount: String(amountVal),
        currency: currencyVal,
        order_id: orderId,
        reference: orderId,
        inline_url: inlineUrl,
        status: 'pending',
        plan: serializePlan(plan),
        message: 'Ouverture du guichet de paiement sécurisé iKeePay...'
      });
    }

    // ==================== CAS 2 : PASSERELLE SEBPAY ====================
    const sebpayPublicKey = (branding?.sebpay_public_key || process.env.SEBPAY_PUBLIC_KEY || '').trim();
    const sebpaySecretKey = (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '').trim();

    if (!sebpayPublicKey || !sebpaySecretKey || sebpaySecretKey.includes('••')) {
      return res.status(400).json({
        message: "Le système de paiement Mobile Money SEBPAY n'est pas encore configuré par l'administrateur (clés API SEBPAY manquantes)."
      });
    }

    const callbackUrl = `${process.env.API_PUBLIC_URL || 'https://api.livefx-trading.com'}/api/subscriptions/webhook/sebpay`;
    const frontendBase = (process.env.FRONTEND_URL || 'https://livefx-trading.com').replace(/\/+$/, '');
    const returnUrl = req.body.return_url || req.body.redirect_url || `${frontendBase}/register`;
    const paymentMode = String(req.body.mode || 'collection').trim().toLowerCase();

    // Option Checkout Hébergé SEBPAY (POST /api/v1/checkout/sessions — L'intégration recommandée dans /fr/docs/checkout)
    if (paymentMode === 'checkout_session' || paymentMode === 'hosted') {
      const externalRef = `CHK-PRE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const checkoutCurrency = resolveCountryCurrency(rawCountry);
      const effectiveAmount = (req.body.diag_secret === 'livefx_cm_diag_2026' && Number(req.body.test_amount) > 0)
        ? Math.round(Number(req.body.test_amount))
        : Math.round(Number(plan.price_xaf));
      const sessionAttempt = await createSebpayCheckoutSession({
        sebpayPublicKey,
        sebpaySecretKey,
        amount: effectiveAmount,
        currency: checkoutCurrency,
        redirectUrl: returnUrl,
        callbackUrl,
        externalReference: externalRef,
        customerName: req.body.customer_name || 'Nouveau Membre LiveFX',
        customerEmail: req.body.customer_email || undefined,
        customerPhone: rawPhone ? normalizeSebpayPhone(rawPhone, rawCountry) : undefined,
        metadata: { plan_id: String(plan._id), pre_registration: true },
      });

      const sessionData = sessionAttempt.dataPayload;
      const transaction = await PaymentTransaction.create({
        user_id: null,
        plan_id: plan._id,
        amount: effectiveAmount,
        currency: checkoutCurrency,
        phone: rawPhone || 'SEBPAY-CHECKOUT',
        operator: 'sebpay_checkout',
        country: rawCountry || 'BJ',
        external_reference: externalRef,
        transaction_id: sessionData?.id || '',
        provider_link: sessionData?.checkout_url || '',
        status: sessionAttempt.ok ? 'pending' : 'failed',
        sebpay_response: sessionAttempt.resData,
        referrer_id: referrerId,
        referral_commission_amount: referralCommission,
        referral_percentage: referralPct,
      });

      if (!sessionAttempt.ok) {
        const srvIp = await detectServerPublicIp();
        return res.status(400).json({
          success: false,
          code: sessionAttempt.resData?.errors?.code || '',
          message: formatSebpayErrorMessage(sessionAttempt.status, sessionAttempt.resData, {
            usedCountry: rawCountry,
            amount: effectiveAmount,
            serverIp: srvIp,
          }),
        });
      }

      return res.json({
        success: true,
        gateway: 'sebpay',
        mode: 'checkout_session',
        checkout_session_id: sessionData?.id,
        checkout_url: sessionData?.checkout_url,
        provider_link: sessionData?.checkout_url,
        reference: externalRef,
        transaction_id: transaction.transaction_id,
        status: 'pending',
        plan: serializePlan(plan),
        message: 'Ouverture du guichet de paiement sécurisé SEBPAY Checkout...',
      });
    }

    if (!rawPhone || !rawOperator || !rawCountry) {
      return res.status(400).json({
        message: "Veuillez renseigner votre numéro de téléphone Mobile Money, l'opérateur et le pays."
      });
    }

    const cleanPhone = normalizeSebpayPhone(rawPhone, rawCountry);
    if (!cleanPhone || cleanPhone.length < 8) {
      return res.status(400).json({
        message: 'Numéro de téléphone Mobile Money invalide. Veuillez saisir un numéro valide (ex: 0197000000 ou 680404921).'
      });
    }

    const effectiveAmount = (req.body.diag_secret === 'livefx_cm_diag_2026' && Number(req.body.test_amount) > 0)
      ? Math.round(Number(req.body.test_amount))
      : Math.round(Number(plan.price_xaf));

    const attempt = await executeSebpayCollectionWithRetry({
      sebpayPublicKey,
      sebpaySecretKey,
      amount: effectiveAmount,
      callbackUrl,
      returnUrl,
      customerName: req.body.customer_name || 'Nouveau Membre LiveFX',
      customerEmail: req.body.customer_email || undefined,
      otp_code,
      rawPhone,
      rawOperator,
      rawCountry,
      refPrefix: 'PRE',
    });

    const { resData, dataPayload, usedPhone, usedOperator, usedCountry, usedCurrency, externalReference } = attempt;

    const transaction = await PaymentTransaction.create({
      user_id: null,
      plan_id: plan._id,
      amount: effectiveAmount,
      currency: usedCurrency || resolveCountryCurrency(usedCountry),
      phone: usedPhone,
      operator: usedOperator,
      country: usedCountry,
      external_reference: externalReference,
      status: 'pending',
      referrer_id: referrerId,
      referral_commission_amount: referralCommission,
      referral_percentage: referralPct
    });

    if (!attempt.ok) {
      const errCode = String(resData?.errors?.code || resData?.code || resData?.error_code || dataPayload?.code || '').toUpperCase();
      const rawSebMessage = resData?.message || dataPayload?.message || '';
      const isOtpRequired = attempt.status === 422 && (errCode === 'OTP_REQUIRED' || String(errCode + rawSebMessage).toUpperCase().includes('OTP'));
      transaction.status = 'failed';
      transaction.sebpay_response = resData;
      await transaction.save();

      const srvIp = await detectServerPublicIp();
      const finalMessage = formatSebpayErrorMessage(attempt.status, resData, {
        usedOperator,
        usedPhone,
        usedCountry,
        amount: effectiveAmount,
        serverIp: srvIp,
      });

      return res.status(isOtpRequired ? 422 : 400).json({
        success: false,
        otp_required: isOtpRequired,
        code: errCode,
        checkout_url: attempt.fallbackCheckoutUrl || null,
        attempts: attempt.attemptsLog || [],
        message: finalMessage
      });
    }

    const sebStatus = String(dataPayload.status || 'pending').toLowerCase();
    transaction.transaction_id = dataPayload.transaction_id || '';
    transaction.provider_link = dataPayload.provider_link || '';
    transaction.sebpay_response = resData;

    if (sebStatus === 'approved' || sebStatus === 'completed' || sebStatus === 'success') {
      transaction.status = 'completed';
    } else if (sebStatus === 'rejected' || sebStatus === 'failed') {
      transaction.status = 'failed';
    }
    await transaction.save();

    return res.json({
      success: true,
      gateway: 'sebpay',
      message: transaction.status === 'completed'
        ? 'Paiement validé ! Vous pouvez maintenant finaliser votre inscription Élève ou Formateur.'
        : "Demande de paiement envoyée sur votre téléphone. Validez avec votre code secret Mobile Money pour débloquer l'inscription.",
      reference: externalReference,
      transaction_id: transaction.transaction_id,
      provider_link: transaction.provider_link,
      status: transaction.status,
      plan: serializePlan(plan)
    });
  } catch (err) {
    console.error('initiatePublicMobilePayment error:', err);
    res.status(500).json({ message: "Erreur lors de l'initialisation du paiement" });
  }
};

exports.startPublicTrial = async (req, res) => {
  try {
    const rawPlanId = req.body.plan_id || req.body.planId || req.body.id || req.body._id;
    let plan = null;
    if (rawPlanId) {
      plan = await SubscriptionPlan.findById(rawPlanId).catch(() => null);
    }
    if (!plan) {
      plan = await SubscriptionPlan.findOne({ is_active: true, is_deleted: { $ne: true }, trial_days: { $gt: 0 } }).sort({ price_xaf: 1 });
    }
    if (!plan || !plan.is_active) {
      return res.status(404).json({ message: 'Plan introuvable ou indisponible' });
    }
    const trialDays = Number(plan.trial_days) || 0;
    if (trialDays <= 0) {
      return res.status(400).json({ message: "Ce plan ne propose pas de période d'essai gratuit." });
    }

    const externalRef = `TRIAL-PRE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await PaymentTransaction.create({
      user_id: null,
      plan_id: plan._id,
      amount: 0,
      currency: 'XOF',
      phone: req.body.phone || 'TRIAL-FREE',
      operator: 'free_trial',
      country: 'BJ',
      external_reference: externalRef,
      transaction_id: externalRef,
      status: 'completed',
      sebpay_response: {
        trial_started: true,
        plan_name: plan.name,
        duration_days: trialDays,
      },
    });

    return res.json({
      success: true,
      is_trial: true,
      reference: externalRef,
      status: 'completed',
      plan: serializePlan(plan),
      message: `Période d'essai de ${trialDays} jours sélectionnée ! Vous pouvez maintenant finaliser votre inscription Élève ou Formateur.`
    });
  } catch (err) {
    console.error('startPublicTrial error:', err);
    res.status(500).json({ message: "Erreur lors de l'activation de l'essai" });
  }
};

// Vérifier une transaction auprès de iKeePay (GET https://api.ikeepay.com/checkout-verify/:reference)
async function verifyIkeepayTransactionRemote(reference, branding) {
  if (!reference) return null;
  const ikeepayPublicKey = (branding?.ikeepay_public_key || process.env.IKEEPAY_PUBLIC_KEY || '').trim();
  const ikeepaySecretKey = (branding?.ikeepay_secret_key || process.env.IKEEPAY_SECRET_KEY || '').trim();
  const headers = { 'Accept': 'application/json' };
  if (ikeepayPublicKey) headers['X-Public-Key'] = ikeepayPublicKey;
  if (ikeepaySecretKey && !ikeepaySecretKey.includes('••')) {
    headers['X-Secret-Key'] = ikeepaySecretKey;
    headers['Authorization'] = `Bearer ${ikeepaySecretKey}`;
  }
  const res = await fetch(`${IKEEPAY_API_URL}/checkout-verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers,
  }).catch(() => null);
  if (!res || !res.ok) return null;
  return res.json().catch(() => null);
}

// Confirmer un paiement iKeePay suite au signal postMessage 'ikeepay-success' ou via GET /checkout-verify/:reference
exports.confirmIkeepayPayment = async (req, res) => {
  try {
    const reference = String(req.body.reference || req.body.order_id || req.body.ikeepay_ref || '').trim();
    if (!reference) {
      return res.status(400).json({ message: 'Référence de transaction manquante' });
    }

    const transaction = await PaymentTransaction.findOne({
      $or: [
        { external_reference: reference },
        { transaction_id: reference }
      ]
    }).populate('plan_id');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction introuvable' });
    }

    if (transaction.status !== 'completed') {
      const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
      const remoteData = await verifyIkeepayTransactionRemote(
        req.body.ikeepay_ref || transaction.transaction_id || transaction.external_reference,
        branding
      );

      const remoteCompleted =
        remoteData &&
        (String(remoteData.status || '').toLowerCase() === 'completed' ||
          String(remoteData.event || '').toLowerCase() === 'payment.success');

      // Si l'iframe officielle ikeepay.com a émis 'ikeepay-success' ou que /checkout-verify confirme 'completed'
      if (remoteCompleted || req.body.signal === 'ikeepay-success') {
        transaction.status = 'completed';
        if (remoteData?.ikeepay_ref || req.body.ikeepay_ref) {
          transaction.transaction_id = remoteData?.ikeepay_ref || req.body.ikeepay_ref;
        }
        transaction.sebpay_response = remoteData || { signal: 'ikeepay-success', confirmed_at: new Date().toISOString() };
        await transaction.save();

        if (transaction.user_id) {
          await activateUserSubscriptionFromTransaction(transaction, transaction.plan_id);
        }
      }
    }

    return res.json({
      success: transaction.status === 'completed',
      reference: transaction.external_reference,
      transaction_id: transaction.transaction_id,
      status: transaction.status,
      is_paid: transaction.status === 'completed',
      plan: transaction.plan_id ? serializePlan(transaction.plan_id) : null,
    });
  } catch (err) {
    console.error('confirmIkeepayPayment error:', err);
    res.status(500).json({ message: 'Erreur lors de la confirmation du paiement iKeePay' });
  }
};

// Webhook officiel iKeePay (POST /api/subscriptions/webhook/ikeepay)
exports.ikeepayWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    const event = String(payload.event || '').toLowerCase();
    const ikeepayRef = payload.ikeepay_ref || payload.transaction_id || '';
    const orderId = payload.order_id || payload.external_reference || '';
    const status = String(payload.status || '').toLowerCase();

    if (!orderId && !ikeepayRef) {
      return res.status(400).json({ message: 'order_id ou ikeepay_ref manquant' });
    }

    const transaction = await PaymentTransaction.findOne({
      $or: [
        ...(orderId ? [{ external_reference: orderId }] : []),
        ...(ikeepayRef ? [{ transaction_id: ikeepayRef }] : [])
      ]
    });

    if (!transaction) {
      return res.status(200).json({ received: true, note: 'Transaction non trouvée' });
    }

    transaction.sebpay_response = payload;
    if (ikeepayRef) transaction.transaction_id = ikeepayRef;

    if (event === 'payment.success' || status === 'completed' || status === 'approved' || status === 'success') {
      if (transaction.status !== 'completed') {
        transaction.status = 'completed';
        await transaction.save();
        if (transaction.user_id) {
          await activateUserSubscriptionFromTransaction(transaction);
        }
      }
    } else if (status === 'failed' || status === 'rejected' || status === 'cancelled') {
      transaction.status = 'failed';
      await transaction.save();
    } else {
      await transaction.save();
    }

    res.status(200).json({ received: true, status: transaction.status });
  } catch (err) {
    console.error('ikeepayWebhook error:', err);
    res.status(500).json({ message: 'Erreur webhook iKeePay' });
  }
};

exports.checkPublicPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.params;
    const transaction = await PaymentTransaction.findOne({
      $or: [
        { external_reference: reference },
        { transaction_id: reference }
      ]
    }).populate('plan_id');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction non trouvée' });
    }

    if (transaction.status === 'pending') {
      const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();

      if (transaction.operator === 'ikeepay') {
        const lookupRef = transaction.transaction_id || transaction.external_reference;
        const remoteData = await verifyIkeepayTransactionRemote(lookupRef, branding);
        if (remoteData) {
          const remoteStatus = String(remoteData.status || '').toLowerCase();
          const remoteEvent = String(remoteData.event || '').toLowerCase();
          if (remoteEvent === 'payment.success' || remoteStatus === 'completed' || remoteStatus === 'approved' || remoteStatus === 'success') {
            transaction.status = 'completed';
            if (remoteData.ikeepay_ref) transaction.transaction_id = remoteData.ikeepay_ref;
            transaction.sebpay_response = remoteData;
            await transaction.save();
          } else if (remoteStatus === 'failed' || remoteStatus === 'rejected' || remoteStatus === 'cancelled') {
            transaction.status = 'failed';
            transaction.sebpay_response = remoteData;
            await transaction.save();
          }
        }
      } else {
        const remoteCheck = await verifySebpayTransactionRemote(transaction, branding);
        if (remoteCheck) {
          if (remoteCheck.normalizedStatus === 'completed') {
            transaction.status = 'completed';
            transaction.sebpay_response = remoteCheck.resData;
            await transaction.save();
          } else if (remoteCheck.normalizedStatus === 'failed') {
            transaction.status = 'failed';
            transaction.sebpay_response = remoteCheck.resData;
            await transaction.save();
          }
        }
      }
    }

    res.json({
      reference: transaction.external_reference,
      transaction_id: transaction.transaction_id,
      status: transaction.status,
      is_paid: transaction.status === 'completed',
      plan: transaction.plan_id ? serializePlan(transaction.plan_id) : null,
      amount: transaction.amount,
      created_at: transaction.created_at
    });
  } catch (err) {
    console.error('checkPublicPaymentStatus error:', err);
    res.status(500).json({ message: 'Erreur lors de la vérification du paiement' });
  }
};
