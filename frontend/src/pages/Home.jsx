import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  TrendingUp, LineChart, BarChart3, Calendar,
  ShieldCheck, RefreshCw, Eye, Sparkles,
  Maximize2, X, MessageSquare, Compass, ArrowRight, Video, Image as ImageIcon,
  Palmtree, Link as LinkIcon, Phone, Send, Facebook, CheckCircle, ExternalLink,
  MapPin, Users, GraduationCap, Mail, Award
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import ReactPlayer from 'react-player';
import { cloudinaryVideoThumb } from '../lib/video';
import AnnouncementInteractions from '../components/AnnouncementInteractions';

const isImageFile = (post) => {
  if (post.media_type === 'image') return true;
  if (post.media_type === 'video') return false;
  const url = post.cloudinary_url || '';
  return /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(url);
};

const Home = () => {
  const { user } = useAuthStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [vacationPrograms, setVacationPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchFeedAndData = async () => {
    setLoading(true);
    try {
      const [announcementsRes, vacationRes] = await Promise.all([
        api.get('/announcements').catch(() => ({ data: [] })),
        api.get('/vacation-programs').catch(() => ({ data: [] })),
      ]);
      setPosts(announcementsRes.data || []);
      setVacationPrograms(vacationRes.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des données', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedAndData();
  }, []);

  const handleVideoView = async (id) => {
    try {
      await api.post(`/announcements/${id}/view`);
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* ==================== 1. EN-TÊTE MEMBRE CONNECTÉ (SANS CARROUSEL) ==================== */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-purple-500/10 p-6 md:p-8 shadow-sm">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Espace Membre Connecté</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Bienvenue, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">{user?.full_name || 'Trader'}</span> 👋
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Retrouvez ci-dessous les dernières publications, le fil d'actualité en direct, les programmes de vacances, nos brokers recommandés et nos coordonnées de contact.
            </p>
          </div>

          {/* Raccourcis principaux rapides */}
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/dashboard?section=trading-demo">
              <Button size="sm" className="gap-1.5 shadow-sm">
                <LineChart className="h-4 w-4" />
                <span>Graphique</span>
              </Button>
            </Link>
            <Link to="/dashboard?section=backtesting">
              <Button size="sm" variant="outline" className="gap-1.5 bg-card">
                <BarChart3 className="h-4 w-4" />
                <span>Backtesting</span>
              </Button>
            </Link>
            <Link to="/dashboard?section=economics">
              <Button size="sm" variant="outline" className="gap-1.5 bg-card">
                <Calendar className="h-4 w-4" />
                <span>Annonces éco</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== 2. FIL D'ACTUALITÉ (NEWS FEED) ==================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Fil d'actualité LiveFX</h2>
              <p className="text-xs text-muted-foreground">Publications vidéos et images en temps réel</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFeedAndData}
            disabled={loading}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </Button>
        </div>

        {/* Liste des publications du fil */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse p-6 space-y-4">
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-64 bg-muted rounded-xl" />
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-dashed py-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Aucune publication pour le moment</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                L'administrateur n'a pas encore publié de nouvelles annonces ou médias dans le fil d'actualité.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => {
              const isImg = isImageFile(post);

              return (
                <Card key={post.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                  {/* Entête de publication */}
                  <CardHeader className="p-4 sm:p-5 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-purple-600 text-white font-bold text-sm shadow">
                          LFX
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm sm:text-base leading-tight">
                              {post.admin_name || 'LivefxTrading Academy'}
                            </h3>
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                              <ShieldCheck className="h-3 w-3" /> Officiel
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Indicateur média */}
                      <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                        {isImg ? <ImageIcon className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                        <span className="capitalize">{isImg ? 'Image' : 'Vidéo'}</span>
                      </span>
                    </div>

                    {/* Titre & Description du post */}
                    <div className="pt-2 space-y-1.5">
                      <h4 className="text-base sm:text-lg font-bold text-foreground">
                        {post.title}
                      </h4>
                      {post.description && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {post.description}
                        </p>
                      )}
                    </div>
                  </CardHeader>

                  {/* Contenu média : Image ou Vidéo */}
                  <CardContent className="p-0 sm:px-5 pb-4">
                    {isImg ? (
                      <div
                        className="relative group cursor-pointer overflow-hidden rounded-xl bg-muted border mx-4 sm:mx-0 max-h-[540px] flex items-center justify-center"
                        onClick={() => setSelectedImage(post.cloudinary_url)}
                      >
                        <img
                          src={post.cloudinary_url}
                          alt={post.title}
                          className="w-full h-auto max-h-[540px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 text-foreground text-xs font-semibold shadow-lg">
                            <Maximize2 className="h-3.5 w-3.5" /> Agrandir l'image
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative aspect-video w-full overflow-hidden bg-black rounded-none sm:rounded-xl mx-0">
                        <ReactPlayer
                          url={post.cloudinary_url}
                          width="100%"
                          height="100%"
                          controls
                          light={cloudinaryVideoThumb(post.cloudinary_url) || true}
                          onPlay={() => handleVideoView(post.id)}
                        />
                      </div>
                    )}

                    {/* Vues et interactions */}
                    <div className="px-4 sm:px-0 pt-2">
                      <div className="flex items-center justify-end text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          <span>{post.view_count || 0} vue{(post.view_count || 0) > 1 ? 's' : ''}</span>
                        </span>
                      </div>

                      {/* Composant Likes, Partages Réseaux Sociaux, Commentaires */}
                      <AnnouncementInteractions video={post} isAdmin={user?.role === 'admin'} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== 3. PROGRAMMES DE VACANCES ==================== */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Palmtree className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Programme de vacances LiveFX</h2>
              <p className="text-xs text-muted-foreground">Sessions de formation intensive et coaching sur mesure</p>
            </div>
          </div>
          <Link to="/vacation-program">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <span>Voir tout</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {vacationPrograms.length === 0 ? (
          <Card className="bg-gradient-to-r from-amber-500/5 to-primary/5 border-amber-500/20">
            <CardContent className="py-8 px-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Session Junior & Étudiants</span>
                </div>
                <h3 className="text-lg font-bold">Programme Spécial Vacances & Immersion Trading</h3>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Rejoignez notre programme intensif conçu pour apprendre le trading pas à pas avec nos experts certifiés, exercices pratiques et certificat de fin de formation.
                </p>
              </div>
              <Link to="/vacation-program">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shrink-0 shadow-md">
                  <Palmtree className="h-4 w-4" /> Découvrir le programme
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {vacationPrograms.slice(0, 2).map((prog) => (
              <Card key={prog.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-gradient-to-r from-amber-500/10 to-primary/10 pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 text-xs font-bold mb-1">
                        <GraduationCap className="h-3 w-3" /> Programme Vacances
                      </span>
                      <CardTitle className="text-base sm:text-lg">{prog.title}</CardTitle>
                    </div>
                    {prog.age_range && (
                      <span className="px-2 py-0.5 bg-card border rounded-full text-xs font-semibold text-muted-foreground">
                        {prog.age_range}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {prog.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{prog.description}</p>
                  )}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{new Date(prog.start_date).toLocaleDateString('fr-FR')} au {new Date(prog.end_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {prog.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>{prog.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span>{prog.current_participants || 0} / {prog.max_participants || 20} places</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-lg font-bold text-primary">{prog.price ? `${prog.price} €` : 'Sur demande'}</span>
                    <Button
                      size="sm"
                      onClick={() => navigate('/vacation-program', { state: { programId: prog.id || prog._id } })}
                      className="gap-1 text-xs"
                    >
                      S'inscrire <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ==================== 4. LIEN BROKERS ==================== */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
            <LinkIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Brokers Partenaires Recommandés</h2>
            <p className="text-xs text-muted-foreground">Tradez sur des plateformes régulées avec spreads ultra-compétitifs</p>
          </div>
        </div>

        <Card className="overflow-hidden border-blue-500/20 bg-gradient-to-br from-card via-card to-blue-500/5 shadow-sm">
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600">
                  <Award className="h-3.5 w-3.5" />
                  <span>Partenaire Officiel LivefxTrading</span>
                </div>
                <h3 className="text-xl font-extrabold tracking-tight">
                  Ouvrez un compte chez notre Broker Partenaire
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Profitez de conditions de trading institutionnelles avec une exécution ultra-rapide des ordres, aucun frais caché et un accompagnement complet.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/60">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Dépôts Instantanés</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/60">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Spreads à partir de 0.0</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/60">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Régulé & 100% Sécurisé</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/60">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Support Dédié 24/7</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-muted/40 border border-dashed border-primary/30 text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <LinkIcon className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base">Lien d'affiliation officiel</h4>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Inscrivez-vous via notre lien pour bénéficier de réductions sur les commissions et de bonus exclusifs.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                  <a
                    href="https://livefx.link/broker-affiliation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button className="w-full gap-2 shadow-md">
                      <span>Ouvrir un Compte</span>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                  <Link to="/dashboard?section=broker" className="w-full">
                    <Button variant="outline" className="w-full text-xs">
                      En savoir plus
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ==================== 5. CONTACT & SUPPORT ==================== */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Contactez l'Équipe LiveFX</h2>
              <p className="text-xs text-muted-foreground">Une question ? Notre équipe d'assistance et nos coachs sont disponibles</p>
            </div>
          </div>
          <Link to="/dashboard?section=contact">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <span>Page Contact</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* WhatsApp */}
          <Card className="hover:shadow-lg transition-all border-green-500/20 group">
            <CardContent className="p-5 text-center space-y-3">
              <div className="mx-auto inline-flex p-3 rounded-2xl bg-green-500/10 text-green-600 group-hover:scale-110 transition-transform">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">WhatsApp</h3>
                <p className="text-xs text-muted-foreground">Assistance rapide et directe</p>
              </div>
              <a
                href="https://wa.me/237699000000"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white text-xs h-9">
                  <span>Discuter sur WhatsApp</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Telegram */}
          <Card className="hover:shadow-lg transition-all border-sky-500/20 group">
            <CardContent className="p-5 text-center space-y-3">
              <div className="mx-auto inline-flex p-3 rounded-2xl bg-sky-500/10 text-sky-500 group-hover:scale-110 transition-transform">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Telegram</h3>
                <p className="text-xs text-muted-foreground">Canal officiel & alertes VIP</p>
              </div>
              <a
                href="https://t.me/livefxtrading"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full gap-2 bg-sky-500 hover:bg-sky-600 text-white text-xs h-9">
                  <span>Rejoindre le canal</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Facebook */}
          <Card className="hover:shadow-lg transition-all border-blue-500/20 group">
            <CardContent className="p-5 text-center space-y-3">
              <div className="mx-auto inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform">
                <Facebook className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Facebook</h3>
                <p className="text-xs text-muted-foreground">Page communautaire & lives</p>
              </div>
              <a
                href="https://facebook.com/livefxtrading"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs h-9">
                  <span>Suivre notre Page</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ==================== MODAL LIGHTBOX POUR AGRANDIR LES IMAGES ==================== */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-card border shadow-2xl">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-background/80 p-1.5 text-foreground hover:bg-background transition-colors"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={selectedImage}
              alt="Aperçu grand format"
              className="w-full h-auto max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
