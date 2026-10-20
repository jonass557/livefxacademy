import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Share2, Copy, Check, Users, CheckCircle, Clock, DollarSign,
  Award, ArrowRight, MessageSquare, ExternalLink, RefreshCw,
  Search, Calendar, TrendingUp, Sparkles, Send
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useLanguageStore } from '../../store/languageStore';

export default function ReferralDashboard({ onNavigateToContact }) {
  const { language } = useLanguageStore();
  const isEn = language === 'en';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/referrals/my-stats');
      setStats(res.data);
    } catch (err) {
      console.error('Erreur chargement stats parrainage:', err);
      setStats({ enabled: false, is_referral_enabled: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://livefx-trading.com';
  const refCode = stats?.referral_code || '';
  const refLink = refCode ? `${origin}/register?ref=${refCode}` : '';

  const handleCopy = (text, type = 'link') => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }

    if (type === 'code') {
      setCopiedCode(true);
      toast.success(isEn ? 'Referral code copied!' : 'Code parrain copié !');
      setTimeout(() => setCopiedCode(false), 2500);
    } else {
      setCopiedLink(true);
      toast.success(isEn ? 'Referral link copied to clipboard!' : 'Lien de parrainage copié dans le presse-papiers !');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSocialShare = (platform) => {
    const textShare = isEn
      ? `Join LiveFX Trading Academy and boost your trading results using my exclusive link:`
      : `Rejoignez LiveFX Trading Academy et boostez vos résultats en trading avec mon lien exclusif :`;
    const shareUrl = refLink;

    let targetUrl = '';
    if (platform === 'whatsapp') {
      targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${textShare} ${shareUrl}`)}`;
    } else if (platform === 'telegram') {
      targetUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(textShare)}`;
    } else if (platform === 'facebook') {
      targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    } else if (platform === 'twitter') {
      targetUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(textShare)}`;
    } else if (platform === 'native' && typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'LiveFX Trading Academy',
        text: textShare,
        url: shareUrl,
      }).catch(() => {});
      return;
    }

    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const isEnabled = Boolean(stats?.is_referral_enabled);

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">
          {isEn ? 'Loading your referral dashboard...' : 'Chargement de votre tableau de bord de parrainage...'}
        </p>
      </div>
    );
  }

  // Si le parrainage n'a pas encore été activé par l'administrateur
  if (!isEnabled) {
    return (
      <Card className="border-dashed border-2 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner">
          <Share2 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-extrabold text-foreground">
            {isEn ? 'Referral Feature Pending Activation' : 'Fonctionnalité Parrainer en attente d\'activation'}
          </h3>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            {isEn
              ? 'Your referral link has not been activated yet by the administrator. Once activated, you will be able to share your link, track signups, and earn commissions on every subscriber.'
              : 'Votre lien de parrainage n\'a pas encore été activé par l\'administrateur. Une fois activé, vous pourrez partager votre lien, voir le nombre de personnes inscrites, celles ayant activé le plan et vos gains en temps réel.'}
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={fetchStats}
            variant="outline"
            className="gap-2 w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{isEn ? 'Check Status' : 'Vérifier le statut'}</span>
          </Button>
          {onNavigateToContact && (
            <Button
              onClick={onNavigateToContact}
              className="gap-2 w-full sm:w-auto"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{isEn ? 'Contact Administrator' : 'Demander l\'activation à l\'admin'}</span>
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Filtrage des filleuls par recherche
  const referees = stats?.referees || [];
  const filteredReferees = referees.filter((ref) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      ref.full_name?.toLowerCase().includes(q) ||
      ref.email?.toLowerCase().includes(q) ||
      ref.plan_name?.toLowerCase().includes(q)
    );
  });

  const totalReferees = stats?.total_referees || 0;
  const activeSubscribers = stats?.active_subscribed_referees || 0;
  const totalEarnings = stats?.total_earnings_xaf || 0;
  const pendingEarnings = stats?.pending_earnings_xaf || 0;
  const paidEarnings = stats?.paid_earnings_xaf || 0;
  const commissionPercentage = stats?.percentage || 10;

  return (
    <div className="space-y-8">
      {/* 1. EN-TÊTE DU TABLEAU DE BORD DE PARRAINAGE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle className="h-4 w-4" />
            <span>{isEn ? 'Referral Program Active' : 'Programme de Parrainage Actif'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground flex items-center gap-2.5">
            <Share2 className="h-7 w-7 text-primary" />
            <span>{isEn ? 'Referral Dashboard' : 'Tableau de Bord de Parrainage'}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {isEn
              ? 'Track everyone who joined through your link, see who activated a plan, and monitor your exact earnings per person.'
              : 'Visualisez les personnes inscrites avec votre lien, celles ayant activé le plan et combien vous avez gagné par personne.'}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
          className="gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{isEn ? 'Refresh' : 'Actualiser'}</span>
        </Button>
      </div>

      {/* 2. CARTE LIEN DE PARRAINAGE & OUTILS DE PARTAGE */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-purple-500/5 shadow-md">
        <CardContent className="p-5 sm:p-7 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-sm">
                <Award className="h-3.5 w-3.5" />
                <span>{commissionPercentage}% {isEn ? 'commission on all plan subscriptions' : 'de commission sur chaque plan activé'}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                {isEn ? 'Your Personal Referral Link' : 'Votre Lien de Parrainage Exclusif'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isEn
                  ? 'Anyone registering through this link will be permanently linked to your account.'
                  : 'Toute personne s\'inscrivant via ce lien est automatiquement et définitivement rattachée à votre compte.'}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-card/80 backdrop-blur border rounded-2xl p-3 px-4 shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                  {isEn ? 'Your Code' : 'Votre Code Parrain'}
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-primary tracking-widest">
                  {refCode}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(refCode, 'code')}
                className="gap-1.5 text-xs h-8"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? (isEn ? 'Copied' : 'Copié') : (isEn ? 'Copy' : 'Copier')}</span>
              </Button>
            </div>
          </div>

          {/* Champ d'affichage et copie du lien complet */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <Input
              readOnly
              value={refLink}
              className="font-mono text-xs sm:text-sm bg-background/90 border-primary/30 select-all h-11"
            />
            <Button
              onClick={() => handleCopy(refLink, 'link')}
              className="shrink-0 gap-2 font-bold h-11 px-5 shadow"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              <span>{copiedLink ? (isEn ? 'Link Copied!' : 'Lien Copié !') : (isEn ? 'Copy Link' : 'Copier le lien')}</span>
            </Button>
          </div>

          {/* Boutons de partage direct sur les réseaux sociaux */}
          <div className="pt-2 border-t flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1">
              {isEn ? 'Share directly:' : 'Partager directement :'}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSocialShare('whatsapp')}
              className="h-8 text-xs gap-1.5 font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-500/30"
            >
              <Send className="h-3 w-3" /> WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSocialShare('telegram')}
              className="h-8 text-xs gap-1.5 font-bold text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 border-sky-500/30"
            >
              <Send className="h-3 w-3" /> Telegram
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSocialShare('facebook')}
              className="h-8 text-xs gap-1.5 font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-blue-500/30"
            >
              <ExternalLink className="h-3 w-3" /> Facebook
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSocialShare('twitter')}
              className="h-8 text-xs gap-1.5 font-bold text-foreground hover:bg-muted"
            >
              <ExternalLink className="h-3 w-3" /> X (Twitter)
            </Button>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSocialShare('native')}
                className="h-8 text-xs gap-1.5 font-bold text-primary border-primary/30"
              >
                <Share2 className="h-3 w-3" /> {isEn ? 'More options...' : 'Plus d\'options...'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. LES 4 CARTES STATISTIQUES DU TABLEAU DE BORD */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Personnes Inscrites */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              {isEn ? 'Registered With Your Link' : 'Personnes Inscrites'}
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-extrabold text-foreground">{totalReferees}</div>
            <p className="text-xs text-muted-foreground">
              {isEn ? 'Total signups using your link' : 'Traders inscrits avec votre code'}
            </p>
          </CardContent>
        </Card>

        {/* Personnes Ayant Activé le Plan */}
        <Card className="hover:shadow-md transition-shadow border-emerald-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              {isEn ? 'Subscribers Who Activated Plan' : 'Ayant Activé le Plan'}
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-extrabold text-emerald-600">{activeSubscribers}</div>
            <p className="text-xs text-muted-foreground">
              {isEn ? 'Filleuls with active subscription plan' : 'Filleuls avec un plan actif sur la plateforme'}
            </p>
          </CardContent>
        </Card>

        {/* Total Gagné sur vos Parrainages */}
        <Card className="hover:shadow-md transition-shadow border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              {isEn ? 'Total Earned on Plans' : 'Total Gagné sur les Plans'}
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-extrabold text-primary">
              {totalEarnings.toLocaleString()} <span className="text-lg font-bold">XAF</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isEn ? 'Calculated commissions from your referees' : 'Commissions totales générées'}
            </p>
          </CardContent>
        </Card>

        {/* En Attente de Paiement / Déjà Payé */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              {isEn ? 'Commission Payout Status' : 'Statut des Commissions'}
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-extrabold text-amber-600">
              {pendingEarnings.toLocaleString()} <span className="text-sm font-bold">XAF</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>{isEn ? 'Pending payout:' : 'En attente :'}</span>
              <span className="font-semibold text-amber-600">{pendingEarnings.toLocaleString()} XAF</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{isEn ? 'Already paid out:' : 'Déjà versé :'}</span>
              <span className="font-semibold text-emerald-600">{paidEarnings.toLocaleString()} XAF</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. TABLEAU DÉTAILLÉ : « COMBIEN J'AI GAGNÉ PAR PERSONNE » */}
      <Card className="shadow-sm">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>{isEn ? 'Earnings Breakdown by Referred Person' : 'Détail de vos gains par personne parrainée'}</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEn
                  ? 'View the plan each referee activated, how much they spent, and how much you earned per person.'
                  : 'Consultez le plan activé par chaque filleul, son montant et combien vous avez gagné pour cette personne.'}
              </p>
            </div>

            {referees.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={isEn ? 'Search a referee...' : 'Rechercher un filleul...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-5 pt-0">
          {referees.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="h-7 w-7" />
              </div>
              <h4 className="font-bold text-base">
                {isEn ? 'No referrals registered yet' : 'Aucune personne inscrite pour le moment'}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {isEn
                  ? 'Share your link on WhatsApp, social media, or with your community. As soon as someone signs up and activates a plan, you will see your earnings appear here instantly.'
                  : 'Partagez votre lien de parrainage sur WhatsApp, vos réseaux sociaux ou vos groupes de trading. Dès qu\'une personne s\'inscrit et active son plan, votre gain s\'affichera ici immédiatement.'}
              </p>
              <Button
                size="sm"
                onClick={() => handleCopy(refLink, 'link')}
                className="gap-2 mt-2 font-bold"
              >
                <Copy className="h-4 w-4" />
                <span>{isEn ? 'Copy My Referral Link' : 'Copier mon lien de parrainage'}</span>
              </Button>
            </div>
          ) : filteredReferees.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              {isEn ? 'No referee matches your search.' : 'Aucun filleul ne correspond à votre recherche.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground text-[11px] uppercase font-bold tracking-wider">
                    <th className="text-left py-3 px-4">{isEn ? 'Referee' : 'Personne Parrainée'}</th>
                    <th className="text-left py-3 px-3">{isEn ? 'Sign-up Date' : 'Date d\'inscription'}</th>
                    <th className="text-left py-3 px-3">{isEn ? 'Platform Plan' : 'Plan sur la plateforme'}</th>
                    <th className="text-right py-3 px-3">{isEn ? 'Plan Price' : 'Montant Payé'}</th>
                    <th className="text-right py-3 px-4">{isEn ? 'You Earned' : 'Combien vous avez gagné'}</th>
                    <th className="text-center py-3 px-3">{isEn ? 'Payout Status' : 'Statut Commission'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredReferees.map((ref) => {
                    const hasPlan = Boolean(ref.has_active_plan);
                    const commission = Number(ref.commission_earned_xaf || 0);
                    const totalPaid = Number(ref.total_paid_xaf || 0);

                    return (
                      <tr key={ref.id || ref._id} className="hover:bg-muted/40 transition-colors">
                        {/* 1. Nom & Email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                              {ref.full_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-foreground leading-tight">{ref.full_name}</p>
                              <p className="text-[11px] text-muted-foreground">{ref.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Date d'inscription */}
                        <td className="py-3 px-3 text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(ref.created_at).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>

                        {/* 3. Statut du Plan de la plateforme */}
                        <td className="py-3 px-3">
                          {hasPlan ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle className="h-3 w-3" />
                                <span>{ref.plan_name || (isEn ? 'Plan Active' : 'Plan Activé')}</span>
                              </span>
                              {ref.subscription_expires_at && (
                                <p className="text-[10px] text-muted-foreground">
                                  {isEn ? 'Valid until ' : 'Expire le '}
                                  {new Date(ref.subscription_expires_at).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                              {isEn ? 'No Active Plan' : 'Aucun plan activé'}
                            </span>
                          )}
                        </td>

                        {/* 4. Montant payé par le filleul */}
                        <td className="py-3 px-3 text-right font-medium whitespace-nowrap">
                          {totalPaid > 0 ? (
                            <span className="font-semibold text-foreground">
                              {totalPaid.toLocaleString()} XAF
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {hasPlan ? (isEn ? 'Free trial' : 'Offert / Gratuit') : '0 XAF'}
                            </span>
                          )}
                        </td>

                        {/* 5. COMBIEN VOUS AVEZ GAGNÉ SUR CETTE PERSONNE */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {commission > 0 ? (
                            <div className="inline-flex flex-col items-end">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                                <DollarSign className="h-3.5 w-3.5" />
                                +{commission.toLocaleString()} XAF
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                {commissionPercentage}% {isEn ? 'commission' : 'de commission'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {hasPlan ? (isEn ? 'Free month (0 XAF)' : 'Mois gratuit (0 XAF)') : '0 XAF'}
                            </span>
                          )}
                        </td>

                        {/* 6. Statut de paiement de la commission */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {commission > 0 ? (
                            ref.commission_status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <Check className="h-3 w-3" />
                                {isEn ? 'Paid' : 'Déjà Versé'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                <Clock className="h-3 w-3" />
                                {isEn ? 'Pending Payout' : 'En attente de paiement'}
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              {isEn ? 'No commission' : 'Sans commission'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
