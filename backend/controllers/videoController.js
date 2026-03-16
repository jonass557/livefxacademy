const { Video, User } = require('../models');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'livefx_videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi'],
  },
});

exports.uploadMiddleware = multer({ storage: storage });

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { title, description } = req.body;
    const trainer_id = req.user.id;

    const newVideo = await Video.create({
      trainer_id,
      title,
      description,
      cloudinary_public_id: req.file.filename,
      cloudinary_url: req.file.path
    });

    res.status(201).json(newVideo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getVideos = async (req, res) => {
  try {
    const videos = await Video.find()
      .populate('trainer_id', 'full_name')
      .sort({ created_at: -1 });
    
    const formattedVideos = videos.map(v => ({
      ...v.toObject(),
      trainer_name: v.trainer_id?.full_name
    }));
    
    res.json(formattedVideos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
