const mongoose = require('mongoose');

// Commentaire sur une annonce.
// Confidentialité : un fil de discussion appartient à un client (thread_owner_id).
// Seuls l'administrateur et le client propriétaire du fil peuvent le voir.
// - Un client crée un commentaire racine (parent_id = null) -> thread_owner_id = lui-même.
// - L'administrateur répond (parent_id renseigné, author_role = 'admin').
// - Le client peut répondre en retour dans son propre fil.
const announcementCommentSchema = new mongoose.Schema({
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AnnouncementVideo',
    required: true
  },
  // Propriétaire du fil = le client concerné par la conversation.
  thread_owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Auteur de ce message précis (client ou admin).
  author_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  author_role: {
    type: String,
    enum: ['client', 'trainer', 'admin'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  // null = commentaire racine ; sinon = réponse à un autre commentaire.
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AnnouncementComment',
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

announcementCommentSchema.index({ video_id: 1, thread_owner_id: 1, created_at: 1 });

module.exports = mongoose.model('AnnouncementComment', announcementCommentSchema);
