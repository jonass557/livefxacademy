import React from 'react';
import { useAuthStore } from '../store/authStore';
import ClientDashboard from './dashboards/ClientDashboard';
import TrainerDashboard from './dashboards/TrainerDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SHARED_CLIENT_SECTIONS = new Set([
  'trading-demo',
  'backtesting',
  'backtest-history',
  'economics',
  'services',
  'trading',
  'academy',
  'broker',
  'contact',
  'consultation',
  'vacation',
  'announcements',
  'referral',
  'subscription',
]);

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section');

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return <div>Loading...</div>;

  // Si une section fonctionnelle (Graphique, Backtesting, Services, Lien Brokers, Contact, etc.) est demandée,
  // afficher directement ClientDashboard qui gère l'ensemble de ces sections sur tous les appareils (dont iOS iPhone).
  if (section && SHARED_CLIENT_SECTIONS.has(section)) {
    return <ClientDashboard />;
  }

  // Admin has its own sidebar layout
  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  // Trainer has its own sidebar layout for trainer-specific sections (dashboard, profile, registration, strategies)
  if (user.role === 'trainer') {
    return <TrainerDashboard />;
  }

  // Par défaut (client, élève, etc.)
  return <ClientDashboard />;
};

export default Dashboard;

