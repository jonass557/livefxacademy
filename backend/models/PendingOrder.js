const mongoose = require('mongoose');

// Ordre en attente (limit/stop). Surveillé côté serveur : lorsque le prix atteint
// `entry_price`, l'ordre est exécuté et devient une Position (status TRIGGERED).
const pendingOrderSchema = new mongoose.Schema({
  demo_account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DemoAccount',
    required: true,
    index: true,
  },
  instrument_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instrument',
    required: true,
  },
  symbol: { type: String, required: true },
  type: {
    type: String,
    enum: ['BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP'],
    required: true,
  },
  volume: { type: Number, required: true },
  entry_price: { type: Number, required: true },   // niveau de déclenchement
  stop_loss: { type: Number, default: null },
  take_profit: { type: Number, default: null },
  status: {
    type: String,
    enum: ['PENDING', 'TRIGGERED', 'CANCELLED'],
    default: 'PENDING',
    index: true,
  },
  triggered_position_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Position',
    default: null,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

pendingOrderSchema.index({ demo_account_id: 1, status: 1 });

module.exports = mongoose.model('PendingOrder', pendingOrderSchema);
