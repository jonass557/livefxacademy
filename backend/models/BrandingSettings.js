const mongoose = require('mongoose');

const brandingSettingsSchema = new mongoose.Schema({
  navbar_logo_url: { type: String, default: '' },
  navbar_logo_public_id: { type: String, default: '' },
  chart_logo_url: { type: String, default: '' },
  chart_logo_public_id: { type: String, default: '' },
  gemini_api_key: { type: String, default: '' },
  active_payment_gateway: { type: String, enum: ['sebpay', 'ikeepay'], default: 'ikeepay' },
  sebpay_enabled: { type: Boolean, default: false },
  ikeepay_enabled: { type: Boolean, default: true },
  sebpay_public_key: { type: String, default: '' },
  sebpay_secret_key: { type: String, default: '' },
  sebpay_keys_cleared_v1: { type: Boolean, default: false },
  ikeepay_public_key: { type: String, default: '' },
  ikeepay_secret_key: { type: String, default: '' },
  referral_percentage: { type: Number, default: 10 }, // 10% par défaut
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('BrandingSettings', brandingSettingsSchema);
