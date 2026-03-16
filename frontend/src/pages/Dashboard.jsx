import React from 'react';
import { useAuthStore } from '../store/authStore';
import ClientDashboard from './dashboards/ClientDashboard';
import TrainerDashboard from './dashboards/TrainerDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return <div>Loading...</div>;

  // Admin has its own sidebar layout
  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  // Trainer has its own sidebar layout
  if (user.role === 'trainer') {
    return <TrainerDashboard />;
  }

  // Client dashboard
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
