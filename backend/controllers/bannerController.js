const { BannerImage } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure local storage for banners
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/banners');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format non supporté. Utilisez JPG, PNG ou WEBP.'), false);
  }
};

exports.uploadMiddleware = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

exports.uploadBanner = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier uploadé' });

    const uploaded_by = req.user.id;
    const image_url = `/uploads/banners/${req.file.filename}`;
    
    const newBanner = await BannerImage.create({
      image_url,
      cloudinary_public_id: req.file.filename,
      uploaded_by
    });

    res.status(201).json(newBanner);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getBanners = async (req, res) => {
  try {
    const banners = await BannerImage.find().sort({ created_at: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Get banner info
    const banner = await BannerImage.findById(id);
    if (!banner) return res.status(404).json({ message: 'Bannière non trouvée' });

    // 2. Delete from local storage
    const filePath = path.join(__dirname, '../uploads/banners', banner.cloudinary_public_id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 3. Delete from DB
    await BannerImage.findByIdAndDelete(id);

    res.json({ message: 'Bannière supprimée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
