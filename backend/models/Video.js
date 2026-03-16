const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  trainer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  cloudinary_public_id: {
    type: String,
    required: true
  },
  cloudinary_url: {
    type: String,
    required: true
  },
  duration_seconds: Number,
  thumbnail_url: String
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Video', videoSchema);
