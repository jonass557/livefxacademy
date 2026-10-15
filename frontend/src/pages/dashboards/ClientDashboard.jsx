import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Video, TrendingUp, GraduationCap, Link as LinkIcon,
  MessageSquare, Phone, Send, Facebook, ClipboardList,
  Palmtree, Briefcase, CheckCircle, ArrowRight, ArrowLeft, ExternalLink,
  User, MapPin, Clock, Target, BookOpen, Star, AlertCircle,
  DollarSign, BarChart3, Calendar, Globe, Zap, Award, Users, Mail, X, History, LineChart,
  Share2, CreditCard, Copy, Check, ShieldCheck
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import api from '../../lib/api';
import { getServiceIcon } from '../../lib/serviceIcons';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import ReactPlayer from 'react-player';
import { cloudinaryVideoThumb } from '../../lib/video';
import AnnouncementInteractions from '../../components/AnnouncementInteractions';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';
import Backtesting from '../Backtesting';
import BacktestHistory from '../../components/backtest/BacktestHistory';
import EconomicCalendar from '../EconomicCalendar';
import TradingDemo from '../TradingDemo';
import AppErrorBoundary from '../../components/AppErrorBoundary';

const ClientDashboard = () => {
  const { user } = useAuthStore();
  const { t, language } = useLanguageStore();
  const isEn = language === 'en';
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  // La navigation entre les fonctions du tableau de bord passe par l'URL
  // (?section=...) et non un simple state : le bouton « Précédent » du
  // navigateur revient alors à l'accueil du tableau de bord au lieu de quitter
  // l'espace membre (ce qui renvoyait vers /login et donnait l'impression
  // d'être déconnecté).
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('section') || 'dashboard';
  const setActiveSection = (id) =>
    setSearchParams(id && id !== 'dashboard' ? { section: id } : {});

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const [loading, setLoading] = useState(true);
  
  // Consultation form state
  const [consultationForm, setConsultationForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    age: '',
    country: '',
    city: '',
    trading_experience: 'debutant',
    experience_duration: '',
    current_broker: '',
    has_demo_account: false,
    has_real_account: false,
    trading_goals: '',
    monthly_goal: '',
    investment_budget: '',
    time_available: '',
    preferred_style: '',
    academy_level: 'debutant',
    modules_completed: '',
    current_module: '',
    difficulties: '',
    needs_help_with: '',
    satisfaction_rating: 5,
    feedback: '',
    questions: ''
  });
  const [existingConsultation, setExistingConsultation] = useState(null);
  const [submittingConsultation, setSubmittingConsultation] = useState(false);
  const [vacationPrograms, setVacationPrograms] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  // Referral state
  const [referralStats, setReferralStats] = useState(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Subscriptions & Payment state
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [payForm, setPayForm] = useState({ phone: '', operator: 'mtn', country: 'BJ', otp_code: '' });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  const textsToTranslate = useMemo(() => {
    const list = [];
    videos.forEach((v) => {
      if (v.title) list.push(v.title);
      if (v.description) list.push(v.description);
    });
    services.forEach((s) => {
      if (s.title) list.push(s.title);
      if (s.name) list.push(s.name);
      if (s.description) list.push(s.description);
    });
    return list;
  }, [videos, services]);

  const { tr } = useAutoTranslate(textsToTranslate);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch announcement videos, vacation programs and services
        const [videosRes, vacationRes, servicesRes] = await Promise.all([
          api.get('/announcements'),
          api.get('/vacation-programs'),
          api.get('/services')
        ]);
        setVideos(videosRes.data);
        setVacationPrograms(vacationRes.data);
        setServices(servicesRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Mark video as viewed
  const handleVideoView = async (videoId) => {
    try {
      await api.post(`/announcements/${videoId}/view`);
    } catch (err) {
      console.error('Error marking video as viewed:', err);
    }
  };

  // Fetch existing consultation
  const fetchExistingConsultation = async () => {
    try {
      const res = await api.get('/student-consultations/my');
      if (res.data) {
        setExistingConsultation(res.data);
        setConsultationForm(prev => ({
          ...prev,
          ...res.data
        }));
      }
    } catch (err) {
      console.error('Error fetching consultation:', err);
    }
  };

  useEffect(() => {
    fetchExistingConsultation();
  }, []);

  // Handle consultation form change
  const handleConsultationChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConsultationForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Submit consultation form
  const handleSubmitConsultation = async (e) => {
    e.preventDefault();
    setSubmittingConsultation(true);
    try {
      await api.post('/student-consultations', consultationForm);
      toast.success('Votre fiche de consultation a été envoyée avec succès à l\'administrateur !');
      fetchExistingConsultation();
    } catch (err) {
      toast.error('Erreur lors de l\'envoi de la fiche');
    } finally {
      setSubmittingConsultation(false);
    }
  };

  const fetchReferralStats = async () => {
    setLoadingReferral(true);
    try {
      const res = await api.get('/referrals/my-stats');
      setReferralStats(res.data);
    } catch (err) {
      console.error('Error fetching referral stats:', err);
    } finally {
      setLoadingReferral(false);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await api.get('/subscriptions/plans');
      setPlans(res.data || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'referral') {
      fetchReferralStats();
    }
    if (activeSection === 'subscription') {
      fetchPlans();
    }
  }, [activeSection]);

  const handleCopyReferralLink = (code) => {
    const origin = window.location.origin;
    const link = `${origin}/register?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success(isEn ? 'Referral link copied to clipboard!' : 'Lien de parrainage copié dans le presse-papiers !');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSubmittingPayment(true);
    try {
      const res = await api.post('/subscriptions/pay/mobile', {
        plan_id: selectedPlan.id,
        phone: payForm.phone,
        operator: payForm.operator,
        country: payForm.country,
        otp_code: payForm.otp_code || undefined,
      });
      setPaymentResult(res.data);
      toast.success(res.data?.message || (isEn ? 'Payment initiated successfully' : 'Paiement initié avec succès'));
    } catch (err) {
      toast.error(err.response?.data?.message || (isEn ? 'Error initiating payment' : 'Erreur lors du paiement'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Section: Dashboard Overview
  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-6 rounded-xl">
        <h2 className="text-2xl font-bold mb-2">{t('client.welcome')}, {user?.full_name} 👋</h2>
        <p className="text-muted-foreground">
          {t('client.servicesDesc')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('client.progression')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">12%</div>
            <p className="text-xs text-muted-foreground">Formation en cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vidéos</CardTitle>
            <Video className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videos.length}</div>
            <p className="text-xs text-muted-foreground">Annonces disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Statut</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Actif</div>
            <p className="text-xs text-muted-foreground">Compte validé</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveSection('consultation')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultation</CardTitle>
            <ClipboardList className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">→</div>
            <p className="text-xs text-muted-foreground">{t('client.fillForm')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" /> {t('client.latestAnnouncements')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{t('client.noAnnouncements')}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.slice(0, 6).map((video) => (
                <div key={video.id} className="border rounded-lg overflow-hidden">
                  <div className="aspect-video bg-black">
                    <ReactPlayer
                      url={video.cloudinary_url}
                      width="100%"
                      height="100%"
                      controls
                      light={cloudinaryVideoThumb(video.cloudinary_url) || true}
                      onPlay={() => handleVideoView(video.id)}
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-sm">{video.title}</h4>
                    <p className="text-xs text-muted-foreground">{t('client.by')} {video.admin_name || 'Admin'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Section: Announcements (Videos)
  const renderAnnouncements = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Video className="h-6 w-6" /> {t('client.latestAnnouncements')}
      </h2>
      {videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('client.noAnnouncements')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <div className="aspect-video bg-black">
                <ReactPlayer
                  url={video.cloudinary_url}
                  width="100%"
                  height="100%"
                  controls
                  light={cloudinaryVideoThumb(video.cloudinary_url) || true}
                  onPlay={() => handleVideoView(video.id)}
                />
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{tr(video.title)}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('client.by')} {video.admin_name || 'Admin'}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{tr(video.description)}</p>
                <AnnouncementInteractions video={video} isAdmin={false} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Section: Services
  const renderServices = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Briefcase className="h-6 w-6" /> {t('client.servicesTitle')}
      </h2>
      <p className="text-muted-foreground">{t('client.servicesDesc')}</p>

      {/* Admin-managed services (clickable for details) */}
      {services.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map(service => {
            const Icon = getServiceIcon(service.icon);
            return (
              <Card
                key={service.id}
                onClick={() => setSelectedService(service)}
                className="hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10">
                    <Icon className={`h-10 w-10 ${service.color || 'text-primary'}`} />
                  </div>
                  <h3 className="text-xl font-bold">{tr(service.title || service.name)}</h3>
                  <p className="text-muted-foreground line-clamp-2">{tr(service.description)}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                    {isEn ? 'View details' : 'Voir les détails'} <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick access to platform sections */}
      <h3 className="text-lg font-semibold pt-2">{t('client.servicesTitle')}</h3>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveSection('trading')}>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="inline-flex p-3 rounded-xl bg-primary/10">
              <TrendingUp className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold">{t('client.tradingInfoTitle')}</h3>
            <p className="text-muted-foreground">{t('client.tradingInfoDesc')}</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveSection('academy')}>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="inline-flex p-3 rounded-xl bg-green-500/10">
              <GraduationCap className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold">{t('client.academyTitle')}</h3>
            <p className="text-muted-foreground">{t('client.academyDesc')}</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveSection('broker')}>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="inline-flex p-3 rounded-xl bg-blue-500/10">
              <LinkIcon className="h-10 w-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold">{t('client.brokerTitle')}</h3>
            <p className="text-muted-foreground">{t('client.brokerDesc')}</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveSection('vacation')}>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="inline-flex p-3 rounded-xl bg-yellow-500/10">
              <Palmtree className="h-10 w-10 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold">{t('client.vacationTitle')}</h3>
            <p className="text-muted-foreground">{t('client.vacationDesc')}</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveSection('consultation')}>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="inline-flex p-3 rounded-xl bg-purple-500/10">
              <ClipboardList className="h-10 w-10 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold">{t('client.consultationTitle')}</h3>
            <p className="text-muted-foreground">{t('client.consultationDesc')}</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveSection('contact')}>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="inline-flex p-3 rounded-xl bg-red-500/10">
              <MessageSquare className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold">{t('client.contactTitle')}</h3>
            <p className="text-muted-foreground">WhatsApp, Telegram, Facebook</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Section: Trading Info
  const renderTrading = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <TrendingUp className="h-6 w-6" /> {t('trading.title')}
      </h2>
      
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-3">{t('trading.subtitle')}</h3>
            <p className="text-muted-foreground">{t('trading.intro')}</p>
          </div>
          
          <div className="bg-primary/5 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">{t('trading.forexTitle')}</h4>
            <p className="text-sm text-muted-foreground">{t('trading.forexDesc')}</p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">{t('trading.advantagesTitle')}</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{t('trading.advantage1')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{t('trading.advantage2')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{t('trading.advantage3')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{t('trading.advantage4')}</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
            <h4 className="font-semibold mb-2 text-yellow-600">{t('trading.risksTitle')}</h4>
            <p className="text-sm">{t('trading.risksDesc')}</p>
          </div>
          
          <Button onClick={() => setActiveSection('academy')} className="gap-2">
            {t('trading.startLearning')} <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Section: Academy Registration
  const renderAcademy = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <GraduationCap className="h-6 w-6" /> {t('client.academyTitle')}
      </h2>
      
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-primary/10">
              <GraduationCap className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-2xl font-bold">LivefxTrading</h3>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {t('client.academyDesc')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">50+</p>
              <p className="text-sm text-muted-foreground">Heures de formation</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">24/7</p>
              <p className="text-sm text-muted-foreground">Accès illimité</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">Live</p>
              <p className="text-sm text-muted-foreground">Sessions coaching</p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button size="lg" className="gap-2" onClick={() => setActiveSection('consultation')}>
              {t('client.fillForm')} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Section: Broker Link
  const renderBroker = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <LinkIcon className="h-6 w-6" /> {t('client.brokerTitle')}
      </h2>
      
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-blue-500/10">
              <LinkIcon className="h-16 w-16 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold">Broker Partenaire</h3>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {t('client.brokerDesc')}
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Dépôts Instantanés</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Support 24/7</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Régulé & Sécurisé</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Spreads compétitifs</span>
            </div>
          </div>
          
          <div className="flex justify-center">
            <a href="https://livefx.link/broker-affiliation" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2">
                Ouvrir un Compte <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Section: Contact
  const renderContact = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <MessageSquare className="h-6 w-6" /> {t('client.contactTitle')}
      </h2>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-green-500/10">
              <Phone className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold">{t('client.whatsapp')}</h3>
            <p className="text-muted-foreground">Contactez-nous directement</p>
            <a href="https://wa.me/VOTRE_NUMERO" target="_blank" rel="noopener noreferrer">
              <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                Ouvrir WhatsApp <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-blue-500/10">
              <Send className="h-10 w-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold">{t('client.telegram')}</h3>
            <p className="text-muted-foreground">Rejoignez notre canal</p>
            <a href="https://t.me/livefxtrading" target="_blank" rel="noopener noreferrer">
              <Button className="w-full gap-2 bg-blue-500 hover:bg-blue-600">
                Ouvrir Telegram <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-blue-600/10">
              <Facebook className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold">{t('client.facebook')}</h3>
            <p className="text-muted-foreground">Suivez notre page</p>
            <a href="https://facebook.com/livefxtrading" target="_blank" rel="noopener noreferrer">
              <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                Ouvrir Facebook <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Section: Consultation Form
  const renderConsultation = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" /> Fiche de Consultation Élève
        </h2>
        <p className="text-muted-foreground">
          Remplissez cette fiche pour que nous puissions suivre votre progression et vous accompagner au mieux.
        </p>
      </div>

      {existingConsultation && existingConsultation.status !== 'pending' && (
        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">
                Votre fiche a été {existingConsultation.status === 'reviewed' ? 'examinée' : 'traitée'} par l'administrateur.
              </span>
            </div>
            {existingConsultation.admin_notes && (
              <p className="mt-2 text-sm text-muted-foreground">
                <strong>Notes de l'admin:</strong> {existingConsultation.admin_notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmitConsultation} className="space-y-6">
        {/* Section 1: Informations Personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" /> Informations Personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Nom complet *</label>
              <Input
                name="full_name"
                value={consultationForm.full_name}
                onChange={handleConsultationChange}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email *</label>
              <Input
                name="email"
                type="email"
                value={consultationForm.email}
                onChange={handleConsultationChange}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Téléphone</label>
              <Input
                name="phone"
                value={consultationForm.phone}
                onChange={handleConsultationChange}
                placeholder="+229 XX XX XX XX"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Âge</label>
              <Input
                name="age"
                type="number"
                value={consultationForm.age}
                onChange={handleConsultationChange}
                min="15"
                max="100"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Pays</label>
              <Input
                name="country"
                value={consultationForm.country}
                onChange={handleConsultationChange}
                placeholder="Ex: Bénin"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Ville</label>
              <Input
                name="city"
                value={consultationForm.city}
                onChange={handleConsultationChange}
                placeholder="Ex: Cotonou"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Expérience Trading */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" /> Expérience en Trading
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Niveau d'expérience</label>
              <select
                name="trading_experience"
                value={consultationForm.trading_experience}
                onChange={handleConsultationChange}
                className="w-full border rounded-md px-3 py-2 bg-background"
              >
                <option value="debutant">Débutant (moins de 6 mois)</option>
                <option value="intermediaire">Intermédiaire (6 mois - 2 ans)</option>
                <option value="avance">Avancé (plus de 2 ans)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Durée d'expérience</label>
              <Input
                name="experience_duration"
                value={consultationForm.experience_duration}
                onChange={handleConsultationChange}
                placeholder="Ex: 1 an et 3 mois"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Broker actuel</label>
              <Input
                name="current_broker"
                value={consultationForm.current_broker}
                onChange={handleConsultationChange}
                placeholder="Ex: Exness, XM, IC Markets..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Style de trading préféré</label>
              <select
                name="preferred_style"
                value={consultationForm.preferred_style}
                onChange={handleConsultationChange}
                className="w-full border rounded-md px-3 py-2 bg-background"
              >
                <option value="">-- Sélectionner --</option>
                <option value="scalping">Scalping</option>
                <option value="day_trading">Day Trading</option>
                <option value="swing">Swing Trading</option>
                <option value="position">Position Trading</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="has_demo_account"
                  checked={consultationForm.has_demo_account}
                  onChange={handleConsultationChange}
                  className="rounded"
                />
                <span className="text-sm">J'ai un compte démo</span>
              </label>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="has_real_account"
                  checked={consultationForm.has_real_account}
                  onChange={handleConsultationChange}
                  className="rounded"
                />
                <span className="text-sm">J'ai un compte réel</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Objectifs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" /> Objectifs et Attentes
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Quels sont vos objectifs en trading ?</label>
              <textarea
                name="trading_goals"
                value={consultationForm.trading_goals}
                onChange={handleConsultationChange}
                className="w-full border rounded-md px-3 py-2 bg-background min-h-[80px]"
                placeholder="Ex: Devenir trader à temps plein, compléter mes revenus..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Objectif mensuel</label>
              <Input
                name="monthly_goal"
                value={consultationForm.monthly_goal}
                onChange={handleConsultationChange}
                placeholder="Ex: 10% de gains, 500 000 FCFA..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Budget d'investissement prévu</label>
              <Input
                name="investment_budget"
                value={consultationForm.investment_budget}
                onChange={handleConsultationChange}
                placeholder="Ex: 100 000 FCFA"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Temps disponible pour le trading</label>
              <Input
                name="time_available"
                value={consultationForm.time_available}
                onChange={handleConsultationChange}
                placeholder="Ex: 2-3 heures par jour"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Progression Académie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" /> Progression dans l'Académie
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Niveau actuel dans l'académie</label>
              <select
                name="academy_level"
                value={consultationForm.academy_level}
                onChange={handleConsultationChange}
                className="w-full border rounded-md px-3 py-2 bg-background"
              >
                <option value="debutant">Débutant</option>
                <option value="intermediaire">Intermédiaire</option>
                <option value="avance">Avancé</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Module en cours</label>
              <Input
                name="current_module"
                value={consultationForm.current_module}
                onChange={handleConsultationChange}
                placeholder="Ex: Analyse technique, Gestion du risque..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Modules complétés</label>
              <textarea
                name="modules_completed"
                value={consultationForm.modules_completed}
                onChange={handleConsultationChange}
                className="w-full border rounded-md px-3 py-2 bg-background min-h-[60px]"
                placeholder="Listez les modules que vous avez terminés..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Difficultés rencontrées</label>
              <textarea
                name="difficulties"
                value={consultationForm.difficulties}
                onChange={handleConsultationChange}
                className="w-full border rounded-md px-3 py-2 bg-background min-h-[60px]"
                placeholder="Décrivez les difficultés que vous rencontrez..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Domaines où vous avez besoin d'aide</label>
              <textarea
                name="needs_help_with"
                value={consultationForm.needs_help_with}
                onChange={handleConsultationChange}
                className="w-full border rounded-md px-3 py-2 bg-background min-h-[60px]"
                placeholder="Ex: Analyse des chandeliers, Psychologie du trading..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5" /> Feedback et Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Note de satisfaction (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setConsultationForm(prev => ({...prev, satisfaction_rating: rating}))}
                    className={`h-10 w-10 rounded-full border-2 transition-all ${
                      consultationForm.satisfaction_rating >= rating 
                        ? 'bg-yellow-400 border-yellow-400 text-white' 
                        : 'border-gray-300 hover:border-yellow-400'
                    }`}
                  >
                    <Star className={`h-5 w-5 mx-auto ${consultationForm.satisfaction_rating >= rating ? 'fill-white' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Votre feedback</label>
              <textarea
                name="feedback"
                value={consultationForm.feedback}
                onChange={handleConsultationChange}
                className="w-full border rounded-md px-3 py-2 bg-background min-h-[80px]"
                placeholder="Partagez votre expérience avec LivefxTrading..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Questions pour le formateur</label>
              <textarea
                name="questions"
                value={consultationForm.questions}
                onChange={handleConsultationChange}
                className="w-full border rounded-md px-3 py-2 bg-background min-h-[80px]"
                placeholder="Posez vos questions ici..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="submit" size="lg" disabled={submittingConsultation} className="gap-2">
            {submittingConsultation ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {existingConsultation ? 'Mettre à jour ma fiche' : 'Envoyer ma fiche'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  // Section: Vacation Program
  const renderVacation = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Palmtree className="h-6 w-6" /> {t('client.vacationTitle')}
      </h2>
      
      {vacationPrograms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Palmtree className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun programme de vacances disponible pour le moment.</p>
            <p className="text-sm mt-2">Revenez bientôt pour découvrir nos prochaines sessions !</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {vacationPrograms.map(program => (
            <Card key={program.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-yellow-500/10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/20 text-primary mb-2">
                      <GraduationCap className="h-3 w-3 mr-1" />
                      Programme Vacances
                    </div>
                    <CardTitle className="text-xl">{program.title}</CardTitle>
                  </div>
                  {program.age_range && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      {program.age_range}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {program.description && (
                  <p className="text-muted-foreground text-sm">{program.description}</p>
                )}
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>
                      {new Date(program.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - {new Date(program.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {program.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{program.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{program.current_participants || 0} / {program.max_participants} places</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    {program.price && (
                      <p className="text-2xl font-bold text-primary">{program.price}€</p>
                    )}
                  </div>
                  <Button onClick={() => navigate('/vacation-program', { state: { programId: program.id || program._id } })} className="gap-2">
                    S'inscrire <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Section: Referral (Parrainage)
  const renderReferral = () => {
    const isEnabled = referralStats?.is_referral_enabled;
    const refCode = referralStats?.referral_code;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://livefx-trading.com';
    const refLink = refCode ? `${origin}/register?ref=${refCode}` : '';

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Share2 className="h-6 w-6 text-primary" /> {isEn ? 'Referral Program' : 'Programme de Parrainage'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isEn
                ? 'Invite traders to LiveFX and earn commissions on subscriptions.'
                : 'Invitez des traders sur LiveFX et recevez vos commissions sur leurs souscriptions.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchReferralStats} disabled={loadingReferral} className="gap-2">
            <Clock className={`h-4 w-4 ${loadingReferral ? 'animate-spin' : ''}`} />
            {isEn ? 'Refresh Stats' : 'Actualiser les stats'}
          </Button>
        </div>

        {!isEnabled ? (
          <Card className="border-dashed border-2 p-8 text-center max-w-2xl mx-auto space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Share2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">{isEn ? 'Referral Access Restricted' : 'Accès au Parrainage Restreint'}</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {isEn
                  ? "Your account does not currently have the referral link enabled. The administrator selectively enables referral links for qualifying members. Contact admin or your trainer to activate your link."
                  : "Votre compte n'a pas encore le lien de parrainage activé. L'administrateur active sélectivement les liens pour les membres éligibles. Contactez l'administrateur ou votre formateur pour demander l'activation."}
              </p>
            </div>
            <div className="pt-2">
              <Button onClick={() => setActiveSection('contact')} variant="outline" className="gap-2">
                <MessageSquare className="h-4 w-4" /> {isEn ? 'Contact Support / Admin' : "Contacter l'administrateur"}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Referral Link Banner */}
            <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-card to-purple-500/5">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground mb-2 shadow-sm">
                      <Award className="h-3.5 w-3.5" />
                      {referralStats?.percentage || 10}% {isEn ? 'Commission per active subscription' : 'de commission par abonnement activé'}
                    </div>
                    <h3 className="text-xl font-bold">{isEn ? 'Your Unique Referral Link' : 'Votre Lien de Parrainage Unique'}</h3>
                    <p className="text-xs text-muted-foreground">
                      {isEn ? 'Share this link to automatically link new traders to your account' : 'Partagez ce lien pour associer automatiquement les nouveaux inscrits à votre profil'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">{isEn ? 'Referral Code' : 'Code Parrain'}</span>
                    <span className="text-2xl font-mono font-extrabold text-primary tracking-widest">{refCode}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={refLink}
                    className="font-mono text-xs sm:text-sm bg-background border-primary/20 select-all"
                  />
                  <Button
                    onClick={() => handleCopyReferralLink(refCode)}
                    className="shrink-0 gap-2 shadow-sm"
                  >
                    {copiedLink ? <Check className="h-4 w-4 text-green-300" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedLink ? (isEn ? 'Copied!' : 'Copié !') : (isEn ? 'Copy' : 'Copier')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isEn ? 'Total Referrals' : 'Inscrits Parrainés'}</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{referralStats?.total_referees || 0}</div>
                  <p className="text-xs text-muted-foreground">{isEn ? 'Registered with your link' : 'Inscrits avec votre lien'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isEn ? 'Active Subscriptions' : 'Plans Activés'}</CardTitle>
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{referralStats?.active_subscribed_referees || 0}</div>
                  <p className="text-xs text-muted-foreground">{isEn ? 'Referees who paid a plan' : 'Filleuls ayant payé un plan'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isEn ? 'Pending Payout' : 'En attente de paiement'}</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{(referralStats?.pending_earnings_xaf || 0).toLocaleString()} XAF</div>
                  <p className="text-xs text-muted-foreground">{isEn ? 'To be paid by administrator' : "À verser par l'administrateur"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isEn ? 'Total Paid Out' : 'Total Déjà Versé'}</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{(referralStats?.paid_earnings_xaf || 0).toLocaleString()} XAF</div>
                  <p className="text-xs text-muted-foreground">{isEn ? 'Commissions already received' : 'Commissions déjà reçues'}</p>
                </CardContent>
              </Card>
            </div>

            {/* List of Referees */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> {isEn ? 'Your Referees List' : 'Liste de vos filleuls'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!referralStats?.referees || referralStats.referees.length === 0) ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">
                    {isEn ? 'No registered referee yet. Share your link to get started!' : "Aucun filleul inscrit pour le moment. Partagez votre lien pour commencer !"}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-xs">
                          <th className="text-left py-2 px-3">{isEn ? 'Name' : 'Nom'}</th>
                          <th className="text-left py-2 px-3">{isEn ? 'Email' : 'Email'}</th>
                          <th className="text-left py-2 px-3">{isEn ? 'Registration Date' : "Date d'inscription"}</th>
                          <th className="text-left py-2 px-3">{isEn ? 'Active Plan' : 'Plan Actif'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referralStats.referees.map((ref) => (
                          <tr key={ref.id} className="border-b hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-medium">{ref.full_name}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{ref.email}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {new Date(ref.created_at).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}
                            </td>
                            <td className="py-2.5 px-3">
                              {ref.has_active_plan ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <CheckCircle className="h-3 w-3" /> {isEn ? 'Active Plan' : 'Plan Actif'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                  {isEn ? 'No Plan' : 'Sans plan'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // Section: Subscription Plans & SEBPAY Mobile Money Payment
  const renderSubscription = () => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" /> {isEn ? 'Subscription Plans' : 'Plans de Souscription'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isEn
              ? 'Subscribe easily with Mobile Money (MTN, Moov, Orange, Wave) via SEBPAY.'
              : 'Souscrivez en toute sécurité par Mobile Money (MTN, Moov, Orange, Wave) via SEBPAY.'}
          </p>
        </div>

        {loadingPlans ? (
          <div className="py-12 text-center text-muted-foreground">
            {isEn ? 'Loading subscription plans...' : 'Chargement des plans...'}
          </div>
        ) : plans.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-bold text-lg">{isEn ? 'No active plans right now' : 'Aucun plan disponible actuellement'}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isEn ? 'The administrator will add monthly subscription plans shortly.' : "L'administrateur configurera les plans de souscription sous peu."}
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => {
              const features = Array.isArray(p.features) ? p.features : [];
              return (
                <Card key={p.id} className="relative overflow-hidden flex flex-col justify-between border-2 hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider">
                        {p.duration_days} {isEn ? 'Days' : 'Jours'}
                      </span>
                    </div>
                    <CardTitle className="text-xl mt-2">{p.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    <div className="pt-3">
                      <span className="text-3xl font-extrabold text-foreground">{Number(p.price_xaf).toLocaleString()}</span>
                      <span className="text-sm font-semibold text-muted-foreground ml-1">XAF</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2 border-t pt-4">
                      {features.length > 0 ? (
                        features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{isEn ? 'Full access to academy services' : "Accès complet aux services de l'académie"}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedPlan(p);
                        setPaymentResult(null);
                        setPaymentModalOpen(true);
                      }}
                      className="w-full gap-2 mt-4"
                    >
                      <CreditCard className="h-4 w-4" />
                      {isEn ? 'Pay with Mobile Money' : 'Payer par Mobile Money'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal de paiement Mobile Money SEBPAY */}
        {paymentModalOpen && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in-0">
            <div className="bg-card border rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{isEn ? 'Mobile Money Payment' : 'Paiement Mobile Money'}</h3>
                  <p className="text-xs text-muted-foreground">SEBPAY Secure Gateway</p>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-xl flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold">{selectedPlan.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedPlan.duration_days} {isEn ? 'days' : 'jours'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{Number(selectedPlan.price_xaf).toLocaleString()} XAF</p>
                </div>
              </div>

              {paymentResult ? (
                <div className="space-y-4 pt-2 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">{isEn ? 'Payment in Progress' : 'Paiement en attente de validation'}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {paymentResult.message || (isEn ? 'Please confirm the prompt on your mobile phone' : 'Veuillez confirmer l’invite USSD envoyée sur votre téléphone.')}
                    </p>
                  </div>
                  {paymentResult.payment_url && (
                    <a
                      href={paymentResult.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                    >
                      <span>{isEn ? 'Complete on SEBPAY' : 'Finaliser sur SEBPAY'}</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => setPaymentModalOpen(false)}>
                    {isEn ? 'Close' : 'Fermer'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleInitiatePayment} className="space-y-4 pt-1">
                  <div>
                    <label className="text-xs font-semibold block mb-1">{isEn ? 'Country' : 'Pays'}</label>
                    <select
                      value={payForm.country}
                      onChange={(e) => setPayForm({ ...payForm, country: e.target.value })}
                      className="w-full border rounded-lg p-2.5 bg-background text-sm"
                    >
                      <option value="BJ">Bénin (BJ)</option>
                      <option value="CI">Côte d'Ivoire (CI)</option>
                      <option value="TG">Togo (TG)</option>
                      <option value="SN">Sénégal (SN)</option>
                      <option value="CM">Cameroun (CM)</option>
                      <option value="BF">Burkina Faso (BF)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1">{isEn ? 'Mobile Operator' : 'Opérateur Mobile'}</label>
                    <select
                      value={payForm.operator}
                      onChange={(e) => setPayForm({ ...payForm, operator: e.target.value })}
                      className="w-full border rounded-lg p-2.5 bg-background text-sm"
                    >
                      <option value="mtn">MTN Mobile Money</option>
                      <option value="moov">Moov Money</option>
                      <option value="orange">Orange Money</option>
                      <option value="wave">Wave</option>
                      <option value="celtiis">Celtiis</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1">{isEn ? 'Phone Number' : 'Numéro de Téléphone'}</label>
                    <Input
                      required
                      placeholder="Ex: 97000000"
                      value={payForm.phone}
                      onChange={(e) => setPayForm({ ...payForm, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1">
                      {isEn ? 'OTP Code (if required by operator)' : 'Code OTP (si requis par l’opérateur)'}
                    </label>
                    <Input
                      placeholder="Ex: 1234 (Orange Money OTP)"
                      value={payForm.otp_code}
                      onChange={(e) => setPayForm({ ...payForm, otp_code: e.target.value })}
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button type="submit" disabled={submittingPayment} className="flex-1 gap-2">
                      <CreditCard className="h-4 w-4" />
                      {submittingPayment ? (isEn ? 'Processing...' : 'Traitement...') : (isEn ? 'Confirm & Pay' : 'Confirmer et Payer')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>
                      {isEn ? 'Cancel' : 'Annuler'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render active section
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return renderDashboard();
      case 'announcements': return renderAnnouncements();
      case 'services': return renderServices();
      case 'trading': return renderTrading();
      case 'academy': return renderAcademy();
      case 'broker': return renderBroker();
      case 'contact': return renderContact();
      case 'consultation': return renderConsultation();
      case 'vacation': return renderVacation();
      case 'economics': return <EconomicCalendar />;
      case 'trading-demo': return <TradingDemo />;
      case 'backtesting': return <Backtesting />;
      case 'backtest-history': return <BacktestHistory />;
      case 'referral': return renderReferral();
      case 'subscription': return renderSubscription();
      default: return renderDashboard();
    }
  };

  // Boutons de fonctionnalités affichés sur la page d'accueil (outils de trading en tête)
  const navItems = [
    { id: 'trading-demo', icon: LineChart, label: `${t('features.chart', 'Graphique')} (${isEn ? 'Demo Trading' : 'Trading Démo'})` },
    { id: 'backtesting', icon: BarChart3, label: t('features.backtesting', 'Backtesting') },
    { id: 'backtest-history', icon: History, label: t('features.backtestHistory', 'Historique de backtest') },
    { id: 'economics', icon: Calendar, label: t('features.economics', 'Annonces éco') },
    { id: 'referral', icon: Share2, label: isEn ? 'Referral Program' : 'Parrainage & Gains' },
    { id: 'subscription', icon: CreditCard, label: isEn ? 'Subscriptions' : 'Abonnements & Plans' },
    { id: 'services', icon: Briefcase, label: t('sidebar.services') },
    { id: 'trading', icon: TrendingUp, label: t('sidebar.tradingInfo') },
    { id: 'academy', icon: GraduationCap, label: t('sidebar.academy') },
    { id: 'broker', icon: LinkIcon, label: t('sidebar.broker') },
    { id: 'contact', icon: MessageSquare, label: t('sidebar.contact') },
    { id: 'consultation', icon: ClipboardList, label: t('sidebar.consultationForm') },
    { id: 'vacation', icon: Palmtree, label: t('sidebar.vacationProgram') },
  ];

  const isChartSection = activeSection === 'trading-demo' || activeSection === 'backtesting';

  return (
    <div className={isChartSection ? 'h-screen max-h-screen w-screen max-w-full overflow-hidden flex flex-col p-0 m-0' : 'min-h-[calc(100vh-4rem)]'}>
      <main className="w-full h-full flex-1 min-h-0 flex flex-col p-0 m-0">
        {/* Graphiques : pleine largeur et hauteur sans padding pour maximiser l'espace */}
        <div className={isChartSection ? 'h-full w-full flex-1 min-h-0 overflow-hidden p-0 m-0' : 'p-4 md:p-6 mx-auto max-w-7xl'}>
          {/* Header : masqué sur les sections graphiques */}
          {!isChartSection && (
            <div className="mb-4 md:mb-6 relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-purple-500/10 p-6 md:p-8">
              <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />
              <div className="relative">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary">
                  {t('dashboard.clientTitle')}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1">{t('dashboard.welcome')}, <span className="font-semibold text-foreground">{user?.full_name}</span></p>
              </div>
            </div>
          )}

          {activeSection === 'dashboard' ? (
            <div className="space-y-8">
              {/* Feature button grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {navItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
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

              {/* Dashboard overview */}
              {renderDashboard()}
            </div>
          ) : (
            <div className={isChartSection ? 'relative h-full w-full flex-1 min-h-0 overflow-hidden p-0 m-0' : 'space-y-4'}>
              {isChartSection ? (
                <>
                  {/* Bouton retour clair, grand et très visible superposé en haut à gauche pour les graphiques */}
                  <button
                    onClick={handleGoBack}
                    className="fixed top-2.5 left-2.5 sm:top-3 sm:left-3 z-[75] flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold px-3.5 py-1.5 text-xs sm:text-sm hover:bg-primary/90 active:scale-95 transition-all shadow-2xl border border-primary-foreground/20 cursor-pointer"
                    title={isEn ? "Back to previous page" : "Retour à la page précédente"}
                  >
                    <ArrowLeft className="h-4 w-4" /> {isEn ? 'Back' : 'Retour'}
                  </button>
                  <AppErrorBoundary resetKey={activeSection}>{renderContent()}</AppErrorBoundary>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="gap-2" onClick={handleGoBack}>
                    <ArrowLeft className="h-4 w-4" /> {isEn ? 'Back' : 'Retour'}
                  </Button>
                  <AppErrorBoundary resetKey={activeSection}>{renderContent()}</AppErrorBoundary>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Service detail modal */}
      {selectedService && (() => {
        const Icon = getServiceIcon(selectedService.icon);
        const waNumber = (selectedService.whatsapp || '').replace(/[^0-9]/g, '');
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedService(null)}
          >
            <div
              className="bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10">
                    <Icon className={`h-10 w-10 ${selectedService.color || 'text-primary'}`} />
                  </div>
                  <button onClick={() => setSelectedService(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <h2 className="text-2xl font-bold">{selectedService.title}</h2>
                {selectedService.description && (
                  <p className="text-muted-foreground">{selectedService.description}</p>
                )}
                {selectedService.details && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedService.details}</p>
                )}

                {/* Contacts */}
                {(selectedService.whatsapp || selectedService.phone || selectedService.email || selectedService.telegram || selectedService.link) && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-semibold">Contacts</p>
                    <div className="flex flex-col gap-2">
                      {selectedService.whatsapp && (
                        <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline">
                          <MessageSquare className="h-4 w-4" /> WhatsApp : {selectedService.whatsapp}
                        </a>
                      )}
                      {selectedService.phone && (
                        <a href={`tel:${selectedService.phone}`} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                          <Phone className="h-4 w-4" /> {selectedService.phone}
                        </a>
                      )}
                      {selectedService.email && (
                        <a href={`mailto:${selectedService.email}`} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                          <Mail className="h-4 w-4" /> {selectedService.email}
                        </a>
                      )}
                      {selectedService.telegram && (
                        <a href={selectedService.telegram.startsWith('http') ? selectedService.telegram : `https://t.me/${selectedService.telegram.replace('@', '')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-blue-500 hover:underline">
                          <Send className="h-4 w-4" /> Telegram : {selectedService.telegram}
                        </a>
                      )}
                      {selectedService.link && (
                        <a href={selectedService.link} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                          <ExternalLink className="h-4 w-4" /> {selectedService.link}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ClientDashboard;