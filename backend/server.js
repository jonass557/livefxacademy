const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./db');

dotenv.config();

// Connect to MongoDB
connectDB();

const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const prospectRoutes = require('./routes/prospectRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const vacationRoutes = require('./routes/vacationRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const consultationSheetRoutes = require('./routes/consultationSheetRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const studentConsultationRoutes = require('./routes/studentConsultationRoutes');
const emailRoutes = require('./routes/emailRoutes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));
app.use(express.json());

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LiveFx Academy API',
      version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:5000' }],
  },
  apis: ['./routes/*.js'],
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/prospects', prospectRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/vacation-programs', vacationRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/consultation-sheets', consultationSheetRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/student-consultations', studentConsultationRoutes);
app.use('/api/emails', emailRoutes);

app.get('/', (req, res) => {
  res.send('LiveFx Academy API Running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
