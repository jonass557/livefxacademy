// Cloche de notifications d'annonces économiques (feature 7).
// Interroge périodiquement /api/economics/notifications (créées côté serveur par
// le scheduler aux paliers T-60/30/15/5/0 min pour les annonces Medium/High).
// Affiche un badge de non-lus et un panneau déroulant ; marque comme lu.

import React, { useEffect, useRef, useState } from 'react';
import { Bell, AlertTriangle, Loader2, CheckCheck } from 'lucide-react';
import api from '../../lib/api';

const POLL_MS = 60 * 1000;

const RISK_STYLE = {
  eleve: 'border-l-red-500',
  moyen: 'border-l-yellow-500',
  faible: 'border-l-green-500',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const fetchNotifs = async () => {
    try {
      const { data } = await api.get('/economics/notifications');
      setNotifs(data.notifications || []);
      setUnread(data.unread || 0);
    } catch (_) {
      /* silencieux : la cloche ne doit pas gêner l'UI */
    }
  };

  // Polling périodique.
  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Ferme au clic extérieur.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const markAllRead = async () => {
    setLoading(true);
    try {
      await api.post('/economics/notifications/read', {});
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (_) { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markAllRead();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggle}
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg border bg-card hover:bg-muted transition-colors"
        title="Notifications économiques"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Alertes économiques</span>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <button onClick={markAllRead} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Tout lire
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Aucune alerte pour le moment.
              </div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n._id}
                  className={`px-4 py-3 border-b last:border-0 border-l-4 ${RISK_STYLE[n.risk] || 'border-l-border'} ${
                    n.read ? 'opacity-60' : 'bg-primary/5'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {n.impact === 'High' && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <p className="text-sm">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(n.event_date).toLocaleString('fr-FR', {
                          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
