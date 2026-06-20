const { User, Trainer } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2),
  role: z.enum(['client', 'trainer', 'admin']).optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(4),
  password: z.string().min(6),
});

// Garde uniquement les chiffres pour comparer deux numéros (gère espaces, +, indicatifs)
const normalizePhone = (s) => (s || '').replace(/\D/g, '');

exports.register = async (req, res) => {
  try {
    const { email, password, full_name, role, phone } = registerSchema.parse(req.body);
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email,
      password_hash,
      full_name,
      role: role || 'client',
      phone
    });

    // If trainer, create trainer profile
    if (role === 'trainer') {
      await Trainer.create({ user_id: newUser._id });
    }

    res.status(201).json({
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      full_name: newUser.full_name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Réinitialisation directe : on vérifie que l'email ET le téléphone correspondent
// au même compte avant d'autoriser le changement de mot de passe.
exports.resetPassword = async (req, res) => {
  try {
    const { email, phone, password } = resetPasswordSchema.parse(req.body);

    const user = await User.findOne({ email });
    const phoneInput = normalizePhone(phone);
    if (!user || !phoneInput || normalizePhone(user.phone) !== phoneInput) {
      return res.status(400).json({
        message: "Aucun compte ne correspond à cet email et ce numéro de téléphone"
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(password, salt);
    await user.save();

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Données invalides' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
