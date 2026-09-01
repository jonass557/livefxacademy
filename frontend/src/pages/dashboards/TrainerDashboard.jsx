import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import api from '../../lib/api';
import Backtesting from '../Backtesting';
import BacktestHistory from '../../components/backtest/BacktestHistory';
import EconomicCalendar from '../EconomicCalendar';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  TrendingUp,
  User,
  Mail,
  Phone,
  Award,
  Briefcase,
  ExternalLink,
  Lightbulb,
  Target,
  ShieldCheck,
  BarChart3,
  Send,
  FileText,
  ArrowLeft,
  History,
  Calendar
} from 'lucide-react';

const TrainerDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuthStore();

  // Increment refresh key when section changes to force data reload
  const handleSectionChange = (section) => {
    setActiveSection(section);
    setRefreshKey(prev => prev + 1);
  };

  // Feature buttons shown on the main page (replaces the sidebar)
  const navItems = [
    { id: 'profile', icon: User, label: 'Mon Profil' },
    { id: 'registration', icon: FileText, label: "Ma Fiche d'Inscription" },
    { id: 'strategies', icon: Lightbulb, label: 'Mes Stratégies' },
    { id: 'economics', icon: Calendar, label: 'Annonces éco' },
    { id: 'backtesting', icon: BarChart3, label: 'Backtesting' },
    { id: 'backtest-history', icon: History, label: 'Historique de backtest' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <main className="w-full">
        {/* Backtesting : pleine largeur pour maximiser l'espace du graphique */}
        <div className={`p-4 md:p-6 mx-auto ${activeSection === 'backtesting' ? 'max-w-none' : 'max-w-7xl'}`}>
          {activeSection === 'dashboard' ? (
            <div className="space-y-8">
              {/* Header */}
              <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-purple-500/10 p-6 md:p-8">
                <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />
                <div className="relative">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary">
                    Espace Formateur
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground mt-1">Bienvenue, <span className="font-semibold text-foreground">{user?.full_name}</span></p>
                </div>
              </div>

              {/* Feature button grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {navItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSectionChange(item.id)}
                      className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border bg-card overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 transition-all duration-300 text-center"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-purple-500/0 group-hover:from-primary/10 group-hover:to-purple-500/10 transition-all duration-300" />
                      <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/15 to-purple-500/10 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <span className="relative font-medium text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <DashboardOverview key={`dashboard-${refreshKey}`} user={user} onNavigate={handleSectionChange} />
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" className="gap-2" onClick={() => handleSectionChange('dashboard')}>
                <ArrowLeft className="h-4 w-4" /> Retour
              </Button>
              {activeSection === 'profile' && <ProfileSection key={`profile-${refreshKey}`} />}
              {activeSection === 'registration' && <RegistrationDetails key={`registration-${refreshKey}`} />}
              {activeSection === 'strategies' && <StrategiesSection key={`strategies-${refreshKey}`} />}
              {activeSection === 'economics' && <EconomicCalendar key={`economics-${refreshKey}`} />}
              {activeSection === 'backtesting' && <Backtesting key={`backtesting-${refreshKey}`} />}
              {activeSection === 'backtest-history' && <BacktestHistory key={`backtest-history-${refreshKey}`} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// ==================== DASHBOARD OVERVIEW ====================
const DashboardOverview = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({ strategies: 0, videos: 0, isVerified: false });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [strategiesRes, profileRes] = await Promise.all([
          api.get('/trainers/strategies'),
          api.get('/trainers/profile')
        ]);
        setStats({
          strategies: strategiesRes.data.length,
          videos: 0,
          isVerified: profileRes.data.trainer_profile?.is_verified || false
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bienvenue, {user?.full_name} !</h1>
        <p className="text-muted-foreground">Gérez votre profil et vos stratégies de trading</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stratégies</p>
                <p className="text-3xl font-bold">{stats.strategies}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Lightbulb className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vidéos publiées</p>
                <p className="text-3xl font-bold">{stats.videos}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  {stats.isVerified ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Vérifié
                    </>
                  ) : (
                    <>
                      <Clock className="h-5 w-5 text-yellow-500" />
                      En attente
                    </>
                  )}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${stats.isVerified ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                <ShieldCheck className={`h-6 w-6 ${stats.isVerified ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="h-20 w-full flex flex-col gap-2" onClick={() => onNavigate('strategies')}>
            <Plus className="h-5 w-5" />
            <span>Ajouter une stratégie</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== PROFILE SECTION ====================
const ProfileSection = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/trainers/profile');
      setProfile(res.data);
      reset(res.data.trainer_profile || {});
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      await api.put('/trainers/profile', data);
      toast.success('Profil mis à jour avec succès !');
      setEditing(false);
      fetchProfile();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du profil');
    }
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations professionnelles</p>
        </div>
        <Button onClick={() => setEditing(!editing)}>
          {editing ? 'Annuler' : 'Modifier'}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {editing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Spécialité</label>
                  <Input {...register('specialty')} placeholder="Ex: Forex, Crypto..." />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Années d'expérience</label>
                  <Input {...register('years_experience')} type="number" min="0" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Bio</label>
                <textarea 
                  {...register('bio')} 
                  className="w-full border rounded-md p-2 bg-background min-h-[120px]"
                  placeholder="Votre présentation..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Certifications</label>
                <Input {...register('certifications')} placeholder="Ex: CMT, CFTe..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">LinkedIn</label>
                  <Input {...register('linkedin')} placeholder="URL LinkedIn" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Twitter</label>
                  <Input {...register('twitter')} placeholder="URL Twitter" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">YouTube</label>
                  <Input {...register('youtube')} placeholder="URL YouTube" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">MyFxBook</label>
                  <Input {...register('myfxbook')} placeholder="URL MyFxBook" />
                </div>
              </div>
              <Button type="submit" className="w-full">Enregistrer</Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
                  <p className="text-muted-foreground">{profile?.trainer_profile?.specialty || 'Spécialité non définie'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span>{profile?.email}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span>{profile?.phone || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <span>{profile?.trainer_profile?.years_experience || 0} ans d'expérience</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  <span>{profile?.trainer_profile?.certifications || 'Aucune certification'}</span>
                </div>
              </div>

              {profile?.trainer_profile?.bio && (
                <div>
                  <h3 className="font-semibold mb-2">Bio</h3>
                  <p className="text-muted-foreground">{profile.trainer_profile.bio}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {profile?.trainer_profile?.linkedin && (
                  <a href={profile.trainer_profile.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full text-sm">
                    <ExternalLink className="h-4 w-4" /> LinkedIn
                  </a>
                )}
                {profile?.trainer_profile?.twitter && (
                  <a href={profile.trainer_profile.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-full text-sm">
                    <ExternalLink className="h-4 w-4" /> Twitter
                  </a>
                )}
                {profile?.trainer_profile?.youtube && (
                  <a href={profile.trainer_profile.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full text-sm">
                    <ExternalLink className="h-4 w-4" /> YouTube
                  </a>
                )}
                {profile?.trainer_profile?.myfxbook && (
                  <a href={profile.trainer_profile.myfxbook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full text-sm">
                    <ExternalLink className="h-4 w-4" /> MyFxBook
                  </a>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== REGISTRATION DETAILS (FICHE D'INSCRIPTION) ====================
const RegistrationDetails = () => {
  const [existingSheet, setExistingSheet] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm();
  const { register: registerStrategy, handleSubmit: handleSubmitStrategy, reset: resetStrategy } = useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Charger les stratégies en premier (plus fiable)
      const strategiesRes = await api.get('/trainers/strategies');
      setStrategies(strategiesRes.data || []);
    } catch (err) {
      console.error('Erreur chargement stratégies:', err);
      setStrategies([]);
    }
    
    try {
      // Charger la fiche existante
      const sheetRes = await api.get('/consultation-sheets/my-sheet');
      if (sheetRes.data.sheet) {
        setExistingSheet(sheetRes.data);
        const sheet = sheetRes.data.sheet;
        Object.keys(sheet).forEach(key => {
          setValue(key, sheet[key]);
        });
      }
    } catch (err) {
      console.error('Erreur chargement fiche:', err);
    }
    
    setLoading(false);
  };

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      // Include strategies in the submission
      const submissionData = {
        ...data,
        strategies: strategies.map(s => ({ id: s.id, name: s.name, description: s.description, market_type: s.market_type, timeframe: s.timeframe, win_rate: s.win_rate, risk_reward_ratio: s.risk_reward_ratio }))
      };
      await api.post('/consultation-sheets', submissionData);
      toast.success('Fiche d\'inscription envoyée avec succès à l\'administrateur !');
      fetchData();
    } catch (err) {
      toast.error('Erreur lors de l\'envoi de la fiche');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitStrategy = async (data) => {
    try {
      await api.post('/trainers/strategies', data);
      toast.success('Stratégie ajoutée avec succès !');
      setShowStrategyForm(false);
      resetStrategy();
      fetchData();
    } catch (err) {
      toast.error('Erreur lors de l\'ajout de la stratégie');
    }
  };

  const handleDeleteStrategy = async (id) => {
    if (!window.confirm('Supprimer cette stratégie ?')) return;
    try {
      await api.delete(`/trainers/strategies/${id}`);
      toast.success('Stratégie supprimée');
      fetchData();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const tradingStyles = ['Scalping', 'Day Trading', 'Swing Trading', 'Position Trading', 'Mixte'];
  const sessions = ['London', 'New York', 'Asian', 'London + NY', 'Toutes sessions'];
  const capitalRanges = ['< 1 000€', '1 000€ - 5 000€', '5 000€ - 10 000€', '10 000€ - 50 000€', '> 50 000€'];
  const platforms = ['Discord', 'Zoom', 'Google Meet', 'Telegram', 'WhatsApp', 'En présentiel'];
  const marketTypes = ['Forex', 'Crypto', 'Actions', 'Indices', 'Matières premières', 'Options'];
  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;

  // Show existing sheet if approved
  if (existingSheet?.sheet?.status === 'approved') {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-green-800 dark:text-green-200">Fiche Approuvée</h2>
              <p className="text-green-600 dark:text-green-400">Votre fiche d'inscription a été validée par l'administrateur.</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Récapitulatif de votre fiche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Nom complet</p>
                <p className="font-semibold">{existingSheet.sheet.full_name}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{existingSheet.sheet.email}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Style de Trading</p>
                <p className="font-semibold">{existingSheet.sheet.trading_style}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Expérience</p>
                <p className="font-semibold">{existingSheet.sheet.years_experience} ans</p>
              </div>
            </div>
            {existingSheet.sheet.admin_notes && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Note de l'administrateur</p>
                <p className="text-blue-700 dark:text-blue-300">{existingSheet.sheet.admin_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show pending status
  if (existingSheet?.sheet?.status === 'pending') {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div>
              <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-200">Fiche en Cours de Révision</h2>
              <p className="text-yellow-600 dark:text-yellow-400">Votre fiche d'inscription est en attente de validation par l'administrateur.</p>
            </div>
          </div>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Soumise le {new Date(existingSheet.sheet.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Récapitulatif de votre fiche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Nom complet</p>
                <p className="font-semibold">{existingSheet.sheet.full_name}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{existingSheet.sheet.email}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Style de Trading</p>
                <p className="font-semibold">{existingSheet.sheet.trading_style}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Expérience</p>
                <p className="font-semibold">{existingSheet.sheet.years_experience} ans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show form
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ma Fiche d'Inscription</h1>
        <p className="text-muted-foreground">Complétez votre fiche pour devenir formateur certifié LivefxTrading</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 0: Informations Personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Informations Personnelles
            </CardTitle>
            <CardDescription>Vos coordonnées obligatoires</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nom complet *</label>
                <Input {...register('full_name', { required: true })} placeholder="Votre nom complet" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Email *</label>
                <Input {...register('email', { required: true })} type="email" placeholder="votre@email.com" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Téléphone *</label>
                <Input {...register('phone', { required: true })} type="tel" placeholder="+33 6 12 34 56 78" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Style de Trading */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Style de Trading
            </CardTitle>
            <CardDescription>Décrivez votre approche du trading</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Style principal *</label>
                <select {...register('trading_style', { required: true })} className="w-full border rounded-md p-2 bg-background">
                  <option value="">Sélectionnez...</option>
                  {tradingStyles.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Session préférée *</label>
                <select {...register('preferred_session', { required: true })} className="w-full border rounded-md p-2 bg-background">
                  <option value="">Sélectionnez...</option>
                  {sessions.map(session => <option key={session} value={session}>{session}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Années d'expérience *</label>
                <Input {...register('years_experience', { required: true })} type="number" min="0" placeholder="Ex: 5" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Taux de réussite (Win Rate) *</label>
                <Input {...register('win_rate', { required: true })} placeholder="Ex: 65%" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section Stratégies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Mes Stratégies ({strategies.length})
              </span>
              <Button type="button" size="sm" onClick={() => setShowStrategyForm(!showStrategyForm)}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter une Stratégie
              </Button>
            </CardTitle>
            <CardDescription>Ajoutez vos stratégies de trading - elles seront incluses dans votre fiche</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Strategy Form */}
            {showStrategyForm && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <h4 className="font-semibold">Nouvelle Stratégie</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Nom de la stratégie *</label>
                    <Input {...registerStrategy('name', { required: true })} placeholder="Ex: Breakout Strategy" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Type de marché</label>
                    <select {...registerStrategy('market_type')} className="w-full border rounded-md p-2 bg-background">
                      <option value="">Sélectionner</option>
                      {marketTypes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Timeframe</label>
                    <select {...registerStrategy('timeframe')} className="w-full border rounded-md p-2 bg-background">
                      <option value="">Sélectionner</option>
                      {timeframes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Win Rate</label>
                    <Input {...registerStrategy('win_rate')} placeholder="Ex: 65%" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Risk/Reward Ratio</label>
                    <Input {...registerStrategy('risk_reward_ratio')} placeholder="Ex: 1:2" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <textarea 
                    {...registerStrategy('description')} 
                    className="w-full border rounded-md p-2 bg-background min-h-[80px]"
                    placeholder="Décrivez votre stratégie..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Critères d'entrée</label>
                  <textarea 
                    {...registerStrategy('entry_criteria')} 
                    className="w-full border rounded-md p-2 bg-background min-h-[60px]"
                    placeholder="Quand entrez-vous en position ?"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Critères de sortie</label>
                  <textarea 
                    {...registerStrategy('exit_criteria')} 
                    className="w-full border rounded-md p-2 bg-background min-h-[60px]"
                    placeholder="Quand sortez-vous de position ?"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { setShowStrategyForm(false); resetStrategy(); }}>
                    Annuler
                  </Button>
                  <Button type="button" onClick={handleSubmitStrategy(onSubmitStrategy)}>
                    Enregistrer la Stratégie
                  </Button>
                </div>
              </div>
            )}

            {/* Strategies List */}
            {strategies.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">Aucune stratégie ajoutée</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Cliquez sur "Ajouter une Stratégie" pour créer votre première stratégie
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {strategies.map((strategy) => (
                  <div key={strategy.id} className="p-4 border rounded-lg bg-background">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{strategy.name}</h4>
                          {strategy.market_type && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                              {strategy.market_type}
                            </span>
                          )}
                          {strategy.timeframe && (
                            <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">
                              {strategy.timeframe}
                            </span>
                          )}
                        </div>
                        {strategy.description && (
                          <p className="text-sm text-muted-foreground mb-2">{strategy.description}</p>
                        )}
                        <div className="flex gap-4 text-xs">
                          {strategy.win_rate && <span>Win Rate: <strong>{strategy.win_rate}</strong></span>}
                          {strategy.risk_reward_ratio && <span>R/R: <strong>{strategy.risk_reward_ratio}</strong></span>}
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteStrategy(strategy.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Marchés & Outils */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Marchés & Outils
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Marchés tradés *</label>
                <Input {...register('markets_traded', { required: true })} placeholder="Ex: Forex, Indices, Crypto..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Paires/Actifs préférés</label>
                <Input {...register('preferred_pairs')} placeholder="Ex: EUR/USD, GBP/USD, XAUUSD..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Timeframes utilisés</label>
                <Input {...register('timeframes')} placeholder="Ex: M15, H1, H4, D1..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Outils/Indicateurs</label>
                <Input {...register('tools_used')} placeholder="Ex: RSI, MACD, Fibonacci..." />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Capital & Gestion du Risque */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Capital & Gestion du Risque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Capital sous gestion</label>
                <select {...register('capital_managed')} className="w-full border rounded-md p-2 bg-background">
                  <option value="">Sélectionnez...</option>
                  {capitalRanges.map(range => <option key={range} value={range}>{range}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Risque par trade</label>
                <Input {...register('risk_per_trade')} placeholder="Ex: 1-2%" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Ratio Risk/Reward</label>
                <Input {...register('risk_reward_ratio')} placeholder="Ex: 1:2, 1:3..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Objectif mensuel</label>
                <Input {...register('monthly_target')} placeholder="Ex: 5-10%" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Enseignement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Enseignement & Coaching
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Expérience en enseignement</label>
                <Input {...register('teaching_experience')} placeholder="Ex: 2 ans de coaching..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Plateforme préférée</label>
                <select {...register('preferred_platform')} className="w-full border rounded-md p-2 bg-background">
                  <option value="">Sélectionnez...</option>
                  {platforms.map(platform => <option key={platform} value={platform}>{platform}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Disponibilité</label>
                <Input {...register('availability')} placeholder="Ex: Soirs et week-ends..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tarif horaire souhaité</label>
                <Input {...register('hourly_rate')} placeholder="Ex: 50€/h" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Pourquoi souhaitez-vous rejoindre LivefxTrading ?</label>
              <textarea 
                {...register('motivation')} 
                className="w-full border rounded-md p-3 bg-background min-h-[100px]"
                placeholder="Expliquez vos motivations et ce que vous pouvez apporter..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Liens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-primary" />
              Liens & Preuves de Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">MyFxBook / FxBlue</label>
                <Input {...register('myfxbook_url')} placeholder="URL de votre compte vérifié" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">TradingView</label>
                <Input {...register('tradingview_url')} placeholder="URL de votre profil" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">LinkedIn</label>
                <Input {...register('linkedin_url')} placeholder="URL LinkedIn" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">YouTube / Chaîne</label>
                <Input {...register('youtube_url')} placeholder="URL de votre chaîne" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="px-8" disabled={submitting}>
            {submitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer à l'Administrateur
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

// ==================== STRATEGIES SECTION ====================
const StrategiesSection = () => {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const res = await api.get('/trainers/strategies');
      setStrategies(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des stratégies');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      if (editingStrategy) {
        await api.put(`/trainers/strategies/${editingStrategy.id}`, data);
        toast.success('Stratégie mise à jour avec succès !');
      } else {
        await api.post('/trainers/strategies', data);
        toast.success('Stratégie créée avec succès !');
      }
      setShowForm(false);
      setEditingStrategy(null);
      reset();
      fetchStrategies();
    } catch (err) {
      toast.error('Erreur lors de l\'enregistrement de la stratégie');
    }
  };

  const handleEdit = (strategy) => {
    setEditingStrategy(strategy);
    Object.keys(strategy).forEach(key => setValue(key, strategy[key]));
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette stratégie ?')) return;
    try {
      await api.delete(`/trainers/strategies/${id}`);
      toast.success('Stratégie supprimée avec succès !');
      fetchStrategies();
    } catch (err) {
      toast.error('Erreur lors de la suppression de la stratégie');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStrategy(null);
    reset();
  };

  const marketTypes = ['Forex', 'Crypto', 'Actions', 'Indices', 'Matières premières', 'Options'];
  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mes Stratégies</h1>
          <p className="text-muted-foreground">Gérez vos stratégies de trading</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Stratégie
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingStrategy ? 'Modifier la Stratégie' : 'Nouvelle Stratégie'}</CardTitle>
            <CardDescription>Décrivez votre stratégie de trading en détail</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nom de la stratégie *</label>
                  <Input {...register('name', { required: true })} placeholder="Ex: Breakout Strategy" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Type de marché</label>
                  <select {...register('market_type')} className="w-full border rounded-md p-2 bg-background">
                    <option value="">Sélectionner</option>
                    {marketTypes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Timeframe principal</label>
                  <select {...register('timeframe')} className="w-full border rounded-md p-2 bg-background">
                    <option value="">Sélectionner</option>
                    {timeframes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Risk/Reward Ratio</label>
                  <Input {...register('risk_reward_ratio')} placeholder="Ex: 1:2, 1:3" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Win Rate estimé</label>
                  <Input {...register('win_rate')} placeholder="Ex: 60%" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Description de la stratégie</label>
                <textarea 
                  {...register('description')} 
                  className="w-full border rounded-md p-2 bg-background min-h-[100px]"
                  placeholder="Décrivez votre approche..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Critères d'entrée</label>
                <textarea 
                  {...register('entry_criteria')} 
                  className="w-full border rounded-md p-2 bg-background min-h-[80px]"
                  placeholder="Quand entrez-vous en position ?"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Critères de sortie</label>
                <textarea 
                  {...register('exit_criteria')} 
                  className="w-full border rounded-md p-2 bg-background min-h-[80px]"
                  placeholder="Quand sortez-vous de position ?"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Gestion du risque</label>
                <textarea 
                  {...register('risk_management')} 
                  className="w-full border rounded-md p-2 bg-background min-h-[80px]"
                  placeholder="Comment gérez-vous le risque ?"
                />
              </div>

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
                  Annuler
                </Button>
                <Button type="submit" className="flex-1">
                  {editingStrategy ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {strategies.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune stratégie</h3>
            <p className="text-muted-foreground mb-4">Commencez par créer votre première stratégie de trading</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une stratégie
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {strategies.map((strategy) => (
            <Card key={strategy.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{strategy.name}</h3>
                      {strategy.market_type && (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">{strategy.market_type}</span>
                      )}
                      {strategy.timeframe && (
                        <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">{strategy.timeframe}</span>
                      )}
                    </div>
                    {strategy.description && (
                      <p className="text-muted-foreground mb-4">{strategy.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {strategy.risk_reward_ratio && (
                        <div>
                          <p className="text-muted-foreground">R/R Ratio</p>
                          <p className="font-semibold">{strategy.risk_reward_ratio}</p>
                        </div>
                      )}
                      {strategy.win_rate && (
                        <div>
                          <p className="text-muted-foreground">Win Rate</p>
                          <p className="font-semibold">{strategy.win_rate}</p>
                        </div>
                      )}
                    </div>

                    {(strategy.entry_criteria || strategy.exit_criteria || strategy.risk_management) && (
                      <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {strategy.entry_criteria && (
                          <div>
                            <p className="font-medium flex items-center gap-1 mb-1"><Target className="h-4 w-4" /> Entrée</p>
                            <p className="text-muted-foreground">{strategy.entry_criteria}</p>
                          </div>
                        )}
                        {strategy.exit_criteria && (
                          <div>
                            <p className="font-medium flex items-center gap-1 mb-1"><CheckCircle className="h-4 w-4" /> Sortie</p>
                            <p className="text-muted-foreground">{strategy.exit_criteria}</p>
                          </div>
                        )}
                        {strategy.risk_management && (
                          <div>
                            <p className="font-medium flex items-center gap-1 mb-1"><ShieldCheck className="h-4 w-4" /> Risque</p>
                            <p className="text-muted-foreground">{strategy.risk_management}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(strategy)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(strategy.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainerDashboard;
