const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

const ADMIN = {
  email: 'admin@livefx.com',
  password: 'LiveFx2026!',
  full_name: 'Administrateur LiveFx',
  role: 'admin',
  phone: '+237600000000',
};

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/livefx_db');
    console.log('Connected to MongoDB:', mongoose.connection.host);

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(ADMIN.password, salt);

    const admin = await User.findOneAndUpdate(
      { email: ADMIN.email },
      {
        email: ADMIN.email,
        password_hash,
        full_name: ADMIN.full_name,
        role: ADMIN.role,
        phone: ADMIN.phone,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('Admin pret (cree ou mis a jour).');
    console.log('Email   :', admin.email);
    console.log('Password:', ADMIN.password);
    console.log('Role    :', admin.role);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
