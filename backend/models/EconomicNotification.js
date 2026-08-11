const mongoose = require('mongoose');

// Notification intelligente in-app pour une annonce économique à venir.
// Un scheduler serveur (utils/economicCalendar/scheduler.js) crée ces documents
// à l'approche d'événements Medium/High (T-60/30/15/5 min et à la publication).
// Le frontend les récupère via polling (cloche de notifications).
const economicNotificationSchema = new mongoose.Schema({
  event_id: { type: String, required: true, index: true },
  event_title: { type: String, required: true },
  currency: String,
  impact: String,
  event_date: Date,
  // Palier : 60 | 30 | 15 | 5 (minutes avant) ou 0 (à la publication).
  lead_minutes: { type: Number, required: true },
  message: String,
  // Niveau de risque volatilité déduit de l'importance.
  risk: { type: String, enum: ['faible', 'moyen', 'eleve'], default: 'moyen' },
  // Les notifications sont globales (tous les dashboards) ; on suit la lecture
  // par utilisateur via un tableau d'ids qui ont marqué comme lu.
  read_by: { type: [mongoose.Schema.Types.ObjectId], default: [] },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Empêche les doublons : une seule notif par événement + palier.
economicNotificationSchema.index({ event_id: 1, lead_minutes: 1 }, { unique: true });

module.exports = mongoose.model('EconomicNotification', economicNotificationSchema);
