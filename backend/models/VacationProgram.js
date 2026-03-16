const mongoose = require('mongoose');

const vacationProgramSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  start_date: Date,
  end_date: Date,
  price: Number,
  location: String,
  max_participants: Number,
  age_range: String,
  image_url: String,
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

module.exports = mongoose.model('VacationProgram', vacationProgramSchema);
