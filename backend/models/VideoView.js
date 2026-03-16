const mongoose = require('mongoose');

const videoViewSchema = new mongoose.Schema({
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

videoViewSchema.index({ video_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('VideoView', videoViewSchema);
