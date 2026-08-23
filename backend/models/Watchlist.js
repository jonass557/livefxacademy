const mongoose = require('mongoose');

// Liste d'instruments favoris d'un utilisateur (une par utilisateur).
// Stocke des symboles (ex. 'EURUSD') référant aux Instrument.symbol.
const watchlistSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  symbols: { type: [String], default: [] },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

module.exports = mongoose.model('Watchlist', watchlistSchema);
