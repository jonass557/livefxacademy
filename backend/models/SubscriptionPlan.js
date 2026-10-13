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
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
