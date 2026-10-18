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

// Empêcher tout crash du processus Node.js en cas d'erreur asynchrone non interceptée
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception (intercepted, server kept alive):', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL] Unhandled Rejection (intercepted, server kept alive):', reason?.message || reason);
});

// Connect to MongoDB
connectDB();

const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const brandingRoutes = require('./routes/brandingRoutes');
const brandingController = require('./controllers/brandingController');
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
const translateRoutes = require('./routes/translateRoutes');
const referralRoutes = require('./routes/referralRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const economicScheduler = require('./utils/economicCalendar/scheduler');
// Trading Demo : hub de cotations temps réel, serveur WS, moteur de surveillance
const liveFeed = require('./utils/marketData/liveFeed');
const marketSocket = require('./realtime/marketSocket');
const demoWatcher = require('./utils/tradingDemo/watcher');
const alertWatcher = require('./utils/alerts/alertWatcher');
const { Instrument } = require('./models');

const app = express();

const PORT = process.env.PORT || 5000;

// Configuration CORS universelle : accepte livefx-trading.com, www.livefx-trading.com,
// tous les sous-domaines, WebViews mobiles (iOS/Android) et réseaux lents (cache preflight 24h).
const corsOptions = {
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma',
  ],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// S'assurer que MongoDB est connecté avant de traiter une requête API si la connexion initiale avait pris du retard
app.use('/api', async (req, res, next) => {
  if (mongoose.connection.readyState === 0) {
    try {
      await connectDB();
    } catch (_) {}
  }
  next();
});

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
app.use('/api/branding', brandingRoutes);
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
app.use('/api/translate', translateRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

app.get('/', (req, res) => {
  res.send('LivefxTrading API Running');
});

const healthHandler = (req, res) => {
  const mongoState = mongoose.connection.readyState;
  res.status(200).json({
    status: mongoState === 1 ? 'ok' : 'connecting',
    database: mongoState === 1 ? 'connected' : 'reconnecting',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Serveur HTTP explicite pour pouvoir attacher le serveur WebSocket (marché temps réel).
const server = http.createServer(app);

// Timeouts généreux pour tolérer les connexions mobiles lentes (2G/3G/4G/Satellite) partout dans le monde
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
server.timeout = 120000;

// Serveur WebSocket des cotations temps réel (/ws/market).
marketSocket.attach(server);

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Synchronise le logo navbar avec logo.png pour le partage sur réseaux sociaux (WhatsApp/Facebook)
  brandingController.syncLogoFiles();

  // Démarre le scheduler des notifications « annonces économiques »
  // (crée les documents EconomicNotification aux paliers T-60/30/15/5/0 min).
  economicScheduler.start();

  // Trading Demo : charge les instruments dans le hub de cotations puis démarre
  // la surveillance serveur (SL/TP + pending orders), même sans client connecté.
  try {
    const instruments = await Instrument.find({ enabled: true });
    liveFeed.init(instruments);
    demoWatcher.start();
    alertWatcher.start();
    console.log(`[trading-demo] ${instruments.length} instruments chargés dans le hub temps réel`);
  } catch (err) {
    console.error('[trading-demo] init différée (instruments non chargés) :', err.message);
  }
});
