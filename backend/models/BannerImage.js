const mongoose = require('mongoose');

const bannerImageSchema = new mongoose.Schema({
  image_url: {
    type: String,
    required: true
  },
  cloudinary_public_id: {
    type: String,
    required: true
  },
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('BannerImage', bannerImageSchema);
