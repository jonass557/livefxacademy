const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  trainer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    default: 'pending'
  },
  scheduled_at: Date,
  trading_level: String,
  goals: String
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Consultation', consultationSchema);
