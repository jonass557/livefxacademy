const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password_hash: {
    type: String,
    required: true
  },
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['client', 'trainer', 'admin'],
    default: 'client'
  },
  phone: {
    type: String,
    trim: true
  },
  // Système de Parrainage
  referral_code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  is_referral_enabled: {
    type: Boolean,
    default: false // Seul l'administrateur active le parrainage pour un utilisateur
  },
  custom_referral_percentage: {
    type: Number,
    default: null // Si null, utilise le pourcentage global configuré par l'admin (10%)
  },
  referred_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Abonnement actif (payant ou 1 mois gratuit offert par l'administrateur)
  subscription_plan_name: {
    type: String,
    default: null
  },
  subscription_expires_at: {
    type: Date,
    default: null
  },
  is_free_trial_granted: {
    type: Boolean,
    default: false
  },
  // Obligation de souscription (uniquement pour les NOUVEAUX utilisateurs inscrits)
  // Les anciens utilisateurs conservent false (Grandfathering garanti) et ont un accès libre direct.
  is_subscription_required: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('User', userSchema);

