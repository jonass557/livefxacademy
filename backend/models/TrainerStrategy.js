const mongoose = require('mongoose');

const trainerStrategySchema = new mongoose.Schema({
  trainer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  market_type: String,
  timeframe: String,
  risk_reward_ratio: String,
  win_rate: String,
  entry_criteria: String,
  exit_criteria: String,
  risk_management: String,
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('TrainerStrategy', trainerStrategySchema);
