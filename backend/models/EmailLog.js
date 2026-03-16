const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recipients_count: Number,
  subject: String,
  message: String,
  status: {
    type: String,
    enum: ['pending', 'sent', 'partial', 'failed'],
    default: 'pending'
  },
  sent_count: {
    type: Number,
    default: 0
  },
  failed_count: {
    type: Number,
    default: 0
  },
  error_message: String
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('EmailLog', emailLogSchema);
