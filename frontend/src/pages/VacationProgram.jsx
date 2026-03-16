import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { GraduationCap, Calendar, Clock, Users, CheckCircle, Star } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const registrationSchema = z.object({
  student_name: z.string().min(2, "Nom trop court"),
  student_age: z.number().min(15, "Âge minimum: 15 ans").max(18, "Âge maximum: 18 ans"),
  parent_name: z.string().min(2, "Nom du parent requis"),
  parent_email: z.string().email("Email invalide"),
  parent_phone: z.string().min(8, "Numéro invalide"),
  session: z.string().min(1, "Choisissez une session"),
});

const VacationProgram = () => {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data) => {
    try {
      await api.post('/vacation-programs/register', data);
      setSubmitted(true);
    } catch (error) {
      toast.error('Erreur lors de l\'inscription. Veuillez réessayer.');
    }
  };

  const programs = [
    {
      title: "Introduction au Trading",
      duration: "2 semaines",
      dates: "Juillet 2026",
      price: "150 000 FCFA",
      features: ["Bases du marché financier", "Lecture des graphiques", "Simulation de trading", "Certificat de participation"]
    },
    {
      title: "Trading Intensif",
      duration: "4 semaines",
      dates: "Août 2026",
      price: "280 000 FCFA",
      features: ["Programme complet", "Stratégies réelles", "Compte démo personnel", "Suivi personnalisé", "Certificat avancé"]
    }
  ];

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full mb-6">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Inscription Reçue !</h2>
        <p className="text-muted-foreground max-w-md">
          Merci pour votre inscription. Nous vous contacterons sous 48h pour confirmer la place de votre enfant et vous envoyer les détails de paiement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold bg-primary/10 text-primary">
          <GraduationCap className="h-4 w-4 mr-2" />
          Nouveau Programme 2026
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
          Programme Vacances <span className="text-primary">Trading Junior</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Initiez vos enfants (15-18 ans) au monde de la finance et du trading pendant les vacances. 
          Une expérience éducative unique pour préparer leur avenir financier.
        </p>
      </section>

      {/* Benefits */}
      <section className="grid md:grid-cols-3 gap-6">
        <Card className="text-center p-6">
          <Calendar className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Sessions Flexibles</h3>
          <p className="text-muted-foreground text-sm">Juillet et Août 2026, horaires adaptés aux vacances scolaires</p>
        </Card>
        <Card className="text-center p-6">
          <Users className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Petits Groupes</h3>
          <p className="text-muted-foreground text-sm">Maximum 10 élèves par groupe pour un suivi personnalisé</p>
        </Card>
        <Card className="text-center p-6">
          <Clock className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Apprentissage Pratique</h3>
          <p className="text-muted-foreground text-sm">70% de pratique sur simulateur, 30% de théorie</p>
        </Card>
      </section>

      {/* Programs */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-10">Nos Programmes</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {programs.map((program, idx) => (
            <Card key={idx} className={`relative overflow-hidden ${idx === 1 ? 'border-primary shadow-lg' : ''}`}>
              {idx === 1 && (
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center">
                  <Star className="h-3 w-3 mr-1" /> Populaire
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{program.title}</CardTitle>
                <p className="text-muted-foreground">{program.duration} • {program.dates}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-3xl font-bold text-primary">{program.price}</div>
                <ul className="space-y-3">
                  {program.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Registration Form */}
      <section className="max-w-xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Inscription Programme Vacances</CardTitle>
            <p className="text-muted-foreground">Réservez la place de votre enfant dès maintenant</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nom complet de l'élève</label>
                <Input {...register('student_name')} placeholder="Prénom et Nom" />
                {errors.student_name && <p className="text-red-500 text-sm mt-1">{errors.student_name.message}</p>}
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Âge de l'élève</label>
                <Input {...register('student_age', { valueAsNumber: true })} type="number" min="15" max="18" placeholder="15-18 ans" />
                {errors.student_age && <p className="text-red-500 text-sm mt-1">{errors.student_age.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Nom du parent/tuteur</label>
                <Input {...register('parent_name')} placeholder="Nom du parent" />
                {errors.parent_name && <p className="text-red-500 text-sm mt-1">{errors.parent_name.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Email du parent</label>
                <Input {...register('parent_email')} type="email" placeholder="email@exemple.com" />
                {errors.parent_email && <p className="text-red-500 text-sm mt-1">{errors.parent_email.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Téléphone (WhatsApp)</label>
                <Input {...register('parent_phone')} placeholder="+229 XX XX XX XX" />
                {errors.parent_phone && <p className="text-red-500 text-sm mt-1">{errors.parent_phone.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Session souhaitée</label>
                <select {...register('session')} className="w-full border rounded-md p-2 bg-background">
                  <option value="">Choisir une session</option>
                  <option value="juillet-intro">Juillet 2026 - Introduction (2 sem.)</option>
                  <option value="aout-intensif">Août 2026 - Intensif (4 sem.)</option>
                </select>
                {errors.session && <p className="text-red-500 text-sm mt-1">{errors.session.message}</p>}
              </div>

              <Button type="submit" className="w-full" size="lg">
                Réserver une Place
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                En soumettant ce formulaire, vous acceptez d'être contacté par notre équipe.
              </p>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default VacationProgram;
