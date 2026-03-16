const mongoose = require('mongoose');

const studentConsultationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  full_name: String,
  email: String,
  phone: String,
  age: Number,
  country: String,
  city: String,
  trading_experience: String,
  experience_duration: String,
  current_broker: String,
  has_demo_account: Boolean,
  has_real_account: Boolean,
  trading_goals: String,
  monthly_goal: String,
  investment_budget: String,
  time_available: String,
  preferred_style: String,
  academy_level: String,
  modules_completed: String,
  current_module: String,
  difficulties: String,
  needs_help_with: String,
  satisfaction_rating: Number,
  feedback: String,
  questions: String,
  status: {
    type: String,
    enum: ['draft', 'pending', 'reviewed', 'contacted'],
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

module.exports = mongoose.model('StudentConsultation', studentConsultationSchema);
