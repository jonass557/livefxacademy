// Page « Annonces économiques » — conteneur du module macro.
// Onglets : Calendrier · Banques centrales · Assistant (chatbot).
// Utilisée telle quelle comme section dans les 3 dashboards (client/formateur/admin).
// Récupère /api/economics/meta pour savoir si l'IA est activée (clé configurée).

import React, { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { CalendarDays, Landmark, MessageCircle, TrendingUp } from 'lucide-react';
import api from '../lib/api';
import CalendarView from '../components/economic/CalendarView';
import CentralBankView from '../components/economic/CentralBankView';
import EconomicChat from '../components/economic/EconomicChat';
import NotificationBell from '../components/economic/NotificationBell';

export default function EconomicCalendar() {
  const [tab, setTab] = useState('calendar');
  const [aiEnabled, setAiEnabled] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/economics/meta')
      .then(({ data }) => { if (alive) setAiEnabled(!!data.ai_enabled); })
      .catch(() => { /* on garde true : le backend renverra une erreur claire si besoin */ });
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-purple-500/10 p-5 md:p-6">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" /> Annonces économiques
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Calendrier macro en temps réel, analyses IA (avant / après publication), résumés des banques
              centrales et assistant pédagogique pour comprendre l'impact sur les marchés.
            </p>
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* Onglets */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto flex-wrap h-auto">
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Calendrier</TabsTrigger>
          <TabsTrigger value="central-banks" className="gap-1.5"><Landmark className="h-4 w-4" /> Banques centrales</TabsTrigger>
          <TabsTrigger value="assistant" className="gap-1.5"><MessageCircle className="h-4 w-4" /> Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar"><CalendarView aiEnabled={aiEnabled} /></TabsContent>
        <TabsContent value="central-banks"><CentralBankView aiEnabled={aiEnabled} /></TabsContent>
        <TabsContent value="assistant"><EconomicChat aiEnabled={aiEnabled} /></TabsContent>
      </Tabs>
    </div>
  );
}
