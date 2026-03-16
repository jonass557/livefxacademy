const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bio: String,
  specialty: String,
  strategy_description: String,
  is_verified: {
    type: Boolean,
    default: false
  },
  years_experience: Number,
  certifications: String,
  linkedin: String,
  twitter: String,
  youtube: String,
  myfxbook: String
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Trainer', trainerSchema);
