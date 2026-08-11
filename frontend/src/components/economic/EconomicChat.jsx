// Chatbot pédagogique macroéconomique (feature 6).
// POST /api/economics/chat avec la question ; le backend ajoute le contexte du
// calendrier de la semaine. Réponses en français, orientées apprentissage.

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const SUGGESTIONS = [
  'Pourquoi le dollar monte quand le NFP est fort ?',
  "Qu'est-ce que le CPI et pourquoi c'est important ?",
  'Différence entre Dovish et Hawkish ?',
  'Comment trader une annonce à forte volatilité ?',
];

export default function EconomicChat({ aiEnabled = true }) {
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Bonjour 👋 Je suis votre assistant macro. Posez-moi une question sur les annonces économiques, les indicateurs (NFP, CPI, PMI…) ou les banques centrales." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (question) => {
    const q = (question ?? input).trim();
    if (!q || loading) return;
    if (!aiEnabled) {
      toast.error("Le chatbot IA n'est pas activé sur le serveur.");
      return;
    }
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/economics/chat', { question: q });
      setMessages((m) => [...m, { role: 'bot', text: data.answer || '(réponse vide)' }]);
    } catch (err) {
      const text = err.response?.data?.message || 'Erreur du chatbot, réessayez.';
      setMessages((m) => [...m, { role: 'bot', text, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[65vh] rounded-xl border bg-card overflow-hidden">
      {/* Fil de messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : m.error
                  ? 'bg-destructive/10 text-destructive rounded-tl-sm'
                  : 'bg-muted rounded-tl-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions (au démarrage) */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors"
            >
              <Sparkles className="h-3 w-3 text-primary" /> {s}
            </button>
          ))}
        </div>
      )}

      {/* Saisie */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="border-t p-3 flex items-center gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre question sur l'actualité économique…"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
