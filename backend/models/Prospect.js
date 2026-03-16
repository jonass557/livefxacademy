const mongoose = require('mongoose');

const prospectSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  phone: String,
  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'rejected'],
    default: 'new'
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Prospect', prospectSchema);
