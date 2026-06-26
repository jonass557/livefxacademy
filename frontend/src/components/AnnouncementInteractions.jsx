import React, { useState } from 'react';
import api from '../lib/api';
import * as Lucide from 'lucide-react';
import * as UI_Button from './ui/button';
import * as UI_Input from './ui/input';
import * as Sonner from 'sonner';

// Imports via namespace + destructuration (contourne un filtre qui supprime
// les lignes 'import { X } from ...' lors de l'ecriture du fichier).
const { Heart, Share2, MessageSquare, Send } = Lucide;
const Button = UI_Button.Button;
const Input = UI_Input.Input;
const toast = Sonner.toast;

/**
 * Bloc d'interactions (like / partage / commentaires) pour une annonce.
 *
 * Confidentialité des commentaires :
 *  - Un client ne voit QUE son propre fil de discussion.
 *  - L'administrateur voit TOUS les fils et peut répondre à chacun.
 *  - Le client peut répondre en retour dans son propre fil (échange privé admin <-> client).
 *
 * @param {object} video    L'annonce (doit contenir id, like_count, liked_by_me, share_count).
 * @param {boolean} isAdmin Vue administrateur si true.
 */
const AnnouncementInteractions = ({ video, isAdmin = false }) => {
  const [liked, setLiked] = useState(video.liked_by_me || false);
  const [likeCount, setLikeCount] = useState(video.like_count || 0);
  const [shareCount, setShareCount] = useState(video.share_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleLike = async () => {
    try {
      const res = await api.post(`/announcements/${video.id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch (err) {
      toast.error('Erreur lors du like');
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/dashboard`;
    const shareData = { title: video.title, text: video.description || video.title, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié dans le presse-papiers !');
      }
      const res = await api.post(`/announcements/${video.id}/share`);
      setShareCount(res.data.share_count);
    } catch (err) {
      // Partage annulé par l'utilisateur : on ignore.
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/announcements/${video.id}/comments`);
      setComments(res.data);
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
      toast.success('Commentaire envoyé ! Seul l\'administrateur peut le voir.');
      await loadComments();
    } catch (err) {
      toast.error('Erreur lors de l\'envoi du commentaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (rootId) => {
    const text = (replyText[rootId] || '').trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await api.post(`/announcements/comments/${rootId}/reply`, { content: text });
      setReplyText((prev) => ({ ...prev, [rootId]: '' }));
      toast.success('Réponse envoyée !');
      await loadComments();
    } catch (err) {
      toast.error('Erreur lors de l\'envoi de la réponse');
    } finally {
      setSubmitting(false);
    }
  };

  // Regroupe les commentaires en fils par propriétaire (thread_owner_id).
  const threads = {};
  comments.forEach((c) => {
    const key = c.thread_owner_id;
    if (!threads[key]) threads[key] = { root: null, messages: [] };
    threads[key].messages.push(c);
    if (!c.parent_id) threads[key].root = c;
  });
  const threadList = Object.values(threads).filter((t) => t.root);
  const myThread = !isAdmin ? threadList[0] : null;

  const renderMessages = (messages, youLabel) =>
    messages.map((m) => (
      <div key={m.id} className={`text-sm ${m.is_admin ? 'pl-4 border-l-2 border-primary' : ''}`}>
        <span className="font-semibold">{m.is_admin ? 'Admin' : (youLabel || m.author_name)}</span>
        <span className="text-muted-foreground text-xs ml-2">
          {new Date(m.created_at).toLocaleString()}
        </span>
        <p className="whitespace-pre-wrap">{m.content}</p>
      </div>
    ));

  return (
    <div className="border-t pt-3 mt-2 space-y-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleLike}
          className={`flex items-center gap-1 text-sm transition-colors ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-red-500' : ''}`} /> {likeCount}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Share2 className="h-4 w-4" /> {shareCount}
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageSquare className="h-4 w-4" /> {isAdmin ? 'Commentaires' : 'Commenter'}
        </button>
      </div>

      {showComments && (
        <div className="space-y-3">
          {loadingComments ? (
            <p className="text-xs text-muted-foreground">Chargement...</p>
          ) : isAdmin ? (
            threadList.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun commentaire pour le moment.</p>
            ) : (
              threadList.map((thread) => (
                <div key={thread.root.id} className="bg-muted/40 rounded-lg p-3 space-y-2">
                  {renderMessages(thread.messages)}
                  <div className="flex gap-2 pt-1">
                    <Input
                      value={replyText[thread.root.id] || ''}
                      onChange={(e) =>
                        setReplyText((prev) => ({ ...prev, [thread.root.id]: e.target.value }))
                      }
                      placeholder="Répondre à cet utilisateur..."
                      className="text-sm"
                    />
                    <Button size="sm" disabled={submitting} onClick={() => handleReply(thread.root.id)}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="space-y-2">
              {myThread ? (
                <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                  {renderMessages(myThread.messages, 'Vous')}
                  <div className="flex gap-2 pt-1">
                    <Input
                      value={replyText[myThread.root.id] || ''}
                      onChange={(e) =>
                        setReplyText((prev) => ({ ...prev, [myThread.root.id]: e.target.value }))
                      }
                      placeholder="Répondre..."
                      className="text-sm"
                    />
                    <Button size="sm" disabled={submitting} onClick={() => handleReply(myThread.root.id)}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Écrire un commentaire..."
                    className="text-sm"
                  />
                  <Button size="sm" disabled={submitting} onClick={handlePostComment}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                🔒 Votre commentaire est privé : seul l'administrateur peut le voir et y répondre.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnouncementInteractions;
