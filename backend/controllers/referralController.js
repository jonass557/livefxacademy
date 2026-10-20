const { User, PaymentTransaction, BrandingSettings } = require('../models');
const crypto = require('crypto');

// Génère un code de parrainage unique de 7 caractères (ex: LFX-78AB)
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'LFX-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. Stats parrainage pour l'utilisateur connecté
exports.getMyReferralStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!user.is_referral_enabled) {
      return res.status(200).json({
        enabled: false,
        is_referral_enabled: false,
        message: "Le lien de parrainage n'est pas activé pour votre compte. Veuillez contacter l'administrateur."
      });
    }

    // Si activé mais pas encore de code, en générer un à la volée
    if (!user.referral_code) {
      let code = generateReferralCode();
      while (await User.findOne({ referral_code: code })) {
        code = generateReferralCode();
      }
      user.referral_code = code;
      await user.save();
    }

    // Récupérer le pourcentage effectif (personnalisé ou global)
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const globalPct = branding?.referral_percentage != null ? branding.referral_percentage : 10;
    const effectivePct = user.custom_referral_percentage != null ? user.custom_referral_percentage : globalPct;

    // Utilisateurs parrainés
    const referredUsers = await User.find({ referred_by: userId })
      .select('full_name email phone created_at subscription_expires_at subscription_plan_name is_free_trial_granted')
      .sort({ created_at: -1 })
      .lean();

    const referredUserIds = referredUsers.map(u => u._id);

    // Paiements validés (statut 'completed') effectués par les filleuls
    const completedPayments = await PaymentTransaction.find({
      user_id: { $in: referredUserIds },
      status: 'completed'
    }).populate('plan_id', 'name price_xaf duration_days').sort({ created_at: -1 }).lean();

    // Indexer les paiements par filleul (user_id)
    const paymentsByReferee = {};
    completedPayments.forEach(p => {
      const uid = String(p.user_id);
      if (!paymentsByReferee[uid]) {
        paymentsByReferee[uid] = [];
      }
      paymentsByReferee[uid].push(p);
    });

    const now = new Date();
    let totalEarningsXaf = 0;
    let pendingEarningsXaf = 0;
    let paidEarningsXaf = 0;
    let usersWithPlanCount = 0;

    const formattedReferees = referredUsers.map(u => {
      const uid = String(u._id);
      const userPayments = paymentsByReferee[uid] || [];

      let refereeTotalPaid = 0;
      let refereeCommissionEarned = 0;
      let refereeCommissionPending = 0;
      let refereeCommissionPaid = 0;
      let latestPlanName = u.subscription_plan_name || null;
      let latestPaymentDate = null;

      userPayments.forEach(p => {
        const amt = Number(p.amount || 0);
        let comm = Number(p.referral_commission_amount || 0);
        if (comm === 0 && amt > 0) {
          comm = Math.round((amt * effectivePct) / 100);
        }
        refereeTotalPaid += amt;
        refereeCommissionEarned += comm;
        if (p.is_commission_paid) {
          refereeCommissionPaid += comm;
        } else {
          refereeCommissionPending += comm;
        }
        if (!latestPlanName && p.plan_id?.name) {
          latestPlanName = p.plan_id.name;
        }
        if (!latestPaymentDate && p.created_at) {
          latestPaymentDate = p.created_at;
        }
      });

      totalEarningsXaf += refereeCommissionEarned;
      pendingEarningsXaf += refereeCommissionPending;
      paidEarningsXaf += refereeCommissionPaid;

      const hasActiveSub = Boolean(u.subscription_expires_at && new Date(u.subscription_expires_at) > now);
      const hasPlan = hasActiveSub || userPayments.length > 0;

      if (hasPlan) {
        usersWithPlanCount++;
      }

      return {
        id: u._id,
        _id: u._id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        has_active_plan: hasPlan,
        is_subscription_active: hasActiveSub,
        plan_name: latestPlanName || (hasPlan ? 'Plan Activé' : 'Aucun plan'),
        subscription_expires_at: u.subscription_expires_at || null,
        total_paid_xaf: refereeTotalPaid,
        commission_earned_xaf: refereeCommissionEarned,
        commission_pending_xaf: refereeCommissionPending,
        commission_paid_xaf: refereeCommissionPaid,
        commission_status: refereeCommissionEarned > 0
          ? (refereeCommissionPending === 0 ? 'paid' : 'pending')
          : (hasPlan ? 'free_trial' : 'none'),
        payments_count: userPayments.length,
        transactions: userPayments.map(p => ({
          id: p._id,
          amount: p.amount,
          commission: p.referral_commission_amount || Math.round((Number(p.amount || 0) * effectivePct) / 100),
          percentage: p.referral_percentage || effectivePct,
          plan_name: p.plan_id?.name || p.sebpay_response?.plan_name || 'Abonnement',
          date: p.created_at,
          is_paid: !!p.is_commission_paid
        }))
      };
    });

    res.json({
      enabled: true,
      is_referral_enabled: true,
      referral_code: user.referral_code,
      percentage: effectivePct,
      referral_percentage: effectivePct,
      total_referees: referredUsers.length,
      total_referred_users: referredUsers.length,
      active_subscribed_referees: usersWithPlanCount,
      users_with_active_plan: usersWithPlanCount,
      total_earnings_xaf: totalEarningsXaf,
      pending_earnings_xaf: pendingEarningsXaf,
      paid_earnings_xaf: paidEarningsXaf,
      referees: formattedReferees,
      referred_users: formattedReferees,
      completed_transactions: completedPayments.map(p => ({
        id: p._id,
        amount: p.amount,
        commission: p.referral_commission_amount || Math.round((Number(p.amount || 0) * effectivePct) / 100),
        percentage: p.referral_percentage || effectivePct,
        plan_name: p.plan_id?.name || p.sebpay_response?.plan_name || 'Plan Souscription',
        user_id: p.user_id,
        date: p.created_at,
        is_paid: !!p.is_commission_paid
      }))
    });
  } catch (err) {
    console.error('getMyReferralStats error:', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des données de parrainage' });
  }
};

// 2. Vue Admin : Liste de tous les parrains et leurs gains générés
exports.getAdminReferralOverview = async (req, res) => {
  try {
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const globalPct = branding?.referral_percentage != null ? branding.referral_percentage : 10;

    // Utilisateurs avec parrainage activé
    const referrers = await User.find({ is_referral_enabled: true })
      .select('full_name email phone role referral_code custom_referral_percentage is_referral_enabled created_at')
      .lean();

    const referrersStats = await Promise.all(
      referrers.map(async (ref) => {
        const referredCount = await User.countDocuments({ referred_by: ref._id });
        const referredUsers = await User.find({ referred_by: ref._id }).select('_id subscription_expires_at').lean();
        const referredIds = referredUsers.map(u => u._id);

        const payments = await PaymentTransaction.find({
          user_id: { $in: referredIds },
          status: 'completed'
        }).populate('user_id', 'full_name email').populate('plan_id', 'name').lean();

        const planUserSet = new Set(payments.map(p => String(p.user_id?._id || p.user_id)));
        referredUsers.forEach(u => {
          if (u.subscription_expires_at && new Date(u.subscription_expires_at) > new Date()) {
            planUserSet.add(String(u._id));
          }
        });
        const usersWithPlanCount = planUserSet.size;

        let totalGenerated = 0;
        let pendingToPay = 0;
        let totalPaid = 0;

        payments.forEach(p => {
          const comm = Number(p.referral_commission_amount || 0);
          totalGenerated += comm;
          if (p.is_commission_paid) {
            totalPaid += comm;
          } else {
            pendingToPay += comm;
          }
        });

        const effectivePct = ref.custom_referral_percentage != null ? ref.custom_referral_percentage : globalPct;

        return {
          id: ref._id,
          full_name: ref.full_name,
          email: ref.email,
          phone: ref.phone,
          role: ref.role,
          referral_code: ref.referral_code,
          percentage: effectivePct,
          effective_percentage: effectivePct,
          custom_percentage: ref.custom_referral_percentage,
          is_referral_enabled: ref.is_referral_enabled,
          referees_count: referredCount,
          total_referred: referredCount,
          subscribed_count: usersWithPlanCount,
          users_with_plan: usersWithPlanCount,
          total_generated_xaf: totalGenerated,
          pending_payout_xaf: pendingToPay,
          pending_to_pay_xaf: pendingToPay,
          paid_payout_xaf: totalPaid,
          total_paid_xaf: totalPaid,
          payments_count: payments.length
        };
      })
    );

    res.json({
      global_percentage: globalPct,
      referrers: referrersStats
    });
  } catch (err) {
    console.error('getAdminReferralOverview error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 3. Admin : Activer / Désactiver ou modifier le parrainage pour un utilisateur ou formateur
exports.toggleUserReferral = async (req, res) => {
  try {
    const { userId } = req.params;
    const is_enabled = req.body.is_referral_enabled !== undefined
      ? req.body.is_referral_enabled
      : req.body.is_enabled;
    const custom_percentage = req.body.custom_referral_percentage !== undefined
      ? req.body.custom_referral_percentage
      : req.body.custom_percentage;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    if (is_enabled !== undefined) {
      user.is_referral_enabled = !!is_enabled;
    } else {
      user.is_referral_enabled = !user.is_referral_enabled;
    }

    // Si activé et pas de code, en générer un unique
    if (user.is_referral_enabled && !user.referral_code) {
      let code = generateReferralCode();
      while (await User.findOne({ referral_code: code })) {
        code = generateReferralCode();
      }
      user.referral_code = code;
    }

    if (custom_percentage !== undefined) {
      const p = custom_percentage === null || custom_percentage === '' ? null : Number(custom_percentage);
      user.custom_referral_percentage = !isNaN(p) && p >= 0 && p <= 100 ? p : null;
    }

    await user.save();

    res.json({
      message: user.is_referral_enabled
        ? `Parrainage activé avec succès pour ${user.full_name} (Code : ${user.referral_code})`
        : `Parrainage désactivé pour ${user.full_name}`,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_referral_enabled: user.is_referral_enabled,
        referral_code: user.referral_code,
        custom_referral_percentage: user.custom_referral_percentage
      }
    });
  } catch (err) {
    console.error('toggleUserReferral error:', err);
    res.status(500).json({ message: 'Erreur lors de la modification du parrainage' });
  }
};

// 4. Admin : Marquer les commissions d'un parrain comme PAYÉES
exports.markCommissionsPaid = async (req, res) => {
  try {
    const { referrerId } = req.params;
    const referrer = await User.findById(referrerId);
    if (!referrer) return res.status(404).json({ message: 'Parrain non trouvé' });

    // Tous les filleuls de ce parrain
    const referredUsers = await User.find({ referred_by: referrerId }).select('_id').lean();
    const referredIds = referredUsers.map(u => u._id);

    // Mettre à jour les transactions non encore payées
    const result = await PaymentTransaction.updateMany(
      {
        user_id: { $in: referredIds },
        status: 'completed',
        is_commission_paid: false
      },
      {
        $set: {
          is_commission_paid: true,
          commission_paid_at: new Date()
        }
      }
    );

    res.json({
      message: `Paiement des commissions validé pour ${referrer.full_name}`,
      updated_count: result.modifiedCount
    });
  } catch (err) {
    console.error('markCommissionsPaid error:', err);
    res.status(500).json({ message: 'Erreur lors de la validation du paiement des commissions' });
  }
};

