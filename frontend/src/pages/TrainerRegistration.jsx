import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { UserPlus, Shield, CheckCircle, Upload } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const trainerRegistrationSchema = z.object({
  // Personal Info
  full_name: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(8, "Numéro invalide"),
  password: z.string().min(8, "Mot de passe minimum 8 caractères"),
  confirm_password: z.string(),
  
  // Professional Info
  bio: z.string().min(50, "Bio minimum 50 caractères"),
  specialty: z.string().min(1, "Spécialité requise"),
  years_experience: z.number().min(1, "Minimum 1 an"),
  certifications: z.string().optional(),
  
  // Social & Portfolio
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  youtube: z.string().optional(),
  myfxbook: z.string().optional(),
  
  // Legal
  terms_accepted: z.boolean().refine(val => val === true, "Vous devez accepter les conditions"),
}).refine(data => data.password === data.confirm_password, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm_password"],
});

const TrainerRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, trigger, watch } = useForm({
    resolver: zodResolver(trainerRegistrationSchema),
    mode: 'onChange'
  });

  const specialties = [
    "Forex",
    "Crypto-monnaies",
    "Actions/Indices",
    "Analyse Technique",
    "Price Action",
    "Smart Money Concepts",
    "Gestion du Risque",
    "Psychologie du Trading"
  ];

  const nextStep = async () => {
    const fieldsToValidate = step === 1 
      ? ['full_name', 'email', 'phone', 'password', 'confirm_password']
      : ['bio', 'specialty', 'years_experience'];
    
    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const onSubmit = async (data) => {
    try {
      // Remove confirm_password before sending
      const { confirm_password, terms_accepted, ...submitData } = data;
      await api.post('/auth/register-trainer', {
        ...submitData,
        role: 'trainer'
      });
      setSubmitted(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'inscription');
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full mb-6">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Compte Créé avec Succès !</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Votre compte formateur a été créé. Notre équipe va vérifier votre profil sous 48-72h. 
          Vous recevrez un email de confirmation une fois approuvé.
        </p>
        <Button onClick={() => navigate('/login')}>
          Se Connecter
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold bg-primary/10 text-primary">
          <UserPlus className="h-4 w-4 mr-2" />
          Inscription Formateur
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">Rejoignez Notre Équipe</h1>
        <p className="text-muted-foreground">
          Créez votre compte formateur et commencez à partager votre expertise.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div 
            key={s} 
            className={`h-2 w-16 rounded-full transition-colors ${
              s <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Informations Personnelles"}
            {step === 2 && "Profil Professionnel"}
            {step === 3 && "Réseaux & Finalisation"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Créez votre compte sécurisé"}
            {step === 2 && "Décrivez votre expertise"}
            {step === 3 && "Ajoutez vos liens et confirmez"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Nom complet *</label>
                  <Input {...register('full_name')} placeholder="Prénom et Nom" />
                  {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Email *</label>
                  <Input {...register('email')} type="email" placeholder="email@exemple.com" />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Téléphone (WhatsApp) *</label>
                  <Input {...register('phone')} placeholder="+229 XX XX XX XX" />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Mot de passe *</label>
                  <Input {...register('password')} type="password" placeholder="Minimum 8 caractères" />
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Confirmer le mot de passe *</label>
                  <Input {...register('confirm_password')} type="password" placeholder="Répétez le mot de passe" />
                  {errors.confirm_password && <p className="text-red-500 text-sm mt-1">{errors.confirm_password.message}</p>}
                </div>

                <Button type="button" onClick={nextStep} className="w-full">
                  Continuer
                </Button>
              </>
            )}

            {/* Step 2: Professional Info */}
            {step === 2 && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Spécialité principale *</label>
                  <select {...register('specialty')} className="w-full border rounded-md p-2 bg-background">
                    <option value="">Sélectionner</option>
                    {specialties.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.specialty && <p className="text-red-500 text-sm mt-1">{errors.specialty.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Années d'expérience en trading *</label>
                  <Input {...register('years_experience', { valueAsNumber: true })} type="number" min="1" placeholder="Ex: 5" />
                  {errors.years_experience && <p className="text-red-500 text-sm mt-1">{errors.years_experience.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Bio / Présentation *</label>
                  <textarea 
                    {...register('bio')} 
                    className="w-full border rounded-md p-2 bg-background min-h-[150px]"
                    placeholder="Présentez-vous : votre parcours, votre style de trading, ce qui vous passionne..."
                  />
                  {errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Certifications (optionnel)</label>
                  <Input {...register('certifications')} placeholder="Ex: CMT, CFTe, CFA..." />
                </div>

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                    Retour
                  </Button>
                  <Button type="button" onClick={nextStep} className="flex-1">
                    Continuer
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Social & Confirmation */}
            {step === 3 && (
              <>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Liens optionnels pour renforcer votre profil :</p>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">LinkedIn</label>
                    <Input {...register('linkedin')} placeholder="https://linkedin.com/in/..." />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Twitter/X</label>
                    <Input {...register('twitter')} placeholder="https://twitter.com/..." />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">YouTube</label>
                    <Input {...register('youtube')} placeholder="https://youtube.com/..." />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">MyFxBook / Portfolio</label>
                    <Input {...register('myfxbook')} placeholder="https://myfxbook.com/..." />
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Vérification du profil</p>
                      <p className="text-muted-foreground">
                        Votre compte sera vérifié par notre équipe sous 48-72h avant activation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    {...register('terms_accepted')} 
                    className="mt-1"
                  />
                  <label className="text-sm">
                    J'accepte les <a href="#" className="text-primary underline">conditions d'utilisation</a> et 
                    la <a href="#" className="text-primary underline">politique de confidentialité</a> de LivefxTrading.
                  </label>
                </div>
                {errors.terms_accepted && <p className="text-red-500 text-sm">{errors.terms_accepted.message}</p>}

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                    Retour
                  </Button>
                  <Button type="submit" className="flex-1">
                    Créer mon compte
                  </Button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainerRegistration;
