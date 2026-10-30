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
    let branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    if (branding && !branding.sebpay_keys_cleared_v1) {
      await BrandingSettings.updateMany(
        {},
        { $set: { sebpay_public_key: '', sebpay_secret_key: '', sebpay_keys_cleared_v1: true } }
      );
      branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    }
    const data = branding || {
      navbar_logo_url: '',
      chart_logo_url: '',
      referral_percentage: 10,
      active_payment_gateway: 'ikeepay',
      sebpay_enabled: false,
      ikeepay_enabled: true,
    };

    const hasKey = !!(data.gemini_api_key || process.env.GEMINI_API_KEY);
    const hasSebpay = !!(data.sebpay_public_key && data.sebpay_secret_key);
    const hasIkeepay = !!(data.ikeepay_public_key || process.env.IKEEPAY_PUBLIC_KEY);
    const isAdmin = req.user && req.user.role === 'admin';

    const activeGateway = data.active_payment_gateway || (data.sebpay_enabled ? 'sebpay' : 'ikeepay');
    const ikeepayEnabled = activeGateway === 'ikeepay';
    const sebpayEnabled = activeGateway === 'sebpay';

    res.json({
      ...data,
      active_payment_gateway: activeGateway,
      ikeepay_enabled: ikeepayEnabled,
      sebpay_enabled: sebpayEnabled,
      has_gemini_key: hasKey,
      gemini_api_key: isAdmin ? (data.gemini_api_key || '') : (hasKey ? '••••••••' : ''),
      has_sebpay_keys: hasSebpay,
      sebpay_public_key: data.sebpay_public_key || '',
      sebpay_secret_key: isAdmin ? (data.sebpay_secret_key || '') : (hasSebpay ? '••••••••' : ''),
      has_ikeepay_keys: hasIkeepay,
      ikeepay_public_key: data.ikeepay_public_key || process.env.IKEEPAY_PUBLIC_KEY || '',
      ikeepay_secret_key: isAdmin ? (data.ikeepay_secret_key || '') : (data.ikeepay_secret_key ? '••••••••' : ''),
      referral_percentage: Number(data.referral_percentage || 10)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const {
      gemini_api_key,
      active_payment_gateway,
      sebpay_enabled,
      ikeepay_enabled,
      sebpay_public_key,
      sebpay_secret_key,
      clear_sebpay_keys,
      ikeepay_public_key,
      ikeepay_secret_key,
      clear_ikeepay_keys,
      referral_percentage
    } = req.body || {};

    const updateData = { updated_by: req.user.id };

    if (gemini_api_key !== undefined && !String(gemini_api_key).includes('••')) {
      updateData.gemini_api_key = String(gemini_api_key || '').trim();
    }

    // Bascule mutuellement exclusive entre SEBPAY et iKeePay
    if (active_payment_gateway === 'ikeepay' || ikeepay_enabled === true || sebpay_enabled === false) {
      updateData.active_payment_gateway = 'ikeepay';
      updateData.ikeepay_enabled = true;
      updateData.sebpay_enabled = false;
    } else if (active_payment_gateway === 'sebpay' || sebpay_enabled === true || ikeepay_enabled === false) {
      updateData.active_payment_gateway = 'sebpay';
      updateData.sebpay_enabled = true;
      updateData.ikeepay_enabled = false;
    }

    if (clear_sebpay_keys) {
      updateData.sebpay_public_key = '';
      updateData.sebpay_secret_key = '';
      updateData.sebpay_keys_cleared_v1 = true;
    } else {
      if (sebpay_public_key !== undefined) {
        updateData.sebpay_public_key = String(sebpay_public_key || '').trim();
        updateData.sebpay_keys_cleared_v1 = true;
      }
      if (sebpay_secret_key !== undefined && !String(sebpay_secret_key).includes('••')) {
        updateData.sebpay_secret_key = String(sebpay_secret_key || '').trim();
        updateData.sebpay_keys_cleared_v1 = true;
      }
    }

    if (clear_ikeepay_keys) {
      updateData.ikeepay_public_key = '';
      updateData.ikeepay_secret_key = '';
    } else {
      if (ikeepay_public_key !== undefined) {
        updateData.ikeepay_public_key = String(ikeepay_public_key || '').trim();
      }
      if (ikeepay_secret_key !== undefined && !String(ikeepay_secret_key).includes('••')) {
        updateData.ikeepay_secret_key = String(ikeepay_secret_key || '').trim();
      }
    }

    if (referral_percentage !== undefined) {
      const parsedPct = Number(referral_percentage);
      if (!isNaN(parsedPct) && parsedPct >= 0 && parsedPct <= 100) {
        updateData.referral_percentage = parsedPct;
      }
    }

    const branding = await BrandingSettings.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      ...branding.toObject(),
      has_gemini_key: !!(branding.gemini_api_key || process.env.GEMINI_API_KEY),
      has_sebpay_keys: !!(branding.sebpay_public_key && branding.sebpay_secret_key),
      has_ikeepay_keys: !!(branding.ikeepay_public_key || process.env.IKEEPAY_PUBLIC_KEY),
    });
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(500).json({ message: err.message || 'Erreur mise à jour paramètres' });
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

    // Synchroniser automatiquement avec logo.png statique
    await exports.syncLogoFiles();

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

// Endpoint public pour servir le logo actuel (Open Graph, WhatsApp, Facebook, Telegram)
exports.getCurrentLogo = async (req, res) => {
  try {
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const relUrl = branding?.navbar_logo_url || branding?.chart_logo_url;
    if (relUrl) {
      const fullPath = path.join(__dirname, '..', relUrl);
      if (fs.existsSync(fullPath)) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.sendFile(fullPath);
      }
    }
    // Chercher le dernier fichier uploadé dans uploads/branding
    const brandingDir = path.join(__dirname, '../uploads/branding');
    if (fs.existsSync(brandingDir)) {
      const files = fs.readdirSync(brandingDir).filter(f => !f.startsWith('.'));
      if (files.length > 0) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.sendFile(path.join(brandingDir, files[files.length - 1]));
      }
    }
    // Fallback logo.png frontend
    const fallbackPath = path.join(__dirname, '../../frontend/public/logo.png');
    if (fs.existsSync(fallbackPath)) {
      return res.sendFile(fallbackPath);
    }
    res.status(404).send('Logo not found');
  } catch (err) {
    console.error('Error serving current logo:', err);
    res.status(500).send('Error');
  }
};

// Fonction de synchronisation du logo vers les emplacements statiques pour WhatsApp/OpenGraph
exports.syncLogoFiles = async () => {
  try {
    const branding = await BrandingSettings.findOne().sort({ updated_at: -1 }).lean();
    const relUrl = branding?.navbar_logo_url || branding?.chart_logo_url;
    let sourcePath = null;
    if (relUrl) {
      const fullPath = path.join(__dirname, '..', relUrl);
      if (fs.existsSync(fullPath)) sourcePath = fullPath;
    }
    if (!sourcePath) {
      const brandingDir = path.join(__dirname, '../uploads/branding');
      if (fs.existsSync(brandingDir)) {
        const files = fs.readdirSync(brandingDir).filter(f => !f.startsWith('.'));
        if (files.length > 0) sourcePath = path.join(brandingDir, files[files.length - 1]);
      }
    }
    if (sourcePath && fs.existsSync(sourcePath)) {
      const staticTargets = [
        path.join(__dirname, '../../frontend/public/logo.png'),
        path.join(__dirname, '../../frontend/dist/logo.png'),
        '/home/katdscho/livefx-trading.com/logo.png',
        '/home/katdscho/public_html/logo.png'
      ];
      for (const target of staticTargets) {
        try {
          if (fs.existsSync(path.dirname(target))) {
            fs.copyFileSync(sourcePath, target);
          }
        } catch (_) {}
      }
      console.log('[branding] Logo synchronisé avec succès vers logo.png depuis', sourcePath);
    }
  } catch (err) {
    console.warn('[branding] syncLogoFiles warning:', err.message);
  }
};
