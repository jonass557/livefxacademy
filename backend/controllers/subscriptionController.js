const { SubscriptionPlan, PaymentTransaction, User, BrandingSettings } = require('../models');

const SEBPAY_API_URL = 'https://newapi.sebpay.bj/api/v1';

// ----------------- PLANS DE SOUSCRIPTION -----------------

// Liste des plans actifs pour les utilisateurs
exports.getActivePlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ is_active: true, is_deleted: { $ne: true } }).sort({ price_xaf: 1 });
    res.json(plans);
  } catch (err) {
    console.error('getActivePlans error:', err);
    res.status(500).json({ message: 'Erreur lors du chargement des plans' });
  }
};

// Admin : Liste de tous les plans
exports.getAdminPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ is_deleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json(plans);
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
    const { plan_id } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    if (user.is_free_trial_granted) {
      return res.status(400).json({ message: 'Vous avez déjà bénéficié d\'une période d\'essai gratuit.' });
    }

    const plan = await SubscriptionPlan.findById(plan_id);
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
        const durationMs = (Number(plan.duration_days) || 30) * 24 * 60 * 60 * 1000;
        const baseDate = (user.subscription_expires_at && new Date(user.subscription_expires_at) > new Date())
          ? new Date(user.subscription_expires_at)
          : new Date();
        user.subscription_expires_at = new Date(baseDate.getTime() + durationMs);
        user.subscription_plan_name = plan.name;
        await user.save();
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

    const transaction = await PaymentTransaction.findOne({ external_reference: ref }).populate('plan_id');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (status === 'completed' || status === 'success' || status === 'paid') {
      const wasCompleted = transaction.status === 'completed';
      transaction.status = 'completed';
      if (!wasCompleted && transaction.user_id) {
        const user = await User.findById(transaction.user_id);
        if (user) {
          const durationDays = Number(transaction.plan_id?.duration_days) || 30;
          const baseDate = (user.subscription_expires_at && new Date(user.subscription_expires_at) > new Date())
            ? new Date(user.subscription_expires_at)
            : new Date();
          user.subscription_expires_at = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
          user.subscription_plan_name = transaction.plan_id?.name || 'Plan Souscription';
          await user.save();
        }
      }
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
      plan_name: transaction.plan_id?.name || transaction.sebpay_response?.plan_name || 'Abonnement',
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
      .sort({ createdAt: -1 })
      .lean();

    const enriched = list.map((tx) => ({
      ...tx,
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
    const days = Number(req.body?.days) > 0 ? Number(req.body.days) : 30;
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

    // Notification email à l'utilisateur (non-bloquant)
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

