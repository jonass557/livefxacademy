const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    default: null
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'XOF'
  },
  phone: {
    type: String,
    default: 'ADMIN-FREE'
  },
  operator: {
    type: String,
    default: 'free_admin' // mtn, moov, orange, wave, free_admin, etc.
  },
  country: {
    type: String,
    default: 'BJ' // BJ, CI, SN, CM, etc.
  },
  external_reference: {
    type: String,
    required: true,
    unique: true
  },
  transaction_id: {
    type: String,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  provider_link: {
    type: String,
    default: ''
  },
  sebpay_response: {
    type: mongoose.Schema.Types.Mixed
  },
  // Commission de parrainage générée lors du paiement
  referrer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referral_commission_amount: {
    type: Number,
    default: 0
  },
  referral_percentage: {
    type: Number,
    default: 0
  },
  is_commission_paid: {
    type: Boolean,
    default: false // Marqué comme payé lorsque l'administrateur règle la somme au parrain
  },
  commission_paid_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
