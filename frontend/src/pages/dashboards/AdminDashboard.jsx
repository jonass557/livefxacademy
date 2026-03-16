import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Users, Video, TrendingUp, Image as ImageIcon, Trash2, MessageSquare, CheckCircle, XCircle, Clock, RefreshCw, BarChart3, Mail, GraduationCap, Eye, UserCheck, UserX, Lightbulb, ExternalLink, User, Phone, Calendar, Award, Briefcase, X, FileCheck, Send, AlertCircle, Target, ChevronDown, ChevronUp, Upload, Play, Pause, Edit2, Search, Globe } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import AdminSidebar from '../../components/AdminSidebar';

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const { t } = useLanguageStore();
  const [banners, setBanners] = useState([]);
  const [uploading, setUploading] = useState(false);
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

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementStats, setAnnouncementStats] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
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
  const [vacationStats, setVacationStats] = useState(null);
  const [showVacationForm, setShowVacationForm] = useState(false);
  const [editingVacation, setEditingVacation] = useState(null);
  const [vacationForm, setVacationForm] = useState({
    title: '', description: '', start_date: '', end_date: '', 
    price: '', location: '', max_participants: 20, age_range: ''
  });

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
    if (!videoFile || !videoTitle) {
      toast.warning('Veuillez remplir le titre et sélectionner une vidéo');
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', videoTitle);
    formData.append('description', videoDescription);

    setUploadingVideo(true);
    try {
      await api.post('/announcements/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVideoFile(null);
      setVideoTitle('');
      setVideoDescription('');
      fetchAnnouncements();
      fetchAnnouncementStats();
      toast.success('Vidéo publiée avec succès !');
    } catch (err) {
      toast.error('Erreur lors de l\'upload');
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
      fetchEmailRecipients(),
      fetchEmailHistory(),
      fetchEmailTemplates()
    ]).finally(() => setLoading(false));
  }, []);

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
                <img src={banner.image_url} alt="Banner" className="w-full h-full object-cover" />
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
              <img src={banner.image_url} alt="Banner" className="w-full h-full object-cover" />
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
        <h4>{t('emailGuide.subtitle')} (ex: contact@livefxacademy.com)</h4>
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
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
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
                      <div className="flex gap-2">
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
                <div className="flex gap-4 pt-4 border-t">
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
                      </div>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Section: Announcements Management
  const renderAnnouncements = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vidéos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcementStats?.total_videos || 0}</div>
            <p className="text-xs text-muted-foreground">+{announcementStats?.new_this_week || 0} cette semaine</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vidéos Actives</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{announcementStats?.active_videos || 0}</div>
            <p className="text-xs text-muted-foreground">Visibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vues Totales</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{announcementStats?.total_views || 0}</div>
            <p className="text-xs text-muted-foreground">Lectures</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action</CardTitle>
            <Upload className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Publiez une nouvelle vidéo d'annonce</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Publier une Nouvelle Vidéo d'Annonce
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUploadAnnouncement} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Titre de la vidéo *</label>
                <Input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Ex: Nouvelle formation disponible !"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Fichier vidéo *</label>
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files[0])}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <textarea
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                className="w-full border rounded-md p-2 bg-background min-h-[80px]"
                placeholder="Description de l'annonce..."
              />
            </div>
            <Button type="submit" disabled={uploadingVideo} className="w-full md:w-auto">
              {uploadingVideo ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Publier la vidéo
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Videos List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" /> Vidéos d'Annonces Publiées
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => { fetchAnnouncements(); fetchAnnouncementStats(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune vidéo d'annonce publiée.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {announcements.map((video) => (
                <div key={video.id} className="border rounded-lg overflow-hidden">
                  <div className="aspect-video bg-black relative">
                    <video 
                      src={video.cloudinary_url} 
                      className="w-full h-full object-cover"
                      controls
                    />
                    {!video.is_active && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                        Désactivée
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    {editingAnnouncement?.id === video.id ? (
                      <div className="space-y-2">
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
                          <Button size="sm" onClick={() => handleUpdateAnnouncement(video.id, editingAnnouncement)}>
                            Enregistrer
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingAnnouncement(null)}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-semibold">{video.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {video.view_count || 0} vues</span>
                          <span>{new Date(video.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" onClick={() => setEditingAnnouncement(video)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant={video.is_active ? "outline" : "default"}
                            onClick={() => handleToggleAnnouncement(video.id)}
                          >
                            {video.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteAnnouncement(video.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
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
                Un email comme <strong>contact@livefxacademy.com</strong> renforce la crédibilité 
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
                <strong>contact@livefxacademy.com</strong> - Principal
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <strong>support@livefxacademy.com</strong> - Support
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <strong>formation@livefxacademy.com</strong> - Formations
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <strong>noreply@livefxacademy.com</strong> - Automatiques
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
            <p>SMTP_USER=contact@livefxacademy.com</p>
            <p>SMTP_PASS=votre_mot_de_passe_app</p>
            <p>FROM_EMAIL=contact@livefxacademy.com</p>
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

  // Render active section content
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
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
      case 'announcements':
        return renderAnnouncements();
      case 'banners':
        return renderBanners();
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
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <AdminSidebar 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      
      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 w-full ${mobileOpen ? '' : 'ml-0 lg:ml-64'} ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <div className="p-4 md:p-6">
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
