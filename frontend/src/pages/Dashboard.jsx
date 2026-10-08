import React from 'react';
import { useAuthStore } from '../store/authStore';
import ClientDashboard from './dashboards/ClientDashboard';
import TrainerDashboard from './dashboards/TrainerDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section');
  const isChartSection = section === 'trading-demo' || section === 'backtesting';

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return <div>Loading...</div>;

  // Si une section graphique ou de backtest est demandée, afficher l'interface graphique dédiée
  if (isChartSection) {
    return <ClientDashboard />;
  }

  // Admin has its own sidebar layout
  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  // Trainer has its own sidebar layout
  if (user.role === 'trainer') {
    return <TrainerDashboard />;
  }

  // Client dashboard
  if (user.role === 'client') {
    if (!section) {
      return <Navigate to="/" replace />;
    }
    return <ClientDashboard />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <span className="px-3 py-1 bg-secondary rounded-full text-sm font-medium uppercase">
          {user.role}
        </span>
      </div>
      
      {user.role === 'client' && <ClientDashboard />}
    </div>
  );
};

export default Dashboard;
