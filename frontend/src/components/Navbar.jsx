import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api, { API_URL } from '../lib/api';
import { Button } from './ui/button';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import {
  Menu, X, Globe, TrendingUp, ChevronDown,
  LineChart, BarChart3, History, Calendar, Briefcase,
  GraduationCap, Link as LinkIcon, MessageSquare, ClipboardList, Palmtree,
  ShieldCheck
} from 'lucide-react';

const assetUrl = (url) => url ? (url.startsWith('http') ? url : `${API_URL}${url}`) : '';
const fallbackLogoUrl = '/logo.png';

// 11 fonctionnalités alignées dans l'ordre exact demandé :
// Graphique, Backtesting, Historique de backtesting, Annonces éco, Services,
// Le Trading, Inscription Académie, Lien Brokers, Contact, Fiche consultation, Programme de vacances
export const MENU_FEATURES = [
  { label: 'Graphique', path: '/dashboard?section=trading-demo', icon: LineChart },
  { label: 'Backtesting', path: '/dashboard?section=backtesting', icon: BarChart3 },
  { label: 'Historique de backtesting', path: '/dashboard?section=backtest-history', icon: History },
  { label: 'Annonces éco', path: '/dashboard?section=economics', icon: Calendar },
  { label: 'Services', path: '/dashboard?section=services', icon: Briefcase },
  { label: 'Le Trading', path: '/trading-info', icon: TrendingUp },
  { label: 'Inscription Académie', path: '/dashboard?section=academy', icon: GraduationCap },
  { label: 'Lien Brokers', path: '/dashboard?section=broker', icon: LinkIcon },
  { label: 'Contact', path: '/dashboard?section=contact', icon: MessageSquare },
  { label: 'Fiche consultation', path: '/consultation', icon: ClipboardList },
  { label: 'Programme de vacances', path: '/vacation-program', icon: Palmtree },
];

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState(fallbackLogoUrl);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/branding').then(({ data }) => {
      if (!cancelled && data?.navbar_logo_url) setLogoUrl(assetUrl(data.navbar_logo_url));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Fermer le menu déroulant lors d'un clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fermer les menus lors d'un changement de route
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
  }, [location.pathname, location.search]);

  const { t, language, toggleLanguage } = useLanguageStore();
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* LOGO */}
        <Link to="/" className="flex items-center space-x-2">
          <img 
            src={logoUrl} 
            alt="LivefxTrading" 
            className="h-10 w-auto object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling?.classList?.remove('hidden');
            }}
          />
          <div className="hidden bg-primary text-primary-foreground p-1.5 rounded-lg">
            <TrendingUp className="h-6 w-6" />
          </div>
          <span className="hidden font-bold text-xl sm:inline-block">
            Livefx<span className="text-primary">Trading</span>
          </span>
        </Link>
        
        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
            {t('navbar.home')}
          </Link>

          {/* Menu déroulant des 11 fonctionnalités pour les membres connectés */}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  isDropdownOpen
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border text-foreground hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <span>Fonctionnalités</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl border bg-card p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 z-50">
                  <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b mb-1">
                    Accès rapide aux outils
                  </div>
                  <div className="max-h-[75vh] overflow-y-auto space-y-0.5">
                    {MENU_FEATURES.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lien administration si admin */}
          {user?.role === 'admin' && (
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin</span>
            </Link>
          )}
          
          {/* Language Toggle */}
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary"
            title={language === 'fr' ? 'Switch to English' : 'Passer en Français'}
          >
            <Globe className="h-4 w-4" />
            {language.toUpperCase()}
          </button>
          
          {user ? (
            <Button variant="destructive" size="sm" onClick={logout}>
              {t('navbar.logout')}
            </Button>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">{t('navbar.login')}</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  {t('navbar.register')}
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* MOBILE MENU TOGGLE */}
        <button className="md:hidden" onClick={toggleMenu} aria-label="Menu">
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* MOBILE MENU CONTENT */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background p-4 space-y-4 animate-in slide-in-from-top-5 max-h-[85vh] overflow-y-auto">
          <Link to="/" className="block text-sm font-medium hover:text-primary" onClick={toggleMenu}>
            {t('navbar.home')}
          </Link>

          {/* Menu déroulant mobile des 11 fonctionnalités */}
          {user && (
            <div className="space-y-2 border-t pt-2">
              <button
                type="button"
                onClick={() => setMobileFeaturesOpen(!mobileFeaturesOpen)}
                className="flex items-center justify-between w-full text-sm font-semibold text-primary"
              >
                <span>Fonctionnalités LiveFX</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileFeaturesOpen ? 'rotate-180' : ''}`} />
              </button>

              {mobileFeaturesOpen && (
                <div className="grid grid-cols-1 gap-1 pl-1 pt-1">
                  {MENU_FEATURES.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={toggleMenu}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {user?.role === 'admin' && (
            <Link
              to="/dashboard"
              onClick={toggleMenu}
              className="flex items-center gap-2 text-sm font-semibold text-amber-600 bg-amber-500/10 p-2 rounded-lg"
            >
              <ShieldCheck className="h-4 w-4" /> Administration
            </Link>
          )}
          
          {/* Language Toggle Mobile */}
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary"
          >
            <Globe className="h-4 w-4" />
            {language === 'fr' ? 'English' : 'Français'}
          </button>
          
          <hr />
          {user ? (
            <Button variant="destructive" size="sm" className="w-full" onClick={() => { logout(); toggleMenu(); }}>
              {t('navbar.logout')}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link to="/login" onClick={toggleMenu}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  {t('navbar.login')}
                </Button>
              </Link>
              <Link to="/register" onClick={toggleMenu}>
                <Button size="sm" className="w-full">
                  {t('navbar.register')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
