import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Briefcase, TrendingUp, Award, CheckCircle, FileText } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const trainerConsultationSchema = z.object({
  full_name: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(8, "Numéro invalide"),
  trading_experience_years: z.number().min(1, "Minimum 1 an d'expérience requis"),
  main_strategy: z.string().min(1, "Sélectionnez votre stratégie principale"),
  strategy_description: z.string().min(50, "Décrivez votre stratégie en détail (min 50 caractères)"),
  markets_traded: z.array(z.string()).min(1, "Sélectionnez au moins un marché"),
  win_rate: z.string().min(1, "Indiquez votre taux de réussite"),
  risk_management: z.string().min(30, "Décrivez votre gestion du risque"),
  teaching_experience: z.string().min(1, "Sélectionnez une option"),
  available_hours: z.string().min(1, "Indiquez votre disponibilité"),
  why_join: z.string().min(30, "Expliquez votre motivation"),
  portfolio_link: z.string().optional(),
});

const TrainerConsultation = () => {
  const [submitted, setSubmitted] = useState(false);
  const [selectedMarkets, setSelectedMarkets] = useState([]);
  
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(trainerConsultationSchema),
  });

  const marketOptions = ["Forex", "Crypto", "Actions", "Indices", "Matières premières", "Options"];
  const strategyOptions = [
    "Scalping",
    "Day Trading",
    "Swing Trading",
    "Position Trading",
    "Price Action",
    "Smart Money Concepts (SMC)",
    "ICT Concepts",
    "Supply & Demand",
    "Harmonics",
    "Elliott Waves",
    "Autre"
  ];

  const toggleMarket = (market) => {
    const newSelection = selectedMarkets.includes(market)
      ? selectedMarkets.filter(m => m !== market)
      : [...selectedMarkets, market];
    setSelectedMarkets(newSelection);
    setValue('markets_traded', newSelection);
  };

  const onSubmit = async (data) => {
    try {
      await api.post('/consultations/trainer', {
        ...data,
        markets_traded: selectedMarkets
      });
      setSubmitted(true);
    } catch (error) {
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full mb-6">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Candidature Envoyée !</h2>
        <p className="text-muted-foreground max-w-md">
          Merci pour votre intérêt à rejoindre notre équipe de formateurs. Nous analyserons votre profil et vous contacterons sous 72h pour un entretien.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold bg-primary/10 text-primary">
          <Briefcase className="h-4 w-4 mr-2" />
          Devenir Formateur
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">Fiche Consultation Formateur</h1>
        <p className="text-muted-foreground">
          Partagez votre expertise et aidez d'autres traders à réussir. Nous recherchons des formateurs passionnés et expérimentés.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="font-medium text-sm">Revenus attractifs</p>
        </Card>
        <Card className="p-4 text-center">
          <Award className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="font-medium text-sm">Reconnaissance</p>
        </Card>
        <Card className="p-4 text-center">
          <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="font-medium text-sm">Flexibilité totale</p>
        </Card>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Détails de Votre Stratégie & Expérience</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Contact Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nom complet *</label>
                <Input {...register('full_name')} placeholder="Votre nom" />
                {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email *</label>
                <Input {...register('email')} type="email" placeholder="email@exemple.com" />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Téléphone (WhatsApp) *</label>
                <Input {...register('phone')} placeholder="+229 XX XX XX XX" />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Années d'expérience en trading *</label>
                <Input {...register('trading_experience_years', { valueAsNumber: true })} type="number" min="1" placeholder="Ex: 3" />
                {errors.trading_experience_years && <p className="text-red-500 text-sm mt-1">{errors.trading_experience_years.message}</p>}
              </div>
            </div>

            {/* Markets Traded */}
            <div>
              <label className="text-sm font-medium mb-2 block">Marchés tradés *</label>
              <div className="flex flex-wrap gap-2">
                {marketOptions.map((market) => (
                  <button
                    key={market}
                    type="button"
                    onClick={() => toggleMarket(market)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                      selectedMarkets.includes(market)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {market}
                  </button>
                ))}
              </div>
              {errors.markets_traded && <p className="text-red-500 text-sm mt-1">{errors.markets_traded.message}</p>}
            </div>

            {/* Main Strategy */}
            <div>
              <label className="text-sm font-medium mb-1 block">Stratégie principale *</label>
              <select {...register('main_strategy')} className="w-full border rounded-md p-2 bg-background">
                <option value="">Sélectionner votre stratégie</option>
                {strategyOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.main_strategy && <p className="text-red-500 text-sm mt-1">{errors.main_strategy.message}</p>}
            </div>

            {/* Strategy Description */}
            <div>
              <label className="text-sm font-medium mb-1 block">Décrivez votre stratégie en détail *</label>
              <textarea 
                {...register('strategy_description')} 
                className="w-full border rounded-md p-2 bg-background min-h-[120px]"
                placeholder="Expliquez comment vous analysez le marché, vos critères d'entrée/sortie, les timeframes utilisés, vos indicateurs préférés..."
              />
              {errors.strategy_description && <p className="text-red-500 text-sm mt-1">{errors.strategy_description.message}</p>}
            </div>

            {/* Win Rate */}
            <div>
              <label className="text-sm font-medium mb-1 block">Taux de réussite estimé *</label>
              <select {...register('win_rate')} className="w-full border rounded-md p-2 bg-background">
                <option value="">Sélectionner</option>
                <option value="40-50">40% - 50%</option>
                <option value="50-60">50% - 60%</option>
                <option value="60-70">60% - 70%</option>
                <option value="70-80">70% - 80%</option>
                <option value="80+">80%+</option>
              </select>
              {errors.win_rate && <p className="text-red-500 text-sm mt-1">{errors.win_rate.message}</p>}
            </div>

            {/* Risk Management */}
            <div>
              <label className="text-sm font-medium mb-1 block">Comment gérez-vous le risque ? *</label>
              <textarea 
                {...register('risk_management')} 
                className="w-full border rounded-md p-2 bg-background min-h-[100px]"
                placeholder="Décrivez votre approche du money management, risque par trade, ratio risque/récompense..."
              />
              {errors.risk_management && <p className="text-red-500 text-sm mt-1">{errors.risk_management.message}</p>}
            </div>

            {/* Teaching Experience */}
            <div>
              <label className="text-sm font-medium mb-1 block">Expérience en formation/mentorat *</label>
              <select {...register('teaching_experience')} className="w-full border rounded-md p-2 bg-background">
                <option value="">Sélectionner</option>
                <option value="none">Aucune expérience formelle</option>
                <option value="informal">Mentorat informel (amis, famille)</option>
                <option value="online">Création de contenu en ligne</option>
                <option value="professional">Formateur professionnel</option>
              </select>
              {errors.teaching_experience && <p className="text-red-500 text-sm mt-1">{errors.teaching_experience.message}</p>}
            </div>

            {/* Availability */}
            <div>
              <label className="text-sm font-medium mb-1 block">Disponibilité hebdomadaire *</label>
              <select {...register('available_hours')} className="w-full border rounded-md p-2 bg-background">
                <option value="">Sélectionner</option>
                <option value="5-10h">5 - 10 heures</option>
                <option value="10-20h">10 - 20 heures</option>
                <option value="20-30h">20 - 30 heures</option>
                <option value="30h+">30+ heures (temps plein)</option>
              </select>
              {errors.available_hours && <p className="text-red-500 text-sm mt-1">{errors.available_hours.message}</p>}
            </div>

            {/* Portfolio Link */}
            <div>
              <label className="text-sm font-medium mb-1 block">Lien vers portfolio/MyFxBook/Résultats (optionnel)</label>
              <Input {...register('portfolio_link')} placeholder="https://..." />
            </div>

            {/* Motivation */}
            <div>
              <label className="text-sm font-medium mb-1 block">Pourquoi voulez-vous rejoindre LivefxTrading ? *</label>
              <textarea 
                {...register('why_join')} 
                className="w-full border rounded-md p-2 bg-background min-h-[100px]"
                placeholder="Expliquez votre motivation à devenir formateur chez nous..."
              />
              {errors.why_join && <p className="text-red-500 text-sm mt-1">{errors.why_join.message}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg">
              Soumettre ma candidature
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Nous examinerons votre candidature avec attention. Les profils sélectionnés seront contactés pour un entretien.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainerConsultation;
