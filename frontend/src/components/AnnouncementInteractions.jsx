import React, { useState, useMemo } from 'react';
import api from '../lib/api';
import {
  Heart, Share2, MessageSquare, Send, Check, Copy,
  ExternalLink, Reply, User, ShieldCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { useAutoTranslate } from '../hooks/useAutoTranslate';

/**
 * Bloc d'interactions du fil d'actualité (Like / Partage Réseaux Sociaux / Commentaires & Réponses)
 */
const AnnouncementInteractions = ({ video, isAdmin = false }) => {
  const [liked, setLiked] = useState(video.liked_by_me || false);
  const [likeCount, setLikeCount] = useState(video.like_count || 0);
  const [shareCount, setShareCount] = useState(video.share_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState({});
  const [replyingToId, setReplyingToId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const commentTexts = useMemo(() => {
    const list = [];
    comments.forEach((c) => {
      if (c.content) list.push(c.content);
    });
    return list;
  }, [comments]);
  const { tr } = useAutoTranslate(commentTexts);

  const handleLike = async () => {
    try {
      const res = await api.post(`/announcements/${video.id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch (err) {
      toast.error('Erreur lors du like');
    }
  };

  const notifyShare = async () => {
    try {
      const res = await api.post(`/announcements/${video.id}/share`);
      setShareCount(res.data.share_count);
    } catch (err) {
      // ignore
    }
  };

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/`;
    }
    return 'https://livefx-trading.com';
  };

  const shareText = `Découvrez cette annonce sur LivefxTrading : "${video.title}"`;

  const handleSocialShare = async (platform) => {
    const url = getShareUrl();
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(shareText);

    let targetUrl = '';
    switch (platform) {
      case 'whatsapp':
        targetUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'facebook':
        targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'telegram':
        targetUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'twitter':
        targetUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'native':
        if (navigator.share) {
          try {
            await navigator.share({ title: video.title, text: video.description || video.title, url });
            await notifyShare();
            toast.success('Partagé avec succès !');
          } catch (e) {
            // Annulé
          }
          setShowShareModal(false);
          return;
        }
        break;
      default:
        break;
    }

    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      await notifyShare();
      setShowShareModal(false);
    }
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Lien copié dans le presse-papiers !');
      await notifyShare();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Impossible de copier le lien');
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/announcements/${video.id}/comments`);
      setComments(res.data || []);
    } catch (err) {
      toast.error('Erreur lors du chargement des commentaires');
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next) loadComments();
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/announcements/${video.id}/comments`, { content: newComment });
      setNewComment('');
      toast.success('Commentaire publié !');
      await loadComments();
    } catch (err) {
      toast.error('Erreur lors de l\'envoi du commentaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (commentId) => {
    const text = (replyText[commentId] || '').trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await api.post(`/announcements/comments/${commentId}/reply`, { content: text });
      setReplyText((prev) => ({ ...prev, [commentId]: '' }));
      setReplyingToId(null);
      toast.success('Réponse publiée !');
      await loadComments();
    } catch (err) {
      toast.error('Erreur lors de l\'envoi de la réponse');
    } finally {
      setSubmitting(false);
    }
  };

  // Hiérarchisation : commentaires racines et leurs réponses
  const rootComments = comments.filter((c) => !c.parent_id);
  const repliesByParent = {};
  comments.forEach((c) => {
    if (c.parent_id) {
      if (!repliesByParent[c.parent_id]) repliesByParent[c.parent_id] = [];
      repliesByParent[c.parent_id].push(c);
    }
  });

  return (
    <div className="border-t pt-3 mt-3 space-y-3">
      {/* Barre d'actions Like / Commentaire / Partage */}
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-5">
          {/* Like */}
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-transform active:scale-95 ${
              liked ? 'text-red-500' : 'hover:text-red-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{likeCount}</span>
          </button>

          {/* Commentaires */}
          <button
            type="button"
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold hover:text-primary transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{comments.length > 0 ? comments.length : (video.comment_count || 'Commenter')}</span>
          </button>

          {/* Partager */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowShareModal(!showShareModal)}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold hover:text-primary transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span>{shareCount}</span>
            </button>

            {/* Menu Popover Partage Réseaux Sociaux */}
            {showShareModal && (
              <div className="absolute left-0 bottom-full mb-2 w-56 rounded-xl border bg-card p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 border-b mb-1">
                  Partager sur les réseaux
                </p>
                <div className="flex flex-col gap-1 text-xs">
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                    <button
                      onClick={() => handleSocialShare('native')}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted font-medium text-left"
                    >
                      <Share2 className="h-4 w-4 text-primary" />
                      Partager via l'appareil...
                    </button>
                  )}
                  <button
                    onClick={() => handleSocialShare('whatsapp')}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted font-medium text-left text-green-600"
                  >
                    <span className="font-bold">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleSocialShare('facebook')}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted font-medium text-left text-blue-600"
                  >
                    <span className="font-bold">Facebook</span>
                  </button>
                  <button
                    onClick={() => handleSocialShare('telegram')}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted font-medium text-left text-sky-500"
                  >
                    <span className="font-bold">Telegram</span>
                  </button>
                  <button
                    onClick={() => handleSocialShare('twitter')}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted font-medium text-left text-foreground"
                  >
                    <span className="font-bold">X (Twitter)</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted font-medium text-left border-t mt-1 pt-1.5"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    <span>{copied ? 'Copié !' : 'Copier le lien'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Volet de commentaires déroulant */}
      {showComments && (
        <div className="space-y-3 pt-2 border-t">
          {/* Formulaire d'ajout de commentaire */}
          <div className="flex items-center gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Écrire un commentaire..."
              className="text-xs sm:text-sm h-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePostComment();
                }
              }}
            />
            <Button
              size="sm"
              disabled={submitting || !newComment.trim()}
              onClick={handlePostComment}
              className="h-9 px-3 gap-1 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Liste des commentaires */}
          {loadingComments ? (
            <p className="text-xs text-muted-foreground py-2 text-center">Chargement des commentaires...</p>
          ) : rootComments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              Aucun commentaire pour le moment. Soyez le premier à commenter !
            </p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {rootComments.map((comment) => {
                const replies = repliesByParent[comment.id] || [];
                const isReplying = replyingToId === comment.id;

                return (
                  <div key={comment.id} className="space-y-2 rounded-lg bg-muted/40 p-2.5 text-xs sm:text-sm">
                    {/* Commentaire principal */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${comment.is_admin ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground border'}`}>
                          {comment.is_admin ? <ShieldCheck className="h-3.5 w-3.5" /> : (comment.author_name?.[0] || 'U')}
                        </div>
                        <span className="font-semibold text-foreground">
                          {comment.is_admin ? 'Admin (LiveFX)' : comment.author_name}
                        </span>
                        {comment.is_admin && (
                          <span className="bg-primary/20 text-primary text-[9px] font-bold px-1.5 py-0.2 rounded">
                            Officiel
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-foreground whitespace-pre-wrap pl-7">{tr(comment.content)}</p>

                    {/* Bouton répondre */}
                    <div className="pl-7 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyingToId(isReplying ? null : comment.id)}
                        className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <Reply className="h-3 w-3" />
                        {isReplying ? 'Annuler' : 'Répondre'}
                      </button>
                    </div>

                    {/* Réponses imbriquées */}
                    {replies.length > 0 && (
                      <div className="pl-7 space-y-2 pt-1 border-l-2 border-primary/20 ml-2">
                        {replies.map((reply) => (
                          <div key={reply.id} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-xs flex items-center gap-1">
                                {reply.is_admin ? (
                                  <>
                                    <span className="text-primary font-bold">Admin (LiveFX)</span>
                                    <span className="bg-primary/20 text-primary text-[8px] font-bold px-1 rounded">Officiel</span>
                                  </>
                                ) : (
                                  reply.author_name
                                )}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(reply.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-foreground text-xs whitespace-pre-wrap">{tr(reply.content)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Champ de réponse */}
                    {isReplying && (
                      <div className="flex gap-2 pt-1 pl-7">
                        <Input
                          value={replyText[comment.id] || ''}
                          onChange={(e) => setReplyText((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                          placeholder={isAdmin ? 'Répondre à cet utilisateur...' : 'Écrire une réponse...'}
                          className="h-8 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleReply(comment.id);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          disabled={submitting || !(replyText[comment.id] || '').trim()}
                          onClick={() => handleReply(comment.id)}
                          className="h-8 px-2.5"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnouncementInteractions;
