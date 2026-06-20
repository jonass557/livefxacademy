const mongoose = require('mongoose');

const vacationRegistrationSchema = new mongoose.Schema({
  program_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VacationProgram',
    required: false
  },
  program_title: String,
  student_name: String,
  student_age: Number,
  parent_name: String,
  parent_email: String,
  parent_phone: String,
  session: String,
  amount: Number,
  payment_proof_url: String,
  payment_proof_public_id: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('VacationRegistration', vacationRegistrationSchema);
