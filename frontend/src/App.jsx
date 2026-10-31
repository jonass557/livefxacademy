import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TradingInfo from './pages/TradingInfo';
import VacationProgram from './pages/VacationProgram';
import ClientConsultation from './pages/ClientConsultation';
import TrainerConsultation from './pages/TrainerConsultation';
import TrainerRegistration from './pages/TrainerRegistration';
import Navbar from './components/Navbar';
import BackButton from './components/BackButton';
import { Toaster } from './components/ui/toaster';
import { useAuthStore } from './store/authStore';
import { useLanguageStore } from './store/languageStore';
import { MessageCircle, ExternalLink } from 'lucide-react';
import api from './lib/api';

function WhatsAppFooterSection({ whatsappUrl }) {
  const { language } = useLanguageStore();
  const isEn = language === 'en';
  if (!whatsappUrl) return null;

  const normalizedHref = whatsappUrl.startsWith('http')
    ? whatsappUrl
    : `https://wa.me/${whatsappUrl.replace(/[^\d]/g, '')}`;

  return (
    <>
      {/* Bandeau bouton WhatsApp en bas de page et en bas des dashboards */}
      <div className="w-full border-t border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-card to-emerald-500/10 py-4 px-4 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">
                {isEn ? 'Need help or support on WhatsApp?' : "Besoin d'aide ou d'accompagnement sur WhatsApp ?"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn ? 'Click the button to chat directly with the LiveFX Academy team.' : "Cliquez sur le bouton pour discuter directement avec l'équipe LiveFX Academy."}
              </p>
            </div>
          </div>
          <a
            href={normalizedHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-lg hover:scale-105 transition-all shrink-0"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{isEn ? 'Contact us on WhatsApp' : 'Nous contacter sur WhatsApp'}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Bouton WhatsApp flottant en bas à droite */}
      <a
        href={normalizedHref}
        target="_blank"
        rel="noopener noreferrer"
        title={isEn ? 'Chat on WhatsApp' : 'Discuter sur WhatsApp'}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-2xl border border-white/20 hover:scale-105 active:scale-95 transition-all"
      >
        <MessageCircle className="h-5 w-5 fill-current" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </>
  );
}

// Layout wrapper that handles different layouts for admin
function AppLayout({ children }) {
  const location = useLocation();
  const { user } = useAuthStore();
  const [whatsappUrl, setWhatsappUrl] = useState('https://wa.me/237699000000');

  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const loadBranding = () => {
      api.get('/branding')
        .then((res) => {
          if (res.data?.whatsapp_url !== undefined) {
            setWhatsappUrl(res.data.whatsapp_url || '');
          }
        })
        .catch(() => {});
    };
    loadBranding();
    window.addEventListener('branding-updated', loadBranding);
    return () => window.removeEventListener('branding-updated', loadBranding);
  }, [location.pathname]);
  // Synchronisation en direct du profil utilisateur (is_referral_enabled, abonnements, etc.) dès l'ouverture ou rafraîchissement
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          if (res.data) {
            useAuthStore.getState().updateUser(res.data);
          }
        })
        .catch(() => {});
    }
  }, []);


  // Sections graphiques : pas de navbar pour maximiser l'espace.
  const searchParams = new URLSearchParams(location.search);
  const section = searchParams.get('section');
  const isChartSection = section === 'trading-demo' || section === 'backtesting';

  // Toujours débloquer le scroll et remonter en haut de page lors d'un changement de route/section (indispensable sur iOS Safari)
  useEffect(() => {
    if (!isChartSection) {
      document.body.style.overflow = '';
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.search, isChartSection]);

  // Admin dashboard layout: Navbar fixe + contenu avec défilement autonome indestructible
  if (isDashboard && isAdmin && !section) {
    return (
      <div className="h-screen w-full overflow-hidden flex flex-col p-0 m-0 bg-background text-foreground">
        <Navbar />
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  // Trainer and Client dashboard have their own full-width layout
  if (isDashboard) {
    return (
      <div className={isChartSection ? "h-screen w-screen max-w-full overflow-hidden flex flex-col p-0 m-0 bg-background text-foreground" : "min-h-screen flex flex-col bg-background text-foreground"}>
        {!isChartSection && <Navbar />}
        <div className="flex-1">
          {children}
        </div>
        {!isChartSection && <WhatsAppFooterSection whatsappUrl={whatsappUrl} />}
      </div>
    );
  }
  
  // Regular pages with container — show a Back button except on home/login/register
  const showBack = !['/', '/login', '/register'].includes(location.pathname);
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        {showBack && <BackButton />}
        {children}
      </main>
      <WhatsAppFooterSection whatsappUrl={whatsappUrl} />
    </div>
  );
}


// Protected Route wrapper - redirects to landing if not logged in
function ProtectedRoute({ children }) {
  const { user } = useAuthStore();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Home route - shows LandingPage for visitors, Home for logged-in users
function HomeRoute() {
  const { user } = useAuthStore();
  return user ? <Home /> : <LandingPage />;
}

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes - only for logged-in users */}
          <Route path="/trading-info" element={<ProtectedRoute><TradingInfo /></ProtectedRoute>} />
          <Route path="/vacation-program" element={<ProtectedRoute><VacationProgram /></ProtectedRoute>} />
          <Route path="/consultation" element={<ProtectedRoute><ClientConsultation /></ProtectedRoute>} />
          <Route path="/trainer-consultation" element={<ProtectedRoute><TrainerConsultation /></ProtectedRoute>} />
          <Route path="/trainer-register" element={<ProtectedRoute><TrainerRegistration /></ProtectedRoute>} />
          <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </AppLayout>
      <Toaster />
    </Router>
  );
}

export default App;
