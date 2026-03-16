import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { GraduationCap, User, CheckCircle } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { toast } from 'sonner';

const Register = () => {
  const navigate = useNavigate();
  const { t } = useLanguageStore();
  const [selectedRole, setSelectedRole] = useState('client');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerSchema = z.object({
    full_name: z.string().min(2, t('register.nameTooShort')),
    email: z.string().email(t('register.invalidEmail')),
    phone: z.string().min(8, t('register.invalidPhone')),
    password: z.string().min(6, t('register.passwordTooShort')),
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await api.post('/auth/register', { ...data, role: selectedRole });
      toast.success(t('register.successMessage'));
      navigate('/login');
    } catch (error) {
      toast.error(t('register.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
          <CardDescription>{t('register.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">{t('register.iAm')}</label>
              <div className="grid grid-cols-2 gap-4">
                {/* Student Option */}
                <div
                  onClick={() => setSelectedRole('client')}
                  className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${
                    selectedRole === 'client'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className={`inline-flex p-3 rounded-full mb-2 ${
                    selectedRole === 'client' ? 'bg-primary/20' : 'bg-muted'
                  }`}>
                    <User className={`h-6 w-6 ${selectedRole === 'client' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <h4 className="font-semibold">{t('register.student')}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{t('register.studentDesc')}</p>
                  {selectedRole === 'client' && (
                    <CheckCircle className="h-5 w-5 text-primary mx-auto mt-2" />
                  )}
                </div>

                {/* Trainer Option */}
                <div
                  onClick={() => setSelectedRole('trainer')}
                  className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${
                    selectedRole === 'trainer'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className={`inline-flex p-3 rounded-full mb-2 ${
                    selectedRole === 'trainer' ? 'bg-primary/20' : 'bg-muted'
                  }`}>
                    <GraduationCap className={`h-6 w-6 ${selectedRole === 'trainer' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <h4 className="font-semibold">{t('register.trainer')}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{t('register.trainerDesc')}</p>
                  {selectedRole === 'trainer' && (
                    <CheckCircle className="h-5 w-5 text-primary mx-auto mt-2" />
                  )}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Input {...register('full_name')} placeholder={t('register.fullName')} />
                {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>}
              </div>
              <div>
                <Input {...register('email')} placeholder={t('register.email')} type="email" />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Input {...register('phone')} placeholder={t('register.phone')} />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <Input {...register('password')} placeholder={t('register.password')} type="password" />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : t('register.submit')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('register.alreadyAccount')}{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                {t('register.loginHere')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
