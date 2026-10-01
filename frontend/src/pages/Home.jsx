import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  TrendingUp, LineChart, BarChart3, Calendar,
  ShieldCheck, RefreshCw, Eye, Sparkles,
  Maximize2, X, MessageSquare, Compass, ArrowRight, Video, Image as ImageIcon
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
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements');
      setPosts(res.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement du fil d\'actualité', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleVideoView = async (id) => {
    try {
      await api.post(`/announcements/${id}/view`);
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* ==================== EN-TÊTE MEMBRE CONNECTÉ (SANS CARROUSEL) ==================== */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-purple-500/10 p-6 md:p-8">
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
              Retrouvez ci-dessous les dernières publications, analyses, vidéos et actualités officielles partagées par l'administrateur.
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

      {/* ==================== FIL D'ACTUALITÉ (NEWS FEED) ==================== */}
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
            onClick={fetchFeed}
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

      {/* ==================== MODAL LIGHTBOX POUR AGRANDIR LES IMAGES ==================== */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
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
