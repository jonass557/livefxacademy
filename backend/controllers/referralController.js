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
      return res.status(403).json({
        enabled: false,
        message: "Le lien de parrainage n'est pas activé pour votre compte. Veuillez contacter l'administrateur."
      });
    }

    // Récupérer le pourcentage effectif (personnalisé ou global)
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const globalPct = branding?.referral_percentage != null ? branding.referral_percentage : 10;
    const effectivePct = user.custom_referral_percentage != null ? user.custom_referral_percentage : globalPct;

    // Utilisateurs parrainés
    const referredUsers = await User.find({ referred_by: userId })
      .select('full_name email created_at')
      .lean();

    const referredUserIds = referredUsers.map(u => u._id);

    // Paiements validés (statut 'completed') effectués par les filleuls
    const completedPayments = await PaymentTransaction.find({
      user_id: { $in: referredUserIds },
      status: 'completed'
    }).populate('plan_id', 'name price_xaf').lean();

    // Nombre d'utilisateurs uniques ayant activé au moins un plan
    const usersWithPlanSet = new Set(completedPayments.map(p => String(p.user_id)));
    const usersWithPlanCount = usersWithPlanSet.size;

    // Total des commissions générées (somme de referral_commission_amount)
    let totalEarningsXaf = 0;
    let pendingEarningsXaf = 0;
    let paidEarningsXaf = 0;

    completedPayments.forEach(p => {
      const comm = Number(p.referral_commission_amount || 0);
      totalEarningsXaf += comm;
      if (p.is_commission_paid) {
        paidEarningsXaf += comm;
      } else {
        pendingEarningsXaf += comm;
      }
    });

    res.json({
      enabled: true,
      referral_code: user.referral_code,
      referral_percentage: effectivePct,
      total_referred_users: referredUsers.length,
      users_with_active_plan: usersWithPlanCount,
      total_earnings_xaf: totalEarningsXaf,
      pending_earnings_xaf: pendingEarningsXaf,
      paid_earnings_xaf: paidEarningsXaf,
      referred_users: referredUsers,
      completed_transactions: completedPayments.map(p => ({
        id: p._id,
        amount: p.amount,
        commission: p.referral_commission_amount,
        percentage: p.referral_percentage,
        plan_name: p.plan_id?.name || 'Plan Souscription',
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
      .select('full_name email phone referral_code custom_referral_percentage is_referral_enabled created_at')
      .lean();

    const referrersStats = await Promise.all(
      referrers.map(async (ref) => {
        const referredCount = await User.countDocuments({ referred_by: ref._id });
        const referredUsers = await User.find({ referred_by: ref._id }).select('_id').lean();
        const referredIds = referredUsers.map(u => u._id);

        const payments = await PaymentTransaction.find({
          user_id: { $in: referredIds },
          status: 'completed'
        }).populate('user_id', 'full_name email').populate('plan_id', 'name').lean();

        const usersWithPlanCount = new Set(payments.map(p => String(p.user_id?._id || p.user_id))).size;

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
          referral_code: ref.referral_code,
          effective_percentage: effectivePct,
          custom_percentage: ref.custom_referral_percentage,
          is_referral_enabled: ref.is_referral_enabled,
          total_referred: referredCount,
          users_with_plan: usersWithPlanCount,
          total_generated_xaf: totalGenerated,
          pending_to_pay_xaf: pendingToPay,
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

// 3. Admin : Activer / Désactiver ou modifier le parrainage pour un utilisateur
exports.toggleUserReferral = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_enabled, custom_percentage } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    user.is_referral_enabled = !!is_enabled;

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
        ? `Parrainage activé avec succès pour ${user.full_name}`
        : `Parrainage désactivé pour ${user.full_name}`,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
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
