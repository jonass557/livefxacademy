
import AnnouncementInteractions from '../../components/AnnouncementInteractions';import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Users, UserPlus, Video, TrendingUp, Image as ImageIcon, Trash2, MessageSquare, CheckCircle, XCircle, Clock, RefreshCw, BarChart3, Mail, GraduationCap, Eye, UserCheck, UserX, Lightbulb, ExternalLink, User, Phone, Calendar, Award, Briefcase, X, FileCheck, Send, AlertCircle, Target, ChevronDown, ChevronUp, Upload, Play, Pause, Edit2, Search, Globe, ArrowRight, Share2, CreditCard, Gift } from 'lucide-react';
import { toast } from 'sonner';
import api, { API_URL } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import AdminSidebar from '../../components/AdminSidebar';
import EconomicCalendar from '../EconomicCalendar';
import { getServiceIcon, SERVICE_ICON_NAMES } from '../../lib/serviceIcons';
import { cloudinaryVideoThumb } from '../../lib/video';

const formatMediaUrl = (url) => url ? (url.startsWith('http') ? url : `${API_URL}${url}`) : '';

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const { t } = useLanguageStore();
  const [banners, setBanners] = useState([]);
  const [branding, setBranding] = useState({
    navbar_logo_url: '',
    chart_logo_url: '',
    gemini_api_key: '',
    sebpay_public_key: '',
    sebpay_secret_key: '',
    referral_percentage: 10
  });
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [activeGatewayInput, setActiveGatewayInput] = useState('ikeepay');
  const [sebpayPublicKeyInput, setSebpayPublicKeyInput] = useState('');
  const [sebpaySecretKeyInput, setSebpaySecretKeyInput] = useState('');
  const [ikeepayPublicKeyInput, setIkeepayPublicKeyInput] = useState('');
  const [ikeepaySecretKeyInput, setIkeepaySecretKeyInput] = useState('');
  const [brokersList, setBrokersList] = useState([]);
  const [brokerForm, setBrokerForm] = useState({ name: '', url: '', description: '', logo_url: '' });
  const [brokerLogoFile, setBrokerLogoFile] = useState(null);
  const [editingBrokerId, setEditingBrokerId] = useState(null);
  const [savingBroker, setSavingBroker] = useState(false);
  const [referralPercentageInput, setReferralPercentageInput] = useState(10);
  const [savingSettings, setSavingSettings] = useState(false);

  // Referrals overview state
  const [referralsOverview, setReferralsOverview] = useState([]);
  const [referralUserSearch, setReferralUserSearch] = useState('');
  const [referralSearchResults, setReferralSearchResults] = useState([]);
  const [searchingReferralUser, setSearchingReferralUser] = useState(false);
  const [loadingReferralsOverview, setLoadingReferralsOverview] = useState(false);
  const [editingUserReferral, setEditingUserReferral] = useState(null);
  const [customPercInput, setCustomPercInput] = useState('');

  // Plans management state
  const [adminPlans, setAdminPlans] = useState([]);
  const [loadingAdminPlans, setLoadingAdminPlans] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', description: '', price_xaf: '', duration_days: 30, trial_days: 0, features: '', is_active: true });
  const [editingPlan, setEditingPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const [savingGeminiKey, setSavingGeminiKey] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(null);
  const [prospects, setProspects] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Trainers state
  const [trainers, setTrainers] = useState([]);
  const [trainerStats, setTrainerStats] = useState(null);
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [trainerDetails, setTrainerDetails] = useState(null);
  const [loadingTrainerDetails, setLoadingTrainerDetails] = useState(false);

  // Consultation Sheets state
  const [consultationSheets, setConsultationSheets] = useState([]);
  const [consultationStats, setConsultationStats] = useState(null);
  const [consultationFilter, setConsultationFilter] = useState('all');
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetDetails, setSheetDetails] = useState(null);
  const [loadingSheetDetails, setLoadingSheetDetails] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Users state
  const [users, setUsers] = useState([]);
  const [usersStats, setUsersStats] = useState(null);
  const [userFilter, setUserFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  // Announcements / Fil d'actualité state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementStats, setAnnouncementStats] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [mediaType, setMediaType] = useState('video'); // 'video' | 'image'
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const videoFileInputRef = useRef(null);
  const mainRef = useRef(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  // Detailed Stats state
  const [detailedStats, setDetailedStats] = useState(null);

  // Student Consultations state
  const [studentConsultations, setStudentConsultations] = useState([]);
  const [studentConsultationStats, setStudentConsultationStats] = useState(null);
  const [studentConsultationFilter, setStudentConsultationFilter] = useState('all');
  const [selectedStudentConsultation, setSelectedStudentConsultation] = useState(null);
  const [studentAdminNotes, setStudentAdminNotes] = useState('');

  // Vacation Programs state
  const [vacationPrograms, setVacationPrograms] = useState([]);
  const [vacationRegistrations, setVacationRegistrations] = useState([]);
  const [vacationStats, setVacationStats] = useState(null);
  const [showVacationForm, setShowVacationForm] = useState(false);
  const [editingVacation, setEditingVacation] = useState(null);
  const [vacationForm, setVacationForm] = useState({
    title: '', description: '', start_date: '', end_date: '',
    price: '', location: '', max_participants: 20, age_range: ''
  });

  // Services state
  const [services, setServices] = useState([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const emptyServiceForm = { title: '', description: '', icon: 'Briefcase', color: 'text-primary', details: '', whatsapp: '', phone: '', email: '', telegram: '', link: '', order: 0, is_active: true };
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);

  // Email state
  const [emailRecipients, setEmailRecipients] = useState([]);
  const [emailHistory, setEmailHistory] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });
  const [recipientType, setRecipientType] = useState('all');
  const [sendToAll, setSendToAll] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchBanners = async () => {
    try {
      const res = await api.get('/banners');
      setBanners(res.data);
    } catch (err) {
      console.error("Error fetching banners", err);
    }
  };

  const fetchBranding = async () => {
    try {
      const res = await api.get('/branding');
      const gw = res.data?.active_payment_gateway || (res.data?.sebpay_enabled ? 'sebpay' : 'ikeepay');
      setBranding({
        navbar_logo_url: res.data?.navbar_logo_url || '',
        chart_logo_url: res.data?.chart_logo_url || '',
        gemini_api_key: res.data?.gemini_api_key || '',
        active_payment_gateway: gw,
        sebpay_enabled: gw === 'sebpay',
        ikeepay_enabled: gw === 'ikeepay',
        sebpay_public_key: res.data?.sebpay_public_key || '',
        sebpay_secret_key: res.data?.sebpay_secret_key || '',
        ikeepay_public_key: res.data?.ikeepay_public_key || '',
        ikeepay_secret_key: res.data?.ikeepay_secret_key || '',
        referral_percentage: res.data?.referral_percentage ?? 10
      });
      setActiveGatewayInput(gw);
      setBrokersList(Array.isArray(res.data?.brokers) ? res.data.brokers : []);
      setGeminiApiKeyInput(res.data?.gemini_api_key && !res.data.gemini_api_key.includes('••') ? res.data.gemini_api_key : '');
      setSebpayPublicKeyInput(res.data?.sebpay_public_key || '');
      setSebpaySecretKeyInput(res.data?.sebpay_secret_key && !res.data.sebpay_secret_key.includes('••') ? res.data.sebpay_secret_key : '');
      setIkeepayPublicKeyInput(res.data?.ikeepay_public_key || '');
      setIkeepaySecretKeyInput(res.data?.ikeepay_secret_key && !res.data.ikeepay_secret_key.includes('••') ? res.data.ikeepay_secret_key : '');
      if (res.data?.referral_percentage != null) setReferralPercentageInput(res.data.referral_percentage);
    } catch (err) {
      console.error("Error fetching branding", err);
    }
  };

  const handleSwitchPaymentGateway = async (gateway) => {
    setSavingSettings(true);
    try {
      await api.patch('/branding/admin/settings', {
        active_payment_gateway: gateway,
        ikeepay_enabled: gateway === 'ikeepay',
        sebpay_enabled: gateway === 'sebpay',
      });
      setActiveGatewayInput(gateway);
      toast.success(
        gateway === 'ikeepay'
          ? 'iKeePay est maintenant ACTIVÉ (SEBPAY désactivé) !'
          : 'SEBPAY est maintenant ACTIVÉ (iKeePay désactivé) !'
      );
      fetchBranding();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du changement de passerelle');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveIkeepayKeys = async () => {
    setSavingSettings(true);
    try {
      await api.patch('/branding/admin/settings', {
        ikeepay_public_key: ikeepayPublicKeyInput,
        ikeepay_secret_key: ikeepaySecretKeyInput,
        active_payment_gateway: 'ikeepay',
        ikeepay_enabled: true,
        sebpay_enabled: false,
      });
      setActiveGatewayInput('ikeepay');
      toast.success('Clés API iKeePay enregistrées et passerelle iKeePay activée !');
      fetchBranding();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement des clés iKeePay");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearIkeepayKeys = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer les clés API iKeePay enregistrées ?')) return;
    setSavingSettings(true);
    try {
      await api.patch('/branding/admin/settings', { clear_ikeepay_keys: true });
      setIkeepayPublicKeyInput('');
      setIkeepaySecretKeyInput('');
      toast.success('Clés API iKeePay supprimées avec succès !');
      fetchBranding();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression des clés iKeePay');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveBroker = async (e) => {
    e.preventDefault();
    if (!brokerForm.name.trim() || !brokerForm.url.trim()) {
      toast.warning('Veuillez renseigner le nom du broker et son lien (URL).');
      return;
    }
    setSavingBroker(true);
    try {
      const formData = new FormData();
      formData.append('name', brokerForm.name.trim());
      formData.append('url', brokerForm.url.trim());
      formData.append('description', brokerForm.description || '');
      formData.append('logo_url', brokerForm.logo_url || '');
      if (brokerLogoFile) {
        formData.append('logo', brokerLogoFile);
      }

      if (editingBrokerId) {
        await api.put(`/branding/admin/brokers/${editingBrokerId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Broker mis à jour avec succès !');
      } else {
        await api.post('/branding/admin/brokers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Nouveau lien Broker ajouté avec succès !');
      }

      setBrokerForm({ name: '', url: '', description: '', logo_url: '' });
      setBrokerLogoFile(null);
      setEditingBrokerId(null);
      fetchBranding();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement du broker");
    } finally {
      setSavingBroker(false);
    }
  };

  const handleDeleteBroker = async (brokerId) => {
    if (!window.confirm('Supprimer ce lien broker ?')) return;
    try {
      await api.delete(`/branding/admin/brokers/${brokerId}`);
      toast.success('Broker supprimé');
      fetchBranding();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression du broker');
    }
  };

  const handleSaveGeminiKey = async () => {
    setSavingGeminiKey(true);
    try {
      await api.patch('/branding/admin/settings', { gemini_api_key: geminiApiKeyInput });
      toast.success('Clé API Google Gemini enregistrée avec succès !');
      fetchBranding();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de la clé API");
    } finally {
      setSavingGeminiKey(false);
    }
  };

  const handleClearSebpayKeys = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer les clés API SEBPAY enregistrées ?')) return;
    setSavingSettings(true);
    try {
      await api.patch('/branding/admin/settings', { clear_sebpay_keys: true });
      setSebpayPublicKeyInput('');
      setSebpaySecretKeyInput('');
      toast.success('Clés API SEBPAY supprimées avec succès !');
      fetchBranding();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression des clés SEBPAY');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSebpayKeys = async () => {
    setSavingSettings(true);
    try {
      await api.patch('/branding/admin/settings', {
        sebpay_public_key: sebpayPublicKeyInput,
        sebpay_secret_key: sebpaySecretKeyInput
      });
      toast.success('Clés API SEBPAY enregistrées avec succès !');
      fetchBranding();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement des clés SEBPAY");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveReferralPercentage = async () => {
    setSavingSettings(true);
    try {
      await api.patch('/branding/admin/settings', {
        referral_percentage: Number(referralPercentageInput) || 10
      });
      toast.success('Pourcentage global de parrainage mis à jour !');
      fetchBranding();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la mise à jour");
    } finally {
      setSavingSettings(false);
    }
  };

  // Referral Overview
  const fetchReferralsOverview = async () => {
    setLoadingReferralsOverview(true);
    try {
      const res = await api.get('/referrals/admin/overview');
      const list = Array.isArray(res.data) ? res.data : (res.data?.referrers || []);
      setReferralsOverview(list);
      if (res.data?.global_percentage != null) {
        setReferralPercentageInput(res.data.global_percentage);
      }
    } catch (err) {
      console.error("Error fetching referrals overview", err);
      setReferralsOverview([]);
    } finally {
      setLoadingReferralsOverview(false);
    }
  };


  const handleSearchUserForReferral = async (q) => {
    setReferralUserSearch(q);
    if (!q || q.trim().length < 2) {
      setReferralSearchResults([]);
      return;
    }
    setSearchingReferralUser(true);
    try {
      const res = await api.get(`/admin/users?search=${encodeURIComponent(q.trim())}&limit=10`);
      setReferralSearchResults(res.data?.users || []);
    } catch (err) {
      console.error('Erreur recherche utilisateur:', err);
    } finally {
      setSearchingReferralUser(false);
    }
  };

  const handleToggleUserReferral = async (userId, enable, customPerc) => {
    try {
      const res = await api.patch(`/referrals/admin/users/${userId}/toggle`, {
        is_referral_enabled: enable,
        custom_referral_percentage: customPerc !== '' && customPerc != null ? Number(customPerc) : null
      });
      toast.success(res.data?.message || 'Accès parrainage mis à jour');
      fetchReferralsOverview();
      fetchUsers();
      fetchTrainers();
      if (selectedTrainer && String(selectedTrainer.id) === String(userId)) {
        fetchTrainerDetails(userId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  const handleGrantFreeMonth = async (userId, userName) => {
    const daysInput = window.prompt(
      `Activer un abonnement gratuit pour ${userName} :\nNombre de jours à offrir (par défaut 30 jours = 1 mois) :`,
      "30"
    );
    if (daysInput === null) return;
    const duration_days = Number(daysInput) > 0 ? Number(daysInput) : 30;
    try {
      const res = await api.post(`/subscriptions/admin/grant-free/${userId}`, {
        duration_days,
        plan_name: duration_days === 30 ? '1 Mois Offert (Admin)' : `${duration_days} Jours Offerts (Admin)`
      });
      toast.success(res.data?.message || `1 mois d'abonnement gratuit activé pour ${userName} !`);
      fetchUsers();
      fetchTrainers();
      if (selectedTrainer && String(selectedTrainer.id) === String(userId)) {
        fetchTrainerDetails(userId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'activation de l'abonnement gratuit");
    }
  };

  const handleRevokeSubscription = async (userId, userName) => {
    if (!window.confirm(`Voulez-vous désactiver l'abonnement actif de ${userName} ?`)) return;
    try {
      const res = await api.post(`/subscriptions/admin/revoke/${userId}`);
      toast.success(res.data?.message || 'Abonnement désactivé');
      fetchUsers();
      fetchTrainers();
      if (selectedTrainer && String(selectedTrainer.id) === String(userId)) {
        fetchTrainerDetails(userId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la révocation de l'abonnement");
    }
  };

  const handleMarkCommissionsPaid = async (referrerId, userName) => {
    if (!window.confirm(`Confirmez-vous avoir payé toutes les commissions en attente à ${userName} ?`)) return;
    try {
      const res = await api.post(`/referrals/admin/users/${referrerId}/pay`);
      toast.success(res.data?.message || 'Commissions marquées comme payées');
      fetchReferralsOverview();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la validation du paiement');
    }
  };

  // Subscription Plans
  const fetchAdminPlans = async () => {
    setLoadingAdminPlans(true);
    try {
      const res = await api.get('/subscriptions/admin/plans');
      setAdminPlans(res.data || []);
    } catch (err) {
      console.error("Error fetching admin plans", err);
    } finally {
      setLoadingAdminPlans(false);
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const feats = typeof planForm.features === 'string'
        ? planForm.features.split('\n').map(s => s.trim()).filter(Boolean)
        : planForm.features;

      const payload = {
        name: planForm.name,
        description: planForm.description,
        price_xaf: Number(planForm.price_xaf),
        duration_days: Number(planForm.duration_days),
        trial_days: Math.max(0, Number(planForm.trial_days) || 0),
        features: feats,
        is_active: planForm.is_active
      };

      if (editingPlan) {
        await api.put(`/subscriptions/admin/plans/${editingPlan.id || editingPlan._id}`, payload);
        toast.success('Plan mis à jour avec succès');
      } else {
        await api.post('/subscriptions/admin/plans', payload);
        toast.success('Nouveau plan créé avec succès');
      }
      setShowPlanModal(false);
      setEditingPlan(null);
      setPlanForm({ name: '', description: '', price_xaf: '', duration_days: 30, trial_days: 0, features: '', is_active: true });
      fetchAdminPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l’enregistrement du plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Supprimer définitivement ce plan de souscription ?')) return;
    try {
      await api.delete(`/subscriptions/admin/plans/${planId}`);
      toast.success('Plan supprimé');
      fetchAdminPlans();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const fetchProspects = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/prospects${params}`);
      setProspects(res.data.prospects || []);
    } catch (err) {
      console.error("Error fetching prospects", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/prospects/stats');
      setStats(res.data.summary);
    } catch (err) {
      console.error("Error fetching stats", err);
    }
  };

  // Trainers fetch functions
  const fetchTrainers = async () => {
    try {
      const params = trainerFilter !== 'all' ? `?status=${trainerFilter}` : '';
      const res = await api.get(`/admin/trainers${params}`);
      setTrainers(res.data);
    } catch (err) {
      console.error("Error fetching trainers", err);
    }
  };

  const fetchTrainerStats = async () => {
    try {
      const res = await api.get('/admin/trainers/stats');
      setTrainerStats(res.data);
    } catch (err) {
      console.error("Error fetching trainer stats", err);
    }
  };

  const fetchTrainerDetails = async (id) => {
    setLoadingTrainerDetails(true);
    try {
      const res = await api.get(`/admin/trainers/${id}`);
      setTrainerDetails(res.data);
    } catch (err) {
      console.error("Error fetching trainer details", err);
    } finally {
      setLoadingTrainerDetails(false);
    }
  };

  const handleVerifyTrainer = async (id, isVerified) => {
    try {
      await api.patch(`/admin/trainers/${id}/verify`, { is_verified: isVerified });
      fetchTrainers();
      fetchTrainerStats();
      if (trainerDetails?.trainer?.id === id) {
        fetchTrainerDetails(id);
      }
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteTrainer = async (id) => {
    if (!window.confirm('Supprimer définitivement ce formateur et toutes ses données ?')) return;
    try {
      await api.delete(`/admin/trainers/${id}`);
      setTrainerDetails(null);
      fetchTrainers();
      fetchTrainerStats();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Consultation Sheets fetch functions
  const fetchConsultationSheets = async () => {
    try {
      const params = consultationFilter !== 'all' ? `?status=${consultationFilter}` : '';
      const res = await api.get(`/consultation-sheets/admin/all${params}`);
      setConsultationSheets(res.data);
    } catch (err) {
      console.error("Error fetching consultation sheets", err);
    }
  };

  const fetchConsultationStats = async () => {
    try {
      const res = await api.get('/consultation-sheets/admin/stats');
      setConsultationStats(res.data);
    } catch (err) {
      console.error("Error fetching consultation stats", err);
    }
  };

  const fetchSheetDetails = async (id) => {
    setLoadingSheetDetails(true);
    try {
      const res = await api.get(`/consultation-sheets/admin/${id}`);
      setSheetDetails(res.data);
      setAdminNotes(res.data.sheet.admin_notes || '');
    } catch (err) {
      console.error("Error fetching sheet details", err);
    } finally {
      setLoadingSheetDetails(false);
    }
  };

  const handleReviewSheet = async (id, status) => {
    try {
      await api.patch(`/consultation-sheets/admin/${id}/review`, { 
        status, 
        admin_notes: adminNotes 
      });
      fetchConsultationSheets();
      fetchConsultationStats();
      if (sheetDetails?.sheet?.id === id) {
        fetchSheetDetails(id);
      }
      toast.success(status === 'approved' ? 'Fiche approuvée avec succès !' : 
            status === 'rejected' ? 'Fiche rejetée' : 'Statut mis à jour');
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Users fetch functions
  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (userFilter !== 'all') params.append('role', userFilter);
      if (userSearch) params.append('search', userSearch);
      const res = await api.get(`/admin/users?${params.toString()}`);
      setUsers(res.data.users);
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  const fetchUsersStats = async () => {
    try {
      const res = await api.get('/admin/users/stats');
      setUsersStats(res.data);
    } catch (err) {
      console.error("Error fetching users stats", err);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Supprimer définitivement cet utilisateur ?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers();
      fetchUsersStats();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Announcements fetch functions
  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements/admin/all');
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Error fetching announcements", err);
    }
  };

  const fetchAnnouncementStats = async () => {
    try {
      const res = await api.get('/announcements/admin/stats');
      setAnnouncementStats(res.data);
    } catch (err) {
      console.error("Error fetching announcement stats", err);
    }
  };

  const handleUploadAnnouncement = async (e) => {
    e.preventDefault();
    if ((!videoFile && !mediaUrlInput) || !videoTitle) {
      toast.warning('Veuillez remplir le titre et sélectionner un fichier ou fournir une URL');
      return;
    }

    const formData = new FormData();
    if (videoFile) {
      formData.append('file', videoFile);
    }
    formData.append('title', videoTitle);
    formData.append('description', videoDescription);
    formData.append('media_type', mediaType);
    if (mediaUrlInput) formData.append('media_url', mediaUrlInput);

    setUploadingVideo(true);
    try {
      await api.post('/announcements/admin/upload', formData);
      setVideoFile(null);
      setVideoTitle('');
      setVideoDescription('');
      setMediaUrlInput('');
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      fetchAnnouncements();
      fetchAnnouncementStats();
      toast.success(mediaType === 'image' ? 'Image publiée avec succès dans le fil d\'actualité !' : 'Vidéo publiée avec succès dans le fil d\'actualité !');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Erreur lors de la publication';
      toast.error(`Erreur lors de la publication : ${msg}`);
      console.error('Publication announcement error:', err);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleUpdateAnnouncement = async (id, data) => {
    try {
      await api.put(`/announcements/admin/${id}`, data);
      fetchAnnouncements();
      setEditingAnnouncement(null);
      toast.success('Vidéo mise à jour');
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Supprimer cette vidéo d\'annonce ?')) return;
    try {
      await api.delete(`/announcements/admin/${id}`);
      fetchAnnouncements();
      fetchAnnouncementStats();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleAnnouncement = async (id) => {
    try {
      await api.patch(`/announcements/admin/${id}/toggle`);
      fetchAnnouncements();
    } catch (err) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  // Detailed stats
  const fetchDetailedStats = async () => {
    try {
      const res = await api.get('/admin/prospects/detailed-stats');
      setDetailedStats(res.data);
    } catch (err) {
      console.error("Error fetching detailed stats", err);
    }
  };

  // Student consultations fetch functions
  const fetchStudentConsultations = async () => {
    try {
      const params = studentConsultationFilter !== 'all' ? `?status=${studentConsultationFilter}` : '';
      const res = await api.get(`/student-consultations/admin/all${params}`);
      setStudentConsultations(res.data);
    } catch (err) {
      console.error("Error fetching student consultations", err);
    }
  };

  const fetchStudentConsultationStats = async () => {
    try {
      const res = await api.get('/student-consultations/admin/stats');
      setStudentConsultationStats(res.data);
    } catch (err) {
      console.error("Error fetching student consultation stats", err);
    }
  };

  const handleReviewStudentConsultation = async (id, status) => {
    try {
      await api.patch(`/student-consultations/admin/${id}/review`, {
        status,
        admin_notes: studentAdminNotes
      });
      fetchStudentConsultations();
      fetchStudentConsultationStats();
      setSelectedStudentConsultation(null);
      setStudentAdminNotes('');
      toast.success('Fiche élève mise à jour avec succès');
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteStudentConsultation = async (id) => {
    if (!window.confirm('Supprimer cette fiche de consultation ?')) return;
    try {
      await api.delete(`/student-consultations/admin/${id}`);
      fetchStudentConsultations();
      fetchStudentConsultationStats();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Vacation Programs fetch functions
  const fetchVacationPrograms = async () => {
    try {
      const res = await api.get('/vacation-programs/admin/all');
      setVacationPrograms(res.data);
    } catch (err) {
      console.error("Error fetching vacation programs", err);
    }
  };

  const fetchVacationStats = async () => {
    try {
      const res = await api.get('/vacation-programs/admin/stats');
      setVacationStats(res.data);
    } catch (err) {
      console.error("Error fetching vacation stats", err);
    }
  };

  const fetchVacationRegistrations = async () => {
    try {
      const res = await api.get('/vacation-programs/admin/registrations');
      setVacationRegistrations(res.data);
    } catch (err) {
      console.error("Error fetching vacation registrations", err);
    }
  };

  const handleUpdateRegistrationStatus = async (id, status) => {
    try {
      await api.patch(`/vacation-programs/admin/registrations/${id}/status`, { status });
      toast.success(status === 'confirmed' ? 'Inscription approuvée — élève notifié par email' : 'Inscription mise à jour');
      fetchVacationRegistrations();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  // Services fetch & CRUD
  const fetchServices = async () => {
    try {
      const res = await api.get('/services/admin/all');
      setServices(res.data);
    } catch (err) {
      console.error("Error fetching services", err);
    }
  };

  const handleSubmitService = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...serviceForm, order: Number(serviceForm.order) || 0 };
      if (editingService) {
        await api.put(`/services/${editingService.id}`, payload);
        toast.success('Service mis à jour');
      } else {
        await api.post('/services', payload);
        toast.success('Service créé');
      }
      setShowServiceForm(false);
      setEditingService(null);
      setServiceForm(emptyServiceForm);
      fetchServices();
    } catch (err) {
      toast.error('Erreur lors de l\'enregistrement du service');
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      title: service.title || '',
      description: service.description || '',
      icon: service.icon || 'Briefcase',
      color: service.color || 'text-primary',
      details: service.details || '',
      whatsapp: service.whatsapp || '',
      phone: service.phone || '',
      email: service.email || '',
      telegram: service.telegram || '',
      link: service.link || '',
      order: service.order || 0,
      is_active: service.is_active !== false
    });
    setShowServiceForm(true);
  };

  const handleToggleService = async (service) => {
    try {
      await api.put(`/services/${service.id}`, { is_active: !service.is_active });
      fetchServices();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Supprimer ce service ?')) return;
    try {
      await api.delete(`/services/${id}`);
      toast.success('Service supprimé');
      fetchServices();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSubmitVacation = async (e) => {
    e.preventDefault();
    try {
      if (editingVacation) {
        await api.put(`/vacation-programs/${editingVacation.id}`, vacationForm);
        toast.success('Programme mis à jour avec succès');
      } else {
        await api.post('/vacation-programs', vacationForm);
        toast.success('Programme créé avec succès');
      }
      setShowVacationForm(false);
      setEditingVacation(null);
      setVacationForm({ title: '', description: '', start_date: '', end_date: '', price: '', location: '', max_participants: 20, age_range: '' });
      fetchVacationPrograms();
      fetchVacationStats();
    } catch (err) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleDeleteVacation = async (id) => {
    if (!window.confirm('Supprimer ce programme ?')) return;
    try {
      await api.delete(`/vacation-programs/${id}`);
      toast.success('Programme supprimé');
      fetchVacationPrograms();
      fetchVacationStats();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleVacation = async (id, currentStatus) => {
    try {
      await api.put(`/vacation-programs/${id}`, { is_active: !currentStatus });
      toast.success('Statut mis à jour');
      fetchVacationPrograms();
    } catch (err) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  // Email functions
  const fetchEmailRecipients = async () => {
    try {
      const res = await api.get(`/emails/recipients?type=${recipientType}`);
      setEmailRecipients(res.data);
    } catch (err) {
      console.error("Error fetching recipients", err);
    }
  };

  const fetchEmailHistory = async () => {
    try {
      const res = await api.get('/emails/history');
      setEmailHistory(res.data);
    } catch (err) {
      console.error("Error fetching email history", err);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const res = await api.get('/emails/templates');
      setEmailTemplates(res.data);
    } catch (err) {
      console.error("Error fetching templates", err);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.subject || !emailForm.message) {
      toast.warning('Veuillez remplir le sujet et le message');
      return;
    }
    if (!sendToAll && selectedRecipients.length === 0) {
      toast.warning('Veuillez sélectionner au moins un destinataire');
      return;
    }

    setSendingEmail(true);
    try {
      const res = await api.post('/emails/send', {
        recipients: selectedRecipients,
        subject: emailForm.subject,
        message: emailForm.message,
        sendToAll,
        recipientType
      });
      toast.success(res.data.message);
      setEmailForm({ subject: '', message: '' });
      setSelectedRecipients([]);
      setSendToAll(false);
      fetchEmailHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setSendingEmail(false);
    }
  };

  const applyEmailTemplate = (template) => {
    setEmailForm({ subject: template.subject, message: template.message });
    toast.success('Modèle appliqué');
  };

  useEffect(() => {
    Promise.all([
      fetchBanners(),
      fetchBranding(),
      fetchProspects(), 
      fetchStats(), 
      fetchTrainers(), 
      fetchTrainerStats(),
      fetchConsultationSheets(),
      fetchConsultationStats(),
      fetchUsers(),
      fetchUsersStats(),
      fetchAnnouncements(),
      fetchAnnouncementStats(),
      fetchDetailedStats(),
      fetchStudentConsultations(),
      fetchStudentConsultationStats(),
      fetchVacationPrograms(),
      fetchVacationStats(),
      fetchVacationRegistrations(),
      fetchServices(),
      fetchEmailRecipients(),
      fetchEmailHistory(),
      fetchEmailTemplates(),
      fetchReferralsOverview(),
      fetchAdminPlans()
    ]).finally(() => setLoading(false));
  }, []);

  // Défilement vers le haut et déblocage systématique du scroll body à chaque changement de section
  useEffect(() => {
    document.body.style.overflow = 'auto';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeSection]);

  useEffect(() => {
    fetchProspects();
  }, [filter]);

  useEffect(() => {
    fetchTrainers();
  }, [trainerFilter]);

  useEffect(() => {
    fetchConsultationSheets();
  }, [consultationFilter]);

  useEffect(() => {
    fetchUsers();
  }, [userFilter, userSearch]);

  useEffect(() => {
    fetchStudentConsultations();
  }, [studentConsultationFilter]);

  useEffect(() => {
    fetchEmailRecipients();
  }, [recipientType]);

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      await api.post('/banners/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchBanners();
    } catch (err) {
      console.error("Upload failed", err);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Supprimer cette image ?')) return;
    try {
      await api.delete(`/banners/${id}`);
      setBanners(banners.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleLogoUpload = async (type, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('type', type);
    setUploadingLogo(type);
    try {
      const res = await api.post('/branding/admin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBranding({ navbar_logo_url: res.data?.navbar_logo_url || '', chart_logo_url: res.data?.chart_logo_url || '' });
      toast.success('Logo mis à jour');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'upload du logo');
    } finally {
      setUploadingLogo(null);
      event.target.value = '';
    }
  };

  const handleDeleteLogo = async (type) => {
    try {
      const res = await api.delete(`/branding/admin/${type}`);
      setBranding({ navbar_logo_url: res.data?.navbar_logo_url || '', chart_logo_url: res.data?.chart_logo_url || '' });
      toast.success('Logo supprimé');
    } catch (err) {
      toast.error('Erreur lors de la suppression du logo');
    }
  };

  const handleUpdateProspect = async (prospectId, newStatus) => {
    try {
      await api.patch(`/prospects/${prospectId}`, {
        status: newStatus,
        comment: comment,
        admin_id: user?.id
      });
      setComment('');
      setSelectedProspect(null);
      fetchProspects();
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: t('prospects.new') },
      contacted: { color: 'bg-yellow-100 text-yellow-800', icon: MessageSquare, label: t('prospects.contactedStatus') },
      converted: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: t('prospects.convertedStatus') },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: t('prospects.rejectedStatus') }
    };
    const badge = badges[status] || badges.new;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  // Section: Dashboard Overview
  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospects Totaux</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_count || 0}</div>
            <p className="text-xs text-muted-foreground">+{stats?.monthly_new || 0} ce mois</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversion_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">{stats?.converted_count || 0} convertis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.new_count || 0}</div>
            <p className="text-xs text-muted-foreground">À traiter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contactés</CardTitle>
            <MessageSquare className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.contacted_count || 0}</div>
            <p className="text-xs text-muted-foreground">En suivi</p>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Chart Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Bilan Statistique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{stats?.new_count || 0}</p>
              <p className="text-sm text-muted-foreground">Nouveaux</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">{stats?.contacted_count || 0}</p>
              <p className="text-sm text-muted-foreground">Contactés</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{stats?.converted_count || 0}</p>
              <p className="text-sm text-muted-foreground">Convertis</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{stats?.rejected_count || 0}</p>
              <p className="text-sm text-muted-foreground">Rejetés</p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progression globale</span>
              <span className="text-sm text-muted-foreground">
                {stats?.conversion_rate || 0}% de conversion
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ width: `${stats?.conversion_rate || 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding Quick Access */}
      <Card className="hover:border-primary/50 transition-colors border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Personnalisation des Logos (Branding)</h3>
              <p className="text-xs text-muted-foreground">Modifiez en direct le logo de la barre de navigation et le logo du graphique Trading Démo.</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setActiveSection('branding')} className="gap-1.5 whitespace-nowrap self-start sm:self-center">
            Gérer les logos <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Banner Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" /> Gestion Bannière Accueil (Slider)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium">Ajouter une image</label>
            <div className="flex gap-4 items-center">
              <Input 
                type="file" 
                accept="image/*" 
                onChange={handleBannerUpload} 
                disabled={uploading}
                className="max-w-xs"
              />
              {uploading && <span className="text-sm text-muted-foreground">Upload en cours...</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {banners.map((banner) => (
              <div key={banner.id} className="relative group rounded-lg overflow-hidden border aspect-video">
                <img src={`${API_URL}${banner.image_url}`} alt="Banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="icon" onClick={() => handleDeleteBanner(banner.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {banners.length === 0 && <p className="text-muted-foreground col-span-4 text-center py-8">Aucune image personnalisée (Images par défaut utilisées)</p>}
          </div>
        </CardContent>
      </Card>

      {/* Prospects List with Round-Robin */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" /> Gestion des Prospects (Round-Robin)
            </CardTitle>
            <div className="flex gap-2">
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-background"
              >
                <option value="all">Tous</option>
                <option value="new">Nouveaux</option>
                <option value="contacted">Contactés</option>
                <option value="converted">Convertis</option>
                <option value="rejected">Rejetés</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => { fetchProspects(); fetchStats(); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : prospects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun prospect trouvé. Les nouveaux prospects seront automatiquement assignés.
            </div>
          ) : (
            <div className="space-y-4">
              {prospects.map((prospect) => (
                <div 
                  key={prospect.id} 
                  className={`border rounded-lg p-4 transition-all ${
                    selectedProspect?.id === prospect.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{prospect.full_name}</h4>
                        {getStatusBadge(prospect.status)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-2">
                          <Mail className="h-3 w-3" /> {prospect.email}
                        </p>
                        <p>📱 {prospect.phone}</p>
                        {prospect.assigned_name && (
                          <p className="text-xs">Assigné à: <span className="font-medium">{prospect.assigned_name}</span></p>
                        )}
                      </div>
                      {prospect.notes && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs whitespace-pre-wrap">
                          {prospect.notes.substring(0, 200)}{prospect.notes.length > 200 && '...'}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {prospect.status === 'new' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => setSelectedProspect(prospect)}
                            variant={selectedProspect?.id === prospect.id ? 'default' : 'outline'}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" /> Traiter
                          </Button>
                        </>
                      )}
                      {prospect.status === 'contacted' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleUpdateProspect(prospect.id, 'converted')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleUpdateProspect(prospect.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Comment Section */}
                  {selectedProspect?.id === prospect.id && prospect.status === 'new' && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Ajouter un commentaire de suivi..."
                        className="w-full border rounded-md p-2 text-sm bg-background min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleUpdateProspect(prospect.id, 'contacted')}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" /> Marquer Contacté
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => { setSelectedProspect(null); setComment(''); }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );

  // Section: Prospects Only
  const renderProspects = () => (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" /> {t('prospects.title')} ({t('prospects.roundRobin')})
          </CardTitle>
          <div className="flex gap-2">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
            >
              <option value="all">{t('prospects.all')}</option>
              <option value="new">{t('prospects.new')}</option>
              <option value="contacted">{t('prospects.contactedStatus')}</option>
              <option value="converted">{t('prospects.convertedStatus')}</option>
              <option value="rejected">{t('prospects.rejectedStatus')}</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => { fetchProspects(); fetchStats(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">{t('prospects.loading')}</div>
        ) : prospects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t('prospects.noProspects')}</div>
        ) : (
          <div className="space-y-4">
            {prospects.map((prospect) => (
              <div 
                key={prospect.id} 
                className={`border rounded-lg p-4 transition-all ${
                  selectedProspect?.id === prospect.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{prospect.full_name}</h4>
                      {getStatusBadge(prospect.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center gap-2">
                        <Mail className="h-3 w-3" /> {prospect.email}
                      </p>
                      <p>📱 {prospect.phone}</p>
                      {prospect.assigned_name && (
                        <p className="text-xs">{t('prospects.assignedTo')}: <span className="font-medium">{prospect.assigned_name}</span></p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {prospect.status === 'new' && (
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedProspect(prospect)}
                        variant={selectedProspect?.id === prospect.id ? 'default' : 'outline'}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" /> {t('prospects.process')}
                      </Button>
                    )}
                    {prospect.status === 'contacted' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleUpdateProspect(prospect.id, 'converted')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleUpdateProspect(prospect.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedProspect?.id === prospect.id && prospect.status === 'new' && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={t('prospects.addComment')}
                      className="w-full border rounded-md p-2 text-sm bg-background min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdateProspect(prospect.id, 'contacted')}>
                        <MessageSquare className="h-4 w-4 mr-1" /> {t('prospects.markContacted')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedProspect(null); setComment(''); }}>
                        {t('prospects.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Section: Banners Only
  const renderBanners = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" /> {t('banners.title')} ({t('banners.slider')})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium">{t('banners.addImage')}</label>
          <div className="flex gap-4 items-center">
            <Input 
              type="file" 
              accept="image/*" 
              onChange={handleBannerUpload} 
              disabled={uploading}
              className="max-w-xs"
            />
            {uploading && <span className="text-sm text-muted-foreground">{t('banners.uploading')}</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {banners.map((banner) => (
            <div key={banner.id} className="relative group rounded-lg overflow-hidden border aspect-video">
              <img src={`${API_URL}${banner.image_url}`} alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="destructive" size="icon" onClick={() => handleDeleteBanner(banner.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {banners.length === 0 && <p className="text-muted-foreground col-span-4 text-center py-8">{t('banners.noImages')}</p>}
        </div>
      </CardContent>
    </Card>
  );

  // Section: Branding
  const renderBranding = () => {
    const assetUrl = (url) => url ? (url.startsWith('http') ? url : `${API_URL}${url}`) : '';
    const logos = [
      { type: 'navbar', label: 'Logo de la barre de navigation', url: branding.navbar_logo_url },
      { type: 'chart', label: 'Logo du graphique Trading Demo', url: branding.chart_logo_url },
    ];
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Logos & Identité Visuelle</CardTitle></CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {logos.map(({ type, label, url }) => (
              <div key={type} className="space-y-3 rounded-lg border p-4">
                <div>
                  <h3 className="font-semibold">{label}</h3>
                  <p className="text-sm text-muted-foreground">PNG, JPG, WEBP ou SVG — 5 Mo maximum</p>
                </div>
                <div className="flex min-h-24 items-center justify-center rounded-md bg-muted/40 p-4">
                  {url ? <img src={assetUrl(url)} alt={label} className="max-h-16 max-w-full object-contain" /> : <span className="text-sm text-muted-foreground">Logo par défaut utilisé</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => handleLogoUpload(type, event)} disabled={uploadingLogo === type} className="max-w-xs" />
                  {uploadingLogo === type && <span className="self-center text-sm text-muted-foreground">Upload en cours...</span>}
                  {url && <Button type="button" variant="destructive" size="sm" onClick={() => handleDeleteLogo(type)}>Supprimer</Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Configuration Clé API Google Gemini (IA Analyse Économique & Assistant) */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" /> Clé API Google Gemini (Intelligence Artificielle)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configurez votre clé d'API <strong>Google Gemini</strong> pour activer instantanément les analyses macroéconomiques fondamentales automatisées (avant / après publication) et le chatbot assistant économique bilingue pour tous les utilisateurs.
            </p>
            <div className="space-y-2 max-w-xl">
              <label className="text-sm font-medium">Clé secrète Gemini (API Key) :</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleSaveGeminiKey}
                  disabled={savingGeminiKey}
                  className="gap-1.5 shrink-0"
                >
                  {savingGeminiKey ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Enregistrer
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Obtenez une clé gratuitement sur <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Google AI Studio</a>.
                {branding.gemini_api_key && <span className="ml-2 text-green-600 font-semibold">● Clé configurée et active</span>}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Choix de la Passerelle Active & Configuration Clés API (iKeePay / SEBPAY) */}
        <Card className="border-2 border-primary/40 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Choix de la Passerelle de Paiement Mobile Money (iKeePay / SEBPAY)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Choisissez la passerelle de paiement Mobile Money active sur votre site. Activer <strong>iKeePay</strong> désactive automatiquement <strong>SEBPAY</strong> et vice versa.
            </p>

            {/* Bascule 1-clic entre iKeePay et SEBPAY */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div
                onClick={() => handleSwitchPaymentGateway('ikeepay')}
                className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex flex-col justify-between ${
                  activeGatewayInput === 'ikeepay'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-extrabold text-base">iKeePay (Inline Checkout)</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    activeGatewayInput === 'ikeepay'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {activeGatewayInput === 'ikeepay' ? '● ACTIF' : 'DÉSACTIVÉ'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Tunnel de paiement intégré directement sur le site sans quitter la page (aucune restriction d'adresse IP serveur).
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={activeGatewayInput === 'ikeepay' ? 'default' : 'outline'}
                  disabled={savingSettings}
                  className={`w-full font-bold ${activeGatewayInput === 'ikeepay' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  {activeGatewayInput === 'ikeepay' ? '✓ Passerelle Active (SEBPAY désactivé)' : 'Activer iKeePay (Désactiver SEBPAY)'}
                </Button>
              </div>

              <div
                onClick={() => handleSwitchPaymentGateway('sebpay')}
                className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex flex-col justify-between ${
                  activeGatewayInput === 'sebpay'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-extrabold text-base">SEBPAY Mobile Money</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    activeGatewayInput === 'sebpay'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {activeGatewayInput === 'sebpay' ? '● ACTIF' : 'DÉSACTIVÉ'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Collecte directe Mobile Money via l'API SEBPAY (nécessite d'autoriser l'IP 57.129.148.42 sur SEBPAY).
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={activeGatewayInput === 'sebpay' ? 'default' : 'outline'}
                  disabled={savingSettings}
                  className={`w-full font-bold ${activeGatewayInput === 'sebpay' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  {activeGatewayInput === 'sebpay' ? '✓ Passerelle Active (iKeePay désactivé)' : 'Activer SEBPAY (Désactiver iKeePay)'}
                </Button>
              </div>
            </div>

            {/* 1. Configuration iKeePay */}
            <div className={`rounded-2xl border-2 p-5 space-y-4 transition-all ${activeGatewayInput === 'ikeepay' ? 'border-primary/50 bg-primary/5' : 'border-border bg-card/60'}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Paramètres & Clés API iKeePay</span>
                </h4>
                {branding.ikeepay_public_key && (
                  <span className="text-xs text-emerald-600 font-bold">● Clé iKeePay enregistrée</span>
                )}
              </div>

              <div className="p-3 rounded-xl border bg-background/80 space-y-1.5 max-w-xl">
                <p className="text-xs font-bold">URL de Notification Webhook iKeePay (à coller dans votre compte iKeePay) :</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="px-2 py-1 rounded bg-muted font-mono text-[11px] select-all flex-1 truncate">
                    https://api.livefx-trading.com/api/subscriptions/webhook/ikeepay
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText('https://api.livefx-trading.com/api/subscriptions/webhook/ikeepay');
                      toast.success('URL Webhook iKeePay copiée !');
                    }}
                  >
                    Copier Webhook
                  </Button>
                </div>
              </div>

              <div className="space-y-3 max-w-xl">
                <div>
                  <label className="text-xs font-semibold block mb-1">Clé Publique iKeePay (pk) * :</label>
                  <Input
                    type="text"
                    placeholder="pk_live_cc90c4cc40f2437a80b0b88dd3b8bd3b"
                    value={ikeepayPublicKeyInput}
                    onChange={(e) => setIkeepayPublicKeyInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Clé Secrète iKeePay (sk - Optionnel) :</label>
                  <Input
                    type="password"
                    placeholder="sk_live_..."
                    value={ikeepaySecretKeyInput}
                    onChange={(e) => setIkeepaySecretKeyInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="pt-1 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleSaveIkeepayKeys}
                    disabled={savingSettings}
                    className="gap-1.5"
                  >
                    {savingSettings ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Enregistrer & Activer iKeePay
                  </Button>
                  {(branding.ikeepay_public_key || ikeepayPublicKeyInput || ikeepaySecretKeyInput) && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleClearIkeepayKeys}
                      disabled={savingSettings}
                      className="gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer les clés iKeePay
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Configuration SEBPAY */}
            <div className={`rounded-2xl border-2 p-5 space-y-4 transition-all ${activeGatewayInput === 'sebpay' ? 'border-primary/50 bg-primary/5' : 'border-border bg-card/60'}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Paramètres & Clés API SEBPAY</span>
                </h4>
                {branding.sebpay_public_key && (
                  <span className="text-xs text-emerald-600 font-bold">● Clés SEBPAY enregistrées</span>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2 max-w-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      ⚠️ Adresse IP du serveur à autoriser dans SEBPAY (Clés API &gt; Adresses IP autorisées) :
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-2.5 py-1 rounded bg-background border font-mono text-xs font-bold text-primary select-all">
                      57.129.148.42
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText('57.129.148.42');
                        toast.success('Adresse IP copiée : 57.129.148.42');
                      }}
                    >
                      Copier l'IP
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      onClick={async () => {
                        try {
                          const res = await api.post('/subscriptions/admin/test-sebpay', {
                            sebpay_public_key: sebpayPublicKeyInput,
                            sebpay_secret_key: sebpaySecretKeyInput,
                          });
                          alert(res.data?.message || 'Test effectué.');
                        } catch (err) {
                          alert(err.response?.data?.message || 'Erreur lors du test SEBPAY');
                        }
                      }}
                    >
                      Tester SEBPAY
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-w-xl">
                <div>
                  <label className="text-xs font-semibold block mb-1">Clé Publique SEBPAY (X-Public-Key) :</label>
                  <Input
                    type="text"
                    placeholder="pub_live_..."
                    value={sebpayPublicKeyInput}
                    onChange={(e) => setSebpayPublicKeyInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Clé Secrète SEBPAY (X-Secret-Key) :</label>
                  <Input
                    type="password"
                    placeholder="sec_live_..."
                    value={sebpaySecretKeyInput}
                    onChange={(e) => setSebpaySecretKeyInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="pt-1 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleSaveSebpayKeys}
                    disabled={savingSettings}
                    className="gap-1.5"
                  >
                    {savingSettings ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Enregistrer les clés SEBPAY
                  </Button>
                  {(branding.sebpay_public_key || sebpayPublicKeyInput || sebpaySecretKeyInput) && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleClearSebpayKeys}
                      disabled={savingSettings}
                      className="gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer les clés SEBPAY
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gestion des Liens Brokers Partenaires (avec Logo optionnel) */}
        <Card className="border-2 border-primary/40 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-primary" /> Gestion des Liens Brokers Partenaires (Élèves & Formateurs)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Ajoutez les liens d'affiliation de vos brokers recommandés ainsi que leur logo (optionnel). Ces brokers s'afficheront automatiquement dans la page <strong>Lien Brokers</strong> des espaces Élèves et Formateurs.
            </p>

            {/* Formulaire d'ajout / modification d'un Broker */}
            <form onSubmit={handleSaveBroker} className="rounded-2xl border bg-muted/20 p-4 sm:p-5 space-y-4 max-w-2xl">
              <h4 className="font-bold text-sm sm:text-base">
                {editingBrokerId ? 'Modifier le Broker sélectionné' : '+ Ajouter un nouveau Broker Partenaire'}
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Nom du Broker *</label>
                  <Input
                    required
                    placeholder="Ex: Exness, Deriv, XM, Vantage..."
                    value={brokerForm.name}
                    onChange={(e) => setBrokerForm({ ...brokerForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Lien du Broker (URL d'affiliation) *</label>
                  <Input
                    required
                    placeholder="https://..."
                    value={brokerForm.url}
                    onChange={(e) => setBrokerForm({ ...brokerForm, url: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Description / Avantages (Optionnel)</label>
                <Input
                  placeholder="Ex: Spreads dès 0.0, Dépôts et retraits Mobile Money instantanés..."
                  value={brokerForm.description}
                  onChange={(e) => setBrokerForm({ ...brokerForm, description: e.target.value })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Logo du Broker — Fichier image (Optionnel)</label>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => setBrokerLogoFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Ou URL directe du Logo (Optionnel)</label>
                  <Input
                    placeholder="https://.../logo.png (facultatif)"
                    value={brokerForm.logo_url}
                    onChange={(e) => setBrokerForm({ ...brokerForm, logo_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" disabled={savingBroker} className="gap-1.5">
                  {savingBroker ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  <span>{editingBrokerId ? 'Mettre à jour le Broker' : 'Ajouter ce Broker'}</span>
                </Button>
                {editingBrokerId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingBrokerId(null);
                      setBrokerForm({ name: '', url: '', description: '', logo_url: '' });
                      setBrokerLogoFile(null);
                    }}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </form>

            {/* Liste des Brokers enregistrés */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm">
                Brokers actuellement publiés ({brokersList.length})
              </h4>
              {brokersList.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Aucun broker personnalisé ajouté pour le moment. Utilisez le formulaire ci-dessus pour ajouter vos brokers.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {brokersList.map((brk) => (
                    <div key={brk.id} className="rounded-xl border bg-card p-4 flex flex-col justify-between gap-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-xl border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
                          {brk.logo_url ? (
                            <img src={assetUrl(brk.logo_url)} alt={brk.name} className="h-full w-full object-contain p-1" />
                          ) : (
                            <ExternalLink className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-sm truncate">{brk.name}</h5>
                          <a
                            href={brk.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-primary hover:underline truncate block font-mono"
                          >
                            {brk.url}
                          </a>
                          {brk.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{brk.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                          onClick={() => {
                            setEditingBrokerId(brk.id);
                            setBrokerForm({
                              name: brk.name || '',
                              url: brk.url || '',
                              description: brk.description || '',
                              logo_url: brk.logo_url || ''
                            });
                            setBrokerLogoFile(null);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Modifier
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs"
                          onClick={() => handleDeleteBroker(brk.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuration du Pourcentage Global de Parrainage */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" /> Pourcentage Global de Parrainage (Affiliation)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pourcentage par défaut reversé aux membres actifs lorsqu'un de leurs filleuls souscrit à un plan mensuel (par défaut : 10%). Vous pouvez aussi ajuster un pourcentage spécifique par utilisateur dans l'onglet <strong>Parrainage & Commissions</strong>.
            </p>
            <div className="flex items-center gap-3 max-w-sm">
              <Input
                type="number"
                min="1"
                max="100"
                value={referralPercentageInput}
                onChange={(e) => setReferralPercentageInput(e.target.value)}
                className="w-28 text-center font-bold"
              />
              <span className="font-bold text-lg">%</span>
              <Button
                onClick={handleSaveReferralPercentage}
                disabled={savingSettings}
                className="gap-1.5"
              >
                {savingSettings ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Mettre à jour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Section: Statistics Only
  const renderStatistics = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> {t('statistics.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{stats?.new_count || 0}</p>
            <p className="text-sm text-muted-foreground">{t('dashboard.newProspects')}</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{stats?.contacted_count || 0}</p>
            <p className="text-sm text-muted-foreground">{t('dashboard.contacted')}</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{stats?.converted_count || 0}</p>
            <p className="text-sm text-muted-foreground">{t('dashboard.converted')}</p>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{stats?.rejected_count || 0}</p>
            <p className="text-sm text-muted-foreground">{t('dashboard.rejected')}</p>
          </div>
        </div>
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">{t('statistics.globalProgress')}</span>
            <span className="text-sm text-muted-foreground">
              {stats?.conversion_rate || 0}% {t('statistics.conversion')}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${stats?.conversion_rate || 0}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Section: Email Guide
  const renderEmailGuide = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" /> {t('emailGuide.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="prose dark:prose-invert max-w-none">
        <h4>{t('emailGuide.subtitle')} (ex: contact@livefx-trading.com)</h4>
        <ol className="space-y-2">
          <li>{t('emailGuide.step1')}</li>
          <li>{t('emailGuide.step2')}</li>
          <li>{t('emailGuide.step3')}</li>
          <li>{t('emailGuide.step4')}</li>
        </ol>
      </CardContent>
    </Card>
  );

  // Section: Trainers Management
  const renderTrainers = () => (
    <div className="space-y-6">
      {/* Trainer Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Formateurs</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainerStats?.total_trainers || 0}</div>
            <p className="text-xs text-muted-foreground">+{trainerStats?.new_this_month || 0} ce mois</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validés</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{trainerStats?.verified_trainers || 0}</div>
            <p className="text-xs text-muted-foreground">Formateurs actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{trainerStats?.pending_trainers || 0}</div>
            <p className="text-xs text-muted-foreground">À valider</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux Validation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trainerStats?.total_trainers > 0 
                ? Math.round((trainerStats?.verified_trainers / trainerStats?.total_trainers) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Approuvés</p>
          </CardContent>
        </Card>
      </div>

      {/* Trainers List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Gestion des Formateurs
            </CardTitle>
            <div className="flex gap-2">
              <select 
                value={trainerFilter} 
                onChange={(e) => setTrainerFilter(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-background"
              >
                <option value="all">Tous</option>
                <option value="verified">Validés</option>
                <option value="pending">En attente</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => { fetchTrainers(); fetchTrainerStats(); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trainers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun formateur inscrit pour le moment.
            </div>
          ) : (
            <div className="space-y-4">
              {trainers.map((trainer) => (
                <div 
                  key={trainer.id} 
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{trainer.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{trainer.specialty || 'Spécialité non définie'}</p>
                        </div>
                        {trainer.is_verified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3" /> Validé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3" /> En attente
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1 ml-13">
                        <p className="flex items-center gap-2">
                          <Mail className="h-3 w-3" /> {trainer.email}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-3 w-3" /> {trainer.phone || 'Non renseigné'}
                        </p>
                        <p className="flex items-center gap-2">
                          <Lightbulb className="h-3 w-3" /> {trainer.strategies_count || 0} stratégie(s)
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" /> Inscrit le {new Date(trainer.created_at).toLocaleDateString('fr-FR')}
                        </p>
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${trainer.is_referral_enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <Share2 className="h-3 w-3" />
                            {trainer.is_referral_enabled
                              ? `Parrainage Actif (${trainer.custom_referral_percentage || branding.referral_percentage || 10}%) - Code: ${trainer.referral_code || 'Généré'}`
                              : 'Parrainage Inactif'}
                          </span>
                          {trainer.has_active_subscription && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              <Gift className="h-3 w-3" />
                              Abonnement Actif ({trainer.subscription_plan_name || 'VIP'}) jusqu'au {new Date(trainer.subscription_expires_at).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          size="sm"
                          variant={trainer.is_referral_enabled ? "outline" : "default"}
                          className="text-xs gap-1.5"
                          onClick={() => {
                            const newStatus = !trainer.is_referral_enabled;
                            let custom = null;
                            if (newStatus) {
                              const input = window.prompt("Pourcentage de parrainage pour ce formateur (% ou vide pour défaut) :", trainer.custom_referral_percentage || branding.referral_percentage || "10");
                              if (input === null) return;
                              custom = input.trim() ? Number(input) : null;
                            }
                            handleToggleUserReferral(trainer.id, newStatus, custom);
                          }}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          {trainer.is_referral_enabled ? "Désactiver Parrainage" : "Activer Parrainage"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
                          onClick={() => handleGrantFreeMonth(trainer.id, trainer.full_name)}
                        >
                          <Gift className="h-3.5 w-3.5" />
                          +1 Mois Gratuit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedTrainer(trainer);
                            fetchTrainerDetails(trainer.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Voir détails
                        </Button>
                      </div>
                      <div className="flex gap-2 justify-end">
                        {!trainer.is_verified ? (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleVerifyTrainer(trainer.id, true)}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-yellow-600 hover:bg-yellow-50"
                            onClick={() => handleVerifyTrainer(trainer.id, false)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteTrainer(trainer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trainer Details Modal */}
      {selectedTrainer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Fiche Formateur: {selectedTrainer.full_name}</h2>
              <Button variant="ghost" size="icon" onClick={() => { setSelectedTrainer(null); setTrainerDetails(null); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {loadingTrainerDetails ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : trainerDetails ? (
              <div className="p-6 space-y-6">
                {/* Registration Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" /> Fiche d'Inscription
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Nom complet</p>
                      <p className="font-medium">{trainerDetails.trainer.full_name}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{trainerDetails.trainer.email}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <p className="font-medium">{trainerDetails.trainer.phone || 'Non renseigné'}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Date d'inscription</p>
                      <p className="font-medium">{new Date(trainerDetails.trainer.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Spécialité</p>
                      <p className="font-medium">{trainerDetails.trainer.specialty || 'Non définie'}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Années d'expérience</p>
                      <p className="font-medium">{trainerDetails.trainer.years_experience || 0} ans</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Certifications</p>
                      <p className="font-medium">{trainerDetails.trainer.certifications || 'Aucune'}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Statut</p>
                      <p className={`font-medium ${trainerDetails.trainer.is_verified ? 'text-green-600' : 'text-yellow-600'}`}>
                        {trainerDetails.trainer.is_verified ? '✓ Validé' : '⏳ En attente'}
                      </p>
                    </div>
                  </div>
                  
                  {trainerDetails.trainer.bio && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Bio / Présentation</p>
                      <p>{trainerDetails.trainer.bio}</p>
                    </div>
                  )}

                  {/* Social Links */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {trainerDetails.trainer.linkedin && (
                      <a href={trainerDetails.trainer.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-600 rounded-full text-sm">
                        <ExternalLink className="h-3 w-3" /> LinkedIn
                      </a>
                    )}
                    {trainerDetails.trainer.twitter && (
                      <a href={trainerDetails.trainer.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-100 text-sky-600 rounded-full text-sm">
                        <ExternalLink className="h-3 w-3" /> Twitter
                      </a>
                    )}
                    {trainerDetails.trainer.youtube && (
                      <a href={trainerDetails.trainer.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 rounded-full text-sm">
                        <ExternalLink className="h-3 w-3" /> YouTube
                      </a>
                    )}
                    {trainerDetails.trainer.myfxbook && (
                      <a href={trainerDetails.trainer.myfxbook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-600 rounded-full text-sm">
                        <ExternalLink className="h-3 w-3" /> MyFxBook
                      </a>
                    )}
                  </div>
                </div>

                {/* Strategies */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" /> Stratégies de Trading ({trainerDetails.strategies.length})
                  </h3>
                  {trainerDetails.strategies.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Aucune stratégie enregistrée</p>
                  ) : (
                    <div className="space-y-4">
                      {trainerDetails.strategies.map((strategy) => (
                        <div key={strategy.id} className="border rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{strategy.name}</h4>
                            {strategy.market_type && (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{strategy.market_type}</span>
                            )}
                            {strategy.timeframe && (
                              <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">{strategy.timeframe}</span>
                            )}
                          </div>
                          {strategy.description && (
                            <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            {strategy.risk_reward_ratio && (
                              <div>
                                <p className="text-muted-foreground">R/R Ratio</p>
                                <p className="font-medium">{strategy.risk_reward_ratio}</p>
                              </div>
                            )}
                            {strategy.win_rate && (
                              <div>
                                <p className="text-muted-foreground">Win Rate</p>
                                <p className="font-medium">{strategy.win_rate}</p>
                              </div>
                            )}
                          </div>
                          {(strategy.entry_criteria || strategy.exit_criteria || strategy.risk_management) && (
                            <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              {strategy.entry_criteria && (
                                <div>
                                  <p className="font-medium text-muted-foreground">Critères d'entrée</p>
                                  <p>{strategy.entry_criteria}</p>
                                </div>
                              )}
                              {strategy.exit_criteria && (
                                <div>
                                  <p className="font-medium text-muted-foreground">Critères de sortie</p>
                                  <p>{strategy.exit_criteria}</p>
                                </div>
                              )}
                              {strategy.risk_management && (
                                <div>
                                  <p className="font-medium text-muted-foreground">Gestion du risque</p>
                                  <p>{strategy.risk_management}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  <Button
                    variant={trainerDetails.trainer.is_referral_enabled ? "outline" : "default"}
                    className="gap-1.5"
                    onClick={() => {
                      const newStatus = !trainerDetails.trainer.is_referral_enabled;
                      let custom = null;
                      if (newStatus) {
                        const input = window.prompt("Pourcentage de parrainage pour ce formateur (% ou vide pour défaut) :", trainerDetails.trainer.custom_referral_percentage || branding.referral_percentage || "10");
                        if (input === null) return;
                        custom = input.trim() ? Number(input) : null;
                      }
                      handleToggleUserReferral(trainerDetails.trainer.id, newStatus, custom);
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                    {trainerDetails.trainer.is_referral_enabled ? "Désactiver Lien Parrainage" : "Activer Lien Parrainage"}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
                    onClick={() => handleGrantFreeMonth(trainerDetails.trainer.id, trainerDetails.trainer.full_name)}
                  >
                    <Gift className="h-4 w-4" />
                    Activer 1 Mois Gratuit
                  </Button>
                  {!trainerDetails.trainer.is_verified ? (
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleVerifyTrainer(trainerDetails.trainer.id, true)}
                    >
                      <UserCheck className="h-4 w-4 mr-2" /> Approuver ce formateur
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleVerifyTrainer(trainerDetails.trainer.id, false)}
                    >
                      <UserX className="h-4 w-4 mr-2" /> Révoquer la validation
                    </Button>
                  )}
                  <Button 
                    variant="destructive"
                    onClick={() => handleDeleteTrainer(trainerDetails.trainer.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );

  // Section: Consultation Sheets Management
  const renderConsultationSheets = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fiches</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consultationStats?.total_sheets || 0}</div>
            <p className="text-xs text-muted-foreground">+{consultationStats?.new_this_week || 0} cette semaine</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{consultationStats?.pending_sheets || 0}</div>
            <p className="text-xs text-muted-foreground">À examiner</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Révision</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{consultationStats?.reviewed_sheets || 0}</div>
            <p className="text-xs text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approuvées</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{consultationStats?.approved_sheets || 0}</div>
            <p className="text-xs text-muted-foreground">Validées</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejetées</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{consultationStats?.rejected_sheets || 0}</div>
            <p className="text-xs text-muted-foreground">Non validées</p>
          </CardContent>
        </Card>
      </div>

      {/* Sheets List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" /> Fiches de Consultation Formateurs
            </CardTitle>
            <div className="flex gap-2">
              <select 
                value={consultationFilter} 
                onChange={(e) => setConsultationFilter(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-background"
              >
                <option value="all">Toutes</option>
                <option value="pending">En attente</option>
                <option value="reviewed">En révision</option>
                <option value="approved">Approuvées</option>
                <option value="rejected">Rejetées</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => { fetchConsultationSheets(); fetchConsultationStats(); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {consultationSheets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune fiche de consultation reçue pour le moment.
            </div>
          ) : (
            <div className="space-y-4">
              {consultationSheets.map((sheet) => (
                <div 
                  key={sheet.id} 
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{sheet.trainer_name}</h4>
                          <p className="text-sm text-muted-foreground">{sheet.specialty || 'Spécialité non définie'}</p>
                        </div>
                        {(sheet.status === 'submitted' || sheet.status === 'pending') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Clock className="h-3 w-3" /> En attente
                          </span>
                        )}
                        {sheet.status === 'reviewed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertCircle className="h-3 w-3" /> En révision
                          </span>
                        )}
                        {sheet.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3" /> Approuvée
                          </span>
                        )}
                        {sheet.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3" /> Rejetée
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1 ml-13">
                        <p className="flex items-center gap-2">
                          <Mail className="h-3 w-3" /> {sheet.trainer_email}
                        </p>
                        <p className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3" /> Style: {sheet.trading_style || 'Non précisé'}
                        </p>
                        <p className="flex items-center gap-2">
                          <Lightbulb className="h-3 w-3" /> {sheet.strategies_count || 0} stratégie(s)
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" /> Soumise le {new Date(sheet.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedSheet(sheet);
                          fetchSheetDetails(sheet.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Voir la fiche
                      </Button>
                      {(sheet.status === 'submitted' || sheet.status === 'pending') && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleReviewSheet(sheet.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleReviewSheet(sheet.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet Details Modal */}
      {selectedSheet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-primary" />
                Fiche de Consultation: {selectedSheet.trainer_name}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => { setSelectedSheet(null); setSheetDetails(null); setAdminNotes(''); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {loadingSheetDetails ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : sheetDetails ? (
              <div className="p-6 space-y-6">
                {/* Trainer Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" /> Informations du Formateur
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Nom complet</p>
                      <p className="font-medium">{sheetDetails.sheet.trainer_name}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{sheetDetails.sheet.trainer_email}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <p className="font-medium">{sheetDetails.sheet.trainer_phone || 'Non renseigné'}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Spécialité</p>
                      <p className="font-medium">{sheetDetails.sheet.specialty || 'Non définie'}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Expérience</p>
                      <p className="font-medium">{sheetDetails.sheet.years_experience || 0} ans</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Certifications</p>
                      <p className="font-medium">{sheetDetails.sheet.certifications || 'Aucune'}</p>
                    </div>
                  </div>
                  {sheetDetails.sheet.bio && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Bio</p>
                      <p>{sheetDetails.sheet.bio}</p>
                    </div>
                  )}
                </div>

                {/* Trading Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" /> Informations de Trading
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Style de trading</p>
                      <p className="font-medium text-blue-700 dark:text-blue-400">{sheetDetails.sheet.trading_style || 'Non précisé'}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Sessions préférées</p>
                      <p className="font-medium text-blue-700 dark:text-blue-400">{sheetDetails.sheet.preferred_sessions || 'Non précisé'}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Capital</p>
                      <p className="font-medium text-blue-700 dark:text-blue-400">{sheetDetails.sheet.capital_range || 'Non précisé'}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Objectif mensuel</p>
                      <p className="font-medium text-blue-700 dark:text-blue-400">{sheetDetails.sheet.monthly_target || 'Non précisé'}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Drawdown max</p>
                      <p className="font-medium text-blue-700 dark:text-blue-400">{sheetDetails.sheet.max_drawdown || 'Non précisé'}</p>
                    </div>
                  </div>
                </div>

                {/* Experience & Journey */}
                {(sheetDetails.sheet.trading_journey || sheetDetails.sheet.biggest_challenges || sheetDetails.sheet.key_learnings) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Briefcase className="h-5 w-5" /> Expérience et Parcours
                    </h3>
                    <div className="space-y-4">
                      {sheetDetails.sheet.trading_journey && (
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium mb-2">Parcours de trading</p>
                          <p className="text-muted-foreground">{sheetDetails.sheet.trading_journey}</p>
                        </div>
                      )}
                      {sheetDetails.sheet.biggest_challenges && (
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium mb-2">Plus grands défis</p>
                          <p className="text-muted-foreground">{sheetDetails.sheet.biggest_challenges}</p>
                        </div>
                      )}
                      {sheetDetails.sheet.key_learnings && (
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium mb-2">Apprentissages clés</p>
                          <p className="text-muted-foreground">{sheetDetails.sheet.key_learnings}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Teaching Approach */}
                {(sheetDetails.sheet.teaching_approach || sheetDetails.sheet.target_audience || sheetDetails.sheet.unique_value) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Award className="h-5 w-5" /> Approche Pédagogique
                    </h3>
                    <div className="space-y-4">
                      {sheetDetails.sheet.teaching_approach && (
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium mb-2">Approche d'enseignement</p>
                          <p className="text-muted-foreground">{sheetDetails.sheet.teaching_approach}</p>
                        </div>
                      )}
                      {sheetDetails.sheet.target_audience && (
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium mb-2">Public cible</p>
                          <p className="text-muted-foreground">{sheetDetails.sheet.target_audience}</p>
                        </div>
                      )}
                      {sheetDetails.sheet.unique_value && (
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium mb-2">Valeur ajoutée unique</p>
                          <p className="text-muted-foreground">{sheetDetails.sheet.unique_value}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Availability */}
                {(sheetDetails.sheet.availability || sheetDetails.sheet.preferred_platforms) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5" /> Disponibilité
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sheetDetails.sheet.availability && (
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium mb-2">Disponibilité</p>
                          <p className="text-muted-foreground">{sheetDetails.sheet.availability}</p>
                        </div>
                      )}
                      {sheetDetails.sheet.preferred_platforms && (
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium mb-2">Plateformes préférées</p>
                          <p className="text-muted-foreground">{sheetDetails.sheet.preferred_platforms}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Goals */}
                {(sheetDetails.sheet.platform_goals || sheetDetails.sheet.additional_info) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Target className="h-5 w-5" /> Objectifs
                    </h3>
                    <div className="space-y-4">
                      {sheetDetails.sheet.platform_goals && (
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium mb-2">Objectifs sur la plateforme</p>
                          <p className="text-muted-foreground">{sheetDetails.sheet.platform_goals}</p>
                        </div>
                      )}
                      {sheetDetails.sheet.additional_info && (
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium mb-2">Informations supplémentaires</p>
                          <p className="text-muted-foreground">{sheetDetails.sheet.additional_info}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Strategies */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" /> Stratégies de Trading ({sheetDetails.strategies.length})
                  </h3>
                  {sheetDetails.strategies.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 bg-muted/50 rounded-lg">Aucune stratégie enregistrée</p>
                  ) : (
                    <div className="space-y-4">
                      {sheetDetails.strategies.map((strategy) => (
                        <div key={strategy.id} className="border rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{strategy.name}</h4>
                            {strategy.market_type && (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{strategy.market_type}</span>
                            )}
                            {strategy.timeframe && (
                              <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">{strategy.timeframe}</span>
                            )}
                          </div>
                          {strategy.description && (
                            <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            {strategy.risk_reward_ratio && (
                              <div>
                                <p className="text-muted-foreground">R/R Ratio</p>
                                <p className="font-medium">{strategy.risk_reward_ratio}</p>
                              </div>
                            )}
                            {strategy.win_rate && (
                              <div>
                                <p className="text-muted-foreground">Win Rate</p>
                                <p className="font-medium">{strategy.win_rate}</p>
                              </div>
                            )}
                          </div>
                          {(strategy.entry_criteria || strategy.exit_criteria || strategy.risk_management) && (
                            <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              {strategy.entry_criteria && (
                                <div>
                                  <p className="font-medium text-muted-foreground">Critères d'entrée</p>
                                  <p>{strategy.entry_criteria}</p>
                                </div>
                              )}
                              {strategy.exit_criteria && (
                                <div>
                                  <p className="font-medium text-muted-foreground">Critères de sortie</p>
                                  <p>{strategy.exit_criteria}</p>
                                </div>
                              )}
                              {strategy.risk_management && (
                                <div>
                                  <p className="font-medium text-muted-foreground">Gestion du risque</p>
                                  <p>{strategy.risk_management}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div className="flex flex-wrap gap-2">
                  {sheetDetails.sheet.linkedin && (
                    <a href={sheetDetails.sheet.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-600 rounded-full text-sm">
                      <ExternalLink className="h-3 w-3" /> LinkedIn
                    </a>
                  )}
                  {sheetDetails.sheet.twitter && (
                    <a href={sheetDetails.sheet.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-100 text-sky-600 rounded-full text-sm">
                      <ExternalLink className="h-3 w-3" /> Twitter
                    </a>
                  )}
                  {sheetDetails.sheet.youtube && (
                    <a href={sheetDetails.sheet.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 rounded-full text-sm">
                      <ExternalLink className="h-3 w-3" /> YouTube
                    </a>
                  )}
                  {sheetDetails.sheet.myfxbook && (
                    <a href={sheetDetails.sheet.myfxbook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-600 rounded-full text-sm">
                      <ExternalLink className="h-3 w-3" /> MyFxBook
                    </a>
                  )}
                </div>

                {/* Admin Notes */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" /> Notes Admin
                  </h3>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ajoutez vos notes ou commentaires pour ce formateur..."
                    className="w-full border rounded-md p-3 bg-background min-h-[100px]"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t">
                  {sheetDetails.sheet.status !== 'approved' && (
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleReviewSheet(sheetDetails.sheet.id, 'approved')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Approuver cette fiche
                    </Button>
                  )}
                  {sheetDetails.sheet.status !== 'rejected' && (
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => handleReviewSheet(sheetDetails.sheet.id, 'rejected')}
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Rejeter
                    </Button>
                  )}
                  {sheetDetails.sheet.status === 'submitted' && (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleReviewSheet(sheetDetails.sheet.id, 'reviewed')}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" /> Marquer en révision
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );

  // Section: Users Management
  const renderUsers = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersStats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">+{usersStats?.new_this_week || 0} cette semaine</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Élèves (Clients)</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{usersStats?.total_clients || 0}</div>
            <p className="text-xs text-muted-foreground">Inscrits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formateurs</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{usersStats?.total_trainers || 0}</div>
            <p className="text-xs text-muted-foreground">Enregistrés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux ce mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{usersStats?.new_this_month || 0}</div>
            <p className="text-xs text-muted-foreground">Inscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Liste des Utilisateurs Inscrits
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <select 
                value={userFilter} 
                onChange={(e) => setUserFilter(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-background"
              >
                <option value="all">Tous</option>
                <option value="client">Élèves</option>
                <option value="trainer">Formateurs</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => { fetchUsers(); fetchUsersStats(); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun utilisateur trouvé.
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((u) => (
                <div key={u.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${u.role === 'trainer' ? 'bg-green-100' : 'bg-blue-100'}`}>
                          {u.role === 'trainer' ? <GraduationCap className="h-5 w-5 text-green-600" /> : <User className="h-5 w-5 text-blue-600" />}
                        </div>
                        <div>
                          <h4 className="font-semibold">{u.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{u.role === 'trainer' ? 'Formateur' : 'Élève'}</p>
                        </div>
                        {u.role === 'trainer' && (
                          u.is_verified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3" /> Vérifié
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3" /> En attente
                            </span>
                          )
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1 ml-13">
                        <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {u.email}</p>
                        <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {u.phone || 'Non renseigné'}</p>
                        {u.specialty && <p className="flex items-center gap-2"><Lightbulb className="h-3 w-3" /> {u.specialty}</p>}
                        <p className="flex items-center gap-2"><Calendar className="h-3 w-3" /> Inscrit le {new Date(u.created_at).toLocaleDateString('fr-FR')}</p>
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_referral_enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <Share2 className="h-3 w-3" />
                            {u.is_referral_enabled ? `Parrainage Actif (${u.custom_referral_percentage || branding.referral_percentage || 10}%) - Code: ${u.referral_code || 'Généré'}` : 'Parrainage Inactif'}
                          </span>
                          {u.has_active_subscription ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              <Gift className="h-3 w-3" />
                              Abonnement Actif ({u.subscription_plan_name || 'VIP'}) jusqu'au {new Date(u.subscription_expires_at).toLocaleDateString('fr-FR')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                              <CreditCard className="h-3 w-3" />
                              Aucun abonnement actif
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
                        onClick={() => handleGrantFreeMonth(u.id, u.full_name)}
                      >
                        <Gift className="h-3.5 w-3.5" />
                        +1 Mois Gratuit
                      </Button>
                      {u.has_active_subscription && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1 text-amber-600 border-amber-500/30 hover:bg-amber-50"
                          onClick={() => handleRevokeSubscription(u.id, u.full_name)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Révoquer Abo
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={u.is_referral_enabled ? "outline" : "default"}
                        className="text-xs gap-1.5"
                        onClick={() => {
                          const newStatus = !u.is_referral_enabled;
                          let custom = null;
                          if (newStatus) {
                            const input = window.prompt("Pourcentage de parrainage pour cet utilisateur (% ou vide pour défaut) :", u.custom_referral_percentage || branding.referral_percentage || "10");
                            if (input === null) return;
                            custom = input.trim() ? Number(input) : null;
                          }
                          handleToggleUserReferral(u.id, newStatus, custom);
                        }}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        {u.is_referral_enabled ? "Désactiver Parrainage" : "Activer Parrainage"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Section: Fil d'actualité Management (Vidéos & Images)
  const renderAnnouncements = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Publications</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcementStats?.total_videos || 0}</div>
            <p className="text-xs text-muted-foreground">+{announcementStats?.new_this_week || 0} cette semaine</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publications Actives</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{announcementStats?.active_videos || 0}</div>
            <p className="text-xs text-muted-foreground">Visibles dans le fil</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vues Totales</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{announcementStats?.total_views || 0}</div>
            <p className="text-xs text-muted-foreground">Lectures / Vues</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action</CardTitle>
            <Upload className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Publier une vidéo ou image dans le fil</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Publier dans le Fil d'actualité (Vidéo ou Image)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUploadAnnouncement} className="space-y-4">
            {/* Sélecteur de type de média */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Type de publication *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMediaType('video')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    mediaType === 'video'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Video className="h-4 w-4" />
                  <span>Vidéo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('image')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    mediaType === 'image'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Image (Photo / Bannière)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Titre de la publication *</label>
                <Input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder={mediaType === 'video' ? "Ex: Nouvelle session live & analyse..." : "Ex: Graphique d'analyse EUR/USD du jour..."}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Fichier {mediaType === 'video' ? 'vidéo (MP4, WEBM, MOV)' : 'image (PNG, JPG, WEBP)'} *
                </label>
                <Input
                  ref={videoFileInputRef}
                  type="file"
                  accept={mediaType === 'video' ? "video/*" : "image/*"}
                  onChange={(e) => setVideoFile(e.target.files[0])}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Ou URL directe du média (Optionnel)</label>
              <Input
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                placeholder="https://... (si vous préférez coller un lien direct d'image ou vidéo)"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description / Analyse</label>
              <textarea
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                className="w-full border rounded-md p-2 bg-background min-h-[90px]"
                placeholder="Détails, explications ou message accompagnant la publication..."
              />
            </div>

            <Button type="submit" disabled={uploadingVideo} className="w-full md:w-auto">
              {uploadingVideo ? (
                <span key="uploading" className="inline-flex items-center">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2 inline-block"></span>
                  <span>Publication en cours...</span>
                </span>
              ) : (
                <span key="idle" className="inline-flex items-center">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Publier dans le fil d'actualité</span>
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Posts List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" /> <span>Publications du Fil d'actualité ({announcements.length})</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => { fetchAnnouncements(); fetchAnnouncementStats(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune publication dans le fil d'actualité.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {announcements.map((post) => {
                const isImg = post.media_type === 'image' || /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(post.cloudinary_url || '');
                const postId = post.id || post._id;

                return (
                  <div key={postId} className="border rounded-lg overflow-hidden bg-card flex flex-col">
                    <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                      {isImg ? (
                        <img
                          key="img"
                          src={formatMediaUrl(post.cloudinary_url)}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          key="vid"
                          src={formatMediaUrl(post.cloudinary_url)}
                          poster={cloudinaryVideoThumb(formatMediaUrl(post.cloudinary_url)) || undefined}
                          preload="none"
                          playsInline
                          className="w-full h-full object-cover"
                          controls
                        />
                      )}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1">
                        <span key={isImg ? 'img-icon' : 'vid-icon'} className="inline-flex">
                          {isImg ? <ImageIcon className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                        </span>
                        <span>{isImg ? 'Image' : 'Vidéo'}</span>
                      </div>
                      {!post.is_active && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-0.5 rounded text-xs font-semibold">
                          Désactivée
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      {editingAnnouncement?.id === postId ? (
                        <div key="editing" className="space-y-2">
                          <Input
                            value={editingAnnouncement.title}
                            onChange={(e) => setEditingAnnouncement({...editingAnnouncement, title: e.target.value})}
                            placeholder="Titre"
                          />
                          <textarea
                            value={editingAnnouncement.description || ''}
                            onChange={(e) => setEditingAnnouncement({...editingAnnouncement, description: e.target.value})}
                            className="w-full border rounded-md p-2 bg-background text-sm"
                            placeholder="Description"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateAnnouncement(postId, editingAnnouncement)}>
                              Enregistrer
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingAnnouncement(null)}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div key="viewing">
                          <h4 className="font-semibold text-base">{post.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> <span>{post.view_count || 0} vues</span></span>
                            <span>{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" onClick={() => setEditingAnnouncement(post)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant={post.is_active ? "outline" : "default"}
                              onClick={() => handleToggleAnnouncement(postId)}
                            >
                              <span key={post.is_active ? 'pause' : 'play'} className="inline-flex">
                                {post.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </span>
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteAnnouncement(postId)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          {/* Commentaires & Réponses administrables */}
                          <AnnouncementInteractions video={post} isAdmin={true} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Section: Detailed Statistics
  const renderDetailedStatistics = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" /> Bilan Statistique Complet
        </h2>
        <p className="text-muted-foreground">Analysez votre progression dans le traitement des prospects</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{detailedStats?.summary?.total_count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{detailedStats?.summary?.new_count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contactés</CardTitle>
            <MessageSquare className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{detailedStats?.summary?.contacted_count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convertis</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{detailedStats?.summary?.converted_count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{detailedStats?.summary?.conversion_rate || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progression de Conversion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Taux de conversion global</span>
                <span className="text-sm text-muted-foreground">{detailedStats?.summary?.conversion_rate || 0}%</span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${detailedStats?.summary?.conversion_rate || 0}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 pt-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{detailedStats?.summary?.weekly_new || 0}</p>
                <p className="text-xs text-muted-foreground">Nouveaux (7j)</p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{detailedStats?.summary?.monthly_new || 0}</p>
                <p className="text-xs text-muted-foreground">Nouveaux (30j)</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{detailedStats?.summary?.monthly_converted || 0}</p>
                <p className="text-xs text-muted-foreground">Convertis (30j)</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{detailedStats?.summary?.rejected_count || 0}</p>
                <p className="text-xs text-muted-foreground">Rejetés</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Hebdomadaire (12 semaines)</CardTitle>
        </CardHeader>
        <CardContent>
          {detailedStats?.weekly?.length > 0 ? (
            <div className="space-y-2">
              {detailedStats.weekly.map((week, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="text-sm w-24">S{idx + 1}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ width: `${(week.converted / Math.max(week.total, 1)) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-gray-300" 
                      style={{ width: `${((week.total - week.converted) / Math.max(week.total, 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm w-20 text-right">{week.converted}/{week.total}</span>
                  <span className="text-sm w-16 text-right text-green-600">{week.rate}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">Pas encore de données</p>
          )}
        </CardContent>
      </Card>

      {/* Admin Performance */}
      {detailedStats?.adminPerformance?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance par Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {detailedStats.adminPerformance.map((admin, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{admin.admin_name}</p>
                      <p className="text-sm text-muted-foreground">{admin.total_handled} prospects traités</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-green-600">{admin.converted}</p>
                      <p className="text-xs text-muted-foreground">Convertis</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">{admin.rejected}</p>
                      <p className="text-xs text-muted-foreground">Rejetés</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={fetchDetailedStats}>
        <RefreshCw className="h-4 w-4 mr-2" /> Actualiser les statistiques
      </Button>
    </div>
  );

  // Section: Enhanced Email Guide
  const renderEnhancedEmailGuide = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" /> Configuration Email Professionnel
        </h2>
        <p className="text-muted-foreground">Configurez votre domaine pour envoyer des emails professionnels</p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Pourquoi un email professionnel ?</h3>
              <p className="text-muted-foreground mt-1">
                Un email comme <strong>contact@livefx-trading.com</strong> renforce la crédibilité 
                de votre académie et améliore la délivrabilité de vos messages.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">1</span>
              Acheter un domaine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Achetez votre domaine sur un registrar comme:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                <a href="https://www.namecheap.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Namecheap</a>
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                <a href="https://www.godaddy.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GoDaddy</a>
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                <a href="https://www.ovh.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OVH</a>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center">2</span>
              Service Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Utilisez un service email professionnel:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <strong>Google Workspace</strong> - 6€/mois/utilisateur
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <strong>Zoho Mail</strong> - Gratuit jusqu'à 5 utilisateurs
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <strong>Microsoft 365</strong> - 5,60€/mois/utilisateur
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-yellow-500 text-white text-sm flex items-center justify-center">3</span>
              Configuration DNS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Configurez les enregistrements DNS:
            </p>
            <div className="bg-muted/50 p-3 rounded-lg text-xs font-mono space-y-1">
              <p><strong>MX:</strong> mail.votredomaine.com</p>
              <p><strong>SPF:</strong> v=spf1 include:_spf.google.com ~all</p>
              <p><strong>DKIM:</strong> Fourni par votre service email</p>
              <p><strong>DMARC:</strong> v=DMARC1; p=quarantine</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center">4</span>
              Emails Suggérés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <strong>contact@livefx-trading.com</strong> - Principal
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <strong>support@livefx-trading.com</strong> - Support
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <strong>formation@livefx-trading.com</strong> - Formations
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <strong>noreply@livefx-trading.com</strong> - Automatiques
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Intégration avec l'Application</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Une fois votre email configuré, ajoutez ces variables d'environnement au backend:
          </p>
          <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm space-y-1">
            <p>SMTP_HOST=smtp.gmail.com</p>
            <p>SMTP_PORT=587</p>
            <p>SMTP_USER=contact@livefx-trading.com</p>
            <p>SMTP_PASS=votre_mot_de_passe_app</p>
            <p>FROM_EMAIL=contact@livefx-trading.com</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Section: Student Consultations
  const renderStudentConsultations = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fiches</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentConsultationStats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{studentConsultationStats?.pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Examinées</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{studentConsultationStats?.reviewed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contactés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{studentConsultationStats?.contacted || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{studentConsultationStats?.avg_satisfaction || '-'}/5</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={studentConsultationFilter}
          onChange={(e) => setStudentConsultationFilter(e.target.value)}
          className="border rounded-md px-3 py-2 bg-background"
        >
          <option value="all">Toutes les fiches</option>
          <option value="pending">En attente</option>
          <option value="reviewed">Examinées</option>
          <option value="contacted">Contactées</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => { fetchStudentConsultations(); fetchStudentConsultationStats(); }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Consultations List */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" /> Fiches de Consultation Élèves
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentConsultations.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucune fiche trouvée</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {studentConsultations.map((consultation) => (
                  <div
                    key={consultation.id}
                    onClick={() => {
                      setSelectedStudentConsultation(consultation);
                      setStudentAdminNotes(consultation.admin_notes || '');
                    }}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedStudentConsultation?.id === consultation.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{consultation.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{consultation.email}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        consultation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        consultation.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {consultation.status === 'pending' ? 'En attente' :
                         consultation.status === 'reviewed' ? 'Examinée' : 'Contacté'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Niveau: {consultation.academy_level || '-'}</span>
                      <span>Exp: {consultation.trading_experience || '-'}</span>
                      <span>⭐ {consultation.satisfaction_rating}/5</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(consultation.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Détails de la Fiche</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStudentConsultation ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {/* Personal Info */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Informations Personnelles</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Nom:</strong> {selectedStudentConsultation.full_name}</p>
                    <p><strong>Email:</strong> {selectedStudentConsultation.email}</p>
                    <p><strong>Tél:</strong> {selectedStudentConsultation.phone || '-'}</p>
                    <p><strong>Âge:</strong> {selectedStudentConsultation.age || '-'}</p>
                    <p><strong>Pays:</strong> {selectedStudentConsultation.country || '-'}</p>
                    <p><strong>Ville:</strong> {selectedStudentConsultation.city || '-'}</p>
                  </div>
                </div>

                {/* Trading Experience */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Expérience Trading</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Niveau:</strong> {selectedStudentConsultation.trading_experience}</p>
                    <p><strong>Durée:</strong> {selectedStudentConsultation.experience_duration || '-'}</p>
                    <p><strong>Broker:</strong> {selectedStudentConsultation.current_broker || '-'}</p>
                    <p><strong>Style:</strong> {selectedStudentConsultation.preferred_style || '-'}</p>
                    <p><strong>Compte démo:</strong> {selectedStudentConsultation.has_demo_account ? 'Oui' : 'Non'}</p>
                    <p><strong>Compte réel:</strong> {selectedStudentConsultation.has_real_account ? 'Oui' : 'Non'}</p>
                  </div>
                </div>

                {/* Goals */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Objectifs</h4>
                  <p className="text-sm mb-2">{selectedStudentConsultation.trading_goals || '-'}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Obj. mensuel:</strong> {selectedStudentConsultation.monthly_goal || '-'}</p>
                    <p><strong>Budget:</strong> {selectedStudentConsultation.investment_budget || '-'}</p>
                    <p><strong>Temps dispo:</strong> {selectedStudentConsultation.time_available || '-'}</p>
                  </div>
                </div>

                {/* Academy Progress */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Progression Académie</h4>
                  <div className="text-sm space-y-2">
                    <p><strong>Niveau:</strong> {selectedStudentConsultation.academy_level}</p>
                    <p><strong>Module actuel:</strong> {selectedStudentConsultation.current_module || '-'}</p>
                    <p><strong>Modules complétés:</strong> {selectedStudentConsultation.modules_completed || '-'}</p>
                    <p><strong>Difficultés:</strong> {selectedStudentConsultation.difficulties || '-'}</p>
                    <p><strong>Besoin d'aide:</strong> {selectedStudentConsultation.needs_help_with || '-'}</p>
                  </div>
                </div>

                {/* Feedback */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Feedback</h4>
                  <p className="text-sm mb-2"><strong>Satisfaction:</strong> ⭐ {selectedStudentConsultation.satisfaction_rating}/5</p>
                  <p className="text-sm mb-2">{selectedStudentConsultation.feedback || '-'}</p>
                  <p className="text-sm"><strong>Questions:</strong> {selectedStudentConsultation.questions || '-'}</p>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Notes Admin</label>
                  <textarea
                    value={studentAdminNotes}
                    onChange={(e) => setStudentAdminNotes(e.target.value)}
                    className="w-full border rounded-md p-2 bg-background min-h-[80px]"
                    placeholder="Ajouter des notes..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    onClick={() => handleReviewStudentConsultation(selectedStudentConsultation.id, 'reviewed')}
                    variant="outline"
                  >
                    <Eye className="h-4 w-4 mr-1" /> Marquer Examinée
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleReviewStudentConsultation(selectedStudentConsultation.id, 'contacted')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Contacté
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleDeleteStudentConsultation(selectedStudentConsultation.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez une fiche pour voir les détails</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Section: Vacation Programs
  const renderServicesAdmin = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6" /> Gestion des Services
        </h2>
        <Button onClick={() => { setEditingService(null); setServiceForm(emptyServiceForm); setShowServiceForm(true); }}>
          + Nouveau Service
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        Les services actifs s'affichent sur la page d'accueil et dans l'espace élève.
      </p>

      {/* Form */}
      {showServiceForm && (
        <Card>
          <CardHeader><CardTitle>{editingService ? 'Modifier' : 'Créer'} un Service</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitService} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Titre *</label>
                  <Input value={serviceForm.title} onChange={e => setServiceForm({ ...serviceForm, title: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Icône</label>
                  <select className="w-full border rounded-md p-2 bg-background" value={serviceForm.icon} onChange={e => setServiceForm({ ...serviceForm, icon: e.target.value })}>
                    {SERVICE_ICON_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Ordre d'affichage</label>
                  <Input type="number" value={serviceForm.order} onChange={e => setServiceForm({ ...serviceForm, order: e.target.value })} />
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <input type="checkbox" id="service-active" checked={serviceForm.is_active} onChange={e => setServiceForm({ ...serviceForm, is_active: e.target.checked })} />
                  <label htmlFor="service-active" className="text-sm font-medium">Actif</label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description courte</label>
                <textarea className="w-full border rounded-md p-2 bg-background min-h-[60px]" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Détails complets (affichés au clic sur le service)</label>
                <textarea className="w-full border rounded-md p-2 bg-background min-h-[100px]" value={serviceForm.details} onChange={e => setServiceForm({ ...serviceForm, details: e.target.value })} placeholder="Description détaillée du service..." />
              </div>

              <p className="text-sm font-semibold pt-2">Contacts</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">WhatsApp</label>
                  <Input value={serviceForm.whatsapp} onChange={e => setServiceForm({ ...serviceForm, whatsapp: e.target.value })} placeholder="+229 XX XX XX XX" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Téléphone</label>
                  <Input value={serviceForm.phone} onChange={e => setServiceForm({ ...serviceForm, phone: e.target.value })} placeholder="+229 XX XX XX XX" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input type="email" value={serviceForm.email} onChange={e => setServiceForm({ ...serviceForm, email: e.target.value })} placeholder="contact@exemple.com" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Telegram</label>
                  <Input value={serviceForm.telegram} onChange={e => setServiceForm({ ...serviceForm, telegram: e.target.value })} placeholder="@pseudo ou lien" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Lien externe (site, formulaire...)</label>
                  <Input value={serviceForm.link} onChange={e => setServiceForm({ ...serviceForm, link: e.target.value })} placeholder="https://..." />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">{editingService ? 'Mettre à jour' : 'Créer'}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowServiceForm(false); setEditingService(null); }}>Annuler</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.length === 0 ? (
          <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">Aucun service. Cliquez sur "Nouveau Service" pour commencer.</CardContent></Card>
        ) : services.map(service => {
          const Icon = getServiceIcon(service.icon);
          return (
            <Card key={service.id} className={!service.is_active ? 'opacity-60' : ''}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10">
                    <Icon className={`h-8 w-8 ${service.color || 'text-primary'}`} />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${service.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {service.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{service.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3">{service.description}</p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleEditService(service)}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => handleToggleService(service)}>
                    {service.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteService(service.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderVacationPrograms = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Programmes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{vacationStats?.total_programs || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Programmes Actifs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{vacationStats?.active_programs || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">À Venir</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{vacationStats?.upcoming_programs || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inscriptions</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-600">{(vacationStats?.pending_registrations || 0) + (vacationStats?.confirmed_registrations || 0)}</div></CardContent>
        </Card>
      </div>

      {/* Header + Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Programmes de Vacances</h2>
        <Button onClick={() => { setShowVacationForm(true); setEditingVacation(null); setVacationForm({ title: '', description: '', start_date: '', end_date: '', price: '', location: '', max_participants: 20, age_range: '' }); }}>
          + Nouveau Programme
        </Button>
      </div>

      {/* Form */}
      {showVacationForm && (
        <Card>
          <CardHeader><CardTitle>{editingVacation ? 'Modifier' : 'Créer'} un Programme</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitVacation} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Titre *</label>
                  <Input value={vacationForm.title} onChange={e => setVacationForm({...vacationForm, title: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Lieu</label>
                  <Input value={vacationForm.location} onChange={e => setVacationForm({...vacationForm, location: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Date début *</label>
                  <Input type="date" value={vacationForm.start_date} onChange={e => setVacationForm({...vacationForm, start_date: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Date fin *</label>
                  <Input type="date" value={vacationForm.end_date} onChange={e => setVacationForm({...vacationForm, end_date: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Prix (€)</label>
                  <Input type="number" value={vacationForm.price} onChange={e => setVacationForm({...vacationForm, price: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Tranche d'âge</label>
                  <Input placeholder="Ex: 8-12 ans" value={vacationForm.age_range} onChange={e => setVacationForm({...vacationForm, age_range: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Places max</label>
                  <Input type="number" value={vacationForm.max_participants} onChange={e => setVacationForm({...vacationForm, max_participants: parseInt(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea className="w-full border rounded-md p-2 bg-background min-h-[100px]" value={vacationForm.description} onChange={e => setVacationForm({...vacationForm, description: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingVacation ? 'Mettre à jour' : 'Créer'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowVacationForm(false)}>Annuler</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vacationPrograms.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">Aucun programme de vacances</CardContent>
          </Card>
        ) : vacationPrograms.map(program => (
          <Card key={program.id} className={!program.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{program.title}</CardTitle>
                <span className={`px-2 py-1 rounded-full text-xs ${program.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {program.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground line-clamp-2">{program.description}</p>
              <div className="text-sm space-y-1">
                <p><strong>📅</strong> {new Date(program.start_date).toLocaleDateString('fr-FR')} - {new Date(program.end_date).toLocaleDateString('fr-FR')}</p>
                {program.location && <p><strong>📍</strong> {program.location}</p>}
                {program.price && <p><strong>💰</strong> {program.price}€</p>}
                {program.age_range && <p><strong>👥</strong> {program.age_range}</p>}
                <p><strong>📊</strong> {program.registrations_count || 0} / {program.max_participants} inscrits</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => { setEditingVacation(program); setVacationForm({ title: program.title, description: program.description || '', start_date: program.start_date?.split('T')[0] || '', end_date: program.end_date?.split('T')[0] || '', price: program.price || '', location: program.location || '', max_participants: program.max_participants || 20, age_range: program.age_range || '' }); setShowVacationForm(true); }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleToggleVacation(program.id, program.is_active)}>
                  {program.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteVacation(program.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Registrations with payment proofs */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileCheck className="h-5 w-5" /> Inscriptions & Preuves de paiement
          </h2>
          <Button size="sm" variant="outline" onClick={fetchVacationRegistrations}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
          </Button>
        </div>
        {vacationRegistrations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">Aucune inscription pour le moment</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {vacationRegistrations.map(reg => (
              <Card key={reg.id}>
                <CardContent className="pt-6 space-y-2 text-sm">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-base">{reg.program_title || 'Programme Vacances'}</p>
                    <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">{reg.status || 'pending'}</span>
                  </div>
                  <p><strong>Élève :</strong> {reg.student_name || '-'} {reg.student_age ? `(${reg.student_age} ans)` : ''}</p>
                  <p><strong>Parent :</strong> {reg.parent_name || '-'}</p>
                  <p><strong>Email :</strong> {reg.parent_email || '-'}</p>
                  <p><strong>Téléphone :</strong> {reg.parent_phone || '-'}</p>
                  {reg.amount != null && <p><strong>Montant :</strong> {reg.amount} €</p>}
                  <p><strong>Date :</strong> {reg.created_at ? new Date(reg.created_at).toLocaleString('fr-FR') : '-'}</p>
                  {reg.payment_proof_url ? (
                    <a href={reg.payment_proof_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                      <FileCheck className="h-4 w-4" /> Voir la preuve de paiement
                    </a>
                  ) : (
                    <p className="text-muted-foreground italic">Aucune preuve de paiement fournie</p>
                  )}
                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateRegistrationStatus(reg.id, 'confirmed')}
                      disabled={reg.status === 'confirmed'}
                      className="gap-1"
                    >
                      <CheckCircle className="h-4 w-4" /> Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleUpdateRegistrationStatus(reg.id, 'cancelled')}
                      disabled={reg.status === 'cancelled'}
                      className="gap-1"
                    >
                      <XCircle className="h-4 w-4" /> Rejeter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Section: Emails
  const renderEmails = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Send className="h-6 w-6" /> Envoi d'Emails
      </h2>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Compose Email */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Composer un Email</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSendEmail} className="space-y-4">
              {/* Recipient Type */}
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={recipientType === 'all' ? 'default' : 'outline'} onClick={() => setRecipientType('all')}>
                  Tous
                </Button>
                <Button type="button" size="sm" variant={recipientType === 'trainers' ? 'default' : 'outline'} onClick={() => setRecipientType('trainers')}>
                  Formateurs ({emailRecipients.filter(r => r.role === 'trainer').length})
                </Button>
                <Button type="button" size="sm" variant={recipientType === 'students' ? 'default' : 'outline'} onClick={() => setRecipientType('students')}>
                  Élèves ({emailRecipients.filter(r => r.role === 'client').length})
                </Button>
              </div>

              {/* Send to All Toggle */}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sendToAll" checked={sendToAll} onChange={(e) => setSendToAll(e.target.checked)} className="rounded" />
                <label htmlFor="sendToAll" className="text-sm">Envoyer à tous les {recipientType === 'trainers' ? 'formateurs' : recipientType === 'students' ? 'élèves' : 'membres'} ({emailRecipients.length})</label>
              </div>

              {/* Recipients Selection */}
              {!sendToAll && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Sélectionner les destinataires</label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                    {emailRecipients.map(r => (
                      <label key={r.id} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer">
                        <input type="checkbox" checked={selectedRecipients.includes(r.id)} onChange={(e) => {
                          if (e.target.checked) setSelectedRecipients([...selectedRecipients, r.id]);
                          else setSelectedRecipients(selectedRecipients.filter(id => id !== r.id));
                        }} className="rounded" />
                        <span className="text-sm">{r.full_name}</span>
                        <span className="text-xs text-muted-foreground">({r.email})</span>
                        <span className={`text-xs px-1 rounded ${r.role === 'trainer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {r.role === 'trainer' ? 'Formateur' : 'Élève'}
                        </span>
                      </label>
                    ))}
                  </div>
                  {selectedRecipients.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedRecipients.length} destinataire(s) sélectionné(s)</p>
                  )}
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="text-sm font-medium mb-1 block">Sujet *</label>
                <Input value={emailForm.subject} onChange={e => setEmailForm({...emailForm, subject: e.target.value})} placeholder="Sujet de l'email" required />
              </div>

              {/* Message */}
              <div>
                <label className="text-sm font-medium mb-1 block">Message *</label>
                <textarea className="w-full border rounded-md p-3 bg-background min-h-[200px] text-sm" value={emailForm.message} onChange={e => setEmailForm({...emailForm, message: e.target.value})} placeholder="Votre message..." required />
              </div>

              <Button type="submit" disabled={sendingEmail} className="w-full gap-2">
                {sendingEmail ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendingEmail ? 'Envoi en cours...' : 'Envoyer'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader><CardTitle>Modèles</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {emailTemplates.map(t => (
              <Button key={t.id} variant="outline" size="sm" className="w-full justify-start text-left h-auto py-2" onClick={() => applyEmailTemplate(t)}>
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader><CardTitle>Historique des envois</CardTitle></CardHeader>
        <CardContent>
          {emailHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Aucun email envoyé</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Sujet</th>
                    <th className="text-left py-2">Destinataires</th>
                    <th className="text-left py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {emailHistory.map(h => (
                    <tr key={h.id} className="border-b">
                      <td className="py-2">{new Date(h.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2 max-w-[200px] truncate">{h.subject}</td>
                      <td className="py-2">{h.recipients_count}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${h.status === 'sent' ? 'bg-green-100 text-green-800' : h.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : h.status === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                          {h.status === 'sent' ? 'Envoyé' : h.status === 'partial' ? 'Partiel' : h.status === 'pending' ? 'En attente' : 'Échec'}
                        </span>
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
  );

  // Section: Parrainage & Commissions (Admin)
  const renderAdminReferrals = () => {
    const safeReferrals = Array.isArray(referralsOverview)
      ? referralsOverview
      : (Array.isArray(referralsOverview?.referrers) ? referralsOverview.referrers : []);
    const totalGenerated = safeReferrals.reduce((sum, r) => sum + (r.total_generated_xaf || 0), 0);
    const totalPending = safeReferrals.reduce((sum, r) => sum + (r.pending_payout_xaf ?? r.pending_to_pay_xaf ?? 0), 0);
    const totalPaid = safeReferrals.reduce((sum, r) => sum + (r.paid_payout_xaf ?? r.total_paid_xaf ?? 0), 0);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Share2 className="h-6 w-6 text-primary" /> Parrainage & Commissions d'Affiliation
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les liens de parrainage activés (élèves et formateurs), suivez les revenus générés par chaque affilié et payez leurs commissions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setActiveSection('trainers')} className="gap-1.5">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              Activer pour un Formateur
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveSection('users')} className="gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              Activer pour un Utilisateur
            </Button>
            <Button variant="outline" size="sm" onClick={fetchReferralsOverview} disabled={loadingReferralsOverview} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loadingReferralsOverview ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        
        {/* Module de recherche & activation rapide de parrainage pour l'admin */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" /> Activer le parrainage pour un membre spécifique
                </h4>
                <p className="text-xs text-muted-foreground">
                  Recherchez un élève ou formateur par son nom, prénom ou email pour lui ouvrir immédiatement l'accès au parrainage.
                </p>
              </div>
            </div>

            <div className="relative">
              <Input
                type="text"
                placeholder="Tapez le nom, email ou téléphone du membre..."
                value={referralUserSearch}
                onChange={(e) => handleSearchUserForReferral(e.target.value)}
                className="bg-background pr-10 text-sm"
              />
              {searchingReferralUser && (
                <div className="absolute right-3 top-2.5">
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {referralSearchResults.length > 0 && (
              <div className="border rounded-xl bg-card divide-y max-h-60 overflow-y-auto shadow-sm">
                {referralSearchResults.map((u) => (
                  <div key={u.id} className="p-2.5 sm:px-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/40 transition-colors">
                    <div>
                      <span className="font-bold text-foreground">{u.full_name}</span>
                      <span className={`ml-2 px-1.5 py-0.2 rounded text-[10px] font-semibold ${u.role === 'trainer' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.role === 'trainer' ? 'Formateur' : 'Élève'}
                      </span>
                      <p className="text-[11px] text-muted-foreground">{u.email} {u.phone ? `• ${u.phone}` : ''}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant={u.is_referral_enabled ? "outline" : "default"}
                        className={`h-7 text-xs gap-1.5 font-bold ${!u.is_referral_enabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                        onClick={async () => {
                          const newStatus = !u.is_referral_enabled;
                          await handleToggleUserReferral(u.id, newStatus, null);
                          handleSearchUserForReferral(referralUserSearch);
                        }}
                      >
                        <Share2 className="h-3 w-3" />
                        <span>{u.is_referral_enabled ? 'Désactiver' : 'Activer maintenant'}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Affiliés Autorisés</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeReferrals.length}</div>
              <p className="text-xs text-muted-foreground">Membres & formateurs avec lien actif</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Totaux Générés</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{totalGenerated.toLocaleString()} XAF</div>
              <p className="text-xs text-muted-foreground">Souscriptions apportées par les affiliés</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commissions à Payer</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{totalPending.toLocaleString()} XAF</div>
              <p className="text-xs text-muted-foreground">En attente de versement par l'admin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commissions Déjà Payées</CardTitle>
              <CheckCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalPaid.toLocaleString()} XAF</div>
              <p className="text-xs text-muted-foreground">Versées aux affiliés</p>
            </CardContent>
          </Card>
        </div>

        {/* Referrers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Liste des Parrains et Soldes de Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeReferrals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-3">
                <p>Aucun utilisateur ou formateur n'a actuellement de lien de parrainage activé.</p>
                <p className="text-xs">
                  Allez dans l'onglet <strong>Formateurs</strong> ou <strong>Utilisateurs</strong> pour activer le parrainage sur les membres choisis.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 px-3">Parrain / Formateur</th>
                      <th className="text-left py-2 px-3">Code</th>
                      <th className="text-left py-2 px-3">Taux (%)</th>
                      <th className="text-center py-2 px-3">Inscrits</th>
                      <th className="text-center py-2 px-3">Souscriptions</th>
                      <th className="text-right py-2 px-3">CA Généré</th>
                      <th className="text-right py-2 px-3">À Payer</th>
                      <th className="text-right py-2 px-3">Déjà Payé</th>
                      <th className="text-right py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeReferrals.map((item) => {
                      const pendingPayout = item.pending_payout_xaf ?? item.pending_to_pay_xaf ?? 0;
                      const paidPayout = item.paid_payout_xaf ?? item.total_paid_xaf ?? 0;
                      const pct = item.percentage ?? item.effective_percentage ?? 10;
                      const refCount = item.referees_count ?? item.total_referred ?? 0;
                      const subCount = item.subscribed_count ?? item.users_with_plan ?? 0;
                      return (
                        <tr key={item.id} className="border-b hover:bg-muted/30">
                          <td className="py-3 px-3">
                            <p className="font-semibold flex items-center gap-1.5">
                              {item.full_name}
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.role === 'trainer' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {item.role === 'trainer' ? 'Formateur' : 'Élève'}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">{item.email} {item.phone ? `• ${item.phone}` : ''}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {item.referral_code}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold">{pct}%</td>
                          <td className="py-3 px-3 text-center">{refCount}</td>
                          <td className="py-3 px-3 text-center font-semibold text-emerald-600">{subCount}</td>
                          <td className="py-3 px-3 text-right font-bold">{(item.total_generated_xaf || 0).toLocaleString()} XAF</td>
                          <td className="py-3 px-3 text-right font-extrabold text-amber-600">
                            {pendingPayout.toLocaleString()} XAF
                          </td>
                          <td className="py-3 px-3 text-right text-muted-foreground">
                            {paidPayout.toLocaleString()} XAF
                          </td>
                          <td className="py-3 px-3 text-right space-x-1">
                            {pendingPayout > 0 && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                                onClick={() => handleMarkCommissionsPaid(item.id, item.full_name)}
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Payer
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs"
                              onClick={() => handleToggleUserReferral(item.id, false, null)}
                              title="Désactiver le lien"
                            >
                              Désactiver
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Section: Plans & Souscriptions (Admin)
  const renderAdminSubscriptions = () => {
    const safePlans = Array.isArray(adminPlans) ? adminPlans : [];
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" /> Plans de Souscription Mensuels
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Créez et configurez les offres de souscription ou offrez 1 mois gratuit à un utilisateur.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveSection('users')}
              className="gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
            >
              <Gift className="h-4 w-4" />
              Offrir 1 Mois Gratuit à un Utilisateur
            </Button>
            <Button
              onClick={() => {
                setEditingPlan(null);
                setPlanForm({ name: '', description: '', price_xaf: '', duration_days: 30, features: '', is_active: true });
                setShowPlanModal(true);
              }}
              className="gap-2"
            >
              + Nouveau Plan
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAdminPlans} disabled={loadingAdminPlans}>
              <RefreshCw className={`h-4 w-4 ${loadingAdminPlans ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Bandeau rapide de sélection de passerelle (iKeePay / SEBPAY) directement dans l'onglet Plans */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">
                  Passerelle Mobile Money actuellement active :{' '}
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-xs uppercase font-extrabold">
                    {activeGatewayInput === 'ikeepay' ? 'iKeePay (Inline Checkout)' : 'SEBPAY'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Basculez en 1 clic entre iKeePay et SEBPAY ou configurez vos clés API.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={activeGatewayInput === 'ikeepay' ? 'default' : 'outline'}
                onClick={() => handleSwitchPaymentGateway('ikeepay')}
                disabled={savingSettings}
                className={activeGatewayInput === 'ikeepay' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}
              >
                {activeGatewayInput === 'ikeepay' ? '● iKeePay Actif' : 'Activer iKeePay'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeGatewayInput === 'sebpay' ? 'default' : 'outline'}
                onClick={() => handleSwitchPaymentGateway('sebpay')}
                disabled={savingSettings}
                className={activeGatewayInput === 'sebpay' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}
              >
                {activeGatewayInput === 'sebpay' ? '● SEBPAY Actif' : 'Activer SEBPAY'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setActiveSection('branding')}
                className="gap-1.5"
              >
                Configurer les clés API <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal Création / Modification de Plan */}
        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in-0">
            <div className="bg-card border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
              <button
                onClick={() => setShowPlanModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="font-bold text-lg">
                {editingPlan ? 'Modifier le Plan' : 'Créer un Nouveau Plan de Souscription'}
              </h3>

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold block mb-1">Nom du Plan *</label>
                  <Input
                    required
                    placeholder="Ex: Abonnement VIP Mensuel"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Prix en XAF *</label>
                    <Input
                      required
                      type="number"
                      placeholder="Ex: 25000"
                      value={planForm.price_xaf}
                      onChange={(e) => setPlanForm({ ...planForm, price_xaf: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Durée (Jours) *</label>
                    <Input
                      required
                      type="number"
                      placeholder="30"
                      value={planForm.duration_days}
                      onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Essai (Jours) 🎁</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ex: 7"
                      value={planForm.trial_days}
                      onChange={(e) => setPlanForm({ ...planForm, trial_days: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Description courte</label>
                  <Input
                    placeholder="Ex: Accès complet aux analyses en direct et aux signaux"
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Fonctionnalités incluses (une par ligne)</label>
                  <textarea
                    rows={4}
                    className="w-full border rounded-lg p-2.5 text-xs bg-background"
                    placeholder={"Accès aux webinaires hebdomadaires\nSignaux de trading en temps réel\nAssistance personnalisée"}
                    value={planForm.features}
                    onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="plan-active"
                    checked={planForm.is_active}
                    onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                  />
                  <label htmlFor="plan-active" className="text-xs font-medium cursor-pointer">
                    Plan actif et visible pour les utilisateurs
                  </label>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button type="submit" disabled={savingPlan} className="flex-1">
                    {savingPlan ? 'Enregistrement...' : (editingPlan ? 'Mettre à jour' : 'Créer le Plan')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowPlanModal(false)}>
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        {loadingAdminPlans ? (
          <div className="py-12 text-center text-muted-foreground">Chargement des plans...</div>
        ) : safePlans.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-semibold">Aucun plan de souscription configuré</p>
            <p className="text-xs text-muted-foreground mt-1">Cliquez sur « + Nouveau Plan » pour en créer un.</p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {safePlans.map((p) => {
              const feats = Array.isArray(p.features) ? p.features : [];
              return (
                <Card key={p.id} className="relative flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </span>
                      <span className="text-xs text-muted-foreground">{p.duration_days} jours</span>
                    </div>
                    <CardTitle className="text-lg mt-2">{p.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                    <div className="pt-2">
                      <span className="text-2xl font-bold">{Number(p.price_xaf).toLocaleString()}</span>
                      <span className="text-xs font-semibold text-muted-foreground ml-1">XAF</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5 border-t pt-3">
                      {feats.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setEditingPlan(p);
                          setPlanForm({
                            name: p.name,
                            description: p.description || '',
                            price_xaf: p.price_xaf,
                            duration_days: p.duration_days,
                            trial_days: p.trial_days || 0,
                            features: Array.isArray(p.features) ? p.features.join('\n') : '',
                            is_active: p.is_active
                          });
                          setShowPlanModal(true);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePlan(p.id || p._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render active section content
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'referrals':
        return renderAdminReferrals();
      case 'subscriptions':
        return renderAdminSubscriptions();
      case 'users':
        return renderUsers();
      case 'trainers':
        return renderTrainers();
      case 'consultation-sheets':
        return renderConsultationSheets();
      case 'student-consultations':
        return renderStudentConsultations();
      case 'prospects':
        return renderProspects();
      case 'vacation-programs':
        return renderVacationPrograms();
      case 'services':
        return renderServicesAdmin();
      case 'announcements':
        return renderAnnouncements();
      case 'economics':
        return <EconomicCalendar />;
      case 'banners':
        return renderBanners();
      case 'branding':
        return renderBranding();
      case 'emails':
        return renderEmails();
      case 'statistics':
        return renderDetailedStatistics();
      case 'email-guide':
        return renderEnhancedEmailGuide();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Sidebar */}
      <AdminSidebar 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      
      {/* Main Content avec défilement autonome */}
      <main 
        ref={mainRef}
        className={`flex-1 h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain transition-all duration-300 ml-0 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}
      >
        <div className="p-4 md:p-6 pb-28 max-w-full">
          {/* Header */}
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{t('dashboard.welcome')}, {user?.full_name}</p>
          </div>
          
          {/* Content */}
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;