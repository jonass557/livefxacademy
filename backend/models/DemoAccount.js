const mongoose = require('mongoose');

// Compte de trading DÉMO d'un utilisateur (transactions 100 % virtuelles, isolées
// du reste de l'app). Un seul compte par utilisateur (index unique sur user_id).
// Valeurs par défaut : 10 000 USD, levier 1:100.
const demoAccountSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,   // 1 compte démo ↔ 1 utilisateur
    index: true,
  },
  account_number: { type: String, required: true, unique: true },
  balance: { type: Number, default: 10000 },        // solde réalisé
  equity: { type: Number, default: 10000 },          // balance + P&L flottant
  used_margin: { type: Number, default: 0 },
  free_margin: { type: Number, default: 10000 },
  leverage: { type: Number, default: 100 },          // 1:100
  currency: { type: String, default: 'USD' },
  initial_balance: { type: Number, default: 10000 },
  status: {
    type: String,
    enum: ['active', 'suspended', 'closed'],
    default: 'active',
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

module.exports = mongoose.model('DemoAccount', demoAccountSchema);
