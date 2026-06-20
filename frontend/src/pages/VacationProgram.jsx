import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { GraduationCap, Calendar, Clock, Users, CheckCircle, Star, ArrowLeft, Upload } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const registrationSchema = z.object({
  program_id: z.string().min(1, "Choisissez un programme"),
  student_name: z.string().min(2, "Nom trop court"),
  student_age: z.number().min(15, "Âge minimum: 15 ans").max(18, "Âge maximum: 18 ans"),
  parent_name: z.string().min(2, "Nom du parent requis"),
  parent_email: z.string().email("Email invalide"),
  parent_phone: z.string().min(8, "Numéro invalide"),
});

const VacationProgram = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [paymentProof, setPaymentProof] = useState(null);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: { program_id: location.state?.programId || '' },
  });

  const selectedProgramId = watch('program_id');
  const selectedProgram = programs.find(p => String(p.id || p._id) === String(selectedProgramId));

  // Fetch active programs from the backend
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await api.get('/vacation-programs');
        const list = res.data.map(p => ({ ...p, id: p.id || p._id }));
        setPrograms(list);
        // Pre-select program coming from the dashboard
        if (location.state?.programId) {
          setValue('program_id', String(location.state.programId));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPrograms();
  }, [location.state, setValue]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('program_id', data.program_id);
      formData.append('student_name', data.student_name);
      formData.append('student_age', data.student_age);
      formData.append('parent_name', data.parent_name);
      formData.append('parent_email', data.parent_email);
      formData.append('parent_phone', data.parent_phone);
      if (selectedProgram) {
        formData.append('session', selectedProgram.title);
        if (selectedProgram.price != null) formData.append('amount', selectedProgram.price);
      }
      if (paymentProof) formData.append('payment_proof', paymentProof);

      await api.post('/vacation-programs/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmitted(true);
    } catch (error) {
      toast.error('Erreur lors de l\'inscription. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  // Static benefits (informational)
  const benefits = [
    { icon: Calendar, title: 'Sessions Flexibles', desc: 'Horaires adaptés aux vacances scolaires' },
    { icon: Users, title: 'Petits Groupes', desc: 'Suivi personnalisé en petit comité' },
    { icon: Clock, title: 'Apprentissage Pratique', desc: '70% de pratique sur simulateur, 30% de théorie' },
  ];

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full mb-6">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Inscription Reçue !</h2>
        <p className="text-muted-foreground max-w-md">
          Merci pour votre inscription. Notre équipe a bien reçu votre demande et votre preuve de paiement.
          Nous vous contacterons sous 48h pour confirmer la place de votre enfant.
        </p>
        <Button variant="outline" className="mt-6 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-8">
        <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold bg-primary/10 text-primary">
          <GraduationCap className="h-4 w-4 mr-2" />
          Programme Vacances
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
          Programme Vacances <span className="text-primary">Trading Junior</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Initiez vos enfants (15-18 ans) au monde de la finance et du trading pendant les vacances.
        </p>
      </section>

      {/* Benefits */}
      <section className="grid md:grid-cols-3 gap-6">
        {benefits.map((b, i) => (
          <Card key={i} className="text-center p-6">
            <b.icon className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">{b.title}</h3>
            <p className="text-muted-foreground text-sm">{b.desc}</p>
          </Card>
        ))}
      </section>

      {/* Programs */}
      {programs.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold text-center mb-10">Nos Programmes</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {programs.map((program, idx) => {
              const pid = String(program.id);
              const isSelected = String(selectedProgramId) === pid;
              return (
                <Card
                  key={pid}
                  onClick={() => setValue('program_id', pid, { shouldValidate: true })}
                  className={`relative overflow-hidden cursor-pointer transition-shadow ${isSelected ? 'border-primary shadow-lg ring-2 ring-primary' : 'hover:shadow-md'}`}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center">
                      <Star className="h-3 w-3 mr-1" /> Sélectionné
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{program.title}</CardTitle>
                    {(program.start_date || program.location) && (
                      <p className="text-muted-foreground">
                        {program.start_date && new Date(program.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {program.location ? ` • ${program.location}` : ''}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {program.price != null && (
                      <div className="text-3xl font-bold text-primary">{program.price} €</div>
                    )}
                    {program.description && (
                      <p className="text-muted-foreground text-sm">{program.description}</p>
                    )}
                    {program.age_range && (
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        {program.age_range}
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

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
                <label className="text-sm font-medium mb-1 block">Programme souhaité</label>
                <select {...register('program_id')} className="w-full border rounded-md p-2 bg-background">
                  <option value="">Choisir un programme</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}{p.price != null ? ` — ${p.price} €` : ''}
                    </option>
                  ))}
                </select>
                {errors.program_id && <p className="text-red-500 text-sm mt-1">{errors.program_id.message}</p>}
              </div>

              {/* Auto-filled amount */}
              <div>
                <label className="text-sm font-medium mb-1 block">Montant à payer</label>
                <Input
                  value={selectedProgram?.price != null ? `${selectedProgram.price} €` : ''}
                  placeholder="Sélectionnez un programme"
                  readOnly
                  className="bg-muted font-semibold"
                />
              </div>

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

              {/* Payment proof upload */}
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                  <Upload className="h-4 w-4" /> Preuve de paiement (image ou PDF)
                </label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setPaymentProof(e.target.files[0])}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Téléversez le justificatif du paiement correspondant au programme choisi.
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? 'Envoi en cours...' : 'Réserver une Place'}
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
