const mongoose = require('mongoose');

// Alerte de prix d'un utilisateur (façon TradingView / MT5).
// Surveillée côté serveur (utils/alerts/alertWatcher) : déclenchement même si
// l'utilisateur a fermé son navigateur, avec notification par email.
const priceAlertSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  symbol: { type: String, required: true, index: true },        // symbole Trading Demo (ex. 'EURUSD')
  target_price: { type: Number, required: true },
  condition: { type: String, enum: ['crossing', 'above', 'below'], default: 'crossing' },
  trigger_frequency: { type: String, enum: ['once', 'every_time'], default: 'once' },
  expires_at: { type: Date, default: null },
  note: { type: String, default: '', maxlength: 200 },
  notify_email: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'triggered'], default: 'active', index: true },
  created_price: { type: Number, default: null },               // prix au moment de la création (référence de croisement)
  triggered_at: { type: Date, default: null },
  triggered_price: { type: Number, default: null },
  email_sent: { type: Boolean, default: false },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

module.exports = mongoose.model('PriceAlert', priceAlertSchema);
