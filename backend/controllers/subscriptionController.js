const { SubscriptionPlan, PaymentTransaction, User, BrandingSettings } = require('../models');

const SEBPAY_API_URL = 'https://newapi.sebpay.bj/api/v1';

// ----------------- PLANS DE SOUSCRIPTION -----------------

// Liste des plans actifs pour les utilisateurs
exports.getActivePlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ is_active: true }).sort({ price_xaf: 1 });
    res.json(plans);
  } catch (err) {
    console.error('getActivePlans error:', err);
    res.status(500).json({ message: 'Erreur lors du chargement des plans' });
  }
};

// Admin : Liste de tous les plans
exports.getAdminPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ createdAt: -1 });
    res.json(plans);
  } catch (err) {
    console.error('getAdminPlans error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Admin : Créer un plan
exports.createPlan = async (req, res) => {
  try {
    const { name, description, price_xaf, duration_days, features, is_active } = req.body;
    if (!name || price_xaf == null) {
      return res.status(400).json({ message: 'Le nom et le prix en XAF sont obligatoires' });
    }

    const plan = await SubscriptionPlan.create({
      name,
      description: description || '',
      price_xaf: Number(price_xaf),
      duration_days: Number(duration_days) || 30,
      features: Array.isArray(features) ? features : [],
      is_active: is_active !== undefined ? is_active : true,
      created_by: req.user.id
    });

    res.status(201).json(plan);
  } catch (err) {
    console.error('createPlan error:', err);
    res.status(500).json({ message: 'Erreur lors de la création du plan' });
  }
};

// Admin : Mettre à jour un plan
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findByIdAndUpdate(id, req.body, { new: true });
    if (!plan) return res.status(404).json({ message: 'Plan non trouvé' });
    res.json(plan);
  } catch (err) {
    console.error('updatePlan error:', err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Admin : Supprimer un plan
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    await SubscriptionPlan.findByIdAndDelete(id);
    res.json({ message: 'Plan supprimé avec succès' });
  } catch (err) {
    console.error('deletePlan error:', err);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};

// ----------------- PAIEMENT SEBPAY MOBILE MONEY -----------------

// Initier un paiement Mobile Money SEBPAY
exports.initiateMobilePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan_id, phone, operator, country, otp_code } = req.body;

    if (!plan_id || !phone || !operator || !country) {
      return res.status(400).json({ message: 'Veuillez renseigner le plan, le téléphone, l\'opérateur et le pays' });
    }

    const plan = await SubscriptionPlan.findById(plan_id);
    if (!plan || !plan.is_active) {
      return res.status(404).json({ message: 'Plan de souscription indisponible' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    // Récupérer les clés API SEBPAY configurées par l'administrateur
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const sebpayPublicKey = branding?.sebpay_public_key || process.env.SEBPAY_PUBLIC_KEY;
    const sebpaySecretKey = branding?.sebpay_secret_key || process.env.SEBPAY_SECRET_KEY;

    if (!sebpayPublicKey || !sebpaySecretKey) {
      return res.status(400).json({
        message: 'Le système de paiement Mobile Money n\'est pas encore configuré par l\'administrateur (clés API SEBPAY manquantes).'
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

    // Formater le numéro de téléphone sans le (+)
    const cleanPhone = String(phone).replace(/\+/g, '').replace(/\s+/g, '');
    const externalRef = `SUB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const callbackUrl = `${process.env.API_PUBLIC_URL || 'https://api.livefx-trading.com'}/api/subscriptions/webhook/sebpay`;

    // Créer la transaction locale d'abord
    const transaction = await PaymentTransaction.create({
      user_id: user._id,
      plan_id: plan._id,
      amount: plan.price_xaf,
      currency: 'XOF',
      phone: cleanPhone,
      operator: operator.toLowerCase(),
      country: country.toUpperCase(),
      external_reference: externalRef,
      status: 'pending',
      referrer_id: referrerId,
      referral_commission_amount: referralCommission,
      referral_percentage: referralPct
    });

    // Appeler l'API de collectes SEBPAY (https://new.sebpay.bj/fr/docs/collections)
    const payload = {
      amount: plan.price_xaf,
      currency: 'XOF',
      phone: cleanPhone,
      operator: operator.toLowerCase(),
      country: country.toUpperCase(),
      external_reference: externalRef,
      callback_url: callbackUrl
    };

    if (otp_code) {
      payload.otp_code = String(otp_code).trim();
    }

    try {
      const sebResponse = await fetch(`${SEBPAY_API_URL}/collections`, {
        method: 'POST',
        headers: {
          'X-Public-Key': sebpayPublicKey,
          'X-Secret-Key': sebpaySecretKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await sebResponse.json().catch(() => ({}));
      const dataPayload = resData.data || resData;

      if (!sebResponse.ok) {
        throw new Error(resData?.message || `Erreur SEBPAY HTTP ${sebResponse.status}`);
      }

      transaction.transaction_id = dataPayload.transaction_id || '';
      transaction.provider_link = dataPayload.provider_link || '';
      transaction.sebpay_response = resData;
      if (dataPayload.status === 'completed' || dataPayload.status === 'success') {
        transaction.status = 'completed';
      }
      await transaction.save();

      return res.json({
        success: true,
        message: resData.message || 'Demande de paiement initiée. Veuillez valider sur votre téléphone.',
        transaction_id: transaction.transaction_id,
        external_reference: externalRef,
        provider_link: dataPayload.provider_link || null,
        status: transaction.status
      });
    } catch (sebErr) {
      console.error('Erreur appel SEBPAY:', sebErr.message);
      transaction.status = 'failed';
      transaction.sebpay_response = { error: sebErr.message };
      await transaction.save();

      const errMsg = sebErr.message || 'Erreur lors de l\'initiation du paiement Mobile Money chez SEBPAY';
      return res.status(400).json({
        success: false,
        message: errMsg
      });
    }
  } catch (err) {
    console.error('initiateMobilePayment error:', err);
    res.status(500).json({ message: 'Erreur interne lors de l\'initiation du paiement' });
  }
};

// Webhook SEBPAY pour recevoir la confirmation automatique du paiement
exports.sebpayWebhook = async (req, res) => {
  try {
    const eventData = req.body;
    const ref = eventData.external_reference || eventData.data?.external_reference;
    const status = (eventData.status || eventData.data?.status || '').toLowerCase();

    if (!ref) {
      return res.status(400).json({ message: 'Missing external_reference' });
    }

    const transaction = await PaymentTransaction.findOne({ external_reference: ref });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (status === 'completed' || status === 'success' || status === 'paid') {
      transaction.status = 'completed';
    } else if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      transaction.status = 'failed';
    }
    transaction.sebpay_response = eventData;
    await transaction.save();

    res.json({ received: true });
  } catch (err) {
    console.error('sebpayWebhook error:', err);
    res.status(500).json({ message: 'Webhook processing error' });
  }
};

// Vérifier le statut d'une transaction (Polling frontend si besoin)
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.params;
    const transaction = await PaymentTransaction.findOne({ external_reference: reference })
      .populate('plan_id', 'name price_xaf');

    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });

    res.json({
      status: transaction.status,
      amount: transaction.amount,
      plan_name: transaction.plan_id?.name,
      external_reference: transaction.external_reference,
      provider_link: transaction.provider_link
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
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error('getMySubscriptions error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
