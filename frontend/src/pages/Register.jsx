import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PasswordInput } from '../components/ui/password-input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import {
  GraduationCap,
  User,
  CheckCircle,
  Share2,
  CreditCard,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Lock,
  Sparkles,
  X
} from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { toast } from 'sonner';
import { getErrorMessage } from '../lib/errors';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCodeFromUrl = searchParams.get('ref') || searchParams.get('referral') || '';
  const planIdFromUrl = searchParams.get('plan_id') || '';
  const { t, language } = useLanguageStore();
  const isEn = language === 'en';

  const [selectedRole, setSelectedRole] = useState('client');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCode, setReferralCode] = useState(refCodeFromUrl);

  // Plans & Pre-registration Payment State
  const [plans, setPlans] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState({
    active_payment_gateway: 'ikeepay',
    ikeepay_enabled: true,
    sebpay_enabled: false,
    ikeepay_public_key: '',
  });
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [payForm, setPayForm] = useState({
    phone: '',
    operator: 'mtn',
    country: 'BJ',
    otp_code: '',
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paidReference, setPaidReference] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);

  // iKeePay Inline Checkout state
  const [ikeepayInlineUrl, setIkeepayInlineUrl] = useState('');
  const [ikeepayOverlayVisible, setIkeepayOverlayVisible] = useState(false);
  const [ikeepayOrderRef, setIkeepayOrderRef] = useState('');
  const ikeepayOrderRefCurrent = useRef('');

  // Charger les plans actifs et la passerelle active (iKeePay ou SEBPAY) à l'ouverture
  useEffect(() => {
    let active = true;
    setLoadingPlans(true);
    Promise.all([
      api.get('/subscriptions/plans').catch(() => ({ data: [] })),
      api.get('/subscriptions/payment-config').catch(() => ({ data: null })),
    ])
      .then(([plansRes, configRes]) => {
        if (!active) return;
        const list = Array.isArray(plansRes.data) ? plansRes.data : [];
        setPlans(list);
        if (configRes.data) {
          setPaymentConfig(configRes.data);
        }
        if (list.length > 0) {
          const found = planIdFromUrl
            ? list.find((p) => String(p.id || p._id) === String(planIdFromUrl))
            : null;
          setSelectedPlan(found || list[0]);
        }
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });
    return () => {
      active = false;
    };
  }, [planIdFromUrl]);

  // Écoute des signaux postMessage d'iKeePay Inline Checkout ('ikeepay-ready', 'ikeepay-success', 'ikeepay-close')
  useEffect(() => {
    const handleIkeepayMessage = async (e) => {
      const msg = e.data;
      const msgType = typeof msg === 'string' ? msg : (msg?.type || msg?.event || '');

      if (msg === 'ikeepay-ready' || msgType === 'ikeepay-ready') {
        const overlayEl = document.getElementById('ikeepay-overlay');
        if (overlayEl) overlayEl.style.display = 'flex';
        setIkeepayOverlayVisible(true);
        setSubmittingPayment(false);
      } else if (
        msg === 'ikeepay-success' ||
        msgType === 'ikeepay-success' ||
        msgType === 'payment.success' ||
        (typeof msg === 'object' && msg && String(msg.status || '').toLowerCase() === 'completed')
      ) {
        const ref = ikeepayOrderRefCurrent.current || msg?.order_id || paymentResult?.reference;
        const ikeepayRef = typeof msg === 'object' ? (msg.ikeepay_ref || msg.reference) : undefined;
        setIkeepayOverlayVisible(false);
        setIkeepayInlineUrl('');
        const overlayEl = document.getElementById('ikeepay-overlay');
        if (overlayEl) overlayEl.style.display = 'none';

        if (ref) {
          try {
            await api.post('/subscriptions/public/confirm-ikeepay', {
              reference: ref,
              ikeepay_ref: ikeepayRef,
              signal: 'ikeepay-success',
            });
          } catch (_) {}
          setPaidReference(ref);
          setPaymentResult((prev) => (prev ? { ...prev, status: 'completed' } : { reference: ref, status: 'completed' }));
        }
        toast.success(
          isEn
            ? 'Payment validated via iKeePay! You can now complete your Student or Trainer registration below.'
            : 'Paiement validé avec succès ! Vous pouvez maintenant compléter votre inscription Élève ou Formateur ci-dessous.'
        );
      } else if (msg === 'ikeepay-close' || msgType === 'ikeepay-close') {
        setIkeepayOverlayVisible(false);
        setIkeepayInlineUrl('');
        setSubmittingPayment(false);
        const overlayEl = document.getElementById('ikeepay-overlay');
        if (overlayEl) overlayEl.style.display = 'none';

        const ref = ikeepayOrderRefCurrent.current;
        if (ref && !paidReference) {
          try {
            const st = await api.get(`/subscriptions/public/status/${ref}`);
            if (st.data?.status === 'completed' || st.data?.is_paid) {
              setPaidReference(ref);
              toast.success(isEn ? 'Payment confirmed!' : 'Paiement confirmé !');
            }
          } catch (_) {}
        }
      }
    };

    window.addEventListener('message', handleIkeepayMessage);
    return () => window.removeEventListener('message', handleIkeepayMessage);
  }, [isEn, paidReference, paymentResult?.reference]);

  // Polling automatique toutes les 4s lorsqu'un paiement Mobile Money est en attente
  useEffect(() => {
    if (!paymentResult?.reference || paymentResult?.status === 'completed' || paidReference) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/subscriptions/public/status/${paymentResult.reference}`);
        if (res.data?.status === 'completed' || res.data?.is_paid) {
          setPaymentResult((prev) => (prev ? { ...prev, status: 'completed' } : prev));
          setPaidReference(paymentResult.reference);
          setIkeepayOverlayVisible(false);
          setIkeepayInlineUrl('');
          toast.success(
            isEn
              ? 'Payment confirmed! You can now complete your Student or Trainer registration below.'
              : 'Paiement confirmé ! Vous pouvez maintenant compléter votre inscription Élève ou Formateur ci-dessous.'
          );
        } else if (res.data?.status === 'failed' || res.data?.status === 'cancelled') {
          setPaymentResult((prev) => (prev ? { ...prev, status: 'failed' } : prev));
          toast.error(isEn ? 'Payment was declined or cancelled.' : 'Le paiement a été refusé ou annulé.');
        }
      } catch (_) {}
    }, 4000);
    return () => clearInterval(interval);
  }, [paymentResult?.reference, paymentResult?.status, paidReference, isEn]);

  const activeGateway = paymentConfig.active_payment_gateway || 'ikeepay';

  // Lancer le paiement Inline Checkout iKeePay
  const handleStartIkeepayCheckout = async () => {
    if (!selectedPlan) {
      toast.warning(isEn ? 'Please select a subscription plan first.' : 'Veuillez d’abord sélectionner un plan de souscription.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await api.post('/subscriptions/public/pay', {
        gateway: 'ikeepay',
        plan_id: selectedPlan.id || selectedPlan._id,
        plan_name: selectedPlan.name,
        currency: 'XOF',
        referral_code: referralCode ? referralCode.trim() : undefined,
        redirect_url: window.location.href,
      });

      const orderId = res.data?.order_id || res.data?.reference || ('REF_' + Date.now());
      ikeepayOrderRefCurrent.current = orderId;
      setIkeepayOrderRef(orderId);
      setPaymentResult(res.data);

      // Construction de l'URL officielle iKeePay Inline Checkout selon la documentation
      const params = new URLSearchParams({
        pk: res.data?.pk || paymentConfig.ikeepay_public_key,
        amount: String(res.data?.amount || Math.round(Number(selectedPlan.price_xaf))),
        currency: String(res.data?.currency || 'XOF'),
        order_id: orderId,
        redirect_url: window.location.origin + '/register',
      });
      const url = res.data?.inline_url || `https://ikeepay.com/checkout/v1/inline?${params.toString()}`;
      setIkeepayInlineUrl(url);
    } catch (err) {
      setSubmittingPayment(false);
      toast.error(err.response?.data?.message || (isEn ? 'Unable to start iKeePay checkout' : "Erreur lors de l'ouverture du paiement iKeePay"));
    }
  };

  // Lancer le paiement SEBPAY
  const handlePaySelectedPlanSebpay = async (e) => {
    e.preventDefault();
    if (!selectedPlan) {
      toast.warning(isEn ? 'Please select a subscription plan first.' : 'Veuillez d’abord sélectionner un plan de souscription.');
      return;
    }
    if (!payForm.phone || payForm.phone.trim().length < 6) {
      toast.warning(isEn ? 'Please enter a valid Mobile Money phone number.' : 'Veuillez saisir un numéro de téléphone Mobile Money valide.');
      return;
    }

    setSubmittingPayment(true);
    setPaymentResult(null);
    try {
      const res = await api.post('/subscriptions/public/pay', {
        gateway: 'sebpay',
        plan_id: selectedPlan.id || selectedPlan._id,
        plan_name: selectedPlan.name,
        phone: payForm.phone,
        operator: payForm.operator,
        country: payForm.country,
        otp_code: payForm.otp_code || undefined,
        referral_code: referralCode ? referralCode.trim() : undefined,
      });

      setPaymentResult(res.data);
      if (res.data?.provider_link) {
        window.open(res.data.provider_link, '_blank', 'noopener,noreferrer');
      }
      if (res.data?.status === 'completed') {
        setPaidReference(res.data.reference);
        toast.success(
          isEn
            ? 'Payment validated! Complete your registration below.'
            : 'Paiement validé ! Complétez maintenant votre inscription Élève ou Formateur ci-dessous.'
        );
      } else {
        toast.info(
          res.data?.message ||
            (isEn
              ? 'Payment initiated! Confirm on your phone with your secret PIN.'
              : 'Demande envoyée sur votre téléphone ! Validez avec votre code secret Mobile Money.')
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (isEn ? 'Payment initialization failed' : 'Erreur lors du lancement du paiement'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleManualVerifyPayment = async () => {
    const ref = paymentResult?.reference || ikeepayOrderRef;
    if (!ref) return;
    setCheckingStatus(true);
    try {
      const res = await api.get(`/subscriptions/public/status/${ref}`);
      if (res.data?.status === 'completed' || res.data?.is_paid) {
        setPaymentResult((prev) => (prev ? { ...prev, status: 'completed' } : prev));
        setPaidReference(ref);
        setIkeepayOverlayVisible(false);
        setIkeepayInlineUrl('');
        toast.success(isEn ? 'Payment confirmed! Complete your registration below.' : 'Paiement confirmé ! Vous pouvez maintenant vous inscrire ci-dessous.');
      } else if (res.data?.status === 'failed') {
        toast.error(isEn ? 'Payment declined by operator.' : "Le paiement a été refusé par l'opérateur.");
      } else {
        toast.info(isEn ? 'Still awaiting validation...' : 'Toujours en attente de validation...');
      }
    } catch (_) {
      toast.error(isEn ? 'Unable to check status' : 'Impossible de vérifier le statut');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleStartTrialPreReg = async () => {
    if (!selectedPlan || !(Number(selectedPlan.trial_days) > 0)) return;
    setStartingTrial(true);
    try {
      const res = await api.post('/subscriptions/public/start-trial', {
        plan_id: selectedPlan.id || selectedPlan._id,
        phone: payForm.phone || undefined,
      });
      if (res.data?.reference) {
        setPaidReference(res.data.reference);
        setPaymentResult(res.data);
        toast.success(
          res.data.message ||
            (isEn ? 'Trial activated! Complete your registration below.' : 'Essai activé ! Complétez maintenant votre inscription ci-dessous.')
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (isEn ? 'Unable to start trial' : "Impossible d'activer la période d'essai"));
    } finally {
      setStartingTrial(false);
    }
  };

  const registerSchema = z.object({
    full_name: z.string().trim().min(2, t('register.nameTooShort')),
    email: z.string().trim().email(t('register.invalidEmail')),
    phone: z.string().trim().min(8, t('register.invalidPhone')),
    password: z.string().min(6, t('register.passwordTooShort')),
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (payForm.phone && payForm.phone.trim().length >= 8) {
      setValue('phone', payForm.phone.trim());
    }
  }, [payForm.phone, setValue]);

  const requiresPlanPayment = plans.length > 0;
  const isRegistrationUnlocked = !requiresPlanPayment || Boolean(paidReference);

  const onSubmit = async (data) => {
    if (requiresPlanPayment && !paidReference) {
      toast.warning(
        isEn
          ? 'Please select and pay your subscription plan first before registering.'
          : "Veuillez d'abord sélectionner votre plan et valider le paiement à l'Étape 1 avant de vous inscrire."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/register', {
        ...data,
        role: selectedRole,
        referral_code: referralCode ? referralCode.trim() : undefined,
        payment_reference: paidReference || undefined,
        plan_id: selectedPlan ? (selectedPlan.id || selectedPlan._id) : undefined,
      });
      toast.success(t('register.successMessage'));
      navigate('/login');
    } catch (error) {
      toast.error(t('register.errorMessage'), { description: getErrorMessage(error, t) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingPlans) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ==================== OVERLAY INLINE CHECKOUT IKEEPAY (Structure HTML Officielle) ==================== */}
      <div
        id="ikeepay-overlay"
        style={{ display: ikeepayOverlayVisible ? 'flex' : 'none' }}
        className="fixed inset-0 z-50 hidden items-center justify-center bg-black/40 backdrop-blur-sm p-3"
      >
        <div className="relative w-full max-w-[450px] h-[90vh]">
          <button
            type="button"
            onClick={() => {
              setIkeepayOverlayVisible(false);
              setIkeepayInlineUrl('');
              setSubmittingPayment(false);
              const overlayEl = document.getElementById('ikeepay-overlay');
              if (overlayEl) overlayEl.style.display = 'none';
            }}
            className="absolute -top-2 -right-2 z-20 h-8 w-8 rounded-full bg-card border shadow-lg flex items-center justify-center text-foreground hover:bg-destructive hover:text-white transition-colors"
            title={isEn ? 'Close' : 'Fermer'}
          >
            <X className="h-4 w-4" />
          </button>
          <iframe
            id="ikeepay-iframe"
            src={ikeepayInlineUrl}
            allowTransparency="true"
            onLoad={() => {
              if (ikeepayInlineUrl) {
                setTimeout(() => {
                  const overlayEl = document.getElementById('ikeepay-overlay');
                  if (overlayEl) overlayEl.style.display = 'flex';
                  setIkeepayOverlayVisible(true);
                  setSubmittingPayment(false);
                }, 900);
              }
            }}
            className="w-full h-full border-none bg-transparent rounded-2xl"
          />
        </div>
      </div>

      {/* ==================== ÉTAPE 1 : CHOIX DU PLAN & PAIEMENT (SI PLANS ACTIFS) ==================== */}
      {requiresPlanPayment && (
        <Card className={`border-2 transition-all ${paidReference ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-primary/40 shadow-lg'}`}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary">
                <CreditCard className="h-3.5 w-3.5" />
                <span>{isEn ? 'STEP 1 OF 2 — REQUIRED BEFORE REGISTRATION' : 'ÉTAPE 1 SUR 2 — OBLIGATOIRE AVANT INSCRIPTION'}</span>
              </div>
              {paidReference && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>{isEn ? 'Plan Validated' : 'Plan Validé'}</span>
                </span>
              )}
            </div>
            <CardTitle className="text-xl sm:text-2xl mt-2">
              {isEn ? '1. Select and Pay Your Subscription Plan' : '1. Sélectionnez votre Plan et validez votre Paiement'}
            </CardTitle>
            <CardDescription>
              {isEn
                ? 'Choose your plan below and complete your payment to unlock your Student or Trainer registration.'
                : "Choisissez votre formule ci-dessous et effectuez le paiement Mobile Money pour débloquer l'inscription en tant qu'Élève ou Formateur."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Sélection des cartes de plans */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p) => {
                const pid = p.id || p._id;
                const isSelected = selectedPlan && String(selectedPlan.id || selectedPlan._id) === String(pid);
                const feats = Array.isArray(p.features) ? p.features : [];
                return (
                  <div
                    key={pid}
                    onClick={() => {
                      if (!paidReference) {
                        setSelectedPlan(p);
                        setPaymentResult(null);
                      }
                    }}
                    className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary">
                          {p.duration_days} {isEn ? 'Days' : 'Jours'}
                        </span>
                        {p.trial_days > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                            🎁 {p.trial_days}j {isEn ? 'trial' : 'essai'}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-base">{p.name}</h4>
                      {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                      <div className="pt-1">
                        <span className="text-2xl font-extrabold">{Number(p.price_xaf).toLocaleString()}</span>
                        <span className="text-xs font-semibold text-muted-foreground ml-1">XAF</span>
                      </div>
                      {feats.length > 0 && (
                        <div className="space-y-1 pt-2 border-t">
                          {feats.slice(0, 4).map((f, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-2 border-t flex items-center justify-between text-xs font-bold text-primary">
                      <span>{isSelected ? (isEn ? '✓ Selected Plan' : '✓ Plan sélectionné') : (isEn ? 'Select this plan' : 'Choisir ce plan')}</span>
                      {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Zone de paiement selon la passerelle active (iKeePay ou SEBPAY) */}
            {selectedPlan && !paidReference && (
              <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <h4 className="font-bold text-sm sm:text-base">
                      {activeGateway === 'ikeepay'
                        ? (isEn ? `Instant Mobile Money Payment (iKeePay) — ${selectedPlan.name}` : `Paiement Mobile Money (iKeePay) — ${selectedPlan.name}`)
                        : (isEn ? `Mobile Money Payment (SEBPAY) — ${selectedPlan.name}` : `Paiement Mobile Money (SEBPAY) — ${selectedPlan.name}`)}
                    </h4>
                  </div>
                  <span className="text-lg font-extrabold text-primary">
                    {Number(selectedPlan.price_xaf).toLocaleString()} XAF
                  </span>
                </div>

                {activeGateway === 'ikeepay' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      {isEn
                        ? 'Click the button below to open the secure iKeePay payment window directly on this page without leaving the site.'
                        : 'Cliquez sur le bouton ci-dessous pour ouvrir le guichet de paiement sécurisé iKeePay directement sur cette page.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        onClick={handleStartIkeepayCheckout}
                        disabled={submittingPayment}
                        className="flex-1 gap-2 font-bold h-11 text-sm shadow-md"
                      >
                        {submittingPayment ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        <span>
                          {submittingPayment
                            ? (isEn ? 'Loading secure iKeePay checkout...' : 'Chargement sécurisé iKeePay...')
                            : (isEn
                                ? `Pay ${Number(selectedPlan.price_xaf).toLocaleString()} XAF with iKeePay`
                                : `Payer ${Number(selectedPlan.price_xaf).toLocaleString()} XAF avec iKeePay`)}
                        </span>
                      </Button>

                      {Number(selectedPlan.trial_days) > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={startingTrial}
                          onClick={handleStartTrialPreReg}
                          className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 font-bold h-11"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>
                            {startingTrial
                              ? (isEn ? 'Activating...' : 'Activation...')
                              : (isEn ? `Start ${selectedPlan.trial_days}d Trial` : `Essai gratuit (${selectedPlan.trial_days}j)`)}
                          </span>
                        </Button>
                      )}
                    </div>

                    {ikeepayOrderRef && (
                      <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t text-xs">
                        <span className="text-muted-foreground font-mono">Réf : {ikeepayOrderRef}</span>
                        <Button size="sm" variant="outline" onClick={handleManualVerifyPayment} disabled={checkingStatus} className="gap-1.5 h-8 text-xs">
                          <RefreshCw className={`h-3.5 w-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                          <span>{isEn ? 'Verify payment status' : 'Vérifier le statut du paiement'}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : !paymentResult ? (
                  <form onSubmit={handlePaySelectedPlanSebpay} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold block mb-1">{isEn ? 'Country' : 'Pays'}</label>
                        <select
                          className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                          value={payForm.country}
                          onChange={(e) => setPayForm({ ...payForm, country: e.target.value })}
                        >
                          <option value="BJ">🇧🇯 Bénin (+229)</option>
                          <option value="CI">🇨🇮 Côte d'Ivoire (+225)</option>
                          <option value="TG">🇹🇬 Togo (+228)</option>
                          <option value="SN">🇸🇳 Sénégal (+221)</option>
                          <option value="BF">🇧🇫 Burkina Faso (+226)</option>
                          <option value="CM">🇨🇲 Cameroun (+237)</option>
                          <option value="ML">🇲🇱 Mali (+223)</option>
                          <option value="NE">🇳🇪 Niger (+227)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold block mb-1">{isEn ? 'Mobile Operator' : 'Opérateur Mobile Money'}</label>
                        <select
                          className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                          value={payForm.operator}
                          onChange={(e) => setPayForm({ ...payForm, operator: e.target.value })}
                        >
                          <option value="mtn">MTN Mobile Money (MoMo)</option>
                          <option value="moov">Moov Money</option>
                          <option value="celtiis">Celtiis Cash (Bénin)</option>
                          <option value="orange">Orange Money</option>
                          <option value="wave">Wave</option>
                          <option value="tmoney">T-Money / Yas (Togo)</option>
                          <option value="free">Free Money (Sénégal)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold block mb-1">
                          {isEn ? 'Mobile Money Phone Number *' : 'Numéro de téléphone Mobile Money *'}
                        </label>
                        <Input
                          type="tel"
                          required
                          placeholder="Ex: 0197000000 ou 22997000000"
                          value={payForm.phone}
                          onChange={(e) => setPayForm({ ...payForm, phone: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold block mb-1">
                          {isEn ? 'OTP Code (if required by Orange/Wave)' : 'Code OTP (si exigé par Orange Money)'}
                        </label>
                        <Input
                          type="text"
                          placeholder={isEn ? 'Leave empty for MTN/Moov' : 'Laisser vide pour MTN / Moov'}
                          value={payForm.otp_code}
                          onChange={(e) => setPayForm({ ...payForm, otp_code: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button type="submit" disabled={submittingPayment} className="flex-1 gap-2 font-bold h-11">
                        {submittingPayment ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        <span>
                          {submittingPayment
                            ? (isEn ? 'Sending request...' : 'Envoi de la demande...')
                            : (isEn
                                ? `Pay ${Number(selectedPlan.price_xaf).toLocaleString()} XAF & Unlock Registration`
                                : `Payer ${Number(selectedPlan.price_xaf).toLocaleString()} XAF et débloquer l'inscription`)}
                        </span>
                      </Button>

                      {Number(selectedPlan.trial_days) > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={startingTrial}
                          onClick={handleStartTrialPreReg}
                          className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 font-bold h-11"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>
                            {startingTrial
                              ? (isEn ? 'Activating...' : 'Activation...')
                              : (isEn ? `Start ${selectedPlan.trial_days}d Trial` : `Essai gratuit (${selectedPlan.trial_days}j)`)}
                          </span>
                        </Button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 py-2 text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-bold text-base">
                        {isEn ? 'Waiting for confirmation on your phone...' : 'En attente de validation sur votre téléphone...'}
                      </h5>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        {paymentResult.message}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        Réf : {paymentResult.reference}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button onClick={handleManualVerifyPayment} disabled={checkingStatus} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                        <span>{isEn ? 'I confirmed on my phone (Verify)' : "J'ai validé sur mon téléphone (Vérifier)"}</span>
                      </Button>
                      <Button variant="outline" onClick={() => setPaymentResult(null)}>
                        {isEn ? 'Change number / Retry' : 'Modifier le numéro / Réessayer'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Confirmation une fois payé */}
            {paidReference && selectedPlan && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-emerald-900 dark:text-emerald-300">
                      {isEn
                        ? `Plan "${selectedPlan.name}" validated! (Ref: ${paidReference})`
                        : `Plan « ${selectedPlan.name} » validé avec succès ! (Réf : ${paidReference})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isEn
                        ? 'You can now fill out the form below to register as a Student or Trainer.'
                        : 'Vous pouvez maintenant remplir le formulaire ci-dessous pour vous inscrire en tant qu’Élève ou Formateur.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ==================== ÉTAPE 2 : FORMULAIRE D'INSCRIPTION (ÉLÈVE OU FORMATEUR) ==================== */}
      <Card className={`w-full max-w-lg mx-auto transition-all ${!isRegistrationUnlocked ? 'opacity-60 pointer-events-none select-none' : 'shadow-lg'}`}>
        <CardHeader className="text-center">
          {requiresPlanPayment && (
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground mx-auto mb-2">
              {isRegistrationUnlocked ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{isEn ? 'STEP 2 OF 2 — CREATE YOUR ACCOUNT' : 'ÉTAPE 2 SUR 2 — CRÉEZ VOTRE COMPTE'}</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 text-amber-500" />
                  <span>{isEn ? 'STEP 2 LOCKED — COMPLETE STEP 1 FIRST' : "ÉTAPE 2 VERROUILLÉE — VALIDEZ D'ABORD LE PLAN À L'ÉTAPE 1"}</span>
                </>
              )}
            </div>
          )}
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
                <Input {...register('full_name')} placeholder={t('register.fullName')} disabled={!isRegistrationUnlocked} />
                {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>}
              </div>
              <div>
                <Input {...register('email')} placeholder={t('register.email')} type="email" disabled={!isRegistrationUnlocked} />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Input {...register('phone')} placeholder={t('register.phone')} disabled={!isRegistrationUnlocked} />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <PasswordInput {...register('password')} placeholder={t('register.password')} disabled={!isRegistrationUnlocked} />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <div className="relative">
                  <Input
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder={isEn ? "Referral code (Optional, ex: LFX-ABCD)" : "Code de parrainage (Optionnel, ex: LFX-ABCD)"}
                    className="pr-10 uppercase font-mono tracking-wider"
                    disabled={!isRegistrationUnlocked}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Share2 className="h-4 w-4" />
                  </div>
                </div>
                {refCodeFromUrl && (
                  <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {isEn ? "Referral code detected and applied" : "Code de parrainage détecté et appliqué"}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !isRegistrationUnlocked}>
              {isSubmitting ? t('common.loading') : t('register.submit')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('register.alreadyAccount')}{' '}
              <Link to="/login" className="text-primary hover:underline font-medium pointer-events-auto">
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
