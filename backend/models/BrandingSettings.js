const mongoose = require('mongoose');

const brandingSettingsSchema = new mongoose.Schema({
  navbar_logo_url: { type: String, default: '' },
  navbar_logo_public_id: { type: String, default: '' },
  chart_logo_url: { type: String, default: '' },
  chart_logo_public_id: { type: String, default: '' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('BrandingSettings', brandingSettingsSchema);
