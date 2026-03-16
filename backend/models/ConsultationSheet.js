const mongoose = require('mongoose');

const consultationSheetSchema = new mongoose.Schema({
  trainer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  full_name: String,
  email: String,
  phone: String,
  trading_style: String,
  preferred_session: String,
  years_experience: Number,
  win_rate: String,
  markets_traded: String,
  favorite_pairs: String,
  timeframes: String,
  indicators: String,
  capital_managed: String,
  risk_per_trade: String,
  risk_reward_ratio: String,
  monthly_target: String,
  coaching_experience: String,
  teaching_platform: String,
  availability: String,
  hourly_rate: String,
  myfxbook_link: String,
  tradingview_link: String,
  linkedin_link: String,
  youtube_link: String,
  strategies_data: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['draft', 'pending', 'submitted', 'reviewed', 'approved', 'rejected'],
    default: 'pending'
  },
  admin_notes: String,
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewed_at: Date
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('ConsultationSheet', consultationSheetSchema);
