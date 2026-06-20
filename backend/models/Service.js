const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  // Lucide icon name (e.g. "Video", "Users") rendered on the frontend
  icon: {
    type: String,
    default: 'Briefcase'
  },
  // Optional color accent (tailwind text color class or hex)
  color: {
    type: String,
    default: 'text-primary'
  },
  // Longer detailed description shown in the service detail view
  details: {
    type: String,
    default: ''
  },
  // Contact information
  whatsapp: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  telegram: { type: String, default: '' },
  link: { type: String, default: '' },
  order: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Service', serviceSchema);
