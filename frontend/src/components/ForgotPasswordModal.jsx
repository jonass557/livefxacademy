import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { useLanguageStore } from '../store/languageStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PasswordInput } from './ui/password-input';

const ForgotPasswordModal = ({ open, onClose }) => {
  const { t } = useLanguageStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schema = z.object({
    email: z.string().email(t('register.invalidEmail')),
    phone: z.string().min(4, t('register.invalidPhone')),
    password: z.string().min(6, t('register.passwordTooShort')),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  if (!open) return null;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', data);
      toast.success(t('forgot.successMessage'));
      handleClose();
    } catch (error) {
      toast.error(t('forgot.errorMessage'), { description: getErrorMessage(error, t) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label={t('forgot.close')}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex justify-center">
          <div className="rounded-xl bg-primary p-3 text-primary-foreground">
            <KeyRound className="h-7 w-7" />
          </div>
        </div>
        <h2 className="text-center text-xl font-semibold">{t('forgot.title')}</h2>
        <p className="mb-5 text-center text-sm text-muted-foreground">{t('forgot.subtitle')}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input {...register('email')} placeholder={t('forgot.email')} type="email" />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <Input {...register('phone')} placeholder={t('forgot.phone')} />
            {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
          </div>
          <div>
            <PasswordInput {...register('password')} placeholder={t('forgot.newPassword')} />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : t('forgot.submit')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
