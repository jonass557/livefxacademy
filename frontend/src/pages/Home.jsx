import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { CheckCircle, TrendingUp, Users, Video, ArrowRight, Shield, PlayCircle, GraduationCap, ClipboardCheck } from 'lucide-react';
import api from '../lib/api';
import { useLanguageStore } from '../store/languageStore';

const DEFAULT_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=2070&auto=format&fit=crop", // Ecrans de trading (Charts)
  "https://images.unsplash.com/photo-1535320903710-d9cf989d729e?q=80&w=2070&auto=format&fit=crop", // Bureau/Traders (Ambiance pro)
  "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=2071&auto=format&fit=crop", // Finance/Analyse
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop"  // Réunion/Coaching
];

const Home = () => {
  const { t } = useLanguageStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [heroImages, setHeroImages] = useState(DEFAULT_HERO_IMAGES);

  useEffect(() => {
    // Fetch dynamic banners
    const fetchBanners = async () => {
      try {
        const res = await api.get('/banners');
        if (res.data && res.data.length > 0) {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          setHeroImages(res.data.map(b => {
            // If URL starts with http, use as-is, otherwise prepend API URL
            return b.image_url.startsWith('http') ? b.image_url : `${API_URL}${b.image_url}`;
          }));
        }
      } catch (err) {
        console.error("Failed to fetch banners, using defaults", err);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000); // Changement toutes les 4 secondes
    return () => clearInterval(interval);
  }, [heroImages]);

  return (
    <div className="flex flex-col w-full overflow-x-hidden">
      
      {/* HERO SECTION - SPLIT LAYOUT */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            
            {/* LEFT: CONTENT */}
            <div className="flex flex-col justify-center space-y-8 text-center lg:text-left order-2 lg:order-1">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 w-fit mx-auto lg:mx-0">
                  {t('home.newProgram')}
                </div>
                <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary">
                  {t('home.heroTitle')} <br className="hidden lg:inline" /> <span className="text-primary">{t('home.heroTitleHighlight')}</span>
                </h1>
                <p className="mx-auto lg:mx-0 max-w-[700px] text-muted-foreground md:text-xl lg:text-lg">
                  {t('home.heroDescription')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center lg:justify-start">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto gap-2 text-lg h-12 px-8 shadow-md">
                    {t('home.startFree')} <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/trading-info">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-lg h-12 px-8">
                    <PlayCircle className="h-5 w-5" /> {t('home.discoverTrading')}
                  </Button>
                </Link>
              </div>
              
              {/* Trust Metrics */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-2xl font-bold text-primary">500+</p>
                  <p className="text-xs text-muted-foreground">{t('home.students')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">95%</p>
                  <p className="text-xs text-muted-foreground">{t('home.satisfaction')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">24/7</p>
                  <p className="text-xs text-muted-foreground">{t('home.support')}</p>
                </div>
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
              
              {/* Slider Overlay Elements (Optional decoration) */}
              <div className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur-sm p-4 rounded-xl border shadow-lg transform transition-all duration-500 hover:scale-105 hidden sm:block">
                 <div className="flex items-center gap-4">
                   <div className="bg-primary/20 p-2 rounded-full">
                     <TrendingUp className="h-6 w-6 text-primary" />
                   </div>
                   <div>
                     <p className="font-bold text-sm">{t('home.marketAnalysis')}</p>
                     <p className="text-xs text-muted-foreground">{t('home.realTimeUpdate')}</p>
                   </div>
                 </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-24 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">{t('home.whyChooseUs')}</h2>
            <p className="mt-4 text-muted-foreground text-lg">{t('home.whyChooseUsDesc')}</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard 
              icon={<Video className="h-10 w-10 text-primary" />}
              title={t('home.videoTraining')}
              description={t('home.videoTrainingDesc')}
            />
            <FeatureCard 
              icon={<Users className="h-10 w-10 text-primary" />}
              title={t('home.activeCommunity')}
              description={t('home.activeCommunityDesc')}
            />
            <FeatureCard 
              icon={<Shield className="h-10 w-10 text-primary" />}
              title={t('home.secureStrategies')}
              description={t('home.secureStrategiesDesc')}
            />
          </div>
        </div>
      </section>

      {/* VACATION PROGRAM SECTION */}
      <section className="py-24 bg-gradient-to-r from-primary/10 to-purple-500/10">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold bg-primary/20 text-primary">
                <GraduationCap className="h-4 w-4 mr-2" />
                {t('home.newProgram').split(':')[0]}
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                {t('home.vacationProgram')} <span className="text-primary">{t('home.tradingJunior')}</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                {t('home.vacationDesc')}
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>{t('home.julySessions')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>{t('home.maxGroups')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>{t('home.certificate')}</span>
                </div>
              </div>
              <Link to="/vacation-program">
                <Button size="lg" variant="outline" className="gap-2">
                  {t('home.discoverProgram')} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="flex-1">
              <div className="bg-card p-8 rounded-2xl border shadow-xl">
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">{t('home.startingFrom')}</p>
                  <p className="text-5xl font-bold text-primary">150 000 <span className="text-xl">FCFA</span></p>
                  <p className="text-muted-foreground">{t('home.twoWeeks')}</p>
                  <Link to="/vacation-program">
                    <Button className="w-full">{t('home.reserveSpot')}</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONSULTATION CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container px-4">
          <div className="bg-card border rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="bg-primary/10 p-4 rounded-full">
                <ClipboardCheck className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">{t('home.evaluateLevel')}</h3>
              <p className="text-muted-foreground">
                {t('home.evaluateLevelDesc')}
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link to="/consultation">
                <Button size="lg" className="gap-2">
                  {t('home.freeConsultation')} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BROKER SECTION */}
      <section className="py-24 relative overflow-hidden">
         <div className="absolute inset-0 bg-primary/5 -z-10"></div>
         <div className="container px-4 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex-1 space-y-6 text-center md:text-left">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">{t('home.trustedPartner')}</h2>
              <p className="text-lg text-muted-foreground">
                {t('home.trustedPartnerDesc')}
              </p>
              <a href="https://livefx.link/broker-affiliation" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="gap-2">
                  {t('home.openRealAccount')} <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
            <div className="flex-1 flex justify-center">
               <div className="relative h-64 w-64 rounded-full bg-gradient-to-tr from-primary to-purple-500 opacity-20 blur-3xl absolute"></div>
               <div className="relative bg-card p-8 rounded-2xl border shadow-xl max-w-sm w-full">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-500 h-5 w-5" />
                      <span className="font-medium">{t('home.instantDeposits')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-500 h-5 w-5" />
                      <span className="font-medium">{t('home.support247')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-500 h-5 w-5" />
                      <span className="font-medium">{t('home.regulated')}</span>
                    </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* FOOTER / SOCIAL */}
      <footer className="py-12 border-t bg-background">
        <div className="container px-4 text-center">
          <h3 className="text-2xl font-bold mb-8">{t('home.stayConnected')}</h3>
          <div className="flex justify-center gap-6 mb-8">
             <SocialButton label="WhatsApp" href="https://wa.me/VOTRE_NUMERO" icon="whatsapp" />
             <SocialButton label="Telegram" href="https://t.me/livefxtrading" icon="telegram" />
             <SocialButton label="Facebook" href="https://facebook.com/livefxtrading" icon="facebook" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('home.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
};

// Sub-components for cleaner code
const FeatureCard = ({ icon, title, description }) => (
  <Card className="border-none shadow-lg bg-card/50 hover:bg-card transition-all hover:-translate-y-1 duration-300">
    <CardContent className="pt-6 text-center space-y-4">
      <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-2">
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </CardContent>
  </Card>
);

const SocialButton = ({ label, href, icon }) => {
  const icons = {
    whatsapp: (
      <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    telegram: (
      <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    facebook: (
      <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )
  };
  
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary transition-colors">
        {icons[icon]}
        {label}
      </Button>
    </a>
  );
};

export default Home;
