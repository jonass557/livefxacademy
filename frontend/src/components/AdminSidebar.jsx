import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Image, 
  BarChart3, 
  Mail, 
  Settings, 
  LogOut,
  Globe,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  FileCheck,
  Video,
  UserCheck,
  TrendingUp,
  Palmtree,
  Send,
  Menu,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { useLanguageStore } from '../store/languageStore';
import { useAuthStore } from '../store/authStore';

const AdminSidebar = ({ activeSection, setActiveSection, collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const { language, toggleLanguage, t } = useLanguageStore();
  const { logout } = useAuthStore();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard') },
    { id: 'users', icon: UserCheck, label: 'Utilisateurs' },
    { id: 'trainers', icon: GraduationCap, label: 'Formateurs' },
    { id: 'consultation-sheets', icon: FileCheck, label: 'Fiches Formateurs' },
    { id: 'student-consultations', icon: Users, label: 'Fiches Élèves' },
    { id: 'prospects', icon: Users, label: t('sidebar.prospects') },
    { id: 'vacation-programs', icon: Palmtree, label: 'Programmes Vacances' },
    { id: 'announcements', icon: Video, label: 'Vidéos Annonces' },
    { id: 'banners', icon: Image, label: t('sidebar.banners') },
    { id: 'emails', icon: Send, label: 'Envoyer Emails' },
    { id: 'statistics', icon: TrendingUp, label: 'Bilan Statistique' },
    { id: 'email-guide', icon: Mail, label: t('sidebar.emailGuide') },
  ];

  const handleMenuClick = (id) => {
    setActiveSection(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Mobile Toggle Button */}
      <button
        className="fixed bottom-4 right-4 z-50 lg:hidden bg-primary text-primary-foreground p-3 rounded-full shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside 
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r transition-all duration-300 z-40
          ${collapsed ? 'w-16' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Language Toggle */}
          <div className={`p-4 border-b ${collapsed ? 'flex justify-center' : ''}`}>
            <Button
              variant="outline"
              size={collapsed ? 'icon' : 'default'}
              onClick={toggleLanguage}
              className={`${collapsed ? '' : 'w-full'} gap-2`}
            >
              <Globe className="h-4 w-4" />
              {!collapsed && (
                <span className="font-medium">
                  {language === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                </span>
              )}
            </Button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : ''}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0`} />
                  {!collapsed && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-2 border-t space-y-1">
            {/* Collapse Toggle - Hidden on mobile */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <>
                  <ChevronLeft className="h-5 w-5" />
                  <span className="font-medium text-sm">Réduire</span>
                </>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all ${
                collapsed ? 'justify-center' : ''
              }`}
              title={collapsed ? t('sidebar.logout') : ''}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && (
                <span className="font-medium text-sm">{t('sidebar.logout')}</span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
