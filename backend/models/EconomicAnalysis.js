const mongoose = require('mongoose');

// Cache des analyses IA d'un événement économique. On ne paie l'appel Claude
// qu'une seule fois par (event_id, type d'analyse) : le résultat structuré est
// stocké en Mixed car sa forme dépend du schéma de sortie (voir utils/economicCalendar/ai.js).
const economicAnalysisSchema = new mongoose.Schema({
  event_id: { type: String, required: true, index: true }, // id déterministe du calendrier
  event_title: String,
  currency: String,
  // Type d'analyse : 'fundamental' | 'pre' | 'post' | 'central_bank'
  type: { type: String, required: true },
  // Pour 'post' : la valeur publiée utilisée (invalide le cache si elle change).
  actual: { type: String, default: null },
  result: mongoose.Schema.Types.Mixed, // objet structuré renvoyé par l'IA
  model: String, // modèle Claude utilisé
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Une analyse par événement + type (+ valeur actual pour le post-release).
economicAnalysisSchema.index({ event_id: 1, type: 1, actual: 1 }, { unique: true });

module.exports = mongoose.model('EconomicAnalysis', economicAnalysisSchema);
