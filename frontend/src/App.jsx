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

// Layout wrapper that handles different layouts for admin
function AppLayout({ children }) {
  const location = useLocation();
  const { user } = useAuthStore();
  
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAdmin = user?.role === 'admin';
  const isTrainer = user?.role === 'trainer';
  
  // Admin, Trainer and Client dashboard have their own full-width layout with sidebar
  if (isDashboard && (isAdmin || isTrainer || user?.role === 'client')) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        {children}
      </div>
    );
  }
  
  // Regular pages with container — show a Back button except on home/login/register
  const showBack = !['/', '/login', '/register'].includes(location.pathname);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {showBack && <BackButton />}
        {children}
      </main>
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
