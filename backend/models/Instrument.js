const mongoose = require('mongoose');

// Instrument négociable en démo. Persiste les paramètres nécessaires au calcul
// correct du P&L et de la marge (pas de formule unique pour tous les marchés).
// `provider_symbol` relie l'instrument au fournisseur de données de marché
// (ex. Deriv 'frxEURUSD'). Le Bid/Ask est dérivé du prix mid via `spread_pips`.
const instrumentSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true, index: true }, // ex 'EURUSD'
  name: { type: String, required: true },                               // ex 'Euro / Dollar US'
  category: {
    type: String,
    enum: ['FOREX', 'CRYPTO', 'METALS', 'INDICES', 'SYNTHETIC', 'OTHER'],
    required: true,
    index: true,
  },
  enabled: { type: Boolean, default: true },
  // Devise de cotation (quote) — sert à convertir le P&L vers la devise du compte (USD).
  quote_currency: { type: String, default: 'USD' },

  // Paramètres de contrat / cotation
  contract_size: { type: Number, default: 100000 }, // taille d'1 lot (FX standard = 100 000)
  tick_size: { type: Number, default: 0.00001 },    // plus petit incrément de prix
  tick_value: { type: Number, default: 1 },          // valeur d'un tick pour 1 lot, en devise du compte
  pip_size: { type: Number, default: 0.0001 },       // taille d'un pip
  digits: { type: Number, default: 5 },              // décimales d'affichage

  // Volumes autorisés
  min_volume: { type: Number, default: 0.01 },
  max_volume: { type: Number, default: 100 },
  volume_step: { type: Number, default: 0.01 },

  // Spread simulé (en pips) : Bid = mid - (spread_pips*pip)/2, Ask = mid + (spread_pips*pip)/2.
  // Deriv ne renvoie qu'un prix unique (mid) → le spread est configuré ici.
  spread_pips: { type: Number, default: 1 },

  // Rattachement au fournisseur de données de marché
  provider: { type: String, default: 'deriv' },
  provider_symbol: { type: String, default: null }, // null = pas de prix live (ex. SYNTHETIC non branché)
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

module.exports = mongoose.model('Instrument', instrumentSchema);
