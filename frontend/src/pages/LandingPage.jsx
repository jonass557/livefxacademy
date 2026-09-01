import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { 
  CheckCircle, TrendingUp, Users, Video, ArrowRight, Shield, 
  GraduationCap, Target, BookOpen, BarChart3, Zap, Award,
  Globe, Clock, HeadphonesIcon, Facebook
} from 'lucide-react';
import api from '../lib/api';
import { getServiceIcon } from '../lib/serviceIcons';
import { useLanguageStore } from '../store/languageStore';

const DEFAULT_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1535320903710-d9cf989d729e?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=2071&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop"
];

const LandingPage = () => {
  const { t, language } = useLanguageStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [heroImages, setHeroImages] = useState(DEFAULT_HERO_IMAGES);
  const [dynamicServices, setDynamicServices] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get('/services');
        if (res.data && res.data.length > 0) setDynamicServices(res.data);
      } catch (err) {
        console.error("Failed to fetch services", err);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await api.get('/banners');
        if (res.data && res.data.length > 0) {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          setHeroImages(res.data.map(b => {
            return b.image_url.startsWith('http') ? b.image_url : `${API_URL}${b.image_url}`;
          }));
        }
      } catch (err) {
        console.error("Failed to fetch banners", err);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImages]);

  const defaultServices = language === 'fr' ? [
    {
      icon: <Video className="h-10 w-10 text-primary" />,
      title: "Formation Vidéo HD",
      description: "Accédez à une bibliothèque complète de cours vidéo, du niveau débutant à expert, disponible 24h/24 et 7j/7."
    },
    {
      icon: <Users className="h-10 w-10 text-blue-500" />,
      title: "Coaching Personnalisé",
      description: "Bénéficiez d'un accompagnement individuel avec nos formateurs expérimentés pour accélérer votre progression."
    },
    {
      icon: <BarChart3 className="h-10 w-10 text-green-500" />,
      title: "Analyse de Marché",
      description: "Recevez des analyses quotidiennes et des signaux de trading pour prendre les meilleures décisions."
    },
    {
      icon: <BookOpen className="h-10 w-10 text-purple-500" />,
      title: "Ressources Pédagogiques",
      description: "Accédez à des ebooks, guides PDF, et supports de cours pour approfondir vos connaissances."
    },
    {
      icon: <Target className="h-10 w-10 text-red-500" />,
      title: "Stratégies Éprouvées",
      description: "Apprenez des stratégies de trading testées et validées par nos experts avec un taux de réussite prouvé."
    },
    {
      icon: <Shield className="h-10 w-10 text-yellow-500" />,
      title: "Gestion du Risque",
      description: "Maîtrisez le Money Management pour protéger votre capital et trader en toute sécurité."
    },
    {
      icon: <GraduationCap className="h-10 w-10 text-indigo-500" />,
      title: "Programme Vacances Junior",
      description: "Formation spéciale pour les jeunes de 15 à 18 ans pendant les vacances scolaires avec certificat."
    },
    {
      icon: <HeadphonesIcon className="h-10 w-10 text-pink-500" />,
      title: "Support 24/7",
      description: "Notre équipe est disponible à tout moment pour répondre à vos questions et vous accompagner."
    },
    {
      icon: <Globe className="h-10 w-10 text-cyan-500" />,
      title: "Communauté Internationale",
      description: "Rejoignez une communauté active de traders du monde entier pour échanger et progresser ensemble."
    }
  ] : [
    {
      icon: <Video className="h-10 w-10 text-primary" />,
      title: "HD Video Training",
      description: "Access a complete library of video courses, from beginner to expert level, available 24/7."
    },
    {
      icon: <Users className="h-10 w-10 text-blue-500" />,
      title: "Personalized Coaching",
      description: "Get individual support from our experienced trainers to accelerate your progress."
    },
    {
      icon: <BarChart3 className="h-10 w-10 text-green-500" />,
      title: "Market Analysis",
      description: "Receive daily analyses and trading signals to make the best decisions."
    },
    {
      icon: <BookOpen className="h-10 w-10 text-purple-500" />,
      title: "Educational Resources",
      description: "Access ebooks, PDF guides, and course materials to deepen your knowledge."
    },
    {
      icon: <Target className="h-10 w-10 text-red-500" />,
      title: "Proven Strategies",
      description: "Learn trading strategies tested and validated by our experts with proven success rates."
    },
    {
      icon: <Shield className="h-10 w-10 text-yellow-500" />,
      title: "Risk Management",
      description: "Master Money Management to protect your capital and trade safely."
    },
    {
      icon: <GraduationCap className="h-10 w-10 text-indigo-500" />,
      title: "Junior Vacation Program",
      description: "Special training for young people aged 15-18 during school holidays with certificate."
    },
    {
      icon: <HeadphonesIcon className="h-10 w-10 text-pink-500" />,
      title: "24/7 Support",
      description: "Our team is available at all times to answer your questions and support you."
    },
    {
      icon: <Globe className="h-10 w-10 text-cyan-500" />,
      title: "International Community",
      description: "Join an active community of traders from around the world to exchange and progress together."
    }
  ];

  // Admin-managed services override the defaults when present
  const services = dynamicServices.length > 0
    ? dynamicServices.map((s) => {
        const Icon = getServiceIcon(s.icon);
        return {
          icon: <Icon className={`h-10 w-10 ${s.color || 'text-primary'}`} />,
          title: s.title,
          description: s.description
        };
      })
    : defaultServices;

  const stats = language === 'fr' ? [
    { value: "500+", label: "Étudiants formés" },
    { value: "95%", label: "Taux de satisfaction" },
    { value: "50+", label: "Heures de formation" },
    { value: "24/7", label: "Support disponible" }
  ] : [
    { value: "500+", label: "Trained students" },
    { value: "95%", label: "Satisfaction rate" },
    { value: "50+", label: "Training hours" },
    { value: "24/7", label: "Support available" }
  ];

  return (
    <div className="flex flex-col w-full overflow-x-hidden">
      
      {/* HERO SECTION */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            
            {/* LEFT: CONTENT */}
            <div className="flex flex-col justify-center space-y-8 text-center lg:text-left order-2 lg:order-1">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary w-fit mx-auto lg:mx-0">
                  {language === 'fr' ? '🎓 Académie de Trading Forex' : '🎓 Forex Trading Academy'}
                </div>
                <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary">
                  LiveFx <span className="text-primary">Academy</span>
                </h1>
                <p className="mx-auto lg:mx-0 max-w-[700px] text-muted-foreground md:text-xl lg:text-lg">
                  {language === 'fr' 
                    ? "Découvrez nos services de formation au trading Forex. Formation complète, coaching personnalisé et stratégies gagnantes pour atteindre l'indépendance financière."
                    : "Discover our Forex trading training services. Complete training, personalized coaching and winning strategies to achieve financial independence."
                  }
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center lg:justify-start">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto gap-2 text-lg h-12 px-8 shadow-md">
                    {language === 'fr' ? 'Rejoindre Gratuitement' : 'Join Free'} <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-lg h-12 px-8">
                    {language === 'fr' ? 'Se Connecter' : 'Login'}
                  </Button>
                </Link>
              </div>
              
              {/* Trust Metrics */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <p className="text-xl md:text-2xl font-bold text-primary">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: IMAGE SLIDER */}
            <div className="order-1 lg:order-2 relative mx-auto w-full max-w-[600px] aspect-[4/3] lg:aspect-square overflow-hidden rounded-2xl shadow-2xl border bg-muted">
              {heroImages.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Slide ${index + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                    index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
              
              {/* Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur-sm p-4 rounded-xl border shadow-lg hidden sm:block">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/20 p-2 rounded-full">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{language === 'fr' ? 'Trading Forex' : 'Forex Trading'}</p>
                    <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Formation professionnelle' : 'Professional training'}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="py-24 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold bg-primary/10 text-primary mb-4">
              <Zap className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Nos Services' : 'Our Services'}
            </div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              {language === 'fr' ? 'Services de l\'Académie' : 'Academy Services'}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              {language === 'fr' 
                ? 'Découvrez tous les services que nous offrons pour vous accompagner dans votre parcours de trader.'
                : 'Discover all the services we offer to support you on your trading journey.'
              }
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <Card key={index} className="border-none shadow-lg bg-card/50 hover:bg-card transition-all hover:-translate-y-1 duration-300">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="inline-flex p-3 rounded-xl bg-muted">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold">{service.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="py-24 bg-gradient-to-r from-primary/10 to-purple-500/10">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold bg-primary/20 text-primary">
                <Award className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Pourquoi nous choisir ?' : 'Why choose us?'}
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                {language === 'fr' 
                  ? 'Une formation d\'excellence pour votre réussite'
                  : 'Excellence training for your success'
                }
              </h2>
              <p className="text-lg text-muted-foreground">
                {language === 'fr'
                  ? 'LivefxTrading vous offre une formation complète et professionnelle pour devenir un trader rentable et autonome.'
                  : 'LivefxTrading offers you complete and professional training to become a profitable and autonomous trader.'
                }
              </p>
              <div className="space-y-3">
                {(language === 'fr' ? [
                  "Formateurs expérimentés avec plus de 5 ans d'expérience",
                  "Méthodes pédagogiques éprouvées et efficaces",
                  "Suivi personnalisé de chaque étudiant",
                  "Accès à vie aux ressources de formation",
                  "Communauté active et entraide entre membres"
                ] : [
                  "Experienced trainers with over 5 years of experience",
                  "Proven and effective teaching methods",
                  "Personalized follow-up for each student",
                  "Lifetime access to training resources",
                  "Active community and mutual support"
                ]).map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/register">
                <Button size="lg" className="gap-2">
                  {language === 'fr' ? 'Commencer Maintenant' : 'Start Now'} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="flex-1">
              <div className="bg-card p-8 rounded-2xl border shadow-xl">
                <div className="text-center space-y-6">
                  <div className="inline-flex p-4 rounded-full bg-primary/10">
                    <GraduationCap className="h-16 w-16 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">LivefxTrading</h3>
                  <p className="text-muted-foreground">
                    {language === 'fr'
                      ? 'Votre partenaire pour réussir dans le trading Forex'
                      : 'Your partner to succeed in Forex trading'
                    }
                  </p>
                  <div className="pt-4 border-t">
                    <Link to="/register">
                      <Button className="w-full" size="lg">
                        {language === 'fr' ? 'Inscription Gratuite' : 'Free Registration'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-16 bg-muted/30">
        <div className="container px-4">
          <div className="bg-card border rounded-2xl p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              {language === 'fr' 
                ? 'Prêt à commencer votre parcours de trader ?'
                : 'Ready to start your trading journey?'
              }
            </h3>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              {language === 'fr'
                ? 'Rejoignez des centaines d\'étudiants qui ont déjà transformé leur vie grâce au trading. Inscrivez-vous gratuitement et accédez à nos formations.'
                : 'Join hundreds of students who have already transformed their lives through trading. Sign up for free and access our training.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="gap-2">
                  {language === 'fr' ? 'Rejoindre Gratuitement' : 'Join Free'} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  {language === 'fr' ? 'J\'ai déjà un compte' : 'I already have an account'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER / SOCIAL */}
      <footer className="py-12 border-t bg-background">
        <div className="container px-4 text-center">
          <h3 className="text-2xl font-bold mb-8">
            {language === 'fr' ? 'Suivez-nous sur les réseaux' : 'Follow us on social media'}
          </h3>
          <div className="flex justify-center gap-6 mb-8">
            <a 
              href="https://facebook.com/livefxtrading" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              <Facebook className="h-6 w-6" />
              <span className="font-semibold">Facebook</span>
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 LivefxTrading. {language === 'fr' ? 'Tous droits réservés. Le trading comporte des risques.' : 'All rights reserved. Trading involves risks.'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
