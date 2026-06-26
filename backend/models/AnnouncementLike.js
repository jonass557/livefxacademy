const mongoose = require('mongoose');

// Un "like" d'un utilisateur sur une annonce (vidéo).
// L'index unique empêche un même utilisateur de liker deux fois la même annonce.
const announcementLikeSchema = new mongoose.Schema({
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AnnouncementVideo',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

announcementLikeSchema.index({ video_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('AnnouncementLike', announcementLikeSchema);
