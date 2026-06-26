import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import api from '../lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PasswordInput } from '../components/ui/password-input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '../lib/errors';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguageStore();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken);
      toast.success(t('login.successMessage'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(t('login.errorMessage'), { description: getErrorMessage(error, t) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-xl">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
          <CardDescription>LiveFx Academy</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input {...register('email')} placeholder={t('login.email')} type="email" />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <PasswordInput {...register('password')} placeholder={t('login.password')} />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-sm text-primary hover:underline"
                >
                  {t('login.forgotPassword')}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : t('login.submit')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('login.noAccount')}{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                {t('login.registerHere')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      <ForgotPasswordModal open={showForgot} onClose={() => setShowForgot(false)} />
    </div>
  );
};

export default Login;