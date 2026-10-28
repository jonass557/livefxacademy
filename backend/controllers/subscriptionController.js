const crypto = require('crypto');
const { SubscriptionPlan, PaymentTransaction, User, BrandingSettings } = require('../models');

const SEBPAY_API_URL = 'https://newapi.sebpay.bj/api/v1';

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
};

// Opérateurs par défaut par pays (fallback si GET /operators indisponible)
const DEFAULT_OPERATORS_BY_COUNTRY = {
  BJ: [
    { code: 'mtn', slug: 'mtn-bj', name: 'MTN Mobile Money (Bénin)', otp_required: false },
    { code: 'moov', slug: 'moov-bj', name: 'Moov Money (Bénin)', otp_required: false },
    { code: 'celtiis', slug: 'celtiis-bj', name: 'Celtiis Cash (Bénin)', otp_required: false },
  ],
  CI: [
    { code: 'mtn', slug: 'mtn-ci', name: 'MTN MoMo (Côte d\'Ivoire)', otp_required: false },
    { code: 'moov', slug: 'moov-ci', name: 'Moov Money (Côte d\'Ivoire)', otp_required: false },
    { code: 'orange', slug: 'orange-ci', name: 'Orange Money (Côte d\'Ivoire)', otp_required: true },
    { code: 'wave', slug: 'wave-ci', name: 'Wave (Côte d\'Ivoire)', otp_required: false },
  ],
  TG: [
    { code: 'tmoney', slug: 'tmoney-tg', name: 'TMoney / Yas (Togo)', otp_required: false },
    { code: 'moov', slug: 'moov-tg', name: 'Moov Money (Togo)', otp_required: false },
  ],
  SN: [
    { code: 'wave', slug: 'wave-sn', name: 'Wave (Sénégal)', otp_required: false },
    { code: 'orange', slug: 'orange-sn', name: 'Orange Money (Sénégal)', otp_required: true },
    { code: 'free', slug: 'free-sn', name: 'Free Money / Yas (Sénégal)', otp_required: false },
  ],
  BF: [
    { code: 'orange', slug: 'orange-bf', name: 'Orange Money (Burkina Faso)', otp_required: true },
    { code: 'moov', slug: 'moov-bf', name: 'Moov Money (Burkina Faso)', otp_required: false },
  ],
  CM: [
    { code: 'mtn', slug: 'mtn-cm', name: 'MTN Mobile Money (Cameroun)', otp_required: false },
    { code: 'orange', slug: 'orange-cm', name: 'Orange Money (Cameroun)', otp_required: false },
  ],
  ML: [
    { code: 'orange', slug: 'orange-ml', name: 'Orange Money (Mali)', otp_required: false },
    { code: 'moov', slug: 'moov-ml', name: 'Moov Money (Mali)', otp_required: false },
  ],
  NE: [
    { code: 'airtel', slug: 'airtel-ne', name: 'Airtel Money (Niger)', otp_required: false },
    { code: 'moov', slug: 'moov-ne', name: 'Moov Money (Niger)', otp_required: false },
  ],
};

// Normalise un plan pour exposer systématiquement id et _id
function serializePlan(planDoc) {
  if (!planDoc) return null;
  const obj = typeof planDoc.toObject === 'function' ? planDoc.toObject({ virtuals: true }) : { ...planDoc };
  const strId = String(obj._id || obj.id || '');
  return {
    ...obj,
    _id: strId,
    id: strId,
  };
}

// Formate le numéro au format international sans (+) exigé par SEBPAY (ex: "22997000000")
function normalizeSebpayPhone(rawPhone, countryCode) {
  let digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  const iso = String(countryCode || 'BJ').trim().toUpperCase();
  const dial = COUNTRY_DIAL_CODES[iso];
  if (dial && digits && !digits.startsWith(dial)) {
    digits = `${dial}${digits}`;
  }
  return digits;
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
    const plans = await SubscriptionPlan.find({ is_active: true, is_deleted: { $ne: true } }).sort({ price_xaf: 1 });
    res.json(plans.map(serializePlan));
  } catch (err) {
    console.error('getActivePlans error:', err);
    res.status(500).json({ message: 'Erreur lors du chargement des plans' });
  }
};

// Admin : Liste de tous les plans
exports.getAdminPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ is_deleted: { $ne: true } }).sort({ created_at: -1 });
    res.json(plans.map(serializePlan));
  } catch (err) {
    console.error('getAdminPlans error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Admin : Créer un plan
exports.createPlan = async (req, res) => {
  try {
    const { name, description, price_xaf, duration_days, trial_days, features, is_active } = req.body;
    if (!name || price_xaf == null) {
      return res.status(400).json({ message: 'Le nom et le prix en XAF sont obligatoires' });
    }

    const plan = await SubscriptionPlan.create({
      name,
      description: description || '',
      price_xaf: Number(price_xaf),
      duration_days: Number(duration_days) || 30,
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

// Récupérer la liste des opérateurs Mobile Money supportés par SEBPAY (GET /api/v1/operators)
exports.getSebpayOperators = async (req, res) => {
  try {
    const country = String(req.query.country || '').trim().toUpperCase();
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const sebpayPublicKey = (branding?.sebpay_public_key || process.env.SEBPAY_PUBLIC_KEY || '').trim();
    const sebpaySecretKey = (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '').trim();

    if (sebpayPublicKey && sebpaySecretKey && !sebpaySecretKey.includes('••')) {
      const url = country
        ? `${SEBPAY_API_URL}/operators?country=${encodeURIComponent(country)}`
        : `${SEBPAY_API_URL}/operators`;
      const sebRes = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Public-Key': sebpayPublicKey,
          'X-Secret-Key': sebpaySecretKey,
          'Accept': 'application/json',
        },
      }).catch(() => null);

      if (sebRes && sebRes.ok) {
        const json = await sebRes.json().catch(() => null);
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

// Initier un paiement Mobile Money SEBPAY (POST https://newapi.sebpay.bj/api/v1/collections)
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

    if (!rawPhone || !rawOperator || !rawCountry) {
      return res.status(400).json({
        message: 'Veuillez renseigner votre numéro de téléphone Mobile Money, l\'opérateur et le pays.'
      });
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

    // Formater le numéro de téléphone au format international sans (+) comme exigé par SEBPAY (ex: 22997000000)
    const cleanPhone = normalizeSebpayPhone(rawPhone, rawCountry);
    if (!cleanPhone || cleanPhone.length < 8) {
      return res.status(400).json({
        message: 'Numéro de téléphone Mobile Money invalide. Veuillez saisir un numéro valide (ex: 97000000).'
      });
    }

    const externalRef = `SUB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const callbackUrl = `${process.env.API_PUBLIC_URL || 'https://api.livefx-trading.com'}/api/subscriptions/webhook/sebpay`;

    // Créer la transaction locale d'abord
    const transaction = await PaymentTransaction.create({
      user_id: user._id,
      plan_id: plan._id,
      amount: Math.round(Number(plan.price_xaf)),
      currency: 'XOF',
      phone: cleanPhone,
      operator: rawOperator.toLowerCase(),
      country: rawCountry,
      external_reference: externalRef,
      status: 'pending',
      referrer_id: referrerId,
      referral_commission_amount: referralCommission,
      referral_percentage: referralPct
    });

    // Appeler l'API de collectes SEBPAY (POST https://newapi.sebpay.bj/api/v1/collections)
    const payload = {
      amount: Math.round(Number(plan.price_xaf)),
      currency: 'XOF',
      phone: cleanPhone,
      operator: rawOperator.toLowerCase(),
      country: rawCountry,
      external_reference: externalRef,
      callback_url: callbackUrl,
      customer_name: user.full_name || 'Membre LiveFX',
      customer_email: user.email || undefined,
    };

    if (otp_code && String(otp_code).trim()) {
      payload.otp_code = String(otp_code).trim();
    }

    try {
      const sebResponse = await fetch(`${SEBPAY_API_URL}/collections`, {
        method: 'POST',
        headers: {
          'X-Public-Key': sebpayPublicKey,
          'X-Secret-Key': sebpaySecretKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await sebResponse.json().catch(() => ({}));
      const dataPayload = resData.data || resData;

      if (!sebResponse.ok || resData.success === false) {
        const errCode = resData?.code || resData?.error_code || dataPayload?.code || '';
        const isOtpRequired = sebResponse.status === 422 || String(errCode).toUpperCase().includes('OTP_REQUIRED');
        transaction.status = 'failed';
        transaction.sebpay_response = resData;
        await transaction.save();

        return res.status(isOtpRequired ? 422 : 400).json({
          success: false,
          otp_required: isOtpRequired,
          code: errCode,
          message: resData?.message || dataPayload?.message || (isOtpRequired
            ? 'Cet opérateur exige un code de validation OTP. Veuillez saisir le code OTP pour confirmer.'
            : `Le paiement a été refusé par l'opérateur (HTTP ${sebResponse.status}). Vérifiez votre numéro et l'opérateur choisi.`)
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
        external_reference: externalRef,
        provider_link: dataPayload.provider_link || null,
        payment_url: dataPayload.provider_link || null,
        status: transaction.status
      });
    } catch (sebErr) {
      console.error('Erreur appel SEBPAY:', sebErr.message);
      transaction.status = 'failed';
      transaction.sebpay_response = { error: sebErr.message };
      await transaction.save();

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

// Webhook SEBPAY (POST /api/subscriptions/webhook/sebpay) — Documentation: https://new.sebpay.bj/fr/docs/webhooks
exports.sebpayWebhook = async (req, res) => {
  try {
    const eventData = req.body || {};
    const ref = eventData.external_reference || eventData.data?.external_reference;
    const txId = eventData.transaction_id || eventData.data?.transaction_id;
    const status = String(eventData.status || eventData.data?.status || '').toLowerCase();

    if (!ref && !txId) {
      return res.status(400).json({ message: 'Missing external_reference or transaction_id' });
    }

    const query = ref ? { external_reference: ref } : { transaction_id: txId };
    const transaction = await PaymentTransaction.findOne(query).populate('plan_id');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Vérification optionnelle de la signature HMAC X-SebPay-Signature si clé secrète présente
    const signature = req.headers['x-sebpay-signature'];
    if (signature && req.rawBody) {
      const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
      const secret = (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '').trim();
      if (secret && !secret.includes('••')) {
        const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
        if (signature !== expected) {
          console.warn('[SEBPAY Webhook] Signature mismatch');
        }
      }
    }

    // Dans la doc SEBPAY v1, les statuts finaux sont 'approved' ou 'rejected'
    if (status === 'approved' || status === 'completed' || status === 'success' || status === 'paid') {
      const wasCompleted = transaction.status === 'completed';
      transaction.status = 'completed';
      if (txId && !transaction.transaction_id) transaction.transaction_id = txId;
      if (!wasCompleted) {
        await activateUserSubscriptionFromTransaction(transaction, transaction.plan_id);
      }
    } else if (status === 'rejected' || status === 'failed' || status === 'cancelled' || status === 'expired') {
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

// Vérifier le statut d'une transaction (avec revérification directe GET /api/v1/collections/{reference} chez SEBPAY si en attente)
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.params;
    const transaction = await PaymentTransaction.findOne({ external_reference: reference })
      .populate('plan_id', 'name price_xaf duration_days');

    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });

    // Si la transaction est toujours 'pending', interroger GET /api/v1/collections/{id_or_reference}
    // Comme indiqué dans la doc SEBPAY : "Si elle est en attente, Sebpay revérifie son statut auprès de l'opérateur."
    if (transaction.status === 'pending') {
      try {
        const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
        const sebpayPublicKey = (branding?.sebpay_public_key || process.env.SEBPAY_PUBLIC_KEY || '').trim();
        const sebpaySecretKey = (branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY || '').trim();

        if (sebpayPublicKey && sebpaySecretKey && !sebpaySecretKey.includes('••')) {
          const lookupId = transaction.transaction_id || transaction.external_reference;
          const sebRes = await fetch(`${SEBPAY_API_URL}/collections/${encodeURIComponent(lookupId)}`, {
            method: 'GET',
            headers: {
              'X-Public-Key': sebpayPublicKey,
              'X-Secret-Key': sebpaySecretKey,
              'Accept': 'application/json',
            },
          }).catch(() => null);

          if (sebRes && sebRes.ok) {
            const sebJson = await sebRes.json().catch(() => ({}));
            const sebData = sebJson.data || sebJson;
            const liveStatus = String(sebData.status || '').toLowerCase();

            if (liveStatus === 'approved' || liveStatus === 'completed' || liveStatus === 'success') {
              transaction.status = 'completed';
              transaction.sebpay_response = sebJson;
              await transaction.save();
              await activateUserSubscriptionFromTransaction(transaction, transaction.plan_id);
            } else if (liveStatus === 'rejected' || liveStatus === 'failed') {
              transaction.status = 'failed';
              transaction.sebpay_response = sebJson;
              await transaction.save();
            }
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
