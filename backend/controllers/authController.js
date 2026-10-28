const { User, Trainer, SubscriptionPlan, PaymentTransaction, BrandingSettings } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(2),
  role: z.enum(['client', 'trainer', 'admin']).optional(),
  phone: z.string().optional(),
  referral_code: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string(),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  phone: z.string().min(4),
  password: z.string().min(6),
});

// Garde uniquement les chiffres pour comparer deux numéros (gère espaces, +, indicatifs)
const normalizePhone = (s) => (s || '').replace(/\D/g, '');
const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.register = async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const email = parsed.email.trim().toLowerCase();
    const { password, full_name, role, phone, referral_code, payment_reference } = parsed;
    
    const userExists = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') });
    if (userExists) {
      return res.status(400).json({ message: 'Un compte existe déjà avec cette adresse email.' });
    }

    // Vérifier s'il existe des plans actifs sur la plateforme
    const activePlansCount = await SubscriptionPlan.countDocuments({ is_active: true, is_deleted: { $ne: true } });
    let paidTransaction = null;
    let subscribedPlan = null;

    if (role !== 'admin' && activePlansCount > 0) {
      if (!payment_reference) {
        return res.status(400).json({
          message: "Veuillez d'abord sélectionner un plan de souscription et valider le paiement avant de vous inscrire en tant qu'élève ou formateur."
        });
      }

      paidTransaction = await PaymentTransaction.findOne({
        $or: [
          { external_reference: payment_reference.trim() },
          { transaction_id: payment_reference.trim() }
        ],
        status: 'completed',
        user_id: null
      });

      if (!paidTransaction) {
        return res.status(400).json({
          message: "Votre paiement de souscription n'est pas encore confirmé ou a déjà été utilisé. Veuillez valider le paiement du plan choisi avant de vous inscrire."
        });
      }

      if (paidTransaction.plan_id) {
        subscribedPlan = await SubscriptionPlan.findById(paidTransaction.plan_id).catch(() => null);
      }
    }

    // Vérifier si un parrain correspond au code fourni
    let referredByUser = null;
    if (referral_code) {
      referredByUser = await User.findOne({
        referral_code: referral_code.trim().toUpperCase(),
        is_referral_enabled: true
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    let subscriptionPlanName = null;
    let subscriptionExpiresAt = null;
    let isFreeTrialGranted = false;

    if (paidTransaction) {
      const isTrial = paidTransaction.operator === 'free_trial';
      const durationDays = isTrial
        ? (Number(subscribedPlan?.trial_days) || 7)
        : (Number(subscribedPlan?.duration_days) || 30);
      subscriptionPlanName = isTrial
        ? `${subscribedPlan?.name || 'Plan'} (Essai ${durationDays}j)`
        : (subscribedPlan?.name || 'Abonnement Actif');
      subscriptionExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      isFreeTrialGranted = isTrial;
    }

    const newUser = await User.create({
      email,
      password_hash,
      full_name,
      role: role || 'client',
      phone,
      referred_by: referredByUser ? referredByUser._id : (paidTransaction?.referrer_id || null),
      is_subscription_required: false,
      subscription_plan_name: subscriptionPlanName,
      subscription_expires_at: subscriptionExpiresAt,
      is_free_trial_granted: isFreeTrialGranted,
    });

    // Rattacher la transaction de paiement au nouvel utilisateur créé
    if (paidTransaction) {
      paidTransaction.user_id = newUser._id;
      if (referredByUser && !paidTransaction.referrer_id && paidTransaction.amount > 0) {
        const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
        const globalPct = branding?.referral_percentage != null ? branding.referral_percentage : 10;
        const pct = referredByUser.custom_referral_percentage != null ? referredByUser.custom_referral_percentage : globalPct;
        paidTransaction.referrer_id = referredByUser._id;
        paidTransaction.referral_percentage = pct;
        paidTransaction.referral_commission_amount = Math.round((paidTransaction.amount * pct) / 100);
      }
      await paidTransaction.save();
    }

    // If trainer, create trainer profile
    if (role === 'trainer') {
      await Trainer.create({ user_id: newUser._id });
    }

    res.status(201).json({
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      full_name: newUser.full_name,
      referred_by: newUser.referred_by,
      subscription_plan_name: newUser.subscription_plan_name,
      subscription_expires_at: newUser.subscription_expires_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const email = parsed.email.trim();
    const { password } = parsed;
    
    const user =
      (await User.findOne({ email: email.toLowerCase() })) ||
      (await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') }));
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET || 'livefx_default_jwt_secret';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || secret;

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      secret,
      { expiresIn: '30d' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      refreshSecret,
      { expiresIn: '30d' }
    );

    try {
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      });
    } catch (_) {}

    res.json({
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        is_referral_enabled: !!user.is_referral_enabled,
        referral_code: user.referral_code || '',
        custom_referral_percentage: user.custom_referral_percentage,
        subscription_plan_name: user.subscription_plan_name || null,
        subscription_expires_at: user.subscription_expires_at || null,
        is_free_trial_granted: !!user.is_free_trial_granted,
        is_subscription_required: Boolean(user.is_subscription_required),
        has_active_subscription: Boolean(user.subscription_expires_at && new Date(user.subscription_expires_at) > new Date())
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Réinitialisation directe : on vérifie que l'email ET le téléphone correspondent
// au même compte avant d'autoriser le changement de mot de passe.
exports.resetPassword = async (req, res) => {
  try {
    const parsed = resetPasswordSchema.parse(req.body);
    const email = parsed.email.trim();
    const { phone, password } = parsed;

    const user =
      (await User.findOne({ email: email.toLowerCase() })) ||
      (await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') }));
    const phoneInput = normalizePhone(phone);
    if (!user || !phoneInput || normalizePhone(user.phone) !== phoneInput) {
      return res.status(400).json({
        message: "Aucun compte ne correspond à cet email et ce numéro de téléphone"
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(password, salt);
    await user.save();

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Données invalides' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      phone: user.phone,
      is_referral_enabled: !!user.is_referral_enabled,
      referral_code: user.referral_code || '',
      custom_referral_percentage: user.custom_referral_percentage,
      referred_by: user.referred_by,
      subscription_plan_name: user.subscription_plan_name || null,
      subscription_expires_at: user.subscription_expires_at || null,
      is_free_trial_granted: !!user.is_free_trial_granted,
      is_subscription_required: Boolean(user.is_subscription_required),
      has_active_subscription: Boolean(user.subscription_expires_at && new Date(user.subscription_expires_at) > new Date())
    });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

