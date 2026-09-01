const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');
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
const serviceRoutes = require('./routes/serviceRoutes');
const backtestRoutes = require('./routes/backtestRoutes');
const economicRoutes = require('./routes/economicRoutes');
const demoRoutes = require('./routes/demoRoutes');
const economicScheduler = require('./utils/economicCalendar/scheduler');
// Trading Demo : hub de cotations temps réel, serveur WS, moteur de surveillance
const liveFeed = require('./utils/marketData/liveFeed');
const marketSocket = require('./realtime/marketSocket');
const demoWatcher = require('./utils/tradingDemo/watcher');
const { Instrument } = require('./models');

const app = express();

const PORT = process.env.PORT || 5000;

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
      title: 'LivefxTrading API',
      version: '1.0.0',
    },
    servers: [{ url: process.env.API_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://api.livefx-trading.com' : `http://localhost:${PORT}`) }],
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
app.use('/api/services', serviceRoutes);
app.use('/api/backtests', backtestRoutes);
app.use('/api/economics', economicRoutes);
app.use('/api/demo', demoRoutes);

app.get('/', (req, res) => {
  res.send('LivefxTrading API Running');
});

app.get('/health', (req, res) => {
  const mongoState = mongoose.connection.readyState;
  res.status(mongoState === 1 ? 200 : 503).json({
    status: mongoState === 1 ? 'ok' : 'degraded',
    database: mongoState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Serveur HTTP explicite pour pouvoir attacher le serveur WebSocket (marché temps réel).
const server = http.createServer(app);

// Serveur WebSocket des cotations temps réel (/ws/market).
marketSocket.attach(server);

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Démarre le scheduler des notifications « annonces économiques »
  // (crée les documents EconomicNotification aux paliers T-60/30/15/5/0 min).
  economicScheduler.start();

  // Trading Demo : charge les instruments dans le hub de cotations puis démarre
  // la surveillance serveur (SL/TP + pending orders), même sans client connecté.
  try {
    const instruments = await Instrument.find({ enabled: true });
    liveFeed.init(instruments);
    demoWatcher.start();
    console.log(`[trading-demo] ${instruments.length} instruments chargés dans le hub temps réel`);
  } catch (err) {
    console.error('[trading-demo] init différée (instruments non chargés) :', err.message);
  }
});
