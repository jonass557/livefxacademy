const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price_xaf: {
    type: Number,
    required: true,
    min: 0
  },
  duration_days: {
    type: Number,
    default: 30 // Mensuel par défaut
  },
  features: [{
    type: String
  }],
  trial_days: {
    type: Number,
    default: 0, // Période d'essai gratuit en jours (ex: 7, 14, 30 jours, ou 0 si aucun essai)
    min: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
  is_deleted: {
    type: Boolean,
    default: false // Suppression douce pour préserver les souscriptions actives existantes
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
