const mongoose = require('mongoose');

const announcementVideoSchema = new mongoose.Schema({
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  cloudinary_public_id: String,
  cloudinary_url: String,
  priority: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
  view_count: {
    type: Number,
    default: 0
  },
  share_count: {
    type: Number,
    default: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('AnnouncementVideo', announcementVideoSchema);