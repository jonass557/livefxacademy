import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ClipboardCheck, BarChart3, Target, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const consultationSchema = z.object({
  full_name: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(8, "Numéro invalide"),
  trading_experience: z.enum(['none', 'beginner', 'intermediate', 'advanced']),
  trading_duration: z.string().min(1, "Sélectionnez une option"),
  capital_range: z.string().min(1, "Sélectionnez une option"),
  trading_goals: z.string().min(10, "Décrivez vos objectifs (min 10 caractères)"),
  available_time: z.string().min(1, "Sélectionnez une option"),
  knowledge_areas: z.array(z.string()).optional(),
  biggest_challenge: z.string().min(10, "Décrivez votre défi principal"),
});

const ClientConsultation = () => {
  const [submitted, setSubmitted] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState([]);
  
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(consultationSchema),
  });

  const knowledgeOptions = [
    "Analyse technique",
    "Analyse fondamentale", 
    "Gestion du risque",
    "Psychologie du trading",
    "Indicateurs (RSI, MACD...)",
    "Price Action",
    "Smart Money Concepts",
    "Fibonacci"
  ];

  const toggleKnowledge = (item) => {
    const newSelection = selectedKnowledge.includes(item)
      ? selectedKnowledge.filter(k => k !== item)
      : [...selectedKnowledge, item];
    setSelectedKnowledge(newSelection);
    setValue('knowledge_areas', newSelection);
  };

  const onSubmit = async (data) => {
    try {
      await api.post('/consultations/client', {
        ...data,
        knowledge_areas: selectedKnowledge
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
        <h2 className="text-3xl font-bold mb-4">Fiche Reçue !</h2>
        <p className="text-muted-foreground max-w-md">
          Merci d'avoir rempli cette fiche de consultation. Un de nos formateurs analysera votre profil et vous contactera sous 24h pour vous proposer un programme adapté.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold bg-primary/10 text-primary">
          <ClipboardCheck className="h-4 w-4 mr-2" />
          Évaluation Gratuite
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">Fiche de Consultation</h1>
        <p className="text-muted-foreground">
          Aidez-nous à comprendre votre niveau et vos objectifs pour vous proposer la formation idéale.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="font-medium text-sm">Évaluation de niveau</p>
        </Card>
        <Card className="p-4 text-center">
          <Target className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="font-medium text-sm">Programme personnalisé</p>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="font-medium text-sm">Suivi adapté</p>
        </Card>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informations & Profil de Trading</CardTitle>
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

            <div>
              <label className="text-sm font-medium mb-1 block">Téléphone (WhatsApp) *</label>
              <Input {...register('phone')} placeholder="+229 XX XX XX XX" />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
            </div>

            {/* Trading Experience */}
            <div>
              <label className="text-sm font-medium mb-2 block">Niveau d'expérience en trading *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'none', label: 'Aucun', desc: 'Je débute' },
                  { value: 'beginner', label: 'Débutant', desc: '< 6 mois' },
                  { value: 'intermediate', label: 'Intermédiaire', desc: '6m - 2 ans' },
                  { value: 'advanced', label: 'Avancé', desc: '> 2 ans' },
                ].map((opt) => (
                  <label key={opt.value} className="cursor-pointer">
                    <input type="radio" {...register('trading_experience')} value={opt.value} className="sr-only peer" />
                    <div className="border rounded-lg p-3 text-center peer-checked:border-primary peer-checked:bg-primary/10 transition-all">
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.trading_experience && <p className="text-red-500 text-sm mt-1">{errors.trading_experience.message}</p>}
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium mb-1 block">Depuis combien de temps tradez-vous ? *</label>
              <select {...register('trading_duration')} className="w-full border rounded-md p-2 bg-background">
                <option value="">Sélectionner</option>
                <option value="never">Je n'ai jamais tradé</option>
                <option value="less-3m">Moins de 3 mois</option>
                <option value="3-6m">3 à 6 mois</option>
                <option value="6-12m">6 mois à 1 an</option>
                <option value="1-2y">1 à 2 ans</option>
                <option value="more-2y">Plus de 2 ans</option>
              </select>
              {errors.trading_duration && <p className="text-red-500 text-sm mt-1">{errors.trading_duration.message}</p>}
            </div>

            {/* Capital */}
            <div>
              <label className="text-sm font-medium mb-1 block">Capital prévu pour le trading *</label>
              <select {...register('capital_range')} className="w-full border rounded-md p-2 bg-background">
                <option value="">Sélectionner</option>
                <option value="0-100">Moins de 100$</option>
                <option value="100-500">100$ - 500$</option>
                <option value="500-1000">500$ - 1000$</option>
                <option value="1000-5000">1000$ - 5000$</option>
                <option value="5000+">Plus de 5000$</option>
              </select>
              {errors.capital_range && <p className="text-red-500 text-sm mt-1">{errors.capital_range.message}</p>}
            </div>

            {/* Knowledge Areas */}
            <div>
              <label className="text-sm font-medium mb-2 block">Connaissances actuelles (sélectionnez tout ce qui s'applique)</label>
              <div className="flex flex-wrap gap-2">
                {knowledgeOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleKnowledge(item)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      selectedKnowledge.includes(item)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Available Time */}
            <div>
              <label className="text-sm font-medium mb-1 block">Temps disponible par jour pour apprendre *</label>
              <select {...register('available_time')} className="w-full border rounded-md p-2 bg-background">
                <option value="">Sélectionner</option>
                <option value="less-1h">Moins d'1 heure</option>
                <option value="1-2h">1 à 2 heures</option>
                <option value="2-4h">2 à 4 heures</option>
                <option value="4h+">Plus de 4 heures</option>
              </select>
              {errors.available_time && <p className="text-red-500 text-sm mt-1">{errors.available_time.message}</p>}
            </div>

            {/* Goals */}
            <div>
              <label className="text-sm font-medium mb-1 block">Quels sont vos objectifs avec le trading ? *</label>
              <textarea 
                {...register('trading_goals')} 
                className="w-full border rounded-md p-2 bg-background min-h-[100px]"
                placeholder="Ex: Générer un revenu complémentaire, devenir trader à temps plein, comprendre les marchés financiers..."
              />
              {errors.trading_goals && <p className="text-red-500 text-sm mt-1">{errors.trading_goals.message}</p>}
            </div>

            {/* Biggest Challenge */}
            <div>
              <label className="text-sm font-medium mb-1 block">Quel est votre plus grand défi actuellement ? *</label>
              <textarea 
                {...register('biggest_challenge')} 
                className="w-full border rounded-md p-2 bg-background min-h-[100px]"
                placeholder="Ex: Je ne sais pas par où commencer, je perds souvent mes trades, je n'arrive pas à gérer mes émotions..."
              />
              {errors.biggest_challenge && <p className="text-red-500 text-sm mt-1">{errors.biggest_challenge.message}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg">
              Envoyer ma fiche de consultation
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Vos informations restent confidentielles et ne seront utilisées que pour personnaliser votre accompagnement.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientConsultation;
