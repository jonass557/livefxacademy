import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import { Menu, X, Globe, TrendingUp } from 'lucide-react';

// Logo - utilisez une URL ou importez le fichier quand disponible
const logoUrl = '/logo.png';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const { t, language, toggleLanguage } = useLanguageStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Visiteurs (non connectés) : Accueil (Services), Connexion, Rejoindre Gratuitement
  // Utilisateurs connectés : Accueil, Mon Espace, Déconnexion

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* LOGO */}
        <Link to="/" className="flex items-center space-x-2">
          <img 
            src={logoUrl} 
            alt="LiveFx Academy" 
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
            Live<span className="text-primary">Fx</span> <span className="text-green-500">Academy</span>
          </span>
        </Link>
        
        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
            {user ? t('navbar.home') : t('navbar.services')}
          </Link>
          
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
            <>
              <Link to="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
                {t('navbar.mySpace')}
              </Link>
              <Button variant="destructive" size="sm" onClick={logout}>
                {t('navbar.logout')}
              </Button>
            </>
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
        <button className="md:hidden" onClick={toggleMenu}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* MOBILE MENU CONTENT */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background p-4 space-y-4 animate-in slide-in-from-top-5">
          <Link to="/" className="block text-sm font-medium hover:text-primary" onClick={toggleMenu}>
            {user ? t('navbar.home') : t('navbar.services')}
          </Link>
          
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
            <>
              <Link to="/dashboard" className="block text-sm font-medium hover:text-primary" onClick={toggleMenu}>
                {t('navbar.mySpace')}
              </Link>
              <Button variant="destructive" size="sm" className="w-full" onClick={() => { logout(); toggleMenu(); }}>
                {t('navbar.logout')}
              </Button>
            </>
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
