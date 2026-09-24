const { BrandingSettings } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/branding');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `branding-${suffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/svg+xml'];
  cb(allowedTypes.includes(file.mimetype) ? null : new Error('Format non supporté.'), allowedTypes.includes(file.mimetype));
};

exports.uploadMiddleware = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

exports.getBranding = async (req, res) => {
  try {
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    res.json(branding || { navbar_logo_url: '', chart_logo_url: '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier uploadé' });
    if (!['navbar', 'chart'].includes(req.body.type)) {
      return res.status(400).json({ message: 'Type de logo invalide' });
    }

    const existing = await BrandingSettings.findOne();
    if (existing && existing[`${req.body.type}_logo_public_id`]) {
      const oldPath = path.join(__dirname, '../uploads/branding', existing[`${req.body.type}_logo_public_id`]);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (_) {}
      }
    }

    const branding = await BrandingSettings.findOneAndUpdate(
      {},
      {
        [`${req.body.type}_logo_url`]: `/uploads/branding/${req.file.filename}`,
        [`${req.body.type}_logo_public_id`]: req.file.filename,
        updated_by: req.user.id
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(branding);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteLogo = async (req, res) => {
  try {
    const { type } = req.params;
    if (!['navbar', 'chart'].includes(type)) return res.status(400).json({ message: 'Type de logo invalide' });
    const branding = await BrandingSettings.findOne();
    if (!branding) return res.json({ navbar_logo_url: '', chart_logo_url: '' });

    const publicId = branding[`${type}_logo_public_id`];
    if (publicId) {
      const filePath = path.join(__dirname, '../uploads/branding', publicId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    branding[`${type}_logo_url`] = '';
    branding[`${type}_logo_public_id`] = '';
    branding.updated_by = req.user.id;
    await branding.save();
    res.json(branding);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
